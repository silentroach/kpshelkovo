/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import AssetsPage from '@/pages/815/regulation/assets/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import RegulationPage from '@/pages/815/regulation/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import ServicesPage from '@/pages/815/regulation/services/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import OverviewPage from '@/pages/815/tldr/index.astro';
import { createAstroContainer } from '@/test/astro-container';

vi.mock('@/lib/mentions/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mentions/registry')>();
  return {
    ...actual,
    loadSiteMentionRegistry: async () =>
      actual.buildSiteMentionRegistry(
        [],
        [
          { id: 'beach', data: { title: 'Пляж' } },
          { id: 'titanic', data: { title: 'Титаник' } }
        ]
      )
  };
});

// SiteHeader загружает настоящий статусный датасет; без подмены тест зависит
// от локального dev-кеша Astro (.astro/data-store.json) рабочей копии.
vi.mock('@/lib/status/load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/status/load')>();
  return {
    ...actual,
    loadStatusData: async () => actual.buildStatusDataset([])
  };
});

const window = new Window();
afterAll(() => window.happyDOM.close());

const breadcrumbSchema = z.object({
  '@type': z.literal('BreadcrumbList'),
  itemListElement: z.array(z.object({ name: z.string(), item: z.url(), position: z.number() }))
});

const tariffParents = [
  ['Главная', '/'],
  ['Тариф 815', '/815/tldr/']
] as const;
const regulationParents = [...tariffParents, ['Регламент', '/815/regulation/']] as const;

describe('tariff section page breadcrumbs', () => {
  it.each([
    {
      path: '/815/tldr/',
      page: OverviewPage,
      expected: tariffParents
    },
    {
      path: '/815/regulation/',
      page: RegulationPage,
      expected: regulationParents
    },
    {
      path: '/815/regulation/services/',
      page: ServicesPage,
      expected: [...regulationParents, ['Услуги', '/815/regulation/services/']]
    },
    {
      path: '/815/regulation/assets/',
      page: AssetsPage,
      expected: [...regulationParents, ['Общее имущество', '/815/regulation/assets/']]
    }
  ])('aligns HTML and JSON-LD on $path', async ({ path, page, expected }) => {
    const container = await createAstroContainer();
    const request = new Request(new URL(path, import.meta.env.SITE));
    window.document.body.innerHTML = await container.renderToString(page, { request });
    const document = window.document;
    if (path === '/815/tldr/') {
      expect(document.querySelector('article a[href="/map/beach/"]')).toBeTruthy();
      expect(document.querySelector('article a[href="/map/titanic/"]')).toBeTruthy();
    }
    const nav = document.querySelector('nav[aria-label="Хлебные крошки"]');
    if (!nav) throw new Error('Expected page breadcrumbs');

    const visible = [...nav.querySelectorAll('li')].map((item) => {
      const label = item.querySelector('[itemprop="name"]')?.textContent.trim();
      const href = item.querySelector('a')?.getAttribute('href') ?? path;
      return [label, href];
    });
    expect(visible).toEqual(expected);
    expect(nav.querySelector('[aria-current="page"]')?.textContent.trim()).toBe(
      expected.at(-1)?.[0]
    );

    const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => breadcrumbSchema.safeParse(JSON.parse(script.textContent))
    );
    const breadcrumb = schemas.find((result) => result.success)?.data;
    if (!breadcrumb) throw new Error('Expected BreadcrumbList JSON-LD');
    expect(breadcrumb.itemListElement).toEqual(
      visible.map(([name, href], index) => ({
        name,
        item: new URL(href ?? path, request.url).toString(),
        position: index + 1
      }))
    );
  });
});
