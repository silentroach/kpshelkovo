import { describe, expect, it } from 'vitest';

import {
  applySitemapMetadata,
  buildSitemapMetadataIndex,
  shouldIncludeSitemapPage
} from '../sitemap';

describe('event sitemap routes', () => {
  it.each(['/events/', '/events/2026/09/', '/events/2026/09/19/'])(
    'includes canonical %s without manufacturing lastmod',
    (path) => {
      const url = `https://kpshelkovo.online${path}`;
      const metadata = buildSitemapMetadataIndex(
        {
          newsArticles: [],
          statusIncidents: [],
          settlements: [],
          meetings: [],
          kbPages: [],
          contacts: []
        },
        Date.parse('2026-09-16T00:00:00Z')
      );

      expect(shouldIncludeSitemapPage(url)).toBe(true);
      expect(applySitemapMetadata({ url }, metadata)).toEqual({ url });
    }
  );

  it.each([
    '/events/2026/09/list/',
    '/events/2026/09/list/index.html',
    '/events/index.md',
    '/events/2026/09/19/index.md',
    '/events/events.json',
    '/events/calendar/exhibition.ics'
  ])('excludes alternative or non-HTML route %s', (path) => {
    expect(shouldIncludeSitemapPage(path)).toBe(false);
  });
});
