# CI/CD Gotchas & Anti-Patterns

## Pipeline Anti-Patterns

- **`-DskipTests` as the default CI step.** If tests are too slow or flaky, fix them — skipping defeats the purpose of CI.
- **Caching `~/.m2` instead of `~/.m2/repository`.** Caching the full directory includes `settings.xml`, wrapper jars, and lock files — causes stale configuration bugs.
- **No security audit step.** Dependency vulnerabilities slip into production. Add OWASP dependency-check and fail on CVSS ≥ 7.
- **Security audit as non-blocking advisory.** If it doesn't fail the build, it doesn't prevent vulnerable code from shipping.
- **Deploying directly to production without a staging gate.** Even a basic smoke test (`curl /actuator/health`) catches deployment failures before users do.

## Docker Anti-Patterns

- **Using `latest` tag for base images.** `FROM eclipse-temurin:latest` produces unreproducible builds. Pin: `eclipse-temurin:21-jre-alpine`.
- **Building Docker images without tests passing first.** Image build should come after `verify`, not replace it.
- **`spring-boot:build-image` inside a container without DinD.** Buildpacks require a Docker daemon; ensure one is available.

## Testcontainers Anti-Patterns

- **Skipping integration tests in CI because "Testcontainers is hard."** Use DinD or Testcontainers Cloud; don't skip the tests.
- **Starting a new container per test class.** Use singleton containers for expensive services (Postgres, Kafka) to reduce CI time.
- **Hardcoding container ports.** Always use dynamic port mapping — hardcoded ports cause conflicts in parallel runs.
- **Ignoring `TESTCONTAINERS_RYUK_DISABLED=true`.** Ryuk cleanup can fail on restricted runners; disable it in CI.

## Credential Anti-Patterns

- **Hardcoded secrets in workflow files.** Use `${{ secrets.SECRET_NAME }}` — never plain text.
- **Broad `permissions` scope.** Use `permissions: contents: read` and add specific permissions only when needed.
- **Storing tokens in repository variables instead of secrets.** Variables are visible in logs; secrets are masked.

## Common Rationalizations to Reject

| Rationalization | Why It's Wrong |
|----------------|---------------|
| "Tests pass locally so CI is optional" | CI catches environment-specific failures, dependency drift, and merge conflicts |
| "We'll speed up CI later" | Slow CI erodes the team's willingness to run it; cache dependencies now |
| "Dependabot PRs are too noisy" | Configure groups and auto-merge for patch updates; ignoring updates is worse |
| "Manual deployment works fine" | Manual steps are forgotten under pressure; automate the gate, not the hope |
| "Security scanning is the security team's job" | Shift-left: developers own the first line of defense at build time |
