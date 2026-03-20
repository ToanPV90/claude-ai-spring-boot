package pl.piomin.services.mapper;

import org.springframework.stereotype.Component;
import pl.piomin.services.dto.request.CreatePersonRequest;
import pl.piomin.services.dto.request.UpdatePersonRequest;
import pl.piomin.services.dto.response.PersonResponse;
import pl.piomin.services.model.Person;

@Component
public class PersonMapper {

    public Person toEntity(CreatePersonRequest request) {
        Person person = new Person();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        person.setDateOfBirth(request.getDateOfBirth());
        person.setPhoneNumber(request.getPhoneNumber());
        person.setAddress(request.getAddress());
        return person;
    }

    public void updateEntity(Person person, UpdatePersonRequest request) {
        if (request.getFirstName() != null) {
            person.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            person.setLastName(request.getLastName());
        }
        if (request.getEmail() != null) {
            person.setEmail(request.getEmail());
        }
        if (request.getDateOfBirth() != null) {
            person.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getPhoneNumber() != null) {
            person.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAddress() != null) {
            person.setAddress(request.getAddress());
        }
    }

    public PersonResponse toResponse(Person person) {
        PersonResponse response = new PersonResponse();
        response.setId(person.getId());
        response.setFirstName(person.getFirstName());
        response.setLastName(person.getLastName());
        response.setEmail(person.getEmail());
        response.setDateOfBirth(person.getDateOfBirth());
        response.setPhoneNumber(person.getPhoneNumber());
        response.setAddress(person.getAddress());
        response.setCreatedAt(person.getCreatedAt());
        response.setUpdatedAt(person.getUpdatedAt());
        return response;
    }
}
