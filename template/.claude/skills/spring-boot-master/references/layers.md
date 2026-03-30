# Layers and Package Structure

## Default Layer Model

Use a clear flow:

`Controller -> Service -> Repository`

### Controller Owns
- HTTP mapping
- request parsing
- validation entry points
- status codes and response shapes

### Service Owns
- business orchestration
- transaction boundaries
- coordination across repositories or external collaborators

### Repository Owns
- persistence access
- query method declarations
- storage-facing abstractions

## Package Layout

Prefer packages such as:
- `controller/`
- `service/`
- `repository/`
- `dto/`
- `exception/`
- `config/`

Do not create `util/`, `manager/`, or `helper/` dumping grounds unless the responsibility is genuinely clear.

In a Maven multi-module build, keep this package layout **inside each application module**.
Use `maven-master` to decide whether `common/`, `api/`, or `service/` should be
separate modules; use this reference to decide how code is arranged inside the module.

## Service Interfaces

Use explicit service and DAO interfaces by default:

- `UserService` + `UserServiceImpl`
- `OrderDao` + `OrderDaoImpl` when custom persistence behavior needs its own abstraction
- Spring Data repositories can remain interfaces when the framework provides the implementation, but any handwritten DAO/service implementation should follow the `Impl` suffix convention

Keep the interface focused on the boundary contract, not as a dumping ground for every helper method.

Do not mix naming styles like `UserServiceDefault`, `UserServiceManager`, or anonymous concrete service classes when the repo convention expects `XxxServiceImpl` / `XxxDaoImpl`.
