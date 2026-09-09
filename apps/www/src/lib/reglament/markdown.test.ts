import { beforeAll, describe, expect, it } from 'vitest';

let buildFullReglamentChecksMarkdown: typeof import('./full-markdown').buildFullReglamentChecksMarkdown;
let buildFullReglamentMarkdown: typeof import('./full-markdown').buildFullReglamentMarkdown;
let buildReglamentMarkdown: typeof import('./markdown').buildReglamentMarkdown;
let estimate2026: typeof import('@/data/reglament/estimate-2026').estimate2026;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ buildReglamentMarkdown } = await import('./markdown'));
  ({ buildFullReglamentChecksMarkdown, buildFullReglamentMarkdown } =
    await import('./full-markdown'));
  ({ estimate2026 } = await import('@/data/reglament/estimate-2026'));
});

describe('reglament markdown companions', () => {
  it('keeps overview URLs, source refs and formulas machine-readable', () => {
    const markdown = buildReglamentMarkdown(estimate2026);

    expect(markdown).toMatchSnapshot();
  });

  it('keeps full-reglament thematic files as markdown links', () => {
    const markdown = buildFullReglamentMarkdown();

    expect(markdown).toMatchSnapshot();
  });

  it('keeps full-reglament ids, source refs and status codes machine-readable', () => {
    const markdown = buildFullReglamentChecksMarkdown();

    expect(markdown).toMatchSnapshot();
  });
});
