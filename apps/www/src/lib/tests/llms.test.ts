import { md } from '@shelkovo/markdown';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { serializeMarkdownNodes } from '../markdown/llms-document';
import { llmsDocumentSchema } from '../markdown/tests/llms-contract';

const generators = {
  root: () => import('../llms'),
  news: () => import('../news/llms'),
  status: () => import('../status/llms'),
  people: () => import('../people/llms'),
  reglament: () => import('../reglament/llms'),
  compare: () => import('../../compare/lib/llms')
};

beforeAll(() => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
});

describe('published llms guides', () => {
  it.each(Object.entries(generators))(
    '%s emits named public links in the v2 structure',
    async (_, load) => {
      const { build } = await load();
      const document = build();
      expect(llmsDocumentSchema.safeParse(document).error).toBeUndefined();
      expect(document).not.toContain('llms-full.txt');
    }
  );

  it('covers every content section through its guide or Markdown entry', async () => {
    const { publicSurfaceRegistry } = await import('../public-surface');
    const links = llmsDocumentSchema.parse((await generators.root()).build());
    for (const slice of publicSurfaceRegistry.slices.filter((item) => item.owner.id !== 'root')) {
      const entry =
        slice.surfaces.find((item) => item.discoveryRoles.includes('llms')) ??
        slice.surfaces.find((item) => item.id === `${slice.owner.id}:index-markdown`);
      expect(entry?.path, slice.owner.id).toBeDefined();
      expect(links).toContain(`https://example.com${entry?.path}`);
    }
  });

  it('removes full guides from the registry and every API catalog', async () => {
    const { publicSurfaceRegistry } = await import('../public-surface');
    const catalogs = await Promise.all([
      import('../discovery'),
      import('../news/discovery'),
      import('../status/discovery'),
      import('../people/discovery'),
      import('../reglament/discovery'),
      import('../../compare/lib/discovery')
    ]);
    const currentSurfaces = z.string().refine((value) => !value.includes('llms-full'));
    currentSurfaces.parse(JSON.stringify(publicSurfaceRegistry.surfaces));
    for (const { catalog } of catalogs)
      currentSurfaces.parse(JSON.stringify(catalog('https://example.com')));
  });

  it.each(['news', 'status', 'people', 'reglament', 'compare'] as const)(
    '%s independently links data contracts and reading instructions',
    async (owner) => {
      const links = llmsDocumentSchema.parse((await generators[owner]()).build());
      expect(links.some((url) => url.endsWith('/.well-known/api-catalog'))).toBe(true);
      expect(links.some((url) => url.endsWith('/SKILL.md'))).toBe(true);
      expect(links.some((url) => url.includes('/data/') && url.endsWith('.json'))).toBe(true);
    }
  );

  it('keeps Compare discovery independent of the Astro base', async () => {
    Object.assign(import.meta.env, { BASE_URL: '/astro-base/' });
    const links = llmsDocumentSchema.parse((await generators.compare()).build());
    expect(links).toContain('https://example.com/815/compare/.well-known/api-catalog');
    expect(links).toContain('https://example.com/815/compare/data/settlements.json');
    Object.assign(import.meta.env, { BASE_URL: '/' });
  });
});

describe('llms serialization regression guard', () => {
  const document =
    '# Guide\n\n> Summary\n\n## Read\n\n- [Archive](https://example.com/archive/index.md): all entries.\n';
  it.each(['<https://example.com/data.json>', 'https://example.com/data.json'])(
    'rejects an overlooked autolink: %s',
    (link) => {
      expect(llmsDocumentSchema.safeParse(`${document}- ${link}\n`).success).toBe(false);
    }
  );
  it('rejects a link node that serializes its URL label as an autolink', () => {
    const item = serializeMarkdownNodes([
      md.list([
        md.listItem([md.paragraph([md.link('https://example.com', 'https://example.com')])])
      ])
    ]);
    expect(llmsDocumentSchema.safeParse(`${document}${item}`).success).toBe(false);
  });
  it('ignores route and link examples inside code', () => {
    expect(
      llmsDocumentSchema.safeParse(
        document.replace(
          '> Summary',
          '> Summary\n\n`https://example.com/[slug]`\n\n```md\n<https://example.com/example>\n```'
        )
      ).success
    ).toBe(true);
  });
});
