import { beforeAll, describe, expect, it } from 'vitest';

import type { Meeting, MeetingMoment, MeetingTranscriptTime } from './types';

let buildMeetingMarkdown: typeof import('./markdown').buildMeetingMarkdown;
let buildMeetingsIndexMarkdown: typeof import('./markdown').buildMeetingsIndexMarkdown;
let buildMeetingTranscriptPartMarkdown: typeof import('./markdown').buildMeetingTranscriptPartMarkdown;

const moment = (input: {
  readonly iso: string;
  readonly hasTime: boolean;
}): MeetingMoment => ({
  at: new Date(input.iso),
  iso: input.iso,
  hasTime: input.hasTime,
});

const time = (value: string, totalSeconds: number): MeetingTranscriptTime => ({
  value,
  totalSeconds,
});

const meeting = (): Meeting => {
  const speaker = {
    id: 'moderator',
    kind: 'local' as const,
    label: 'Модератор',
    description: 'участник встречи',
  };
  const first = {
    anchor: 't-00-00-00',
    start: time('00:00:00', 0),
    speakerId: speaker.id,
    speaker,
    text: 'Добрый день. Начинаем встречу.',
    textMarkdown: 'Добрый день. Начинаем встречу.',
    textHtml: '<p>Добрый день. Начинаем встречу.</p>',
  };
  const second = {
    anchor: 't-00-00-15',
    start: time('00:00:15', 15),
    speakerId: speaker.id,
    speaker,
    text: 'Полный текст второй реплики хранится только в файле части.',
    textMarkdown: 'Полный текст второй реплики хранится только в файле части.',
    textHtml:
      '<p>Полный текст второй реплики хранится только в файле части.</p>',
  };
  const third = {
    anchor: 't-00-00-00-2',
    start: time('00:00:00', 0),
    speakerId: speaker.id,
    speaker,
    text: 'Вторая часть начинается заново с нуля.',
    textMarkdown: 'Вторая часть начинается заново с нуля.',
    textHtml: '<p>Вторая часть начинается заново с нуля.</p>',
  };

  return {
    id: '2026-06-13-ok-comfort',
    slug: '2026-06-13-ok-comfort',
    title: 'Встреча ОК Комфорт с жителями КП Шелково',
    date: moment({ iso: '2026-06-13T16:00:00+03:00', hasTime: true }),
    context:
      'Встреча управляющей компании с жителями о сезонных работах, тарифе и финансовых вопросах.',
    sourceUrls: [
      'https://example.com/source-1',
      'https://example.com/source-2',
    ],
    url: '/meetings/2026-06-13-ok-comfort/',
    canonical: 'https://example.com/meetings/2026-06-13-ok-comfort/',
    transcript: {
      speakers: [speaker],
      parts: [
        { index: 1, segments: [first, second] },
        { index: 2, segments: [third] },
      ],
      segments: [first, second, third],
    },
  };
};

describe('meetings markdown', () => {
  beforeAll(async () => {
    Object.assign(import.meta.env, {
      SITE: 'https://example.com',
      BASE_URL: '/',
    });

    ({
      buildMeetingMarkdown,
      buildMeetingsIndexMarkdown,
      buildMeetingTranscriptPartMarkdown,
    } = await import('./markdown'));
  });

  it('builds a compact section index without transcript text', () => {
    const markdown = buildMeetingsIndexMarkdown([meeting()]);

    expect(markdown).toMatchInlineSnapshot(`
      "# Архив встреч

      Компактный Markdown-индекс встреч для автоматического чтения. Полные транскрипты не встраиваются в этот файл: открывайте описание нужной встречи и затем файлы транскрипта по частям.

      Публичного HTML-индекса \\\`/meetings/\\\` нет; канонические страницы встреч доступны по прямым ссылкам из новостей, документов и обсуждений.

      ## Сводка

      - Опубликовано 1 встреча.
      - В архиве сейчас 3 фрагмента транскрипта.
      - Этот индекс: <https://example.com/meetings/index.md>; описание одной встречи: \`/meetings/[slug]/index.md\`; полный текст: \`/meetings/[slug]/transcript/[part].md\`.

      ## Встречи

      - [Встреча ОК Комфорт с жителями КП Шелково](https://example.com/meetings/2026-06-13-ok-comfort/index.md) — 13 июня 2026, 16:00; 2 части, 3 фрагмента транскрипта.

        Встреча управляющей компании с жителями о сезонных работах, тарифе и финансовых вопросах.
      "
    `);
  });

  it('builds a meeting description that links transcript parts instead of embedding them', () => {
    const item = meeting();
    const markdown = buildMeetingMarkdown(item);

    expect(markdown).toMatchInlineSnapshot(`
      "# Встреча ОК Комфорт с жителями КП Шелково

      Встреча управляющей компании с жителями о сезонных работах, тарифе и финансовых вопросах.

      ## Ссылки

      - [HTML-страница встречи](https://example.com/meetings/2026-06-13-ok-comfort/).
      - [Индекс архива встреч](https://example.com/meetings/index.md).
      - [Источник записи 1](https://example.com/source-1).
      - [Источник записи 2](https://example.com/source-2).

      ## Метаданные

      - Дата: 13 июня 2026, 16:00.
      - Slug: \`2026-06-13-ok-comfort\`.
      - Транскрипт: 2 части, 3 фрагмента транскрипта.

      ## Участники

      - Модератор — участник встречи

      ## Файлы транскрипта

      Описание встречи не дублирует полный текст. Для цитирования используйте ссылки на HTML-якоря внутри файлов транскрипта.

      - [Часть 1](https://example.com/meetings/2026-06-13-ok-comfort/transcript/1.md) — 2 фрагмента; 00:00:00-00:00:15.
      - [Часть 2](https://example.com/meetings/2026-06-13-ok-comfort/transcript/2.md) — 1 фрагмент; 00:00:00-00:00:00.
      "
    `);
  });

  it('builds one transcript part with html anchors and adjacent navigation', () => {
    const item = meeting();
    const markdown = buildMeetingTranscriptPartMarkdown(
      item,
      item.transcript.parts[0]!,
    );

    expect(markdown).toMatchInlineSnapshot(`
      "# Встреча ОК Комфорт с жителями КП Шелково: Часть 1

      Полный текст часть 1 транскрипта. Время начинается внутри этой части записи; ссылки ведут на соответствующие HTML-якоря страницы встречи.

      ## Навигация

      - [HTML-страница встречи](https://example.com/meetings/2026-06-13-ok-comfort/).
      - [Описание встречи](https://example.com/meetings/2026-06-13-ok-comfort/index.md).
      - [Следующая часть: Часть 2](https://example.com/meetings/2026-06-13-ok-comfort/transcript/2.md).

      ## Транскрипт

      - [00:00:00](https://example.com/meetings/2026-06-13-ok-comfort/#t-00-00-00) — Модератор: Добрый день. Начинаем встречу.
      - [00:00:15](https://example.com/meetings/2026-06-13-ok-comfort/#t-00-00-15) — Модератор: Полный текст второй реплики хранится только в файле части.
      "
    `);
  });

  it('preserves markdown blocks inside transcript segment text', () => {
    const item = meeting();
    const segment = item.transcript.parts[0]!.segments[1]!;
    const part = {
      ...item.transcript.parts[0]!,
      segments: [
        {
          ...segment,
          text: 'Категории:\n\n- Первая.\n- Вторая.\n- Третья.',
          textMarkdown: 'Категории:\n\n- Первая.\n- Вторая.\n- Третья.',
        },
      ],
    };

    expect(buildMeetingTranscriptPartMarkdown(item, part)).toMatch(
      /Категории:\n\n\s+- Первая\.\n\s+- Вторая\.\n\s+- Третья\./u,
    );
  });
});
