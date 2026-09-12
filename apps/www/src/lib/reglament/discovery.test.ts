import { beforeAll, describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import type { PublicSurfaceSlice } from '@/lib/public-surface';
import type { expectSectionCatalogMatchesRegistry as expectSectionCatalogMatchesRegistryType } from '@/lib/public-surface/catalog-contract.test-helper';
import type { reglamentPublicSurfaceSlice as reglamentPublicSurfaceSliceType } from '@/lib/reglament/public-surface';

import {
  reglamentApiCatalogPath,
  reglamentAssetsPath,
  reglamentEstimateDetailsChecksMarkdownPath,
  reglamentEstimateDetails2026DataPath,
  reglamentEstimateDetails2026OpenApiPath,
  reglamentEstimateDetails2026SchemaPath,
  reglamentEstimateDetailsLaborMarkdownPath,
  reglamentEstimateDetailsMachinesMarkdownPath,
  reglamentEstimateDetailsMarkdownPath,
  reglamentEstimateDetailsMaterialsMarkdownPath,
  reglamentEstimate2026DataPath,
  reglamentFull2026DataPath,
  reglamentFullAssetsMarkdownPath,
  reglamentFullChecksMarkdownPath,
  reglamentFullServiceMapMarkdownPath,
  reglamentFullServicesMarkdownPath,
  reglamentFullSourcePdfUrl,
  reglamentServicesPath,
  reglamentSourcePdfUrl
} from './routes';

let buildReglamentPayload: typeof import('./discovery').buildReglamentPayload;
let catalog: typeof import('./discovery').catalog;
let expectSectionCatalogMatchesRegistry: typeof expectSectionCatalogMatchesRegistryType;
let openapi: typeof import('./discovery').openapi;
let reglamentPublicSurfaceSlice: typeof reglamentPublicSurfaceSliceType & PublicSurfaceSlice;
let schema: typeof import('./discovery').schema;
let self: typeof import('./discovery').self;

type CatalogEntry = {
  readonly href?: string;
  readonly type?: string;
  readonly 'title*'?: string | readonly { readonly language?: string; readonly value?: string }[];
};

type CatalogLinkset = {
  readonly item?: readonly CatalogEntry[];
  readonly 'service-desc'?: readonly CatalogEntry[];
};

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ buildReglamentPayload, catalog, openapi, schema, self } = await import('./discovery'));
  ({ expectSectionCatalogMatchesRegistry } =
    await import('@/lib/public-surface/catalog-contract.test-helper'));
  ({ reglamentPublicSurfaceSlice } = await import('@/lib/reglament/public-surface'));
});

const catalogEntries = (root: string): readonly CatalogEntry[] => {
  const body = catalog(root) as {
    readonly linkset?: readonly CatalogLinkset[];
  };

  return (body.linkset ?? []).flatMap((entry) => [
    ...(entry.item ?? []),
    ...(entry['service-desc'] ?? [])
  ]);
};

const catalogTitle = (entry: CatalogEntry): string => {
  const title = entry['title*'];

  if (typeof title === 'string') {
    return title;
  }

  return title?.[0]?.value ?? '';
};

const publicCatalogSnapshot = (
  root: string
): readonly {
  readonly href: string;
  readonly type: string;
  readonly title: string;
}[] =>
  catalogEntries(root).map((entry) => ({
    href: entry.href ?? '',
    type: entry.type ?? '',
    title: catalogTitle(entry)
  }));

describe('reglament discovery payload', () => {
  it.each(['https://example.com', 'https://example.com/sub'])(
    'keeps the section API catalog aligned with registry catalog surfaces at %s',
    (siteRoot) => {
      expectSectionCatalogMatchesRegistry({
        catalog,
        siteRoot,
        slice: reglamentPublicSurfaceSlice,
        exact: true
      });
    }
  );

  it('publishes baseline formulas, source refs and computed values', () => {
    const payload = buildReglamentPayload(estimate2026);
    const rows = payload.sections.flatMap((section) => section.rows);

    expect(payload).toMatchObject({
      id: 'estimate-2026',
      year: 2026,
      tariff_area_sotki: 20_440.54,
      official: {
        annual_gross: 221_264_198,
        tariff_per_sotka_month: 902.07
      },
      computed: {
        annual_gross: 221_264_198,
        tariff_per_sotka_month: 902.07,
        delta_annual_gross: 0,
        delta_tariff_per_sotka_month: 0
      }
    });
    expect(payload.formulas.tariff_per_sotka_month).toContain('annual_gross');
    expect(payload.formulas.row_breakdown).toMatchObject({
      fot: 'primary_salary + machinist_salary',
      gross: 'income * (1 + vat_rate)'
    });
    expect(payload.caveats).toEqual(expect.arrayContaining([expect.stringContaining('PDF')]));
    expect(payload.sections).toHaveLength(7);
    expect(rows.length).toBeGreaterThan(10);
    expect(
      rows.every(
        (row) =>
          row.source_refs.length > 0 && row.computed.annual_gross === row.baseline.annual_gross
      )
    ).toBe(true);
    expect(payload.sections[0]?.rows[0]?.source_refs[0]).toMatchObject({
      pdf: 'final',
      pdf_key: '815/regulation/final.pdf',
      pdf_url: reglamentSourcePdfUrl('final'),
      page: 1
    });
    expect(payload.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pdf: 'final',
          pdf_key: '815/regulation/final.pdf',
          pdf_url: reglamentSourcePdfUrl('final')
        })
      ])
    );
  });

  it('keeps schema, openapi and catalog aligned with public routes', () => {
    const root = 'https://example.com';
    const apiCatalog = JSON.stringify(catalog(root));
    const jsonSchema = schema(root) as {
      readonly additionalProperties?: boolean;
      readonly $defs?: Record<string, { readonly additionalProperties?: boolean }>;
    };
    const api = openapi(root) as {
      readonly paths?: Record<string, unknown>;
      readonly components?: {
        readonly schemas?: Record<
          string,
          {
            readonly $defs?: Record<string, { readonly additionalProperties?: boolean }>;
          }
        >;
      };
    };
    const apiSchema = api.components?.schemas?.Estimate2026Payload;

    expect(self(root)).toContain(`https://example.com${reglamentApiCatalogPath()}`);
    expect(apiCatalog).toContain(reglamentSourcePdfUrl('final'));
    expect(jsonSchema.additionalProperties).toBe(false);
    expect(jsonSchema.$defs?.row?.additionalProperties).toBe(false);
    expect(api.paths).toHaveProperty(reglamentEstimate2026DataPath());
    expect(apiSchema?.$defs?.row?.additionalProperties).toBe(false);
  });
});

describe('reglament discovery route smoke', () => {
  it('serves every Task 4 public discovery route', async () => {
    const cases = [
      {
        name: 'markdown companion',
        load: () => import('../../pages/815/regulation/index.md'),
        contentType: 'text/markdown',
        marker: '# Калькулятор тарифа по смете 2026'
      },
      {
        name: 'json feed',
        load: () => import('../../pages/815/regulation/data/estimate-2026.json'),
        contentType: 'application/json',
        marker: '"id":"estimate-2026"'
      },
      {
        name: 'estimate details json feed',
        load: () => import('../../pages/815/regulation/data/estimate-details-2026.json'),
        contentType: 'application/json',
        marker: '"dataset_id":"estimate-details-2026"'
      },
      {
        name: 'full reglament markdown companion',
        load: () => import('../../pages/815/regulation/full.md'),
        contentType: 'text/markdown',
        marker: '# Полный регламент содержания Шелково'
      },
      {
        name: 'full reglament assets markdown companion',
        load: () => import('../../pages/815/regulation/full/assets.md'),
        contentType: 'text/markdown',
        marker: '# Полный регламент: общее имущество'
      },
      {
        name: 'reglament assets page markdown companion',
        load: () => import('../../pages/815/regulation/assets/index.md'),
        contentType: 'text/markdown',
        marker: '# Полный регламент: общее имущество'
      },
      {
        name: 'full reglament services markdown companion',
        load: () => import('../../pages/815/regulation/full/services.md'),
        contentType: 'text/markdown',
        marker: '# Полный регламент: услуги'
      },
      {
        name: 'reglament services page markdown companion',
        load: () => import('../../pages/815/regulation/services/index.md'),
        contentType: 'text/markdown',
        marker: '# Полный регламент: услуги'
      },
      {
        name: 'full reglament service map markdown companion',
        load: () => import('../../pages/815/regulation/full/service-map.md'),
        contentType: 'text/markdown',
        marker: '# Полный регламент: сопоставление услуг со сметой'
      },
      {
        name: 'full reglament checks markdown companion',
        load: () => import('../../pages/815/regulation/full/checks.md'),
        contentType: 'text/markdown',
        marker: '# Полный регламент: проверки и допущения'
      },
      {
        name: 'full reglament json feed',
        load: () => import('../../pages/815/regulation/data/full-2026.json'),
        contentType: 'application/json',
        marker: '"dataset_id":"full-reglament-2026"'
      },
      {
        name: 'short llms',
        load: () => import('../../pages/815/regulation/llms.txt'),
        contentType: 'text/plain',
        marker: '/815/regulation/data/full-2026.json'
      },
      {
        name: 'json schema',
        load: () => import('../../pages/815/regulation/schemas/estimate-2026.schema.json'),
        contentType: 'application/schema+json',
        marker: 'Estimate2026Payload'
      },
      {
        name: 'estimate details json schema',
        load: () => import('../../pages/815/regulation/schemas/estimate-details-2026.schema.json'),
        contentType: 'application/schema+json',
        marker: 'EstimateDetails2026Payload'
      },
      {
        name: 'openapi',
        load: () => import('../../pages/815/regulation/openapi/estimate-2026.openapi.json'),
        contentType: 'application/vnd.oai.openapi+json',
        marker: 'getReglamentEstimate2026'
      },
      {
        name: 'estimate details openapi',
        load: () => import('../../pages/815/regulation/openapi/estimate-details-2026.openapi.json'),
        contentType: 'application/vnd.oai.openapi+json',
        marker: 'getReglamentEstimateDetails2026'
      },
      {
        name: 'api catalog',
        load: () => import('../../pages/815/regulation/.well-known/api-catalog'),
        contentType: 'application/linkset+json',
        marker: '/815/regulation/data/full-2026.json'
      }
    ];

    for (const item of cases) {
      const route = await item.load();
      const response = await route.GET({} as never);
      const body = await response.text();

      expect(response.headers.get('Content-Type'), item.name).toContain(item.contentType);
      expect(body, item.name).toContain(item.marker);
    }
  });

  it('serves public full-reglament pages and exposes the full dataset route', async () => {
    const root = 'https://example.com';
    const interestingPaths = new Set([
      reglamentFull2026DataPath(),
      reglamentEstimateDetails2026DataPath(),
      reglamentFullAssetsMarkdownPath(),
      reglamentFullServicesMarkdownPath(),
      reglamentFullServiceMapMarkdownPath(),
      reglamentFullChecksMarkdownPath(),
      reglamentAssetsPath(),
      reglamentServicesPath(),
      new URL(reglamentFullSourcePdfUrl()).pathname
    ]);

    expect(
      publicCatalogSnapshot(root).filter((entry) =>
        interestingPaths.has(new URL(entry.href).pathname)
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "href": "https://example.com/815/regulation/full/assets.md",
          "title": "Markdown полного регламента: общее имущество",
          "type": "text/markdown",
        },
        {
          "href": "https://example.com/815/regulation/full/services.md",
          "title": "Markdown полного регламента: услуги",
          "type": "text/markdown",
        },
        {
          "href": "https://example.com/815/regulation/full/service-map.md",
          "title": "Markdown полного регламента: сопоставление услуг со сметой",
          "type": "text/markdown",
        },
        {
          "href": "https://example.com/815/regulation/full/checks.md",
          "title": "Markdown полного регламента: проверки и допущения",
          "type": "text/markdown",
        },
        {
          "href": "https://example.com/815/regulation/data/estimate-details-2026.json",
          "title": "Детальный машиночитаемый JSON сметы регламента 2026",
          "type": "application/json",
        },
        {
          "href": "https://example.com/815/regulation/data/full-2026.json",
          "title": "Набор данных полного регламента: имущество, услуги, сопоставления и заметки аудита",
          "type": "application/json",
        },
        {
          "href": "https://example.com/815/regulation/assets/",
          "title": "Страница общего имущества из полного регламента",
          "type": "text/html",
        },
        {
          "href": "https://example.com/815/regulation/services/",
          "title": "Страница услуг и сопоставления со сметой",
          "type": "text/html",
        },
        {
          "href": "https://media.kpshelkovo.online/815/regulation/full.pdf",
          "title": "Исходный PDF полного регламента",
          "type": "application/pdf",
        },
      ]
    `);
  });

  it('exposes estimate detail JSON and markdown surfaces for automated reading', async () => {
    const root = 'https://example.com';
    const apiCatalog = JSON.stringify(catalog(root));
    const shortLlmsRoute = await import('../../pages/815/regulation/llms.txt');
    const detailsRoute = await import('../../pages/815/regulation/details.md');
    const shortLlms = await (await shortLlmsRoute.GET({} as never)).text();
    const details = await (await detailsRoute.GET({} as never)).text();
    const detailPaths = [
      reglamentEstimateDetails2026DataPath(),
      reglamentEstimateDetailsMarkdownPath(),
      reglamentEstimateDetailsMaterialsMarkdownPath(),
      reglamentEstimateDetailsMachinesMarkdownPath(),
      reglamentEstimateDetailsLaborMarkdownPath(),
      reglamentEstimateDetailsChecksMarkdownPath()
    ] as const;
    const detailContractPaths = [
      reglamentEstimateDetails2026SchemaPath(),
      reglamentEstimateDetails2026OpenApiPath()
    ] as const;

    expect(shortLlms).toContain(reglamentEstimateDetailsMarkdownPath());
    for (const path of [...detailPaths, ...detailContractPaths]) {
      expect(reglamentPublicSurfaceSlice.surfaces.some((surface) => surface.path === path)).toBe(
        true
      );
      expect(apiCatalog).toContain(`${root}${path}`);
    }
    for (const path of detailPaths) {
      expect(`${shortLlms}\n${details}`).toContain(path);
    }
  });

  it('keeps source PDF URLs on the canonical media origin', () => {
    const pdfUrls = [reglamentFullSourcePdfUrl(), reglamentSourcePdfUrl('final')];

    expect(pdfUrls).toMatchInlineSnapshot(`
      [
        "https://media.kpshelkovo.online/815/regulation/full.pdf",
        "https://media.kpshelkovo.online/815/regulation/final.pdf",
      ]
    `);
  });

  it('explains the short UI tariff unit without renaming machine fields', async () => {
    const markdownRoute = await import('../../pages/815/regulation/index.md');
    const jsonRoute = await import('../../pages/815/regulation/data/estimate-2026.json');
    const markdown = await (await markdownRoute.GET({} as never)).text();
    const json = await (await jsonRoute.GET({} as never)).text();

    expect(markdown).toContain('В интерфейсе тариф показывается как ₽/сотка');
    expect(markdown).not.toContain('₽/сотка/мес');
    expect(json).toContain('tariff_per_sotka_month');
  });

  it('keeps public PDF URLs and S3 keys in public surfaces', async () => {
    const markdownRoute = await import('../../pages/815/regulation/index.md');
    const jsonRoute = await import('../../pages/815/regulation/data/estimate-2026.json');
    const markdown = await (await markdownRoute.GET({} as never)).text();
    const json = JSON.parse(await (await jsonRoute.GET({} as never)).text()) as {
      readonly source_refs: readonly {
        readonly pdf: string;
        readonly pdf_key: string;
        readonly pdf_url: string;
      }[];
    };

    expect(markdown).toContain('https://media.kpshelkovo.online/815/regulation/final.pdf');
    expect(json.source_refs[0]).toMatchObject({
      pdf: 'final',
      pdf_key: '815/regulation/final.pdf',
      pdf_url: 'https://media.kpshelkovo.online/815/regulation/final.pdf'
    });
  });
});
