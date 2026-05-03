#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// --- Argument parsing ---

const args = process.argv.slice(2);
const isFull = args.includes('--full');
const withAlibabaCheck = args.includes('--with-alibaba-check');
const positionalArgs = args.filter(a => !a.startsWith('--'));
const arg = positionalArgs[0];

// --- Load install manifest ---

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'install-manifest.json'), 'utf8')
);
const mode = isFull ? 'full' : 'light';
const modeConfig = manifest.modes[mode];

// --- Help ---

if (args.includes('--help') || args.includes('-h')) {
  const totalSkills = fs.readdirSync(
    path.join(__dirname, '..', 'template', '.claude', 'skills'), { withFileTypes: true }
  ).filter(e => e.isDirectory()).length;

  console.log(`
Usage: create-claude-spring-boot [project-name] [options]

Arguments:
  project-name    Name of the new project directory (omit or use "." for existing project)

Options:
  --full          Install all skills including specialist/niche technologies
  --help, -h      Show this help message

Modes:
  light (default) ${manifest.modes.light.skills.length} core skills for any Spring Boot project
  full            All ${totalSkills} skills including Kafka, Redis, Keycloak, etc.

Examples:
  npx create-claude-spring-boot my-app          # New project, light mode
  npx create-claude-spring-boot my-app --full   # New project, full mode
  npx create-claude-spring-boot .               # Inject into existing project
  npx create-claude-spring-boot . --full        # Inject all skills into existing project
`);
  process.exit(0);
}

// --- Determine mode: new project vs existing project ---

const isExisting = !arg || arg === '.';
const projectName = isExisting ? path.basename(process.cwd()) : arg;

if (!isExisting && !/^[a-zA-Z0-9_-]+$/.test(projectName)) {
  console.error('Error: project name may only contain letters, numbers, hyphens, and underscores.');
  process.exit(1);
}

const targetDir = isExisting ? process.cwd() : path.resolve(process.cwd(), projectName);

if (!isExisting && fs.existsSync(targetDir)) {
  console.error(`Error: Directory "${projectName}" already exists.`);
  process.exit(1);
}

// --- Utility functions ---

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function syncDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      syncDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyDirFiltered(src, dest, allowlist) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!allowlist.includes(entry.name)) continue;
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function syncDirFiltered(src, dest, allowlist) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!allowlist.includes(entry.name)) continue;
      syncDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFilesFiltered(src, dest, allowlist) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const baseName = entry.name.replace(/\.md$/, '');
    if (!allowlist.includes(baseName)) continue;
    fs.copyFileSync(path.join(src, entry.name), path.join(dest, entry.name));
  }
}

function syncFilesFiltered(src, dest, allowlist) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const baseName = entry.name.replace(/\.md$/, '');
    if (!allowlist.includes(baseName)) continue;
    fs.copyFileSync(path.join(src, entry.name), path.join(dest, entry.name));
  }
}

function listFilesRecursive(dir, base = dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath, base));
    } else {
      files.push(path.relative(base, entryPath));
    }
  }

  return files;
}

function listFilesFilteredSkills(dir, allowlist) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!allowlist.includes(entry.name)) continue;
      files.push(...listFilesRecursive(entryPath, dir));
    } else {
      files.push(entry.name);
    }
  }
  return files;
}

function listFilesFilteredAgents(dir, allowlist) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const baseName = entry.name.replace(/\.md$/, '');
    if (!allowlist.includes(baseName)) continue;
    files.push(entry.name);
  }
  return files;
}

function removeEmptyDirectories(dir, stopDir) {
  let current = dir;
  while (current.startsWith(stopDir) && current !== stopDir) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }

    if (fs.readdirSync(current).length > 0) {
      break;
    }

    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function loadManagedManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeManagedManifest(filePath, installMode, entries) {
  fs.writeFileSync(filePath, JSON.stringify({ version: 2, mode: installMode, files: entries }, null, 2) + '\n', 'utf8');
}

function removeStaleManagedFiles(targetClaudeDir, previousEntries, nextEntries) {
  const stale = previousEntries.filter(entry => !nextEntries.includes(entry));
  for (const relativeFile of stale) {
    const targetFile = path.join(targetClaudeDir, relativeFile);
    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
      removeEmptyDirectories(path.dirname(targetFile), targetClaudeDir);
    }
  }
  return stale;
}

function copyIfAbsent(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function substituteProjectName(filePath, name) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replaceAll('__PROJECT_NAME__', name);
  fs.writeFileSync(filePath, updated, 'utf8');
}

function substituteProjectNameInTree(dirPath, name) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      substituteProjectNameInTree(entryPath, name);
    } else {
      substituteProjectName(entryPath, name);
    }
  }
}

// --- Resolve allowlists from manifest ---

const templateDir = path.join(__dirname, '..', 'template');
const managedManifestName = '.create-claude-spring-boot-managed.json';

function resolveSkillAllowlist(modeValue) {
  if (modeValue === '__all__') {
    return fs.readdirSync(path.join(templateDir, '.claude', 'skills'), { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  }
  return modeValue;
}

function resolveAgentAllowlist(modeValue) {
  if (modeValue === '__all__') {
    return fs.readdirSync(path.join(templateDir, '.claude', 'agents'), { withFileTypes: true })
      .filter(e => e.isFile())
      .map(e => e.name.replace(/\.md$/, ''));
  }
  return modeValue;
}

const skillAllowlist = resolveSkillAllowlist(modeConfig.skills);
const agentAllowlist = resolveAgentAllowlist(modeConfig.agents);

// --- Light mode AGENTS.md append ---

const lightModeNote = `

## Install Mode

This project was scaffolded in **light** mode with ${skillAllowlist.length} core skills.
To add all specialist skills (Kafka, Redis, Keycloak, Blaze-Persistence, etc.):

\`\`\`bash
npx create-claude-spring-boot . --full
\`\`\`
`;

function filterAgentsMd(filePath, skills, agents) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const filtered = [];
  let inStructure = false;
  let inAgentBlock = false;
  let inWhereToLook = false;
  let pastWhereToLookHeader = false;
  const refsWithSkills = skills.filter(s => {
    const refDir = path.join(templateDir, '.claude', 'skills', s, 'references');
    return fs.existsSync(refDir);
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect sections
    if (line.startsWith('## STRUCTURE')) {
      inStructure = true;
      filtered.push(line);
      continue;
    }
    if (line.startsWith('## WHERE TO LOOK')) {
      inStructure = false;
      inWhereToLook = true;
      pastWhereToLookHeader = false;
      filtered.push(line);
      continue;
    }
    if (inWhereToLook && line.startsWith('## ')) {
      inWhereToLook = false;
    }

    // --- Filter STRUCTURE section ---
    if (inStructure) {
      // Agent count line
      if (/agents\/\s+#/.test(line)) {
        filtered.push(line.replace(/#\s*\d+\s*specialized AI agents/, `# ${agents.length} specialized AI agents`));
        inAgentBlock = true;
        continue;
      }
      // Agent file lines (e.g. "│   ├── java-architect.md" or "│   └── code-reviewer.md")
      if (inAgentBlock && /[├└]──\s+[\w-]+\.md/.test(line)) {
        const agentMatch = line.match(/([\w-]+)\.md/);
        if (agentMatch && !agents.includes(agentMatch[1])) continue;
        filtered.push(line);
        continue;
      }
      // End of agent block
      if (inAgentBlock && !/│/.test(line.trim()) && !/[├└]──.*\.md/.test(line)) {
        inAgentBlock = false;
      }
      // Skills count line
      if (/skills\/\s+#/.test(line)) {
        filtered.push(line.replace(/#\s*\d+\s*skills/, `# ${skills.length} skills`));
        continue;
      }
      // Skill directory lines (e.g. "├── kafka-master/")
      if (/[├└]──\s+[\w-]+\/\s+#/.test(line)) {
        const skillMatch = line.match(/[├└]──\s+([\w-]+)\//);
        if (skillMatch && !skills.includes(skillMatch[1])) continue;
      }
      filtered.push(line);
      continue;
    }

    // --- Filter WHERE TO LOOK table ---
    if (inWhereToLook) {
      // Pass header row and separator row
      if (!pastWhereToLookHeader) {
        filtered.push(line);
        if (line.startsWith('|---')) pastWhereToLookHeader = true;
        continue;
      }
      // Table rows referencing skills
      if (line.startsWith('|') && line.includes('.claude/skills/')) {
        const skillMatch = line.match(/\.claude\/skills\/([\w-]+)\//);
        if (skillMatch && !skills.includes(skillMatch[1])) continue;
      }
      // Agent count row
      if (line.includes('agents/*.md')) {
        filtered.push(line.replace(/\d+ agents/, `${agents.length} agents`));
        continue;
      }
      filtered.push(line);
      continue;
    }

    // --- Update NOTES section counts ---
    if (/\d+ skills have `references\/`/.test(line)) {
      filtered.push(line.replace(/\d+ skills have/, `${refsWithSkills.length} skills have`));
      continue;
    }

    filtered.push(line);
  }

  fs.writeFileSync(filePath, filtered.join('\n'), 'utf8');
}

// --- Main execution ---

try {
  if (isExisting) {
    const targetClaudeDir = path.join(targetDir, '.claude');
    const templateClaudeDir = path.join(templateDir, '.claude');
    const manifestPath = path.join(targetClaudeDir, managedManifestName);
    fs.mkdirSync(targetClaudeDir, { recursive: true });

    // Check if previously installed with a broader mode
    const previousManifest = loadManagedManifest(manifestPath);
    const previousMode = previousManifest?.mode || null;
    let effectiveMode = mode;
    let effectiveSkillAllowlist = skillAllowlist;
    let effectiveAgentAllowlist = agentAllowlist;

    if (previousMode === 'full' && mode === 'light') {
      // Do not downgrade — refresh only what light covers, but keep full's files tracked
      console.log(`Refreshing Claude AI config (light mode) in "${projectName}"...`);
      console.log('  ~ project was installed with --full; keeping all skills');
      console.log('  ~ to refresh all skills, re-run with --full');
      effectiveMode = 'full';
      effectiveSkillAllowlist = resolveSkillAllowlist('__all__');
      effectiveAgentAllowlist = resolveAgentAllowlist('__all__');
    } else {
      console.log(`Injecting Claude AI config (${mode} mode) into "${projectName}"...`);
    }

    // Build next managed file list
    const nextManagedFiles = [
      ...listFilesFilteredAgents(path.join(templateClaudeDir, 'agents'), effectiveAgentAllowlist)
        .map(file => path.join('agents', file)),
      ...listFilesRecursive(path.join(templateClaudeDir, 'commands'))
        .map(file => path.join('commands', file)),
      ...listFilesFilteredSkills(path.join(templateClaudeDir, 'skills'), effectiveSkillAllowlist)
        .map(file => path.join('skills', file))
    ].sort();

    // Remove stale files from previous install
    const staleManagedFiles = previousManifest?.files
      ? removeStaleManagedFiles(targetClaudeDir, previousManifest.files, nextManagedFiles)
      : [];

    // Sync agents (filtered)
    syncFilesFiltered(path.join(templateClaudeDir, 'agents'), path.join(targetClaudeDir, 'agents'), effectiveAgentAllowlist);
    console.log(`  ↻ .claude/agents/ (${effectiveAgentAllowlist.length} agents)`);

    // Sync commands (always all)
    syncDir(path.join(templateClaudeDir, 'commands'), path.join(targetClaudeDir, 'commands'));
    console.log('  ↻ .claude/commands/ (refreshed managed commands)');

    // Sync skills (filtered)
    syncDirFiltered(path.join(templateClaudeDir, 'skills'), path.join(targetClaudeDir, 'skills'), effectiveSkillAllowlist);
    console.log(`  ↻ .claude/skills/ (${effectiveSkillAllowlist.length} skills)`);

    // Write manifest
    writeManagedManifest(manifestPath, effectiveMode, nextManagedFiles);
    if (staleManagedFiles.length > 0) {
      console.log(`  - removed ${staleManagedFiles.length} stale managed file(s)`);
    } else if (!previousManifest) {
      console.log(`  + .claude/${managedManifestName} (started tracking managed files)`);
    }

    // Settings
    const addedSettings = copyIfAbsent(
      path.join(templateClaudeDir, 'settings.local.json'),
      path.join(targetClaudeDir, 'settings.local.json')
    );
    if (addedSettings) console.log('  + .claude/settings.local.json');
    else console.log('  ~ .claude/settings.local.json (preserved existing local settings)');

    // Root docs
    const addedClaude = copyIfAbsent(path.join(templateDir, 'CLAUDE.md'), path.join(targetDir, 'CLAUDE.md'));
    if (addedClaude) console.log('  + CLAUDE.md');
    else console.log('  ~ CLAUDE.md (skipped, already exists)');

    const addedAgents = copyIfAbsent(path.join(templateDir, 'AGENTS.md'), path.join(targetDir, 'AGENTS.md'));
    if (addedAgents) {
      filterAgentsMd(path.join(targetDir, 'AGENTS.md'), effectiveSkillAllowlist, effectiveAgentAllowlist);
      if (!isFull && effectiveMode !== 'full') {
        fs.appendFileSync(path.join(targetDir, 'AGENTS.md'), lightModeNote, 'utf8');
      }
      console.log('  + AGENTS.md');
    } else {
      console.log('  ~ AGENTS.md (skipped, already exists)');
    }

    // POMs
    if (!fs.existsSync(path.join(targetDir, 'pom.xml'))) {
      fs.copyFileSync(path.join(templateDir, 'pom.xml'), path.join(targetDir, 'pom.xml'));
      fs.mkdirSync(path.join(targetDir, 'common'), { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'service'), { recursive: true });
      fs.copyFileSync(path.join(templateDir, 'common', 'pom.xml'), path.join(targetDir, 'common', 'pom.xml'));
      fs.copyFileSync(path.join(templateDir, 'service', 'pom.xml'), path.join(targetDir, 'service', 'pom.xml'));
      substituteProjectName(path.join(targetDir, 'pom.xml'), projectName);
      substituteProjectName(path.join(targetDir, 'common', 'pom.xml'), projectName);
      substituteProjectName(path.join(targetDir, 'service', 'pom.xml'), projectName);
      console.log('  + pom.xml');
      console.log('  + common/pom.xml');
      console.log('  + service/pom.xml');
    } else {
      console.log('  ~ pom.xml (skipped, already exists)');
    }

    console.log('\nDone! Start Claude Code:');
    console.log('  claude .');
    if (!isFull && previousMode !== 'full') {
      console.log(`\nTip: use --full to include all specialist skills (Kafka, Redis, Keycloak, etc.)`);
    }
  } else {
    console.log(`Creating project "${projectName}" (${mode} mode)...`);

    // Create target directory
    fs.mkdirSync(targetDir, { recursive: true });

    // Copy root files
    for (const rootFile of manifest.always_include.root_files) {
      const src = path.join(templateDir, rootFile);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(targetDir, rootFile));
      }
    }

    // Copy Maven modules
    for (const moduleDir of ['common', 'service']) {
      const src = path.join(templateDir, moduleDir);
      if (fs.existsSync(src)) {
        copyDir(src, path.join(targetDir, moduleDir));
      }
    }

    // Copy .claude structure
    const targetClaudeDir = path.join(targetDir, '.claude');
    const templateClaudeDir = path.join(templateDir, '.claude');
    fs.mkdirSync(targetClaudeDir, { recursive: true });

    // Settings
    fs.copyFileSync(
      path.join(templateClaudeDir, 'settings.local.json'),
      path.join(targetClaudeDir, 'settings.local.json')
    );

    // Commands — always all
    copyDir(
      path.join(templateClaudeDir, 'commands'),
      path.join(targetClaudeDir, 'commands')
    );

    // Agents — filtered (files, not directories)
    copyFilesFiltered(
      path.join(templateClaudeDir, 'agents'),
      path.join(targetClaudeDir, 'agents'),
      agentAllowlist
    );

    // Skills — filtered (directories)
    copyDirFiltered(
      path.join(templateClaudeDir, 'skills'),
      path.join(targetClaudeDir, 'skills'),
      skillAllowlist
    );

    // Substitute project name
    substituteProjectNameInTree(targetDir, projectName);

    // Filter AGENTS.md to match installed skills/agents
    filterAgentsMd(path.join(targetDir, 'AGENTS.md'), skillAllowlist, agentAllowlist);
    if (!isFull) {
      fs.appendFileSync(path.join(targetDir, 'AGENTS.md'), lightModeNote, 'utf8');
    }

    // Write managed manifest
    const managedFiles = [
      ...listFilesFilteredAgents(path.join(templateClaudeDir, 'agents'), agentAllowlist)
        .map(file => path.join('agents', file)),
      ...listFilesRecursive(path.join(templateClaudeDir, 'commands'))
        .map(file => path.join('commands', file)),
      ...listFilesFilteredSkills(path.join(templateClaudeDir, 'skills'), skillAllowlist)
        .map(file => path.join('skills', file))
    ].sort();

    writeManagedManifest(
      path.join(targetClaudeDir, managedManifestName),
      mode,
      managedFiles
    );

    console.log(`\nSuccess! Project created in ./${projectName}/`);
    console.log(`Installed: ${skillAllowlist.length} skills, ${agentAllowlist.length} agents, 8 commands`);
    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    console.log('  claude .');
    if (!isFull) {
      console.log(`\nTip: use --full to include all specialist skills (Kafka, Redis, Keycloak, etc.)`);
    }
  }
} catch (err) {
  console.error('Error during scaffolding:', err.message);
  if (!isExisting && fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  process.exit(1);
}
