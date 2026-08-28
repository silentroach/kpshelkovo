import { estimate2026 } from '@/data/reglament/estimate-2026';
import type {
  EstimateDetailControlTotal,
  EstimateDetailSourceRef,
} from '@/lib/reglament/detail-schema';
import type {
  EstimateRow,
  NonEmptyReadonlyArray,
} from '@/lib/reglament/schema';

import {
  detailMoney,
  detailNeedsCheckStatus,
  detailSource,
  detailSourceRefs,
  detailStatus,
} from './shared';

type FinalGrossControlInput = {
  readonly id: string;
  readonly estimate_row_id: string;
  readonly source_total_rub: number;
  readonly source_refs: NonEmptyReadonlyArray<EstimateDetailSourceRef>;
  readonly note?: string;
};

const finalControlNote =
  'Контроль из final.pdf: source total взят из итоговой сметы, detail total — сумма дочерних строк этого же final.pdf/строк estimate-2026, aggregate — значение estimate-2026; ресурсы секционных PDF здесь не суммируются.';

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const round2 = (value: number): number => Math.round(value * 100) / 100;

const flattenRows = (rows: readonly EstimateRow[]): readonly EstimateRow[] =>
  rows.flatMap((row) => [row, ...flattenRows(row.children ?? [])]);

const allRows = flattenRows(
  estimate2026.sections.flatMap((section) => section.rows),
);

const aggregateGrossById = new Map<string, number>([
  [estimate2026.id, estimate2026.baseline.annual_gross],
  ...estimate2026.sections.map((section): readonly [string, number] => [
    section.id,
    section.baseline.annual_gross,
  ]),
  ...allRows.map((row): readonly [string, number] => [
    row.id,
    row.baseline.annual_gross,
  ]),
]);

const detailGrossById = new Map<string, number>([
  [
    estimate2026.id,
    round2(
      sum(
        estimate2026.sections.map((section) => section.baseline.annual_gross),
      ),
    ),
  ],
  ...estimate2026.sections.map((section): readonly [string, number] => [
    section.id,
    round2(sum(section.rows.map((row) => row.baseline.annual_gross))),
  ]),
  ...allRows.map((row): readonly [string, number] => [
    row.id,
    row.baseline.annual_gross,
  ]),
]);

const getGross = (
  map: ReadonlyMap<string, number>,
  estimateRowId: string,
  label: string,
): number => {
  const value = map.get(estimateRowId);

  if (value === undefined) {
    throw new Error(`${label} is missing for ${estimateRowId}`);
  }

  return value;
};

const formatSignedRub = (value: number): string =>
  `${value > 0 ? '+' : ''}${value} ₽`;

const finalGrossControl = (
  input: FinalGrossControlInput,
): EstimateDetailControlTotal => {
  const aggregateTotal = getGross(
    aggregateGrossById,
    input.estimate_row_id,
    'aggregate gross',
  );
  const detailTotal = getGross(
    detailGrossById,
    input.estimate_row_id,
    'detail gross',
  );
  const detailDelta = round2(detailTotal - input.source_total_rub);
  const aggregateDelta = round2(input.source_total_rub - aggregateTotal);
  const reasons = [
    detailDelta === 0
      ? null
      : `Сумма дочерних строк отличается от контрольной строки final.pdf на ${formatSignedRub(detailDelta)}.`,
    aggregateDelta === 0
      ? null
      : `Контрольная строка final.pdf отличается от estimate-2026 на ${formatSignedRub(aggregateDelta)}.`,
  ].filter((reason): reason is string => reason !== null);
  const status =
    reasons.length === 0
      ? detailStatus('verified')
      : detailNeedsCheckStatus(reasons.join(' '), input.source_refs);

  return {
    id: input.id,
    estimate_row_id: input.estimate_row_id,
    control_source: 'final_pdf',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(input.source_total_rub),
    detail_total_rub: detailMoney(detailTotal),
    aggregate_total_rub: detailMoney(aggregateTotal),
    delta_rub: round2(detailTotal - aggregateTotal),
    tolerance_rub: 0,
    source_refs: input.source_refs,
    note: input.note ?? finalControlNote,
    ...status,
  };
};

const finalEstimateTotalSource = detailSource(
  'final',
  2,
  'итоговая смета / итог по смете',
  { quote: 'ИТОГО : 221 264 198 902,07' },
);

const finalWasteTransferSectionSource = detailSource(
  'final',
  1,
  'итоговая смета / раздел 1',
  {
    quote:
      '1. Перемещение мусора от участков собственников на площадку временного размещения; стоимость 12 851 178; 52,39',
  },
);

const finalWasteTransferRowSource = detailSource(
  'final',
  1,
  'итоговая смета / строка 1.1',
  {
    quote:
      '1.1 Перемещение мусора из мест временного накопления от частных домовладений на мусорную площадку; 365; 12 851 178; 52,39',
  },
);

const finalCleaningSectionSource = detailSource(
  'final',
  1,
  'итоговая смета / раздел 2',
  { quote: '2. Уборка территории; стоимость 159 011 858; 648,27' },
);

const finalCleaningWinterMechanizedSource = detailSource(
  'final',
  1,
  'итоговая смета / строка 2.1',
  {
    quote:
      '2.1 Зимняя механизированная уборка территории; 116; 21 469 119; 87,53',
  },
);

const finalCleaningWinterManualSource = detailSource(
  'final',
  1,
  'итоговая смета / строка 2.2',
  { quote: '2.2 Зимняя ручная уборка территории; 212; 3 138 719; 12,80' },
);

const finalCleaningSummerMechanizedSource = detailSource(
  'final',
  1,
  'итоговая смета / строка 2.3',
  { quote: '2.3 Летняя механизированная уборка; 153; 91 946 088; 374,85' },
);

const finalCleaningSummerManualSource = detailSource(
  'final',
  1,
  'итоговая смета / строка 2.4',
  { quote: '2.4 Летняя ручная уборка территории; 153; 42 457 933; 173,09' },
);

const finalLandscapingSectionSource = detailSource(
  'final',
  1,
  'итоговая смета / раздел 3',
  { quote: '3. Озеленение территории; стоимость 10 218 079; 41,66' },
);

const finalLandscapingMowingSource = detailSource(
  'final',
  1,
  'итоговая смета / строка 3.1',
  {
    quote:
      '3.1 Кошение травостоя вдоль открытых ливневых траншей; 105; 1 816 356; 7,40',
  },
);

const finalLandscapingTreesShrubsSource = detailSource(
  'final',
  1,
  'итоговая смета / строка 3.2',
  { quote: '3.2 Уход за деревьями, кустарниками; 46; 1 755 909; 7,16' },
);

const finalLandscapingTicksHogweedSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 3.3',
  {
    quote:
      '3.3 Обработка территорий от клещей, борьба с борщевиком; 2; 6 207 773; 25,31',
  },
);

const finalLandscapingForestCareSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 3.4',
  { quote: '3.4 Уход за лесом; 22; 438 041; 1,79' },
);

const finalImprovementSectionSource = detailSource(
  'final',
  2,
  'итоговая смета / раздел 4',
  { quote: '4 Благоустройство территории; стоимость 4 687 181; 19,11' },
);

const finalImprovementObjectsSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 4.1',
  { quote: '4.1 Содержание объектов благоустройства; 300; 4 366 756; 17,80' },
);

const finalImprovementRoadSurfaceSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 4.2',
  { quote: '4.2 Текущий ремонт покрытия дорог, площадок; 1; 320 424; 1,31' },
);

const finalSecuritySectionSource = detailSource(
  'final',
  2,
  'итоговая смета / раздел 5',
  {
    quote:
      '5. Охрана и техническое обслуживание средств охраны; стоимость 14 752 949; 60,15',
  },
);

const finalSecurityAccessControlSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 5.1',
  {
    quote:
      '5.1 Осуществление круглосуточного пропускного режима и поддержание внутриобьектного порядка; 365; 10 199 356; 41,59',
  },
);

const finalSecurityEquipmentMaintenanceSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 5.2',
  { quote: '5.2 Техническое обслуживание средств охраны; 12; 1 811 185; 7,38' },
);

const finalSecurityDispatchSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 5.3',
  { quote: '5.3 Диспетчерское обслуживание; 365; 2 742 409; 11,18' },
);

const finalWasteOperatorSectionSource = detailSource(
  'final',
  2,
  'итоговая смета / раздел 6',
  {
    quote:
      '6. Организация работы с РО по вывозу мусора; стоимость 8 004 368; 32,63',
  },
);

const finalWasteOperatorRowSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 6.1',
  {
    quote:
      '6.1 Организация работы с РО по вывозу мусора; 365; 8 004 368; 32,63',
  },
);

const finalLightingSectionSource = detailSource(
  'final',
  2,
  'итоговая смета / раздел 7',
  {
    quote:
      '7. Техническое обслуживание уличного освещения и системы электроснабжения; стоимость 11 738 585; 47,86',
  },
);

const finalLightingStreetMaintenanceSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 7.1',
  {
    quote:
      '7.1 Техническое обслуживание уличного освещения; 12; 6 670 979; 27,20',
  },
);

const finalLightingElectricitySource = detailSource(
  'final',
  2,
  'итоговая смета / строка 7.2',
  {
    quote:
      '7.2 Оплата электроэнергии на уличное освещение; 12; 1 473 084; 6,01',
  },
);

const finalLightingPolesRepairSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 7.3',
  { quote: '7.3 Текущий ремонт опор уличного освещения; 0,2; 869 527; 3,54' },
);

const finalLightingPowerSystemRepairSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 7.4',
  {
    quote: '7.4 Текущий ремонт системы электроснабжения; 75; 2 724 995; 11,11',
  },
);

export const finalControlTotals = [
  finalGrossControl({
    id: 'final-estimate-gross',
    estimate_row_id: estimate2026.id,
    source_total_rub: 221_264_198,
    source_refs: detailSourceRefs(finalEstimateTotalSource),
  }),
  finalGrossControl({
    id: 'final-waste-transfer-gross',
    estimate_row_id: 'waste-transfer',
    source_total_rub: 12_851_178,
    source_refs: detailSourceRefs(finalWasteTransferSectionSource),
  }),
  finalGrossControl({
    id: 'final-waste-transfer-from-homes-gross',
    estimate_row_id: 'waste-transfer-from-homes',
    source_total_rub: 12_851_178,
    source_refs: detailSourceRefs(finalWasteTransferRowSource),
  }),
  finalGrossControl({
    id: 'final-cleaning-gross',
    estimate_row_id: 'cleaning',
    source_total_rub: 159_011_858,
    source_refs: detailSourceRefs(finalCleaningSectionSource),
  }),
  finalGrossControl({
    id: 'final-cleaning-winter-mechanized-gross',
    estimate_row_id: 'cleaning-winter-mechanized',
    source_total_rub: 21_469_119,
    source_refs: detailSourceRefs(finalCleaningWinterMechanizedSource),
  }),
  finalGrossControl({
    id: 'final-cleaning-winter-manual-gross',
    estimate_row_id: 'cleaning-winter-manual',
    source_total_rub: 3_138_719,
    source_refs: detailSourceRefs(finalCleaningWinterManualSource),
  }),
  finalGrossControl({
    id: 'final-cleaning-summer-mechanized-gross',
    estimate_row_id: 'cleaning-summer-mechanized',
    source_total_rub: 91_946_088,
    source_refs: detailSourceRefs(finalCleaningSummerMechanizedSource),
  }),
  finalGrossControl({
    id: 'final-cleaning-summer-manual-gross',
    estimate_row_id: 'cleaning-summer-manual',
    source_total_rub: 42_457_933,
    source_refs: detailSourceRefs(finalCleaningSummerManualSource),
  }),
  finalGrossControl({
    id: 'final-landscaping-gross',
    estimate_row_id: 'landscaping',
    source_total_rub: 10_218_079,
    source_refs: detailSourceRefs(finalLandscapingSectionSource),
  }),
  finalGrossControl({
    id: 'final-landscaping-mowing-ditches-gross',
    estimate_row_id: 'landscaping-mowing-ditches',
    source_total_rub: 1_816_356,
    source_refs: detailSourceRefs(finalLandscapingMowingSource),
  }),
  finalGrossControl({
    id: 'final-landscaping-trees-shrubs-gross',
    estimate_row_id: 'landscaping-trees-shrubs',
    source_total_rub: 1_755_909,
    source_refs: detailSourceRefs(finalLandscapingTreesShrubsSource),
  }),
  finalGrossControl({
    id: 'final-landscaping-ticks-hogweed-gross',
    estimate_row_id: 'landscaping-ticks-hogweed',
    source_total_rub: 6_207_773,
    source_refs: detailSourceRefs(finalLandscapingTicksHogweedSource),
  }),
  finalGrossControl({
    id: 'final-landscaping-forest-care-gross',
    estimate_row_id: 'landscaping-forest-care',
    source_total_rub: 438_041,
    source_refs: detailSourceRefs(finalLandscapingForestCareSource),
  }),
  finalGrossControl({
    id: 'final-improvement-gross',
    estimate_row_id: 'improvement',
    source_total_rub: 4_687_181,
    source_refs: detailSourceRefs(finalImprovementSectionSource),
  }),
  finalGrossControl({
    id: 'final-improvement-objects-maintenance-gross',
    estimate_row_id: 'improvement-objects-maintenance',
    source_total_rub: 4_366_756,
    source_refs: detailSourceRefs(finalImprovementObjectsSource),
  }),
  finalGrossControl({
    id: 'final-improvement-road-surface-repair-gross',
    estimate_row_id: 'improvement-road-surface-repair',
    source_total_rub: 320_424,
    source_refs: detailSourceRefs(finalImprovementRoadSurfaceSource),
  }),
  finalGrossControl({
    id: 'final-security-gross',
    estimate_row_id: 'security',
    source_total_rub: 14_752_949,
    source_refs: detailSourceRefs(finalSecuritySectionSource),
  }),
  finalGrossControl({
    id: 'final-security-access-control-gross',
    estimate_row_id: 'security-access-control',
    source_total_rub: 10_199_356,
    source_refs: detailSourceRefs(finalSecurityAccessControlSource),
  }),
  finalGrossControl({
    id: 'final-security-equipment-maintenance-gross',
    estimate_row_id: 'security-equipment-maintenance',
    source_total_rub: 1_811_185,
    source_refs: detailSourceRefs(finalSecurityEquipmentMaintenanceSource),
  }),
  finalGrossControl({
    id: 'final-security-dispatch-gross',
    estimate_row_id: 'security-dispatch',
    source_total_rub: 2_742_409,
    source_refs: detailSourceRefs(finalSecurityDispatchSource),
  }),
  finalGrossControl({
    id: 'final-waste-operator-gross',
    estimate_row_id: 'waste-operator',
    source_total_rub: 8_004_368,
    source_refs: detailSourceRefs(finalWasteOperatorSectionSource),
  }),
  finalGrossControl({
    id: 'final-waste-operator-service-gross',
    estimate_row_id: 'waste-operator-service',
    source_total_rub: 8_004_368,
    source_refs: detailSourceRefs(finalWasteOperatorRowSource),
  }),
  finalGrossControl({
    id: 'final-lighting-power-gross',
    estimate_row_id: 'lighting-power',
    source_total_rub: 11_738_585,
    source_refs: detailSourceRefs(finalLightingSectionSource),
  }),
  finalGrossControl({
    id: 'final-lighting-street-maintenance-gross',
    estimate_row_id: 'lighting-street-maintenance',
    source_total_rub: 6_670_979,
    source_refs: detailSourceRefs(finalLightingStreetMaintenanceSource),
  }),
  finalGrossControl({
    id: 'final-lighting-electricity-gross',
    estimate_row_id: 'lighting-electricity',
    source_total_rub: 1_473_084,
    source_refs: detailSourceRefs(finalLightingElectricitySource),
  }),
  finalGrossControl({
    id: 'final-lighting-poles-repair-gross',
    estimate_row_id: 'lighting-poles-repair',
    source_total_rub: 869_527,
    source_refs: detailSourceRefs(finalLightingPolesRepairSource),
  }),
  finalGrossControl({
    id: 'final-lighting-power-system-repair-gross',
    estimate_row_id: 'lighting-power-system-repair',
    source_total_rub: 2_724_995,
    source_refs: detailSourceRefs(finalLightingPowerSystemRepairSource),
  }),
] satisfies readonly EstimateDetailControlTotal[];
