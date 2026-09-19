import { md } from '@shelkovo/markdown';

import { llmsSection, markdownLinkItem, serializeLlmsDocument } from '@/lib/markdown/llms-document';

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
    introduction: [
      md.paragraph([
        md.text(
          'Для чтения одной новости выбирайте Markdown. Для массовой обработки и календарных метаданных используйте JSON. Дата публикации и дата мероприятия могут различаться; готовые ICS-ссылки берите из '
        ),
        md.inlineCode('articles[].events[].ics_url'),
        md.text(
          '. Этот прежний формат содержит только события с точным временем начала, включая отменённые: состояние указано в description. Все связанные события, в том числе даты без часов и многодневные периоды, читайте в '
        ),
        md.link(absoluteUrl('/events/events.json'), [md.text('полной выдаче событий')]),
        md.text('; находите связи по опубликованным URL новостей.')
      ])
    ],
    sections: [
      llmsSection('Найти публикацию', [
        md.list([
          markdownLinkItem(
            'Последние новости',
            absoluteUrl(newsMarkdownUrl()),
            'свежая подборка со ссылками на полный текст в Markdown.'
          ),
          markdownLinkItem(
            'Полный архив',
            absoluteUrl(newsArchiveMarkdownUrl()),
            'все годы и месяцы; через них можно найти любую старую новость.'
          ),
          markdownLinkItem(
            'Темы новостей',
            absoluteUrl(tagsMarkdownUrl()),
            'ограниченные подборки по тегам; для полного охвата используйте архив.'
          ),
          markdownLinkItem('Новости в браузере', absoluteUrl(newsUrl()), 'HTML-интерфейс раздела.')
        ])
      ]),
      llmsSection('Данные и календарь', [
        md.list([
          markdownLinkItem(
            'Полная лента новостей',
            absoluteUrl(articlesDataUrl()),
            'все статьи с полным текстом, источниками, медиа, архивами и календарными событиями с точным временем начала и существующими ICS-ссылками.'
          ),
          markdownLinkItem(
            'Как читать новости и события',
            absoluteUrl('/.well-known/agent-skills/news-feed/SKILL.md'),
            'выбор источника, территории, медиа и различие времени публикации и мероприятия.'
          ),
          markdownLinkItem(
            'Каталог API новостей',
            absoluteUrl(apiCatalogUrl()),
            'JSON Schema и OpenAPI с контрактом ленты.'
          )
        ])
      ]),
      llmsSection('Optional', [
        md.list([
          markdownLinkItem(
            'RSS новостей',
            absoluteUrl(feedUrl()),
            'краткие описания для подписки; полный текст читайте по ссылкам на статьи.'
          )
        ])
      ])
    ]
  });
