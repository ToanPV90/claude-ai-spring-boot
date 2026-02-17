package pl.piomin.services.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import pl.piomin.services.model.Person;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class PersonRepositoryTest {

    @Autowired
    private PersonRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void shouldSavePerson() {
        Person person = new Person();
        person.setFirstName("John");
        person.setLastName("Doe");
        person.setEmail("john.doe@example.com");
        person.setPhone("123456789");
        person.setAge(30);

        Person saved = repository.save(person);

        assertNotNull(saved.getId());
        assertEquals("John", saved.getFirstName());
    }

    @Test
    void shouldFindById() {
        Person person = new Person();
        person.setFirstName("John");
        person.setLastName("Doe");
        person.setEmail("john.doe@example.com");
        person.setPhone("123456789");
        person.setAge(30);
        Person saved = repository.save(person);

        Optional<Person> found = repository.findById(saved.getId());

        assertTrue(found.isPresent());
        assertEquals("John", found.get().getFirstName());
    }

    @Test
    void shouldDeletePerson() {
        Person person = new Person();
        person.setFirstName("John");
        person.setLastName("Doe");
        person.setEmail("john.doe@example.com");
        person.setPhone("123456789");
        person.setAge(30);
        Person saved = repository.save(person);

        repository.deleteById(saved.getId());

        assertFalse(repository.existsById(saved.getId()));
    }

    @Test
    void shouldFindAll() {
        Person person1 = new Person();
        person1.setFirstName("John");
        person1.setLastName("Doe");
        person1.setEmail("john.doe@example.com");
        person1.setPhone("123456789");
        person1.setAge(30);

        Person person2 = new Person();
        person2.setFirstName("Jane");
        person2.setLastName("Smith");
        person2.setEmail("jane.smith@example.com");
        person2.setPhone("987654321");
        person2.setAge(25);

        repository.save(person1);
        repository.save(person2);

        assertEquals(2, repository.findAll().size());
    }
}