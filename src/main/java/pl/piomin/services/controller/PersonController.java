package pl.piomin.services.controller;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.piomin.services.dto.request.CreatePersonRequest;
import pl.piomin.services.dto.request.UpdatePersonRequest;
import pl.piomin.services.dto.response.PersonResponse;
import pl.piomin.services.service.PersonService;

import java.util.List;

@RestController
@RequestMapping("/api/persons")
public class PersonController {

    private static final Logger logger = LoggerFactory.getLogger(PersonController.class);

    private final PersonService personService;

    public PersonController(PersonService personService) {
        this.personService = personService;
    }

    @PostMapping
    public ResponseEntity<PersonResponse> createPerson(@Valid @RequestBody CreatePersonRequest request) {
        logger.info("POST /api/persons - Creating new person");
        PersonResponse response = personService.createPerson(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PersonResponse> getPersonById(@PathVariable Long id) {
        logger.debug("GET /api/persons/{} - Fetching person", id);
        PersonResponse response = personService.getPersonById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PersonResponse>> getAllPersons() {
        logger.debug("GET /api/persons - Fetching all persons");
        List<PersonResponse> responses = personService.getAllPersons();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PersonResponse> updatePerson(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePersonRequest request) {
        logger.info("PUT /api/persons/{} - Updating person", id);
        PersonResponse response = personService.updatePerson(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePerson(@PathVariable Long id) {
        logger.info("DELETE /api/persons/{} - Deleting person", id);
        personService.deletePerson(id);
        return ResponseEntity.noContent().build();
    }
}
