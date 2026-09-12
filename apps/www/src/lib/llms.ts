import { count } from '@shelkovo/format';
import { md } from '@shelkovo/markdown';

import {
  llmsSection,
  markdownBlocks,
  markdownList,
  serializeLlmsDocument,
  serializeMarkdownNodes
} from '@/lib/markdown/llms-document';

import { loadContactsData } from './contacts/load';
import { loadMeetings } from './meetings/load';
import { loadNewsData } from './news/load';
import { loadPeopleDataWithBacklinks } from './people/load';
import { loadPlaces } from './places/load';
import { publicSurfaceRegistry } from './public-surface';
import type { PublicSurfaceId } from './public-surface';
import { loadReviewsData } from './reviews/load';
import { absoluteUrl } from './site';
import { loadStatusData } from './status/load';

export {
  siteApiCatalogPath,
  siteApiCatalogUrl,
  siteLlmsPath,
  siteLlmsUrl,
  siteMarkdownPath,
  siteMarkdownUrl
} from './root-routes';

const registeredSurfaceUrl = (surfaceId: PublicSurfaceId): string => {
  const surface = publicSurfaceRegistry.surfaces.find((item) => item.id === surfaceId);
  if (!surface?.path) {
    throw new Error(`Public surface ${surfaceId} must provide a stable path`);
  }
  return absoluteUrl(surface.path);
};

const sectionLinks = () =>
  markdownList([
    `[Новости](${registeredSurfaceUrl('news:llms')}): публикации, полный архив и календарные события с готовыми ICS-ссылками.`,
    `[Статус сервисов](${registeredSurfaceUrl('status:llms')}): опубликованное состояние электричества, воды, интернета и дамбы, история перебоев и окна работ.`,
    `[Люди](${registeredSurfaceUrl('people:llms')}): профили, публичные контакты и материалы, в которых упоминается человек; HTML-индекса нет.`,
    `[Сравнение тарифов](${registeredSurfaceUrl('compare:llms')}): платежи и условия в поселках относительно Шелково; полный набор данных и подтверждения тарифов.`,
    `[Регламент и смета](${registeredSurfaceUrl('reglament:llms')}): расчет тарифа, услуги, имущество и ресурсы с источниками.`,
    `[База знаний](${registeredSurfaceUrl('kb:index-markdown')}): тематические документы и их части в Markdown, ссылки на исходные документы.`,
    `[Карта мест](${registeredSurfaceUrl('places:index-markdown')}): индекс всех мест со ссылками на подробные карточки. JSON карты содержит маркеры и геометрию, а описания читайте в карточках.`,
    `[Отзывы](${registeredSurfaceUrl('reviews:index-markdown')}): отзывы собственников и ссылки на полный текст и правила публикации.`,
    `[Сарафан](${registeredSurfaceUrl('contacts:index-markdown')}): категории и карточки контактов, которыми поделились жители; vCard доступна только там, где опубликована ссылка.`,
    `[Архив встреч](${registeredSurfaceUrl('meetings:index-markdown')}): все встречи, описания и ссылки на части транскриптов; HTML-индекса нет.`
  ]);

export const build = (): string =>
  serializeLlmsDocument({
    title: 'Шелково Онлайн',
    summary:
      'Сайт жителей КП Шелково: новости, доступность сервисов, документы и сведения о жизни поселка.',
    introduction: markdownBlocks(
      'Начните с путеводителя нужного раздела или его Markdown-индекса. Отдельные материалы удобнее читать в Markdown, наборы данных обрабатывать через JSON, а с интерфейсом работать в HTML. Опубликованные данные отражают состояние на момент сборки сайта.'
    ),
    sections: [
      llmsSection('Найти материал', [sectionLinks()]),
      llmsSection('Выбрать источник', [
        markdownList([
          `[Инструкция по разделам](${absoluteUrl('/.well-known/agent-skills/site-sections/SKILL.md')}): как выбрать формат, найти полный текст и учесть ограничения источника.`,
          `[Каталог API сайта](${registeredSurfaceUrl('root:api-catalog')}): ленты данных, схемы, каталоги и текстовые документы всех разделов.`,
          `[Главная в браузере](${registeredSurfaceUrl('root:index')}): навигация и интерфейс сайта.`
        ])
      ])
    ]
  });

export async function buildHomeMarkdown(): Promise<string> {
  const [contacts, meetings, news, people, places, reviews, status] = await Promise.all([
    loadContactsData(),
    loadMeetings(),
    loadNewsData(),
    loadPeopleDataWithBacklinks(),
    loadPlaces(),
    loadReviewsData(),
    loadStatusData()
  ]);
  const activeStatus = status.active.filter((item) => item.kind === 'incident');

  return serializeMarkdownNodes([
    md.heading(1, 'Шелково Онлайн'),
    ...markdownBlocks(
      'Текстовое представление корневого сайта и его основных разделов для терминалов и автоматического чтения.'
    ),
    md.heading(2, 'Разделы'),
    sectionLinks(),
    md.heading(2, 'Сейчас на сайте'),
    markdownList([
      `Новости: ${count(news.articles.length, ['статья', 'статьи', 'статей'])}.`,
      `Статус: ${count(status.incidents.length, ['запись', 'записи', 'записей'])}, ${count(activeStatus.length, ['активный инцидент', 'активных инцидента', 'активных инцидентов'])}.`,
      `Карта: ${count(places.length, ['место', 'места', 'мест'])}.`,
      `Отзывы: ${count(reviews.reviews.length, ['отзыв', 'отзыва', 'отзывов'])}.`,
      `Сарафан: ${count(contacts.contacts.length, ['контакт', 'контакта', 'контактов'])}.`,
      `Архив встреч: ${count(meetings.length, ['встреча', 'встречи', 'встреч'])}.`,
      `Люди: ${count(people.profiles.length, ['профиль', 'профиля', 'профилей'])}.`
    ]),
    md.heading(2, 'Обнаружение для агентов'),
    markdownList([
      `[Путеводитель по сайту](${registeredSurfaceUrl('root:llms')})`,
      `[Каталог API сайта](${registeredSurfaceUrl('root:api-catalog')})`,
      `[Инструкции для автоматического чтения](${registeredSurfaceUrl('root:skills')})`
    ])
  ]);
}
