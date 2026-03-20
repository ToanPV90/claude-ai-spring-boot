package pl.piomin.services.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.piomin.services.dto.request.CreatePersonRequest;
import pl.piomin.services.dto.request.UpdatePersonRequest;
import pl.piomin.services.dto.response.PersonResponse;
import pl.piomin.services.exception.ResourceNotFoundException;
import pl.piomin.services.mapper.PersonMapper;
import pl.piomin.services.model.Person;
import pl.piomin.services.repository.PersonRepository;
import pl.piomin.services.service.PersonService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PersonServiceImpl implements PersonService {

    private static final Logger logger = LoggerFactory.getLogger(PersonServiceImpl.class);

    private final PersonRepository personRepository;
    private final PersonMapper personMapper;

    public PersonServiceImpl(PersonRepository personRepository, PersonMapper personMapper) {
        this.personRepository = personRepository;
        this.personMapper = personMapper;
    }

    @Override
    public PersonResponse createPerson(CreatePersonRequest request) {
        logger.info("Creating new person with email: {}", request.getEmail());

        Person person = personMapper.toEntity(request);
        Person savedPerson = personRepository.save(person);

        logger.info("Person created successfully with id: {}", savedPerson.getId());
        return personMapper.toResponse(savedPerson);
    }

    @Override
    @Transactional(readOnly = true)
    public PersonResponse getPersonById(Long id) {
        logger.debug("Fetching person with id: {}", id);

        Person person = personRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Person", "id", id));

        return personMapper.toResponse(person);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PersonResponse> getAllPersons() {
        logger.debug("Fetching all persons");

        List<Person> persons = personRepository.findAll();
        return persons.stream()
                .map(personMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public PersonResponse updatePerson(Long id, UpdatePersonRequest request) {
        logger.info("Updating person with id: {}", id);

        Person person = personRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Person", "id", id));

        personMapper.updateEntity(person, request);
        Person updatedPerson = personRepository.save(person);

        logger.info("Person updated successfully with id: {}", updatedPerson.getId());
        return personMapper.toResponse(updatedPerson);
    }

    @Override
    public void deletePerson(Long id) {
        logger.info("Deleting person with id: {}", id);

        Person person = personRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Person", "id", id));

        personRepository.delete(person);
        logger.info("Person deleted successfully with id: {}", id);
    }
}
