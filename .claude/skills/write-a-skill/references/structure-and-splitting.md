# Structure and Splitting

## Recommended Skill Folder Shape

```text
skill-name/
├── SKILL.md                 # Main instructions Claude reads first
├── references/              # Detailed docs loaded as needed
│   ├── examples.md
│   ├── gotchas.md
│   └── troubleshooting.md
└── scripts/                 # Deterministic helpers (optional)
    └── validate.js
```

## Progressive Disclosure

Use the file system as context engineering:

- `SKILL.md` should contain decision rules, strongest defaults, and only a small number of representative examples
- `references/*.md` should hold long examples, API details, protocol notes, and advanced variants
- `scripts/` should hold deterministic operations instead of forcing the model to regenerate them

When a skill includes references, tell Claude what each file is for and when to read it. A `Reference Guide` table is the preferred pattern.

## When to Add Scripts

Add scripts when:
- the operation is deterministic
- the same helper code would otherwise be regenerated repeatedly
- explicit error handling improves reliability

## When to Split Files

Split into separate files when:
- `SKILL.md` drifts beyond roughly 100-250 lines, or approaches the 500-line hard ceiling
- content has distinct domains
- advanced features are rarely needed
- a long section can be described by a `Reference Guide` entry instead of staying inline
