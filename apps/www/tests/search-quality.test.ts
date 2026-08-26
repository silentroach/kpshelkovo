import {
  chromium,
  expect as expectPage,
  type Browser,
  type Locator,
} from '@playwright/test';
import { preview, type PreviewServer } from 'vite';
import { afterAll, beforeAll, expect, test } from 'vitest';

import {
  SEARCH_HIGHLIGHT_CLASS,
  SEARCH_HIGHLIGHT_PARAM,
} from '../src/lib/search/highlight';

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
      'номер машины',
      'распознавание номеров',
      'собрание запись запрещена',
      'запретили снимать',
      'запрет записи',
      'вода пахнет железом',
      'забор',
      'репетитор',
      'репетитор начальных классов',
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
  {
    name: '#178 archive summaries',
    queries: [
      'проверяемая транскрипция встречи',
      'регулярное обслуживание локальные объекты',
    ],
  },
  {
    name: '#183 places',
    queries: [
      'титаник',
      'детская площадка титаник',
      'корабль недалеко от дамбы',
      'детская площадка',
      'пляж',
      'строящийся пляж',
      'лесное озеро в ривере',
      'лесное озеро в парке',
      'лесной пруд в ривере',
      'лесной пруд в парке',
      'охотничьи пруды',
      'буржуйка',
      'буржуйка на карте',
      'адрес буржуйки',
      'телефон буржуйки',
      'меню буржуйки',
      'фудтрак',
    ],
  },
  {
    name: '#183 fishing aliases',
    queries: ['рыболовные пруды', 'озера для рыбной ловли', 'рыбалка'],
  },
  {
    name: '#184 compare settlements',
    queries: ['парк', 'петровское парк', 'ивушкино'],
  },
  {
    name: '#205 discomfort timeline',
    queries: [
      'ОК Дискомфорт',
      'дискомфорт тариф',
      '544 815',
      'гостевые пропуска долг',
    ],
  },
] as const;

const rankExpectations: ReadonlyMap<
  string,
  { readonly url: string; readonly maxRank: number }
> = new Map([
  ['где поесть', { url: '/sarafan/food/burzhuyka/', maxRank: 1 }],
  ['еда', { url: '/map/burzhuyka/', maxRank: 2 }],
  [
    'как въехать грузовику',
    { url: '/news/2026/05/truck-entry-open/', maxRank: 1 },
  ],
  ['госномер въезд', { url: '/news/2026/05/number-plate-access/', maxRank: 1 }],
  ['номер машины', { url: '/news/2026/05/number-plate-access/', maxRank: 1 }],
  [
    'собрание запись запрещена',
    { url: '/news/2026/06/ok-meeting-recording-ban/', maxRank: 1 },
  ],
  [
    'вода пахнет железом',
    { url: '/news/2026/08/forest-home-water-test/', maxRank: 1 },
  ],
  ['забор', { url: '/sarafan/fence/psg-promstroy/', maxRank: 3 }],
  ['репетитор', { url: '/sarafan/education/ekaterina-tutor/', maxRank: 1 }],
  [
    'репетитор начальных классов',
    { url: '/sarafan/education/elena-robotics/', maxRank: 1 },
  ],
  ['тариф 815', { url: '/815/regulation/', maxRank: 1 }],
  ['тариф 815 что входит', { url: '/815/regulation/', maxRank: 2 }],
  [
    '815 рублей за сотку',
    { url: '/815/regulation/#tariff-calculator-title', maxRank: 1 },
  ],
  ['что входит в тариф 815', { url: '/815/regulation/', maxRank: 2 }],
  ['титаник', { url: '/map/titanic/', maxRank: 1 }],
  ['детская площадка титаник', { url: '/map/titanic/', maxRank: 1 }],
  ['корабль недалеко от дамбы', { url: '/map/titanic/', maxRank: 1 }],
  ['детская площадка', { url: '/map/titanic/', maxRank: 3 }],
  ['пляж', { url: '/map/beach/', maxRank: 1 }],
  ['строящийся пляж', { url: '/map/beach/', maxRank: 1 }],
  ['лесное озеро в ривере', { url: '/map/river-forest-lake/', maxRank: 1 }],
  ['лесное озеро в парке', { url: '/map/park-forest-lake/', maxRank: 1 }],
  ['лесной пруд в ривере', { url: '/map/river-forest-lake/', maxRank: 2 }],
  ['лесной пруд в парке', { url: '/map/park-forest-lake/', maxRank: 2 }],
  ['рыболовные пруды', { url: '/map/hunting-ponds/', maxRank: 1 }],
  ['озера для рыбной ловли', { url: '/map/hunting-ponds/', maxRank: 1 }],
  ['рыбалка', { url: '/map/hunting-ponds/', maxRank: 1 }],
  ['буржуйка', { url: '/map/burzhuyka/', maxRank: 2 }],
  ['буржуйка на карте', { url: '/map/burzhuyka/', maxRank: 2 }],
  ['адрес буржуйки', { url: '/map/burzhuyka/', maxRank: 1 }],
  ['телефон буржуйки', { url: '/sarafan/food/burzhuyka/', maxRank: 1 }],
  ['меню буржуйки', { url: '/sarafan/food/burzhuyka/', maxRank: 1 }],
  [
    'петровское парк',
    { url: '/815/compare/settlements/petrovskoe-park/', maxRank: 1 },
  ],
  ['ивушкино', { url: '/815/compare/settlements/ivushkino/', maxRank: 1 }],
  ['ОК Дискомфорт', { url: '/815/discomfort/', maxRank: 1 }],
  ['дискомфорт тариф', { url: '/815/discomfort/', maxRank: 1 }],
  ['544 815', { url: '/815/discomfort/', maxRank: 1 }],
  ['гостевые пропуска долг', { url: '/815/discomfort/', maxRank: 4 }],
]);

const placeSnippetUrls: ReadonlyMap<string, string> = new Map([
  ['лесное озеро в ривере', '/map/river-forest-lake/'],
  ['лесное озеро в парке', '/map/park-forest-lake/'],
  ['лесной пруд в ривере', '/map/river-forest-lake/'],
  ['лесной пруд в парке', '/map/park-forest-lake/'],
  ['охотничьи пруды', '/map/hunting-ponds/'],
  ['рыболовные пруды', '/map/hunting-ponds/'],
  ['озера для рыбной ловли', '/map/hunting-ponds/'],
  ['рыбалка', '/map/hunting-ponds/'],
]);

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

test('#243 cold search activation survives a delayed lazy chunk', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  let releaseLazyChunk = (): void => {};
  const lazyChunkGate = new Promise<void>((resolve) => {
    releaseLazyChunk = resolve;
  });
  let delayedScripts = 0;
  await page.route('**/static/*.js', async (route) => {
    delayedScripts += 1;
    await lazyChunkGate;
    await route.continue();
  });

  await page.evaluate(() => {
    document.addEventListener(
      'click',
      () => {
        const dialog = document.querySelector<HTMLDialogElement>(
          '[data-search-dialog]',
        );
        const input = document.querySelector<HTMLInputElement>(
          '[data-search-input]',
        );
        const state = {
          focused: document.activeElement === input,
          open: dialog?.open ?? false,
        };

        Object.assign(window, { __issue243Activation: state });
      },
      { once: true },
    );
  });

  const opener = page.locator('[data-search-trigger]:visible').first();
  const searchDialog = page.locator('[data-search-dialog]');
  const searchInput = searchDialog.getByRole('searchbox', {
    name: 'Что найти на сайте',
  });
  await opener.click();

  expect(
    await page.evaluate(
      () =>
        (
          window as Window & {
            __issue243Activation?: {
              readonly focused: boolean;
              readonly open: boolean;
            };
          }
        ).__issue243Activation,
    ),
  ).toEqual({ focused: true, open: true });
  await searchInput.pressSequentially('вода');
  await expectPage(searchInput).toHaveValue('вода');
  await expect.poll(() => delayedScripts).toBeGreaterThan(0);

  releaseLazyChunk();
  await expectPage(searchDialog).toHaveAttribute(
    'data-search-state',
    /^(?:empty|results)$/u,
  );
  await expectPage(searchInput).toHaveValue('вода');

  await searchInput.press('Escape');
  await expectPage(opener).toBeFocused();
  await opener.click();
  await expectPage(searchInput).toBeFocused();

  await page.evaluate(() => {
    document.dispatchEvent(new Event('astro:before-swap'));
  });
  await expectPage(searchDialog).toHaveCount(0);
  await expectPage(opener).not.toBeFocused();
  await page.close();
});

test('#154 search result highlighting', async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await page.clock.setFixedTime('2026-08-16T12:00:00Z');
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-search-trigger]').first().click();
  const searchDialog = page.locator('dialog[data-search-state]');
  await searchDialog
    .getByRole('searchbox', { name: 'Что найти на сайте' })
    .fill('тариф');
  await expectPage(searchDialog).toHaveAttribute(
    'data-search-state',
    'results',
  );

  const result = searchDialog
    .locator('[data-search-result][href^="/815/regulation/"]')
    .first();
  const href = await result.getAttribute('href');
  if (!href) {
    throw new Error('Expected regulation search result URL');
  }
  const target = new URL(href, baseURL);

  expect(target.searchParams.getAll(SEARCH_HIGHLIGHT_PARAM)).toEqual(['тариф']);
  expect(target.hash).not.toBe('');

  await result.click();
  await expectPage(page).toHaveURL(target.href);
  await expectPage(
    page.locator(`mark.${SEARCH_HIGHLIGHT_CLASS}`).first(),
  ).toBeVisible();
  await page.close();
});

for (const group of queryGroups) {
  test(group.name, async () => {
    const matrix = [];
    for (const query of group.queries) {
      const snapshot = await searchSnapshot(query);
      const archiveResult = snapshot.results.find((result) =>
        /^\/news\/\d{4}\/(?:\d{2}\/)?$/u.test(result.url),
      );

      expect(
        archiveResult,
        `${query}: news archive pages must stay outside Pagefind`,
      ).toBeUndefined();

      const expectation = rankExpectations.get(query);
      if (expectation) {
        const rank = snapshot.results.findIndex(
          (result) =>
            result.url === expectation.url ||
            result.url.startsWith(`${expectation.url}#`),
        );

        expect(
          rank,
          `${query}: expected ${expectation.url}`,
        ).toBeGreaterThanOrEqual(0);
        expect(rank + 1, `${query}: expected rank`).toBeLessThanOrEqual(
          expectation.maxRank,
        );
      }

      const placeSnippetUrl = placeSnippetUrls.get(query);
      if (placeSnippetUrl) {
        const result = snapshot.results.find(
          (item) => item.url === placeSnippetUrl,
        );

        expect(result, `${query}: expected map snippet`).toBeDefined();
        if (result) {
          expect(
            result.excerpt,
            `${query}: map snippet must omit its title`,
          ).not.toContain(result.title);
        }
      }

      if (group.name === '#184 compare settlements') {
        const compareResults = snapshot.results.filter(
          (result) => result.section === 'Сравнение поселков',
        );

        for (const result of compareResults) {
          expect(
            result.excerpt,
            `${query}: compare snippet must omit its title`,
          ).not.toContain(result.title);
          expect(
            result.excerpt,
            `${query}: compare snippet must show the normalized monthly tariff`,
          ).toMatch(/₽\/сотка в месяц/u);
        }

        if (query === 'ивушкино') {
          expect(compareResults[0]?.excerpt).toMatch(
            /^5 813 ₽\/участок в месяц \+ 100 ₽\/сотка в месяц, это ~681 ₽\/сотка в месяц\./u,
          );
        }
      }

      matrix.push(snapshot);
    }

    expect(matrix).toMatchSnapshot();
  });
}
