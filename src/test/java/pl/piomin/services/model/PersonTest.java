package pl.piomin.services.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PersonTest {

    @Test
    void shouldCreatePersonWithAllFields() {
        Person person = new Person(1L, "John", "Doe", "john@example.com", "123456789", 30);

        assertEquals(1L, person.getId());
        assertEquals("John", person.getFirstName());
        assertEquals("Doe", person.getLastName());
        assertEquals("john@example.com", person.getEmail());
        assertEquals("123456789", person.getPhone());
        assertEquals(30, person.getAge());
    }

    @Test
    void shouldSetAndGetFields() {
        Person person = new Person();
        person.setId(2L);
        person.setFirstName("Jane");
        person.setLastName("Smith");
        person.setEmail("jane@example.com");
        person.setPhone("987654321");
        person.setAge(25);

        assertEquals(2L, person.getId());
        assertEquals("Jane", person.getFirstName());
        assertEquals("Smith", person.getLastName());
        assertEquals("jane@example.com", person.getEmail());
        assertEquals("987654321", person.getPhone());
        assertEquals(25, person.getAge());
    }
}