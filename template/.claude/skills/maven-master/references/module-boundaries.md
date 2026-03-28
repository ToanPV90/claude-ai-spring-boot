# Module Boundaries

## Common Module Types

| Module | Owns | Avoid |
|-------|------|-------|
| `common` | shared value types, DTOs, validation contracts, tiny utilities | business rules for every team |
| `api` | public contracts or client-facing interfaces | implementation logic |
| `service` | deployable Spring Boot application code | leaking reusable contracts back downward |
| `starter` | auto-configuration and reusable platform wiring | app-specific business behavior |
| `integration-tests` | cross-module verification | becoming the only test layer |

## Default Spring Layout Across Modules

Use Maven modules for coarse boundaries and packages for fine boundaries.

```text
my-project/
├── common/                 # shared contracts
└── service/                # deployable Spring Boot app
    └── src/main/java/...   # controller/service/repository layering inside the module
```

## Boundary Rules

- Keep layered Spring packages inside each module; modules do not replace controller/service/repository separation.
- Pull out a child module only when multiple modules genuinely consume it.
- Prefer wide, shallow module trees over deeply nested Maven hierarchies.

## Anti-Patterns
- `common` becomes a dumping ground for domain logic
- every package becomes its own module
- one child module reaches deep into another child module’s internals instead of depending on a published contract
