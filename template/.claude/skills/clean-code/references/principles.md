# Core Principles

## DRY

DRY means one source of truth for a piece of knowledge. It does **not** mean collapsing every similar-looking block into one abstraction.

Use DRY when:
- the same validation rule appears in multiple places
- a pricing rule or state transition is duplicated
- several call sites reconstruct the same concept differently

Do not force DRY when:
- two behaviors only share shape, not meaning
- the abstraction name becomes vaguer than the duplicated code
- the branches are likely to evolve independently

## KISS

Prefer the simplest code that expresses the behavior clearly.

Signals that KISS is being violated:
- `Optional`, streams, or generics are making a trivial branch harder to scan
- a helper exists only to hide a one-line operation
- a "flexible" abstraction exists for a single use case

## YAGNI

Do not add interfaces, extension points, configuration flags, or generic repositories "just in case."

Common YAGNI smells:
- abstract base class with one subclass
- configuration properties that no caller needs
- repository/service methods added for hypothetical future screens

## Tell, Don't Ask

Prefer behavior on the owning object over reaching in, reading data, and deciding externally.

Better:
```java
account.withdraw(amount);
```

Worse:
```java
if (account.getBalance().compareTo(amount) >= 0) {
    account.setBalance(account.getBalance().subtract(amount));
}
```

## Law of Demeter

Avoid train-wreck navigation like `order.getCustomer().getAddress().getCity()` when the owning type can expose a meaningful method instead.

Use this principle to improve boundary clarity, not to create pointless pass-through methods everywhere.
