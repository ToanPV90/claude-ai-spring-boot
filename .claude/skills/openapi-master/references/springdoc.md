# springdoc-openapi Configuration

## Dependency

```xml
<!-- Spring Boot 3.x -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.5.0</version>
</dependency>
```

For WebFlux:
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.5.0</version>
</dependency>
```

## application.yml — Full Reference

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs              # default; JSON spec at this path
    enabled: true
  swagger-ui:
    path: /swagger-ui.html          # Swagger UI at this path
    enabled: ${SWAGGER_UI_ENABLED:false}   # disable in production via env var
    operationsSorter: alpha         # sort operations alphabetically
    tagsSorter: alpha               # sort tags alphabetically
    display-request-duration: true
    show-extensions: true
  show-actuator: false              # exclude actuator endpoints from spec
  packages-to-scan: vn.lukepham.projects
  paths-to-exclude: /internal/**
  default-consumes-media-type: application/json
  default-produces-media-type: application/json
```

## OpenAPI Global Info

```java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Order Service API")
                .description("Manages order lifecycle for the e-commerce platform")
                .version("v1.0")
                .contact(new Contact()
                    .name("Platform Team")
                    .email("platform@example.com"))
                .license(new License()
                    .name("MIT")))
            .externalDocs(new ExternalDocumentation()
                .description("Architecture docs")
                .url("https://wiki.example.com/order-service"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT Bearer token from OAuth2 provider")));
    }
}
```

## Grouped APIs (by version)

```java
@Bean
public GroupedOpenApi v1Api() {
    return GroupedOpenApi.builder()
        .group("v1")
        .displayName("API v1")
        .pathsToMatch("/api/v1/**")
        .build();
}

@Bean
public GroupedOpenApi v2Api() {
    return GroupedOpenApi.builder()
        .group("v2")
        .displayName("API v2")
        .pathsToMatch("/api/v2/**")
        .build();
}
```

Multiple groups appear as a dropdown in Swagger UI.

## Controller Annotations

```java
@Tag(name = "Orders", description = "Order management endpoints")
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @Operation(
        summary = "Create a new order",
        description = "Creates an order for the authenticated customer. Returns 201 on success.",
        security = @SecurityRequirement(name = "bearerAuth"),
        responses = {
            @ApiResponse(responseCode = "201",
                description = "Order created",
                content = @Content(schema = @Schema(implementation = OrderResponse.class))),
            @ApiResponse(responseCode = "400",
                description = "Validation failed",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401",
                description = "Not authenticated"),
            @ApiResponse(responseCode = "422",
                description = "Business rule violation",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
        }
    )
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
    }

    @Hidden  // excludes this endpoint from the spec
    @GetMapping("/internal/health")
    public String internalHealth() {
        return "ok";
    }
}
```

## DTO Schema Annotations

```java
public record CreateOrderRequest(
    @Schema(
        description = "UUID of the customer placing the order",
        example = "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotNull UUID customerId,

    @Schema(description = "Ordered items. At least one item required.")
    @NotEmpty @Valid List<OrderItem> items,

    @Schema(description = "Shipping address", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull @Valid Address shippingAddress
) {
    public record OrderItem(
        @Schema(description = "Product UUID", example = "abc123")
        @NotNull UUID productId,

        @Schema(description = "Quantity to order", minimum = "1", example = "2")
        @Min(1) int quantity
    ) {}
}
```

## Enum Documentation

```java
@Schema(enumAsRef = true)  // creates a $ref component instead of inlining
public enum OrderStatus {
    @Schema(description = "Order placed, awaiting payment") PENDING,
    @Schema(description = "Payment confirmed") CONFIRMED,
    @Schema(description = "Shipped to customer") SHIPPED,
    @Schema(description = "Delivered") DELIVERED,
    @Schema(description = "Cancelled by customer or system") CANCELLED
}
```

## Hiding Sensitive Fields

```java
public record UserResponse(
    UUID id,
    String name,
    String email,
    @Schema(hidden = true) String internalReference    // hidden from spec
) {}
```

## Exposing Swagger UI in Dev Profile Only

```java
@Profile("!prod")  // active in all profiles except prod
@Configuration
public class SwaggerConfig {

    @Bean
    public GroupedOpenApi allApis() {
        return GroupedOpenApi.builder()
            .group("all")
            .pathsToMatch("/**")
            .build();
    }
}
```

Spring Security permit Swagger UI paths in dev:
```java
@Bean
@Profile("!prod")
public SecurityFilterChain devFilterChain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
            .anyRequest().authenticated())
        .build();
}
```

## Gotchas

- springdoc 1.x is for Spring Boot 2.x; springdoc 2.x is for Spring Boot 3.x. They are incompatible.
- `@ApiParam` is from Springfox (Swagger 2). Use `@Parameter` for springdoc.
- `@ApiModel` / `@ApiModelProperty` are Springfox. Use `@Schema` for springdoc.
- Bean Validation annotations (`@NotNull`, `@Size`, `@Pattern`) are automatically reflected in the spec — no need to duplicate them in `@Schema`.
- If Swagger UI returns a blank page, check browser console for CORS errors or blocked `/v3/api-docs` requests.
- `@Hidden` on a class hides the entire controller. `@Hidden` on a method hides only that endpoint.
