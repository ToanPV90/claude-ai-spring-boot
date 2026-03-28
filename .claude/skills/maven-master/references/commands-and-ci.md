# Commands, CI, and Docker for Multi-Module Builds

## Build Commands

```bash
./mvnw verify
./mvnw -pl service -am test
./mvnw -pl service spring-boot:run
./mvnw -pl service -am package
```

- `-pl` selects a module
- `-am` also builds required upstream modules

## CI Defaults

- Prefer reactor-wide `verify` on the main branch
- Use module-targeted jobs when a PR only touches one area and the pipeline can prove dependency closure
- Aggregate reports explicitly when JaCoCo or integration-test reports span modules

## Dockerfile Pattern

For multi-module projects, copy the parent POM and child POMs before source directories so layer caching still works.

```dockerfile
COPY pom.xml .
COPY common/pom.xml common/pom.xml
COPY service/pom.xml service/pom.xml
COPY common/src common/src
COPY service/src service/src
RUN ./mvnw -pl service -am package -DskipTests
```

## Gotchas
- `target/site/jacoco/index.html` is no longer the only report path in multi-module builds; aggregate reporting may be needed.
- Single-module Docker examples break caching and compilation when module POMs are omitted.
- `./mvnw test` at the root runs the whole reactor; use `-pl` only when the build intent is truly module-scoped.
