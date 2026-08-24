import {
  createMarkdownDocument,
  md,
  serializeMarkdownDocument,
  type MarkdownPhrasingInput,
} from '@shelkovo/markdown';

import type { Estimate } from './schema';
import { absoluteUrl } from '../site';
import { buildReglamentPayload } from './discovery';
import {
  formatReglamentAnnualMoney,
  formatReglamentNumber,
  formatReglamentTariff,
} from './format';
import {
  reglamentApiCatalogUrl,
  reglamentEstimate2026DataUrl,
  reglamentEstimate2026OpenApiUrl,
  reglamentEstimate2026SchemaUrl,
  reglamentLlmsFullUrl,
  reglamentLlmsUrl,
  reglamentUrl,
} from './routes';

type MarkdownNode = Parameters<
  typeof createMarkdownDocument
>[0]['children'][number];
type MarkdownListItem = ReturnType<typeof md.listItem>;
type MarkdownPhrasingNodes = Exclude<MarkdownPhrasingInput, string>;

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const phrase = (value: MarkdownPhrasingInput): MarkdownPhrasingNodes =>
  typeof value === 'string' ? [md.text(value)] : value;

const row = (label: string, value: MarkdownPhrasingInput): MarkdownListItem =>
  md.listItem([md.paragraph([md.text(`${label}: `), ...phrase(value)])]);

const linkedUrlRow = (label: string, url: string): MarkdownListItem => {
  const href = absoluteUrl(url);

  return row(label, [md.link(href, href)]);
};

const source = (
  ref: ReturnType<typeof buildReglamentPayload>['source_refs'][number],
): ReturnType<typeof md.link> => {
  const fragment = ref.fragment ? `, ${ref.fragment}` : '';

  return md.link(
    absoluteUrl(ref.pdf_url),
    `${ref.pdf}.pdf, стр. ${ref.page}${fragment}`,
    ref.note,
  );
};

const sourcePhrasing = (
  refs: readonly ReturnType<
    typeof buildReglamentPayload
  >['source_refs'][number][],
): MarkdownPhrasingNodes =>
  refs.flatMap((ref, index) => [
    ...(index > 0 ? [md.text('; ')] : []),
    source(ref),
  ]);

const reglamentRow = (
  row: ReturnType<
    typeof buildReglamentPayload
  >['sections'][number]['rows'][number],
): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(
        `${row.title} — ${formatReglamentTariff(row.baseline.tariff_per_sotka_month)}; ${formatReglamentAnnualMoney(row.baseline.annual_gross)}; источник: `,
      ),
      ...sourcePhrasing(row.source_refs),
    ]),
    ...(row.description ? [md.paragraph(row.description)] : []),
    ...(row.tags && row.tags.length > 0
      ? [
          md.paragraph(
            row.tags.flatMap((tag, index) => [
              md.text(index === 0 ? 'Теги: ' : ', '),
              md.inlineCode(tag),
            ]),
          ),
        ]
      : []),
  ]);

export function buildReglamentMarkdown(estimate: Estimate): string {
  const payload = buildReglamentPayload(estimate);

  return serialize([
    md.heading(1, 'Калькулятор тарифа по смете 2026'),
    md.paragraph('Текстовая версия интерактивной сметы регламента.'),
    md.paragraph([
      md.text('В интерфейсе тариф показывается как ₽/сотка; машинное поле '),
      md.inlineCode('tariff_per_sotka_month'),
      md.text(' остается месячным тарифом.'),
    ]),
    md.heading(2, 'Главные URL'),
    md.list([
      linkedUrlRow('Раздел', reglamentUrl()),
      linkedUrlRow('JSON сметы', reglamentEstimate2026DataUrl()),
      linkedUrlRow('JSON Schema', reglamentEstimate2026SchemaUrl()),
      linkedUrlRow('OpenAPI', reglamentEstimate2026OpenApiUrl()),
      linkedUrlRow('Каталог API', reglamentApiCatalogUrl()),
      linkedUrlRow('llms.txt', reglamentLlmsUrl()),
      linkedUrlRow('llms-full.txt', reglamentLlmsFullUrl()),
      ...payload.sources.map((item) =>
        linkedUrlRow(`Исходный PDF ${item.pdf}.pdf`, item.pdf_url),
      ),
    ]),
    md.heading(2, 'Итог'),
    md.list([
      row(
        'Официальный годовой итог',
        formatReglamentAnnualMoney(payload.official.annual_gross),
      ),
      row(
        'Официальный тариф',
        formatReglamentTariff(payload.official.tariff_per_sotka_month),
      ),
      row(
        'Расчетная база в JSON',
        `${formatReglamentAnnualMoney(payload.computed.annual_gross)}; ${formatReglamentTariff(payload.computed.tariff_per_sotka_month)}`,
      ),
      row(
        'Тарифицируемая площадь',
        `${formatReglamentNumber(payload.tariff_area_sotki)} сотки`,
      ),
    ]),
    md.heading(2, 'Формулы'),
    md.list([
      row('Тариф', [md.inlineCode(payload.formulas.tariff_per_sotka_month)]),
      row('ФОТ', [md.inlineCode(payload.formulas.row_breakdown.fot)]),
      row('Доходы всего', [
        md.inlineCode(payload.formulas.row_breakdown.income),
      ]),
      row('Сумма с НДС', [md.inlineCode(payload.formulas.row_breakdown.gross)]),
    ]),
    md.heading(2, 'Ограничения'),
    md.list(payload.caveats.map((item) => md.listItem(item))),
    ...payload.sections.flatMap((section) => [
      md.heading(2, section.title),
      md.list([
        row(
          'Итог раздела',
          `${formatReglamentAnnualMoney(section.official.annual_gross)}; ${formatReglamentTariff(section.official.tariff_per_sotka_month)}`,
        ),
        ...section.rows.map(reglamentRow),
      ]),
    ]),
  ]);
}
