package pl.piomin.services.service;

import pl.piomin.services.dto.request.CreatePersonRequest;
import pl.piomin.services.dto.request.UpdatePersonRequest;
import pl.piomin.services.dto.response.PersonResponse;

import java.util.List;

public interface PersonService {

    PersonResponse createPerson(CreatePersonRequest request);

    PersonResponse getPersonById(Long id);

    List<PersonResponse> getAllPersons();

    PersonResponse updatePerson(Long id, UpdatePersonRequest request);

    void deletePerson(Long id);
}
