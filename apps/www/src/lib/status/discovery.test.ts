import { beforeAll, describe, expect, it } from 'vitest';

import { contentDateSchema } from '@/lib/content-date';
import type { StatusIncidentEntry } from './load';
import type { StatusArea, StatusKind, StatusService } from './schema';
import type {
  PublicSurfaceSlice,
  statusPublicSurfaceSlice as statusPublicSurfaceSliceType,
} from '@/lib/public-surface';
import type { expectSectionCatalogMatchesRegistry as expectSectionCatalogMatchesRegistryType } from '@/lib/public-surface/catalog-contract.test-helper';

interface EntryInput {
  readonly id: string;
  readonly title: string;
  readonly service: StatusService;
  readonly kind: StatusKind;
  readonly started_at: string;
  readonly ended_at?: string;
  readonly areas?: readonly StatusArea[];
  readonly source_url?: string;
  readonly body?: string;
}

const testDate = contentDateSchema('test date');

const entry = (input: EntryInput): StatusIncidentEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    title: input.title,
    service: input.service,
    kind: input.kind,
    started_at: testDate.parse(input.started_at),
    ended_at: input.ended_at ? testDate.parse(input.ended_at) : undefined,
    areas: input.areas ? [...input.areas] : undefined,
    source_url: input.source_url ?? `https://example.com/${input.id}`,
  },
});

let buildStatusDataset: typeof import('./load').buildStatusDataset;
let buildStatusPublicPayload: typeof import('./public-dto').buildStatusPublicPayload;
let catalog: typeof import('./discovery').catalog;
let expectSectionCatalogMatchesRegistry: typeof expectSectionCatalogMatchesRegistryType;
let statusSchema: typeof import('./discovery').schema;
let statusPublicSurfaceSlice: typeof statusPublicSurfaceSliceType &
  PublicSurfaceSlice;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildStatusDataset } = await import('./load'));
  ({ catalog, schema: statusSchema } = await import('./discovery'));
  ({ buildStatusPublicPayload } = await import('./public-dto'));
  ({ expectSectionCatalogMatchesRegistry } =
    await import('@/lib/public-surface/catalog-contract.test-helper'));
  ({ statusPublicSurfaceSlice } = await import('@/lib/public-surface'));
});

describe('status API catalog', () => {
  it('keeps the section API catalog aligned with registry catalog surfaces', () => {
    expectSectionCatalogMatchesRegistry({
      catalog,
      siteRoot: 'https://example.com',
      slice: statusPublicSurfaceSlice,
    });
  });
});

describe('buildStatusPublicPayload', () => {
  it('leaves incident detail URLs undefined when no detail page is published', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/05/water-no-page',
          title: 'Краткая запись без body',
          service: 'water',
          kind: 'incident',
          started_at: '03.05.2026 10:00',
        }),
        entry({
          id: '2026/05/water-with-page',
          title: 'Подробная запись с body',
          service: 'water',
          kind: 'maintenance',
          started_at: '01.05.2026 10:00',
          body: 'Первый абзац.',
        }),
      ],
      {
        now: new Date('2026-05-03T12:00:00+03:00'),
      },
    );

    const payload = buildStatusPublicPayload(data);
    const noPage = payload.incidents.find(
      (item) => item.id === '2026/05/water-no-page',
    );
    const withPage = payload.incidents.find(
      (item) => item.id === '2026/05/water-with-page',
    );
    const water = payload.services.find((item) => item.service === 'water');

    expect(noPage).toBeDefined();
    expect(noPage?.html_url).toBeUndefined();
    expect(noPage?.markdown_url).toBeUndefined();

    expect(withPage).toMatchObject({
      html_url: 'https://example.com/status/incidents/2026/05/water-with-page/',
      markdown_url:
        'https://example.com/status/incidents/2026/05/water-with-page/index.md',
    });

    expect(water?.latest_incident).toMatchObject({
      id: '2026/05/water-no-page',
      title: 'Краткая запись без body',
    });
    expect(water?.latest_incident?.html_url).toBeUndefined();
    expect(water?.latest_incident?.markdown_url).toBeUndefined();
  });

  it('marks incident detail URLs as optional in the schema', () => {
    const defs = (statusSchema('https://example.com')['$defs'] ?? {}) as Record<
      string,
      { readonly required?: readonly string[] }
    >;

    expect(defs.incidentRef?.required).not.toContain('html_url');
    expect(defs.incidentRef?.required).not.toContain('markdown_url');
    expect(defs.incident?.required).not.toContain('html_url');
    expect(defs.incident?.required).not.toContain('markdown_url');
  });
});
