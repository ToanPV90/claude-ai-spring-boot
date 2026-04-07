---
name: clean-code
description: Readability-focused refactoring guidance for Java codebases. Use when simplifying complex code, improving naming, reducing duplication, shrinking large methods, or addressing maintainability issues without changing the overall architecture.
license: MIT
metadata:
  author: local
  version: "1.2.0"
  domain: backend
  triggers:
    - clean code
    - improve readability
    - reduce duplication
    - reduce complexity
    - code smells
    - naming
    - long method
    - magic numbers
    - guard clauses
    - maintainability
    - simplify code
    - refactor messy code
  role: guide
  scope: review
  output-format: code + guidance
  related-skills: request-refactor-plan, design-patterns, java-code-review
---

# Clean Code Skill

Decision guide for simplifying code without smuggling in architecture churn or pattern cargo culting.

## When to Use
- The user wants code to be easier to read, name, or maintain
- A method, class, or conditional has become harder to follow than the behavior requires
- There is obvious duplication, primitive obsession, magic numbers, or comment-driven code
- A refactor should stay local and clarity-focused rather than become a broad redesign

## When Not to Use
- The user needs a rollout plan, staged migration, or tiny-commit refactor sequence — use `request-refactor-plan`
- The main question is pattern selection or extension-model design — use `design-patterns`
- The work is primarily architecture, module boundaries, or framework/layering tradeoffs — use `java-architect`; if the task is explicitly Spring Boot layering, use `spring-boot-master`
- The task is a formal Java review pass rather than readability-first refactoring — use `java-code-review`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| DRY, KISS, YAGNI, Tell-Don't-Ask, Demeter | `references/principles.md` | Deciding which principle applies and what it really forbids |
| Naming, method shape, parameters, comments | `references/readability.md` | Renaming, shrinking methods, removing flag arguments, or clarifying intent |
| Smells, guard clauses, value objects, magic numbers | `references/smells-and-refactorings.md` | Mapping a smell to a safe cleanup move |
| Review checklist and sequencing defaults | `references/review-workflow.md` | Running a maintainability review or deciding what to fix first |
| Failure modes and over-refactoring risks | `references/gotchas.md` | Avoiding abstraction churn, false DRY, or cleanup that hides behavior |

## Simplification Ladder

0. **Chesterton's Fence — understand why code exists before removing it.** Check `git blame` for original context. Do not simplify what you do not understand.
1. **Can naming alone make this clearer?** Rename before extracting.
2. **Is the method doing more than one thing?** Extract by behavior, not by line count.
3. **Is duplication repeating knowledge or just structure?** Remove only the knowledge duplication.
4. **Is a parameter list telling you a concept is missing?** Introduce a value object or request object.
5. **Is a conditional hard to scan?** Try guard clauses or move behavior closer to the owning type.
6. **Would a pattern make this clearer, or just more abstract?** Stop and switch to `design-patterns` only when the design pressure is real.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Long method mixing responsibilities | Extract focused methods | One giant "process" method |
| Poor names hiding intent | Rename variables, methods, and types | Adding comments to explain bad names |
| Repeated business rule in multiple places | Extract one source of truth | Copy-paste with tiny wording changes |
| Too many primitive parameters | Introduce a parameter or value object | Eight-argument methods |
| Nested conditionals | Guard clauses or polymorphic dispatch when justified | Deep indentation |
| Magic literals | Named constants or domain types | Repeating unexplained numbers or strings |

## Constraints

### MUST DO

| Rule | Preferred Move |
|------|----------------|
| Start with the smallest clarity improvement that changes the least behavior | Rename, extract, inline, delete |
| Keep the domain language visible | Names should reflect business meaning, not implementation trivia |
| Remove duplication of knowledge, not merely similar syntax | Shared rule yes; coincidental shape no |
| Keep methods and classes at one level of abstraction | Separate orchestration from detail |
| Delete dead code when it is truly dead | Fewer branches beat speculative reuse |
| Simplify one step at a time | Run tests after each individual simplification to isolate regressions |

### MUST NOT DO
- Do not replace simple code with a pattern just to look more "clean"
- Do not chase DRY so hard that unrelated behaviors get welded together
- Do not hide domain logic behind vague names like `process`, `handle`, `manager`, or `utils`
- Do not preserve bad structure with comments when a rename or extraction would remove the confusion
- Do not balloon a local cleanup into architecture work unless the user asked for that scope

## Gotchas

- False DRY is one of the most common clean-code mistakes: similar-looking code may represent different business rules.
- "Clean" abstractions that force callers through helpers, wrappers, or generic base classes can be less readable than the duplication they removed.
- A short method is not automatically a clear method; over-extraction can destroy flow.
- Comments often survive longer than the code they explain. Prefer names and structure first, comments for why/constraints only.
- Utility classes and boolean flag arguments often look harmless at first and then become dumping grounds.

## Common Rationalizations

| What You Hear | What to Think Instead |
|---------------|----------------------|
| "These three lines look similar, DRY them" | Similar structure ≠ shared knowledge. Merge only when the duplication repeats the same business rule. |
| "This method is too long" | Length is a symptom, not the disease. Extract by behavior, not by line count. |
| "I'll clean this up while I'm here" | Separate refactoring commits from feature commits. |

## Red Flags

- Simplifying code you don't fully understand
- Mixing refactor and feature changes in one commit
- Creating new utility files for one-time operations
- Replacing simple code with patterns "for cleanliness"

## Minimal Examples

### Rename and extract before redesign
```java
public void process(Order order) {
    if (order == null) {
        return;
    }

    validate(order);
    calculateTotals(order);
    sendConfirmation(order);
}
```

### Replace primitive obsession with a value object
```java
public record EmailAddress(String value) {
    public EmailAddress {
        if (value == null || !value.contains("@")) {
            throw new IllegalArgumentException("Invalid email");
        }
    }
}

public void register(EmailAddress emailAddress) {
    // business logic
}
```

## What to Verify
- The refactor made the code easier to read without widening scope unnecessarily
- Names now carry domain meaning without comment support
- The extracted abstraction is smaller and clearer than the original duplication
- Tests still describe behavior rather than helper structure
- No architecture or pattern churn was introduced accidentally

## See References
- `references/principles.md` for DRY, KISS, YAGNI, Tell-Don't-Ask, and Demeter
- `references/readability.md` for naming, method shape, parameters, and comments
- `references/smells-and-refactorings.md` for smell-to-refactoring guidance
- `references/review-workflow.md` for maintainability review order and triage
- `references/gotchas.md` for failure modes during cleanup
