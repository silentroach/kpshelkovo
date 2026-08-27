import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  mapRawStatusArea,
  mapRawStatusKind,
  mapRawStatusService,
} from './mapper';
describe('status raw value mappers', () => {
  it('maps raw status string values explicitly', () => {
    expect(mapRawStatusService('electricity')).toBe('electricity');
    expect(mapRawStatusKind('incident')).toBe('incident');
    expect(mapRawStatusArea('river')).toBe('river');
  });
});

describe('status raw/domain architecture', () => {
  it('keeps raw status field names out of sitemap source contracts', () => {
    const files = ['../sitemap.ts', '../sitemap-data.ts'];
    const rawStatusTokens = [
      'status_incidents',
      'started_iso',
      'ended_iso',
      'has_page',
    ];

    const offenders = files.flatMap((file) => {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');

      return rawStatusTokens
        .filter((token) => new RegExp(`\\b${token}\\b`, 'u').test(source))
        .map((token) => `${file}: ${token}`);
    });

    expect(offenders).toEqual([]);
  });
});
