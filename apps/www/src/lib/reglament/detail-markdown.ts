import { estimateDetails2026 } from '@/data/reglament/estimate-details-2026';
import type {
  EstimateDetailControlTotal,
  EstimateDetailDataset,
  EstimateDetailMoneyValue,
  EstimateDetailQuantityValue,
  EstimateDetailResource,
  EstimateDetailResourceKind,
  EstimateDetailSourceQuoteItem,
  EstimateDetailSourceRef,
  EstimateDetailWorkItem,
} from '@/lib/reglament/detail-schema';
import { ESTIMATE_DETAIL_RESOURCE_KINDS } from '@/lib/reglament/detail-schema';
import { serializeMarkdownLineDocument } from '@/lib/markdown/llms-document';

import { absoluteUrl } from '../site';
import { formatReglamentMoney, formatReglamentNumber } from './format';
import { ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_VERSION } from './detail-public-schema';
import {
  reglamentEstimateDetailsChecksMarkdownUrl,
  reglamentEstimateDetails2026DataUrl,
  reglamentEstimateDetailsLaborMarkdownUrl,
  reglamentEstimateDetailsMachinesMarkdownUrl,
  reglamentEstimateDetailsMarkdownUrl,
  reglamentEstimateDetailsMaterialsMarkdownUrl,
  reglamentEstimate2026DataUrl,
  reglamentFull2026DataUrl,
  reglamentFullServiceMapMarkdownUrl,
  reglamentFullServicesMarkdownUrl,
  reglamentSourcePdfUrl,
} from './routes';

const RESOURCE_KIND_LABELS = {
  labor: 'труд',
  machinist_labor: 'труд машинистов',
  machine: 'машины',
  material: 'материалы',
  contractor: 'подрядчики',
  other_cost: 'прочие затраты',
} as const satisfies Record<EstimateDetailResourceKind, string>;

const CONTROL_SOURCE_LABELS = {
  section_pdf: 'секционный PDF',
  final_pdf: 'итоговый PDF',
} as const satisfies Record<
  EstimateDetailControlTotal['control_source'],
  string
>;

const EMPTY_LIST_LINE = '- Нет данных в текущей версии набора.';

const code = (value: string): string => `\`${value}\``;

const serializeLines = (lines: readonly string[]): string =>
  serializeMarkdownLineDocument(lines, new Set());

const sourceQuoteItem = (
  item: EstimateDetailSourceQuoteItem,
  index: number,
): string => {
  const resourceIds = item.resource_ids?.length
    ? `; ресурсы: ${item.resource_ids.map(code).join(', ')}`
    : '';
  const quantity = item.quantity
    ? `; кол-во: ${formatQuantity(item.quantity)}`
    : '';
  const unitPrice = item.unit_price_rub
    ? `; цена: ${formatMoney(item.unit_price_rub)}`
    : '';
  const total = item.total_rub ? `; итог: ${formatMoney(item.total_rub)}` : '';
  const note = item.note ? `; примечание: ${item.note}` : '';

  return `${index + 1}) ${item.label}${resourceIds}${quantity}${unitPrice}${total}${note}`;
};

const source = (ref: EstimateDetailSourceRef): string => {
  const fragment = ref.fragment ? `, ${ref.fragment}` : '';
  const quote = ref.quote ? `; цитата: «${ref.quote}»` : '';
  const quoteItems = ref.quote_items
    ? `; позиции цитаты: ${ref.quote_items.map(sourceQuoteItem).join(' | ')}`
    : '';
  const note = ref.note ? `; примечание: ${ref.note}` : '';

  return `[${ref.pdf}.pdf стр. ${ref.page}${fragment}](${absoluteUrl(reglamentSourcePdfUrl(ref.pdf))})${quote}${quoteItems}${note}`;
};

const sources = (refs: readonly EstimateDetailSourceRef[]): string =>
  refs.map(source).join('; ');

const formatMoney = (money: EstimateDetailMoneyValue | undefined): string => {
  if (!money) return '-';

  const value =
    money.value === null ? 'нет данных' : formatReglamentMoney(money.value);
  const note = money.note ? ` (${money.note})` : '';

  return `${value}${note}`;
};

const formatQuantity = (
  quantity: EstimateDetailQuantityValue | undefined,
): string => {
  if (!quantity) return '-';

  const value =
    quantity.value === null
      ? 'нет данных'
      : `${formatReglamentNumber(quantity.value)}${quantity.unit ? ` ${quantity.unit}` : ''}`;
  const note = quantity.note ? ` (${quantity.note})` : '';

  return `${value}${note}`;
};

const formatDelta = (value: number | undefined): string => {
  if (value === undefined) return '-';

  const sign = value > 0 ? '+' : '';

  return `${sign}${formatReglamentNumber(value)} ₽`;
};

const linesOrEmpty = <T>(
  items: readonly T[],
  line: (item: T) => string,
): readonly string[] =>
  items.length > 0 ? items.map(line) : [EMPTY_LIST_LINE];

const needsCheckWorkItems = (
  dataset: EstimateDetailDataset,
): readonly EstimateDetailWorkItem[] =>
  dataset.work_items.filter((item) => item.status === 'needs_check');

const needsCheckResources = (
  dataset: EstimateDetailDataset,
): readonly EstimateDetailResource[] =>
  dataset.resources.filter((item) => item.status === 'needs_check');

const needsCheckControlTotals = (
  dataset: EstimateDetailDataset,
): readonly EstimateDetailControlTotal[] =>
  dataset.control_totals.filter((item) => item.status === 'needs_check');

const needsCheckCount = (dataset: EstimateDetailDataset): number =>
  needsCheckWorkItems(dataset).length +
  needsCheckResources(dataset).length +
  needsCheckControlTotals(dataset).length;

const resourcesByKind = (
  dataset: EstimateDetailDataset,
  kinds: readonly EstimateDetailResourceKind[],
): readonly EstimateDetailResource[] =>
  dataset.resources.filter((resource) => kinds.includes(resource.kind));

const moneyValue = (
  money: EstimateDetailMoneyValue | undefined,
): number | undefined => money?.value ?? undefined;

const resourceTotalSummary = (
  resources: readonly EstimateDetailResource[],
): string => {
  let total = 0;
  let withoutTotal = 0;

  for (const resource of resources) {
    const resourceTotal = moneyValue(resource.total_rub);

    if (resourceTotal === undefined) {
      withoutTotal += 1;
      continue;
    }

    total += resourceTotal;
  }

  return withoutTotal > 0
    ? `${formatReglamentMoney(total)}; без суммы: ${withoutTotal}`
    : formatReglamentMoney(total);
};

const resourceGroupsByEstimateRow = (
  resources: readonly EstimateDetailResource[],
): readonly {
  readonly estimateRowId: string;
  readonly resources: readonly EstimateDetailResource[];
}[] => {
  const groups: {
    readonly estimateRowId: string;
    readonly resources: EstimateDetailResource[];
  }[] = [];
  const groupByEstimateRowId = new Map<string, EstimateDetailResource[]>();

  for (const resource of resources) {
    const estimateRowId = resource.estimate_row_id;
    const existingGroup = groupByEstimateRowId.get(estimateRowId);

    if (existingGroup) {
      existingGroup.push(resource);
      continue;
    }

    const groupResources = [resource];
    groupByEstimateRowId.set(estimateRowId, groupResources);
    groups.push({
      estimateRowId,
      resources: groupResources,
    });
  }

  return groups;
};

const sourceLabelsByRenderedSource = (
  resources: readonly EstimateDetailResource[],
): ReadonlyMap<string, string> => {
  const labels = new Map<string, string>();

  for (const resource of resources) {
    for (const ref of resource.source_refs) {
      const renderedSource = source(ref);

      if (!labels.has(renderedSource)) {
        labels.set(renderedSource, `S${labels.size + 1}`);
      }
    }
  }

  return labels;
};

const sourceLabelsForResource = (
  resource: EstimateDetailResource,
  sourceLabels: ReadonlyMap<string, string>,
): string =>
  resource.source_refs
    .map((ref) => sourceLabels.get(source(ref)) ?? '?')
    .join(', ');

const sourceLinesForLabels = (
  sourceLabels: ReadonlyMap<string, string>,
): readonly string[] =>
  Array.from(sourceLabels.entries()).map(
    ([renderedSource, label]) => `- \`${label}\`: ${renderedSource}`,
  );

const resourceWorkItemsLine = (
  resources: readonly EstimateDetailResource[],
  workItemsById: ReadonlyMap<string, EstimateDetailWorkItem>,
): string => {
  const workItemIds = Array.from(
    new Set(resources.map((resource) => resource.work_item_id)),
  );

  return workItemIds
    .map((id) => {
      const workItem = workItemsById.get(id);

      return workItem ? `${code(id)}: ${workItem.title}` : code(id);
    })
    .join('; ');
};

const resourceIndexLine = (
  group: ReturnType<typeof resourceGroupsByEstimateRow>[number],
): string =>
  `- ${code(group.estimateRowId)}: ресурсов: ${group.resources.length}; итог: ${resourceTotalSummary(group.resources)}`;

const resourceFieldLine = (label: string, value: string): string =>
  `  - ${label}: ${value}`;

const resourceLines = (
  resources: readonly EstimateDetailResource[],
  sourceLabels: ReadonlyMap<string, string>,
  options: ResourceMarkdownOptions,
): readonly string[] => {
  const showKind = options.kinds.length > 1;
  const priceLabel = options.priceLabel === 'ставка' ? 'Ставка' : 'Цена';

  return resources.flatMap((resource) => {
    const lines = [`- \`${resource.id}\` — ${resource.title}`];

    if (showKind) {
      lines.push(resourceFieldLine('Вид', RESOURCE_KIND_LABELS[resource.kind]));
    }

    lines.push(
      resourceFieldLine('Работа', code(resource.work_item_id)),
      resourceFieldLine('Строка сметы', code(resource.estimate_row_id)),
      resourceFieldLine('Статья затрат', code(resource.cost_bucket)),
      resourceFieldLine('Кол-во', formatQuantity(resource.quantity)),
      resourceFieldLine(priceLabel, formatMoney(resource.unit_price_rub)),
      resourceFieldLine('Итог', formatMoney(resource.total_rub)),
      resourceFieldLine(
        'Источники',
        sourceLabelsForResource(resource, sourceLabels),
      ),
    );

    if (resource.note) {
      lines.push(resourceFieldLine('Примечание', resource.note));
    }

    return lines;
  });
};

const resourceGroupLines = (
  group: ReturnType<typeof resourceGroupsByEstimateRow>[number],
  workItemsById: ReadonlyMap<string, EstimateDetailWorkItem>,
  options: ResourceMarkdownOptions,
): readonly string[] => {
  const sourceLabels = sourceLabelsByRenderedSource(group.resources);

  return [
    `### ${code(group.estimateRowId)}`,
    '',
    `- Ресурсов: ${group.resources.length}`,
    `- Итог по ресурсам: ${resourceTotalSummary(group.resources)}`,
    `- Работы: ${resourceWorkItemsLine(group.resources, workItemsById)}`,
    '',
    '#### Ресурсы',
    ...resourceLines(group.resources, sourceLabels, options),
    '',
    '#### Источники группы',
    ...sourceLinesForLabels(sourceLabels),
    '',
  ];
};

const topicLine = (title: string, path: string, description: string): string =>
  `- [${title}](${absoluteUrl(path)}): ${description}`;

const sourcePdfLine = (
  pdf: EstimateDetailDataset['source_pdfs'][number],
): string => {
  const pages = pdf.pages_total ? `; страниц: ${pdf.pages_total}` : '';

  return `- ${pdf.pdf}.pdf: ${pdf.title}${pages}; ссылка: ${absoluteUrl(reglamentSourcePdfUrl(pdf.pdf))}`;
};

type ResourceMarkdownOptions = {
  readonly title: string;
  readonly summaryLabel: string;
  readonly sectionTitle: string;
  readonly kinds: readonly EstimateDetailResourceKind[];
  readonly priceLabel?: 'цена' | 'ставка';
};

const buildEstimateDetailResourcesMarkdown = (
  dataset: EstimateDetailDataset,
  options: ResourceMarkdownOptions,
): string => {
  const resources = resourcesByKind(dataset, options.kinds);
  const groups = resourceGroupsByEstimateRow(resources);
  const workItemsById = new Map(
    dataset.work_items.map((workItem) => [workItem.id, workItem]),
  );

  return serializeLines([
    options.title,
    '',
    `- Индекс: ${absoluteUrl(reglamentEstimateDetailsMarkdownUrl())}`,
    `- JSON-набор данных: ${absoluteUrl(reglamentEstimateDetails2026DataUrl())}`,
    '',
    '## Как читать',
    '- Данные сгруппированы по `estimate_row_id`: сначала короткий индекс, ниже списки ресурсов по каждой строке сметы.',
    '- В ресурсах поле `Источники` содержит короткие метки `S1`, `S2`; полные PDF-ссылки, цитаты и `quote_items` вынесены под список группы.',
    '- Для машинной обработки используйте JSON: в markdown оставлены те же id, суммы и ссылки на источники.',
    '',
    '## Сводка',
    `- ${options.summaryLabel}: ${resources.length}`,
    `- Строк сметы: ${groups.length}`,
    `- Итог по ресурсам: ${resourceTotalSummary(resources)}`,
    '',
    '## Быстрый индекс по строкам сметы',
    ...(groups.length > 0 ? groups.map(resourceIndexLine) : [EMPTY_LIST_LINE]),
    '',
    `## ${options.sectionTitle} по строкам сметы`,
    ...(groups.length > 0
      ? groups.flatMap((group) =>
          resourceGroupLines(group, workItemsById, options),
        )
      : [EMPTY_LIST_LINE]),
  ]);
};

const controlTotalLine = (control: EstimateDetailControlTotal): string => {
  const detail = `детальная сумма: ${formatMoney(control.detail_total_rub)}`;
  const aggregate = `агрегированная сумма: ${formatMoney(control.aggregate_total_rub)}`;
  const tolerance =
    control.tolerance_rub === undefined
      ? '-'
      : `${formatReglamentNumber(control.tolerance_rub)} ₽`;
  const resources = control.resource_ids?.map(code).join(', ') ?? '-';
  const note = control.note ? `; примечание: ${control.note}` : '';

  return `- ${code(control.id)}: ${code(control.cost_bucket)}; строка сметы: ${code(control.estimate_row_id)}; источник контроля: ${CONTROL_SOURCE_LABELS[control.control_source]}; сумма в источнике: ${formatMoney(control.source_total_rub)}; ${detail}; ${aggregate}; дельта: ${formatDelta(control.delta_rub)}; допуск: ${tolerance}; ресурсы: ${resources}; статус: ${control.status_label_ru}; источник: ${sources(control.source_refs)}${note}`;
};

const workItemNeedsCheckLine = (item: EstimateDetailWorkItem): string => {
  if (item.status !== 'needs_check') return '';

  const checkSources = item.needs_check.source_refs ?? item.source_refs;

  return `- ${code(`work_items:${item.id}`)}: ${item.title}; строка сметы: ${code(item.estimate_row_id)}; причина: ${item.needs_check.reason}; источник: ${sources(checkSources)}`;
};

const resourceNeedsCheckLine = (item: EstimateDetailResource): string => {
  if (item.status !== 'needs_check') return '';

  const checkSources = item.needs_check.source_refs ?? item.source_refs;

  return `- ${code(`resources:${item.id}`)}: ${item.title}; работа: ${code(item.work_item_id)}; статья затрат: ${code(item.cost_bucket)}; причина: ${item.needs_check.reason}; источник: ${sources(checkSources)}`;
};

const controlNeedsCheckLine = (item: EstimateDetailControlTotal): string => {
  if (item.status !== 'needs_check') return '';

  const checkSources = item.needs_check.source_refs ?? item.source_refs;

  return `- ${code(`control_totals:${item.id}`)}: ${code(item.cost_bucket)}; строка сметы: ${code(item.estimate_row_id)}; причина: ${item.needs_check.reason}; источник: ${sources(checkSources)}`;
};

export const buildEstimateDetailMarkdown = (
  dataset: EstimateDetailDataset = estimateDetails2026,
): string =>
  serializeLines([
    '# Детальная смета 2026',
    '',
    'Машиночитаемый Markdown-индекс набора данных `estimate-details-2026` для маленьких PDF сметы. PDF не парсятся во время запроса или сборки страницы.',
    '',
    '## Главные URL',
    `- JSON-набор данных: ${absoluteUrl(reglamentEstimateDetails2026DataUrl())}`,
    `- Агрегированная смета: ${absoluteUrl(reglamentEstimate2026DataUrl())}`,
    `- Набор данных полного регламента: ${absoluteUrl(reglamentFull2026DataUrl())}`,
    `- Услуги полного регламента: ${absoluteUrl(reglamentFullServicesMarkdownUrl())}`,
    `- Сопоставление услуг со сметой: ${absoluteUrl(reglamentFullServiceMapMarkdownUrl())}`,
    `- Этот индекс: ${absoluteUrl(reglamentEstimateDetailsMarkdownUrl())}`,
    '',
    '## Как соединять слои',
    '- `estimate-2026.json` — агрегированная смета: разделы, строки, итоговые суммы, базовые частоты и разбивка сумм (`breakdown`).',
    '- `full-2026.json` и `full/services.md` — услуги полного регламента, периодичность и исходные формулировки услуг.',
    '- `estimate-details-2026.json` и `details/*.md` — детальные работы, материалы, машины, труд, контрольные итоги и позиции со статусом `needs_check` из маленьких PDF.',
    '- `estimate_row_id` связывает работы, ресурсы и контрольные итоги с агрегированной сметой; `service_ids` связывает работы с услугами полного регламента.',
    '- Для ответа сначала берите формулировку и периодичность услуги из полного регламента, затем строку и сумму из агрегированной сметы, затем ресурсы и проверки из детального слоя.',
    '',
    '## Проверочные вопросы для агента',
    '- Какова периодичность полива дорог: сравните услуги `summer-road-dust-suppression` и `summer-road-watering`, строку `cleaning-summer-mechanized` и ресурсы детальной сметы по поливу.',
    '- Какие материалы, машины и труд входят в выбранную строку сметы: найдите строку по `estimate_row_id`, затем смотрите тематические файлы `materials.md`, `machines.md` и `labor.md`.',
    '- Какие суммы требуют ручной перепроверки: откройте `checks.md` и сверяйте причины `needs_check` с `source_refs`.',
    '',
    '## Тематические файлы',
    topicLine(
      'Материалы',
      reglamentEstimateDetailsMaterialsMarkdownUrl(),
      'ресурсы с `kind=material`: количество, цена и итог',
    ),
    topicLine(
      'Машины',
      reglamentEstimateDetailsMachinesMarkdownUrl(),
      'ресурсы с `kind=machine` и машинные затраты',
    ),
    topicLine(
      'Труд',
      reglamentEstimateDetailsLaborMarkdownUrl(),
      'ресурсы с `kind=labor` и `kind=machinist_labor`: ставки и итоги',
    ),
    topicLine(
      'Проверки',
      reglamentEstimateDetailsChecksMarkdownUrl(),
      'контрольные итоги, дельты и все позиции со статусом `needs_check`',
    ),
    '',
    '## Сводка',
    `- Набор данных: ${dataset.dataset_id}; версия схемы: ${ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_VERSION}; год: ${dataset.year}`,
    `- PDF-источники: ${dataset.source_pdfs.length}`,
    `- Работы: ${dataset.work_items.length}`,
    `- Ресурсы: ${dataset.resources.length}`,
    `- Контрольные итоги: ${dataset.control_totals.length}`,
    `- Со статусом \`needs_check\`: ${needsCheckCount(dataset)}`,
    '',
    '## Ресурсы по видам',
    ...ESTIMATE_DETAIL_RESOURCE_KINDS.map(
      (kind) =>
        `- ${code(kind)}: ${resourcesByKind(dataset, [kind]).length} (${RESOURCE_KIND_LABELS[kind]})`,
    ),
    '',
    '## PDF-источники',
    ...linesOrEmpty(dataset.source_pdfs, sourcePdfLine),
    '',
    '## Кураторские заметки',
    ...linesOrEmpty(dataset.curation_notes, (note) => `- ${note}`),
  ]);

export const buildEstimateDetailMaterialsMarkdown = (
  dataset: EstimateDetailDataset = estimateDetails2026,
): string =>
  buildEstimateDetailResourcesMarkdown(dataset, {
    title: '# Детальная смета 2026: материалы',
    summaryLabel: 'Материальных ресурсов',
    sectionTitle: 'Материалы',
    kinds: ['material'],
  });

export const buildEstimateDetailMachinesMarkdown = (
  dataset: EstimateDetailDataset = estimateDetails2026,
): string =>
  buildEstimateDetailResourcesMarkdown(dataset, {
    title: '# Детальная смета 2026: машины',
    summaryLabel: 'Машинных ресурсов',
    sectionTitle: 'Машины',
    kinds: ['machine'],
  });

export const buildEstimateDetailLaborMarkdown = (
  dataset: EstimateDetailDataset = estimateDetails2026,
): string =>
  buildEstimateDetailResourcesMarkdown(dataset, {
    title: '# Детальная смета 2026: труд',
    summaryLabel: 'Трудовых ресурсов',
    sectionTitle: 'Труд и ставки',
    kinds: ['labor', 'machinist_labor'],
    priceLabel: 'ставка',
  });

export const buildEstimateDetailChecksMarkdown = (
  dataset: EstimateDetailDataset = estimateDetails2026,
): string => {
  const workItems = needsCheckWorkItems(dataset);
  const resources = needsCheckResources(dataset);
  const controlTotals = needsCheckControlTotals(dataset);
  const needsCheckTotal =
    workItems.length + resources.length + controlTotals.length;

  return serializeLines([
    '# Детальная смета 2026: проверки',
    '',
    `- Индекс: ${absoluteUrl(reglamentEstimateDetailsMarkdownUrl())}`,
    `- JSON-набор данных: ${absoluteUrl(reglamentEstimateDetails2026DataUrl())}`,
    '',
    '## Сводка',
    `- Контрольные итоги: ${dataset.control_totals.length}`,
    `- Всего со статусом \`needs_check\`: ${needsCheckTotal}`,
    `- Работы со статусом \`needs_check\`: ${workItems.length}`,
    `- Ресурсы со статусом \`needs_check\`: ${resources.length}`,
    `- Контрольные итоги со статусом \`needs_check\`: ${controlTotals.length}`,
    '',
    '## Контрольные итоги',
    ...linesOrEmpty(dataset.control_totals, controlTotalLine),
    '',
    '## Позиции со статусом `needs_check`',
    '',
    '### Работы',
    ...linesOrEmpty(workItems, workItemNeedsCheckLine),
    '',
    '### Ресурсы',
    ...linesOrEmpty(resources, resourceNeedsCheckLine),
    '',
    '### Контрольные итоги',
    ...linesOrEmpty(controlTotals, controlNeedsCheckLine),
  ]);
};
