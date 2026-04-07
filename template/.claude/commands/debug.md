---
description: Systematic root-cause debugging — reproduce, localize, fix, guard with a regression test
---

Load the `debugging-and-error-recovery` skill.

**Stop-the-Line**: Do not add new features or refactor while debugging. The failure is the only priority.

Follow the six-step triage checklist:

1. **Reproduce** — run the exact failing command and confirm the failure is consistent
   ```
   ./mvnw test -Dtest=ClassName#methodName -pl module-name
   ```
2. **Localize** — narrow to the layer: Controller → Service → Repository → Database
   - Read the full "caused by" chain — Spring wraps exceptions deeply
   - Use the error type to identify the layer (see `references/spring-error-catalog.md`)
3. **Reduce** — strip to the minimal input that still fails
4. **Fix root cause** — change the code that causes the wrong behavior, not a downstream symptom
5. **Guard** — write a regression test that fails without the fix and passes with it
   - Reference the issue in `@DisplayName`
   - Assert the correct behavior, not just "does not throw"
6. **Verify** — run the full suite: `./mvnw test`

For regressions, use `git bisect`:
```
git bisect start
git bisect bad
git bisect good <known-good-sha>
git bisect run ./mvnw test -Dtest=ClassName#method -pl module-name
```

Remove all temporary `log.debug()` instrumentation after the fix.
