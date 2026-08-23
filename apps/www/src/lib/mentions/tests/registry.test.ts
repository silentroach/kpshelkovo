import { describe, expect, it } from 'vitest';

import { buildSiteMentionRegistry } from '../registry';
import type {
  SiteMentionPersonEntry,
  SiteMentionPlaceEntry,
} from '../registry.types';

const person = (id = 'kschemelinin'): SiteMentionPersonEntry => ({
  id,
  data: {
    name: 'Кирилл Щемелинин',
    name_cases: { gen: 'Кирилла Щемелинина' },
    contacts: [],
  },
});

const place = (id = 'apple-garden'): SiteMentionPlaceEntry => ({
  id,
  data: {
    title: 'Яблоневый сад',
    name_cases: { gen: 'Яблоневого сада' },
    category: 'nature',
    status: 'existing',
    summary: 'Сад рядом со спортивной площадкой',
    location: {
      coordinates: { lat: 55.06371, lng: 37.724333 },
    },
  },
});

describe('buildSiteMentionRegistry', () => {
  it('combines people and places before body normalization', () => {
    expect([...buildSiteMentionRegistry([person()], [place()]).values()])
      .toMatchInlineSnapshot(`
        [
          {
            "company": undefined,
            "htmlUrl": "/people/kschemelinin/",
            "label": "Кирилл Щемелинин",
            "labelCases": {
              "gen": "Кирилла Щемелинина",
            },
            "linkTitle": undefined,
            "markdownUrl": "/people/kschemelinin/index.md",
            "name": "Кирилл Щемелинин",
            "nameCases": {
              "gen": "Кирилла Щемелинина",
            },
            "position": undefined,
            "slug": "kschemelinin",
            "type": "person",
          },
          {
            "htmlUrl": "/map/apple-garden/",
            "label": "Яблоневый сад",
            "labelCases": {
              "gen": "Яблоневого сада",
            },
            "markdownUrl": "/map/apple-garden/index.md",
            "name": "Яблоневый сад",
            "nameCases": {
              "gen": "Яблоневого сада",
            },
            "slug": "apple-garden",
            "type": "place",
          },
        ]
      `);
  });

  it('rejects a slug shared by a person and a place', () => {
    expect(() =>
      buildSiteMentionRegistry([person()], [place('kschemelinin')]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: duplicate entity mention slug "kschemelinin"]`,
    );
  });
});
