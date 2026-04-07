# GitHub Actions Workflow Patterns

## Maven Dependency Caching

```yaml
- uses: actions/setup-java@v4
  with:
    distribution: temurin
    java-version: 21
    cache: maven          # Built-in cache — simplest option
```

For manual cache control, use `actions/cache@v4` on `~/.m2/repository` (never the entire `~/.m2`).

## Matrix Builds (Multi-JDK)

```yaml
strategy:
  matrix:
    java-version: [17, 21]
steps:
  - uses: actions/setup-java@v4
    with: { distribution: temurin, java-version: ${{ matrix.java-version }}, cache: maven }
  - run: ./mvnw clean verify -B
```

## Artifact Upload

```yaml
- name: Upload test reports
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-reports
    path: '**/target/surefire-reports/'
    retention-days: 7
```

## Environment Gates (Staged Deployment)

```yaml
deploy-staging:
  needs: build
  runs-on: ubuntu-latest
  environment: staging
  steps:
    - run: echo "Deploy to staging"
    - run: curl --fail --retry 5 https://staging.example.com/actuator/health

deploy-production:
  needs: deploy-staging
  runs-on: ubuntu-latest
  environment:
    name: production
    url: https://app.example.com
  steps:
    - run: echo "Deploy to production"
```

Configure **environment protection rules** in GitHub Settings → Environments → Required reviewers.

## Reusable Workflow

Define a `workflow_call` in a shared repo with `java-version` input. Consumer repos call it with `uses: org/shared-workflows/.github/workflows/maven-ci.yml@main`. Keeps CI DRY across repositories.
