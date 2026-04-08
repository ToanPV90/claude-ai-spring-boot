# Plan: Light & Full Install Modes

**Date:** 2026-04-08
**Status:** Draft
**Branch:** TBD (e.g., `feat/install-modes`)

## Problem

Hiện tại `npx create-claude-spring-boot my-app` luôn copy toàn bộ 33 skills (168 files, 1.2MB), 10 agents, 8 commands. Nhiều skill là niche (Kafka, Redis, Blaze-Persistence, jOOQ, Keycloak...) — project mới không cần ngay. Gây noise trong skill list và tăng context cho AI agent.

## Solution

Tách thành 2 mode:

| Mode | Command | Includes |
|------|---------|----------|
| **Light** (default) | `npx create-claude-spring-boot my-app` | Core skills + core agents + all commands |
| **Full** | `npx create-claude-spring-boot my-app --full` | Everything (hiện tại) |

Existing-project mode (`.`) cũng tương tự:
- `npx create-claude-spring-boot .` → light
- `npx create-claude-spring-boot . --full` → full

## Skill Classification

### Core Skills (Light mode) — 15 skills

Essential cho mọi Spring Boot project:

| # | Skill | Reason |
|---|-------|--------|
| 1 | `spring-boot-engineer` | Core Spring Boot implementation |
| 2 | `spring-boot-master` | Application layering & structure |
| 3 | `jpa-master` | JPA/Hibernate — mọi project đều dùng |
| 4 | `maven-master` | Maven multi-module — mọi project đều cần |
| 5 | `tdd-guide` | TDD workflow — mandatory per conventions |
| 6 | `backend-practices-review` | Production-safe defaults |
| 7 | `java-code-review` | Code review checklist |
| 8 | `java-architect` | Architecture decisions |
| 9 | `clean-code` | Code quality |
| 10 | `design-patterns` | GoF patterns |
| 11 | `api-contract-review` | REST API review |
| 12 | `logging-master` | SLF4J, MDC — mọi project đều cần |
| 13 | `security-and-hardening` | Security basics |
| 14 | `debugging-and-error-recovery` | Debugging workflow |
| 15 | `planning-and-task-breakdown` | Task planning |

### Extended Skills (Full mode only) — 18 skills

Specialist/niche — chỉ cần khi project dùng tech đó:

| # | Skill | When needed |
|---|-------|-------------|
| 1 | `kafka-master` | Project uses Kafka |
| 2 | `redis-master` | Project uses Redis |
| 3 | `keycloak-master` | Project uses Keycloak/OAuth2 |
| 4 | `postgres-master` | Deep PostgreSQL tuning |
| 5 | `blaze-persistence` | Using Blaze-Persistence lib |
| 6 | `jooq-master` | Using jOOQ for type-safe SQL |
| 7 | `liquibase-master` | Using Liquibase (vs Flyway) |
| 8 | `resilience-master` | Resilience4j patterns |
| 9 | `observability-master` | Micrometer/tracing setup |
| 10 | `openapi-master` | springdoc-openapi |
| 11 | `performance-optimization` | Performance tuning |
| 12 | `ci-cd-and-automation` | CI/CD pipeline setup |
| 13 | `documentation-and-adrs` | ADR writing |
| 14 | `spec-driven-development` | Spec workflow |
| 15 | `incremental-implementation` | Incremental delivery |
| 16 | `request-refactor-plan` | Refactor planning |
| 17 | `audit-codex` | External audit workflow |
| 18 | `write-a-skill` | Skill authoring |

### Agents Classification

| Mode | Agents |
|------|--------|
| **Light** (5) | `java-architect`, `spring-boot-engineer`, `test-automator`, `code-reviewer`, `database-engineer` |
| **Full** (10) | All above + `security-engineer`, `devops-engineer`, `docker-expert`, `kubernetes-specialist`, `performance-engineer` |

### Commands

All 8 commands are included in both modes — they're tiny and universally useful.

---

## Implementation Plan

### File Structure Changes

```
claude-ai-spring-boot/
├── bin/
│   └── create.js              # Modified — add --full flag parsing + selective copy
├── template/                  # Unchanged — keep everything here
│   └── .claude/
│       ├── agents/            # 10 agents (all stay in template)
│       ├── commands/          # 8 commands (all stay in template)
│       └── skills/            # 33 skills (all stay in template)
├── install-manifest.json      # NEW — defines light vs full classification
├── scripts/
│   ├── verify-skills.js       # Modified — validate manifest covers all skills
│   └── sync-template.sh
└── docs/
    └── plan-light-full-install-modes.md  # This file
```

### Step 1: Create `install-manifest.json`

Single source of truth for which skills/agents belong to which mode.

**File:** `/install-manifest.json`

```json
{
  "version": 1,
  "modes": {
    "light": {
      "description": "Core skills for any Spring Boot project",
      "skills": [
        "api-contract-review",
        "backend-practices-review",
        "clean-code",
        "debugging-and-error-recovery",
        "design-patterns",
        "java-architect",
        "java-code-review",
        "jpa-master",
        "logging-master",
        "maven-master",
        "planning-and-task-breakdown",
        "security-and-hardening",
        "spring-boot-engineer",
        "spring-boot-master",
        "tdd-guide"
      ],
      "agents": [
        "code-reviewer",
        "database-engineer",
        "java-architect",
        "spring-boot-engineer",
        "test-automator"
      ]
    },
    "full": {
      "description": "All skills including specialist/niche technologies",
      "skills": "__all__",
      "agents": "__all__"
    }
  },
  "always_include": {
    "commands": "__all__",
    "root_files": ["CLAUDE.md", "AGENTS.md", "pom.xml"],
    "claude_files": ["settings.local.json"]
  }
}
```

**Notes:**
- `"__all__"` means copy everything from `template/.claude/skills/` or `template/.claude/agents/`
- `light.skills` is an explicit allowlist — safe against accidental inclusion
- Adding a new skill requires adding it to the manifest (verified by `verify-skills.js`)

### Step 2: Modify `bin/create.js`

#### 2a. Parse `--full` flag

```js
// At the top, after 'use strict'
const args = process.argv.slice(2);
const isFull = args.includes('--full');
const positionalArgs = args.filter(a => !a.startsWith('--'));
const arg = positionalArgs[0];
```

#### 2b. Load manifest

```js
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'install-manifest.json'), 'utf8')
);
const mode = isFull ? 'full' : 'light';
const modeConfig = manifest.modes[mode];
```

#### 2c. New function: `copyDirFiltered(src, dest, allowlist)`

Copy only subdirectories whose names are in the allowlist. Used for skills and agents.

```js
function copyDirFiltered(src, dest, allowlist) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowlist.includes(entry.name)) {
      continue; // skip non-allowlisted directories
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath); // full recursive copy within allowed skill
    } else {
      fs.copyFileSync(srcPath, destPath); // files at skills/ root level (e.g., README.md)
    }
  }
}

function syncDirFiltered(src, dest, allowlist) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowlist.includes(entry.name)) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      syncDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
```

#### 2d. Resolve allowlists

```js
function resolveAllowlist(modeValue, templateSubdir) {
  if (modeValue === '__all__') {
    return fs.readdirSync(path.join(templateDir, '.claude', templateSubdir), { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  }
  return modeValue;
}

const skillAllowlist = resolveAllowlist(modeConfig.skills, 'skills');
const agentAllowlist = resolveAllowlist(modeConfig.agents, 'agents');
```

#### 2e. Modify new-project flow (line ~213-229)

Replace:
```js
copyDir(templateDir, targetDir);
```

With:
```js
// Copy root files
for (const rootFile of manifest.always_include.root_files) {
  const src = path.join(templateDir, rootFile);
  const dest = path.join(targetDir, rootFile);
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy Maven modules (common/, service/)
for (const moduleDir of ['common', 'service']) {
  const src = path.join(templateDir, moduleDir);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(targetDir, moduleDir));
  }
}

// Copy .claude structure
const targetClaudeDir = path.join(targetDir, '.claude');
fs.mkdirSync(targetClaudeDir, { recursive: true });

// settings.local.json
fs.copyFileSync(
  path.join(templateDir, '.claude', 'settings.local.json'),
  path.join(targetClaudeDir, 'settings.local.json')
);

// Commands — always all
copyDir(
  path.join(templateDir, '.claude', 'commands'),
  path.join(targetClaudeDir, 'commands')
);

// Agents — filtered
copyDirFiltered(
  path.join(templateDir, '.claude', 'agents'),
  path.join(targetClaudeDir, 'agents'),
  agentAllowlist
);

// Skills — filtered
copyDirFiltered(
  path.join(templateDir, '.claude', 'skills'),
  path.join(targetClaudeDir, 'skills'),
  skillAllowlist
);
```

#### 2f. Modify existing-project flow (line ~144-208)

Replace skills sync:
```js
syncDir(path.join(templateClaudeDir, 'skills'), path.join(targetClaudeDir, 'skills'));
```

With:
```js
syncDirFiltered(
  path.join(templateClaudeDir, 'skills'),
  path.join(targetClaudeDir, 'skills'),
  skillAllowlist
);
```

Same for agents:
```js
syncDirFiltered(
  path.join(templateClaudeDir, 'agents'),
  path.join(targetClaudeDir, 'agents'),
  agentAllowlist
);
```

#### 2g. Fix managed manifest to only track installed files

The `nextManagedFiles` calculation must filter to only allowlisted skills/agents:

```js
function listFilesFilteredByAllowlist(dir, allowlist) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowlist.includes(entry.name)) continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath, dir));
    }
  }
  return files;
}

const nextManagedFiles = [
  ...listFilesFilteredByAllowlist(
    path.join(templateClaudeDir, 'agents'), agentAllowlist
  ).map(file => path.join('agents', file)),
  ...listFilesRecursive(path.join(templateClaudeDir, 'commands'))
    .map(file => path.join('commands', file)),
  ...listFilesFilteredByAllowlist(
    path.join(templateClaudeDir, 'skills'), skillAllowlist
  ).map(file => path.join('skills', file))
].sort();
```

#### 2h. Update console output

```js
if (isExisting) {
  console.log(`Injecting Claude AI config (${mode} mode) into "${projectName}"...`);
} else {
  console.log(`Creating project "${projectName}" (${mode} mode)...`);
}

// At the end, for new projects:
console.log(`\nInstalled: ${skillAllowlist.length} skills, ${agentAllowlist.length} agents, 8 commands`);
if (!isFull) {
  console.log('Tip: use --full to include all specialist skills (Kafka, Redis, Keycloak, etc.)');
}
```

#### 2i. Add `--help` output

```js
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: create-claude-spring-boot [project-name] [options]

Arguments:
  project-name    Name of the new project directory (omit or use "." for existing project)

Options:
  --full          Install all skills including specialist/niche technologies
  --help, -h      Show this help message

Modes:
  light (default) ${manifest.modes.light.skills.length} core skills for any Spring Boot project
  full            All ${Object.keys(/* count all skills */)} skills including Kafka, Redis, Keycloak, etc.

Examples:
  npx create-claude-spring-boot my-app          # New project, light mode
  npx create-claude-spring-boot my-app --full   # New project, full mode
  npx create-claude-spring-boot .               # Inject into existing project
  npx create-claude-spring-boot . --full        # Inject all skills into existing project
`);
  process.exit(0);
}
```

### Step 3: Update `install-manifest.json` in `package.json` files field

```json
{
  "files": [
    "bin/",
    "template/",
    "install-manifest.json"
  ]
}
```

### Step 4: Update `scripts/verify-skills.js`

Add manifest validation to ensure:

1. Every skill in `template/.claude/skills/` is classified in the manifest (either in `light.skills` or as implicitly in `full`)
2. Every skill listed in `light.skills` actually exists in `template/.claude/skills/`
3. Every agent listed in `light.agents` actually exists in `template/.claude/agents/`

```js
// Add after existing validation
function validateManifest(manifestPath, templateSkillsDir, templateAgentsDir, errors) {
  if (!fs.existsSync(manifestPath)) {
    errors.push('install-manifest.json not found');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const lightSkills = manifest.modes.light.skills;
  const lightAgents = manifest.modes.light.agents;

  // All listed light skills must exist
  const existingSkills = fs.readdirSync(templateSkillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  for (const skill of lightSkills) {
    if (!existingSkills.includes(skill)) {
      errors.push(`Manifest references non-existent skill: ${skill}`);
    }
  }

  // All existing skills must be in light or acknowledged as full-only
  // (This is informational — full includes everything)

  // All listed light agents must exist
  const existingAgents = fs.readdirSync(templateAgentsDir, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => e.name.replace('.md', ''));

  for (const agent of lightAgents) {
    if (!existingAgents.includes(agent)) {
      errors.push(`Manifest references non-existent agent: ${agent}`);
    }
  }
}
```

### Step 5: Update `template/AGENTS.md`

Add a note so users know they can get more skills:

```markdown
## Install Mode

This project was scaffolded in **light** mode with core skills only.
To add all specialist skills (Kafka, Redis, Keycloak, Blaze-Persistence, etc.):

\`\`\`bash
npx create-claude-spring-boot . --full
\`\`\`
```

This section should be conditionally added only in light mode. Implementation: `bin/create.js` appends this block to `AGENTS.md` after copy when mode is light.

### Step 6: Handle Mode Upgrade (light → full)

When a user runs `npx create-claude-spring-boot . --full` on a project that was previously installed as light:

1. The managed manifest already tracks what was installed
2. `syncDirFiltered` with full allowlist will add the new skills/agents
3. Stale file removal only removes files that were in the previous manifest but NOT in the new manifest
4. Since full is a superset of light, no files will be removed — only added
5. Console output shows what was added:

```
  ↻ .claude/skills/ (refreshed managed skills)
  + 18 additional specialist skills added (full mode)
```

### Step 7: Handle Mode Downgrade (full → light)

When a user runs `npx create-claude-spring-boot .` (light) on a project previously installed as full:

**Decision needed:** Should this remove the extra skills?

**Recommended approach:** Do NOT remove. The stale-file cleanup only removes files that were in the previous manifest AND are not in the new manifest. Since the user explicitly installed full before, we should preserve those skills.

To handle this cleanly, store the install mode in the managed manifest:

```json
{
  "version": 2,
  "mode": "full",
  "files": [...]
}
```

On re-run with light mode, if the stored mode is `full`, keep all files and just refresh the ones matching the light allowlist. Log:

```
  ~ running in light mode, but project was installed with --full
  ~ to refresh all skills, re-run with --full
```

---

## Task Breakdown

| # | Task | Files Changed | Depends On | Est |
|---|------|---------------|------------|-----|
| 1 | Create `install-manifest.json` | `install-manifest.json` (new) | — | 15min |
| 2 | Add `install-manifest.json` to `package.json` files | `package.json` | 1 | 5min |
| 3 | Parse `--full` and `--help` flags in CLI | `bin/create.js` | 1 | 15min |
| 4 | Add `copyDirFiltered` / `syncDirFiltered` functions | `bin/create.js` | — | 15min |
| 5 | Refactor new-project flow to use filtered copy | `bin/create.js` | 3, 4 | 30min |
| 6 | Refactor existing-project flow to use filtered sync | `bin/create.js` | 3, 4 | 30min |
| 7 | Fix managed manifest to track only installed files | `bin/create.js` | 5, 6 | 15min |
| 8 | Store mode in manifest + handle upgrade/downgrade | `bin/create.js` | 7 | 20min |
| 9 | Update console output with mode info | `bin/create.js` | 3 | 10min |
| 10 | Add manifest validation to `verify-skills.js` | `scripts/verify-skills.js` | 1 | 15min |
| 11 | Add install-mode note to generated `AGENTS.md` | `bin/create.js` | 3 | 10min |
| 12 | Manual test: new project light mode | — | 5 | 10min |
| 13 | Manual test: new project full mode | — | 5 | 10min |
| 14 | Manual test: existing project inject light | — | 6 | 10min |
| 15 | Manual test: existing project upgrade light → full | — | 6, 8 | 10min |
| 16 | Update README.md with mode documentation | `README.md` | 9 | 15min |

**Total estimated:** ~3.5 hours

## Verification

```bash
# 1. Verify manifest covers all skills
npm run verify:skills

# 2. Test light mode new project
node bin/create.js test-light
ls test-light/.claude/skills/        # should have 15 skills
ls test-light/.claude/agents/        # should have 5 agents
rm -rf test-light

# 3. Test full mode new project
node bin/create.js test-full --full
ls test-full/.claude/skills/         # should have 33 skills
ls test-full/.claude/agents/         # should have 10 agents
rm -rf test-full

# 4. Test existing project inject
mkdir test-existing && cd test-existing
node ../bin/create.js .              # light mode
ls .claude/skills/ | wc -l          # 15
node ../bin/create.js . --full      # upgrade to full
ls .claude/skills/ | wc -l          # 33
cd .. && rm -rf test-existing

# 5. Verify no skill is accidentally missing
diff <(ls template/.claude/skills/) <(cat install-manifest.json | node -e "
  const m = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const all = [...new Set([...m.modes.light.skills])].sort();
  // full = __all__, so just verify light is a subset
  all.forEach(s => console.log(s));
")
```

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| User doesn't know about `--full` | Misses useful skills | Console tip + AGENTS.md note |
| New skill added to template but not to manifest | Silently excluded from light | `verify-skills.js` validates manifest completeness |
| Manifest file missing from npm package | CLI crashes | Add to `package.json` files + CI test |
| Upgrade (light→full) leaves stale manifest | Wrong stale-file removal | Store mode in manifest, compare correctly |
