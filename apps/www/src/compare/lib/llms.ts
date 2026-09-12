import {
  llmsSection,
  markdownBlocks,
  markdownList,
  serializeLlmsDocument
} from '@/lib/markdown/llms-document';
import { reglamentLlmsUrl } from '@/lib/reglament/routes';
import { absoluteUrl } from '@/lib/site';

import {
  compareApiCatalogPath,
  compareExplorerDataPath,
  compareMarkdownPath,
  comparePath,
  compareRatingMarkdownPath,
  compareSettlementsDataPath
} from './public-surface';
import { canon } from './site';

export const build = (): string =>
  serializeLlmsDocument({
    title: 'Сравнение тарифов поселков',
    summary: 'Платежи за содержание поселков, инфраструктура и условия относительно КП Шелково.',
    introduction: markdownBlocks(
      'Индекс показывает подборку. Любой поселок из базы можно найти в полной JSON-ленте и открыть его карточку. Отсутствующий необязательный признак означает «неизвестно», а не «нет». Исходный платеж за участок и нормализованная цена за сотку — разные величины; приблизительный пересчет обозначайте как оценку.'
    ),
    sections: [
      llmsSection('Найти и сравнить поселки', [
        markdownList([
          `[Полная лента поселков](${canon(compareSettlementsDataPath())}): все поселки, исходные и нормализованные тарифы, признаки среды и сравнения с Шелково. Подтверждения тарифа находятся в карточках, список \`sources\` не входит в ленту.`,
          `[Как читать тарифы и признаки](${canon('/.well-known/agent-skills/explorer-data/SKILL.md')}): единицы, оценки, неизвестные значения и переход от найденного slug к карточке. Прочитайте перед сравнением платежей.`,
          `[Карточки и подтверждения](${canon('/.well-known/agent-skills/settlement-pages/SKILL.md')}): адреса Markdown- и HTML-страниц по slug из ленты, источники и даты проверки.`,
          `[Обзор сравнения в Markdown](${canon(compareMarkdownPath())}): сводка и подборка поселков, не полный каталог.`,
          `[Сравнение в браузере](${canon(comparePath())}): интерактивный список, фильтры и карта.`
        ])
      ]),
      llmsSection('Понять методику и назначение данных', [
        markdownList([
          `[Методика рейтинга](${canon(compareRatingMarkdownPath())}): условная оценка среды; тариф в формулу рейтинга не входит.`,
          `[Каталог API сравнения](${canon(compareApiCatalogPath())}): ленты, JSON Schema и OpenAPI с контрактами.`,
          `[Регламент и смета Шелково](${absoluteUrl(reglamentLlmsUrl())}): расчет затрат на услуги и ресурсы. Это другой набор данных, чем сравнение поселковых платежей; число из сметы само по себе не подтверждает начисление собственнику.`
        ])
      ]),
      llmsSection('Optional', [
        markdownList([
          `[Облегченная лента списка и карты](${canon(compareExplorerDataPath())}): минимальные данные для интерфейса; для анализа исходного платежа нужна полная лента.`
        ])
      ])
    ]
  });
