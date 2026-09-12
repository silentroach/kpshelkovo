import { beforeAll, expect, it } from 'vitest';

beforeAll(() => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
});

it.each([
  ['root', () => import('../llms')],
  ['news', () => import('../news/llms')],
  ['status', () => import('../status/llms')],
  ['people', () => import('../people/llms')],
  ['reglament', () => import('../reglament/llms')],
  ['compare', () => import('../../compare/lib/llms')]
] as const)('%s llms uses named links instead of autolinks', async (_, load) => {
  const { build } = await load();
  const markdown = build();

  expect(markdown).toMatch(/\[[^\]\n]+\]\(https:\/\/[^)\s]+\)/u);
  expect(markdown).not.toMatch(/<https?:\/\/[^>]+>/u);
});
