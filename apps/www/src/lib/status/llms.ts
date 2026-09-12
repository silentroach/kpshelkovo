import {
  llmsSection,
  markdownBlocks,
  markdownList,
  serializeLlmsDocument
} from '@/lib/markdown/llms-document';

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
    introduction: markdownBlocks(
      'Сводка отражает состояние на момент сборки сайта, а не непрерывное наблюдение. Окно плановых работ не равно фактической длительности отключения; пересекающиеся работы и инциденты нельзя складывать как независимые часы перебоя.'
    ),
    sections: [
      llmsSection('Состояние и история', [
        markdownList([
          `[Сводка и полный архив в Markdown](${absoluteUrl(statusMarkdownUrl())}): все записи и ссылки на сервисы. История отдельного сервиса ограничена десятью записями.`,
          `[Сводка в браузере](${absoluteUrl(statusUrl())}): состояние сервисов, активные события и десять последних записей.`,
          `[Архив и календарь в браузере](${absoluteUrl(statusHistoryUrl())}): вся история со ссылками на годовые календари и месячные журналы по затронутым дням.`
        ])
      ]),
      llmsSection('Проверить данные', [
        markdownList([
          `[Полная лента статуса](${absoluteUrl(statusDataUrl())}): все записи, активные события и производные сводки сервисов. Детальные страницы доступны только по опубликованным в записи ссылкам.`,
          `[Как понимать статус и длительность](${absoluteUrl('/.well-known/agent-skills/status-feed/SKILL.md')}): цвет сервиса, фаза события, время, территории и ограничения подсчета перебоев. Прочитайте перед выводами по сводке.`,
          `[Каталог API статуса](${absoluteUrl(statusApiCatalogUrl())}): JSON Schema и OpenAPI с контрактом ленты.`
        ])
      ]),
      llmsSection('Optional', [
        markdownList([
          `[RSS статуса](${absoluteUrl(statusFeedUrl())}): краткие сообщения для подписки; полный контекст находится в архиве и ленте данных.`
        ])
      ])
    ]
  });
