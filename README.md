# Person Service

A production-ready Spring Boot REST API for managing Person entities with JWT/OAuth2 security, PostgreSQL persistence, and Kubernetes deployment via Skaffold.

## Features

- **REST API** for Person entity CRUD operations
- **JWT/OAuth2 Security** - All endpoints protected with Bearer token authentication
- **PostgreSQL Database** - Persistent storage with Flyway migrations
- **Kubernetes Ready** - Skaffold for local development and deployment
- **Comprehensive Testing** - Unit tests, integration tests with Testcontainers
- **Production Grade** - Health checks, structured logging, proper error handling

## Technology Stack

- **Spring Boot 3.4.3** with Java 21
- **Spring Security** with OAuth2 Resource Server
- **Spring Data JPA** with PostgreSQL
- **Flyway** for database migrations
- **Testcontainers** for integration testing
- **Docker & Kubernetes** for containerization
- **Skaffold** for Kubernetes development workflow
- **CircleCI** for CI/CD

## Prerequisites

- **Java 21** (recommended) or Java 22-24
  - **Note**: Tests require Java 21-24 due to Mockito/ByteBuddy compatibility
  - Java 25+ may work for running the application but tests will fail
  - To check your Java version: `java -version`
- Maven 3.8+
- Docker and Docker Compose
- Kubernetes cluster (minikube, Docker Desktop, or similar)
- Skaffold CLI (for K8s deployment)

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

### 2. Run the Application (Development Profile)

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The application will start on `http://localhost:8080`.

### 3. Run Tests

```bash
# Run all tests (including integration tests with Testcontainers)
mvn clean test

# Run only unit tests
mvn test -Dtest=*Test

# Run only integration tests
mvn test -Dtest=*IntegrationTest
```

## API Endpoints

All endpoints require JWT Bearer token authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/persons` | Create a new person |
| GET | `/api/persons/{id}` | Get person by ID |
| GET | `/api/persons` | Get all persons |
| PUT | `/api/persons/{id}` | Update person |
| DELETE | `/api/persons/{id}` | Delete person |

### Health Check (Public)

- `GET /actuator/health` - Application health status

## Example Usage

### Create Person

```bash
curl -X POST http://localhost:8080/api/persons \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "dateOfBirth": "1990-01-01",
    "phoneNumber": "+1234567890",
    "address": "123 Main St"
  }'
```

### Get All Persons

```bash
curl -X GET http://localhost:8080/api/persons \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Kubernetes Deployment with Skaffold

### 1. Start Skaffold in Dev Mode

```bash
skaffold dev
```

This will:
- Build the container image using Jib
- Deploy to your local Kubernetes cluster
- Set up port forwarding (localhost:8080 -> service:8080)
- Auto-rebuild and redeploy on code changes

### 2. Access the Application

The application will be available at `http://localhost:8080` via port forwarding.

### 3. Clean Up

```bash
skaffold delete
```

## Configuration

### Profiles

- **dev** - Local development with PostgreSQL on localhost:5432
- **test** - Testing with Testcontainers
- **prod** - Production deployment (Kubernetes) with externalized configuration

### Environment Variables (Production)

| Variable | Description |
|----------|-------------|
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_ISSUER_URI` | OAuth2 JWT issuer URI |
| `JWT_JWK_SET_URI` | JWT keys endpoint |

## Security

The application uses Spring Security OAuth2 Resource Server for JWT validation:

- All `/api/**` endpoints require authentication
- Stateless session management
- Bearer token authentication
- Tokens are validated against an external OAuth2 server (Keycloak, Auth0, etc.)

### Setting Up OAuth2 Server (Example with Keycloak)

1. Run Keycloak locally:
```bash
docker run -p 8081:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

2. Configure realm and obtain JWT token
3. Update `application-dev.yml` with correct issuer-uri

## Database Schema

The application uses Flyway for database migrations. The initial migration creates:

- `person` table with fields: id, first_name, last_name, email, date_of_birth, phone_number, address
- Unique index on email
- Index on last_name for faster lookups

## Testing Strategy

- **Unit Tests** - Service layer with Mockito mocks
- **Controller Tests** - MockMvc with Spring Security test support
- **Integration Tests** - Full stack with Testcontainers PostgreSQL

## CI/CD

CircleCI pipeline includes:

1. **Build and Test** - Maven build with test execution
2. **Build Image** - Create Docker image using Jib

## Building for Production

### Using Jib (Recommended)

```bash
# Build to Docker daemon
mvn compile jib:dockerBuild

# Build and push to registry
mvn compile jib:build -Dimage=your-registry/person-service:1.0.1
```

### Using Dockerfile

```bash
docker build -t person-service:1.0.1 .
```

## Project Structure

```
src/main/java/pl/piomin/services/
├── PersonApplication.java           # Main class
├── config/SecurityConfig.java       # Security configuration
├── controller/PersonController.java # REST endpoints
├── service/PersonService.java       # Business logic interface
├── repository/PersonRepository.java # Data access
├── model/Person.java                # JPA entity
├── dto/                             # Request/Response DTOs
├── mapper/PersonMapper.java         # Entity-DTO mapping
└── exception/                       # Exception handling

k8s/                                 # Kubernetes manifests
├── configmap.yml
├── secret.yml
├── deployment.yml
└── service.yml
```

## Version History

- **1.0.1** - Initial release with full CRUD API, JWT security, and K8s deployment
- **1.0.0** - Project setup

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue in the project repository.
