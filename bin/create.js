#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const arg = process.argv[2];

// Determine mode: new project vs existing project
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

function writeManagedManifest(filePath, entries) {
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, files: entries }, null, 2) + '\n', 'utf8');
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

const templateDir = path.join(__dirname, '..', 'template');
const managedManifestName = '.create-claude-spring-boot-managed.json';

try {
  if (isExisting) {
    console.log(`Injecting Claude AI config into "${projectName}"...`);

    const targetClaudeDir = path.join(targetDir, '.claude');
    const templateClaudeDir = path.join(templateDir, '.claude');
    const manifestPath = path.join(targetClaudeDir, managedManifestName);
    fs.mkdirSync(targetClaudeDir, { recursive: true });

    const nextManagedFiles = [
      ...listFilesRecursive(path.join(templateClaudeDir, 'agents')).map(file => path.join('agents', file)),
      ...listFilesRecursive(path.join(templateClaudeDir, 'commands')).map(file => path.join('commands', file)),
      ...listFilesRecursive(path.join(templateClaudeDir, 'skills')).map(file => path.join('skills', file))
    ].sort();

    const previousManifest = loadManagedManifest(manifestPath);
    const staleManagedFiles = previousManifest?.files
      ? removeStaleManagedFiles(targetClaudeDir, previousManifest.files, nextManagedFiles)
      : [];

    syncDir(path.join(templateClaudeDir, 'agents'), path.join(targetClaudeDir, 'agents'));
    console.log('  ↻ .claude/agents/ (refreshed managed agents)');

    syncDir(path.join(templateClaudeDir, 'commands'), path.join(targetClaudeDir, 'commands'));
    console.log('  ↻ .claude/commands/ (refreshed managed commands)');

    syncDir(path.join(templateClaudeDir, 'skills'), path.join(targetClaudeDir, 'skills'));
    console.log('  ↻ .claude/skills/ (refreshed managed skills)');

    writeManagedManifest(manifestPath, nextManagedFiles);
    if (staleManagedFiles.length > 0) {
      console.log(`  - removed ${staleManagedFiles.length} stale managed file(s)`);
    } else if (!previousManifest) {
      console.log(`  + .claude/${managedManifestName} (started tracking managed files)`);
    }

    const addedSettings = copyIfAbsent(
      path.join(templateClaudeDir, 'settings.local.json'),
      path.join(targetClaudeDir, 'settings.local.json')
    );
    if (addedSettings) console.log('  + .claude/settings.local.json');
    else console.log('  ~ .claude/settings.local.json (preserved existing local settings)');

    const addedClaude = copyIfAbsent(path.join(templateDir, 'CLAUDE.md'), path.join(targetDir, 'CLAUDE.md'));
    if (addedClaude) console.log('  + CLAUDE.md');
    else console.log('  ~ CLAUDE.md (skipped, already exists)');

    const addedAgents = copyIfAbsent(path.join(templateDir, 'AGENTS.md'), path.join(targetDir, 'AGENTS.md'));
    if (addedAgents) console.log('  + AGENTS.md');
    else console.log('  ~ AGENTS.md (skipped, already exists)');

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
  } else {
    console.log(`Creating project "${projectName}"...`);

    copyDir(templateDir, targetDir);
    substituteProjectNameInTree(targetDir, projectName);
    writeManagedManifest(
      path.join(targetDir, '.claude', managedManifestName),
      [
        ...listFilesRecursive(path.join(templateDir, '.claude', 'agents')).map(file => path.join('agents', file)),
        ...listFilesRecursive(path.join(templateDir, '.claude', 'commands')).map(file => path.join('commands', file)),
        ...listFilesRecursive(path.join(templateDir, '.claude', 'skills')).map(file => path.join('skills', file))
      ].sort()
    );

    console.log(`\nSuccess! Project created in ./${projectName}/`);
    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    console.log('  claude .');
  }
} catch (err) {
  console.error('Error during scaffolding:', err.message);
  if (!isExisting && fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  process.exit(1);
}
