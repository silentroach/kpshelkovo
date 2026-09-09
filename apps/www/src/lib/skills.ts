import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { withBase } from './site';

export type SkillType = 'skill-md';

export interface SkillEntry {
  readonly name: string;
  readonly type: SkillType;
  readonly description: string;
  readonly url: string;
  readonly digest: string;
}

export interface SkillsIndex {
  readonly $schema: string;
  readonly skills: readonly SkillEntry[];
}

export const names = ['site-sections', 'news-feed', 'status-feed', 'people-profiles'] as const;

const schema = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
const root = join(process.cwd(), 'public', '.well-known', 'agent-skills');
const SKILLS = '/.well-known/agent-skills/index.json';

const pick = (text: string, key: 'name' | 'description', id: string): string => {
  const value = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();

  if (!value) {
    throw new Error(`Missing ${key} in ${id}/SKILL.md`);
  }

  return value.replace(/^['"]|['"]$/g, '');
};

function meta(text: string, id: string) {
  const body = text.match(/^---\r?\n([\s\S]+?)\r?\n---(?:\r?\n|$)/)?.[1];

  if (!body) {
    throw new Error(`Missing frontmatter in ${id}/SKILL.md`);
  }

  const name = pick(body, 'name', id);
  const description = pick(body, 'description', id);

  if (name !== id) {
    throw new Error(`Frontmatter name mismatch in ${id}/SKILL.md`);
  }

  return { name, description };
}

const digest = (body: Buffer): string =>
  `sha256:${createHash('sha256').update(body).digest('hex')}`;

export const siteSkillsUrl = (): string => withBase(SKILLS);

export const siteSkillsPath = (): string => SKILLS;

export async function build(): Promise<SkillsIndex> {
  const skills = await Promise.all(
    names.map(async (id) => {
      const file = join(root, id, 'SKILL.md');
      const body = await readFile(file);
      const text = body.toString('utf-8');
      const metaRow = meta(text, id);

      return {
        name: metaRow.name,
        type: 'skill-md' as const,
        description: metaRow.description,
        url: `./${id}/SKILL.md`,
        digest: digest(body)
      } satisfies SkillEntry;
    })
  );

  return {
    $schema: schema,
    skills
  };
}
