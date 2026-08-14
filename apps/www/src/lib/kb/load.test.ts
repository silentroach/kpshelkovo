import { beforeAll, describe, expect, it } from 'vitest';

import type { KbPageEntry } from './load';

let buildKbDataset: typeof import('./load').buildKbDataset;
let createPersonMentionTarget: typeof import('@/lib/people/mentions').createPersonMentionTarget;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ createPersonMentionTarget } = await import('@/lib/people/mentions'));
  ({ buildKbDataset } = await import('./load'));
});

const page = (input: {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  readonly flags?: readonly ['noindex'];
}): KbPageEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: input.flags
    ? {
        title: input.title,
        flags: input.flags,
      }
    : {
        title: input.title,
      },
});

describe('buildKbDataset', () => {
  it('maps index.md and nested markdown entries to public URLs', () => {
    const data = buildKbDataset([
      page({
        id: 'index',
        title: 'База знаний',
      }),
      page({
        id: 'services/internet/index',
        title: 'Интернет в поселке',
      }),
      page({
        id: 'services/internet/fiber',
        title: 'Оптоволокно',
      }),
    ]);

    expect(data.pages).toHaveLength(3);
    expect(data.byId.get('index')).toMatchObject({
      id: 'index',
      sourceId: 'index',
      url: '/kb/',
      canonical: 'https://example.com/kb/',
      routeSlug: undefined,
    });
    const internetPage = data.byId.get('services/internet/index');

    expect(internetPage).toMatchObject({
      id: 'services/internet/index',
      sourceId: 'services/internet/index',
      url: '/kb/services/internet/',
      canonical: 'https://example.com/kb/services/internet/',
      routeSlug: 'services/internet',
    });
    expect(internetPage).not.toHaveProperty('description');
    expect(internetPage).not.toHaveProperty('tags');
  });

  it('rejects entries that resolve to the same public URL', () => {
    expect(() =>
      buildKbDataset([
        page({
          id: 'foo',
          title: 'Foo',
        }),
        page({
          id: 'foo/index',
          title: 'Foo index',
        }),
      ]),
    ).toThrow(
      'kb page "foo/index" conflicts with "foo" for public URL "/kb/foo/"',
    );
  });

  it('rejects a non-index source whose public route has descendants', () => {
    expect(() =>
      buildKbDataset([
        page({
          id: 'communication',
          title: 'Связь и сообщества',
        }),
        page({
          id: 'communication/meshtastic',
          title: 'Meshtastic',
        }),
      ]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: kb page source id "communication" has descendant public route "/kb/communication/meshtastic/"; non-root hub source ids must end with "/index" (expected "communication/index")]`,
    );
  });

  it('rejects invalid URL segments', () => {
    expect(() =>
      buildKbDataset([
        page({
          id: 'services/Internet',
          title: 'Интернет в поселке',
        }),
      ]),
    ).toThrow(
      'kb page source id "services/Internet" has invalid segment "Internet"',
    );
  });

  it('stores preprocessed Markdown body without rendering HTML', () => {
    const data = buildKbDataset([
      page({
        id: 'services/internet/index',
        title: 'Интернет в поселке',
        body: '# Подключение\n\nТекст с **жирным** Markdown.\n',
      }),
    ]);

    expect(data.pages[0]?.body).toBe(
      '# Подключение\n\nТекст с **жирным** Markdown.',
    );
    expect(data.pages[0]?.body).not.toContain('<strong>');
  });

  it('defaults omitted flags to an empty page flag list', () => {
    const data = buildKbDataset([
      page({
        id: 'services/internet/index',
        title: 'Интернет в поселке',
      }),
    ]);

    expect(data.pages[0]?.flags).toEqual([]);
    expect(data.pages[0]?.robots).toBeUndefined();
  });

  it('maps the noindex flag to page robots metadata', () => {
    const data = buildKbDataset([
      page({
        id: 'court/01/documents',
        title: 'Документы по делу',
        flags: ['noindex'],
      }),
    ]);

    expect(data.pages[0]?.flags).toEqual(['noindex']);
    expect(data.pages[0]?.robots).toBe('noindex, follow');
  });

  it('normalizes body mentions through the shared registry', () => {
    const data = buildKbDataset(
      [
        page({
          id: 'services/internet/index',
          title: 'Интернет в поселке',
          body: 'Статус подтвердил @kschemelinin.',
        }),
      ],
      {
        mentionRegistry: new Map([
          [
            'kschemelinin',
            createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
          ],
        ]),
      },
    );

    expect(data.pages[0]?.body).toBe(
      'Статус подтвердил [Кирилл Щемелинин](/people/kschemelinin/).',
    );
    expect(data.pages[0]?.mentions.map((item) => item.slug)).toEqual([
      'kschemelinin',
    ]);
  });

  it('fails clearly for unknown body mentions', () => {
    expect(() =>
      buildKbDataset([
        page({
          id: 'services/internet/index',
          title: 'Интернет в поселке',
          body: 'Статус подтвердил @unknown.',
        }),
      ]),
    ).toThrow(
      'kb page "services/internet/index" body contains unknown entity mention "@unknown"',
    );
  });
});
