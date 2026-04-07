---
description: Break work into small verifiable tasks with acceptance criteria, dependency ordering, and ./mvnw verification commands
---

Load the `planning-and-task-breakdown` skill.

Read the existing spec (`SPEC.md` or equivalent) and the relevant codebase sections. Then:

1. **Plan Mode** — read only, no code changes. Study the existing entities, services, controllers, tests, and Maven module layout.
2. **Map the dependency graph** — Schema/Migration → Entity → Repository → Service → Controller → Integration Tests.
3. **Slice vertically** — each task delivers one working, testable behavior end-to-end. Avoid horizontal layers.
4. **Write each task** with:
   - Size (XS/S/M/L — flag XL as a break signal)
   - Module name
   - Dependencies on prior tasks
   - Acceptance criteria (concrete, verifiable)
   - `./mvnw` verification command
5. **Add checkpoints** every 2-3 tasks with `./mvnw -pl module verify` or `./mvnw clean verify`.
6. **Present the plan** for human review before implementation begins.

Output format: numbered task list with the task template from the skill.
