# Entity Relationships and Mapping Rules

## Default Mapping Rules

- Prefer `LAZY` for associations
- Keep the aggregate root responsible for cascade and orphan rules
- Use helper methods to keep both sides of bidirectional relationships synchronized
- Prefer `Set` over `List` for many-to-many collections unless ordering is part of the model

## One-to-Many / Many-to-One

```java
@Entity
public class Author {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Book> books = new ArrayList<>();

    public void addBook(Book book) {
        books.add(book);
        book.setAuthor(this);
    }

    public void removeBook(Book book) {
        books.remove(book);
        book.setAuthor(null);
    }
}

@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private Author author;
}
```

The `Book.author` side owns the foreign key. `mappedBy = "author"` tells Hibernate the collection is the inverse side.

## Many-to-Many

Raw many-to-many mappings are acceptable for simple association tables, but once the relationship has metadata or behavior, prefer an explicit join entity.

```java
@Entity
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> courses = new HashSet<>();
}
```

Avoid `List` unless duplicates and ordering are truly part of the domain.

## Cascades and Orphans

Good default:
- `cascade = CascadeType.ALL, orphanRemoval = true` from parent to owned children

Bad default:

```java
@ManyToOne(cascade = CascadeType.ALL)
private Author author;
```

That can cascade deletes from child to parent, which is usually wrong.

## equals and hashCode

Be careful with generated identifiers. A generated `id` is null before persistence and non-null after persistence, which can break collection semantics.

Prefer a stable business key when one exists.

```java
@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NaturalId
    @Column(nullable = false, unique = true)
    private String isbn;

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Book book)) {
            return false;
        }
        return isbn != null && isbn.equals(book.isbn);
    }

    @Override
    public int hashCode() {
        return Objects.hash(isbn);
    }
}
```

## toString and Serialization

Do not include lazy associations in `toString()`, logging, or JSON serialization by default. That can trigger extra queries or lazy-loading failures.

## Auditing

```java
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
```

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditableEntity {

    @CreatedDate
    @Column(updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

Use auditing for cross-cutting metadata, not as a replacement for explicit domain events.

## Verification

- write tests that assert both sides of the relationship stay synchronized
- verify deletes only cascade where the aggregate owns the child lifecycle
- check that `equals/hashCode` remains stable before and after persistence
