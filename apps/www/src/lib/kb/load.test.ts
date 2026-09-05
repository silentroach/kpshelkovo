import { beforeAll, describe, expect, it } from 'vitest';

import type { KbPageEntry } from './load';
import type { KbPageFlag } from './types';

let buildKbPages: typeof import('./load').buildKbPages;
let createPersonMentionTarget: typeof import('@/lib/people/mentions').createPersonMentionTarget;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ createPersonMentionTarget } = await import('@/lib/people/mentions'));
  ({ buildKbPages } = await import('./load'));
});

const page = (input: {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  readonly flags?: readonly KbPageFlag[];
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

describe('buildKbPages', () => {
  it('maps an ordinary parent source and its child to stable public URLs', () => {
    const pages = buildKbPages([
      page({
        id: 'index',
        title: 'База знаний',
      }),
      page({
        id: 'services/internet',
        title: 'Интернет в поселке',
      }),
      page({
        id: 'services/internet/fiber',
        title: 'Оптоволокно',
      }),
    ]);

    expect(pages).toHaveLength(3);
    expect(pages[0]).toMatchObject({
      url: '/kb/',
      canonical: 'https://example.com/kb/',
      routeSlug: undefined,
      isSection: true,
    });
    const internetPage = pages[1];

    expect(internetPage).toMatchObject({
      url: '/kb/services/internet/',
      canonical: 'https://example.com/kb/services/internet/',
      routeSlug: 'services/internet',
      isSection: true,
    });
    expect(pages[2]?.isSection).toBe(false);
    expect(internetPage).not.toHaveProperty('id');
    expect(internetPage).not.toHaveProperty('sourceId');
    expect(internetPage).not.toHaveProperty('description');
    expect(internetPage).not.toHaveProperty('tags');
  });

  it('rejects entries that resolve to the same public URL', () => {
    expect(() =>
      buildKbPages([
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

  it('does not infer section role from an index source name', () => {
    const pages = buildKbPages([
      page({
        id: 'sos/index',
        title: 'Что делать, если…',
      }),
    ]);

    expect(pages[0]?.isSection).toBe(false);
  });

  it('rejects invalid URL segments', () => {
    expect(() =>
      buildKbPages([
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
    const pages = buildKbPages([
      page({
        id: 'services/internet/index',
        title: 'Интернет в поселке',
        body: '# Подключение\n\nТекст с **жирным** Markdown.\n',
      }),
    ]);

    expect(pages[0]?.body).toBe(
      '# Подключение\n\nТекст с **жирным** Markdown.',
    );
    expect(pages[0]?.body).not.toContain('<strong>');
  });

  it('defaults omitted flags to an empty page flag list', () => {
    const pages = buildKbPages([
      page({
        id: 'services/internet/index',
        title: 'Интернет в поселке',
      }),
    ]);

    expect(pages[0]?.flags).toEqual([]);
    expect(pages[0]?.robots).toBeUndefined();
  });

  it('maps the noindex flag to page robots metadata', () => {
    const pages = buildKbPages([
      page({
        id: 'court/01/documents',
        title: 'Документы по делу',
        flags: ['noindex'],
      }),
    ]);

    expect(pages[0]?.flags).toEqual(['noindex']);
    expect(pages[0]?.robots).toBe('noindex, follow');
  });

  it('does not map site-search exclusion to robots metadata', () => {
    const pages = buildKbPages([
      page({
        id: 'before-you-buy/how-to-choose-plot',
        title: 'Как выбрать участок',
        flags: ['exclude-from-site-search'],
      }),
    ]);

    expect(pages[0]?.flags).toEqual(['exclude-from-site-search']);
    expect(pages[0]?.robots).toBeUndefined();
  });

  it('normalizes body mentions through the shared registry', () => {
    const pages = buildKbPages(
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

    expect(pages[0]?.body).toBe(
      'Статус подтвердил [Кирилл Щемелинин](/people/kschemelinin/).',
    );
    expect(pages[0]?.mentions.map((item) => item.slug)).toEqual([
      'kschemelinin',
    ]);
  });

  it('fails clearly for unknown body mentions', () => {
    expect(() =>
      buildKbPages([
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
