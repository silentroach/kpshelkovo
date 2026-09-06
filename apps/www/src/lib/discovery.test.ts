import { beforeAll, describe, expect, it, vi } from 'vitest';

import { formatApiCatalogLink } from './api-catalog-response';
import { publicSurfaceRegistry, surfaceHref } from './public-surface';

vi.mock('./llms', () => ({
  siteApiCatalogPath: () => '/.well-known/api-catalog',
  siteApiCatalogUrl: () => '/sub/.well-known/api-catalog',
  siteLlmsFullPath: () => '/llms-full.txt',
  siteLlmsFullUrl: () => '/sub/llms-full.txt',
  siteLlmsPath: () => '/llms.txt',
  siteLlmsUrl: () => '/sub/llms.txt',
  siteMarkdownPath: () => '/index.md',
  siteMarkdownUrl: () => '/sub/index.md',
}));

vi.mock('./skills', () => ({
  siteSkillsPath: () => '/.well-known/agent-skills/index.json',
  siteSkillsUrl: () => '/sub/.well-known/agent-skills/index.json',
}));

let catalog: typeof import('./discovery').catalog;
let self: typeof import('./discovery').self;

beforeAll(async () => {
  vi.resetModules();
  ({ catalog, self } = await import('./discovery'));
});

describe('root api catalog', () => {
  it('builds the root linkset from registered catalog surfaces', () => {
    const root = 'https://example.com/sub';
    const payload = catalog(root) as {
      readonly linkset: readonly {
        readonly anchor?: string;
        readonly item?: readonly { readonly href: string }[];
        readonly 'service-desc'?: readonly { readonly href: string }[];
      }[];
    };

    const catalogSlices = publicSurfaceRegistry.slices.filter((slice) =>
      slice.surfaces.some((surface) => surface.catalogRole),
    );
    const expected = catalogSlices.map((slice) => {
      const anchor = slice.surfaces.find(
        (surface) => surface.catalogRole === 'anchor',
      );
      const item = slice.surfaces
        .filter((surface) => surface.catalogRole === 'item')
        .map((surface) =>
          expect.objectContaining({ href: surfaceHref(root, surface) }),
        );
      const serviceDesc = slice.surfaces
        .filter((surface) => surface.catalogRole === 'service-desc')
        .map((surface) =>
          expect.objectContaining({ href: surfaceHref(root, surface) }),
        );

      return expect.objectContaining({
        anchor: anchor && surfaceHref(root, anchor),
        ...(item.length ? { item: expect.arrayContaining(item) } : {}),
        ...(serviceDesc.length
          ? { 'service-desc': expect.arrayContaining(serviceDesc) }
          : {}),
      });
    });

    expect(payload.linkset).toEqual(expected);
    for (const entry of payload.linkset) {
      expect(
        Boolean(
          entry.anchor || entry.item?.length || entry['service-desc']?.length,
        ),
      ).toBe(true);
    }
    for (const slice of catalogSlices) {
      const anchor = slice.surfaces.find(
        (surface) => surface.catalogRole === 'anchor',
      );
      const anchorHref = anchor && surfaceHref(root, anchor);
      const entry = payload.linkset.find(
        (entry) => entry.anchor === anchorHref,
      );
      const itemHrefs = entry?.item?.map((item) => item.href) ?? [];
      const expectedItemHrefs = slice.surfaces
        .filter((surface) => surface.catalogRole === 'item')
        .map((surface) => surfaceHref(root, surface));

      expect(itemHrefs).toEqual(expectedItemHrefs);
      expect(itemHrefs).not.toContain(anchorHref);
    }
    expect(
      payload.linkset.some((entry) =>
        entry.item?.some(
          (item) =>
            item.href ===
            'https://example.com/sub/815/compare/.well-known/agent-skills/index.json',
        ),
      ),
    ).toBe(true);
    expect(JSON.stringify(payload)).not.toContain('/meetings/:slug/');
  });

  it('keeps base-prefixed site links valid in non-root deployments', () => {
    const root = 'https://example.com/sub';
    const payload = catalog(root) as {
      readonly linkset: readonly {
        readonly anchor?: string;
        readonly item?: readonly { readonly href: string }[];
      }[];
    };
    const items = payload.linkset[0]?.item ?? [];

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: 'https://example.com/sub/index.md' }),
        expect.objectContaining({ href: 'https://example.com/sub/llms.txt' }),
        expect.objectContaining({
          href: 'https://example.com/sub/llms-full.txt',
        }),
        expect.objectContaining({
          href: 'https://example.com/sub/.well-known/agent-skills/index.json',
        }),
      ]),
    );

    const peopleEntry = payload.linkset.find(
      (entry) => entry.anchor === 'https://example.com/sub/people/index.md',
    );
    const reglamentEntry = payload.linkset.find(
      (entry) => entry.anchor === 'https://example.com/sub/815/regulation/',
    );

    expect(peopleEntry?.item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: 'https://example.com/sub/people/data/people.json',
        }),
        expect.objectContaining({
          href: 'https://example.com/sub/people/llms.txt',
        }),
      ]),
    );
    expect(peopleEntry?.item).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: 'https://example.com/sub/people/index.md',
        }),
      ]),
    );
    expect(payload.linkset).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          anchor: 'https://example.com/sub/meetings/index.md',
        }),
      ]),
    );
    expect(reglamentEntry?.item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: 'https://example.com/sub/815/regulation/data/estimate-2026.json',
        }),
        expect.objectContaining({
          href: 'https://example.com/sub/815/regulation/llms.txt',
        }),
      ]),
    );

    expect(self(root)).toBe(
      formatApiCatalogLink('https://example.com/sub/.well-known/api-catalog'),
    );
  });
});
