import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

import type { EventDay, EventMonth, EventRecord } from './types';
import { eventDayUrl, eventMonthUrl } from './urls';
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from './view';

const serialize = (children: Parameters<typeof createMarkdownDocument>[0]['children']): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));
const linkRow = (url: string, label: string, siteUrl: string) =>
  md.listItem([md.paragraph([md.link(new URL(url, siteUrl).href, label)])]);

const period = (event: EventRecord): string =>
  event.through
    ? `${event.startsDate} – ${event.through} включительно`
    : event.timePrecision === 'date'
      ? `${event.startsDate}; время уточняется`
      : `${event.startsDate} ${event.startsTime} МСК${event.endsIso ? `; окончание: ${event.endsIso}` : ''}`;

const discovery = (siteUrl: string) =>
  md.list([
    linkRow('/events/events.json', 'Все опубликованные события (JSON)', siteUrl),
    linkRow('/events/schemas/events.schema.json', 'Схема JSON', siteUrl),
    linkRow('/llms.txt', 'Путеводитель по сайту', siteUrl)
  ]);

export const buildEventsMonthMarkdown = (month: EventMonth, siteUrl: string): string =>
  serialize([
    md.heading(1, `События: ${month.id}`),
    md.paragraph(
      'Опубликованные редакцией события. Каталог не заменяет полный архив каналов-источников.'
    ),
    md.list([
      linkRow('/events/index.md', 'Начало раздела', siteUrl),
      linkRow(eventMonthUrl(month.id), 'Календарь месяца', siteUrl),
      linkRow(eventMonthUrl(month.id, 'list'), 'Список месяца', siteUrl)
    ]),
    md.heading(2, 'Дни с событиями'),
    md.list(month.days.map((day) => linkRow(`${day.url}index.md`, day.date, siteUrl))),
    md.heading(2, 'События месяца'),
    md.list(
      month.events.map((event) =>
        md.listItem([
          md.paragraph([
            md.link(new URL(`${event.url}index.md`, siteUrl).href, event.title),
            md.text(
              `: ${period(event)}${event.status !== 'announced' ? `; ${EVENT_STATUS_LABELS[event.status]}` : ''}.`
            )
          ])
        ])
      )
    ),
    discovery(siteUrl)
  ]);

export const buildEventsRootMarkdown = (month: EventMonth | undefined, siteUrl: string): string =>
  month
    ? buildEventsMonthMarkdown(month, siteUrl)
    : serialize([
        md.heading(1, 'События'),
        md.paragraph('Событий пока не опубликовано.'),
        discovery(siteUrl)
      ]);

export const buildEventsDayMarkdown = (day: EventDay, siteUrl: string): string =>
  serialize([
    md.heading(1, `События: ${day.date}`),
    md.list([
      linkRow(`${eventMonthUrl(day.date.slice(0, 7))}index.md`, 'Все дни месяца', siteUrl),
      linkRow(day.url, 'Страница дня', siteUrl)
    ]),
    md.list(
      day.events.map((event) =>
        md.listItem([
          md.paragraph([
            md.link(new URL(`${event.url}index.md`, siteUrl).href, event.title),
            md.text(
              `: ${period(event)}. Место: ${event.location ?? (event.coordinates ? 'указано на карте' : 'уточняется')}.${event.price ? ` Цена: ${event.price}.` : ''}${event.audience ? ` Участники: ${event.audience}.` : ''}${event.status !== 'announced' ? ` ${EVENT_STATUS_LABELS[event.status]}.` : ''}`
            )
          ])
        ])
      )
    ),
    discovery(siteUrl)
  ]);

export const buildEventMarkdown = (event: EventRecord, siteUrl: string): string =>
  serialize([
    md.heading(1, event.title),
    md.list([
      md.listItem([md.paragraph([md.text('ID: '), md.inlineCode(event.id)])]),
      linkRow(event.url, 'Страница мероприятия', siteUrl),
      linkRow(`${eventDayUrl(event.startsDate)}index.md`, 'Все события дня начала', siteUrl),
      linkRow(
        `${eventMonthUrl(event.startsDate.slice(0, 7))}index.md`,
        'Все события месяца начала',
        siteUrl
      ),
      md.listItem(`Когда: ${period(event)}`),
      md.listItem(`Категория: ${EVENT_CATEGORY_LABELS[event.category]}`),
      md.listItem(`Состояние: ${EVENT_STATUS_LABELS[event.status]}`),
      md.listItem(
        `Место: ${event.location ?? (event.coordinates ? 'указано на карте' : 'уточняется')}`
      ),
      ...(event.place ? [linkRow(event.place.markdownUrl, event.place.name, siteUrl)] : []),
      ...(event.locationDetails ? [md.listItem(`Точка встречи: ${event.locationDetails}`)] : []),
      ...(event.price ? [md.listItem(`Цена: ${event.price}`)] : []),
      ...(event.audience ? [md.listItem(`Участники: ${event.audience}`)] : []),
      ...(event.coordinates
        ? [md.listItem(`Координаты: ${event.coordinates.lat}, ${event.coordinates.lng}`)]
        : []),
      ...(event.organizer ? [md.listItem(`Организатор: ${event.organizer.name}`)] : []),
      ...(event.performer?.length
        ? [md.listItem(`Исполнители: ${event.performer.map((person) => person.name).join(', ')}`)]
        : []),
      linkRow(event.sourceUrl, 'Источник', siteUrl),
      ...(event.icsUrl && event.status !== 'cancelled'
        ? [linkRow(event.icsUrl, 'Скачать ICS', siteUrl)]
        : [])
    ]),
    ...parseMarkdownFragment(event.body),
    discovery(siteUrl)
  ]);
