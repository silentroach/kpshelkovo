import { beforeAll, describe, expect, it, vi } from 'vitest';

import { contentDateSchema } from '../content-date';
import { createPersonMentionTarget } from '../people/mentions';
import type { StatusIncidentEntry } from './load';
import type { StatusArea, StatusKind, StatusService } from './schema';

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

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildStatusDataset } = await import('./load'));
});

describe('buildStatusDataset', () => {
  it('derives incidents and service summaries', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/03/dam-flood-closure',
          title: 'Проезд через дамбу закрыт из-за паводка',
          service: 'dam',
          kind: 'incident',
          started_at: '15.03.2026',
          ended_at: '24.04.2026',
          body: 'Первый абзац.\nС новой строкой.\n\nВторой абзац.',
        }),
        entry({
          id: '2026/04/dam-closure-ongoing',
          title: 'Проезд через дамбу закрыт',
          service: 'dam',
          kind: 'incident',
          started_at: '27.04.2026',
        }),
        entry({
          id: '2026/05/electricity-river-outage',
          title: 'Отключение электричества в Шелково Ривер',
          service: 'electricity',
          kind: 'incident',
          started_at: '01.05.2026 07:32',
          ended_at: '01.05.2026 16:38',
          areas: ['river'],
        }),
        entry({
          id: '2026/05/water-filter-maintenance',
          title: 'Промывка фильтров водоснабжения',
          service: 'water',
          kind: 'maintenance',
          started_at: '02.05.2026 10:00',
        }),
      ],
      {
        now: new Date('2026-05-03T09:00:00+03:00'),
      },
    );

    expect(data.active.map((item) => item.id)).toEqual([
      '2026/05/water-filter-maintenance',
      '2026/04/dam-closure-ongoing',
    ]);
    expect(data.services.map((item) => item.service)).toEqual([
      'electricity',
      'water',
      'internet',
      'dam',
    ]);

    const damHistory = data.byId.get('2026/03/dam-flood-closure');

    expect(damHistory).toMatchObject({
      started: {
        iso: '2026-03-15T00:00:00+03:00',
        hasTime: false,
      },
      ended: {
        iso: '2026-04-24T00:00:00+03:00',
        hasTime: false,
      },
      appliesToAllAreas: true,
      excerpt: 'Первый абзац. С новой строкой.',
      duration: {
        totalMinutes: 57600,
      },
    });

    const electricity = data.byId.get('2026/05/electricity-river-outage');

    expect(electricity).toMatchObject({
      started: {
        hasTime: true,
      },
      ended: {
        hasTime: true,
      },
      appliesToAllAreas: false,
      areas: ['river'],
      duration: {
        totalMinutes: 546,
      },
    });

    expect(data.byService.get('dam')).toMatchObject({
      serviceStatus: 'red',
      daysWithoutIncidents: {
        mode: 'activeIncident',
      },
    });

    expect(data.byService.get('water')).toMatchObject({
      serviceStatus: 'amber',
      daysWithoutIncidents: {
        mode: 'noIncidents',
      },
    });

    expect(data.byService.get('internet')).toMatchObject({
      serviceStatus: 'green',
      daysWithoutIncidents: {
        mode: 'noIncidents',
      },
    });

    expect(data.byService.get('electricity')).toMatchObject({
      serviceStatus: 'green',
      daysWithoutIncidents: {
        mode: 'count',
        days: 2,
        lastEndedIso: '2026-05-01T16:38:00+03:00',
      },
    });
  });

  it('marks active incident, active maintenance, and closed incident separately', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/05/electricity-active-incident',
          title: 'Активный инцидент по электричеству',
          service: 'electricity',
          kind: 'incident',
          started_at: '03.05.2026 07:30',
        }),
        entry({
          id: '2026/05/water-active-maintenance',
          title: 'Активные работы по воде',
          service: 'water',
          kind: 'maintenance',
          started_at: '03.05.2026 09:00',
        }),
        entry({
          id: '2026/05/dam-closed-incident',
          title: 'Закрытый инцидент по дамбе',
          service: 'dam',
          kind: 'incident',
          started_at: '01.05.2026',
          ended_at: '02.05.2026',
        }),
      ],
      {
        now: new Date('2026-05-03T12:00:00+03:00'),
      },
    );

    expect(data.byId.get('2026/05/electricity-active-incident')?.phase).toBe(
      'active',
    );
    expect(data.byId.get('2026/05/water-active-maintenance')?.phase).toBe(
      'active',
    );
    expect(data.byId.get('2026/05/dam-closed-incident')?.phase).toBe(
      'resolved',
    );
  });

  it('does not mark future events as active before they start', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/05/water-planned-shutdown',
          title: 'Плановое отключение воды',
          service: 'water',
          kind: 'maintenance',
          started_at: '10.05.2026 10:00',
        }),
      ],
      {
        now: new Date('2026-05-03T09:00:00+03:00'),
      },
    );

    expect(data.active).toHaveLength(0);
    expect(data.byService.get('water')).toMatchObject({
      serviceStatus: 'green',
      daysWithoutIncidents: {
        mode: 'noIncidents',
      },
    });
  });

  it('resets quiet days only on incidents', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/05/electricity-restored',
          title: 'Электричество восстановлено',
          service: 'electricity',
          kind: 'incident',
          started_at: '01.05.2026 01:00',
          ended_at: '01.05.2026 05:00',
        }),
        entry({
          id: '2026/05/electricity-maintenance',
          title: 'Плановые работы по электричеству',
          service: 'electricity',
          kind: 'maintenance',
          started_at: '03.05.2026 12:00',
        }),
      ],
      {
        now: new Date('2026-05-04T09:00:00+03:00'),
      },
    );

    expect(data.byService.get('electricity')).toMatchObject({
      serviceStatus: 'amber',
      daysWithoutIncidents: {
        mode: 'count',
        days: 3,
        lastEndedIso: '2026-05-01T05:00:00+03:00',
      },
    });
  });

  it('extracts excerpt from the first paragraph only', () => {
    const data = buildStatusDataset([
      entry({
        id: '2026/05/electricity-excerpt',
        title: 'Инцидент с описанием',
        service: 'electricity',
        kind: 'incident',
        started_at: '01.05.2026 07:32',
        ended_at: '01.05.2026 16:38',
        body: 'Первый абзац.\nСо второй строкой.\n\nВторой абзац останется за пределами excerpt.',
      }),
    ]);

    expect(data.byId.get('2026/05/electricity-excerpt')?.excerpt).toBe(
      'Первый абзац. Со второй строкой.',
    );
  });

  it('adds detail URLs only to incidents with a non-empty body', () => {
    const data = buildStatusDataset([
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
        started_at: '02.05.2026 10:00',
        body: 'Первый абзац.',
      }),
      entry({
        id: '2026/05/water-whitespace-body',
        title: 'Запись с пустым body',
        service: 'water',
        kind: 'incident',
        started_at: '01.05.2026 10:00',
        body: ' \n ',
      }),
    ]);

    expect(
      data.incidents.map((item) => ({
        id: item.id,
        hasPage: item.hasPage,
        url: item.url,
        markdownUrl: item.markdownUrl,
        canonical: item.canonical,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "canonical": undefined,
          "hasPage": false,
          "id": "2026/05/water-no-page",
          "markdownUrl": undefined,
          "url": undefined,
        },
        {
          "canonical": "https://kpshelkovo.online/status/incidents/2026/05/water-with-page/",
          "hasPage": true,
          "id": "2026/05/water-with-page",
          "markdownUrl": "/status/incidents/2026/05/water-with-page/index.md",
          "url": "/status/incidents/2026/05/water-with-page/",
        },
        {
          "canonical": undefined,
          "hasPage": false,
          "id": "2026/05/water-whitespace-body",
          "markdownUrl": undefined,
          "url": undefined,
        },
      ]
    `);
  });

  it('keeps excerpts plain-text after mention expansion', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/05/electricity-mention-excerpt',
          title: 'Инцидент с комментарием',
          service: 'electricity',
          kind: 'incident',
          started_at: '01.05.2026 07:32',
          body: 'Как отметил @kschemelinin, повреждение было редким.\n\nВторой абзац.',
        }),
      ],
      {
        mentionRegistry: new Map([
          [
            'kschemelinin',
            createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
          ],
        ]),
      },
    );

    expect(data.byId.get('2026/05/electricity-mention-excerpt')).toMatchObject({
      body: 'Как отметил [Кирилл Щемелинин](/people/kschemelinin/), повреждение было редким.\n\nВторой абзац.',
      excerpt: 'Как отметил Кирилл Щемелинин, повреждение было редким.',
    });
  });

  it('normalizes labelled mentions and keeps excerpts human-readable', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/05/electricity-labelled-mention',
          title: 'Инцидент с комментарием',
          service: 'electricity',
          kind: 'incident',
          started_at: '01.05.2026 07:32',
          body: 'После [осмотра линии](@kschemelinin) повреждение признали редким.\n\nВторой абзац.',
        }),
      ],
      {
        mentionRegistry: new Map([
          [
            'kschemelinin',
            createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
          ],
        ]),
      },
    );

    expect(data.byId.get('2026/05/electricity-labelled-mention')).toMatchObject(
      {
        body: 'После [осмотра линии](/people/kschemelinin/) повреждение признали редким.\n\nВторой абзац.',
        excerpt: 'После осмотра линии повреждение признали редким.',
        mentions: [
          {
            slug: 'kschemelinin',
          },
        ],
      },
    );
    expect(
      data.byId.get('2026/05/electricity-labelled-mention')?.excerpt,
    ).not.toContain('@kschemelinin');
  });

  it('prefers incidents over maintenance when deriving service status', () => {
    const data = buildStatusDataset(
      [
        entry({
          id: '2026/05/water-maintenance',
          title: 'Плановые работы по воде',
          service: 'water',
          kind: 'maintenance',
          started_at: '03.05.2026 08:00',
        }),
        entry({
          id: '2026/05/water-incident',
          title: 'Авария по воде',
          service: 'water',
          kind: 'incident',
          started_at: '03.05.2026 09:00',
        }),
      ],
      {
        now: new Date('2026-05-03T12:00:00+03:00'),
      },
    );

    expect(data.byService.get('water')).toMatchObject({
      serviceStatus: 'red',
    });
  });

  it('rejects incidents that end before they start', () => {
    expect(() =>
      buildStatusDataset([
        entry({
          id: '2026/05/invalid',
          title: 'Некорректный инцидент',
          service: 'dam',
          kind: 'incident',
          started_at: '02.05.2026 10:00',
          ended_at: '02.05.2026 09:59',
        }),
      ]),
    ).toThrow('ended_at cannot be earlier than started_at');
  });

  it('does not reuse the fallback mention registry between builds', async () => {
    vi.resetModules();
    vi.doMock('../markdown/render', () => ({
      preprocessSiteMarkdownContent: (
        markdown: string,
        _context: string,
        registry: Map<string, unknown>,
      ) => {
        const alreadyMutated = registry.has('leaked');

        registry.set(
          'leaked',
          createPersonMentionTarget('leaked', 'Утекшее упоминание'),
        );

        return {
          markdown: alreadyMutated ? 'fallback registry leaked' : markdown,
          mentions: [],
        };
      },
    }));

    try {
      const { buildStatusDataset: buildWithMockedPreprocessor } =
        await import('./load');

      buildWithMockedPreprocessor([
        entry({
          id: '2026/05/first',
          title: 'Первый инцидент',
          service: 'electricity',
          kind: 'incident',
          started_at: '01.05.2026',
          body: 'Первый body.',
        }),
      ]);

      const data = buildWithMockedPreprocessor([
        entry({
          id: '2026/05/second',
          title: 'Второй инцидент',
          service: 'electricity',
          kind: 'incident',
          started_at: '02.05.2026',
          body: 'Второй body.',
        }),
      ]);

      expect(data.incidents[0]?.body).toBe('Второй body.');
    } finally {
      vi.doUnmock('../markdown/render');
      vi.resetModules();
    }
  });
});
