import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => {
  const listOnly = {
    hasPage: false,
    year: 2026,
    month: 6,
    slug: 'water-no-page',
  };
  const withDetail = {
    hasPage: true,
    year: 2026,
    month: 5,
    slug: 'electricity-river-outage',
    url: '/status/incidents/2026/05/electricity-river-outage/',
    markdownUrl: '/status/incidents/2026/05/electricity-river-outage/index.md',
    canonical:
      'https://example.com/status/incidents/2026/05/electricity-river-outage/',
  };

  return {
    listOnly,
    withDetail,
    status: {
      active: [{ kind: 'incident' }, { kind: 'maintenance' }],
      services: [{ service: 'electricity' }],
      incidents: [listOnly, withDetail],
    },
  };
});

vi.mock('./load', () => ({
  loadStatusData: async () => fixtures.status,
}));

let build: typeof import('./llms').build;
let statusCalendarAgentPatterns: typeof import('./routes').statusCalendarAgentPatterns;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ build } = await import('./llms'));
  ({ statusCalendarAgentPatterns } = await import('./routes'));
});

beforeEach(() => {
  fixtures.status.incidents = [fixtures.listOnly, fixtures.withDetail];
});

describe('status llms', () => {
  it.each(['short', 'full'] as const)(
    'uses the latest published detail page in the %s document',
    async (kind) => {
      const markdown = await build(kind);

      expect(markdown).toContain(fixtures.withDetail.canonical);
      expect(markdown).toContain(
        `https://example.com${fixtures.withDetail.markdownUrl}`,
      );
      expect(markdown).not.toContain(fixtures.listOnly.slug);
    },
  );

  it.each(['short', 'full'] as const)(
    'omits incident examples from the %s document when no detail page exists',
    async (kind) => {
      fixtures.status.incidents = [fixtures.listOnly];

      const markdown = await build(kind);

      expect(markdown).not.toContain('https://example.com/status/incidents/');
      expect(markdown).not.toContain('Пример HTML-страницы инцидента');
      expect(markdown).not.toContain('Пример Markdown-версии инцидента');
    },
  );

  it.each(['short', 'full'] as const)(
    'links the full HTML archive from the %s document',
    async (kind) => {
      const markdown = await build(kind);

      expect(markdown).toContain('https://example.com/status/history/');
      expect(markdown).toContain('https://example.com/status/data/status.json');
    },
  );

  it.each(['short', 'full'] as const)(
    'documents calendar HTML, Markdown, and ISO day anchors in the %s document',
    async (kind) => {
      const markdown = await build(kind);

      for (const route of Object.values(statusCalendarAgentPatterns())) {
        expect(markdown).toContain(route);
      }

      expect(markdown).toContain('отдельного календарного JSON нет');
      expect(markdown).not.toMatch(/\/status\/calendar(?:\/data)?\.json/u);
    },
  );
});
