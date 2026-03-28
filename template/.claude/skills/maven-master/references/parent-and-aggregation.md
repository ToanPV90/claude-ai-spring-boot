# Parent, Aggregator, and BOM Roles

## Root Reactor Default

Use a root `pom.xml` with `packaging>pom</packaging>` as the default entry point for the repo.

- **Aggregator role**: lists `<modules>` and drives the reactor build
- **Parent role**: shares coordinates, properties, `dependencyManagement`, and `pluginManagement`

For most application repos, one root POM can play both roles.

## When to Split the Roles

Separate a BOM/dependencies module when:
- many child modules need a curated version catalog
- the dependency catalog should be imported elsewhere
- the parent POM is becoming too large and mixing responsibilities

## Default Root Shape

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>vn.lukepham.projects</groupId>
  <artifactId>my-project</artifactId>
  <version>1.0.0</version>
  <packaging>pom</packaging>

  <modules>
    <module>common</module>
    <module>service</module>
  </modules>
</project>
```

## BOM Note

An internal BOM module is optional for smaller applications. Prefer it when the repo starts to look like an OSS platform with many reusable modules.

## Gotchas
- `dependencyManagement` entries do not create real reactor dependencies by themselves.
- Avoid making the root POM a deployable Spring Boot module.
