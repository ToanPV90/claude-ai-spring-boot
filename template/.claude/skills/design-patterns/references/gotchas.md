# Design Pattern Gotchas

- **Pattern cargo culting:** a named pattern is not automatically better than simple code.
- **Factory inflation:** centralizing every `new` call creates indirection without real value.
- **Spring-hostile singletons:** manual singletons fight the container and hide dependencies.
- **Template Method overreach:** inheritance can lock behavior into brittle class trees when composition would be easier to evolve.
- **Registry disguised as strategy:** a map of handlers is useful only if behavior truly varies and the set is expected to grow.
- **Decorator tunnels:** multiple wrappers can make control flow and debugging opaque.
- **Observer/event overuse:** not every collaboration should become an event; explicit method calls are often clearer.
- **Pattern mismatch:** choosing a pattern by name before identifying the actual design pressure almost always produces the wrong abstraction.
