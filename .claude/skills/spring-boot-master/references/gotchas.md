# Spring Boot Layering Gotchas

- Controllers often grow business logic when teams confuse HTTP orchestration with domain orchestration.
- Service interfaces added by habit create ceremony without increasing clarity.
- Returning entities directly can silently couple API behavior to persistence choices.
- Validation and error handling become inconsistent when every controller invents its own response shape.
- Once repository/query guidance becomes performance-specific, switch to `jpa-master` instead of growing this skill.
