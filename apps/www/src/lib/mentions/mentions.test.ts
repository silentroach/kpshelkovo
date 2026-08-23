import { describe, expect, it } from 'vitest';

import {
  createSiteMentionRegistry,
  normalizeEntityMentions,
  type SiteMentionRegistry,
} from './index';

const targets = [
  {
    type: 'person',
    slug: 'kschemelinin',
    label: 'Кирилл Щемелинин',
    labelCases: {
      gen: 'Кирилла Щемелинина',
    },
    htmlUrl: '/people/kschemelinin/',
    markdownUrl: '/people/kschemelinin/index.md',
    linkTitle: 'депутат, КПРФ',
  },
  {
    type: 'person',
    slug: 'apetrov',
    label: 'Андрей Петров',
    htmlUrl: '/people/apetrov/',
    markdownUrl: '/people/apetrov/index.md',
  },
  {
    type: 'person',
    slug: 'encoded-url',
    label: 'Адрес с пробелом',
    htmlUrl: '/people/иван%20петров/',
    markdownUrl: '/people/иван%20петров/index.md',
  },
  {
    type: 'place',
    slug: 'apple-garden',
    label: 'Яблоневый сад',
    labelCases: {
      gen: 'Яблоневого сада',
    },
    htmlUrl: '/map/apple-garden/',
    markdownUrl: '/map/apple-garden/index.md',
  },
] as const;

const registry = createSiteMentionRegistry(targets);

describe('createSiteMentionRegistry', () => {
  it('rejects duplicate short slugs before body normalization', () => {
    expect(() =>
      createSiteMentionRegistry([
        targets[0],
        {
          type: 'place',
          slug: 'kschemelinin',
          label: 'Одноимённое место',
          htmlUrl: '/map/kschemelinin/',
          markdownUrl: '/map/kschemelinin/index.md',
        },
      ]),
    ).toThrow('duplicate entity mention slug "kschemelinin"');
  });
});

describe('normalizeEntityMentions', () => {
  it('replaces canonical mentions with entity labels and stable links', () => {
    expect(
      normalizeEntityMentions({
        markdown:
          'Как отметил @kschemelinin:gen, а позже @apetrov подтвердил вывод.',
        context: 'status incident "2026/04/test" body',
        registry,
      }),
    ).toEqual({
      markdown:
        'Как отметил [Кирилла Щемелинина](/people/kschemelinin/ "депутат, КПРФ"), а позже [Андрей Петров](/people/apetrov/) подтвердил вывод.',
      mentions: [targets[0], targets[1]],
    });
  });

  it('replaces labelled mention destinations while preserving visible text', () => {
    expect(
      normalizeEntityMentions({
        markdown:
          'По словам [главного по электричеству](@kschemelinin), работы идут.',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toEqual({
      markdown:
        'По словам [главного по электричеству](/people/kschemelinin/), работы идут.',
      mentions: [targets[0]],
    });
  });

  it('resolves canonical and labelled place mentions to the place page', () => {
    expect(
      normalizeEntityMentions({
        markdown:
          'Гуляли у @apple-garden:gen и вернулись к [саду](@apple-garden).',
        context: 'news article "2026/08/test" body',
        registry,
      }),
    ).toMatchInlineSnapshot(`
      {
        "markdown": "Гуляли у [Яблоневого сада](/map/apple-garden/) и вернулись к [саду](/map/apple-garden/).",
        "mentions": [
          {
            "htmlUrl": "/map/apple-garden/",
            "label": "Яблоневый сад",
            "labelCases": {
              "gen": "Яблоневого сада",
            },
            "markdownUrl": "/map/apple-garden/index.md",
            "slug": "apple-garden",
            "type": "place",
          },
        ],
      }
    `);
  });

  it('replaces only the raw labelled mention destination before link title and adjacent text', () => {
    expect(
      normalizeEntityMentions({
        markdown:
          'По словам [главного по электричеству](@kschemelinin "%D1%82%D0%B8%D1%82%D1%83%D0%BB"), работы идут.',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toEqual({
      markdown:
        'По словам [главного по электричеству](/people/kschemelinin/ "%D1%82%D0%B8%D1%82%D1%83%D0%BB"), работы идут.',
      mentions: [targets[0]],
    });
  });

  it('replaces labelled mentions with encoded target URLs without trimming adjacent text', () => {
    expect(
      normalizeEntityMentions({
        markdown:
          'Перед [видимым текстом](@encoded-url), после ссылки остается текст.',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toEqual({
      markdown:
        'Перед [видимым текстом](/people/иван%20петров/), после ссылки остается текст.',
      mentions: [targets[2]],
    });
  });

  it('fails clearly on encoded labelled mention destinations', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown:
          'По словам [главного по электричеству](@kschemelinin%20), работы идут.',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toThrow(
      'news article "2026/05/test" body contains unsupported encoded labelled entity mention destination "@kschemelinin%20"',
    );
  });

  it('fails when canonical mention requests a missing label case', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: 'По словам @apetrov:gen, работы идут.',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toThrow(
      'news article "2026/05/test" body contains entity mention "@apetrov:gen", but entity "person:apetrov" has no "gen" label case',
    );
  });

  it('fails when a place mention requests a missing label case', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: 'Встретимся у @apple-garden:dat.',
        context: 'review "test" body',
        registry,
      }),
    ).toThrow(
      'review "test" body contains entity mention "@apple-garden:dat", but entity "place:apple-garden" has no "dat" label case',
    );
  });

  it('fails on unknown short slugs', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: 'Текст с @unknown внутри.',
        context: 'people profile "test" body',
        registry,
      }),
    ).toThrow(
      'people profile "test" body contains unknown entity mention "@unknown"',
    );
  });

  it('fails on empty canonical mentions', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: 'Текст @.',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toThrow(
      'news article "2026/05/test" body contains invalid entity mention "@."',
    );
  });

  it('keeps labelled mention case modifiers unsupported', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: '[главного по электричеству](@kschemelinin:gen)',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toThrow(
      'news article "2026/05/test" body contains unsupported labelled entity mention "@kschemelinin:gen"; write the needed grammar in the visible link text',
    );
  });

  it('fails when canonical mentions link the source entity to itself', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: 'Профиль ведет на @kschemelinin.',
        context: 'people profile "kschemelinin" body',
        registry,
        sourceEntity: { type: 'person', slug: 'kschemelinin' },
      }),
    ).toThrow(
      'people profile "kschemelinin" body contains self entity mention "person:kschemelinin"',
    );
  });

  it('fails when labelled mentions link the source entity to itself', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: 'Профиль ведет на [свой профиль](@kschemelinin).',
        context: 'people profile "kschemelinin" body',
        registry,
        sourceEntity: { type: 'person', slug: 'kschemelinin' },
      }),
    ).toThrow(
      'people profile "kschemelinin" body contains self entity mention "person:kschemelinin"',
    );
  });

  it('fails when a place body mentions the same place', () => {
    expect(() =>
      normalizeEntityMentions({
        markdown: 'Описание @apple-garden.',
        context: 'place "apple-garden" body',
        registry,
        sourceEntity: { type: 'place', slug: 'apple-garden' },
      }),
    ).toThrow(
      'place "apple-garden" body contains self entity mention "place:apple-garden"',
    );
  });

  it('dedupes mentions by target type and slug in first appearance order', () => {
    expect(
      normalizeEntityMentions({
        markdown:
          '@kschemelinin согласовал работы, [подрядчик](@apetrov) подтвердил, а @kschemelinin проверил сеть.',
        context: 'news article "2026/05/test" body',
        registry,
      }),
    ).toEqual({
      markdown:
        '[Кирилл Щемелинин](/people/kschemelinin/ "депутат, КПРФ") согласовал работы, [подрядчик](/people/apetrov/) подтвердил, а [Кирилл Щемелинин](/people/kschemelinin/ "депутат, КПРФ") проверил сеть.',
      mentions: [targets[0], targets[1]],
    });
  });

  it('keeps markdown without mention registry matches unchanged', () => {
    const emptyRegistry: SiteMentionRegistry = new Map();
    const markdown = 'Код `@kschemelinin` и https://example.com/@kschemelinin.';

    expect(
      normalizeEntityMentions({
        markdown,
        context: 'news article "2026/05/test" body',
        registry: emptyRegistry,
      }),
    ).toEqual({ markdown, mentions: [] });
  });
});
