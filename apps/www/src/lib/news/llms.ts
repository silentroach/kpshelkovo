import { count } from '@shelkovo/format';

import { absoluteUrl } from '../site';
import { loadNewsData } from './load';
import {
  apiCatalogUrl,
  articlesDataUrl,
  articlesOpenApiUrl,
  articlesSchemaUrl,
  feedUrl,
  llmsFullUrl,
  llmsUrl,
  newsMarkdownUrl,
  newsUrl,
  tagsMarkdownUrl,
  tagsUrl,
} from './routes';
import {
  llmsSection,
  markdownList,
  serializeLlmsDocument,
} from '@/lib/markdown/llms-document';

export async function build(kind: 'short' | 'full'): Promise<string> {
  const data = await loadNewsData();
  const article = data.articles[0];
  const year = data.archives.years[0];
  const month = year?.months[0];
  const tag = data.tags[0];
  const counts = `${count(data.articles.length, ['статья', 'статьи', 'статей'])}, ${count(data.tags.length, ['тег', 'тега', 'тегов'])} и ${count(data.archives.years.length, ['архивный год', 'архивных года', 'архивных лет'])}`;

  const home = absoluteUrl(newsUrl());
  const homeMarkdown = absoluteUrl(newsMarkdownUrl());
  const feed = absoluteUrl(articlesDataUrl());
  const rss = absoluteUrl(feedUrl());
  const short = absoluteUrl(llmsUrl());
  const full = absoluteUrl(llmsFullUrl());
  const catalog = absoluteUrl(apiCatalogUrl());
  const schema = absoluteUrl(articlesSchemaUrl());
  const openapi = absoluteUrl(articlesOpenApiUrl());
  const tags = absoluteUrl(tagsUrl());
  const tagsMarkdown = absoluteUrl(tagsMarkdownUrl());
  const articleHtml = article?.canonical ?? '/news/YYYY/MM/[entry]/';
  const articleMarkdown = article
    ? absoluteUrl(article.markdownUrl)
    : '/news/YYYY/MM/[entry]/index.md';
  const yearUrl = year ? absoluteUrl(year.url) : '/news/YYYY/';
  const monthUrl = month ? absoluteUrl(month.url) : '/news/YYYY/MM/';
  const tagUrl = tag ? absoluteUrl(tag.url) : '/news/tags/[tag]/';

  return kind === 'short'
    ? serializeLlmsDocument({
        title: 'Новости Шелково',
        file: 'llms.txt',
        sections: [
          llmsSection('Описание', [
            markdownList([
              'Раздел `/news/` публикует новости и объявления по КП Шелково.',
              `Сейчас в разделе ${counts}.`,
              'HTML-страницы новостей остаются каноническим представлением для людей, а `articles.json` служит основным структурированным файлом данных.',
              'Если новость объявляет календарные события, в `articles[].events[]` есть метаданные событий и ссылки на локальные для статьи `.ics`-файлы.',
            ]),
          ]),
          llmsSection('Главные URL', [
            markdownList([
              `Главная новостей: ${home}`,
              `Основной JSON-файл: ${feed}`,
              `RSS: ${rss}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              `Расширенная версия этого текста: ${full}`,
            ]),
          ]),
          llmsSection('Как читать раздел', [
            markdownList([
              `Пример HTML-страницы новости: ${articleHtml}`,
              `Пример Markdown-страницы новости: ${articleMarkdown}`,
              `Годовой архив: ${yearUrl}`,
              `Месячный архив: ${monthUrl}`,
              `Индекс тегов: ${tags}`,
              `Пример страницы тега: ${tagUrl}`,
              'В корне `articles.json` есть `schema_version`, `generated_at`, `updated_at`, `total_count`, а также массивы `articles`, `archives.years` и `tags`.',
              'В `articles.json` каждая статья содержит `summary`, полный `body_markdown` и необязательный массив `events`.',
              'Тип источника определяется по `author.kind`; официальные источники используют `kind: official`.',
              'Для календаря события используйте `/news/YYYY/MM/[entry]/[event-slug].ics`; глобального календаря событий нет.',
            ]),
          ]),
        ],
      })
    : serializeLlmsDocument({
        title: 'Новости Шелково',
        file: 'llms-full.txt',
        sections: [
          llmsSection('Проект', [
            markdownList([
              'Раздел `/news/` публикует новости и объявления по КП Шелково.',
              'Для массового чтения используйте JSON-файл; HTML и Markdown удобнее для одной новости, архива или тега.',
              `Сейчас в разделе ${counts}.`,
            ]),
          ]),
          llmsSection('Канонические URL', [
            markdownList([
              `Главная новостей: ${home}`,
              `Главная новостей в Markdown: ${homeMarkdown}`,
              `Короткий обзор llms.txt: ${short}`,
              `Подробный обзор llms-full.txt: ${full}`,
              `Основной JSON-файл: ${feed}`,
              `RSS: ${rss}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              `Индекс тегов HTML: ${tags}`,
              `Индекс тегов Markdown: ${tagsMarkdown}`,
              `Пример HTML-страницы новости: ${articleHtml}`,
              `Пример Markdown-страницы новости: ${articleMarkdown}`,
              `Пример годового архива: ${yearUrl}`,
              `Пример месячного архива: ${monthUrl}`,
              `Пример страницы тега: ${tagUrl}`,
            ]),
          ]),
          llmsSection('Описание articles.json', [
            markdownList([
              'Это основной структурированный файл данных для массового обхода новостей; маршруты раздела доступны только на чтение.',
              'Корневой объект содержит служебные поля ленты `schema_version`, `generated_at`, `updated_at`, `total_count`, а также массивы `articles`, `archives.years` и `tags`.',
              '`articles[]` включает `id`, `title`, `summary`, `published_at`, дату по частям (`year`, `month`, `day`), `entry`, `html_url`, `markdown_url`, `source_url`, `pinned`, `author`, `areas`, `tags`, опциональные `cover` и `events`, массивы `photos`, `attachments` и полный `body_markdown`.',
              '`articles[].events[]` существует только у новостей, которые объявляют календарные события; каждый объект содержит `slug`, `title`, `starts_at`, необязательные `description`, `ends_at`, `location`, `coordinates`, `map_url`, `organizer`, `performer` и обязательный `ics_url`.',
              '`archives.years[]` описывают годовые и месячные архивы с количеством публикаций и URL на HTML/Markdown-страницы.',
              '`tags[]` содержат редакционный `label`, нормализованный `key`, количество публикаций и URL на HTML/Markdown-страницы тегов.',
            ]),
          ]),
          llmsSection('События и календарь', [
            markdownList([
              'Файлы календаря событий живут рядом со статьей: `/news/YYYY/MM/[entry]/[event-slug].ics`.',
              'Для машинного обхода берите прямые ссылки из `articles[].events[].ics_url`; в JSON-файле они абсолютные.',
              'Глобального календарного файла событий в этой реализации нет.',
            ]),
          ]),
          llmsSection('HTML и Markdown', [
            markdownList([
              'HTML-страницы `/news/YYYY/MM/[entry]/` остаются каноническим человекочитаемым представлением новости.',
              'Markdown-файлы `/news/.../index.md` дают текстовую версию для терминалов и прямых ссылок на чистый текст.',
              'Годовые архивы перечисляют месяцы с отдельными HTML- и Markdown-страницами; месячные архивы и страницы тегов показывают `summary` публикаций.',
              'Полный `body` раскрывается только на странице новости и в основном JSON-файле.',
            ]),
          ]),
          llmsSection('RSS', [
            markdownList([
              '`/news/feed.xml` остается RSS с краткими описаниями.',
              'В RSS `description` используется краткое `summary` статьи, а не полный `body`.',
              'Источником правды для полного машиночитаемого контента остается `articles.json`.',
            ]),
          ]),
          llmsSection('Источники', [
            markdownList([
              'Тип источника определяется по `author.kind`: официальные источники используют `kind: official`.',
              'Если в тексте есть внешняя атрибуция или дополнительный источник, ссылка остается в `body_markdown` самой статьи.',
            ]),
          ]),
          llmsSection('Ограничения', [
            markdownList([
              'Все маршруты раздела доступны только на чтение; ручек для изменения данных и авторизации здесь нет.',
              'Если исходная статья не указывает `areas`, итоговое поле `areas` в JSON-файле покрывает все части поселка: `river`, `forest`, `park`, `village`.',
              'Теги хранятся как русские `label`, а для URL и JSON-файла получают нормализованный `key` с дефисами.',
              'Локальные картинки внутри исходного markdown-текста не переписываются автоматически; гарантированно машиночитаемыми считаются `cover`, `photos`, `attachments` и `events`.',
            ]),
          ]),
        ],
      });
}
