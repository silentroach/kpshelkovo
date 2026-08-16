import { describe, expect, it } from 'vitest';

import { contactSitemapInput, kbPageSitemapInput } from './sitemap-data';

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
        'Работает с заборами.',
      ),
    ).toMatchInlineSnapshot(`
      {
        "category": "fence",
        "hasPage": true,
        "updatedIso": "2026-07-06",
        "url": "/sarafan/fence/ivan-petrov-fence/",
      }
    `);
  });

  it('marks blank-body contacts as list-only sitemap inputs', () => {
    expect(
      contactSitemapInput(
        'title: Сергей\ncategory: fence\nslug: sergey\nupdated_at: 2026-07-07',
        '',
      ),
    ).toMatchInlineSnapshot(`
      {
        "category": "fence",
        "hasPage": false,
        "updatedIso": "2026-07-07",
        "url": "/sarafan/fence/sergey/",
      }
    `);
  });
});
