# Dependency and Plugin Management

## dependencyManagement Default

Centralize versions in the parent POM or an imported BOM.

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-dependencies</artifactId>
      <version>${spring-boot.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

Child modules should normally omit versions for managed dependencies.

## pluginManagement Default

Keep compiler, surefire/failsafe, Spring Boot plugin, and other shared defaults in the parent.

```xml
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
    </plugins>
  </pluginManagement>
</build>
```

## Rules

- Prefer one declared version per dependency family.
- Use `${project.version}` for internal module dependencies when the reactor owns their lifecycle.
- Do not put child-only dependencies in the parent `<dependencies>` block unless every module truly needs them.

## Gotchas
- `pluginManagement` does not activate a plugin by itself; children still reference the plugin.
- Importing multiple BOMs means ordering matters when the same dependency is managed twice.
