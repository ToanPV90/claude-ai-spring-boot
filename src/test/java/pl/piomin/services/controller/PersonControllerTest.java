package pl.piomin.services.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import pl.piomin.services.config.TestSecurityConfig;
import pl.piomin.services.model.Person;
import pl.piomin.services.repository.PersonRepository;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestSecurityConfig.class)
class PersonControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PersonRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    @WithMockUser
    void shouldGetAllPersons() throws Exception {
        repository.save(new Person(null, "John", "Doe", "john@example.com", "123456789", 30));
        repository.save(new Person(null, "Jane", "Smith", "jane@example.com", "987654321", 25));

        mockMvc.perform(get("/persons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @WithMockUser
    void shouldGetPersonById() throws Exception {
        Person person = repository.save(new Person(null, "John", "Doe", "john@example.com", "123456789", 30));

        mockMvc.perform(get("/persons/" + person.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is("John")))
                .andExpect(jsonPath("$.lastName", is("Doe")));
    }

    @Test
    @WithMockUser
    void shouldCreatePerson() throws Exception {
        mockMvc.perform(post("/persons")
                .contentType("application/json")
                .content("{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@example.com\",\"phone\":\"123456789\",\"age\":30}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is("John")));
    }

    @Test
    @WithMockUser
    void shouldUpdatePerson() throws Exception {
        Person person = repository.save(new Person(null, "John", "Doe", "john@example.com", "123456789", 30));

        mockMvc.perform(put("/persons/" + person.getId())
                .contentType("application/json")
                .content("{\"firstName\":\"Jane\",\"lastName\":\"Smith\",\"email\":\"jane@example.com\",\"phone\":\"987654321\",\"age\":25}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is("Jane")));
    }

    @Test
    @WithMockUser
    void shouldDeletePerson() throws Exception {
        Person person = repository.save(new Person(null, "John", "Doe", "john@example.com", "123456789", 30));

        mockMvc.perform(delete("/persons/" + person.getId()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void shouldReturnNotFoundForNonExistingPerson() throws Exception {
        mockMvc.perform(get("/persons/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/persons"))
                .andExpect(status().isUnauthorized());
    }
}