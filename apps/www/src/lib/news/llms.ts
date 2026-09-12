import {
  llmsSection,
  markdownBlocks,
  markdownList,
  serializeLlmsDocument
} from '@/lib/markdown/llms-document';

import { absoluteUrl } from '../site';
import {
  apiCatalogUrl,
  articlesDataUrl,
  feedUrl,
  newsArchiveMarkdownUrl,
  newsMarkdownUrl,
  newsUrl,
  tagsMarkdownUrl
} from './routes';

export const build = (): string =>
  serializeLlmsDocument({
    title: 'Новости Шелково',
    summary: 'Новости, объявления и архив публикаций о жизни КП Шелково.',
    introduction: markdownBlocks(
      'Для чтения одной новости выбирайте Markdown. Для массовой обработки и календарных метаданных используйте JSON. Дата публикации и дата мероприятия могут различаться; готовые ICS-ссылки берите из `articles[].events[].ics_url`, даже если нужна только одна статья.'
    ),
    sections: [
      llmsSection('Найти публикацию', [
        markdownList([
          `[Последние новости](${absoluteUrl(newsMarkdownUrl())}): свежая подборка со ссылками на полный текст в Markdown.`,
          `[Полный архив](${absoluteUrl(newsArchiveMarkdownUrl())}): все годы и месяцы; через них можно найти любую старую новость.`,
          `[Темы новостей](${absoluteUrl(tagsMarkdownUrl())}): ограниченные подборки по тегам; для полного охвата используйте архив.`,
          `[Новости в браузере](${absoluteUrl(newsUrl())}): HTML-интерфейс раздела.`
        ])
      ]),
      llmsSection('Данные и календарь', [
        markdownList([
          `[Полная лента новостей](${absoluteUrl(articlesDataUrl())}): все статьи с полным текстом, источниками, медиа, архивами и событиями с датами, временем и существующими ICS-ссылками.`,
          `[Как читать новости и события](${absoluteUrl('/.well-known/agent-skills/news-feed/SKILL.md')}): выбор источника, территории, медиа и различие времени публикации и мероприятия.`,
          `[Каталог API новостей](${absoluteUrl(apiCatalogUrl())}): JSON Schema и OpenAPI с контрактом ленты.`
        ])
      ]),
      llmsSection('Optional', [
        markdownList([
          `[RSS новостей](${absoluteUrl(feedUrl())}): краткие описания для подписки; полный текст читайте по ссылкам на статьи.`
        ])
      ])
    ]
  });
