# Frontmatter and Triggers

## Required Frontmatter Schema

- `name`: folder-aligned skill name
- `description`: trigger-oriented description with explicit `Use when ...`
- `license`: `MIT`
- `metadata.author`: typically `local`
- `metadata.version`: semantic version string
- `metadata.domain`: e.g. `backend`, `architecture`, `testing`, `security`
- `metadata.triggers`: YAML list of user phrases, APIs, errors, or code contexts
- `metadata.role`: e.g. `guide`, `specialist`, `reviewer`
- `metadata.scope`: e.g. `implementation`, `review`, `process`, `architecture`
- `metadata.output-format`: e.g. `code + guidance`, `analysis`, `documentation`
- `metadata.related-skills`: existing sibling skills only

## Description Rules

The description is the first trigger surface Claude sees. Treat it as routing logic, not a summary.

### Format
- Keep it compact because all skill descriptions share a prompt budget
- Write in third person
- First sentence: what the skill does
- Second sentence: `Use when ...`
- Prefer symptoms, contexts, file types, or user intents over vague nouns

### Good example

```text
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

### Bad example

```text
Helps with documents.
```

## Trigger Design Rules

- Prefer YAML-list `metadata.triggers` over comma-separated strings
- Include user intents, technical symptoms, and code-context cues
- Include annotation names, APIs, or error text Claude is likely to see
- Add explicit negative boundaries in `When Not to Use`
- Do not stuff the description with raw keywords if a clearer sentence will do
