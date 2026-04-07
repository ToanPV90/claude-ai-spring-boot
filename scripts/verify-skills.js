#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = process.cwd();
const rootSkillsDir = path.join(rootDir, '.claude', 'skills');
const templateSkillsDir = path.join(rootDir, 'template', '.claude', 'skills');
const rootCommandsDir = path.join(rootDir, '.claude', 'commands');
const templateCommandsDir = path.join(rootDir, 'template', '.claude', 'commands');

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

  // Verify commands mirror
  let commandCount = 0;
  if (fs.existsSync(rootCommandsDir) && fs.existsSync(templateCommandsDir)) {
    const rootCmds = listFiles(rootCommandsDir).sort();
    const templateCmds = listFiles(templateCommandsDir).sort();
    const rootCmdSet = new Set(rootCmds);
    const templateCmdSet = new Set(templateCmds);

    for (const file of rootCmds) {
      if (!templateCmdSet.has(file)) {
        errors.push(`Command missing from template mirror: ${file}`);
      }
    }
    for (const file of templateCmds) {
      if (!rootCmdSet.has(file)) {
        errors.push(`Command missing from root mirror: ${file}`);
      }
    }
    for (const file of rootCmds) {
      if (!templateCmdSet.has(file)) continue;
      const rootContent = readFile(path.join(rootCommandsDir, file));
      const templateContent = readFile(path.join(templateCommandsDir, file));
      if (rootContent !== templateContent) {
        errors.push(`Command mirror drift: ${file}`);
      }
      if (!rootContent.includes('description:')) {
        warnings.push(`Command ${file}: missing 'description:' in frontmatter`);
      }
    }
    commandCount = rootCmds.length;
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

  const parts = [`${rootFiles.length} skill files`];
  if (commandCount > 0) parts.push(`${commandCount} command files`);
  console.log(`Skill verification passed for ${parts.join(' + ')}.`);
}

main();
