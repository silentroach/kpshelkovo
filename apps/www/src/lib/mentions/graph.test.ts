import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  EntityMentionSourceRef,
  SiteBacklinkKind,
  SiteMentionSection,
} from './types';

import { createEntityMentionGraph, getEntityMentionGraphRefs } from './graph';

type RefInput = Omit<Partial<EntityMentionSourceRef>, 'source' | 'target'> & {
  readonly source: Pick<EntityMentionSourceRef['source'], 'id' | 'section'> &
    Partial<Pick<EntityMentionSourceRef['source'], 'kind'>>;
  readonly target?: Partial<EntityMentionSourceRef['target']>;
  readonly title: string;
};

const ref = ({
  htmlUrl,
  markdownUrl,
  source,
  target,
  ...input
}: RefInput): EntityMentionSourceRef => {
  const resolvedSource = {
    section: source.section,
    kind: source.kind ?? 'article',
    id: source.id,
  };

  return {
    target: {
      type: target?.type ?? 'person',
      slug: target?.slug ?? 'kschemelinin',
    },
    source: resolvedSource,
    htmlUrl: htmlUrl ?? `/${resolvedSource.section}/${resolvedSource.id}/`,
    markdownUrl:
      markdownUrl ?? `/${resolvedSource.section}/${resolvedSource.id}/index.md`,
    ...input,
  };
};

describe('createEntityMentionGraph', () => {
  it('accepts only source refs supported by public backlinks', () => {
    expectTypeOf<
      EntityMentionSourceRef['source']['section']
    >().toEqualTypeOf<SiteMentionSection>();
    expectTypeOf<
      EntityMentionSourceRef['source']['kind']
    >().toEqualTypeOf<SiteBacklinkKind>();
  });

  it('groups refs by target entity and source section', () => {
    const graph = createEntityMentionGraph([
      ref({ source: { section: 'news', id: 'a' }, title: 'Новость' }),
      ref({ source: { section: 'status', id: 'b' }, title: 'Инцидент' }),
      ref({
        target: { slug: 'apetrov' },
        source: { section: 'news', id: 'c' },
        title: 'Другая новость',
      }),
    ]);

    expect(
      getEntityMentionGraphRefs(graph, 'person', 'kschemelinin', 'news'),
    ).toHaveLength(1);
    expect(
      getEntityMentionGraphRefs(graph, 'person', 'kschemelinin', 'status'),
    ).toHaveLength(1);
    expect(
      getEntityMentionGraphRefs(graph, 'person', 'apetrov', 'news'),
    ).toHaveLength(1);
  });

  it('dedupes repeated refs from one source unit to one target entity', () => {
    const graph = createEntityMentionGraph([
      ref({
        source: { section: 'news', id: 'a' },
        title: 'Первый заголовок',
      }),
      ref({
        source: { section: 'news', id: 'a' },
        title: 'Второй заголовок',
      }),
    ]);

    expect(
      getEntityMentionGraphRefs(graph, 'person', 'kschemelinin', 'news'),
    ).toEqual([
      expect.objectContaining({
        source: expect.objectContaining({ id: 'a' }),
        title: 'Первый заголовок',
      }),
    ]);
  });

  it('sorts dated refs first by descending sort key, then ru title, then source id', () => {
    const graph = createEntityMentionGraph([
      ref({ source: { section: 'news', id: 'z' }, title: 'Яма' }),
      ref({
        source: { section: 'news', id: 'b' },
        title: 'Бета',
        sortKey: 20,
      }),
      ref({
        source: { section: 'news', id: 'a' },
        title: 'Альфа',
        sortKey: 20,
      }),
      ref({
        source: { section: 'news', id: 'c' },
        title: 'Ремонт',
        sortKey: 30,
      }),
      ref({ source: { section: 'news', id: 'y' }, title: 'Яма' }),
    ]);

    expect(
      getEntityMentionGraphRefs(graph, 'person', 'kschemelinin', 'news').map(
        (item) => item.source.id,
      ),
    ).toEqual(['c', 'a', 'b', 'y', 'z']);
  });

  it('fails defensively on self-link source refs', () => {
    expect(() =>
      createEntityMentionGraph([
        ref({
          source: { section: 'people', kind: 'person', id: 'kschemelinin' },
          sourceEntity: { type: 'person', slug: 'kschemelinin' },
          title: 'Кирилл Щемелинин',
        }),
      ]),
    ).toThrow('self-link mention ref person:kschemelinin');
  });
});
