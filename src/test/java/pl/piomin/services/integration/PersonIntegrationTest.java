package pl.piomin.services.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pl.piomin.services.dto.request.CreatePersonRequest;
import pl.piomin.services.dto.request.UpdatePersonRequest;
import pl.piomin.services.repository.PersonRepository;

import java.time.LocalDate;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class PersonIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> "http://mock-issuer");
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri", () -> "http://mock-issuer/jwks");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PersonRepository personRepository;

    @BeforeEach
    void setUp() {
        personRepository.deleteAll();
    }

    @Test
    void shouldCreatePerson() throws Exception {
        CreatePersonRequest request = new CreatePersonRequest("John", "Doe", "john.doe@example.com");
        request.setDateOfBirth(LocalDate.of(1990, 1, 1));
        request.setPhoneNumber("+1234567890");
        request.setAddress("123 Main St");

        mockMvc.perform(post("/api/persons")
                        .with(jwt().jwt(jwt -> jwt.subject("user123")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(greaterThan(0)))
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.lastName").value("Doe"))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"))
                .andExpect(jsonPath("$.dateOfBirth").value("1990-01-01"))
                .andExpect(jsonPath("$.phoneNumber").value("+1234567890"))
                .andExpect(jsonPath("$.address").value("123 Main St"))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void shouldGetPersonById() throws Exception {
        CreatePersonRequest request = new CreatePersonRequest("Jane", "Smith", "jane.smith@example.com");

        String createResponse = mockMvc.perform(post("/api/persons")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long personId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/persons/" + personId)
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(personId))
                .andExpect(jsonPath("$.firstName").value("Jane"))
                .andExpect(jsonPath("$.email").value("jane.smith@example.com"));
    }

    @Test
    void shouldGetAllPersons() throws Exception {
        CreatePersonRequest request1 = new CreatePersonRequest("John", "Doe", "john.doe@example.com");
        CreatePersonRequest request2 = new CreatePersonRequest("Jane", "Smith", "jane.smith@example.com");

        mockMvc.perform(post("/api/persons")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/persons")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/persons")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void shouldUpdatePerson() throws Exception {
        CreatePersonRequest createRequest = new CreatePersonRequest("John", "Doe", "john.doe@example.com");

        String createResponse = mockMvc.perform(post("/api/persons")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long personId = objectMapper.readTree(createResponse).get("id").asLong();

        UpdatePersonRequest updateRequest = new UpdatePersonRequest();
        updateRequest.setFirstName("Jane");
        updateRequest.setPhoneNumber("+9876543210");

        mockMvc.perform(put("/api/persons/" + personId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(personId))
                .andExpect(jsonPath("$.firstName").value("Jane"))
                .andExpect(jsonPath("$.lastName").value("Doe"))
                .andExpect(jsonPath("$.phoneNumber").value("+9876543210"));
    }

    @Test
    void shouldDeletePerson() throws Exception {
        CreatePersonRequest request = new CreatePersonRequest("John", "Doe", "john.doe@example.com");

        String createResponse = mockMvc.perform(post("/api/persons")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long personId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(delete("/api/persons/" + personId)
                        .with(jwt()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/persons/" + personId)
                        .with(jwt()))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn401WithoutAuthentication() throws Exception {
        CreatePersonRequest request = new CreatePersonRequest("John", "Doe", "john.doe@example.com");

        mockMvc.perform(post("/api/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/persons"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturn400ForInvalidData() throws Exception {
        CreatePersonRequest invalidRequest = new CreatePersonRequest();
        invalidRequest.setEmail("invalid-email");

        mockMvc.perform(post("/api/persons")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    void shouldReturn404ForNonExistentPerson() throws Exception {
        mockMvc.perform(get("/api/persons/999999")
                        .with(jwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Person not found with id: '999999'"));
    }
}
