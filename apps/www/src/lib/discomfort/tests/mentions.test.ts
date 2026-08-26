import { describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '@/lib/people/mentions';

import { createDiscomfortMentionRefs } from '../mentions';
import type { DiscomfortDataset } from '../types';

describe('createDiscomfortMentionRefs', () => {
  it('publishes the quote attribution and event mentions as source refs', () => {
    const quoteAuthor = createPersonMentionTarget('ykizilov', 'Юрий Кизилов');
    const eventMention = createPersonMentionTarget(
      'kschemelinin',
      'Кирилл Щемелинин',
    );
    const data: DiscomfortDataset = {
      quoteAuthor,
      events: [
        {
          slug: 'meeting-recording-ban',
          dateIso: '2026-06-13',
          title: 'Разговор о тарифе — только без записи',
          url: '/815/discomfort/#meeting-recording-ban',
          body: 'Встреча с **участием** Кирилла Щемелинина.',
          mentions: [eventMention],
        },
      ],
    };

    expect(createDiscomfortMentionRefs(data)).toMatchInlineSnapshot(`
      [
        {
          "excerpt": "Никогда никому создавать какой-то дискомфорт я не буду. Мне это не надо. Я хочу развиваться дальше, но не заниматься вот этой ерундой.",
          "htmlUrl": "/815/discomfort/",
          "markdownUrl": "/815/discomfort/index.md",
          "mentionedAt": "2026-02-21",
          "sortKey": 1771632000000,
          "source": {
            "id": "quote",
            "kind": "quote",
            "section": "discomfort",
          },
          "target": {
            "slug": "ykizilov",
            "type": "person",
          },
          "title": "ОК Дискомфорт",
        },
        {
          "excerpt": "Встреча с участием Кирилла Щемелинина.",
          "htmlUrl": "/815/discomfort/#meeting-recording-ban",
          "markdownUrl": "/815/discomfort/index.md",
          "mentionedAt": "2026-06-13",
          "sortKey": 1781308800000,
          "source": {
            "id": "meeting-recording-ban",
            "kind": "event",
            "section": "discomfort",
          },
          "target": {
            "slug": "kschemelinin",
            "type": "person",
          },
          "title": "Разговор о тарифе — только без записи",
        },
      ]
    `);
  });
});
