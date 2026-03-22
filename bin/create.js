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

function copyIfAbsent(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function substituteProjectName(filePath, name) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace('<artifactId>__PROJECT_NAME__</artifactId>', `<artifactId>${name}</artifactId>`);
  fs.writeFileSync(filePath, updated, 'utf8');
}

const templateDir = path.join(__dirname, '..', 'template');

try {
  if (isExisting) {
    // Existing project: inject .claude/ config, skip files that already exist
    console.log(`Injecting Claude AI config into "${projectName}"...`);

    copyDir(path.join(templateDir, '.claude'), path.join(targetDir, '.claude'));
    console.log('  + .claude/ (agents + skills)');

    const addedClaude = copyIfAbsent(path.join(templateDir, 'CLAUDE.md'), path.join(targetDir, 'CLAUDE.md'));
    if (addedClaude) console.log('  + CLAUDE.md');
    else console.log('  ~ CLAUDE.md (skipped, already exists)');

    const addedAgents = copyIfAbsent(path.join(templateDir, 'AGENTS.md'), path.join(targetDir, 'AGENTS.md'));
    if (addedAgents) console.log('  + AGENTS.md');
    else console.log('  ~ AGENTS.md (skipped, already exists)');

    if (!fs.existsSync(path.join(targetDir, 'pom.xml'))) {
      fs.copyFileSync(path.join(templateDir, 'pom.xml'), path.join(targetDir, 'pom.xml'));
      substituteProjectName(path.join(targetDir, 'pom.xml'), projectName);
      console.log('  + pom.xml');
    } else {
      console.log('  ~ pom.xml (skipped, already exists)');
    }

    console.log('\nDone! Start Claude Code:');
    console.log('  claude .');
  } else {
    // New project: create directory and copy everything
    console.log(`Creating project "${projectName}"...`);

    copyDir(templateDir, targetDir);
    substituteProjectName(path.join(targetDir, 'pom.xml'), projectName);

    console.log(`\nSuccess! Project created in ./${projectName}/`);
    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    console.log('  claude .');
  }
} catch (err) {
  console.error('Error during scaffolding:', err.message);
  // Only clean up if we created the directory (new project mode)
  if (!isExisting && fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  process.exit(1);
}
