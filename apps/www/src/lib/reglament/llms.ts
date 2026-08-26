import { count } from '@shelkovo/format';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import {
  llmsSection,
  markdownList,
  serializeLlmsDocument,
} from '@/lib/markdown/llms-document';

import { absoluteUrl } from '../site';
import { calculateEstimate } from './calculate';
import {
  REGLAMENT_CAVEATS,
  REGLAMENT_FORMULAS,
  buildReglamentPayload,
} from './discovery';
import {
  formatReglamentAnnualMoney,
  formatReglamentNumber,
  formatReglamentTariff,
} from './format';
import {
  reglamentApiCatalogUrl,
  reglamentAssetsUrl,
  reglamentEstimateDetailsChecksMarkdownUrl,
  reglamentEstimateDetails2026DataUrl,
  reglamentEstimateDetailsLaborMarkdownUrl,
  reglamentEstimateDetailsMachinesMarkdownUrl,
  reglamentEstimateDetailsMarkdownUrl,
  reglamentEstimateDetailsMaterialsMarkdownUrl,
  reglamentEstimate2026DataUrl,
  reglamentEstimate2026OpenApiUrl,
  reglamentEstimate2026SchemaUrl,
  reglamentFullAssetsMarkdownUrl,
  reglamentFullChecksMarkdownUrl,
  reglamentFull2026DataUrl,
  reglamentFullMarkdownUrl,
  reglamentFullServiceMapMarkdownUrl,
  reglamentFullServicesMarkdownUrl,
  reglamentFullSourcePdfUrl,
  reglamentLlmsFullUrl,
  reglamentLlmsUrl,
  reglamentMarkdownUrl,
  reglamentServicesUrl,
  reglamentUrl,
} from './routes';
import type { EstimateRow } from './schema';

const rowsCount = (rows: readonly EstimateRow[]): number =>
  rows.reduce((total, row) => total + 1 + rowsCount(row.children ?? []), 0);

export function build(kind: 'short' | 'full'): string {
  const payload = buildReglamentPayload(estimate2026);
  const calculated = calculateEstimate(estimate2026);
  const rows = estimate2026.sections.reduce(
    (total, section) => total + rowsCount(section.rows),
    0,
  );

  const home = absoluteUrl(reglamentUrl());
  const markdown = absoluteUrl(reglamentMarkdownUrl());
  const fullMarkdown = absoluteUrl(reglamentFullMarkdownUrl());
  const fullAssetsMarkdown = absoluteUrl(reglamentFullAssetsMarkdownUrl());
  const fullServicesMarkdown = absoluteUrl(reglamentFullServicesMarkdownUrl());
  const fullServiceMapMarkdown = absoluteUrl(
    reglamentFullServiceMapMarkdownUrl(),
  );
  const fullChecksMarkdown = absoluteUrl(reglamentFullChecksMarkdownUrl());
  const detailsMarkdown = absoluteUrl(reglamentEstimateDetailsMarkdownUrl());
  const detailsMaterialsMarkdown = absoluteUrl(
    reglamentEstimateDetailsMaterialsMarkdownUrl(),
  );
  const detailsMachinesMarkdown = absoluteUrl(
    reglamentEstimateDetailsMachinesMarkdownUrl(),
  );
  const detailsLaborMarkdown = absoluteUrl(
    reglamentEstimateDetailsLaborMarkdownUrl(),
  );
  const detailsChecksMarkdown = absoluteUrl(
    reglamentEstimateDetailsChecksMarkdownUrl(),
  );
  const feed = absoluteUrl(reglamentEstimate2026DataUrl());
  const detailFeed = absoluteUrl(reglamentEstimateDetails2026DataUrl());
  const fullDataset = absoluteUrl(reglamentFull2026DataUrl());
  const fullSourcePdf = absoluteUrl(reglamentFullSourcePdfUrl());
  const assets = absoluteUrl(reglamentAssetsUrl());
  const services = absoluteUrl(reglamentServicesUrl());
  const short = absoluteUrl(reglamentLlmsUrl());
  const full = absoluteUrl(reglamentLlmsFullUrl());
  const catalog = absoluteUrl(reglamentApiCatalogUrl());
  const schema = absoluteUrl(reglamentEstimate2026SchemaUrl());
  const openapi = absoluteUrl(reglamentEstimate2026OpenApiUrl());

  return kind === 'short'
    ? serializeLlmsDocument({
        title: 'Калькулятор тарифа по смете 2026',
        file: 'llms.txt',
        sections: [
          llmsSection('Описание', [
            markdownList([
              'Это статический раздел `/815/regulation/` внутри kpshelkovo.online для интерактивной сметы тарифа 2026.',
              `Исходный расчет: ${formatReglamentTariff(payload.official.tariff_per_sotka_month)} при годовом итоге ${formatReglamentAnnualMoney(payload.official.annual_gross)} и площади ${formatReglamentNumber(payload.tariff_area_sotki)} сотки.`,
              `Смета включает ${count(payload.sections.length, ['секцию', 'секции', 'секций'])} и ${count(rows, ['строку', 'строки', 'строк'])}; строки содержат суммы, формулы и ссылки на источники.`,
              'В интерфейсе тариф показывается как ₽/сотка; машинное поле `tariff_per_sotka_month` остается месячным тарифом.',
            ]),
          ]),
          llmsSection('Главные URL', [
            markdownList([
              `Раздел: ${home}`,
              `Markdown-версия: ${markdown}`,
              `Markdown-версия детальной сметы: ${detailsMarkdown}`,
              `Темы детальной сметы в Markdown: ${detailsMaterialsMarkdown}, ${detailsMachinesMarkdown}, ${detailsLaborMarkdown}, ${detailsChecksMarkdown}`,
              `Markdown-версия полного регламента: ${fullMarkdown}`,
              `Темы полного регламента в Markdown: ${fullAssetsMarkdown}, ${fullServicesMarkdown}, ${fullServiceMapMarkdown}, ${fullChecksMarkdown}`,
              `JSON сметы: ${feed}`,
              `JSON детальной сметы: ${detailFeed}`,
              `Набор данных полного регламента: ${fullDataset}`,
              `PDF полного регламента: ${fullSourcePdf}`,
              `Общее имущество: ${assets}`,
              `Услуги регламента: ${services}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              `Расширенная версия этого текста: ${full}`,
              `Исходные PDF: ${payload.sources.map((item) => absoluteUrl(item.pdf_url)).join(', ')}`,
            ]),
          ]),
          llmsSection('Как читать JSON', [
            markdownList([
              '`official` хранит значения из итоговой сметы, `computed` хранит базовый расчет, пересчитанный расчетным движком.',
              '`sections[].rows[]` включает базовые значения, расчетные значения, ссылки на источники, редактируемые поля, теги и разбор суммы.',
              'В `estimate-details-2026.json` поле `sources` хранит уникальные фрагменты PDF, а `source_refs` у фактов и `needs_check` — их идентификаторы.',
              '`full-2026.json` хранит слой полного регламента: villages, common_assets, services, service_to_estimate_map, calculation_assumptions и audit_notes.',
              '`details.md` является индексом; тематические Markdown-файлы разбиты по материалам, машинам, труду и проверкам.',
              '`full.md` является индексом; подробные Markdown-файлы разбиты по имуществу, услугам, сопоставлениям и проверкам.',
              `Формула тарифа: \`${REGLAMENT_FORMULAS.tariff_per_sotka_month}\`.`,
            ]),
          ]),
          llmsSection('Что открыть для проверки', [
            markdownList([
              'Агрегированная смета: `estimate-2026.json` и `index.md` — разделы, строки, итоговые суммы, базовые частоты и разбор суммы.',
              'Услуги полного регламента: `full-2026.json`, `full/services.md` и `full/service-map.md` — формулировки услуг, периодичность и связь со строками сметы.',
              'Детальные ресурсы: `estimate-details-2026.json` и `details/*.md` — работы, материалы, машины, труд, подрядчики, контрольные итоги и `needs_check` из маленьких PDF.',
              'Связки: `estimate_row_id` соединяет детальные факты с агрегированной сметой; `service_ids` соединяют работы с услугами полного регламента.',
              'Пример проверки: для полива дорог сопоставьте услуги `summer-road-dust-suppression` и `summer-road-watering`, строку `cleaning-summer-mechanized` и детальные ресурсы полива.',
            ]),
          ]),
        ],
      })
    : serializeLlmsDocument({
        title: 'Калькулятор тарифа по смете 2026',
        file: 'llms-full.txt',
        sections: [
          llmsSection('Проект', [
            markdownList([
              'Это машиночитаемый и текстовый слой страницы `/815/regulation/` с калькулятором тарифа по смете регламента 2026.',
              'Материалы дают расчетные суммы, ссылки на источники и проверочные заметки по строкам сметы.',
              'В интерфейсе тариф показывается как ₽/сотка; машинное поле `tariff_per_sotka_month` остается месячным тарифом.',
              `Официальная база расчета: ${formatReglamentAnnualMoney(payload.official.annual_gross)} и ${formatReglamentTariff(payload.official.tariff_per_sotka_month)}.`,
              `Расчетная база сейчас дает ${formatReglamentAnnualMoney(calculated.annual_gross)} и ${formatReglamentTariff(calculated.tariff_per_sotka_month)}.`,
            ]),
          ]),
          llmsSection('Канонические URL', [
            markdownList([
              `Раздел: ${home}`,
              `Markdown-версия: ${markdown}`,
              `Markdown-версия детальной сметы: ${detailsMarkdown}`,
              `Markdown-версия детальной сметы, материалы: ${detailsMaterialsMarkdown}`,
              `Markdown-версия детальной сметы, машины: ${detailsMachinesMarkdown}`,
              `Markdown-версия детальной сметы, труд: ${detailsLaborMarkdown}`,
              `Markdown-версия детальной сметы, проверки: ${detailsChecksMarkdown}`,
              `Markdown-версия полного регламента: ${fullMarkdown}`,
              `Markdown-версия полного регламента, имущество: ${fullAssetsMarkdown}`,
              `Markdown-версия полного регламента, услуги: ${fullServicesMarkdown}`,
              `Markdown-версия полного регламента, сопоставления: ${fullServiceMapMarkdown}`,
              `Markdown-версия полного регламента, проверки: ${fullChecksMarkdown}`,
              `Короткий обзор llms.txt: ${short}`,
              `Подробный обзор llms-full.txt: ${full}`,
              `JSON сметы: ${feed}`,
              `JSON детальной сметы: ${detailFeed}`,
              `Набор данных полного регламента: ${fullDataset}`,
              `PDF полного регламента: ${fullSourcePdf}`,
              `Общее имущество: ${assets}`,
              `Услуги регламента: ${services}`,
              `Каталог API: ${catalog}`,
              `JSON Schema: ${schema}`,
              `OpenAPI: ${openapi}`,
              ...payload.sources.map(
                (item) => `PDF ${item.pdf}.pdf: ${absoluteUrl(item.pdf_url)}`,
              ),
            ]),
          ]),
          llmsSection('JSON', [
            markdownList([
              'Корневой объект включает `id`, `year`, `title`, `tariff_area_sotki`, `coefficients`, `official`, `computed`, `formulas`, `source_refs`, `sources`, `caveats` и `sections`.',
              '`sections[]` содержит официальный итог раздела, расчетные итоги и строки.',
              '`rows[]` содержит стабильный `id`, `title`, `kind`, `coefficient_policy`, базовый разбор суммы, расчетный разбор суммы, ссылки на источники и редактируемые поля.',
              '`source_refs[]` указывают PDF, страницу, фрагмент и публичный `pdf_url` исходного PDF.',
              'В `estimate-details-2026.json` поле `sources` хранит уникальные фрагменты PDF, а `source_refs` у работ, ресурсов, контрольных итогов и `needs_check` — их идентификаторы.',
              '`details.md` хранит индекс детальной сметы, а `/815/regulation/details/*.md` разбивает ресурсы по материалам, машинам, труду и проверкам.',
              'Отдельный `full-2026.json` хранит слой полного регламента без внутренних путей репозитория в ссылках на источники: имущество, услуги, сопоставления, расчетные допущения и заметки проверки.',
              '`full.md` хранит обзор и индекс, а подробные Markdown-файлы лежат в `/815/regulation/full/*.md`.',
            ]),
          ]),
          llmsSection('Как выбирать источник', [
            markdownList([
              'Агрегированная смета: `estimate-2026.json` и `index.md` — официальная база по разделам и строкам, базовые частоты, годовые суммы, формулы и разбор суммы.',
              'Услуги полного регламента: `full-2026.json`, `full/services.md` и `full/service-map.md` — перечень услуг, периодичность, исходные формулировки и сопоставление с `estimate_row_id`.',
              'Детальные ресурсы: `estimate-details-2026.json` и `details/*.md` — работы, ресурсы, контрольные итоги, ссылки на источники и причины `needs_check` из маленьких PDF.',
              'Практический порядок ответа: услуга и периодичность из полного слоя, строка и сумма из агрегированной сметы, состав ресурсов и проверки из детального слоя.',
              'Пример вопроса: для полива дорог сравните `summer-road-dust-suppression`, `summer-road-watering`, строку `cleaning-summer-mechanized` и детальные ресурсы воды/поливомоечной техники.',
            ]),
          ]),
          llmsSection('Формулы', [
            markdownList([
              `Тариф: \`${REGLAMENT_FORMULAS.tariff_per_sotka_month}\``,
              `ФОТ: \`${REGLAMENT_FORMULAS.row_breakdown.fot}\``,
              `Direct: \`${REGLAMENT_FORMULAS.row_breakdown.direct}\``,
              `Gross: \`${REGLAMENT_FORMULAS.row_breakdown.gross}\``,
            ]),
          ]),
          llmsSection('Секции', [
            markdownList(
              payload.sections.map(
                (section) =>
                  `${section.title}: ${formatReglamentAnnualMoney(section.official.annual_gross)}; ${formatReglamentTariff(section.official.tariff_per_sotka_month)}; строк: ${section.rows.length}`,
              ),
            ),
          ]),
          llmsSection('Ограничения', [markdownList(REGLAMENT_CAVEATS)]),
        ],
      });
}
