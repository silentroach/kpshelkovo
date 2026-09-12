import { beforeAll, describe, expect, it } from 'vitest';

import type { comparePublicSurfaceSlice as comparePublicSurfaceSliceType } from '@/compare/lib/public-surface';
import { formatApiCatalogLink } from '@/lib/api-catalog-response';
import type { PublicSurfaceSlice } from '@/lib/public-surface';
import type { expectSectionCatalogMatchesRegistry as expectSectionCatalogMatchesRegistryType } from '@/lib/public-surface/catalog-contract.test-helper';

import { EXPLORER, FEED, OPENAPI, SCHEMA, catalog, links, openapi, schema } from './discovery';

const root = 'https://example.com';
let comparePublicSurfaceSlice: typeof comparePublicSurfaceSliceType & PublicSurfaceSlice;
let expectSectionCatalogMatchesRegistry: typeof expectSectionCatalogMatchesRegistryType;

const objectAt = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    throw new Error('Schema ref must point to an object');
  }

  return value as Record<string, unknown>;
};

const collectLocalRefs = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectLocalRefs);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    key === '$ref' && typeof entry === 'string' && entry.startsWith('#/')
      ? [entry]
      : collectLocalRefs(entry)
  );
};

const resolveLocalRef = (document: unknown, ref: string): unknown =>
  ref
    .slice(2)
    .split('/')
    .reduce<unknown>((current, encoded) => {
      const key = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
      return objectAt(current)[key];
    }, document);

beforeAll(async () => {
  ({ comparePublicSurfaceSlice } = await import('@/compare/lib/public-surface'));
  ({ expectSectionCatalogMatchesRegistry } =
    await import('@/lib/public-surface/catalog-contract.test-helper'));
});

describe('schema', () => {
  it('describes the actual full settlements payload with distance', () => {
    const body = schema(root);
    const props = body.properties as Record<string, unknown>;
    const defs = body.$defs as Record<string, Record<string, unknown>>;
    const settlement = defs.settlement.properties as Record<string, unknown>;

    expect(body.$id).toBe(`${root}${SCHEMA}`);
    expect(Object.keys(props)).toEqual(['settlements', 'stats', 'comparisons']);
    expect(settlement).toHaveProperty('slug');
    expect(settlement).toHaveProperty('location');
    expect(settlement).toHaveProperty('tariff');
    expect(settlement).toHaveProperty('lots');
    expect(settlement).toHaveProperty('website');
    expect(settlement).toHaveProperty('telegram');
    expect(settlement).toHaveProperty('infrastructure');
    expect(settlement).toHaveProperty('distance');
    expect(settlement).toHaveProperty('rating');
  });

  it.each([
    ['standalone schema', schema(root)],
    ['OpenAPI document', openapi(root)]
  ])('resolves every local ref in the %s', (_name, document) => {
    const refs = collectLocalRefs(document);

    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(resolveLocalRef(document, ref), ref).toBeDefined();
    }
  });
});

describe('catalog', () => {
  it('keeps the section API catalog aligned with registry catalog surfaces', () => {
    expectSectionCatalogMatchesRegistry({
      catalog,
      catalogRoot: `${root}/815/compare`,
      siteRoot: root,
      slice: comparePublicSurfaceSlice
    });
  });

  it('links markdown, feeds, agent docs, schema and openapi from the site root', () => {
    const body = catalog(root);
    const [item] = body.linkset as Array<Record<string, unknown>>;
    const list = item.item as Array<Record<string, unknown>>;
    const desc = item['service-desc'] as Array<Record<string, unknown>>;

    expect(item.anchor).toBe(`${root}/`);
    expect(list.map((row) => row.href)).toEqual([
      `${root}/index.md`,
      `${root}/rating/index.md`,
      `${root}${FEED}`,
      `${root}${EXPLORER}`,
      `${root}/llms.txt`,
      `${root}/.well-known/agent-skills/index.json`
    ]);
    expect(desc.map((row) => row.href)).toEqual([`${root}${SCHEMA}`, `${root}${OPENAPI}`]);
  });
});

describe('links', () => {
  it('emits discovery link headers for the full settlements feed', () => {
    const body = links(root);

    expect(body).toBe(
      [
        '<https://example.com/schemas/settlements.schema.json>; rel="service-desc"; type="application/schema+json"',
        '<https://example.com/openapi/settlements.openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
        formatApiCatalogLink('https://example.com/.well-known/api-catalog')
      ].join(', ')
    );
  });
});
