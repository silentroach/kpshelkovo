import { describe, expect, it } from 'vitest';

import { createPersonProfileMentionRefs } from './mention-refs';
import { createPersonMentionTarget } from './mentions';

const target = createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин');

const profile = {
  id: 'apetrov',
  slug: 'apetrov',
  name: 'Андрей Петров',
  url: '/people/apetrov/',
  markdownUrl: '/people/apetrov/index.md',
  body: 'Работал вместе с [Кирилл Щемелинин](/people/kschemelinin/).\n\nВторой абзац.',
  mentions: [target],
} satisfies Parameters<typeof createPersonProfileMentionRefs>[0];

describe('createPersonProfileMentionRefs', () => {
  it('creates person profile source refs with people presentation fields', () => {
    expect(createPersonProfileMentionRefs(profile)).toEqual([
      {
        target: { type: 'person', slug: 'kschemelinin' },
        source: { section: 'people', kind: 'person', id: 'apetrov' },
        sourceEntity: { type: 'person', slug: 'apetrov' },
        title: 'Андрей Петров',
        htmlUrl: '/people/apetrov/',
        markdownUrl: '/people/apetrov/index.md',
        excerpt: 'Работал вместе с Кирилл Щемелинин.',
      },
    ]);
  });

  it('dedupes repeated targets inside one profile', () => {
    expect(
      createPersonProfileMentionRefs({
        ...profile,
        mentions: [target, target],
      }),
    ).toHaveLength(1);
  });

  it('does not read the body when the profile has no mentions', () => {
    expect(
      createPersonProfileMentionRefs({
        ...profile,
        get body(): string {
          throw new Error('body should not be read');
        },
        mentions: [],
      }),
    ).toEqual([]);
  });
});
