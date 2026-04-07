# Phase Gate Criteria

Each phase has entry conditions and exit criteria. Do not advance until the gate is met.

```
SPECIFY ──gate──▶ PLAN ──gate──▶ TASKS ──gate──▶ IMPLEMENT
```

---

## 1 — SPECIFY Gate

**Entry:** A feature request or requirement exists.

**Exit Criteria:**

- [ ] All six spec areas filled (Objective, Commands, Structure, Style, Testing, Boundaries)
- [ ] At least one success criterion per objective, phrased as observable behavior
- [ ] Assumption log created; no critical assumptions remain Open
- [ ] Boundaries explicitly state what is out of scope

**Who Reviews:** Author + stakeholder (product owner or tech lead).

**Common Failures:**

| Failure | Consequence |
|---------|-------------|
| Success criteria say "works correctly" instead of observable behavior | Untestable; no clear acceptance gate |
| Assumptions left as Open and forgotten | Silent breakage when assumption proves wrong |
| Boundaries section empty | Scope creep during IMPLEMENT |

---

## 2 — PLAN Gate

**Entry:** SPECIFY gate passed; spec is locked (living updates logged).

**Exit Criteria:**

- [ ] Maven module(s) identified or created; `pom.xml` compiles (`./mvnw validate`)
- [ ] Layer responsibilities mapped: Controller → Service → Repository
- [ ] Integration points with other modules or external systems documented
- [ ] Service interfaces defined (names and method signatures, no implementations)

**Who Reviews:** Author + architect (or `java-architect` skill).

**Common Failures:**

| Failure | Consequence |
|---------|-------------|
| Module boundary unclear; shared entities across modules | Circular dependencies at build time |
| Layers skipped (controller calls repository directly) | Business logic leaks, untestable |
| Integration points assumed but not documented | Runtime failures in integration tests |

---

## 3 — TASKS Gate

**Entry:** PLAN gate passed; module structure and layer mapping agreed.

**Exit Criteria:**

- [ ] Each task is a single vertical slice (one endpoint or one service method)
- [ ] Every task has at least one acceptance test named explicitly
- [ ] Tasks are ordered: entity → repository → service → controller → integration
- [ ] No task depends on unresolved assumptions

**Who Reviews:** Author (self-review against spec).

**Common Failures:**

| Failure | Consequence |
|---------|-------------|
| Tasks too large (whole CRUD in one task) | Can't verify incrementally; big-bang merge |
| No acceptance test listed per task | "Done" is undefined |
| Wrong ordering (controller before service) | Compile errors; blocked progress |

---

## 4 — IMPLEMENT Gate

**Entry:** TASKS gate passed; ordered task list ready.

**Exit Criteria:**

- [ ] Every task implemented using TDD (red → green → refactor)
- [ ] `./mvnw clean verify` passes from the root reactor
- [ ] No `@Disabled` or `@Ignored` tests remain
- [ ] Spec updated if any constraint changed during implementation
- [ ] Code reviewed against spec success criteria

**Who Reviews:** Author + code reviewer (or `code-reviewer` agent).

**Common Failures:**

| Failure | Consequence |
|---------|-------------|
| Tests written after code, not before | Tests mirror implementation, miss edge cases |
| `./mvnw test` passes but `./mvnw verify` skipped | Integration or plugin checks missed |
| Spec not updated after scope change | Spec and code drift; spec becomes stale |
