---
description: Start spec-driven development — write a structured specification before writing any Java/Spring Boot code
---

Load the `spec-driven-development` skill.

Begin by understanding what the user wants to build. Ask clarifying questions about:

1. The objective, target users, and success criteria
2. Core features and acceptance criteria (observable behaviors, not vague goals)
3. Maven module boundaries and Spring Boot layering
4. Known boundaries — what is in scope, out of scope, and deferred
5. Authentication/authorization assumptions (Keycloak, custom, or none)

Then generate a structured spec covering all six core areas:

- **Objective** — one-sentence goal with measurable success criteria
- **Commands** — `./mvnw clean verify`, `./mvnw test -pl module`, `./mvnw spring-boot:run -pl module`
- **Project Structure** — Maven modules, packages, controller/service/repository layers
- **Code Style** — records for DTOs, constructor injection, no Lombok, interfaces with Impl
- **Testing Strategy** — concrete annotations (`@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest` + Testcontainers)
- **Boundaries** — in scope, out of scope, deferred, assumptions log

Surface every assumption as a question before locking the spec.
Save the spec as `SPEC.md` in the project or module root and confirm with the user before proceeding.
