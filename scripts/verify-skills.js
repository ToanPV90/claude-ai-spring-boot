#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = process.cwd();
const rootSkillsDir = path.join(rootDir, '.claude', 'skills');
const templateSkillsDir = path.join(rootDir, 'template', '.claude', 'skills');

function listFiles(dir, base = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath, base);
    }
    return [path.relative(base, fullPath)];
  });
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function validateSkill(relativePath, baseDir, errors, warnings) {
  if (!relativePath.endsWith('SKILL.md')) {
    return;
  }

  const filePath = path.join(baseDir, relativePath);
  const content = readFile(filePath);
  const lines = content.split('\n').length;

  const requiredSnippets = [
    'name:',
    'description:',
    'license:',
    'metadata:',
    'author:',
    'version:',
    'domain:',
    'triggers:',
    'role:',
    'scope:',
    'output-format:',
    'related-skills:'
  ];

  for (const snippet of requiredSnippets) {
    if (!content.includes(snippet)) {
      errors.push(`${relativePath}: missing required frontmatter field '${snippet}'`);
    }
  }

  if (!/description:[^\n]*Use when/i.test(content)) {
    warnings.push(`${relativePath}: description should contain an explicit 'Use when ...' trigger phrase`);
  }

  if (!/\n\s+\-\s+/.test(content.split('triggers:')[1] || '')) {
    warnings.push(`${relativePath}: metadata.triggers should use a YAML list`);
  }

  if (lines > 500) {
    warnings.push(`${relativePath}: ${lines} lines exceeds the 500-line SKILL.md ceiling; split into references/`);
  }
}

function main() {
  const errors = [];
  const warnings = [];
  const rootFiles = listFiles(rootSkillsDir).sort();
  const templateFiles = listFiles(templateSkillsDir).sort();

  const rootSet = new Set(rootFiles);
  const templateSet = new Set(templateFiles);

  for (const file of rootFiles) {
    if (!templateSet.has(file)) {
      errors.push(`Missing from template mirror: ${file}`);
    }
  }

  for (const file of templateFiles) {
    if (!rootSet.has(file)) {
      errors.push(`Missing from root mirror: ${file}`);
    }
  }

  for (const file of rootFiles) {
    if (!templateSet.has(file)) {
      continue;
    }

    const rootContent = readFile(path.join(rootSkillsDir, file));
    const templateContent = readFile(path.join(templateSkillsDir, file));

    if (rootContent !== templateContent) {
      errors.push(`Mirror drift: ${file}`);
    }

    validateSkill(file, rootSkillsDir, errors, warnings);
  }

  if (warnings.length > 0) {
    console.warn('Skill verification warnings:\n');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
    console.warn('');
  }

  if (errors.length > 0) {
    console.error('Skill verification failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Skill verification passed for ${rootFiles.length} mirrored files.`);
}

main();
