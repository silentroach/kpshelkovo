import { readFile } from 'node:fs/promises';

import { chromium, expect as expectPage, type Browser, type Locator } from '@playwright/test';
import { preview, type PreviewServer } from 'vite';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { z } from 'zod';

import { EventsPublicPayloadSchema } from '../src/lib/events/public-schema';
import { isEventSearchable } from '../src/lib/events/search';
import { SEARCH_HIGHLIGHT_CLASS, SEARCH_HIGHLIGHT_PARAM } from '../src/lib/search/highlight';
import type { StatusPublicPayloadDto } from '../src/lib/status/public-dto';

const port = Number(process.env.SEARCH_QUALITY_PORT ?? 4330);
const baseURL = `http://127.0.0.1:${String(port)}`;
const isPublicEventSearchable = (
  event: z.infer<typeof EventsPublicPayloadSchema>['events'][number]
) =>
  isEventSearchable({
    startsDate: event.startsAt.slice(0, 10),
    endsIso: event.timePrecision === 'datetime' ? event.endsAt : undefined,
    through: event.timePrecision === 'date' ? event.through : undefined
  });

let browser: Browser;
let server: PreviewServer;

const readResults = async (target: Locator) =>
  target.locator('[data-search-result]').evaluateAll((links) =>
    links.slice(0, 8).map((link) => {
      const normalized = (value?: string): string => value?.replace(/\s+/gu, ' ').trim() ?? '';
      const excerpt = link.querySelector('.site-search-result-excerpt') ?? link.querySelector('p');
      const href = link.getAttribute('href') ?? '';
      const url = new URL(href, window.location.origin);

      return {
        section: normalized(link.querySelector('span > span')?.textContent || undefined),
        title: normalized(link.querySelector('h3')?.textContent || undefined),
        url: `${url.pathname}${decodeURIComponent(url.hash)}`,
        excerpt: normalized(excerpt?.textContent || undefined),
        highlights: [
          ...new Set(
            [...(excerpt?.querySelectorAll('mark') ?? [])].map((mark) =>
              normalized(mark.textContent || undefined)
            )
          )
        ]
      };
    })
  );

beforeAll(async () => {
  server = await preview({
    build: {
      outDir: 'dist/site'
    },
    preview: {
      host: '127.0.0.1',
      port,
      strictPort: true
    }
  });
  browser = await chromium.launch();
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
        const dialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');
        const input = document.querySelector<HTMLInputElement>('[data-search-input]');
        const state = {
          focused: document.activeElement === input,
          open: dialog?.open ?? false
        };

        Object.assign(window, { __issue243Activation: state });
      },
      { once: true }
    );
  });

  const opener = page.locator('[data-search-trigger]:visible').first();
  const searchDialog = page.locator('[data-search-dialog]');
  const searchInput = searchDialog.getByRole('searchbox', {
    name: 'Что найти на сайте'
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
        ).__issue243Activation
    )
  ).toEqual({ focused: true, open: true });
  await searchInput.pressSequentially('вода');
  await expectPage(searchInput).toHaveValue('вода');
  await expect.poll(() => delayedScripts).toBeGreaterThan(0);

  releaseLazyChunk();
  await expectPage(searchDialog).toHaveAttribute('data-search-state', /^(?:empty|results)$/u);
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

test('search input focus highlights the dialog without an underline', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-search-trigger]:visible').first().click();

  const dialog = page.locator('[data-search-dialog]');
  const input = dialog.getByRole('searchbox');
  await expectPage(input).toBeFocused();
  await expectPage(input).toHaveCSS('box-shadow', 'none');
  await expectPage(dialog).toHaveCSS('outline-style', 'solid');

  await input.press('Tab');
  const close = dialog.locator('[data-search-close]');
  await expectPage(close).toBeFocused();
  await expectPage(close).toHaveCSS('outline-style', 'solid');
  await expectPage(dialog).toHaveCSS('outline-style', 'none');

  await close.press('Shift+Tab');
  await expectPage(input).toBeFocused();
  await expectPage(dialog).toHaveCSS('outline-style', 'solid');
  await input.press('Escape');
  await expectPage(dialog).not.toBeVisible();
  await page.close();
});

test('#154 search result highlighting', async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  await page.clock.setFixedTime('2026-08-16T12:00:00Z');
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-search-trigger]').first().click();
  const searchDialog = page.locator('dialog[data-search-state]');
  await searchDialog.getByRole('searchbox', { name: 'Что найти на сайте' }).fill('тариф');
  await expectPage(searchDialog).toHaveAttribute('data-search-state', 'results');

  const result = searchDialog.locator('[data-search-result][href^="/815/regulation/"]').first();
  const href = await result.getAttribute('href');
  if (!href) {
    throw new Error('Expected regulation search result URL');
  }
  const target = new URL(href, baseURL);

  expect(target.searchParams.getAll(SEARCH_HIGHLIGHT_PARAM)).toEqual(['тариф']);
  expect(target.hash).not.toBe('');

  await result.click();
  await expectPage(page).toHaveURL(target.href);
  await expectPage(page.locator(`mark.${SEARCH_HIGHLIGHT_CLASS}`).first()).toBeVisible();
  await page.close();
});

test('#355 preserves results and pagination across ClientRouter navigations', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.clock.setFixedTime('2026-08-16T12:00:00Z');
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      let swaps = 0;
      document.addEventListener('astro:after-swap', () => {
        document.documentElement.dataset.searchSwaps = String(++swaps);
      });
    });
    const searchDialog = page.locator('[data-search-dialog]');
    const searchInput = searchDialog.getByRole('searchbox');
    const links = searchDialog.locator('[data-search-result]');
    const initial = new Map<string, Awaited<ReturnType<typeof readResults>>>();

    for (const [index, query] of ['тариф', 'тариф', 'суд', 'газ', 'тариф'].entries()) {
      await page.locator('[data-search-trigger]').first().click();
      await searchInput.fill(query);
      await expectPage(searchDialog).toHaveAttribute('data-search-state', 'results');
      await expectPage(links).toHaveCount(8);
      const results = await readResults(searchDialog);
      if (initial.has(query)) expect(results).toEqual(initial.get(query));
      else initial.set(query, results);

      if (query === 'тариф') {
        await links.last().scrollIntoViewIfNeeded();
        await expectPage(links).toHaveCount(16);
        const urls = await links.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('href'))
        );
        expect(new Set(urls).size).toBe(16);
      }

      await searchInput.press('Escape');
      await page
        .locator(index % 2 === 0 ? 'header a[href="/news/"]' : 'header a[href="/"]')
        .first()
        .click();
      await expectPage(page.locator('html')).toHaveAttribute(
        'data-search-swaps',
        String(index + 1)
      );
      await expectPage(searchDialog).not.toBeVisible();
    }
  } finally {
    await page.close();
  }
});

test.each(['initial', 'pagination'] as const)(
  '#1263 retries real %s fragments without reloading the document or engine',
  async (phase) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      let blocked = phase === 'initial';
      const loadedFragments = new Set<string>();
      const failedFragments: string[] = [];
      const engineRequests: string[] = [];
      let documents = 0;
      page.on('request', (request) => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents += 1;
        if (
          /\/search\/.*(?:pagefind\.js|pagefind-entry\.json|wasm\.[^/]+\.pagefind|\.pf_meta)(?:\?[^#]*)?$/u.test(
            request.url()
          )
        ) {
          engineRequests.push(request.url());
        }
      });
      await page.route('**/search/fragment/**', async (route) => {
        const url = route.request().url();
        if (blocked && !loadedFragments.has(url)) {
          failedFragments.push(url);
          await route.abort('failed');
        } else {
          loadedFragments.add(url);
          await route.continue();
        }
      });
      await page.clock.setFixedTime('2026-08-16T12:00:00Z');
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      const opener = page.locator('[data-search-trigger]:visible').first();
      await opener.click();
      const dialog = page.locator('[data-search-dialog]');
      const input = dialog.getByRole('searchbox');
      const links = dialog.locator('[data-search-result]');
      const retry = dialog.getByRole('button', { name: 'Повторить', exact: true });
      await input.fill('тариф');

      let previousUrls: readonly (string | undefined)[] = [];
      if (phase === 'pagination') {
        await expectPage(links).toHaveCount(8);
        previousUrls = await links.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('href') ?? undefined)
        );
        blocked = true;
        await links.last().scrollIntoViewIfNeeded();
      }

      await expectPage(
        dialog
          .getByRole('region', { name: 'Результаты поиска' })
          .getByText('Не удалось загрузить результаты поиска.', { exact: true })
      ).toBeVisible();
      await expectPage(retry).toBeVisible();
      await expectPage(links).toHaveCount(previousUrls.length);
      expect(failedFragments.length).toBeGreaterThan(0);
      const engineBeforeRetry = [...engineRequests];
      expect(engineBeforeRetry.length).toBeGreaterThan(0);

      // A second manual attempt must fail visibly, without triggering an automatic loop.
      const failedBeforeRetry = failedFragments.length;
      await retry.focus();
      await retry.press('Enter');
      await expect.poll(() => failedFragments.length).toBeGreaterThan(failedBeforeRetry);
      await expectPage(retry).toBeEnabled();
      const failedAfterRetry = failedFragments.length;
      await page.waitForTimeout(400);
      expect(failedFragments).toHaveLength(failedAfterRetry);
      await expectPage(input).toHaveValue('тариф');
      expect(
        await links.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('href') ?? undefined)
        )
      ).toEqual(previousUrls);

      blocked = false;
      await retry.press('Enter');
      const expectedCount = phase === 'initial' ? 8 : 16;
      await expectPage(links).toHaveCount(expectedCount);
      await expectPage(retry).toHaveCount(0);
      const urls = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href'))
      );
      expect(urls).toEqual(expect.arrayContaining(previousUrls));
      expect(new Set(urls).size).toBe(expectedCount);
      const firstAddedIndex = urls.findIndex((url) => !previousUrls.includes(url ?? undefined));
      expect(firstAddedIndex).toBeGreaterThanOrEqual(0);
      await expectPage(links.nth(firstAddedIndex)).toBeFocused();
      await expectPage(input).toHaveValue('тариф');
      expect(engineRequests).toEqual(engineBeforeRetry);
      expect(documents).toBe(1);
      await page.keyboard.press('Escape');
      await expectPage(opener).toBeFocused();
    } finally {
      await page.close();
    }
  }
);

test.each([
  ['entry', /\/search\/pagefind-entry\.json(?:\?[^#]*)?$/u],
  ['WASM', /\/search\/wasm\.[^/]+\.pagefind(?:\?[^#]*)?$/u],
  ['meta', /\/search\/.*\.pf_meta(?:\?[^#]*)?$/u],
  ['unknown search error', /\/search\/pagefind\.js(?:\?[^#]*)?$/u]
] as const)(
  '#1263 recommends reload for %s failure without a local retry',
  async (stage, resource) => {
    const page = await browser.newPage();
    try {
      let failures = 0;
      await page.route(resource, async (route) => {
        failures += 1;
        if (stage === 'unknown search error') {
          await route.fulfill({
            contentType: 'text/javascript',
            body: `export const options = async () => {};
export const init = async () => {};
export const preload = async () => {};
export const search = async () => { throw new Error('Unexpected search failure'); };`
          });
        } else {
          await route.abort('failed');
        }
      });
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-search-trigger]:visible').first().click();
      const dialog = page.locator('[data-search-dialog]');
      await dialog.getByRole('searchbox').fill('тариф');
      await expectPage(
        dialog
          .getByRole('region', { name: 'Результаты поиска' })
          .getByText('Поиск не работает. Попробуйте обновить страницу.', { exact: true })
      ).toBeVisible();
      await expectPage(dialog.getByRole('button', { name: 'Повторить', exact: true })).toHaveCount(
        0
      );
      await expectPage(dialog.locator('[data-search-result]')).toHaveCount(0);
      expect(failures).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  }
);

test('status, #224 events, #372 KB and news archive indexing policy in the production corpus', async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({
      type: 'module',
      content: `
        import * as pagefind from '/search/pagefind.js';
        await pagefind.init();
        const search = await pagefind.search(null);
        const results = await Promise.all(search.results.map((result) => result.data()));
        document.documentElement.dataset.pagefindUrls = JSON.stringify(
          results.filter((result) => !result.url.startsWith('/map/?p=')).map((result) => new URL(result.url, window.location.origin).pathname),
        );
      `
    });
    const root = page.locator('html');
    await expectPage(root).toHaveAttribute('data-pagefind-urls', /^\[/u);
    const urls = z
      .array(z.string())
      .parse(JSON.parse((await root.getAttribute('data-pagefind-urls')) ?? '[]'));

    expect(urls.length).toBeGreaterThan(0);
    expect(urls).toContain('/815/tldr/');
    expect(urls.filter((url) => /^\/news\/\d{4}\/(?:\d{2}\/)?$/u.test(url))).toEqual([]);
    const eventUrls = urls.filter((url) => url.startsWith('/events/'));
    // Compare the filtered corpus: the root plus current/recent event details,
    // never one per day or monthly view.
    const events = EventsPublicPayloadSchema.parse(
      await (await page.request.get(`${baseURL}/events/events.json`)).json()
    );
    const expectedEventUrls = [
      '/events/',
      ...events.events.filter(isPublicEventSearchable).map((event) => new URL(event.url).pathname)
    ];
    expect(eventUrls.sort()).toEqual(expectedEventUrls.sort());
    expect(
      eventUrls.filter((url) => /^\/events\/\d{4}\/\d{2}\/(?:$|\d{2}\/|list\/)/u.test(url))
    ).toEqual([]);
    expect(urls.filter((url) => url.startsWith('/status/calendar/'))).toEqual([]);
    expect(urls).not.toContain('/status/history/');
    const statusUrls = [
      '/status/',
      '/status/electricity/',
      '/status/water/',
      '/status/internet/',
      '/status/dam/'
    ];
    expect(urls).toEqual(expect.arrayContaining(statusUrls));

    const data = (await (
      await page.request.get(`${baseURL}/status/data/status.json`)
    ).json()) as StatusPublicPayloadDto;
    const sitemap = await (await page.request.get(`${baseURL}/sitemap-0.xml`)).text();
    const indexNowUrls = JSON.parse(
      await readFile(new URL('../dist/indexnow-urls.json', import.meta.url), 'utf8')
    ) as readonly string[];
    const indexNowStatusPaths = indexNowUrls
      .map((url) => new URL(url).pathname)
      .filter((path) => path.startsWith('/status/'));

    expect(indexNowStatusPaths.sort()).toEqual(statusUrls.sort());
    expect(sitemap).not.toMatch(/\/status\/(?:incidents|calendar|history)\//u);

    for (const event of data.incidents) {
      if (!event.html_url) continue;
      const path = new URL(event.html_url).pathname;
      const html = await (await page.request.get(`${baseURL}${path}`)).text();

      expect(html, path).toContain('<meta name="robots" content="noindex, follow">');
      expect(
        urls.includes(path),
        `${path}: Pagefind must honor build opt-in even with noindex`
      ).toBe(html.includes('data-pagefind-root'));
    }
    expect(urls).toContain('/kb/services/internet/fiber/');
    expect(urls).not.toContain('/kb/services/internet/');
    expect(urls).not.toContain('/kb/sos/');
  } finally {
    await page.close();
  }
});
