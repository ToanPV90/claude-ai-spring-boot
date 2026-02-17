# Claude AI Spring Boot Application

## Version 1.0.1

A Spring Boot application exposing a REST API for managing Person entities, with JWT/OAuth2 authentication and PostgreSQL database.

## Features

- REST API for Person CRUD operations
- PostgreSQL database integration
- JWT/OAuth2 authentication via Keycloak
- Kubernetes deployment with Skaffold
- Docker Compose for local development

## Person Entity

| Field | Type | Description |
|-------|------|-------------|
| id | Long | Auto-generated identifier |
| firstName | String | First name |
| lastName | String | Last name |
| email | String | Email address |
| phone | String | Phone number |
| age | Integer | Age |

## REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /persons | Get all persons |
| GET | /persons/{id} | Get person by ID |
| POST | /persons | Create new person |
| PUT | /persons/{id} | Update person |
| DELETE | /persons/{id} | Delete person |

All endpoints require JWT authentication.

## Running with Docker Compose

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Keycloak on port 8180
- Application on port 8080

## Running with Skaffold

Prerequisites:
- Kubernetes cluster
- Skaffold installed

```bash
skaffold dev
```

## Building

```bash
mvn clean package
```

## Testing

```bash
mvn test
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| SPRING_DATASOURCE_URL | PostgreSQL connection URL |
| SPRING_DATASOURCE_USERNAME | Database username |
| SPRING_DATASOURCE_PASSWORD | Database password |
| SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI | OAuth2 issuer URI |

## Keycloak Setup

1. Access Keycloak at http://localhost:8180
2. Login with admin/admin
3. Create realm: personrealm
4. Create client for the application
5. Configure JWT tokens

## Technology Stack

- Java 21
- Spring Boot 3.4.2
- Spring Data JPA
- Spring Security OAuth2 Resource Server
- PostgreSQL 17
- Keycloak 26.1
- Skaffold
- Maven