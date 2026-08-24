import { count } from '@shelkovo/format';
import { md } from '@shelkovo/markdown';

import {
  llmsSection,
  markdownBlocks,
  markdownList,
  serializeLlmsDocument,
  serializeMarkdownNodes,
} from '@/lib/markdown/llms-document';
import { loadContactsData } from './contacts/load';
import { loadMeetings } from './meetings/load';
import {
  meetingMarkdownPath,
  meetingTranscriptPartMarkdownPath,
} from './meetings/routes';
import { loadNewsData } from './news/load';
import { loadPeopleDataWithBacklinks } from './people/load';
import { loadPlaces } from './places/load';
import { loadReviewsData } from './reviews/load';
import { absoluteUrl } from './site';
import { estimate2026 } from '@/data/reglament/estimate-2026';
import { formatReglamentTariff } from './reglament/format';
import { loadStatusData } from './status/load';
import { publicSurfaceRegistry } from './public-surface';
import type { PublicSurfaceId } from './public-surface';

export {
  siteApiCatalogPath,
  siteApiCatalogUrl,
  siteLlmsFullPath,
  siteLlmsFullUrl,
  siteLlmsPath,
  siteLlmsUrl,
  siteMarkdownPath,
  siteMarkdownUrl,
} from './root-routes';

const registeredSurfacePath = (surfaceId: PublicSurfaceId): string => {
  const surface = publicSurfaceRegistry.surfaces.find(
    (item) => item.id === surfaceId,
  );

  if (surface?.path === undefined) {
    throw new Error(`Public surface ${surfaceId} must provide a stable path`);
  }

  return surface.path;
};

const registeredSurfaceUrl = (surfaceId: PublicSurfaceId): string =>
  absoluteUrl(registeredSurfacePath(surfaceId));

async function snapshot() {
  const [contacts, news, people, places, reviews, status, meetings] =
    await Promise.all([
      loadContactsData(),
      loadNewsData(),
      loadPeopleDataWithBacklinks(),
      loadPlaces(),
      loadReviewsData(),
      loadStatusData(),
      loadMeetings(),
    ]);

  return {
    contacts,
    meetings,
    news,
    people,
    places,
    reviews,
    status,
  };
}

export async function build(kind: 'short' | 'full'): Promise<string> {
  const { contacts, meetings, news, people, places, reviews, status } =
    await snapshot();
  const activeStatus = status.active.filter((item) => item.kind === 'incident');
  const meeting = meetings[0];
  const person = people.profiles[0];
  const home = registeredSurfaceUrl('root:index');
  const homeMarkdown = registeredSurfaceUrl('root:index-markdown');
  const short = registeredSurfaceUrl('root:llms');
  const full = registeredSurfaceUrl('root:llms-full');
  const catalog = registeredSurfaceUrl('root:api-catalog');
  const newsHome = registeredSurfaceUrl('news:index');
  const newsMarkdown = registeredSurfaceUrl('news:index-markdown');
  const newsFeed = registeredSurfaceUrl('news:data');
  const newsRss = registeredSurfaceUrl('news:rss');
  const newsCatalog = registeredSurfaceUrl('news:api-catalog');
  const newsLlms = registeredSurfaceUrl('news:llms');
  const statusHome = registeredSurfaceUrl('status:index');
  const statusMarkdown = registeredSurfaceUrl('status:index-markdown');
  const statusFeed = registeredSurfaceUrl('status:data');
  const statusRss = registeredSurfaceUrl('status:rss');
  const statusCatalog = registeredSurfaceUrl('status:api-catalog');
  const statusLlms = registeredSurfaceUrl('status:llms');
  const reviewsHome = registeredSurfaceUrl('reviews:index');
  const reviewsMarkdown = registeredSurfaceUrl('reviews:index-markdown');
  const reviewsRules = registeredSurfaceUrl('reviews:rules');
  const reviewsRulesMarkdown = registeredSurfaceUrl('reviews:rules-markdown');
  const contactsHome = registeredSurfaceUrl('contacts:index');
  const contactsMarkdown = registeredSurfaceUrl('contacts:index-markdown');
  const meetingsMarkdown = registeredSurfaceUrl('meetings:index-markdown');
  const meetingHtml = meeting?.url
    ? absoluteUrl(meeting.url)
    : '/meetings/[slug]/';
  const meetingMarkdown = meeting
    ? absoluteUrl(meetingMarkdownPath(meeting.slug))
    : '/meetings/[slug]/index.md';
  const meetingTranscript = meeting?.transcript.parts[0]
    ? absoluteUrl(
        meetingTranscriptPartMarkdownPath(
          meeting.slug,
          meeting.transcript.parts[0].index,
        ),
      )
    : '/meetings/[slug]/transcript/[part].md';
  const reglamentHome = registeredSurfaceUrl('reglament:index');
  const reglamentMarkdown = registeredSurfaceUrl('reglament:index-markdown');
  const reglamentFeed = registeredSurfaceUrl('reglament:data-estimate-2026');
  const reglamentFullMarkdown = registeredSurfaceUrl('reglament:full-markdown');
  const reglamentFullAssetsMarkdown = registeredSurfaceUrl(
    'reglament:full-assets-markdown',
  );
  const reglamentFullServicesMarkdown = registeredSurfaceUrl(
    'reglament:full-services-markdown',
  );
  const reglamentFullServiceMapMarkdown = registeredSurfaceUrl(
    'reglament:full-service-map-markdown',
  );
  const reglamentFullChecksMarkdown = registeredSurfaceUrl(
    'reglament:full-checks-markdown',
  );
  const reglamentFullDataset = registeredSurfaceUrl('reglament:data-full-2026');
  const reglamentAssets = registeredSurfaceUrl('reglament:assets');
  const reglamentServices = registeredSurfaceUrl('reglament:services');
  const reglamentLlms = registeredSurfaceUrl('reglament:llms');
  const reglamentCatalog = registeredSurfaceUrl('reglament:api-catalog');
  const peopleMarkdown = registeredSurfaceUrl('people:index-markdown');
  const peopleFeed = registeredSurfaceUrl('people:data');
  const peopleCatalog = registeredSurfaceUrl('people:api-catalog');
  const peopleSchema = registeredSurfaceUrl('people:schema');
  const peopleOpenApi = registeredSurfaceUrl('people:openapi');
  const peopleShort = registeredSurfaceUrl('people:llms');
  const peopleFull = registeredSurfaceUrl('people:llms-full');
  const personHtml = person?.canonical ?? '/people/[slug]/';
  const personMarkdown = person
    ? absoluteUrl(person.markdownUrl)
    : '/people/[slug]/index.md';
  const placesHome = registeredSurfaceUrl('places:index');
  const placesMarkdown = registeredSurfaceUrl('places:index-markdown');
  const compareHome = registeredSurfaceUrl('compare:index');
  const compareMarkdown = registeredSurfaceUrl('compare:index-markdown');
  const compareFeed = registeredSurfaceUrl('compare:data-settlements');
  const compareLlms = registeredSurfaceUrl('compare:llms');
  const compareCatalog = registeredSurfaceUrl('compare:api-catalog');
  const compareSkills = registeredSurfaceUrl('compare:skills');
  const skills = registeredSurfaceUrl('root:skills');

  return kind === 'short'
    ? serializeLlmsDocument({
        title: 'Шелково Онлайн',
        file: 'llms.txt',
        sections: [
          llmsSection('Описание', [
            markdownList([
              'Это карта публичных данных и точек входа kpshelkovo.online.',
              'Основные разделы: новости, статус сервисов, карта мест, отзывы собственников, сарафан, архив встреч, регламент и смета тарифа 815, профили людей и сравнение тарифов поселков.',
              `Сейчас в новостях ${count(news.articles.length, ['статья', 'статьи', 'статей'])}, в статусе ${count(status.incidents.length, ['запись', 'записи', 'записей'])} и ${count(activeStatus.length, ['активный инцидент', 'активных инцидента', 'активных инцидентов'])}, на карте ${count(places.length, ['место', 'места', 'мест'])}, в сарафане ${count(contacts.contacts.length, ['контакт', 'контакта', 'контактов'])}, в отзывах ${count(reviews.reviews.length, ['отзыв', 'отзыва', 'отзывов'])}, в архиве встреч ${count(meetings.length, ['встреча', 'встречи', 'встреч'])}, в людях ${count(people.profiles.length, ['профиль', 'профиля', 'профилей'])}.`,
              'Для массового чтения используйте JSON-ленты там, где они есть; HTML и Markdown удобнее для ссылок и точечного чтения.',
            ]),
          ]),
          llmsSection('Главные URL', [
            markdownList([
              `Главная: ${home}`,
              `Главная в Markdown: ${homeMarkdown}`,
              `Каталог API сайта: ${catalog}`,
              `Инструкции для автоматического чтения сайта: ${skills}`,
              `Новости: ${newsHome}`,
              `Статус: ${statusHome}`,
              `Карта мест: ${placesHome}`,
              `Отзывы: ${reviewsHome}`,
              `Сарафан: ${contactsHome}`,
              `Архив встреч в Markdown: ${meetingsMarkdown}`,
              `Регламент: ${reglamentHome}`,
              `Люди в Markdown: ${peopleMarkdown}`,
              `Сравнение тарифов: ${compareHome}`,
              `Расширенная версия этого текста: ${full}`,
            ]),
          ]),
          llmsSection('Как ориентироваться', [
            markdownList([
              'Если задача относится к одному разделу, сначала откройте его `llms.txt` или Markdown-индекс; если нужны данные массово, сразу берите JSON-ленту там, где она есть.',
              `Новости: ${newsLlms}; основная лента: ${newsFeed}; календарные события лежат в \`articles[].events[].ics_url\`.`,
              `Статус сервисов: ${statusLlms}; основная лента: ${statusFeed}.`,
              `Карта мест: ${placesMarkdown}; карточки: \`/map/[slug]/\` и \`/map/[slug]/index.md\`, включая входящие ссылки на материалы, где упомянуто место.`,
              `Отзывы собственников: ${reviewsMarkdown}; правила публикации: ${reviewsRulesMarkdown}; детальные страницы: \`/reviews/[id]/\` и \`/reviews/[id]/index.md\`.`,
              `Сарафан: ${contactsMarkdown}; разделы: \`/sarafan/[category]/\` и \`/sarafan/[category]/index.md\`; детальные страницы есть только у контактов с body и используют \`/sarafan/[category]/[slug]/\` и \`/sarafan/[category]/[slug]/index.md\`; если для контакта доступна vCard, ее адрес указан в \`vcf_url\`.`,
              `Архив встреч: ${meetingsMarkdown}; одна встреча: ${meetingHtml} или ${meetingMarkdown}; полный текст транскрипта берите по частям, например ${meetingTranscript}.`,
              `Регламент и смета: ${reglamentLlms}; смета: ${reglamentFeed}; полный регламент: ${reglamentFullMarkdown}; набор данных: ${reglamentFullDataset}.`,
              `Люди: ${peopleShort}; основная лента: ${peopleFeed}; одна персона: ${personHtml} или ${personMarkdown}.`,
              `Сравнение тарифов поселков: ${compareLlms}; основная лента: ${compareFeed}.`,
              'Публичные инструкции помогают с типовыми задачами; у сравнения тарифов есть отдельный индекс.',
            ]),
          ]),
        ],
      })
    : serializeLlmsDocument({
        title: 'Шелково Онлайн',
        file: 'llms-full.txt',
        sections: [
          llmsSection('Проект', [
            markdownList([
              'Это корневой сайт kpshelkovo.online и карта его публичных данных.',
              `Разделы сайта: \`${registeredSurfacePath('news:index')}\`, \`${registeredSurfacePath('status:index')}\`, \`${registeredSurfacePath('places:index')}\`, \`${registeredSurfacePath('reviews:index')}\`, \`${registeredSurfacePath('contacts:index')}\`, \`${registeredSurfacePath('meetings:index-markdown')}\`, \`${registeredSurfacePath('reglament:index')}\`, \`${registeredSurfacePath('people:index-markdown')}\` и \`${registeredSurfacePath('compare:index')}\`.`,
              'Все JSON-ленты доступны только для чтения и отражают состояние на момент сборки сайта.',
              'У раздела людей нет публичной HTML-страницы индекса `/people/`; используйте `/people/index.md` и `/people/data/people.json`.',
              'У архива встреч нет публичной HTML-страницы индекса `/meetings/`; используйте `/meetings/index.md`, описание одной встречи и файлы транскрипта по частям.',
            ]),
          ]),
          llmsSection('Канонические URL', [
            markdownList([
              `Главная: ${home}`,
              `Главная в Markdown: ${homeMarkdown}`,
              `Короткий обзор llms.txt: ${short}`,
              `Подробный обзор llms-full.txt: ${full}`,
              `Каталог API сайта: ${catalog}`,
              `Инструкции для автоматического чтения сайта: ${skills}`,
            ]),
          ]),
          llmsSection('Новости', [
            markdownList([
              `HTML-страница раздела: ${newsHome}`,
              `Markdown-версия раздела: ${newsMarkdown}`,
              `llms.txt: ${newsLlms}`,
              `JSON-лента: ${newsFeed}`,
              `RSS: ${newsRss}`,
              `Каталог API: ${newsCatalog}`,
              'События новостей представлены как необязательный `articles[].events[]`; `.ics` доступен по `/news/YYYY/MM/[entry]/[event-slug].ics`, глобальной ленты событий нет.',
              `Сейчас в разделе ${count(news.articles.length, ['статья', 'статьи', 'статей'])}.`,
            ]),
          ]),
          llmsSection('Статус сервисов', [
            markdownList([
              `HTML-страница раздела: ${statusHome}`,
              `Markdown-версия раздела: ${statusMarkdown}`,
              `llms.txt: ${statusLlms}`,
              `JSON-лента: ${statusFeed}`,
              `RSS: ${statusRss}`,
              `Каталог API: ${statusCatalog}`,
              `Сейчас в разделе ${count(status.incidents.length, ['запись', 'записи', 'записей'])} и ${count(activeStatus.length, ['активный инцидент', 'активных инцидента', 'активных инцидентов'])}.`,
            ]),
          ]),
          llmsSection('Карта мест', [
            markdownList([
              `Интерактивная карта: ${placesHome}`,
              `Markdown-версия раздела: ${placesMarkdown}`,
              'Карточки мест используют `/map/[slug]/` и `/map/[slug]/index.md` и показывают входящие ссылки на материалы, где упомянуто место.',
              `Сейчас на карте ${count(places.length, ['место', 'места', 'мест'])}.`,
              'Структурированной JSON-ленты пока нет; для машинного чтения используйте Markdown-страницы.',
            ]),
          ]),
          llmsSection('Отзывы собственников', [
            markdownList([
              `HTML-страница раздела: ${reviewsHome}`,
              `Markdown-версия раздела: ${reviewsMarkdown}`,
              `Правила публикации: ${reviewsRules}`,
              `Markdown-версия правил публикации: ${reviewsRulesMarkdown}`,
              'Детальные страницы отзывов используют `/reviews/[id]/` и `/reviews/[id]/index.md`.',
              `Сейчас в разделе ${count(reviews.reviews.length, ['отзыв', 'отзыва', 'отзывов'])}.`,
              'Структурированной JSON-ленты отзывов нет; для машинного чтения используйте Markdown-страницы.',
            ]),
          ]),
          llmsSection('Сарафан', [
            markdownList([
              `HTML-страница раздела: ${contactsHome}`,
              `Markdown-версия раздела: ${contactsMarkdown}`,
              'Разделы сарафана используют `/sarafan/[category]/` и `/sarafan/[category]/index.md`; детальные страницы есть только у контактов с body и используют `/sarafan/[category]/[slug]/` и `/sarafan/[category]/[slug]/index.md`.',
              `Сейчас в разделе ${count(contacts.contacts.length, ['контакт', 'контакта', 'контактов'])}.`,
              'Структурированной JSON-ленты сарафана в MVP нет; для машинного чтения используйте Markdown-страницы.',
              'Сайт публикует редакционный контекст и способы связи, но не гарантирует качество услуги.',
            ]),
          ]),
          llmsSection('Архив встреч', [
            markdownList([
              `Markdown-индекс без HTML-аналога: ${meetingsMarkdown}`,
              `Пример HTML-страницы встречи: ${meetingHtml}`,
              `Пример Markdown-описания встречи: ${meetingMarkdown}`,
              `Пример файла транскрипта: ${meetingTranscript}`,
              `Сейчас в архиве ${count(meetings.length, ['встреча', 'встречи', 'встреч'])}.`,
              'Индекс и описание встречи не дублируют полный текст; полный транскрипт читается по `/meetings/[slug]/transcript/[part].md`.',
            ]),
          ]),
          llmsSection('Регламент и смета тарифа 815', [
            markdownList([
              `HTML-страница раздела: ${reglamentHome}`,
              `Markdown-версия: ${reglamentMarkdown}`,
              `Markdown-версия полного регламента: ${reglamentFullMarkdown}`,
              `Markdown-версия полного регламента про имущество: ${reglamentFullAssetsMarkdown}`,
              `Markdown-версия полного регламента про услуги: ${reglamentFullServicesMarkdown}`,
              `Markdown-версия сопоставлений полного регламента: ${reglamentFullServiceMapMarkdown}`,
              `Markdown-версия проверок полного регламента: ${reglamentFullChecksMarkdown}`,
              `llms.txt: ${reglamentLlms}`,
              `JSON-лента: ${reglamentFeed}`,
              `Набор данных полного регламента: ${reglamentFullDataset}`,
              `Общее имущество: ${reglamentAssets}`,
              `Услуги регламента: ${reglamentServices}`,
              `Каталог API: ${reglamentCatalog}`,
              `В ленте ${estimate2026.sections.length} секций сметы; официальный месячный тариф ${formatReglamentTariff(estimate2026.baseline.tariff_per_sotka_month)}.`,
            ]),
          ]),
          llmsSection('Люди', [
            markdownList([
              `HTML-индекса нет; обзор раздела живет в Markdown: ${peopleMarkdown}`,
              `llms.txt: ${peopleShort}`,
              `llms-full.txt: ${peopleFull}`,
              `JSON-лента: ${peopleFeed}`,
              `Каталог API: ${peopleCatalog}`,
              `JSON Schema: ${peopleSchema}`,
              `OpenAPI: ${peopleOpenApi}`,
              `Пример HTML-страницы профиля: ${personHtml}`,
              `Пример Markdown-версии профиля: ${personMarkdown}`,
              `Сейчас в разделе ${count(people.profiles.length, ['профиль', 'профиля', 'профилей'])}.`,
            ]),
          ]),
          llmsSection('Сравнение тарифов поселков', [
            markdownList([
              `HTML-страница раздела: ${compareHome}`,
              `Markdown-версия раздела: ${compareMarkdown}`,
              `llms.txt: ${compareLlms}`,
              `Основная JSON-лента: ${compareFeed}`,
              `Каталог API: ${compareCatalog}`,
              `Инструкции для автоматического чтения: ${compareSkills}`,
            ]),
          ]),
          llmsSection('Как выбирать источник', [
            markdownList([
              'Когда нужен обзор разделов и точек входа, начинайте с этого `llms-full.txt` или с корневого `/.well-known/api-catalog`.',
              'Когда нужна текстовая версия главной страницы и быстрые ссылки на разделы, используйте `/index.md`.',
              'Для новостей при массовом чтении используйте `/news/data/articles.json`, а HTML/Markdown-страницы оставляйте для одной конкретной записи; если у статьи есть `events`, календарь берите из `events[].ics_url`.',
              'Для статуса при массовом чтении используйте `/status/data/status.json`, а HTML/Markdown-страницы сервисов и инцидентов оставляйте для фокусной проверки одной линии или одного события.',
              'Для карты начинайте с `/map/index.md`; одно место открывается через `/map/[slug]/` или `/map/[slug]/index.md`.',
              'Для отзывов начинайте с `/reviews/index.md`; правила публикации лежат в `/reviews/rules/index.md`, а один отзыв читается через `/reviews/[id]/` или `/reviews/[id]/index.md`.',
              'Для сарафана начинайте с `/sarafan/index.md`; разделы читаются через `/sarafan/[category]/` или `/sarafan/[category]/index.md`; отдельная страница контакта есть только у записей с body и читается через `/sarafan/[category]/[slug]/` или `/sarafan/[category]/[slug]/index.md`; структурированной ленты нет.',
              'Для встреч начинайте с `/meetings/index.md`; для одной встречи откройте `/meetings/[slug]/index.md`, а полный текст берите из `/meetings/[slug]/transcript/[part].md`.',
              'Для регламента при массовом чтении используйте `/815/regulation/data/estimate-2026.json` для расчетной сметы и `/815/regulation/data/full-2026.json` для полного структурированного набора данных; для текстового чтения начинайте с `/815/regulation/full.md`, затем переходите в тематические файлы `/815/regulation/full/*.md`.',
              'Для людей при массовом чтении используйте `/people/data/people.json`, а `/people/[slug]/` и `/people/[slug]/index.md` оставляйте для чтения одного профиля.',
              `Для сравнения тарифов используйте \`${registeredSurfacePath('compare:data-settlements')}\` как основную структурированную ленту, а HTML/Markdown-страницы - для чтения по одному поселку.`,
            ]),
          ]),
          llmsSection('Навыки и обнаружение', [
            markdownList([
              '`llms.txt` дает карту маршрутов, `api-catalog` и OpenAPI/Schema описывают контракты, публичные инструкции закрывают типовые задачи.',
              'Корневой индекс навыков покрывает навигацию, новости, статус, архив встреч и профили людей.',
              'У Compare свой индекс навыков для ленты, страниц поселков, рейтинга и уточнений по источникам.',
            ]),
          ]),
        ],
      });
}

export async function buildHomeMarkdown(): Promise<string> {
  const { contacts, meetings, news, people, places, reviews, status } =
    await snapshot();
  const activeStatus = status.active.filter((item) => item.kind === 'incident');
  const newsHome = registeredSurfaceUrl('news:index');
  const newsFeed = registeredSurfaceUrl('news:data');
  const newsRss = registeredSurfaceUrl('news:rss');
  const newsLlms = registeredSurfaceUrl('news:llms');
  const newsCatalog = registeredSurfaceUrl('news:api-catalog');
  const statusHome = registeredSurfaceUrl('status:index');
  const statusFeed = registeredSurfaceUrl('status:data');
  const statusRss = registeredSurfaceUrl('status:rss');
  const statusLlms = registeredSurfaceUrl('status:llms');
  const statusCatalog = registeredSurfaceUrl('status:api-catalog');
  const reviewsHome = registeredSurfaceUrl('reviews:index');
  const reviewsMarkdown = registeredSurfaceUrl('reviews:index-markdown');
  const reviewsRulesMarkdown = registeredSurfaceUrl('reviews:rules-markdown');
  const contactsHome = registeredSurfaceUrl('contacts:index');
  const contactsMarkdown = registeredSurfaceUrl('contacts:index-markdown');
  const meetingsMarkdown = registeredSurfaceUrl('meetings:index-markdown');
  const reglamentHome = registeredSurfaceUrl('reglament:index');
  const reglamentFeed = registeredSurfaceUrl('reglament:data-estimate-2026');
  const reglamentFullMarkdown = registeredSurfaceUrl('reglament:full-markdown');
  const reglamentFullDataset = registeredSurfaceUrl('reglament:data-full-2026');
  const reglamentMarkdown = registeredSurfaceUrl('reglament:index-markdown');
  const reglamentLlms = registeredSurfaceUrl('reglament:llms');
  const reglamentCatalog = registeredSurfaceUrl('reglament:api-catalog');
  const peopleMarkdown = registeredSurfaceUrl('people:index-markdown');
  const peopleFeed = registeredSurfaceUrl('people:data');
  const peopleLlms = registeredSurfaceUrl('people:llms');
  const peopleCatalog = registeredSurfaceUrl('people:api-catalog');
  const placesHome = registeredSurfaceUrl('places:index');
  const placesMarkdown = registeredSurfaceUrl('places:index-markdown');
  const compareHome = registeredSurfaceUrl('compare:index');
  const compareFeed = registeredSurfaceUrl('compare:data-settlements');
  const compareLlms = registeredSurfaceUrl('compare:llms');
  const compareCatalog = registeredSurfaceUrl('compare:api-catalog');
  const catalog = registeredSurfaceUrl('root:api-catalog');
  const short = registeredSurfaceUrl('root:llms');
  const full = registeredSurfaceUrl('root:llms-full');
  const skills = registeredSurfaceUrl('root:skills');

  return serializeMarkdownNodes([
    md.heading(1, 'Шелково Онлайн'),
    ...markdownBlocks(
      'Текстовое представление корневого сайта и его основных разделов для терминалов и автоматического чтения.',
    ),
    md.heading(2, 'Разделы'),
    markdownList([
      `[Новости](${newsHome}) — ${count(news.articles.length, ['статья', 'статьи', 'статей'])}; структурированная лента: ${newsFeed}; RSS: ${newsRss}; события: необязательный \`articles[].events[]\` с локальным для статьи \`[event-slug].ics\``,
      `[Статус](${statusHome}) — ${count(status.incidents.length, ['запись', 'записи', 'записей'])}, ${count(activeStatus.length, ['активный инцидент', 'активных инцидента', 'активных инцидентов'])}; структурированная лента: ${statusFeed}; RSS: ${statusRss}`,
      `[Карта](${placesHome}) — ${count(places.length, ['место', 'места', 'мест'])}; Markdown-обзор: ${placesMarkdown}; структурированной ленты пока нет`,
      `[Отзывы](${reviewsHome}) — ${count(reviews.reviews.length, ['отзыв', 'отзыва', 'отзывов'])}; Markdown-обзор: ${reviewsMarkdown}; правила публикации: ${reviewsRulesMarkdown}; структурированной ленты нет`,
      `[Сарафан](${contactsHome}) — ${count(contacts.contacts.length, ['контакт', 'контакта', 'контактов'])}; Markdown-обзор: ${contactsMarkdown}; структурированной ленты нет`,
      `Архив встреч — ${count(meetings.length, ['встреча', 'встречи', 'встреч'])}; Markdown-индекс без HTML-аналога: ${meetingsMarkdown}; полные транскрипты: \`/meetings/[slug]/transcript/[part].md\``,
      `[Регламент](${reglamentHome}) — смета тарифа 2026; структурированная лента: ${reglamentFeed}; полный индекс: ${reglamentFullMarkdown}; полный набор данных: ${reglamentFullDataset}; Markdown-обзор: ${reglamentMarkdown}`,
      `Люди — ${count(people.profiles.length, ['профиль', 'профиля', 'профилей'])}; Markdown-обзор: ${peopleMarkdown}; структурированная лента: ${peopleFeed}; публичного HTML-индекса нет`,
      `[Compare](${compareHome}) — сравнение тарифов поселков и рейтинга; структурированная лента: ${compareFeed}`,
    ]),
    md.heading(2, 'Обнаружение для агентов'),
    markdownList([
      `Каталог API сайта: ${catalog}`,
      `llms.txt: ${short}`,
      `llms-full.txt: ${full}`,
      `Инструкции для автоматического чтения: ${skills}`,
    ]),
    md.heading(2, 'Обнаружение разделов'),
    markdownList([
      `Новости: ${newsLlms}, ${newsCatalog}`,
      `Статус: ${statusLlms}, ${statusCatalog}`,
      `Карта: ${placesMarkdown}`,
      `Отзывы: ${reviewsMarkdown}`,
      `Сарафан: ${contactsMarkdown}`,
      `Архив встреч: ${meetingsMarkdown}`,
      `Регламент: ${reglamentLlms}, ${reglamentCatalog}`,
      `Люди: ${peopleLlms}, ${peopleCatalog}`,
      `Compare: ${compareLlms}, ${compareCatalog}`,
    ]),
  ]);
}
