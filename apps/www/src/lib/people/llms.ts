import { count } from '@shelkovo/format';

import { absoluteUrl } from '../site';
import { loadPeopleDataWithBacklinks } from './load';
import { PERSON_MENTION_SECTIONS } from './schema';
import type { PersonBacklinks } from './types';
import {
  llmsSection,
  markdownList,
  serializeLlmsDocument,
} from '@/lib/markdown/llms-document';
import {
  peopleApiCatalogUrl,
  peopleDataUrl,
  peopleLlmsFullUrl,
  peopleLlmsUrl,
  peopleMarkdownUrl,
  peopleOpenApiUrl,
  peopleSchemaUrl,
} from './routes';

const backlinksCount = (backlinks: PersonBacklinks): number =>
  PERSON_MENTION_SECTIONS.reduce(
    (total, section) => total + backlinks[section].length,
    0,
  );

export async function build(kind: 'short' | 'full'): Promise<string> {
  const data = await loadPeopleDataWithBacklinks();
  const profile = data.profiles[0];
  const mentionCount = data.profiles.reduce(
    (total, item) => total + item.mentions.length,
    0,
  );
  const backlinkCount = data.profiles.reduce(
    (total, item) => total + backlinksCount(item.backlinks),
    0,
  );

  const overview = absoluteUrl(peopleMarkdownUrl());
  const feed = absoluteUrl(peopleDataUrl());
  const short = absoluteUrl(peopleLlmsUrl());
  const full = absoluteUrl(peopleLlmsFullUrl());
  const catalog = absoluteUrl(peopleApiCatalogUrl());
  const schema = absoluteUrl(peopleSchemaUrl());
  const openapi = absoluteUrl(peopleOpenApiUrl());
  const detailHtml = profile?.canonical ?? '/people/[slug]/';
  const detailMarkdown = profile
    ? absoluteUrl(profile.markdownUrl)
    : '/people/[slug]/index.md';

  return kind === 'short'
    ? serializeLlmsDocument({
        title: 'Люди Шелково',
        file: 'llms.txt',
        sections: [
          llmsSection('Описание', [
            markdownList([
              'Раздел `/people/` публикует публичные профили людей, контакты и граф упоминаний между новостями, статусом, отзывами, картой мест, другими профилями и сарафаном.',
              `Сейчас в разделе ${count(data.profiles.length, ['профиль', 'профиля', 'профилей'])}, ${count(mentionCount, ['исходящее упоминание', 'исходящих упоминания', 'исходящих упоминаний'])} и ${count(backlinkCount, ['обратная ссылка', 'обратные ссылки', 'обратных ссылок'])}.`,
              'Публичного HTML-индекса `/people/` нет: для массового обхода используйте people.json и Markdown-обзор.',
              'У профиля могут быть `company`, `position` и `name_cases` для склонения канонических упоминаний; `body_markdown` может быть пустым, если базовый контекст уже есть во frontmatter.',
            ]),
          ]),
          llmsSection('Главные URL', [
            markdownList([
              `Markdown-обзор раздела: ${overview}`,
              `Основная JSON-лента: ${feed}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              `Расширенная версия этого текста: ${full}`,
            ]),
          ]),
          llmsSection('Как читать раздел', [
            markdownList([
              `Для массового обхода начинайте с ${feed}.`,
              `Для одной персоны переходите на ${detailHtml} или ${detailMarkdown}.`,
              'В `mentions` лежат исходящие упоминания людей и мест из body профиля; обязательное поле `type` различает `person` и `place`. Учитываются `@slug`, `@slug:case` и `[текст](@slug)`, а `[текст](@slug:case)` не поддерживается.',
              'В `backlinks` лежат входящие ссылки из новостей, статуса, отзывов, карты мест, других профилей и сарафана, собранные из тех же канонических и подписанных синтаксисов упоминаний.',
              'Контакты публикуются открыто и не маскируются в ленте или Markdown-версиях.',
            ]),
          ]),
        ],
      })
    : serializeLlmsDocument({
        title: 'Люди Шелково',
        file: 'llms-full.txt',
        sections: [
          llmsSection('Проект', [
            markdownList([
              'Раздел `/people/` публикует детальные страницы людей, Markdown-версии, публичные контакты и граф упоминаний без HTML-индекса раздела.',
              'Для массового чтения используйте JSON-ленту; HTML и Markdown удобнее для одного профиля.',
              `Сейчас в разделе ${count(data.profiles.length, ['профиль', 'профиля', 'профилей'])}, ${count(mentionCount, ['исходящее упоминание', 'исходящих упоминания', 'исходящих упоминаний'])} и ${count(backlinkCount, ['обратная ссылка', 'обратные ссылки', 'обратных ссылок'])}.`,
            ]),
          ]),
          llmsSection('Канонические URL', [
            markdownList([
              `Markdown-обзор раздела: ${overview}`,
              `Короткий обзор llms.txt: ${short}`,
              `Подробный обзор llms-full.txt: ${full}`,
              `Основная JSON-лента: ${feed}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              `Пример HTML-страницы профиля: ${detailHtml}`,
              `Пример Markdown-версии профиля: ${detailMarkdown}`,
            ]),
          ]),
          llmsSection('Описание people.json', [
            markdownList([
              'Это основная структурированная лента только для чтения для массового обхода профилей.',
              'Корневой объект содержит `stats` и `profiles`.',
              '`stats` дает агрегированные счетчики по профилям, исходящим упоминаниям и публичным обратным ссылкам.',
              '`profiles[]` включает `id`, `slug`, `name`, необязательные `name_cases`, `company` и `position`, `html_url`, `markdown_url`, `contacts`, `body_markdown`, `mentions`, `mention_count`, `backlinks` и `backlink_count`.',
              '`mentions[]` раскрывают `@slug` и `@slug:case` из body профиля в имя нужного падежа и ссылки на детальные страницы; обязательное поле `type` со значением `person` или `place` указывает тип цели, поэтому его не нужно определять по URL.',
              '`[текст](@slug)` сохраняет видимый текст автора, но учитывается в том же массиве `mentions`.',
              '`[текст](@slug:case)` не является поддерживаемым синтаксисом упоминания: для подписанного упоминания нужный падеж или грамматика пишутся в самом видимом тексте.',
              '`backlinks` группируются по `news`, `status`, `reviews`, `places`, `people` и `contacts`, чтобы отвечать на вопрос, где человек уже фигурирует на сайте; граф учитывает канонические и подписанные упоминания.',
            ]),
          ]),
          llmsSection('HTML и Markdown', [
            markdownList([
              'Публичного HTML-индекса `/people/` нет и в MVP не будет.',
              'HTML-страницы `/people/[slug]/` остаются каноническим человекочитаемым представлением одной персоны.',
              'Markdown-версия `/people/[slug]/index.md` дает текстовую версию профиля для терминалов и прямых ссылок.',
              '`/people/index.md` работает как текстовый обзор раздела, а не как список-страница для обычной навигации.',
            ]),
          ]),
          llmsSection('Ограничения', [
            markdownList([
              'Все маршруты /people доступны только для чтения; ручек для изменения данных и авторизации здесь нет.',
              'Контакты публикуются как есть в исходных данных и считаются публичными.',
              'Неизвестные `@slug` и отсутствующие формы `@slug:case` не допускаются: исходный Markdown должен падать на build до публикации.',
            ]),
          ]),
        ],
      });
}
