# Test Type Selection

## Default Choice Order

Start with the narrowest test that proves the behavior.

| Layer | Annotation / Tooling | Use When | Route Elsewhere |
|------|-----------------------|----------|-----------------|
| Controller | `@WebMvcTest` | HTTP routing, validation, request/response mapping, security response codes | Use `spring-boot-engineer` if you need implementation scaffolding |
| Service | JUnit 5 + Mockito | Business rules, branching logic, orchestration decisions | Use `java-code-review` for review-only concerns |
| Repository | `@DataJpaTest` + real database | Custom queries, persistence rules, data integrity | Use `jpa-patterns` for deeper ORM/fetch/query guidance |
| Full integration | `@SpringBootTest` + TestContainers | End-to-end feature verification across layers | Keep this focused; do not make every test an integration test |
| Kafka flow | `@SpringBootTest` + `@EmbeddedKafka` or TestContainers | Message routing, retry/DLT behavior, idempotency | Use `kafka-patterns/references/testing.md` for concrete mechanics |
| Redis flow | `@SpringBootTest` or `@DataRedisTest` + TestContainers | Cache hit/miss, eviction, TTL, RedisTemplate behavior | Use `redis-patterns/references/testing.md` for concrete mechanics |

## Heuristics

- If the failure should be visible through HTTP, start at the controller slice.
- If the risk is pure business logic, start with a pure unit test.
- If query correctness or database behavior is the risk, start with a persistence slice.
- If the feature crosses multiple infrastructure boundaries, add an end-to-end test after narrower tests are green.

## Decision Tree

```text
New behavior
│
├── HTTP contract risk? -> @WebMvcTest
├── Pure branching logic? -> Unit test
├── Query / persistence risk? -> @DataJpaTest
├── Async messaging/cache risk? -> specialist skill + TDD workflow
└── Full wiring confidence needed? -> @SpringBootTest after narrower greens
```
