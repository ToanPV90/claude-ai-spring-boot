# Setup and Code Generation

## Version Target

- Default assumption: jOOQ 3.20+ on PostgreSQL

## Spring Boot Starter

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jooq</artifactId>
</dependency>
```

Spring Boot wires `DSLContext` from the application `DataSource`, so jOOQ and JPA can share the same connection pool and transaction manager.

## Maven Code Generation

```xml
<plugin>
    <groupId>org.jooq</groupId>
    <artifactId>jooq-codegen-maven</artifactId>
    <executions>
        <execution>
            <goals><goal>generate</goal></goals>
        </execution>
    </executions>
    <configuration>
        <jdbc>
            <driver>org.postgresql.Driver</driver>
            <url>jdbc:postgresql://localhost:5432/mydb</url>
            <user>${db.user}</user>
            <password>${db.password}</password>
        </jdbc>
        <generator>
            <database>
                <inputSchema>public</inputSchema>
            </database>
            <generate>
                <records>true</records>
                <pojos>true</pojos>
                <daos>false</daos>
            </generate>
            <target>
                <packageName>vn.lukepham.projects.generated.jooq</packageName>
                <directory>target/generated-sources/jooq</directory>
            </target>
        </generator>
    </configuration>
</plugin>
```

## Application Configuration

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jooq:
    sql-dialect: POSTGRES
```

## Defaults

- Generate from the same schema or migration state your service actually runs against.
- Commit only stable generated sources if that matches repo policy; otherwise regenerate in CI/build.
- Keep generated packages separate from handwritten repositories and read models.

## Gotchas

- Skipping regeneration after schema changes erodes the entire value of jOOQ's type safety.
- Do not bury jOOQ configuration in handwritten utility classes; let Spring Boot own `DSLContext` creation.
- If the project introduces handwritten jOOQ data-access abstractions, expose them as explicit `XxxDao` interfaces with `XxxDaoImpl` implementations. Do not rely on vague helper classes or inconsistent naming.
