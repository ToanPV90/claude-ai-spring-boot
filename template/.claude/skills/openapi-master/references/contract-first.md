# Contract-First API Design

## Code-First vs Contract-First

| | Code-First | Contract-First |
|---|---|---|
| **Approach** | Write controllers, generate spec | Write YAML spec, generate stubs |
| **Best for** | Existing apps, single consumer | New APIs, multiple consumers, API products |
| **Tooling** | springdoc-openapi annotations | OpenAPI Generator |
| **Spec drift** | Risk: spec lags implementation | Spec is the source of truth |
| **Consumer feedback** | After implementation | Before implementation |

## When to Use Contract-First

- Multiple consumers need the spec before implementation starts
- A public or partner-facing API with formal versioning guarantees
- Teams working in parallel (API team + consumer team)
- You want to mock the server before backend is ready

## OpenAPI YAML Spec Structure

```yaml
openapi: "3.0.3"
info:
  title: Order Service API
  version: "1.0.0"
  description: Manages order lifecycle

servers:
  - url: https://api.example.com/api/v1
    description: Production
  - url: http://localhost:8080/api/v1
    description: Local development

paths:
  /orders:
    post:
      operationId: createOrder
      summary: Create a new order
      tags: [Orders]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /orders/{id}:
    get:
      operationId: getOrder
      summary: Get order by ID
      tags: [Orders]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Order found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateOrderRequest:
      type: object
      required: [customerId, items]
      properties:
        customerId:
          type: string
          format: uuid
          example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
        items:
          type: array
          minItems: 1
          items:
            $ref: '#/components/schemas/OrderItem'

    OrderItem:
      type: object
      required: [productId, quantity]
      properties:
        productId:
          type: string
          format: uuid
        quantity:
          type: integer
          minimum: 1

    OrderResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        customerId:
          type: string
          format: uuid
        status:
          $ref: '#/components/schemas/OrderStatus'
        createdAt:
          type: string
          format: date-time

    OrderStatus:
      type: string
      enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED]

    ErrorResponse:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
        timestamp:
          type: string
          format: date-time

  responses:
    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: Resource not found
    Unauthorized:
      description: Not authenticated
```

## OpenAPI Generator (Server Stubs)

### Maven plugin

```xml
<plugin>
    <groupId>org.openapitools</groupId>
    <artifactId>openapi-generator-maven-plugin</artifactId>
    <version>7.4.0</version>
    <executions>
        <execution>
            <goals><goal>generate</goal></goals>
            <configuration>
                <inputSpec>${project.basedir}/src/main/resources/openapi/order-service.yaml</inputSpec>
                <generatorName>spring</generatorName>
                <apiPackage>vn.lukepham.projects.api</apiPackage>
                <modelPackage>vn.lukepham.projects.model</modelPackage>
                <configOptions>
                    <interfaceOnly>true</interfaceOnly>     <!-- generate interface, not controller -->
                    <useSpringBoot3>true</useSpringBoot3>
                    <useTags>true</useTags>
                    <openApiNullable>false</openApiNullable>
                    <dateLibrary>java8</dateLibrary>
                    <useJakartaEe>true</useJakartaEe>
                </configOptions>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Implement the generated interface

```java
@RestController
public class OrderController implements OrdersApi {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @Override
    public ResponseEntity<OrderResponse> createOrder(CreateOrderRequest request) {
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Override
    public ResponseEntity<OrderResponse> getOrder(UUID id) {
        return orderService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

The compiler enforces the contract — if the spec changes, the interface changes, and the implementation must update.

## Committing the Spec to Source Control

Store the spec in `src/main/resources/openapi/` and commit it:
```
src/
  main/
    resources/
      openapi/
        order-service.yaml     # source of truth
```

Add a CI step to validate:
```yaml
# .github/workflows/ci.yml
- name: Validate OpenAPI spec
  run: |
    ./mvnw verify -Dskip.tests=true
    # Generated sources verify spec is parseable
```

Or use the `openapi-generator-cli` in CI:
```bash
npx @openapitools/openapi-generator-cli validate -i src/main/resources/openapi/order-service.yaml
```

## Gotchas

- `interfaceOnly: true` generates only the interface, not the Spring controller. You must implement it — this enforces the contract at compile time.
- Generated model classes use Lombok by default. If the project bans Lombok, set `additionalModelTypeAnnotations` or use a custom template.
- The spec is the source of truth. Changes to the spec regenerate the interface. Never edit generated files.
- `operationId` in the spec becomes the Java method name in the generated interface. Use `camelCase` operation IDs.
- `format: uuid` in the spec maps to `UUID` in Java. `format: date-time` maps to `OffsetDateTime` by default — configure `dateLibrary=java8` for `Instant`.
