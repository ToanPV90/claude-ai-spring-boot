# Readability Defaults

## Naming

Prefer names that expose domain meaning:
- `customerEmail` over `value`
- `sendWelcomeEmail()` over `process()`
- `ShippingCalculator` over `Helper`
- `isActive` / `hasQuota` over `flag` or `status`
- `MAX_RETRY_ATTEMPTS` over `retryLimitValue`

Red flags:
- `manager`, `util`, `helper`, `data`, `info`
- booleans like `flag`, `status`, `check`
- methods named `handle`, `run`, `doIt`, or `process` without a noun

Constant/default naming rules:
- `static final` constants should use `UPPER_SNAKE_CASE`
- boolean names should read like facts or capabilities: `isActive`, `hasItems`, `canRetry`, `shouldNotify`
- exception types should end with `Exception`

## Method Shape

Good methods usually:
- stay at one abstraction level
- do one kind of work
- avoid deep nesting
- expose intent through structure

Prefer:
- guard clauses over nested pyramids
- extraction by behavior over extraction by arbitrary line chunks
- one orchestration method that calls smaller intent-revealing helpers

## Parameters

When parameter lists grow, first ask whether a missing concept is hiding underneath.

Prefer:
- request objects for related inputs
- value objects for validated concepts
- separate methods instead of boolean flag arguments

## Comments

Good comments explain:
- why an unusual choice exists
- external constraints
- sequencing requirements
- temporary compromises with a removal condition

Bad comments explain:
- what obvious code already says
- poor naming that should be fixed instead
- stale historical intent no longer visible in behavior
