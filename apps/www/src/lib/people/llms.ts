import { md } from '@shelkovo/markdown';

import { llmsSection, markdownLinkItem, serializeLlmsDocument } from '@/lib/markdown/llms-document';

import { absoluteUrl } from '../site';
import { peopleApiCatalogUrl, peopleDataUrl, peopleMarkdownUrl } from './routes';

export const build = (): string =>
  serializeLlmsDocument({
    title: 'Люди Шелково',
    summary: 'Публичные профили людей, контакты и связи с материалами сайта.',
    introduction: [
      md.paragraph([
        md.text(
          'Для чтения одного профиля выбирайте Markdown, для обработки всех профилей и связей — JSON. Публичного HTML-индекса '
        ),
        md.inlineCode('/people/'),
        md.text(
          ' нет. Отсутствующее необязательное поле означает, что сведений нет в опубликованных данных.'
        )
      ])
    ],
    sections: [
      llmsSection('Найти человека и упоминания', [
        md.list([
          markdownLinkItem(
            'Индекс профилей',
            absoluteUrl(peopleMarkdownUrl()),
            'все люди со ссылками на Markdown- и HTML-карточки; в карточке есть публичные контакты и материалы с упоминаниями.'
          ),
          markdownLinkItem(
            'Полная лента профилей',
            absoluteUrl(peopleDataUrl()),
            'тексты, контакты, исходящие упоминания людей и мест и обратные ссылки из других разделов.'
          )
        ])
      ]),
      llmsSection('Понять связи и поля', [
        md.list([
          markdownLinkItem(
            'Как читать профили',
            absoluteUrl('/.well-known/agent-skills/people-profiles/SKILL.md'),
            'назначение полей, упоминаний и обратных ссылок.'
          ),
          markdownLinkItem(
            'Каталог API людей',
            absoluteUrl(peopleApiCatalogUrl()),
            'JSON Schema и OpenAPI с контрактом ленты.'
          )
        ])
      ])
    ]
  });
