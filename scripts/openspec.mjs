import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const generatedPatterns = [
  '.opencode/skills/openspec-*/**/SKILL.md',
  '.opencode/commands/opsx-*.md'
];
const generatedFiles = (directory) => globSync(generatedPatterns, { cwd: directory }).sort();

export function checkGenerated(expected, actual) {
  const paths = new Set([...generatedFiles(expected), ...generatedFiles(actual)]);
  const differences = [...paths].filter((path) => {
    const wanted = join(expected, path);
    const installed = join(actual, path);
    return (
      !existsSync(wanted) ||
      !existsSync(installed) ||
      !readFileSync(wanted).equals(readFileSync(installed))
    );
  });
  if (differences.length)
    throw new Error(
      `OpenSpec generation drift:\n${differences.join('\n')}\nRun pnpm openspec:generate.`
    );
}

export function generateOpenSpec(destination) {
  const temp = mkdtempSync(join(tmpdir(), 'shelkovo-openspec-'));
  try {
    const configHome = join(temp, 'config');
    mkdirSync(join(configHome, 'openspec'), { recursive: true });
    writeFileSync(
      join(configHome, 'openspec/config.json'),
      JSON.stringify({
        profile: 'custom',
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'verify'],
        delivery: 'both'
      })
    );
    const run = (args) =>
      execFileSync('pnpm', ['exec', 'openspec', ...args, destination], {
        cwd: root,
        env: {
          ...process.env,
          XDG_CONFIG_HOME: configHome,
          XDG_DATA_HOME: join(temp, 'data'),
          OPENSPEC_TELEMETRY: '0'
        },
        stdio: 'pipe'
      });
    run([
      'init',
      '--tools',
      'opencode',
      '--profile',
      'custom',
      '--language',
      'Russian',
      '--no-animation'
    ]);
    run(['update', '--force']);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (!['generate', 'check'].includes(mode))
    throw new Error('Use: node scripts/openspec.mjs generate|check');
  const temp = mkdtempSync(join(tmpdir(), 'shelkovo-generated-'));
  try {
    generateOpenSpec(temp);
    if (mode === 'generate') {
      for (const path of generatedFiles(root)) rmSync(join(root, path));
      for (const path of generatedFiles(temp)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        cpSync(join(temp, path), join(root, path));
      }
    }
    checkGenerated(temp, root);
    console.log(
      `OpenSpec ${mode}: ${generatedFiles(temp).length} files match the pinned generator.`
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
