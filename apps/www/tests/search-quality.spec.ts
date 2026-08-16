import { expect, test, type Locator } from '@playwright/test';

const queries = [
  'еда',
  'подать в суд тариф',
  'подать суд тариф',
  'тар',
  'в',
  'вода',
  'газ',
  'слабый напор воды',
  'проезд через дамбу',
] as const;

const normalizedText = (value?: string): string =>
  value?.replace(/\s+/gu, ' ').trim() ?? '';

const resultSnapshot = async (dialog: Locator) =>
  dialog.locator('[data-search-result]').evaluateAll((links) =>
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

const searchSnapshot = async (
  dialog: Locator,
  input: Locator,
  query: string,
) => {
  await input.fill('');
  await expect(dialog).toHaveAttribute('data-search-state', 'initial');
  await input.fill(query);
  await expect(dialog).toHaveAttribute(
    'data-search-state',
    /^(?:empty|results)$/u,
  );

  const announcement = normalizedText(
    await dialog.locator('[aria-live="polite"]').textContent(),
  );
  const total = Number(announcement.match(/\d+/u)?.[0] ?? 0);
  const results = await resultSnapshot(dialog);

  return { query, total, results };
};

const serializeMatrix = (
  matrix: readonly Awaited<ReturnType<typeof searchSnapshot>>[],
): string =>
  `${matrix
    .map(({ query, total, results }) =>
      [
        `Запрос: ${query}`,
        `Всего: ${String(total)}`,
        ...results.flatMap(({ section, title, url, highlights }, index) => [
          `${String(index + 1)}. [${section}] ${title}`,
          `   ${url}`,
          `   Подсветка: ${highlights.join(' | ') || 'нет'}`,
        ]),
      ].join('\n'),
    )
    .join('\n\n')}\n`;

test('site search query matrix', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-search-trigger]').first().click();

  const dialog = page.locator('dialog[data-search-state]');
  const input = dialog.getByRole('searchbox', { name: 'Что найти на сайте' });
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();

  const matrix = [];
  for (const query of queries) {
    matrix.push(await searchSnapshot(dialog, input, query));
  }

  expect(serializeMatrix(matrix)).toMatchSnapshot('search-query-matrix.txt');
});
