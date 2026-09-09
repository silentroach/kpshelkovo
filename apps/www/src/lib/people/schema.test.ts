import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { mapRawPersonProfile } from './mapper';

describe('mapRawPersonProfile', () => {
  it('maps raw people fields and contacts to a readonly camelCase domain profile', () => {
    const profile = mapRawPersonProfile(
      {
        id: 'kschemelinin',
        body: 'Профиль Кирилла.',
        data: {
          name: 'Кирилл Щемелинин',
          name_cases: {
            gen: 'Кирилла Щемелинина'
          },
          contacts: [
            {
              type: 'telegram',
              value: 'Kirill_ZemlyaMO'
            }
          ]
        }
      },
      new Map()
    );

    expect(profile).toMatchObject({
      slug: 'kschemelinin',
      nameCases: {
        gen: 'Кирилла Щемелинина'
      },
      markdownUrl: '/people/kschemelinin/index.md',
      contacts: [
        {
          type: 'telegram',
          value: 'Kirill_ZemlyaMO',
          display: '@Kirill_ZemlyaMO',
          href: 'https://t.me/Kirill_ZemlyaMO'
        }
      ]
    });
    expect(JSON.stringify(profile)).not.toContain('name_cases');
    expect(JSON.stringify(profile)).not.toContain('markdown_url');
  });
});

describe('people raw/domain architecture', () => {
  it('keeps raw people field names out of internal people contracts', () => {
    const files = [
      './load.ts',
      './registry.ts',
      './view.ts',
      './mention-refs.ts',
      '../../pages/people/[slug]/index.astro'
    ];
    const rawPeopleTokens = [
      'by_slug',
      'mention_registry',
      'markdown_url',
      'html_url',
      'source_id',
      'mentioned_at',
      'sort_key',
      'name_cases'
    ];

    const offenders = files.flatMap((file) => {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');

      return rawPeopleTokens
        .filter((token) => new RegExp(`\\b${token}\\b`, 'u').test(source))
        .map((token) => `${file}: ${token}`);
    });

    expect(offenders).toEqual([]);
  });
});
