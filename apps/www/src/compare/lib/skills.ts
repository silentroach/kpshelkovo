import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type SkillType = 'skill-md';

export interface SkillEntry {
  name: string;
  type: SkillType;
  description: string;
  url: string;
  digest: string;
}

export interface SkillsIndex {
  $schema: string;
  skills: SkillEntry[];
}

export const names = [
  'explorer-data',
  'settlement-pages',
  'rating-method',
  'corrections-and-sources'
] as const;

const schema = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
const root = join(process.cwd(), 'public', '815', 'compare', '.well-known', 'agent-skills');

function pick(text: string, key: 'name' | 'description', id: string): string {
  const val = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();

  if (!val) {
    throw new Error(`Missing ${key} in ${id}/SKILL.md`);
  }

  return val.replace(/^['"]|['"]$/g, '');
}

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

function digest(body: Buffer): string {
  return `sha256:${createHash('sha256').update(body).digest('hex')}`;
}

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
      };
    })
  );

  return {
    $schema: schema,
    skills
  };
}
