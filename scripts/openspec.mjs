import { execFileSync } from 'node:child_process';
import { cpSync, globSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const generatedPatterns = [
  '.opencode/skills/openspec-*/**/SKILL.md',
  '.opencode/commands/opsx-*.md'
];
const generatedFiles = (directory) => globSync(generatedPatterns, { cwd: directory }).sort();

export function generateOpenSpec(destination) {
  const temp = mkdtempSync(join(tmpdir(), 'shelkovo-openspec-'));
  try {
    execFileSync(
      'pnpm',
      [
        'exec',
        'openspec',
        'init',
        '--tools',
        'opencode',
        '--profile',
        'core',
        '--no-animation',
        destination
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          XDG_CONFIG_HOME: join(temp, 'config'),
          XDG_DATA_HOME: join(temp, 'data'),
          OPENSPEC_TELEMETRY: '0'
        },
        stdio: 'pipe'
      }
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const temp = mkdtempSync(join(tmpdir(), 'shelkovo-generated-'));
  try {
    generateOpenSpec(temp);
    for (const path of generatedFiles(root)) rmSync(join(root, path));
    for (const path of generatedFiles(temp)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      cpSync(join(temp, path), join(root, path));
    }
    console.log(
      `OpenSpec generate: ${generatedFiles(temp).length} files from the pinned generator.`
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
