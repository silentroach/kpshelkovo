import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { build, names } from './skills';
import { statusCalendarAgentPatterns } from './status/routes';

describe('agent skills index', () => {
  it('publishes all declared skills with digests', async () => {
    const body = await build();

    expect(names).toContain('people-profiles');
    expect(body.$schema).toBe(
      'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    );
    expect(body.skills.map((row) => row.name)).toEqual(Array.from(names));
    expect(body.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'people-profiles',
          url: './people-profiles/SKILL.md',
        }),
      ]),
    );

    for (const row of body.skills) {
      expect(row.type).toBe('skill-md');
      expect(row.url).toBe(`./${row.name}/SKILL.md`);
      expect(row.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it('documents status calendar discovery without inventing a JSON feed', async () => {
    const skill = await readFile(
      new URL(
        '../../public/.well-known/agent-skills/status-feed/SKILL.md',
        import.meta.url,
      ),
      'utf8',
    );

    for (const route of Object.values(statusCalendarAgentPatterns())) {
      expect(skill).toContain(`\`${route}\``);
    }

    expect(skill).toContain('отдельного календарного JSON нет');
    expect(skill).not.toMatch(/\/status\/calendar(?:\/data)?\.json/u);
  });
});
