package pl.piomin.services.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import pl.piomin.services.config.SecurityConfig;
import pl.piomin.services.dto.request.CreatePersonRequest;
import pl.piomin.services.dto.request.UpdatePersonRequest;
import pl.piomin.services.dto.response.PersonResponse;
import pl.piomin.services.exception.ResourceNotFoundException;
import pl.piomin.services.service.PersonService;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PersonController.class)
@Import(SecurityConfig.class)
class PersonControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PersonService personService;

    private PersonResponse personResponse;
    private CreatePersonRequest createRequest;
    private UpdatePersonRequest updateRequest;

    @BeforeEach
    void setUp() {
        personResponse = new PersonResponse(1L, "John", "Doe", "john.doe@example.com");
        personResponse.setDateOfBirth(LocalDate.of(1990, 1, 1));
        personResponse.setPhoneNumber("+1234567890");
        personResponse.setAddress("123 Main St");

        createRequest = new CreatePersonRequest("John", "Doe", "john.doe@example.com");
        createRequest.setDateOfBirth(LocalDate.of(1990, 1, 1));
        createRequest.setPhoneNumber("+1234567890");
        createRequest.setAddress("123 Main St");

        updateRequest = new UpdatePersonRequest();
        updateRequest.setFirstName("Jane");
    }

    @Test
    void createPerson_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(post("/api/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createPerson_WithAuthentication_ShouldReturn201() throws Exception {
        when(personService.createPerson(any(CreatePersonRequest.class))).thenReturn(personResponse);

        mockMvc.perform(post("/api/persons")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.lastName").value("Doe"))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"));
    }

    @Test
    void createPerson_WithInvalidData_ShouldReturn400() throws Exception {
        CreatePersonRequest invalidRequest = new CreatePersonRequest();

        mockMvc.perform(post("/api/persons")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getPersonById_WithAuthentication_ShouldReturn200() throws Exception {
        when(personService.getPersonById(1L)).thenReturn(personResponse);

        mockMvc.perform(get("/api/persons/1")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void getPersonById_WhenNotExists_ShouldReturn404() throws Exception {
        when(personService.getPersonById(999L))
                .thenThrow(new ResourceNotFoundException("Person", "id", 999L));

        mockMvc.perform(get("/api/persons/999")
                        .with(jwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Person not found with id: '999'"));
    }

    @Test
    void getAllPersons_WithAuthentication_ShouldReturn200() throws Exception {
        List<PersonResponse> persons = Arrays.asList(personResponse);
        when(personService.getAllPersons()).thenReturn(persons);

        mockMvc.perform(get("/api/persons")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void updatePerson_WithAuthentication_ShouldReturn200() throws Exception {
        when(personService.updatePerson(eq(1L), any(UpdatePersonRequest.class)))
                .thenReturn(personResponse);

        mockMvc.perform(put("/api/persons/1")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void deletePerson_WithAuthentication_ShouldReturn204() throws Exception {
        mockMvc.perform(delete("/api/persons/1")
                        .with(jwt()))
                .andExpect(status().isNoContent());
    }

    @Test
    void deletePerson_WhenNotExists_ShouldReturn404() throws Exception {
        doThrow(new ResourceNotFoundException("Person", "id", 999L))
                .when(personService).deletePerson(999L);

        mockMvc.perform(delete("/api/persons/999")
                        .with(jwt()))
                .andExpect(status().isNotFound());
    }
}
