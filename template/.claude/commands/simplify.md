---
description: Simplify Java code for clarity and maintainability — reduce complexity without changing behavior
---

Load the `clean-code` skill.

Simplify recently changed code (or the specified scope) while preserving exact behavior:

1. Read `AGENTS.md` and study project conventions (no Lombok, constructor injection, records for DTOs)
2. Identify the target code — recent changes unless a broader scope is specified
3. **Chesterton's Fence** — understand why the code exists before changing it. Check `git blame` for context.
4. Scan for simplification opportunities:
   - Deep nesting → guard clauses
   - Long methods → extract by behavior, not by line count
   - Poor names → rename to carry domain meaning
   - Duplicated business rules → extract one source of truth
   - Primitive obsession → introduce value objects or records
   - Magic numbers → named constants
   - Dead code → remove after confirming
5. Apply each simplification **incrementally** — run `./mvnw test -pl module-name` after each change
6. If tests fail after a simplification, revert that change and reconsider
7. Verify: `./mvnw clean verify`

**Do not** mix simplification with feature work. Keep refactoring commits separate.
