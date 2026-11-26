import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const generatedSkillNames = [
  'openspec-apply-change',
  'openspec-archive-change',
  'openspec-explore',
  'openspec-propose',
  'openspec-sync-specs',
  'openspec-update-change'
];

export function verifyGeneratedSkills(directory) {
  for (const name of generatedSkillNames) {
    if (!existsSync(join(directory, name, 'SKILL.md')))
      throw new Error(`Missing generated skill: ${name}`);
  }
  for (const name of readdirSync(directory)) {
    if (name.startsWith('openspec-') && !generatedSkillNames.includes(name))
      throw new Error(`Unexpected OpenSpec skill: ${name}`);
  }
  if (readFileSync(join(directory, '.openspec-target'), 'utf8').trim() !== 'agents')
    throw new Error('Unexpected OpenSpec target');
}

export function generateOpenSpec(destination) {
  const temp = mkdtempSync(join(tmpdir(), 'shelkovo-openspec-'));
  try {
    execFileSync(
      'pnpm',
      [
        'exec',
        'openspec',
        'init',
        '--scope',
        'project',
        '--tools',
        'agents',
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
        stdio: 'inherit'
      }
    );
    verifyGeneratedSkills(join(destination, '.agents/skills'));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateOpenSpec(root);
}
