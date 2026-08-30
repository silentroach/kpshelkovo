import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { build, names } from './skills';

const skillsRoot = join(
  process.cwd(),
  'public',
  '815',
  'compare',
  '.well-known',
  'agent-skills',
);
const staleRootRoute = /(?:^|[\s`(])\/(?:data|rating|settlements)(?:\/|\[)/u;

describe('agent skills index', () => {
  it('publishes all declared skills with digests', async () => {
    const body = await build();

    expect(body.$schema).toBe(
      'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    );
    expect(body.skills.map((row) => row.name)).toEqual(Array.from(names));

    for (const row of body.skills) {
      expect(row.type).toBe('skill-md');
      expect(row.url).toBe(`./${row.name}/SKILL.md`);
      expect(row.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it('uses section-qualified compare routes in skill documents', async () => {
    for (const name of names) {
      const body = await readFile(join(skillsRoot, name, 'SKILL.md'), 'utf8');

      expect(body, name).not.toMatch(staleRootRoute);
    }
  });
});
