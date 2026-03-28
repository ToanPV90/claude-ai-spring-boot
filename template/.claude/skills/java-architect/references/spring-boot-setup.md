# Spring Boot Setup

## Project Structure (Layered Spring Application in Maven Modules)

```
my-project/
├── pom.xml                    # Root parent + aggregator POM
├── common/
│   ├── pom.xml                # Shared contracts / value types
│   └── src/main/java/com/example/common/
└── service/
    ├── pom.xml                # Deployable Spring Boot app module
    └── src/main/java/com/example/service/
        ├── controller/        # HTTP endpoints and request/response handling
        ├── service/           # Business orchestration and transaction boundaries
        ├── repository/        # Persistence access
        ├── dto/               # Request/response models
        ├── mapper/            # Mapping between DTOs and domain state
        ├── domain/            # Core entities and value objects when needed
        ├── config/            # Spring configuration and properties
        ├── security/          # SecurityFilterChain, converters, security helpers
        └── exception/         # Domain exceptions and advice classes
```

Use this as the default project shape for the template repo. Prefer a root Maven reactor with explicit child modules, then keep layering explicit inside each application module. More complex modular or hexagonal boundaries should only be introduced when the architecture decision genuinely requires them.

## Root Reactor pom.xml (Spring Boot 3.x)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.0</version>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>demo-platform</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <properties>
        <java.version>21</java.version>
    </properties>

    <modules>
        <module>common</module>
        <module>service</module>
    </modules>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <configuration>
                        <release>${java.version}</release>
                    </configuration>
                </plugin>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

For deeper parent/aggregator vs BOM guidance, route to `maven-master`.

## Child Module pom.xml

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.example</groupId>
        <artifactId>demo-platform</artifactId>
        <version>1.0.0</version>
        <relativePath>../pom.xml</relativePath>
    </parent>

    <artifactId>demo-platform-service</artifactId>

    <dependencies>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>demo-platform-common</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
</project>
```

## Application Configuration

```yaml
# application.yml
spring:
  application:
    name: demo-service

  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/demo}
    username: ${DATABASE_USER:demo}
    password: ${DATABASE_PASSWORD:demo}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 20000

  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        jdbc:
          batch_size: 20
        order_inserts: true
        order_updates: true

  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration

server:
  port: 8080
  shutdown: graceful
  error:
    include-message: always
    include-binding-errors: always

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
  metrics:
    export:
      prometheus:
        enabled: true
```

## Main Application Class

```java
package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class DemoServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoServiceApplication.class, args);
    }
}
```

## Configuration Classes

```java
package com.example.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Demo Service API")
                .version("1.0.0")
                .description("Enterprise microservice API"));
    }
}
```

## Exception Handling

```java
package com.example.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ProblemDetail handleNotFound(EntityNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Validation failed"
        );
        problem.setProperty("errors", ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .toList());
        return problem;
    }
}
```

## Quick Reference

| Component | Purpose |
|-----------|---------|
| `@SpringBootApplication` | Main application entry point |
| `@Configuration` | Configuration classes |
| `@Bean` | Bean factory method |
| `@Value` | Inject properties |
| `@ConfigurationProperties` | Type-safe config |
| `@Profile` | Environment-specific beans |
| `@EnableJpaAuditing` | Automatic audit fields |
| `ProblemDetail` | RFC 7807 error responses |
