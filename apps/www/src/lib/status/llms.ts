import { count } from '@shelkovo/format';

import { absoluteUrl } from '../site';
import { loadStatusData } from './load';
import {
  llmsSection,
  markdownList,
  serializeLlmsDocument,
} from '@/lib/markdown/llms-document';
import {
  statusApiCatalogUrl,
  statusDataUrl,
  statusFeedUrl,
  statusHistoryUrl,
  statusLlmsFullUrl,
  statusLlmsUrl,
  statusMarkdownUrl,
  statusOpenApiUrl,
  statusSchemaUrl,
  statusServiceMarkdownUrl,
  statusServiceUrl,
  statusUrl,
} from './routes';
import { STATUS_KINDS, STATUS_SERVICE_STATES, STATUS_SERVICES } from './schema';
import { formatStatusService } from './view';

export async function build(kind: 'short' | 'full'): Promise<string> {
  const data = await loadStatusData();
  const activeIncidents = data.active.filter(
    (item) => item.kind === 'incident',
  );
  const activeMaintenance = data.active.filter(
    (item) => item.kind === 'maintenance',
  );
  const service = data.services[0];
  const incident = data.incidents.find((item) => item.hasPage);

  const home = absoluteUrl(statusUrl());
  const history = absoluteUrl(statusHistoryUrl());
  const homeMarkdown = absoluteUrl(statusMarkdownUrl());
  const feed = absoluteUrl(statusDataUrl());
  const rss = absoluteUrl(statusFeedUrl());
  const short = absoluteUrl(statusLlmsUrl());
  const full = absoluteUrl(statusLlmsFullUrl());
  const catalog = absoluteUrl(statusApiCatalogUrl());
  const schema = absoluteUrl(statusSchemaUrl());
  const openapi = absoluteUrl(statusOpenApiUrl());
  const serviceHtml = service
    ? absoluteUrl(statusServiceUrl(service.service))
    : '/status/[service]/';
  const serviceMarkdown = service
    ? absoluteUrl(statusServiceMarkdownUrl(service.service))
    : '/status/[service]/index.md';
  const serviceLabel = service
    ? formatStatusService(service.service)
    : 'Страница сервиса';
  const incidentLinks = incident
    ? [
        `Пример HTML-страницы инцидента: ${incident.canonical}`,
        `Пример Markdown-версии инцидента: ${absoluteUrl(incident.markdownUrl)}`,
      ]
    : [];

  return kind === 'short'
    ? serializeLlmsDocument({
        title: 'Статус КП Шелково',
        file: 'llms.txt',
        sections: [
          llmsSection('Описание', [
            markdownList([
              'Раздел `/status/` показывает состояние сервисов, текущие проблемы, плановые работы и до 10 последних записей.',
              `Полная история доступна в HTML-архиве: ${history}`,
              `Сейчас в разделе ${count(data.incidents.length, ['запись', 'записи', 'записей'])}, ${count(activeIncidents.length, ['активный инцидент', 'активных инцидента', 'активных инцидентов'])} и ${count(activeMaintenance.length, ['активная работа', 'активные работы', 'активных работ'])}.`,
              `Раздел покрывает ${count(data.services.length, ['сервис', 'сервиса', 'сервисов'])}: ${STATUS_SERVICES.join(', ')}.`,
              'HTML-страницы удобны для чтения отдельных записей, а `/status/data/status.json` используйте для массового анализа.',
            ]),
          ]),
          llmsSection('Главные URL', [
            markdownList([
              `Главная страница /status: ${home}`,
              `Полный HTML-архив: ${history}`,
              `Основная JSON-лента: ${feed}`,
              `RSS: ${rss}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              `Расширенная версия этого текста: ${full}`,
            ]),
          ]),
          llmsSection('Как читать раздел', [
            markdownList([
              `Markdown-версия раздела: ${homeMarkdown}`,
              `Пример HTML-страницы сервиса (${serviceLabel}): ${serviceHtml}`,
              `Пример Markdown-версии сервиса: ${serviceMarkdown}`,
              ...incidentLinks,
              'В status.json сервисные сводки выводятся из массива incidents.',
              'Сервисы: `electricity`, `water`, `internet`, `dam`.',
              'Типы записей: `incident`, `maintenance`.',
              'Текущий статус сервиса выводится как `red`, `amber` или `green`.',
            ]),
          ]),
        ],
      })
    : serializeLlmsDocument({
        title: 'Статус КП Шелково',
        file: 'llms-full.txt',
        sections: [
          llmsSection('Проект', [
            markdownList([
              'Раздел `/status/` публикует состояние сервисов КП Шелково, активные инциденты, плановые работы и до 10 последних записей.',
              `Полная история отключений и ограничений доступна в HTML-архиве: ${history}`,
              'Для массового чтения используйте JSON-ленту; HTML и Markdown удобнее для одной линии или одного события.',
              `Сейчас в разделе ${count(data.incidents.length, ['запись', 'записи', 'записей'])}, ${count(activeIncidents.length, ['активный инцидент', 'активных инцидента', 'активных инцидентов'])} и ${count(activeMaintenance.length, ['активная работа', 'активные работы', 'активных работ'])}.`,
            ]),
          ]),
          llmsSection('Канонические URL', [
            markdownList([
              `Главная страница /status: ${home}`,
              `Полный HTML-архив: ${history}`,
              `Markdown-версия раздела: ${homeMarkdown}`,
              `Короткий обзор llms.txt: ${short}`,
              `Подробный обзор llms-full.txt: ${full}`,
              `Основная JSON-лента: ${feed}`,
              `RSS: ${rss}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              `Пример HTML-страницы сервиса (${serviceLabel}): ${serviceHtml}`,
              `Пример Markdown-версии сервиса: ${serviceMarkdown}`,
              ...incidentLinks,
            ]),
          ]),
          llmsSection('Описание status.json', [
            markdownList([
              'Это основная структурированная лента только для чтения для массового обхода раздела /status.',
              'Корневой объект содержит `stats`, `active`, `incidents` и `services`.',
              '`incidents[]` включает `id`, `title`, `service`, `kind`, `year`, `month`, `slug`, необязательные `html_url` и `markdown_url` только для записей с опубликованной детальной страницей, `started_at`, необязательный `ended_at`, флаг `is_active`, фазы `phase`, затронутые `areas`, необязательный `source_url`, `excerpt`, полный `body_markdown` и необязательную `duration`.',
              '`active[]` содержит только активные на момент сборки инциденты и плановые работы в том же формате, что и `incidents[]`.',
              '`services[]` содержит производные сводки по сервисам с `service_status`, URL сервиса, массивами `incident_ids`, `active_incident_ids`, `active_maintenance_ids`, а также `days_without_incidents` и необязательной `latest_incident`.',
              '`stats` дает агрегированные счетчики по сервисам, активным инцидентам и активным работам.',
            ]),
          ]),
          llmsSection('HTML и Markdown', [
            markdownList([
              'HTML-страница `/status/` остается каноническим человекочитаемым представлением сводки по поселку.',
              'HTML-страница `/status/history/` содержит полный архив записей, тогда как история на `/status/` ограничена десятью последними записями.',
              'Markdown-версия `/status/index.md` дает текстовую версию сводки для терминалов и прямых ссылок.',
              'Страницы сервисов `/status/[service]/` и их Markdown-версии `/status/[service]/index.md` удобны для фокусного чтения одной линии: электричество, вода, интернет или дамба.',
              'Страницы инцидентов `/status/incidents/YYYY/MM/[entry]/` и их Markdown-версии `/status/incidents/.../index.md` публикуются только для записей с body и тогда же появляются в `html_url`/`markdown_url`.',
            ]),
          ]),
          llmsSection('RSS', [
            markdownList([
              '`/status/feed.xml` остается краткой RSS-лентой.',
              'В RSS description сериализуются текущий статус записи, период, зоны воздействия и короткая выдержка, если она есть.',
              'Источником правды для полного машиночитаемого контента остается status.json.',
            ]),
          ]),
          llmsSection('Семантика полей', [
            markdownList([
              `Сервисы сериализуются как: \`${STATUS_SERVICES.join('`, `')}\`.`,
              `Типы записей сериализуются как: \`${STATUS_KINDS.join('`, `')}\`.`,
              `Статусы сервисов сериализуются как: \`${STATUS_SERVICE_STATES.join('`, `')}\`.`,
              '`service_status` выводится из активных записей: активный инцидент дает `red`, только активные плановые работы дают `amber`, иначе `green`.',
              '`phase` для отдельной записи показывает ее жизненный цикл: `active`, `resolved` или `scheduled`.',
              'Если `areas` не указаны в исходном файле, лента нормализует запись как `applies_to_all_areas: true` и подставляет все части поселка.',
            ]),
          ]),
          llmsSection('Ограничения', [
            markdownList([
              'Все маршруты /status доступны только для чтения; ручек для изменения данных и авторизации здесь нет.',
              'Лента описывает состояние на момент сборки. Для чтения редакционного контекста или ссылок на первоисточник переходите на детальную страницу инцидента.',
              'Markdown-версии и JSON-лента повторяют одно и то же содержание в разных формах; для массового анализа используйте JSON-ленту.',
            ]),
          ]),
        ],
      });
}
