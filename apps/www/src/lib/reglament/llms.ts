import { compareLlmsPath } from '@/compare/lib/public-surface';
import {
  llmsSection,
  markdownBlocks,
  markdownList,
  serializeLlmsDocument
} from '@/lib/markdown/llms-document';

import { absoluteUrl } from '../site';
import {
  reglamentApiCatalogUrl,
  reglamentEstimateDetails2026DataUrl,
  reglamentEstimateDetailsMarkdownUrl,
  reglamentEstimate2026DataUrl,
  reglamentFull2026DataUrl,
  reglamentFullMarkdownUrl,
  reglamentMarkdownUrl,
  reglamentUrl
} from './routes';

export const build = (): string =>
  serializeLlmsDocument({
    title: 'Регламент и смета Шелково',
    summary:
      'Обоснование тарифа по смете 2026: услуги, имущество, ресурсы и расчет с подтверждающими документами.',
    introduction: markdownBlocks(
      'Смета описывает расчет затрат. Ее итог сам по себе не подтверждает сумму к оплате собственником. Для чтения и проверки выбирайте Markdown, для пересчета — JSON, для изменения параметров — калькулятор в браузере.'
    ),
    sections: [
      llmsSection('Разобраться в расчете', [
        markdownList([
          `[Смета в Markdown](${absoluteUrl(reglamentMarkdownUrl())}): официальные и пересчитанные итоги, формулы, строки и источники. Здесь объяснены различия итогов и ограничения расчета.`,
          `[Полный регламент](${absoluteUrl(reglamentFullMarkdownUrl())}): индекс имущества, услуг, периодичности, сопоставлений со сметой и проверок; подробности в тематических Markdown-файлах.`,
          `[Детальная смета](${absoluteUrl(reglamentEstimateDetailsMarkdownUrl())}): индекс работ, материалов, машин, труда и контрольных итогов со ссылками на документы.`,
          `[Калькулятор в браузере](${absoluteUrl(reglamentUrl())}): интерактивный пересчет при изменении параметров.`,
          `[Сравнение тарифов поселков](${absoluteUrl(compareLlmsPath())}): исходные поселковые платежи и их нормализация; у этих чисел другое назначение, чем у расчетных затрат сметы.`
        ])
      ]),
      llmsSection('Обработать данные и проверить связи', [
        markdownList([
          `[JSON агрегированной сметы](${absoluteUrl(reglamentEstimate2026DataUrl())}): все разделы и строки; \`official\` хранит итоги из документа, \`computed\` — пересчет движком, \`formulas\` и \`caveats\` объясняют расчет.`,
          `[JSON полного регламента](${absoluteUrl(reglamentFull2026DataUrl())}): имущество, услуги, сопоставления со строками сметы и расчетные допущения.`,
          `[JSON детальной сметы](${absoluteUrl(reglamentEstimateDetails2026DataUrl())}): работы и ресурсы, источники, контрольные итоги и вопросы для проверки. Связи со строками и услугами объяснены в [индексе детальной сметы](${absoluteUrl(reglamentEstimateDetailsMarkdownUrl())}).`,
          `[Каталог API регламента](${absoluteUrl(reglamentApiCatalogUrl())}): контракты лент, схемы и OpenAPI.`,
          `[Как выбрать источник на сайте](${absoluteUrl('/.well-known/agent-skills/site-sections/SKILL.md')}): когда обращаться к смете, сравнению, документам и другим разделам.`
        ])
      ])
    ]
  });
