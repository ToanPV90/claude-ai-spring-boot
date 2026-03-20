package pl.piomin.services.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.piomin.services.dto.request.CreatePersonRequest;
import pl.piomin.services.dto.request.UpdatePersonRequest;
import pl.piomin.services.dto.response.PersonResponse;
import pl.piomin.services.exception.ResourceNotFoundException;
import pl.piomin.services.mapper.PersonMapper;
import pl.piomin.services.model.Person;
import pl.piomin.services.repository.PersonRepository;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonServiceImplTest {

    @Mock
    private PersonRepository personRepository;

    @Mock
    private PersonMapper personMapper;

    @InjectMocks
    private PersonServiceImpl personService;

    private Person person;
    private PersonResponse personResponse;
    private CreatePersonRequest createRequest;
    private UpdatePersonRequest updateRequest;

    @BeforeEach
    void setUp() {
        person = new Person("John", "Doe", "john.doe@example.com");
        person.setId(1L);
        person.setDateOfBirth(LocalDate.of(1990, 1, 1));

        personResponse = new PersonResponse(1L, "John", "Doe", "john.doe@example.com");
        personResponse.setDateOfBirth(LocalDate.of(1990, 1, 1));

        createRequest = new CreatePersonRequest("John", "Doe", "john.doe@example.com");
        createRequest.setDateOfBirth(LocalDate.of(1990, 1, 1));

        updateRequest = new UpdatePersonRequest();
        updateRequest.setFirstName("Jane");
    }

    @Test
    void createPerson_ShouldReturnPersonResponse() {
        when(personMapper.toEntity(createRequest)).thenReturn(person);
        when(personRepository.save(any(Person.class))).thenReturn(person);
        when(personMapper.toResponse(person)).thenReturn(personResponse);

        PersonResponse result = personService.createPerson(createRequest);

        assertThat(result).isNotNull();
        assertThat(result.getFirstName()).isEqualTo("John");
        assertThat(result.getEmail()).isEqualTo("john.doe@example.com");

        verify(personRepository, times(1)).save(any(Person.class));
        verify(personMapper, times(1)).toEntity(createRequest);
        verify(personMapper, times(1)).toResponse(person);
    }

    @Test
    void getPersonById_WhenExists_ShouldReturnPersonResponse() {
        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personMapper.toResponse(person)).thenReturn(personResponse);

        PersonResponse result = personService.getPersonById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(personRepository, times(1)).findById(1L);
    }

    @Test
    void getPersonById_WhenNotExists_ShouldThrowException() {
        when(personRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> personService.getPersonById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Person not found");

        verify(personRepository, times(1)).findById(999L);
    }

    @Test
    void getAllPersons_ShouldReturnListOfPersons() {
        List<Person> persons = Arrays.asList(person);
        when(personRepository.findAll()).thenReturn(persons);
        when(personMapper.toResponse(any(Person.class))).thenReturn(personResponse);

        List<PersonResponse> results = personService.getAllPersons();

        assertThat(results).isNotEmpty();
        assertThat(results).hasSize(1);
        verify(personRepository, times(1)).findAll();
    }

    @Test
    void updatePerson_WhenExists_ShouldReturnUpdatedPerson() {
        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personRepository.save(any(Person.class))).thenReturn(person);
        when(personMapper.toResponse(person)).thenReturn(personResponse);

        PersonResponse result = personService.updatePerson(1L, updateRequest);

        assertThat(result).isNotNull();
        verify(personRepository, times(1)).findById(1L);
        verify(personMapper, times(1)).updateEntity(person, updateRequest);
        verify(personRepository, times(1)).save(person);
    }

    @Test
    void updatePerson_WhenNotExists_ShouldThrowException() {
        when(personRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> personService.updatePerson(999L, updateRequest))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(personRepository, times(1)).findById(999L);
        verify(personRepository, never()).save(any(Person.class));
    }

    @Test
    void deletePerson_WhenExists_ShouldDeletePerson() {
        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        personService.deletePerson(1L);

        verify(personRepository, times(1)).findById(1L);
        verify(personRepository, times(1)).delete(person);
    }

    @Test
    void deletePerson_WhenNotExists_ShouldThrowException() {
        when(personRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> personService.deletePerson(999L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(personRepository, times(1)).findById(999L);
        verify(personRepository, never()).delete(any(Person.class));
    }
}
