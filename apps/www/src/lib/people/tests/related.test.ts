import { beforeAll, describe, expect, it } from 'vitest';

import { selectPersonRelatedMaterials } from '@/lib/people/related';
import { PERSON_MENTION_SECTIONS } from '@/lib/people/schema';
import type {
  PersonBacklinks,
  PersonMentionRef,
  PersonMentionSection,
  PersonProfile
} from '@/lib/people/types';

let buildPersonMarkdown: typeof import('@/lib/people/view').buildPersonMarkdown;
let buildPeoplePublicPayload: typeof import('@/lib/people/public-dto').buildPeoplePublicPayload;

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  ({ buildPersonMarkdown } = await import('@/lib/people/view'));
  ({ buildPeoplePublicPayload } = await import('@/lib/people/public-dto'));
});

const ref = (
  section: PersonMentionSection,
  sourceId: string,
  mentionedAt?: string,
  title = sourceId
): PersonMentionRef => ({
  section,
  kind: (
    {
      news: 'article',
      events: 'event',
      status: 'incident',
      reviews: 'review',
      places: 'place',
      people: 'person',
      contacts: 'contact'
    } as const
  )[section],
  sourceId,
  title,
  htmlUrl: `/${section}/${sourceId}/`,
  markdownUrl: `/${section}/${sourceId}/index.md`,
  mentionedAt
});

const backlinks = (...refs: readonly PersonMentionRef[]): PersonBacklinks => ({
  news: refs.filter((item) => item.section === 'news'),
  events: refs.filter((item) => item.section === 'events'),
  status: refs.filter((item) => item.section === 'status'),
  reviews: refs.filter((item) => item.section === 'reviews'),
  places: refs.filter((item) => item.section === 'places'),
  people: refs.filter((item) => item.section === 'people'),
  contacts: refs.filter((item) => item.section === 'contacts')
});

describe('selectPersonRelatedMaterials', () => {
  it.each(PERSON_MENTION_SECTIONS)('includes the %s section in a short selection', (section) => {
    const item = ref(section, 'single');
    const selected = selectPersonRelatedMaterials(backlinks(item));

    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(item);
  });

  it('limits the merged chronology to six without section quotas', () => {
    const input = backlinks(
      ...Array.from({ length: 7 }, (_, index) =>
        ref('news', `news-${index}`, `2026-01-0${index + 1}T00:00:00Z`)
      ),
      ref('contacts', 'updated', '2026-02-01T00:00:00Z')
    );

    expect(selectPersonRelatedMaterials(input).map((item) => item.sourceId)).toMatchInlineSnapshot(`
      [
        "updated",
        "news-6",
        "news-5",
        "news-4",
        "news-3",
        "news-2",
      ]
    `);
  });

  it('uses source dates including contact updates, not a status last-change sortKey', () => {
    const input = backlinks(
      ref('news', 'news', '2026-05-01T09:00:00+03:00'),
      {
        ...ref('status', 'old-status', '2026-04-01T00:00:00Z'),
        sortKey: Date.parse('2026-12-01T00:00:00Z')
      },
      ref('contacts', 'updated-contact', '2026-05-02T00:00:00Z'),
      ref('reviews', 'review', '2026-05-01T07:00:00Z'),
      ref('events', 'future-event', '2027-01-01T00:00:00Z')
    );

    expect(selectPersonRelatedMaterials(input).map((item) => item.sourceId)).toMatchInlineSnapshot(`
      [
        "future-event",
        "updated-contact",
        "review",
        "news",
        "old-status",
      ]
    `);
  });

  it('places undated people and places after dated materials, even before the Unix epoch', () => {
    const input = backlinks(
      ref('places', 'place', undefined, 'Альфа'),
      ref('people', 'person', undefined, 'Бета'),
      ref('news', 'before-epoch', '1960-01-01T00:00:00Z'),
      ref('status', 'epoch', '1970-01-01T00:00:00Z')
    );

    expect(selectPersonRelatedMaterials(input).map((item) => item.sourceId)).toMatchInlineSnapshot(`
      [
        "epoch",
        "before-epoch",
        "place",
        "person",
      ]
    `);
  });

  it.each([undefined, '2026-05-01T00:00:00Z'])(
    'breaks equal dates (%s) by Russian title, section and sourceId',
    (date) => {
      const input = backlinks(
        ref('status', 'я', date, 'Бета'),
        ref('news', 'я', date, 'Бета'),
        ref('news', 'б', date, 'Бета'),
        ref('reviews', 'я', date, 'Альфа'),
        ref('news', 'а', date ? '2026-05-01T03:00:00+03:00' : undefined, 'Бета')
      );

      expect(selectPersonRelatedMaterials(input).map((item) => `${item.section}/${item.sourceId}`))
        .toMatchInlineSnapshot(`
        [
          "reviews/я",
          "news/а",
          "news/б",
          "news/я",
          "status/я",
        ]
      `);
    }
  );

  it('returns an empty selection for empty backlinks', () => {
    expect(selectPersonRelatedMaterials(backlinks())).toEqual([]);
  });

  it('preserves input and the complete Markdown and JSON after selecting more than six refs', () => {
    const refs = PERSON_MENTION_SECTIONS.map((section) => ref(section, section));
    const input = backlinks(...refs, ref('news', 'second-news'));
    const before = structuredClone(input);
    const profile: PersonProfile = {
      id: 'person',
      slug: 'person',
      name: 'Тестовый профиль',
      url: '/people/person/',
      markdownUrl: '/people/person/index.md',
      canonical: 'https://example.com/people/person/',
      contacts: [],
      body: '',
      mentions: [],
      backlinks: input
    };
    const markdownBefore = buildPersonMarkdown(profile);
    const jsonBefore = JSON.stringify(buildPeoplePublicPayload({ profiles: [profile] }));

    expect(selectPersonRelatedMaterials(input)).toHaveLength(6);
    expect(input).toEqual(before);
    expect(buildPersonMarkdown(profile)).toBe(markdownBefore);
    expect(JSON.stringify(buildPeoplePublicPayload({ profiles: [profile] }))).toBe(jsonBefore);

    const payload = buildPeoplePublicPayload({ profiles: [profile] });
    expect(payload.stats.backlink_count).toBe(8);
    for (const section of PERSON_MENTION_SECTIONS) {
      const group = payload.profiles[0]!.backlinks[section];
      expect(group.map((item) => item.source_id)).toEqual(
        input[section].map((item) => item.sourceId)
      );
      for (const item of input[section]) {
        expect(markdownBefore).toContain(`https://example.com${item.markdownUrl}`);
      }
    }
  });
});
