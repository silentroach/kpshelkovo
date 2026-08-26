import { describe, expect, it } from 'vitest';

import {
  createPublicSurfaceRegistry,
  kbPublicSurfaceSlice,
  publicSurfaceRegistry,
  surfaceHref,
  surfaceToLinksetItem,
} from './index';
import {
  compareApiCatalogPath,
  compareExplorerDataPath,
  compareLlmsFullPath,
  compareLlmsPath,
  compareMarkdownPath,
  compareOpenApiPath,
  comparePath,
  comparePublicSurfaceSlice,
  compareRatingMarkdownPath,
  compareRatingPath,
  compareSchemaPath,
  compareSettlementMarkdownPattern,
  compareSettlementPattern,
  compareSettlementsDataPath,
  compareSkillsPath,
} from '@/compare/lib/public-surface';
import {
  contactCategoryMarkdownPattern,
  contactCategoryPattern,
  contactMarkdownPattern,
  contactPattern,
  contactVcfPattern,
  contactsMarkdownPath,
  contactsPath,
} from '@/lib/contacts/routes';
import { catalog } from '@/lib/discovery';
import {
  discomfortMarkdownPath,
  discomfortPath,
} from '@/lib/discomfort/routes';
import {
  kbDetailMarkdownPattern,
  kbDetailPattern,
  kbMarkdownPath,
  kbPath,
} from '@/lib/kb/routes';
import {
  apiCatalogPath as newsApiCatalogPath,
  articleMarkdownPattern,
  articlePattern,
  articlesDataPath,
  articlesOpenApiPath,
  articlesSchemaPath,
  feedPath as newsFeedPath,
  llmsFullPath as newsLlmsFullPath,
  llmsPath as newsLlmsPath,
  newsArchiveMarkdownPath,
  newsArchivePath,
  newsMarkdownPath,
  newsPath,
} from '@/lib/news/routes';
import {
  meetingMarkdownPattern,
  meetingPattern,
  meetingsMarkdownPath,
  meetingTranscriptPartMarkdownPattern,
} from '@/lib/meetings/routes';
import {
  peopleApiCatalogPath,
  peopleDataPath,
  peopleLlmsFullPath,
  peopleLlmsPath,
  peopleMarkdownPath,
  peopleOpenApiPath,
  peopleSchemaPath,
  personMarkdownPattern,
  personPattern,
} from '@/lib/people/routes';
import {
  placeMarkdownPattern,
  placePattern,
  placesDataPath,
  placesMarkdownPath,
  placesPath,
} from '@/lib/places/routes';
import {
  reviewMarkdownPattern,
  reviewPattern,
  reviewsMarkdownPath,
  reviewsPath,
  reviewsRulesMarkdownPath,
  reviewsRulesPath,
} from '@/lib/reviews/routes';
import { reglamentPublicSurfaceSlice } from '@/lib/reglament/public-surface';
import {
  REGLAMENT_PUBLIC_PATHS,
  REGLAMENT_SOURCE_PDF_URLS,
  reglamentFullSourcePdfUrl,
} from '@/lib/reglament/routes';
import {
  statusApiCatalogPath,
  statusDataPath,
  statusFeedPath,
  statusHistoryPath,
  statusIncidentMarkdownPattern,
  statusIncidentPattern,
  statusLlmsFullPath,
  statusLlmsPath,
  statusMarkdownPath,
  statusOpenApiPath,
  statusPath,
  statusSchemaPath,
  statusServiceMarkdownPattern,
  statusServicePattern,
} from '@/lib/status/routes';
import {
  siteApiCatalogPath,
  siteLlmsFullPath,
  siteLlmsPath,
  siteMarkdownPath,
} from '@/lib/llms';
import { siteSkillsPath } from '@/lib/skills';
import type { PublicSurfaceSlice } from './types';

const newsSlice: PublicSurfaceSlice = {
  owner: {
    id: 'news',
    label: 'Новости',
    entryPath: '/news/',
  },
  surfaces: [
    {
      id: 'news:index',
      label: 'Новости',
      path: '/news/',
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
    },
    {
      id: 'news:article',
      label: 'Страница новости',
      routePattern: '/news/:year/:month/:entry/',
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
      catalogRole: 'item',
      linkRelations: [
        {
          rel: 'alternate',
          href: '/news/:year/:month/:entry/index.md',
          mediaType: 'text/markdown',
        },
      ],
      acceptsNegotiation: 'not-negotiated',
    },
  ],
};

const compareSlice: PublicSurfaceSlice = {
  owner: {
    id: 'compare',
    label: 'Сравнение поселков',
    entryPath: '/815/compare/',
  },
  surfaces: [
    {
      id: 'compare:data',
      label: 'Dataset сравнения',
      path: '/815/compare/data/settlements.json',
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['data-feed', 'root-catalog'],
      catalogRole: 'item',
      linkRelations: [
        { rel: 'api-catalog', href: '/815/compare/.well-known/api-catalog' },
      ],
      acceptsNegotiation: 'not-negotiated',
    },
  ],
};

describe('public surface registry', () => {
  it('preserves slice and surface order for valid fragments', () => {
    const registry = createPublicSurfaceRegistry([newsSlice, compareSlice]);

    expect({
      slices: registry.slices.map((slice) => slice.owner.id),
      sections: registry.sections.map((owner) => owner.id),
      surfaces: registry.surfaces.map((surface) => surface.id),
      newsSurfaces: registry
        .surfacesByOwner('news')
        .map((surface) => surface.id),
      compareDataOwner: registry.surfaceOwner('compare:data')?.id,
    }).toMatchInlineSnapshot(`
      {
        "compareDataOwner": "compare",
        "newsSurfaces": [
          "news:index",
          "news:article",
        ],
        "sections": [
          "news",
          "compare",
        ],
        "slices": [
          "news",
          "compare",
        ],
        "surfaces": [
          "news:index",
          "news:article",
          "compare:data",
        ],
      }
    `);
  });

  it('rejects duplicate owner ids', () => {
    const conflictingOwnerSlice: PublicSurfaceSlice = {
      owner: {
        id: 'news',
        label: 'Другой раздел',
      },
      surfaces: compareSlice.surfaces,
    };

    expect(() =>
      createPublicSurfaceRegistry([newsSlice, conflictingOwnerSlice]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: duplicate public surface owner id "news"]`,
    );
  });

  it('rejects duplicate surface ids across owners', () => {
    const conflictingSurfaceSlice: PublicSurfaceSlice = {
      owner: compareSlice.owner,
      surfaces: newsSlice.surfaces,
    };

    expect(() =>
      createPublicSurfaceRegistry([newsSlice, conflictingSurfaceSlice]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: duplicate public surface id "news:index"]`,
    );
  });

  it('keeps path and route-pattern surfaces linkset-friendly', () => {
    const registry = createPublicSurfaceRegistry([newsSlice, compareSlice]);
    const [indexSurface, articleSurface, dataSurface] = registry.surfaces;

    expect(
      indexSurface && surfaceHref('https://example.com/base', indexSurface),
    ).toBe('https://example.com/base/news/');
    expect(
      articleSurface && surfaceHref('https://example.com/base', articleSurface),
    ).toBe('/news/:year/:month/:entry/');
    expect(
      dataSurface &&
        surfaceToLinksetItem('https://example.com/base', dataSurface),
    ).toEqual({
      href: 'https://example.com/base/815/compare/data/settlements.json',
      type: 'application/json',
      rel: ['api-catalog'],
      title: 'Dataset сравнения',
    });
  });

  it('registers root public surfaces', () => {
    const rootPaths = publicSurfaceRegistry
      .surfacesByOwner('root')
      .map((surface) =>
        'path' in surface ? surface.path : surface.routePattern,
      );

    expect(rootPaths).toEqual([
      '/',
      siteMarkdownPath(),
      siteLlmsPath(),
      siteLlmsFullPath(),
      siteApiCatalogPath(),
      siteSkillsPath(),
    ]);
  });

  it('registers kb HTML and markdown surfaces from kb route helpers', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('kb');
    const byId = new Map(surfaces.map((surface) => [surface.id, surface]));
    const surfaceIds = surfaces.map((surface) => surface.id);
    const forbiddenIds = [
      'kb:data',
      'kb:schema',
      'kb:openapi',
      'kb:llms',
      'kb:llms-full',
    ];
    const rootCatalog = catalog('https://example.com/sub') as {
      readonly linkset: readonly { readonly anchor?: string }[];
    };

    expect(kbPublicSurfaceSlice.owner).toEqual({
      id: 'kb',
      label: 'База знаний',
      entryPath: kbPath(),
    });
    expect(publicSurfaceRegistry.surfaceOwner('kb:index')).toEqual(
      kbPublicSurfaceSlice.owner,
    );
    expect(surfaceIds).toEqual([
      'kb:index',
      'kb:index-markdown',
      'kb:page',
      'kb:page-markdown',
    ]);
    expect(byId.get('kb:index')).toMatchObject({
      path: kbPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
    });
    expect(byId.get('kb:index-markdown')).toMatchObject({
      path: kbMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item',
    });
    expect(byId.get('kb:page')).toMatchObject({
      routePattern: kbDetailPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
    });
    expect(byId.get('kb:page')).not.toHaveProperty('catalogRole');
    expect(byId.get('kb:page-markdown')).toMatchObject({
      routePattern: kbDetailMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
    });
    expect(byId.get('kb:page-markdown')).not.toHaveProperty('catalogRole');
    expect(surfaceIds).not.toEqual(expect.arrayContaining(forbiddenIds));
    expect(rootCatalog.linkset).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ anchor: 'https://example.com/sub/kb/' }),
      ]),
    );
  });

  it('registers news surfaces from news route helpers', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('news');
    const byId = new Map(surfaces.map((surface) => [surface.id, surface]));

    expect(byId.get('news:index')).toMatchObject({ path: newsPath() });
    expect(byId.get('news:index-markdown')).toMatchObject({
      path: newsMarkdownPath(),
    });
    expect(byId.get('news:archive')).toMatchObject({
      path: newsArchivePath(),
    });
    expect(byId.get('news:archive-markdown')).toMatchObject({
      path: newsArchiveMarkdownPath(),
    });
    expect(byId.get('news:article')).toMatchObject({
      routePattern: articlePattern(),
    });
    expect(byId.get('news:article-markdown')).toMatchObject({
      routePattern: articleMarkdownPattern(),
    });
    expect(byId.get('news:data')).toMatchObject({ path: articlesDataPath() });
    expect(byId.get('news:rss')).toMatchObject({ path: newsFeedPath() });
    expect(byId.get('news:schema')).toMatchObject({
      path: articlesSchemaPath(),
    });
    expect(byId.get('news:openapi')).toMatchObject({
      path: articlesOpenApiPath(),
    });
    expect(byId.get('news:api-catalog')).toMatchObject({
      path: newsApiCatalogPath(),
    });
    expect(byId.get('news:llms')).toMatchObject({ path: newsLlmsPath() });
    expect(byId.get('news:llms-full')).toMatchObject({
      path: newsLlmsFullPath(),
    });
  });

  it('registers status surfaces from status route helpers', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('status');
    const byId = new Map(surfaces.map((surface) => [surface.id, surface]));

    expect(byId.get('status:index')).toMatchObject({ path: statusPath() });
    expect(byId.get('status:index-markdown')).toMatchObject({
      path: statusMarkdownPath(),
    });
    expect(byId.get('status:history')).toMatchObject({
      path: statusHistoryPath(),
      linkRelations: [
        {
          rel: 'alternate',
          href: statusMarkdownPath(),
          mediaType: 'text/markdown',
        },
      ],
      acceptsNegotiation: 'required',
    });
    expect(byId.get('status:service')).toMatchObject({
      routePattern: statusServicePattern(),
    });
    expect(byId.get('status:service-markdown')).toMatchObject({
      routePattern: statusServiceMarkdownPattern(),
    });
    expect(byId.get('status:incident')).toMatchObject({
      routePattern: statusIncidentPattern(),
    });
    expect(byId.get('status:incident')).toMatchObject({
      routePattern: '/status/incidents/:year/:month/:entry/',
    });
    expect(byId.get('status:incident-markdown')).toMatchObject({
      routePattern: statusIncidentMarkdownPattern(),
    });
    expect(byId.get('status:incident-markdown')).toMatchObject({
      routePattern: '/status/incidents/:year/:month/:entry/index.md',
    });
    expect(byId.get('status:data')).toMatchObject({ path: statusDataPath() });
    expect(byId.get('status:rss')).toMatchObject({ path: statusFeedPath() });
    expect(byId.get('status:schema')).toMatchObject({
      path: statusSchemaPath(),
    });
    expect(byId.get('status:openapi')).toMatchObject({
      path: statusOpenApiPath(),
    });
    expect(byId.get('status:api-catalog')).toMatchObject({
      path: statusApiCatalogPath(),
    });
    expect(byId.get('status:llms')).toMatchObject({ path: statusLlmsPath() });
    expect(byId.get('status:llms-full')).toMatchObject({
      path: statusLlmsFullPath(),
    });
  });

  it('registers meetings Markdown entry without a public HTML index', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('meetings');
    const byId = new Map(surfaces.map((surface) => [surface.id, surface]));
    const owner = publicSurfaceRegistry.surfaceOwner('meetings:detail');
    const index = byId.get('meetings:index-markdown');
    const detail = byId.get('meetings:detail');

    expect(surfaces).toHaveLength(4);
    expect(owner).toEqual({
      id: 'meetings',
      label: 'Архив встреч',
      entryPath: meetingsMarkdownPath(),
    });
    expect(
      surfaces.some(
        (surface) => 'path' in surface && surface.path === '/meetings/',
      ),
    ).toBe(false);
    expect(index).toMatchObject({
      id: 'meetings:index-markdown',
      path: meetingsMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['section-entry', 'markdown-companion'],
      catalogRole: 'anchor',
    });
    expect(detail).toMatchObject({
      id: 'meetings:detail',
      label: 'Страница транскрипции встречи',
      routePattern: meetingPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
    });
    expect(byId.get('meetings:detail-markdown')).toMatchObject({
      routePattern: meetingMarkdownPattern(),
      discoveryRoles: ['markdown-companion'],
    });
    expect(byId.get('meetings:transcript-part-markdown')).toMatchObject({
      routePattern: meetingTranscriptPartMarkdownPattern(),
      discoveryRoles: ['markdown-companion'],
    });
    expect(detail).not.toHaveProperty('catalogRole');
    expect(detail).not.toHaveProperty('linkRelations');
    expect(detail).not.toHaveProperty('acceptsNegotiation');
    expect(
      publicSurfaceRegistry.surfaces.some(
        (surface) => 'path' in surface && surface.path === '/meetings/',
      ),
    ).toBe(false);
  });

  it('registers people Markdown index without a public HTML index', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('people');
    const byId = new Map(surfaces.map((surface) => [surface.id, surface]));

    expect(
      surfaces.some(
        (surface) => 'path' in surface && surface.path === '/people/',
      ),
    ).toBe(false);
    expect(byId.get('people:index-markdown')).toMatchObject({
      path: peopleMarkdownPath(),
      discoveryRoles: ['section-entry', 'markdown-companion'],
    });
    expect(byId.get('people:profile')).toMatchObject({
      routePattern: personPattern(),
    });
    expect(byId.get('people:profile-markdown')).toMatchObject({
      routePattern: personMarkdownPattern(),
    });
    expect(byId.get('people:data')).toMatchObject({ path: peopleDataPath() });
    expect(byId.get('people:schema')).toMatchObject({
      path: peopleSchemaPath(),
    });
    expect(byId.get('people:openapi')).toMatchObject({
      path: peopleOpenApiPath(),
    });
    expect(byId.get('people:api-catalog')).toMatchObject({
      path: peopleApiCatalogPath(),
    });
    expect(byId.get('people:llms')).toMatchObject({ path: peopleLlmsPath() });
    expect(byId.get('people:llms-full')).toMatchObject({
      path: peopleLlmsFullPath(),
    });
  });

  it('registers reviews HTML and Markdown surfaces without feeds or schemas', () => {
    const reviews = publicSurfaceRegistry.surfacesByOwner('reviews');

    expect(reviews.map((surface) => surface.id)).toEqual([
      'reviews:index',
      'reviews:index-markdown',
      'reviews:rules',
      'reviews:rules-markdown',
      'reviews:review',
      'reviews:review-markdown',
    ]);
    expect(
      reviews.map((surface) =>
        'path' in surface ? surface.path : surface.routePattern,
      ),
    ).toEqual([
      reviewsPath(),
      reviewsMarkdownPath(),
      reviewsRulesPath(),
      reviewsRulesMarkdownPath(),
      reviewPattern(),
      reviewMarkdownPattern(),
    ]);
    expect(
      reviews.some((surface) => surface.discoveryRoles.includes('data-feed')),
    ).toBe(false);
    expect(
      reviews.some((surface) => surface.discoveryRoles.includes('schema')),
    ).toBe(false);
    expect(
      reviews.some((surface) => surface.discoveryRoles.includes('llms')),
    ).toBe(false);
  });

  it('registers the Discomfort HTML and Markdown surfaces', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('discomfort');

    expect(
      surfaces.map((surface) => ({
        id: surface.id,
        path: 'path' in surface ? surface.path : surface.routePattern,
        roles: surface.discoveryRoles,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "discomfort:index",
          "path": "/815/discomfort/",
          "roles": [
            "section-entry",
          ],
        },
        {
          "id": "discomfort:index-markdown",
          "path": "/815/discomfort/index.md",
          "roles": [
            "markdown-companion",
          ],
        },
      ]
    `);
    expect(surfaces.map((surface) => surface.path)).toEqual([
      discomfortPath(),
      discomfortMarkdownPath(),
    ]);
  });

  it('registers contacts HTML, Markdown and vCard surfaces without feeds or APIs', () => {
    const contacts = publicSurfaceRegistry.surfacesByOwner('contacts');
    const rootCatalog = catalog('https://example.com/sub') as {
      readonly linkset: readonly {
        readonly anchor?: string;
        readonly item?: readonly { readonly href: string }[];
      }[];
    };
    const contactsEntry = rootCatalog.linkset.find(
      (entry) => entry.anchor === 'https://example.com/sub/sarafan/',
    );

    expect(contacts.map((surface) => surface.id)).toEqual([
      'contacts:index',
      'contacts:index-markdown',
      'contacts:category',
      'contacts:category-markdown',
      'contacts:contact',
      'contacts:contact-markdown',
      'contacts:contact-vcard',
    ]);
    expect(
      contacts.map((surface) =>
        'path' in surface ? surface.path : surface.routePattern,
      ),
    ).toEqual([
      contactsPath(),
      contactsMarkdownPath(),
      contactCategoryPattern(),
      contactCategoryMarkdownPattern(),
      contactPattern(),
      contactMarkdownPattern(),
      contactVcfPattern(),
    ]);
    expect(contactsEntry?.item).toEqual([
      expect.objectContaining({
        href: 'https://example.com/sub/sarafan/index.md',
      }),
    ]);
    expect(
      contacts.some((surface) => surface.discoveryRoles.includes('data-feed')),
    ).toBe(false);
    expect(
      contacts.some((surface) => surface.discoveryRoles.includes('schema')),
    ).toBe(false);
    expect(contacts.map((surface) => surface.id)).not.toEqual(
      expect.arrayContaining(['contacts:openapi', 'contacts:rss']),
    );
    expect(
      contacts.some((surface) => surface.discoveryRoles.includes('llms')),
    ).toBe(false);
  });

  it('registers places HTML, Markdown, and map data surfaces', () => {
    const places = publicSurfaceRegistry.surfacesByOwner('places');

    expect(places.map((surface) => surface.id)).toEqual([
      'places:index',
      'places:index-markdown',
      'places:data',
      'places:detail',
      'places:detail-markdown',
    ]);
    expect(
      places.map((surface) =>
        'path' in surface ? surface.path : surface.routePattern,
      ),
    ).toEqual([
      placesPath(),
      placesMarkdownPath(),
      placesDataPath(),
      placePattern(),
      placeMarkdownPattern(),
    ]);
    expect(
      places.some((surface) => surface.discoveryRoles.includes('data-feed')),
    ).toBe(true);
  });

  it('registers every reglament public path from the reglament-owned slice', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('reglament');

    expect(
      surfaces.map((surface) => ('path' in surface ? surface.path : '')),
    ).toEqual([
      ...REGLAMENT_PUBLIC_PATHS,
      reglamentFullSourcePdfUrl(),
      ...REGLAMENT_SOURCE_PDF_URLS,
    ]);
    expect(
      publicSurfaceRegistry.surfaceOwner('reglament:data-estimate-2026'),
    ).toEqual(reglamentPublicSurfaceSlice.owner);
  });

  it('registers compare surfaces from the compare-owned slice', () => {
    const surfaces = publicSurfaceRegistry.surfacesByOwner('compare');
    const byId = new Map(surfaces.map((surface) => [surface.id, surface]));

    expect(
      publicSurfaceRegistry.surfaceOwner('compare:data-settlements'),
    ).toEqual(comparePublicSurfaceSlice.owner);
    expect(byId.get('compare:index')).toMatchObject({
      path: comparePath(),
    });
    expect(byId.get('compare:rating')).toMatchObject({
      path: compareRatingPath(),
    });
    expect(byId.get('compare:settlement')).toMatchObject({
      routePattern: compareSettlementPattern(),
    });
    expect(byId.get('compare:index-markdown')).toMatchObject({
      path: compareMarkdownPath(),
    });
    expect(byId.get('compare:rating-markdown')).toMatchObject({
      path: compareRatingMarkdownPath(),
    });
    expect(byId.get('compare:settlement-markdown')).toMatchObject({
      routePattern: compareSettlementMarkdownPattern(),
    });
    expect(byId.get('compare:data-settlements')).toMatchObject({
      path: compareSettlementsDataPath(),
    });
    expect(byId.get('compare:data-explorer')).toMatchObject({
      path: compareExplorerDataPath(),
    });
    expect(byId.get('compare:schema')).toMatchObject({
      path: compareSchemaPath(),
    });
    expect(byId.get('compare:openapi')).toMatchObject({
      path: compareOpenApiPath(),
    });
    expect(byId.get('compare:api-catalog')).toMatchObject({
      path: compareApiCatalogPath(),
    });
    expect(byId.get('compare:llms')).toMatchObject({
      path: compareLlmsPath(),
    });
    expect(byId.get('compare:llms-full')).toMatchObject({
      path: compareLlmsFullPath(),
    });
    expect(byId.get('compare:skills')).toMatchObject({
      path: compareSkillsPath(),
    });
  });
});
