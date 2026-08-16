import {
  chromium,
  expect as expectPage,
  type Browser,
  type Locator,
} from '@playwright/test';
import { preview, type PreviewServer } from 'vite';
import { afterAll, beforeAll, expect, test } from 'vitest';

const port = 4330;
const baseURL = `http://127.0.0.1:${String(port)}`;
const queryGroups = [
  {
    name: '#121 short queries',
    queries: [
      'еда',
      'подать в суд тариф',
      'подать суд тариф',
      'тар',
      'в',
      'вода',
      'газ',
      'слабый напор воды',
      'проезд через дамбу',
    ],
  },
  {
    name: '#118 and #124 snippets',
    queries: [
      'тариф',
      'сроки благоустройства октябрь',
      'отчет ок за июль',
      'ограждение площадки форест',
      'документы юрист тариф',
      'асфальт форест',
    ],
  },
  {
    name: '#122 long document ranking',
    queries: [
      'когда заасфальтируют форест',
      'асфальт форест',
      'официальный анализ воды форест',
      'анализ воды форест',
    ],
  },
  {
    name: '#123 query aliases',
    queries: [
      'где поесть',
      'еда',
      'как въехать грузовику',
      'въезд грузового транспорта',
      'госномер въезд',
      'распознавание номеров',
      'собрание запись запрещена',
      'запрет записи',
      'вода пахнет железом',
    ],
  },
  {
    name: '#125 tariff aliases',
    queries: [
      'тариф 815',
      'тариф 815 что входит',
      'калькулятор тарифа',
      '815 рублей за сотку',
      'что входит в тариф 815',
    ],
  },
] as const;

let browser: Browser;
let dialog: Locator;
let input: Locator;
let server: PreviewServer;

const normalizedText = (value?: string): string =>
  value?.replace(/\s+/gu, ' ').trim() ?? '';

const resultSnapshot = async (target: Locator) =>
  target.locator('[data-search-result]').evaluateAll((links) =>
    links.slice(0, 8).map((link) => {
      const normalized = (value?: string): string =>
        value?.replace(/\s+/gu, ' ').trim() ?? '';
      const excerpt = link.querySelector('p');
      const href = link.getAttribute('href') ?? '';
      const url = new URL(href, window.location.origin);

      return {
        section: normalized(
          link.querySelector('span > span')?.textContent || undefined,
        ),
        title: normalized(link.querySelector('h3')?.textContent || undefined),
        url: `${url.pathname}${decodeURIComponent(url.hash)}`,
        excerpt: normalized(excerpt?.textContent || undefined),
        highlights: [
          ...new Set(
            [...(excerpt?.querySelectorAll('mark') ?? [])].map((mark) =>
              normalized(mark.textContent || undefined),
            ),
          ),
        ],
      };
    }),
  );

const searchSnapshot = async (query: string) => {
  await input.fill('');
  await expectPage(dialog).toHaveAttribute('data-search-state', 'initial');
  await input.fill(query);
  await expectPage(dialog).toHaveAttribute(
    'data-search-state',
    /^(?:empty|results)$/u,
  );

  const announcement = normalizedText(
    await dialog.locator('[aria-live="polite"]').textContent(),
  );

  return {
    query,
    total: Number(announcement.match(/\d+/u)?.[0] ?? 0),
    results: await resultSnapshot(dialog),
  };
};

beforeAll(async () => {
  server = await preview({
    build: {
      outDir: 'dist/site',
    },
    preview: {
      host: '127.0.0.1',
      port,
      strictPort: true,
    },
  });
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await page.clock.setFixedTime('2026-08-16T12:00:00Z');
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-search-trigger]').first().click();

  dialog = page.locator('dialog[data-search-state]');
  input = dialog.getByRole('searchbox', { name: 'Что найти на сайте' });
  await expectPage(dialog).toBeVisible();
  await expectPage(input).toBeFocused();
});

afterAll(async () => {
  await browser.close();
  await server.close();
});

for (const group of queryGroups) {
  test(group.name, async () => {
    const matrix = [];
    for (const query of group.queries) {
      matrix.push(await searchSnapshot(query));
    }

    expect(matrix).toMatchSnapshot();
  });
}
