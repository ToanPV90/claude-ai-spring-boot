# Testcontainers in CI

## Option 1: GitHub-Hosted Runner (Simplest)

`ubuntu-latest` has Docker pre-installed. Testcontainers works out of the box:

```yaml
- run: ./mvnw verify -B
  env:
    TESTCONTAINERS_RYUK_DISABLED: "true"
```

## Option 2: Docker-in-Docker (Self-Hosted Runners)

```yaml
services:
  dind:
    image: docker:24-dind
    options: --privileged
    ports: ["2375:2375"]
steps:
  - run: ./mvnw verify -B
    env:
      DOCKER_HOST: tcp://localhost:2375
      TESTCONTAINERS_RYUK_DISABLED: "true"
```

## Option 3: Testcontainers Cloud

```yaml
- uses: atomicjar/testcontainers-cloud-setup-action@v1
  with:
    token: ${{ secrets.TC_CLOUD_TOKEN }}
- run: ./mvnw verify -B
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Could not find a valid Docker environment` | Use DinD service or Testcontainers Cloud |
| Ryuk fails to start | `TESTCONTAINERS_RYUK_DISABLED=true` |
| Container startup timeout | Pre-pull images or increase `startup.timeout` |
| Port conflicts in parallel runs | Use dynamic port mapping (default) |

## Best Practices

- Use **singleton containers** for expensive services (start once, share across test classes).
- Use **Alpine images** (`postgres:16-alpine`) for faster CI pulls.
- Never hardcode container ports — use dynamic mapping.
- `TESTCONTAINERS_REUSE_ENABLE=true` is for local dev only, not CI.
