# Spring Boot Actuator Configuration

## Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

## application.yml — Production-safe defaults

```yaml
management:
  endpoints:
    web:
      base-path: /actuator
      exposure:
        include: health,info,prometheus,metrics   # explicit allowlist
  endpoint:
    health:
      show-details: when-authorized       # hide details from anonymous
      show-components: when-authorized
      probes:
        enabled: true                     # enables /actuator/health/liveness and /actuator/health/readiness
      group:
        liveness:
          include: livenessState
        readiness:
          include: readinessState,db,diskSpace
```

## Health Groups for Kubernetes

Spring Boot 2.3+ ships `livenessState` and `readinessState` built in.

```yaml
# Kubernetes probe config (in deployment.yaml)
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

- **Liveness failure** → pod restarts (use only for unrecoverable state)
- **Readiness failure** → pod removed from load balancer (use for temporary unavailability: DB not ready, warming up)

## Custom Health Indicator

```java
@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    private final ExternalApiClient client;

    public ExternalApiHealthIndicator(ExternalApiClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            client.ping();
            return Health.up()
                .withDetail("url", client.getBaseUrl())
                .build();
        } catch (Exception ex) {
            return Health.down()
                .withDetail("error", ex.getMessage())
                .build();
        }
    }
}
```

Add it to readiness group:
```yaml
management:
  endpoint:
    health:
      group:
        readiness:
          include: readinessState,db,externalApi
```

## Info Endpoint

```yaml
management:
  info:
    git:
      mode: simple         # or 'full' for all git details
    env:
      enabled: true        # expose @ConfigurationProperties info.*

info:
  app:
    name: "@project.name@"
    version: "@project.version@"
    description: "@project.description@"
```

Requires `spring-boot-maven-plugin` resource filtering or explicit `@` delimiters in pom.xml.

## Securing Actuator Endpoints

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/actuator/**").hasRole("ACTUATOR_ADMIN")
                .anyRequest().authenticated())
            .build();
    }
}
```

Never expose these publicly in production:
- `/actuator/env` — exposes all environment variables
- `/actuator/beans` — full Spring context
- `/actuator/heapdump` — heap dump download
- `/actuator/threaddump` — thread dump

## Graceful Shutdown

```yaml
server:
  shutdown: graceful    # wait for in-flight requests before shutdown

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

This sets readiness to DOWN when shutdown signal is received, removing the pod from load balancer before the process exits.

## Gotchas

- `management.endpoints.web.exposure.include=*` exposes everything including heap dumps. Always use an allowlist.
- `/actuator/health` vs `/actuator/health/liveness` — Kubernetes probes should use the specific sub-path, not the root.
- `show-details: always` leaks database connection details to any caller. Use `when-authorized`.
- When `probes.enabled=true`, Spring Boot automatically transitions liveness/readiness state during startup and graceful shutdown.
- Custom `HealthIndicator` beans are automatically included in `/actuator/health` by name (lowercase bean name). Control inclusion via `group.readiness.include`.
