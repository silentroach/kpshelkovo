import { md } from '@shelkovo/markdown';

import { llmsSection, markdownLinkItem, serializeLlmsDocument } from '@/lib/markdown/llms-document';

import { absoluteUrl } from '../site';
import {
  statusApiCatalogUrl,
  statusDataUrl,
  statusFeedUrl,
  statusHistoryUrl,
  statusMarkdownUrl,
  statusUrl
} from './routes';

export const build = (): string =>
  serializeLlmsDocument({
    title: 'Статус сервисов Шелково',
    summary: 'Состояние электричества, воды, интернета и дамбы, инциденты и плановые работы.',
    introduction: [
      md.paragraph(
        'Сводка отражает состояние на момент сборки сайта, а не непрерывное наблюдение. Окно плановых работ не равно фактической длительности отключения; пересекающиеся работы и инциденты нельзя складывать как независимые часы перебоя.'
      )
    ],
    sections: [
      llmsSection('Состояние и история', [
        md.list([
          markdownLinkItem(
            'Сводка и полный архив в Markdown',
            absoluteUrl(statusMarkdownUrl()),
            'все записи и ссылки на сервисы. История отдельного сервиса ограничена десятью записями.'
          ),
          markdownLinkItem(
            'Сводка в браузере',
            absoluteUrl(statusUrl()),
            'состояние сервисов, активные события и десять последних записей.'
          ),
          markdownLinkItem(
            'Архив и календарь в браузере',
            absoluteUrl(statusHistoryUrl()),
            'вся история со ссылками на годовые календари и месячные журналы по затронутым дням.'
          )
        ])
      ]),
      llmsSection('Проверить данные', [
        md.list([
          markdownLinkItem(
            'Полная лента статуса',
            absoluteUrl(statusDataUrl()),
            'все записи, активные события и производные сводки сервисов. Детальные страницы доступны только по опубликованным в записи ссылкам.'
          ),
          markdownLinkItem(
            'Как понимать статус и длительность',
            absoluteUrl('/.well-known/agent-skills/status-feed/SKILL.md'),
            'цвет сервиса, фаза события, время, территории и ограничения подсчета перебоев. Прочитайте перед выводами по сводке.'
          ),
          markdownLinkItem(
            'Каталог API статуса',
            absoluteUrl(statusApiCatalogUrl()),
            'JSON Schema и OpenAPI с контрактом ленты.'
          )
        ])
      ]),
      llmsSection('Optional', [
        md.list([
          markdownLinkItem(
            'RSS статуса',
            absoluteUrl(statusFeedUrl()),
            'краткие сообщения для подписки; полный контекст находится в архиве и ленте данных.'
          )
        ])
      ])
    ]
  });
