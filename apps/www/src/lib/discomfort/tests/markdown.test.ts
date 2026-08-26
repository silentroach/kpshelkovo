import { describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '@/lib/people/mentions';

import { buildDiscomfortMarkdown } from '../markdown';
import type { DiscomfortDataset, DiscomfortEvent } from '../types';

const event = (
  slug: string,
  dateIso: string,
  title: string,
  body: string,
): DiscomfortEvent => ({
  slug,
  dateIso,
  title,
  url: `/815/discomfort/#${slug}`,
  body,
  mentions: [],
});

describe('buildDiscomfortMarkdown', () => {
  it('publishes the quote and chronological source list', () => {
    const events = [
      event(
        'bills',
        '2026-04-29',
        'Счета по 815 ₽',
        'ОК выставила **счета**. [Источник](/news/first/).',
      ),
      event(
        'passes',
        '2026-08-20',
        'Гостевые пропуска',
        'Комментарий [Юрия Кизилова](/people/ykizilov/).',
      ),
    ];
    const data: DiscomfortDataset = {
      events,
      latestEvent: events[1],
      quoteAuthor: createPersonMentionTarget(
        'ykizilov',
        'Юрий Кизилов',
        undefined,
        'ОК "Комфорт"',
        'Руководитель',
      ),
    };

    expect(buildDiscomfortMarkdown(data)).toMatchInlineSnapshot(`
      "# ОК Дискомфорт

      > Никогда никому создавать какой-то дискомфорт я не буду. Мне это не надо. Я хочу развиваться дальше, но не заниматься вот этой ерундой.

      [Юрий Кизилов](https://kpshelkovo.online/people/ykizilov/ "Руководитель, ОК \\"Комфорт\\"") на встрече по новому тарифу, [01:39:30](https://kpshelkovo.online/meetings/2026-02-21-ok/#t-01-39-30).

      Хронология того, как спор о повышении тарифа с 544 до 815 ₽ перешел из счетов и переговоров в ограничения для жителей.

      Последнее событие — 20 августа 2026 года.

      ## Хронология

      1. 29 апреля 2026 года — Счета по 815 ₽.

         ОК выставила **счета**. [Источник](/news/first/).

      1. 20 августа 2026 года — Гостевые пропуска.

         Комментарий [Юрия Кизилова](/people/ykizilov/).
      "
    `);
  });
});
