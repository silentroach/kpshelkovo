import { describe, expect, it } from 'vitest';

import {
  contactSitemapInput,
  discomfortEventSitemapInput,
  kbPageSitemapInput,
} from './sitemap-data';

describe('kbPageSitemapInput', () => {
  it('turns inline noindex flags into sitemap exclusion', () => {
    expect(
      kbPageSitemapInput(
        'court/01/documents',
        'title: Документы\nflags: [noindex]',
      ),
    ).toEqual({
      url: '/kb/court/01/documents/',
      excludeFromSitemap: true,
    });
  });

  it('turns block noindex flags into sitemap exclusion', () => {
    expect(
      kbPageSitemapInput(
        'court/01/documents',
        'title: Документы\nflags:\n  - noindex',
      ),
    ).toEqual({
      url: '/kb/court/01/documents/',
      excludeFromSitemap: true,
    });
  });

  it('reads noindex flags from regular YAML instead of regex-shaped text', () => {
    expect(
      kbPageSitemapInput(
        'court/01/documents',
        'title: Документы\nflags: # sitemap metadata\n  - noindex',
      ),
    ).toEqual({
      url: '/kb/court/01/documents/',
      excludeFromSitemap: true,
    });
  });

  it('keeps regular kb pages in the sitemap', () => {
    expect(kbPageSitemapInput('', 'title: База знаний')).toEqual({
      url: '/kb/',
      excludeFromSitemap: false,
    });
  });

  it('keeps site-search exclusions in the sitemap', () => {
    expect(
      kbPageSitemapInput(
        'before-you-buy/how-to-choose-plot',
        'title: Как выбрать участок\nflags: [exclude-from-site-search]',
      ),
    ).toEqual({
      url: '/kb/before-you-buy/how-to-choose-plot/',
      excludeFromSitemap: false,
    });
  });
});

describe('contactSitemapInput', () => {
  it('uses contact slug and updated_at for sitemap metadata', () => {
    expect(
      contactSitemapInput(
        'title: Иван Петров\ncategory: fence\nslug: ivan-petrov-fence\nupdated_at: 2026-07-06',
      ),
    ).toMatchInlineSnapshot(`
      {
        "category": "fence",
        "updatedIso": "2026-07-06",
        "url": "/sarafan/fence/ivan-petrov-fence/",
      }
    `);
  });
});

describe('discomfortEventSitemapInput', () => {
  it('uses the event date as sitemap metadata input', () => {
    expect(
      discomfortEventSitemapInput(
        'date: 2026-08-20\nupdated_at: 2026-08-22\ntitle: Гостевые пропуска',
      ),
    ).toEqual({ lastmod: '2026-08-22' });
  });

  it('rejects updated_at earlier than the event date', () => {
    expect(() =>
      discomfortEventSitemapInput(
        'date: 2026-08-20\nupdated_at: 2026-08-19\ntitle: Гостевые пропуска',
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: discomfort event frontmatter updated_at cannot be earlier than date]`,
    );
  });
});
