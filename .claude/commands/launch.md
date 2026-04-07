---
description: Run the pre-launch checklist and prepare a Spring Boot service for production deployment
---

Load the `ci-cd-and-automation` skill alongside the `security-and-hardening` skill.

Run through the complete pre-launch checklist for a Spring Boot service:

1. **Code Quality**
   - `./mvnw clean verify` passes (all tests green, build clean)
   - No `@Disabled` tests without tracked issues
   - No TODO/FIXME without ticket references
   - No `System.out.println` or temporary `log.debug()` left behind

2. **Security**
   - `./mvnw dependency-check:check -DfailBuildOnCVSS=7` — no critical vulnerabilities
   - No hardcoded secrets in source or `application.yml`
   - `SecurityFilterChain` configured with deny-by-default
   - CSRF, CORS, and security headers explicitly configured
   - `@Valid` present on all controller request parameters

3. **Performance**
   - N+1 queries resolved (check with `hibernate.generate_statistics`)
   - All list endpoints paginated with `Pageable`
   - HikariCP pool sized and leak detection enabled
   - `@Transactional(readOnly = true)` on read-only paths

4. **Infrastructure**
   - Environment variables documented in `.env.example`
   - Liquibase migrations tested with rollback
   - `/actuator/health` exposed and other actuator endpoints secured
   - Docker image builds: `./mvnw spring-boot:build-image`

5. **Documentation**
   - ADRs written for non-trivial architectural decisions
   - Module READMEs exist with purpose and build commands
   - OpenAPI/springdoc accessible at `/swagger-ui.html`

6. **Deployment**
   - CI pipeline runs `./mvnw clean verify` + security audit
   - Staged rollout: staging → smoke test → production
   - Rollback plan documented

Report any failing checks and help resolve them before deployment.
