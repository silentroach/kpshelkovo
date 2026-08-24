import {
  createMarkdownDocument,
  md,
  serializeMarkdownDocument,
  type MarkdownPhrasingInput,
} from '@shelkovo/markdown';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { fullReglamentDataset2026 } from '@/data/reglament/full-2026';
import type {
  FullReglamentAuditNote,
  FullReglamentCalculationAssumption,
  FullReglamentCommonAsset,
  FullReglamentService,
  FullReglamentServiceToEstimateMapItem,
  FullReglamentSourceRef,
} from '@/lib/reglament/full-schema';
import type { EstimateRow, EstimateSourceRef } from '@/lib/reglament/schema';

import { absoluteUrl } from '../site';
import {
  reglamentAssetsUrl,
  reglamentFullAssetsMarkdownUrl,
  reglamentFullChecksMarkdownUrl,
  reglamentFullMarkdownUrl,
  reglamentFullServiceMapMarkdownUrl,
  reglamentFullServicesMarkdownUrl,
  reglamentFull2026DataUrl,
  reglamentFullSourcePdfUrl,
  reglamentSourcePdfUrl,
  reglamentServicesUrl,
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

const statusCounts = fullReglamentDataset2026.service_to_estimate_map.reduce(
  (count, item) => ({ ...count, [item.status]: count[item.status] + 1 }),
  { explicit_found: 0, partial: 0, not_found: 0, needs_check: 0 },
);

const flattenEstimateRows = (
  rows: readonly EstimateRow[],
): readonly EstimateRow[] =>
  rows.flatMap((row) => [row, ...flattenEstimateRows(row.children ?? [])]);

const requiresManualCheck = (value: string | null | undefined): boolean =>
  Boolean(value && /требует|нужно сверить/u.test(value));

const fullSource = (ref: FullReglamentSourceRef): ReturnType<typeof md.link> =>
  md.link(
    absoluteUrl(reglamentFullSourcePdfUrl()),
    `full.pdf стр. ${ref.page}, ${ref.fragment}`,
    ref.note,
  );

const sourceList = <T>(
  refs: readonly T[],
  format: (ref: T) => ReturnType<typeof md.link>,
): MarkdownPhrasingNodes =>
  refs.flatMap((ref, index) => [
    ...(index > 0 ? [md.text('; ')] : []),
    format(ref),
  ]);

const fullSources = (
  refs: readonly FullReglamentSourceRef[],
): MarkdownPhrasingNodes => sourceList(refs, fullSource);

const estimateSource = (ref: EstimateSourceRef): ReturnType<typeof md.link> => {
  const fragment = ref.fragment ? `, ${ref.fragment}` : '';

  return md.link(
    absoluteUrl(reglamentSourcePdfUrl(ref.pdf)),
    `${ref.pdf}.pdf стр. ${ref.page}${fragment}`,
    ref.note,
  );
};

const serviceTitleById = new Map(
  fullReglamentDataset2026.services.map((service) => [
    service.id,
    service.title,
  ]),
);

const manualEstimateRows = estimate2026.sections
  .flatMap((section) => flattenEstimateRows(section.rows))
  .filter((row) => row.tags?.includes('требует проверки'));

const manualCommonAssets = fullReglamentDataset2026.common_assets.filter(
  (asset) => requiresManualCheck(asset.verification_note),
);

const manualServiceMappings =
  fullReglamentDataset2026.service_to_estimate_map.filter(
    (item) =>
      item.status === 'needs_check' ||
      requiresManualCheck(item.verification_note),
  );

const manualCalculationAssumptions =
  fullReglamentDataset2026.calculation_assumptions.filter((item) =>
    requiresManualCheck(item.status_label_ru),
  );

const manualAuditNotes = fullReglamentDataset2026.audit_notes.filter(
  (item) => item.severity === 'needs_check',
);

const manualCheckCount =
  manualEstimateRows.length +
  manualCommonAssets.length +
  manualServiceMappings.length +
  manualCalculationAssumptions.length +
  manualAuditNotes.length;

const SERVICE_MAP_STATUS_LABELS = {
  explicit_found: 'найдено явно',
  partial: 'найдено частично',
  not_found: 'не найдено',
  needs_check: 'требует проверки',
} as const satisfies Record<
  FullReglamentServiceToEstimateMapItem['status'],
  string
>;

const AUDIT_SEVERITY_LABELS = {
  info: 'информация',
  watch: 'наблюдение',
  needs_check: 'требует проверки',
} as const satisfies Record<FullReglamentAuditNote['severity'], string>;

const estimateSources = (
  refs: readonly EstimateSourceRef[],
): MarkdownPhrasingNodes => sourceList(refs, estimateSource);

const estimateManualLine = (row: EstimateRow): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(`estimate_rows:${row.id}: ${row.title}; источник: `),
      ...estimateSources(row.source_refs),
      md.text(
        `; причина: ${row.description ?? row.tags?.join(', ') ?? 'требует проверки'}`,
      ),
    ]),
  ]);

const assetManualLine = (asset: FullReglamentCommonAsset): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(`common_assets:${asset.id}: ${asset.title}; источник: `),
      ...fullSources(asset.source_refs),
      md.text(`; причина: ${asset.verification_note}`),
    ]),
  ]);

const serviceManualLine = (
  item: FullReglamentServiceToEstimateMapItem,
): MarkdownListItem => {
  const serviceTitle = serviceTitleById.get(item.service_id) ?? item.service_id;
  const estimateRows = item.estimate_row_ids.join(', ') || '-';

  return md.listItem([
    md.paragraph([
      md.text(
        `service_to_estimate_map:${item.service_id}: ${serviceTitle}; статус: ${item.status_label_ru}; строки сметы: ${estimateRows}; источник: `,
      ),
      ...fullSources(item.source_refs),
      md.text(`; причина: ${item.verification_note ?? item.explanation}`),
    ]),
  ]);
};

const calculationManualLine = (
  item: FullReglamentCalculationAssumption,
): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(
        `calculation_assumptions:${item.id}: ${item.title}; статус: ${item.status_label_ru}; источник: `,
      ),
      ...fullSources(item.source_refs),
      md.text(`; как проверить: ${item.how_to_verify}`),
    ]),
  ]);

const auditManualLine = (item: FullReglamentAuditNote): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(
        `audit_notes:${item.id}: ${item.title}; ${item.public_wording}; источник: `,
      ),
      ...fullSources(item.source_refs),
      md.text(`; следующий шаг: ${item.next_step}`),
    ]),
  ]);

const assetLine = (asset: FullReglamentCommonAsset): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(
        `${asset.id}: ${asset.title}; единица: ${asset.unit ?? '-'}; итог: ${asset.total.raw}; источник: `,
      ),
      ...fullSources(asset.source_refs),
    ]),
  ]);

const optionalListSection = (
  title: MarkdownPhrasingInput,
  rows: readonly MarkdownListItem[],
): readonly MarkdownNode[] => [
  md.heading(3, title),
  ...(rows.length > 0 ? [md.list(rows)] : []),
];

const serviceLine = (service: FullReglamentService): MarkdownListItem => {
  const note = service.frequency_note
    ? `; примечание: ${service.frequency_note}`
    : '';

  return md.listItem([
    md.paragraph([
      md.text(
        `${service.id}: ${service.title}; группа: ${service.group}; периодичность: ${service.frequency_raw}${note}; источник: `,
      ),
      ...fullSources(service.source_refs),
    ]),
  ]);
};

const mappingLine = (
  item: FullReglamentServiceToEstimateMapItem,
): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(`${item.service_id}: ${item.status_label_ru} (`),
      md.inlineCode(item.status),
      md.text(
        `); строки сметы: ${item.estimate_row_ids.join(', ') || '-'}; ${item.explanation}`,
      ),
    ]),
  ]);

const calculationLine = (
  item: FullReglamentCalculationAssumption,
): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(
        `${item.id}: ${item.title}; статус: ${item.status_label_ru}; ${item.summary}; источник: `,
      ),
      ...fullSources(item.source_refs),
    ]),
  ]);

const auditLine = (item: FullReglamentAuditNote): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(`${item.id}: ${AUDIT_SEVERITY_LABELS[item.severity]} (`),
      md.inlineCode(item.severity),
      md.text(
        `); ${item.title}; ${item.public_wording}; следующий шаг: ${item.next_step}; источник: `,
      ),
      ...fullSources(item.source_refs),
    ]),
  ]);

const topicLine = (
  title: string,
  url: string,
  description: string,
): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.link(absoluteUrl(url), title),
      md.text(`: ${description}`),
    ]),
  ]);

const serviceMapStatusLine = (
  status: FullReglamentServiceToEstimateMapItem['status'],
): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(`${SERVICE_MAP_STATUS_LABELS[status]} (`),
      md.inlineCode(status),
      md.text(`): ${statusCounts[status]}`),
    ]),
  ]);

export const buildFullReglamentMarkdown = (): string =>
  serialize([
    md.heading(1, 'Полный регламент содержания Шелково'),
    md.paragraph(
      'Курируемый слой фактов из полного регламента для агентов и публичных справочных страниц. PDF не парсится во время запроса.',
    ),
    md.paragraph(
      'Этот файл оставлен как обзор и индекс тематических файлов; подробные списки вынесены ниже по ссылкам.',
    ),
    md.heading(2, 'Главные URL'),
    md.list([
      linkedUrlRow('JSON-набор данных', reglamentFull2026DataUrl()),
      linkedUrlRow('PDF полного регламента', reglamentFullSourcePdfUrl()),
      linkedUrlRow('Общее имущество', reglamentAssetsUrl()),
      linkedUrlRow('Услуги регламента', reglamentServicesUrl()),
    ]),
    md.heading(2, 'Тематические файлы'),
    md.list([
      topicLine(
        'Общее имущество',
        reglamentFullAssetsMarkdownUrl(),
        'перечень объектов, единицы измерения, итоги и ссылки на PDF',
      ),
      topicLine(
        'Услуги регламента',
        reglamentFullServicesMarkdownUrl(),
        'перечень услуг, группы и периодичность из приложения №4',
      ),
      topicLine(
        'Сопоставление услуг со сметой',
        reglamentFullServiceMapMarkdownUrl(),
        'статусы сопоставления услуг со сметой и ссылки на строки сметы',
      ),
      topicLine(
        'Проверки и допущения',
        reglamentFullChecksMarkdownUrl(),
        'ручная перепроверка, расчетные допущения и заметки аудита',
      ),
    ]),
    md.heading(2, 'Контрольные числа'),
    md.list([
      row(
        'Тарифицируемая площадь',
        `${fullReglamentDataset2026.tariff_summary.tariff_area_sotka} сотки`,
      ),
      row(
        'Годовой итог',
        `${fullReglamentDataset2026.tariff_summary.total_annual_cost_rub} руб.`,
      ),
      row(
        'Тариф',
        `${fullReglamentDataset2026.tariff_summary.tariff_rub_per_sotka_month} руб./сотка/мес.`,
      ),
    ]),
    md.heading(2, 'Покрытие набора данных'),
    md.list([
      row('Поселки', String(fullReglamentDataset2026.villages.length)),
      row(
        'Общее имущество',
        String(fullReglamentDataset2026.common_assets.length),
      ),
      row('Услуги', String(fullReglamentDataset2026.services.length)),
      row(
        'Сопоставления услуг со сметой',
        String(fullReglamentDataset2026.service_to_estimate_map.length),
      ),
      row(
        'Заметки аудита',
        String(fullReglamentDataset2026.audit_notes.length),
      ),
    ]),
    md.heading(2, 'Статусы сопоставления услуг'),
    md.list([
      serviceMapStatusLine('explicit_found'),
      serviceMapStatusLine('partial'),
      serviceMapStatusLine('not_found'),
      serviceMapStatusLine('needs_check'),
    ]),
    md.heading(2, 'Ручная перепроверка'),
    md.list([
      row('Всего позиций', String(manualCheckCount)),
      linkedUrlRow('Подробности', reglamentFullChecksMarkdownUrl()),
    ]),
    md.heading(2, 'Поселки'),
    md.list(
      fullReglamentDataset2026.villages.map((village) =>
        md.listItem(
          `${village.id}: ${village.title}; участков: ${village.households_count}; площадь: ${village.land_area_sotka} сотки; доля: ${village.land_area_share_percent}%`,
        ),
      ),
    ),
  ]);

export const buildFullReglamentAssetsMarkdown = (): string =>
  serialize([
    md.heading(1, 'Полный регламент: общее имущество'),
    md.list([
      linkedUrlRow('Индекс', reglamentFullMarkdownUrl()),
      linkedUrlRow('JSON-набор данных', reglamentFull2026DataUrl()),
      linkedUrlRow('HTML-страница', reglamentAssetsUrl()),
    ]),
    md.heading(2, 'Сводка'),
    md.list([
      row('Позиций', String(fullReglamentDataset2026.common_assets.length)),
      row('Позиции с открытой проверкой', String(manualCommonAssets.length)),
    ]),
    md.heading(2, 'Общее имущество'),
    md.list(fullReglamentDataset2026.common_assets.map(assetLine)),
  ]);

export const buildFullReglamentServicesMarkdown = (): string =>
  serialize([
    md.heading(1, 'Полный регламент: услуги'),
    md.list([
      linkedUrlRow('Индекс', reglamentFullMarkdownUrl()),
      linkedUrlRow('JSON-набор данных', reglamentFull2026DataUrl()),
      linkedUrlRow('HTML-страница', reglamentServicesUrl()),
    ]),
    md.heading(2, 'Сводка'),
    md.list([row('Услуг', String(fullReglamentDataset2026.services.length))]),
    md.heading(2, 'Услуги'),
    md.list(fullReglamentDataset2026.services.map(serviceLine)),
  ]);

export const buildFullReglamentServiceMapMarkdown = (): string =>
  serialize([
    md.heading(1, 'Полный регламент: сопоставление услуг со сметой'),
    md.list([
      linkedUrlRow('Индекс', reglamentFullMarkdownUrl()),
      linkedUrlRow('JSON-набор данных', reglamentFull2026DataUrl()),
    ]),
    md.heading(2, 'Статусы сопоставления услуг'),
    md.list([
      serviceMapStatusLine('explicit_found'),
      serviceMapStatusLine('partial'),
      serviceMapStatusLine('not_found'),
      serviceMapStatusLine('needs_check'),
    ]),
    md.heading(2, 'Сопоставления'),
    md.list(fullReglamentDataset2026.service_to_estimate_map.map(mappingLine)),
  ]);

export const buildFullReglamentChecksMarkdown = (): string =>
  serialize([
    md.heading(1, 'Полный регламент: проверки и допущения'),
    md.list([
      linkedUrlRow('Индекс', reglamentFullMarkdownUrl()),
      linkedUrlRow('JSON-набор данных', reglamentFull2026DataUrl()),
    ]),
    md.heading(2, 'Сводка'),
    md.list([
      row('Всего позиций ручной перепроверки', String(manualCheckCount)),
      row(
        'Строк сметы с тегом «требует проверки»',
        String(manualEstimateRows.length),
      ),
      row(
        'Объектов общего имущества с открытой проверкой',
        String(manualCommonAssets.length),
      ),
      row(
        'Сопоставлений услуг, где нужна сверка',
        String(manualServiceMappings.length),
      ),
      row(
        'Расчетных допущений, требующих проверки',
        String(manualCalculationAssumptions.length),
      ),
      row('Заметок аудита со статусом', [
        md.inlineCode('needs_check'),
        md.text(`: ${manualAuditNotes.length}`),
      ]),
    ]),
    md.heading(2, 'Ручная перепроверка'),
    ...optionalListSection(
      'Строки сметы с тегом «требует проверки»',
      manualEstimateRows.map(estimateManualLine),
    ),
    ...optionalListSection(
      'Общее имущество с открытой проверкой',
      manualCommonAssets.map(assetManualLine),
    ),
    ...optionalListSection(
      'Услуги, где нужно сверить первичку или конфликт сопоставления',
      manualServiceMappings.map(serviceManualLine),
    ),
    ...optionalListSection(
      'Расчетные допущения, требующие проверки',
      manualCalculationAssumptions.map(calculationManualLine),
    ),
    ...optionalListSection(
      [md.text('Заметки аудита со статусом '), md.inlineCode('needs_check')],
      manualAuditNotes.map(auditManualLine),
    ),
    md.heading(2, 'Расчетные допущения'),
    md.list(
      fullReglamentDataset2026.calculation_assumptions.map(calculationLine),
    ),
    md.heading(2, 'Заметки аудита'),
    md.list(fullReglamentDataset2026.audit_notes.map(auditLine)),
  ]);
