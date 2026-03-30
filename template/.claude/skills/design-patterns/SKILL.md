---
name: design-patterns
description: Pattern-selection guidance for Java codebases with focused implementation defaults. Use when deciding whether a Factory, Builder, Strategy, Decorator, Observer, Adapter, or related pattern is justified, or when refactoring rigid code into a clearer extension model.
license: MIT
metadata:
  author: local
  version: "1.1.1"
  domain: architecture
  triggers:
    - design pattern
    - factory pattern
    - builder pattern
    - strategy pattern
    - observer pattern
    - decorator pattern
    - adapter pattern
    - template method
    - singleton pattern
    - extensible component
    - remove switch statement
    - refactor rigid code
  role: guide
  scope: architecture
  output-format: code + guidance
  related-skills: clean-code, java-architect, spring-boot-master, kafka-master
---

# Design Patterns Skill

Decision guide for when a pattern is actually warranted in Java applications.

## When to Use
- The user asks whether a specific pattern fits a design problem
- The code needs a clearer extension point, substitution model, or creation boundary
- A refactor is moving from rigid conditionals or duplicated workflows toward a stable design seam
- You need pattern-specific implementation guidance after deciding that plain composition is not enough

## When Not to Use
- A simple conditional, constructor, helper method, or composition already solves the problem clearly
- The task is mostly code cleanup, naming, or readability — use `clean-code`
- The decision is mostly about Spring layering, dependency injection, controllers, or service boundaries — use `spring-boot-master`
- The problem is system-level architecture or service boundaries rather than class-level structure — use `java-architect`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Builder, Factory, Singleton | `references/creational.md` | Choosing how objects should be created or assembled |
| Strategy, Observer, Template Method | `references/behavioral.md` | Choosing how behavior varies, events propagate, or workflows differ |
| Decorator, Adapter | `references/structural.md` | Wrapping behavior or integrating mismatched interfaces |
| Sealed interfaces, records, and framework-native alternatives | `references/java-modern-patterns.md` | Preferring modern Java or framework-native alternatives over classic GoF forms |
| Failure modes and overuse | `references/gotchas.md` | Avoiding pattern cargo culting or framework-hostile designs |

## Pattern Selection Ladder

1. **Can a plain method, constructor, or composition solve this cleanly?** Stop there.
2. **Is object creation the real problem?** Consider Builder or Factory.
3. **Is runtime behavior swapping the real problem?** Consider Strategy.
4. **Is behavior wrapping the same abstraction?** Consider Decorator.
5. **Is interface mismatch the issue?** Consider Adapter.
6. **Is event fan-out or callback notification the issue?** Consider Observer or framework-native events.
7. **Do you just need one shared container-managed component?** Prefer the existing DI/container singleton scope over a manual Singleton pattern.

## Quick Mapping

| Situation | Default Choice | Prefer Instead Of |
|-----------|----------------|-------------------|
| Many optional constructor parameters | Builder | Telescoping constructors |
| Several implementations behind one use case | Strategy | Large `switch` blocks |
| Type-based object creation | Factory | Repeated `new` logic spread across callers |
| Add cross-cutting behavior while preserving interface | Decorator | Deep inheritance hierarchies |
| Integrate incompatible third-party or legacy API | Adapter | Contaminating domain code with foreign interface details |
| Publish domain/application events | Observer / framework events | Tight direct coupling across many listeners |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Start with the simplest design that preserves clarity | Plain composition before GoF patterns |
| Tie the pattern to one real pressure | creation, variation, wrapping, adaptation, or fan-out |
| Keep framework/container idioms in mind | Use DI, bean scopes, and events instead of manual infrastructure patterns when appropriate |
| Make the extension seam obvious | Small interface, focused abstraction, narrow responsibility |

### MUST NOT DO
- Do not introduce a pattern just because the name sounds impressive
- Do not use Singleton where Spring dependency injection already manages lifecycle cleanly
- Do not use Template Method when Strategy or composition keeps coupling lower
- Do not build factories when the concrete type is already obvious at the call site
- Do not create deep decorator or observer chains that are harder to debug than the original code

## Gotchas

- Pattern overuse is worse than a missing pattern. The first question is always whether a simpler shape is enough.
- In container-managed applications, manual Singleton and Observer implementations are often weaker than built-in bean scopes and event publishing.
- Replacing one `switch` with a large registry can still be over-engineering if the set of cases is tiny and stable.
- Template Method often looks elegant but can freeze behavior into inheritance when composition would evolve more safely.
- Decorator and Observer chains become opaque quickly; keep tracing and testability in mind before stacking them.

## Minimal Examples

### Strategy over branching
```java
public interface PricingStrategy {
    BigDecimal calculate(Order order);
}

public final class StandardPricingStrategy implements PricingStrategy {
    @Override
    public BigDecimal calculate(Order order) {
        return order.subtotal();
    }
}

public final class PromotionalPricingStrategy implements PricingStrategy {
    @Override
    public BigDecimal calculate(Order order) {
        return order.subtotal().multiply(new BigDecimal("0.90"));
    }
}
```

### Builder for complex creation
```java
public final class ReportRequest {

    private final String name;
    private final Locale locale;
    private final boolean includeCharts;

    private ReportRequest(Builder builder) {
        this.name = builder.name;
        this.locale = builder.locale;
        this.includeCharts = builder.includeCharts;
    }

    public static Builder builder(String name) {
        return new Builder(name);
    }

    public static final class Builder {
        private final String name;
        private Locale locale = Locale.ENGLISH;
        private boolean includeCharts;

        private Builder(String name) {
            this.name = name;
        }

        public Builder locale(Locale locale) {
            this.locale = locale;
            return this;
        }

        public Builder includeCharts(boolean includeCharts) {
            this.includeCharts = includeCharts;
            return this;
        }

        public ReportRequest build() {
            return new ReportRequest(this);
        }
    }
}
```

## What to Verify
- The pattern solves a real design pressure, not hypothetical future flexibility
- The abstraction is smaller and clearer than the code it replaced
- Framework/container features are not being reimplemented manually
- Tests can exercise the seam without excessive setup or global state

## See References
- `references/creational.md` for Builder, Factory, and Singleton guidance
- `references/behavioral.md` for Strategy, Observer, and Template Method guidance
- `references/structural.md` for Decorator and Adapter guidance
- `references/java-modern-patterns.md` for sealed interfaces, records, and framework-native alternatives
- `references/gotchas.md` for common failure modes and overuse patterns
