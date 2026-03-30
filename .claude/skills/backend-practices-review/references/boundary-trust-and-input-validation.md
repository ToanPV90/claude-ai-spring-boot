# Boundary Trust and Input Validation

## Default Position

Backend review should start at the trust boundary.

Ask three questions first:
- what input is trusted
- who is allowed to do the action
- how failure is reported when the input is bad or the actor is unauthorized

## Validate Before Costly Side Effects

Review for:
- request DTO validation that matches real business expectations
- normalization of IDs, enums, ranges, and optional fields before downstream branching
- explicit size and shape limits for lists, filters, pagination, and uploads
- rejection paths that fail predictably before the system mutates state or calls external services

Client metadata such as `Content-Type`, tenant hints, filenames, or path fragments are hints, not proof.

## Authorization Is Not Authentication

Review whether the backend binds the action to:
- the authenticated principal
- the owning business record
- tenant or namespace rules
- role/capability checks where appropriate

Authentication answers who the caller is. Authorization answers whether that caller may act on this resource.

## Secret and Sensitive-Data Hygiene

Review for:
- secrets loaded from environment or secret stores rather than source-controlled config
- no accidental echo of credentials, tokens, or internal URLs in error bodies
- log redaction for sensitive values
- private-by-default serving for protected files or exports

If Keycloak/JWT mapping or provider-specific auth wiring becomes the main issue, route to `keycloak-master`.

## File-Handling Checks

For uploads or staged files:
- generate filenames server-side
- keep original filename as metadata only
- store outside webroot
- normalize and constrain paths
- use extension/media-type/signature checks proportionally to risk

## Anti-Patterns

- Trusting client input because it already came through one validated UI
- Assuming authentication automatically proves authorization
- Returning sensitive details in logs or error payloads for convenience
- Hardcoding secrets or environment-specific URLs in application config
