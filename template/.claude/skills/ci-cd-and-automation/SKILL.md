---
name: ci-cd-and-automation
description: CI/CD pipeline setup and quality gate automation for Java/Spring Boot Maven projects. Use when setting up GitHub Actions, configuring build pipelines, automating test execution, or establishing deployment strategies with Maven and Spring Boot.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: devops
  triggers:
    - CI/CD
    - GitHub Actions
    - pipeline
    - quality gates
    - automated testing
    - build pipeline
    - deployment pipeline
    - continuous integration
    - continuous deployment
    - Maven CI
  role: guide
  scope: devops
  output-format: code + guidance
  related-skills: maven-master, spring-boot-engineer, tdd-guide, observability-master
---

# CI/CD and Automation

Quality gate automation for Java/Spring Boot Maven projects so no change reaches production without passing compile, test, verify, build, and security audit stages.

## When to Use
- The project needs a GitHub Actions workflow for Maven-based Spring Boot applications
- You are adding or fixing CI pipeline stages (compile, test, verify, build, security audit)
- Testcontainers tests must run reliably in CI
- A Docker image needs to be built and pushed as part of the pipeline
- Dependabot or dependency update automation is needed for Maven
- The team wants staged rollout or deployment automation for Spring Boot services

## When Not to Use
- The task is Maven module structure, parent POM, or dependency management — use `maven-master`
- The task is writing or structuring tests themselves — use `tdd-guide`
- The task is Spring Boot application code or configuration — use `spring-boot-engineer`
- The task is Kubernetes manifests, Helm charts, or cluster setup — use `kubernetes-specialist` agent
- The task is Dockerfile authoring without CI context — use `docker-expert` agent
- The task is monitoring, metrics, or health checks — use `observability-master`

## Reference Guide

| Topic | Reference | Load When |
|-------|-----------|-----------|
| GitHub Actions caching, matrix builds, artifact upload, environment gates | `references/github-actions-patterns.md` | Setting up or improving GitHub Actions workflows for Maven projects |
| Testcontainers in CI: DinD, Testcontainers Cloud, troubleshooting | `references/testcontainers-ci.md` | Making Testcontainers integration tests work reliably in CI pipelines |
| CI/CD anti-patterns and rationalizations | `references/gotchas.md` | Reviewing pipeline config for common mistakes or rejecting unsafe shortcuts |

## Symptom Triage

| Symptom | Likely Cause | Default Move |
|--------|--------------|--------------|
| Tests pass locally but fail in CI | Missing Docker daemon, env vars, or Testcontainers config | Add DinD service or Testcontainers Cloud; check env setup |
| Build takes 20+ minutes | No Maven caching, full reactor rebuild every time | Cache `~/.m2/repository`; use `-pl -am` for changed modules |
| Security vulnerabilities slip into production | No dependency audit step in pipeline | Add OWASP dependency-check or `./mvnw dependency-check:check` |
| Docker image build fails in CI | Missing Docker context or wrong builder stage | Ensure Docker daemon is available; prefer `spring-boot:build-image` |
| Dependency versions drift silently | No automated update mechanism | Configure Dependabot for Maven |
| Flaky integration tests in CI | Testcontainers can't start containers | Use `TESTCONTAINERS_RYUK_DISABLED=true` or Testcontainers Cloud token |

## Quality Gate Ladder

1. **Compile** — fail fast on syntax and type errors.
2. **Unit test** — prove business logic in isolation.
3. **Integration test** — prove wiring with real dependencies via Testcontainers.
4. **Verify** — run `./mvnw clean verify` to include all Maven lifecycle checks.
5. **Security audit** — scan dependencies for known vulnerabilities.
6. **Build artifact** — produce the deployable JAR or Docker image.
7. **Deploy** — push to staging first, then production with gates.

## Quick Mapping

| Situation | Default Choice | Prefer Instead Of |
|-----------|----------------|-------------------|
| New Spring Boot project needs CI | GitHub Actions with `./mvnw clean verify` | Manual builds or Jenkins without pipeline-as-code |
| Testcontainers in CI | DinD service container or Testcontainers Cloud | Skipping integration tests in CI |
| Docker image for Spring Boot | `spring-boot:build-image` (Cloud Native Buildpacks) | Hand-written multi-stage Dockerfile unless customization is needed |
| Dependency security scanning | OWASP dependency-check Maven plugin | No scanning or scan only at release time |
| Dependency updates | Dependabot with Maven ecosystem | Manual version bumps |
| Staged deployment | Deploy to staging → smoke test → production | Direct push to production |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Run full verify before merge | `./mvnw clean verify` as the gate step |
| Cache Maven dependencies | `actions/cache` on `~/.m2/repository` or `actions/setup-java` built-in cache |
| Use explicit JDK version | `actions/setup-java` with `distribution: temurin` and `java-version: 21` |
| Include security audit stage | OWASP dependency-check plugin or equivalent in the pipeline |
| Keep pipeline stages sequential for correctness | compile → test → verify → build → security → deploy |
| Use Maven wrapper in CI | `./mvnw` instead of raw `mvn` for reproducibility |
| Make Testcontainers work in CI | Provide Docker daemon access via DinD or Testcontainers Cloud |

### MUST NOT DO
- Do not skip tests in CI with `-DskipTests` as the default
- Do not cache the entire `~/.m2` directory — cache only `~/.m2/repository`
- Do not hardcode credentials in workflow files — use GitHub Secrets
- Do not deploy to production without a prior staging or smoke-test gate
- Do not let the security audit stage be a non-blocking advisory — fail the build on critical vulnerabilities
- Do not use `latest` tags for Docker base images in CI — pin versions

## Gotchas
- `./mvnw clean verify` already runs compile, test, and integration-test phases; adding a separate `./mvnw test` step before it duplicates work unless you want faster feedback on unit tests alone.
- Testcontainers requires a running Docker daemon; GitHub Actions `ubuntu-latest` runners have Docker pre-installed, but self-hosted runners may not.
- `spring-boot:build-image` requires Docker daemon access and does not work inside a container without DinD or a remote Docker host.
- OWASP dependency-check downloads a vulnerability database on first run — cache `~/.dependency-check` or use the `--data` flag to avoid repeated downloads.
- Maven multi-module projects need `./mvnw -pl module -am` for partial builds, but the CI gate should still run the full reactor verify.
- Dependabot PRs can pile up if auto-merge is not configured; pair with a merge policy.

## Minimal Examples

### GitHub Actions — full quality gate pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
          cache: maven

      - name: Compile
        run: ./mvnw compile -B -q

      - name: Unit tests
        run: ./mvnw test -B -pl '!*-it' -Dtest='!**/*IT*'

      - name: Integration tests (Testcontainers)
        run: ./mvnw verify -B
        env:
          TESTCONTAINERS_RYUK_DISABLED: "true"

      - name: Security audit (OWASP)
        run: ./mvnw dependency-check:check -B -DfailBuildOnCVSS=7

      - name: Build Docker image
        run: ./mvnw spring-boot:build-image -B -DskipTests
        if: github.ref == 'refs/heads/main'
```

### OWASP dependency-check plugin in `pom.xml`

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.owasp</groupId>
      <artifactId>dependency-check-maven</artifactId>
      <version>10.0.4</version>
      <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
        <formats>
          <format>HTML</format>
          <format>JSON</format>
        </formats>
      </configuration>
    </plugin>
  </plugins>
</build>
```

### Testcontainers in CI with Docker-in-Docker

```yaml
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      dind:
        image: docker:24-dind
        options: --privileged
        ports:
          - 2375:2375

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
          cache: maven

      - name: Integration tests
        run: ./mvnw verify -B
        env:
          DOCKER_HOST: tcp://localhost:2375
          TESTCONTAINERS_RYUK_DISABLED: "true"
```

### Testcontainers Cloud (alternative to DinD)

```yaml
      - name: Setup Testcontainers Cloud
        uses: atomicjar/testcontainers-cloud-setup-action@v1
        with:
          token: ${{ secrets.TC_CLOUD_TOKEN }}

      - name: Integration tests
        run: ./mvnw verify -B
```

### Docker image with `spring-boot:build-image`

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
      <configuration>
        <image>
          <name>${project.artifactId}:${project.version}</name>
          <env>
            <BP_JVM_VERSION>21</BP_JVM_VERSION>
          </env>
        </image>
      </configuration>
    </plugin>
  </plugins>
</build>
```

### Docker image with explicit Dockerfile

```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
```

### Dependabot for Maven

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: maven
    directory: "/"
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    labels:
      - dependencies
    reviewers:
      - team-lead
    groups:
      spring-boot:
        patterns:
          - "org.springframework.boot:*"
          - "org.springframework:*"
          - "org.springframework.security:*"
      testing:
        patterns:
          - "org.junit*"
          - "org.mockito*"
          - "org.testcontainers*"

  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
```

### Staged rollout with environment gates

```yaml
jobs:
  build:
    # ... compile, test, verify, security steps ...

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: echo "Deploy to staging environment"

      - name: Smoke test
        run: |
          curl --fail --retry 5 --retry-delay 10 \
            https://staging.example.com/actuator/health

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - name: Deploy to production
        run: echo "Deploy to production environment"
```

## What to Verify
- The pipeline runs `./mvnw clean verify` and does not skip tests
- JDK version is pinned explicitly and Maven dependencies are cached
- Testcontainers tests have Docker daemon access in CI (DinD or Testcontainers Cloud)
- A security audit step fails the build on critical vulnerabilities
- Docker image builds use a pinned base image, not `latest`
- Credentials and tokens come from GitHub Secrets, never hardcoded
- Deployment follows a staged path: staging → smoke test → production
- Dependabot is configured for both Maven and GitHub Actions ecosystems

## See References
- `maven-master` for Maven multi-module build structure and partial builds
- `spring-boot-engineer` for application code and test patterns
- `tdd-guide` for test-first workflow and test type selection
- `observability-master` for health endpoints used in deployment smoke tests
