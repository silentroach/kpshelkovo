import { describe, expect, it } from 'vitest';
import { buildExplorerUrl, readExplorerQuery, telegram, withBase } from './url';

describe('withBase', () => {
  it('passes through external and special URLs', () => {
    expect(withBase('https://example.com')).toBe('https://example.com');
    expect(withBase('#map')).toBe('#map');
    expect(withBase('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(withBase('tel:+79990000000')).toBe('tel:+79990000000');
  });

  it('prepends base to relative paths', () => {
    expect(withBase('settlements/lesnoe/')).toBe(
      '/815/compare/settlements/lesnoe/',
    );
  });

  it('prepends base to absolute internal paths', () => {
    expect(withBase('/settlements/usadby/')).toBe(
      '/815/compare/settlements/usadby/',
    );
  });
});

describe('telegram', () => {
  it('builds URL from plain channel name', () => {
    expect(telegram('shelkovoecoclub')).toBe('https://t.me/shelkovoecoclub');
  });

  it('strips @ prefix and spaces', () => {
    expect(telegram('  @shelkovoecoclub  ')).toBe(
      'https://t.me/shelkovoecoclub',
    );
  });
});

describe('explorer query', () => {
  it('reads supported filters and falls back from unknown values', () => {
    expect(readExplorerQuery('?sort=tariff_asc&price=cheaper'))
      .toMatchInlineSnapshot(`
      {
        "priceFilter": "cheaper",
        "sortBy": "tariff_asc",
      }
    `);
    expect(readExplorerQuery('?sort=unknown&price=unknown'))
      .toMatchInlineSnapshot(`
      {
        "priceFilter": "all",
        "sortBy": "rating_desc",
      }
    `);
  });

  it('builds a shareable URL without discarding unrelated state', () => {
    expect(
      buildExplorerUrl('https://example.com/815/compare/?from=chat#results', {
        sortBy: 'tariff_asc',
        priceFilter: 'more_expensive',
      }),
    ).toBe(
      '/815/compare/?from=chat&sort=tariff_asc&price=more_expensive#results',
    );
  });

  it('removes default values from the URL', () => {
    expect(
      buildExplorerUrl(
        'https://example.com/815/compare/?sort=name&price=cheaper&from=chat#results',
        {
          sortBy: 'rating_desc',
          priceFilter: 'all',
        },
      ),
    ).toBe('/815/compare/?from=chat#results');
  });
});
