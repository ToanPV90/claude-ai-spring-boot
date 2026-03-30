---
name: openapi-master
description: Authoring and configuration guidance for OpenAPI 3 documentation in Spring Boot using springdoc-openapi, including spec design, annotation conventions, schema customization, and contract-first vs code-first tradeoffs. Use when adding or improving OpenAPI documentation, configuring springdoc, customizing schemas, or deciding on API-first design workflows.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: backend
  triggers:
    - OpenAPI
    - OpenAPI 3
    - springdoc
    - springdoc-openapi
    - swagger
    - Swagger UI
    - API documentation
    - @Operation
    - @ApiResponse
    - @Schema
    - @Parameter
    - @Tag
    - contract-first
    - API-first
    - openapi.yaml
    - openapi.json
    - api-docs
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: api-contract-review, spring-boot-engineer, spring-boot-master
---

# OpenAPI Master

Implementation guide for designing, documenting, and maintaining OpenAPI 3 specifications in Spring Boot with springdoc-openapi, without mixing spec authoring with code review or system architecture.

## When to Use
- You are adding springdoc-openapi to an existing Spring Boot service
- API documentation is missing, incomplete, or not customized
- You need to decide between code-first and contract-first API design
- Schema customization, examples, or security scheme documentation is needed
- You need to configure Swagger UI for a development or staging environment

## When Not to Use
- The task is reviewing an existing API contract for correctness — use `api-contract-review`
- The task is general Spring Boot controller/service structure — use `spring-boot-master`
- The task is system-level API versioning or service-boundary decisions — use `java-architect`

## Version Assumptions
- Spring Boot 3.x
- springdoc-openapi 2.x (`springdoc-openapi-starter-webmvc-ui`)
- Jakarta EE 10 (Spring Boot 3.x baseline)
- OpenAPI 3.0 or 3.1

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| springdoc-openapi configuration, Swagger UI, GroupedOpenApi | `references/springdoc.md` | Adding or configuring springdoc in Spring Boot |
| Contract-first design, YAML spec authoring, code generation | `references/contract-first.md` | Adopting API-first workflow or generating server stubs |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| `/v3/api-docs` returns 404 | Is springdoc on classpath? Is actuator conflicting? | Add dependency; check `springdoc.api-docs.path` |
| Swagger UI not loading | Is `springdoc-openapi-starter-webmvc-ui` (not just api-docs) present? | Add the UI starter |
| Schemas show as `object` instead of typed | Are records/DTOs using Jakarta Validation? | Add `@Schema` or ensure Jackson can introspect the type |
| Enum values not showing in spec | Is the enum using `@JsonValue`? | Add `@Schema(enumAsRef = true)` or `@JsonProperty` |
| Security scheme not appearing | Is `@SecurityRequirement` on the operation? | Add `@SecurityScheme` to config + `@SecurityRequirement` to controller |
| Actuator endpoints appear in spec | Is the actuator included by default? | Set `springdoc.show-actuator=false` |

## OpenAPI Decision Ladder

1. **New project?** Adopt contract-first: write the YAML spec, generate stubs, implement against them.
2. **Existing project without docs?** Use code-first: add springdoc-openapi annotations to existing controllers.
3. **Need to share the spec with consumers?** Expose `/v3/api-docs.yaml` and commit it to source control.
4. **Multiple API groups?** Use `GroupedOpenApi` beans to split by version or domain.
5. **Need auth documentation?** Add `@SecurityScheme` config + `@SecurityRequirement` on secured operations.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| New API project | Contract-first with YAML + codegen | Ad hoc controller then retro-doc |
| Existing project | springdoc-openapi code-first | Manual YAML maintenance |
| Grouping by version | `GroupedOpenApi` with path pattern | Single undivided spec |
| Describing errors | `@ApiResponse` with `@Content` + schema | No error documentation |
| Sensitive endpoints | Restrict Swagger UI to `dev` profile | Ship Swagger UI to production |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Disable Swagger UI in production | `springdoc.swagger-ui.enabled=false` on production profile |
| Document error responses | `@ApiResponse` for 400, 404, 409, 500 on each operation |
| Use `@Schema(description=...)` on all DTO fields | Meaningful descriptions, not just field name repetition |
| Commit generated spec to source control | `/v3/api-docs.yaml` checked in and validated in CI |
| Group by API version | `GroupedOpenApi` per `v1`, `v2` path prefix |

### MUST NOT DO
- Do not expose Swagger UI in production without authentication
- Do not duplicate validation logic in `@Schema` and Bean Validation — let springdoc derive from Bean Validation
- Do not use `@ApiParam` (Springfox/Swagger 2) — use `@Parameter` (OpenAPI 3)
- Do not use `@ApiModel`/`@ApiModelProperty` (Springfox) — use `@Schema`
- Do not add `springdoc-openapi` to services that expose no HTTP API

## Gotchas

- springdoc-openapi 2.x is for Spring Boot 3.x; springdoc-openapi 1.x is for Spring Boot 2.x — do not mix.
- `@Hidden` on a controller or method excludes it from the spec entirely.
- Records are fully supported as DTO schemas but may need `@JsonProperty` for field name overrides.
- When using `@Valid` with nested records, springdoc derives constraints from Bean Validation automatically.
- Spring Security may block `/v3/api-docs` and `/swagger-ui` — permit them explicitly in `SecurityFilterChain` for non-production profiles.
- `springdoc.swagger-ui.operationsSorter=alpha` sorts operations alphabetically in the UI.

## Minimal Examples

### pom.xml
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.5.0</version>
</dependency>
```

### application.yml
```yaml
springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
    enabled: true   # false in production profile
  show-actuator: false
  packages-to-scan: vn.lukepham.projects
```

### OpenAPI bean config
```java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Order Service API")
                .version("v1")
                .description("Manages order lifecycle"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }

    @Bean
    public GroupedOpenApi v1Api() {
        return GroupedOpenApi.builder()
            .group("v1")
            .pathsToMatch("/api/v1/**")
            .build();
    }
}
```

### Documented controller endpoint
```java
@Operation(
    summary = "Create order",
    description = "Creates a new order for the authenticated customer",
    responses = {
        @ApiResponse(responseCode = "201", description = "Order created",
            content = @Content(schema = @Schema(implementation = OrderResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    }
)
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
    return orderService.createOrder(request);
}
```

### DTO with schema documentation
```java
public record CreateOrderRequest(
    @Schema(description = "Customer UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    @NotNull UUID customerId,

    @Schema(description = "List of ordered items, minimum 1")
    @NotEmpty @Valid List<OrderItem> items
) {}
```

## What to Verify
- `/v3/api-docs` returns valid OpenAPI JSON after startup
- Swagger UI renders all documented endpoints and schemas
- Error responses (400, 404) are documented on every controller method
- Swagger UI is disabled in production profile
- Generated spec committed to source control matches the running service

## See References
- `references/springdoc.md` for configuration properties, GroupedOpenApi, security schemes, and customization
- `references/contract-first.md` for API-first workflow, YAML spec authoring, and OpenAPI Generator setup
