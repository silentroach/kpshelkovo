import type {
  EstimateDetailControlTotalInput,
  EstimateDetailResource,
  EstimateDetailWorkItem,
} from '@/lib/reglament/detail-schema';

import {
  detailControlTotal,
  detailMoney,
  detailNeedsCheckStatus,
  detailQuantity,
  detailResource,
  detailSource,
  detailSourceQuoteItem,
  detailSourceQuoteItems,
  detailSourceRefs,
  detailStatus,
  detailWorkItem,
} from './shared';

const wasteOperatorRegionalOperatorResourceId =
  'waste-operator-regional-operator-service';
const wasteOperatorMaterialsCalculationResourceId =
  'waste-operator-materials-calculation-row';
const wasteOperatorVatResourceId = 'waste-operator-vat';
const wasteTransferWorkerLaborResourceId = 'waste-transfer-worker-labor';
const wasteTransferMachinistLaborResourceId = 'waste-transfer-machinist-labor';
const wasteTransferGazelMachineResourceId = 'waste-transfer-gazel-machine';
const wasteTransferWorkerInsuranceResourceId =
  'waste-transfer-worker-insurance';
const wasteTransferMachinistInsuranceResourceId =
  'waste-transfer-machinist-insurance';
const wasteTransferWorkerOverheadResourceId = 'waste-transfer-worker-overhead';
const wasteTransferMachinistOverheadResourceId =
  'waste-transfer-machinist-overhead';
const wasteTransferWorkerProfitResourceId = 'waste-transfer-worker-profit';
const wasteTransferMachinistProfitResourceId =
  'waste-transfer-machinist-profit';
const wasteTransferUsnResourceId = 'waste-transfer-usn';
const wasteTransferVatDocumentResourceId = 'waste-transfer-vat-document';
const wasteTransferVatDerivedResourceId = 'waste-transfer-vat-derived';

const wasteOperatorProductionProgramSource = detailSource(
  'waste',
  1,
  'производственная программа по услуге организации работы с РО',
  {
    quote:
      'Организация сбора ТКО и их передача Региональному оператору; м³; I-XII; 365; 6201,6; руб./м³ 1229,2',
  },
);

const wasteOperatorNormativeVolumeSource = detailSource(
  'waste',
  2,
  'нормативный расчет накопления ТКО для ИЖД',
  {
    quote:
      'Индивидуальные жилые дома; 120; 1 968; 0,1000; 0,5252; 12 403; 0,50; 6 202',
  },
);

const wasteOperatorContractorSource = detailSource(
  'waste',
  3,
  'локальный ресурсный сметный расчет / услуги сторонних организаций',
  {
    quote: 'Договорная цена; м³; 6201,6; 1229,24; 7 623 207,58',
  },
);

const wasteOperatorDocumentTotalsSource = detailSource(
  'waste',
  4,
  'итоги локального ресурсного сметного расчета по работе с РО',
  {
    quote:
      'Услуги сторонних организаций 7 623 207,58; ВСЕГО по документу 7 623 207,58; НДС 5% 381 160,38',
  },
);

const wasteOperatorCalculationSource = detailSource(
  'waste',
  5,
  'калькуляция стоимости услуг по работе с РО',
  {
    quote:
      'Организация работы с РО по вывозу мусора - всего 7 623 208; расходы на материальные ресурсы 7 623 208; расходы на оплату услуг сторонних организаций 0; Доходов - всего 7 623 208',
  },
);

const wasteTransferProductionProgramSource = detailSource(
  'waste',
  6,
  'производственная программа по перемещению мусора',
  {
    quote:
      'Погрузка грунта вручную ... 100 м³; 365; 62,0; 5147,3; Перевозка грузов ... Газель (GAZ 330232); 1460',
  },
);

const wasteTransferNormativeVolumeSource = detailSource(
  'waste',
  7,
  'нормативный расчет накопления ТКО для перемещения мусора',
  {
    quote:
      'Индивидуальные жилые дома; 120; 1 968; 0,1000; 0,5252; 12 403; 0,5; 6 202',
  },
);

const wasteTransferStaffSource = detailSource(
  'waste',
  8,
  'нормативное штатное расписание для перемещения мусора',
  {
    quote:
      'Рабочий по уборке территории ... 2,6 ... 664,15; Машинист 0,7 ... 934,32',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Рабочий по уборке территории',
        resource_ids: [wasteTransferWorkerLaborResourceId],
        quantity: detailQuantity(2.6, 'чел.'),
        unit_price_rub: detailMoney(664.15),
        total_rub: detailMoney(1_726.78, {
          note: 'колонка «Всего, руб. ((гр. 5 + гр. 6 + гр. 7 + гр. 8) × гр. 4)», не годовая сметная сумма',
        }),
      }),
      detailSourceQuoteItem({
        label: 'Машинист',
        resource_ids: [wasteTransferMachinistLaborResourceId],
        quantity: detailQuantity(0.7, 'чел.'),
        unit_price_rub: detailMoney(934.32),
        total_rub: detailMoney(654.02, {
          note: 'колонка «Всего, руб. ((гр. 5 + гр. 6 + гр. 7 + гр. 8) × гр. 4)», не годовая сметная сумма',
        }),
      }),
    ),
  },
);

const wasteTransferWorkerPositionSource = detailSource(
  'waste',
  9,
  'позиция 1.1 локального ресурсного сметного расчета',
  {
    quote:
      'Погрузка грунта вручную ... 62,02; 3 418 555,10; Трудозатраты рабочих 5147',
  },
);

const wasteTransferMachinePositionSource = detailSource(
  'waste',
  10,
  'позиция 1.2 локального ресурсного сметного расчета',
  {
    quote:
      'Перевозка грузов ... 365,00; 1 828 410,62; машины 464303,42; зарплата машинистов 1364107,20; 1460',
  },
);

const wasteTransferDocumentTotalsSource = detailSource(
  'waste',
  11,
  'итоги локального ресурсного сметного расчета по перемещению мусора',
  {
    quote:
      'Прямые затраты 5 246 965,72; страховые взносы 1 444 364,01; общеэксплуатационные расходы 3 347 863,61; прибыль 1 913 064,92; ВСЕГО 11 952 258,27; НДС 5% 597 612,91',
  },
);

const wasteTransferResourceStatementSource = detailSource(
  'waste',
  12,
  'ресурсная ведомость по локальному ресурсному сметному расчету',
  {
    quote:
      'Рабочий ... 5147,3 664,15 3 418 555,10; Машинист 1460,0 934,32 1 364 107,20; Газель (GAZ 330232) 1460,0 318,02 464 303,42',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Рабочий по уборке территории',
        resource_ids: [wasteTransferWorkerLaborResourceId],
        quantity: detailQuantity(5_147.3, 'чел-час'),
        unit_price_rub: detailMoney(664.15),
        total_rub: detailMoney(3_418_555.1),
      }),
      detailSourceQuoteItem({
        label: 'Машинист',
        resource_ids: [wasteTransferMachinistLaborResourceId],
        quantity: detailQuantity(1_460, 'чел-час'),
        unit_price_rub: detailMoney(934.32),
        total_rub: detailMoney(1_364_107.2),
      }),
      detailSourceQuoteItem({
        label: 'Газель (GAZ 330232)',
        resource_ids: [wasteTransferGazelMachineResourceId],
        quantity: detailQuantity(1_460, 'маш.-час'),
        unit_price_rub: detailMoney(318.02),
        total_rub: detailMoney(464_303.42),
      }),
    ),
  },
);

const wasteTransferCalculationSource = detailSource(
  'waste',
  13,
  'калькуляция стоимости услуг по перемещению мусора',
  {
    quote:
      'ИТОГО расходов 10 039 193; налог по УСН 286 960; прибыль 1 913 065; Доходов - всего 12 239 217',
  },
);

const wasteOperatorContractorNeedsCheckRefs = detailSourceRefs(
  wasteOperatorContractorSource,
  wasteOperatorDocumentTotalsSource,
  wasteOperatorCalculationSource,
);

const wasteOperatorGrossResourceIds = [
  wasteOperatorRegionalOperatorResourceId,
  wasteOperatorVatResourceId,
] as const;

const wasteTransferPrimarySalaryResourceIds = [
  wasteTransferWorkerLaborResourceId,
] as const;
const wasteTransferMachinistSalaryResourceIds = [
  wasteTransferMachinistLaborResourceId,
] as const;
const wasteTransferMachineResourceIds = [
  wasteTransferGazelMachineResourceId,
] as const;
const wasteTransferInsuranceResourceIds = [
  wasteTransferWorkerInsuranceResourceId,
  wasteTransferMachinistInsuranceResourceId,
] as const;
const wasteTransferOverheadResourceIds = [
  wasteTransferWorkerOverheadResourceId,
  wasteTransferMachinistOverheadResourceId,
] as const;
const wasteTransferProfitResourceIds = [
  wasteTransferWorkerProfitResourceId,
  wasteTransferMachinistProfitResourceId,
] as const;
const wasteTransferGrossResourceIds = [
  wasteTransferWorkerLaborResourceId,
  wasteTransferMachinistLaborResourceId,
  wasteTransferGazelMachineResourceId,
  wasteTransferWorkerInsuranceResourceId,
  wasteTransferMachinistInsuranceResourceId,
  wasteTransferWorkerOverheadResourceId,
  wasteTransferMachinistOverheadResourceId,
  wasteTransferWorkerProfitResourceId,
  wasteTransferMachinistProfitResourceId,
  wasteTransferUsnResourceId,
  wasteTransferVatDerivedResourceId,
] as const;

export const wasteWorkItems = [
  detailWorkItem({
    id: 'waste-operator-service',
    title: 'Организация сбора ТКО и передача региональному оператору',
    estimate_row_id: 'waste-operator-service',
    service_ids: ['year-round-solid-waste-removal'],
    source_refs: detailSourceRefs(
      wasteOperatorProductionProgramSource,
      wasteOperatorNormativeVolumeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'waste-transfer-from-homes',
    title:
      'Перемещение мусора из мест временного накопления от домовладений на мусорную площадку',
    estimate_row_id: 'waste-transfer-from-homes',
    service_ids: [
      'year-round-private-bins-cleaning',
      'year-round-solid-waste-removal',
    ],
    source_refs: detailSourceRefs(
      wasteTransferProductionProgramSource,
      wasteTransferNormativeVolumeSource,
    ),
    ...detailStatus('verified'),
  }),
] satisfies readonly EstimateDetailWorkItem[];

export const wasteResources = [
  detailResource({
    id: wasteOperatorRegionalOperatorResourceId,
    work_item_id: 'waste-operator-service',
    estimate_row_id: 'waste-operator-service',
    kind: 'contractor',
    title: 'Услуга регионального оператора по вывозу и утилизации ТКО',
    cost_bucket: 'contractors',
    quantity: detailQuantity(6_201.6, 'м³/год'),
    unit_price_rub: detailMoney(1_229.24),
    total_rub: detailMoney(7_623_207.58),
    source_refs: wasteOperatorContractorNeedsCheckRefs,
    note: 'Локальный ресурсный сметный расчет относит сумму к сторонним организациям; калькуляция на стр. 5 относит округленную сумму к материальным ресурсам.',
    ...detailNeedsCheckStatus(
      'Внутри waste.pdf один и тот же итог 7 623 208 показан как сторонние организации в локальном расчете и как материальные ресурсы в калькуляции.',
      wasteOperatorContractorNeedsCheckRefs,
    ),
  }),
  detailResource({
    id: wasteOperatorMaterialsCalculationResourceId,
    work_item_id: 'waste-operator-service',
    estimate_row_id: 'waste-operator-service',
    kind: 'material',
    title:
      'Калькуляционная строка материальных ресурсов по работе с региональным оператором',
    cost_bucket: 'materials',
    total_rub: detailMoney(7_623_208),
    source_refs: detailSourceRefs(wasteOperatorCalculationSource),
    note: 'Строка сохранена отдельно от contractor-ресурса, потому что калькуляция конфликтует с локальным ресурсным расчетом.',
    ...detailNeedsCheckStatus(
      'Калькуляция относит 7 623 208 к материальным ресурсам, но локальный ресурсный расчет относит эту сумму к услугам сторонних организаций.',
      detailSourceRefs(
        wasteOperatorCalculationSource,
        wasteOperatorContractorSource,
      ),
    ),
  }),
  detailResource({
    id: wasteOperatorVatResourceId,
    work_item_id: 'waste-operator-service',
    estimate_row_id: 'waste-operator-service',
    kind: 'other_cost',
    title: 'НДС 5% по услуге регионального оператора',
    cost_bucket: 'vat',
    total_rub: detailMoney(381_160.38),
    source_refs: detailSourceRefs(wasteOperatorDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferWorkerLaborResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'labor',
    title: 'Рабочий по уборке территории (средний разряд 3.0)',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(5_147.3, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(3_418_555.1),
    source_refs: detailSourceRefs(
      wasteTransferStaffSource,
      wasteTransferResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferMachinistLaborResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'machinist_labor',
    title: 'Машинист',
    cost_bucket: 'machinist_salary',
    quantity: detailQuantity(1_460, 'чел-час'),
    unit_price_rub: detailMoney(934.32),
    total_rub: detailMoney(1_364_107.2),
    source_refs: detailSourceRefs(
      wasteTransferStaffSource,
      wasteTransferResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferGazelMachineResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'machine',
    title: 'Газель (GAZ 330232)',
    cost_bucket: 'machines',
    quantity: detailQuantity(1_460, 'маш.-час'),
    unit_price_rub: detailMoney(318.02),
    total_rub: detailMoney(464_303.42),
    source_refs: detailSourceRefs(
      wasteTransferProductionProgramSource,
      wasteTransferResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferWorkerInsuranceResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Страховые взносы по труду рабочего',
    cost_bucket: 'insurance',
    total_rub: detailMoney(1_032_403.64),
    source_refs: detailSourceRefs(wasteTransferWorkerPositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferMachinistInsuranceResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Страховые взносы по труду машиниста',
    cost_bucket: 'insurance',
    total_rub: detailMoney(411_960.37),
    source_refs: detailSourceRefs(wasteTransferMachinePositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferWorkerOverheadResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по труду рабочего',
    cost_bucket: 'overhead',
    total_rub: detailMoney(2_392_988.57),
    source_refs: detailSourceRefs(wasteTransferWorkerPositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferMachinistOverheadResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по труду машиниста',
    cost_bucket: 'overhead',
    total_rub: detailMoney(954_875.04),
    source_refs: detailSourceRefs(wasteTransferMachinePositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferWorkerProfitResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Прибыль по труду рабочего',
    cost_bucket: 'profit',
    total_rub: detailMoney(1_367_422.04),
    source_refs: detailSourceRefs(wasteTransferWorkerPositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferMachinistProfitResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Прибыль по труду машиниста',
    cost_bucket: 'profit',
    total_rub: detailMoney(545_642.88),
    source_refs: detailSourceRefs(wasteTransferMachinePositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferUsnResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Налог по УСН',
    cost_bucket: 'usn',
    total_rub: detailMoney(286_960),
    source_refs: detailSourceRefs(wasteTransferCalculationSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: wasteTransferVatDocumentResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'НДС 5% по локальному ресурсному расчету перемещения мусора',
    cost_bucket: 'vat',
    total_rub: detailMoney(597_612.91),
    source_refs: detailSourceRefs(wasteTransferDocumentTotalsSource),
    note: 'Прямой НДС из локального ресурсного расчета не используется в gross-сверке с estimate-2026, потому что итог агрегированной сметы сходится с НДС от калькуляционных доходов.',
    ...detailNeedsCheckStatus(
      'Прямой НДС 597 612,91 не сходится с annual_gross estimate-2026; проверить, какой НДС должен быть источником итоговой строки.',
      detailSourceRefs(
        wasteTransferDocumentTotalsSource,
        wasteTransferCalculationSource,
      ),
    ),
  }),
  detailResource({
    id: wasteTransferVatDerivedResourceId,
    work_item_id: 'waste-transfer-from-homes',
    estimate_row_id: 'waste-transfer-from-homes',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% для сверки с агрегированной сметой',
    cost_bucket: 'vat',
    total_rub: detailMoney(611_960.85, {
      note: 'рассчитано от строки «Доходов - всего» в калькуляции',
    }),
    source_refs: detailSourceRefs(
      wasteTransferDocumentTotalsSource,
      wasteTransferCalculationSource,
    ),
    note: 'Локальный ресурсный сметный расчет показывает НДС 597 612,91, но агрегированная строка 12 851 178 сходится с 5% от доходов 12 239 217.',
    ...detailNeedsCheckStatus(
      'В waste.pdf есть прямой НДС 597 612,91 в локальном расчете и расчетная величина 611 960,85, которая нужна для сверки с estimate-2026.',
      detailSourceRefs(
        wasteTransferDocumentTotalsSource,
        wasteTransferCalculationSource,
      ),
    ),
  }),
] satisfies readonly EstimateDetailResource[];

export const wasteControlTotals = [
  detailControlTotal({
    id: 'waste-operator-contractors',
    estimate_row_id: 'waste-operator-service',
    cost_bucket: 'contractors',
    source_total_rub: detailMoney(7_623_207.58),
    tolerance_rub: 0.01,
    resource_ids: [wasteOperatorRegionalOperatorResourceId],
    source_refs: detailSourceRefs(
      wasteOperatorContractorSource,
      wasteOperatorDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-operator-income',
    estimate_row_id: 'waste-operator-service',
    cost_bucket: 'income',
    source_total_rub: detailMoney(7_623_208),
    detail_total_note: 'Точное значение из локального ресурсного расчета.',
    tolerance_rub: 1,
    resource_ids: [wasteOperatorRegionalOperatorResourceId],
    source_refs: detailSourceRefs(wasteOperatorCalculationSource),
    note: 'Калькуляция округляет доход до рублей.',
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-operator-gross',
    estimate_row_id: 'waste-operator-service',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(8_004_367.96),
    tolerance_rub: 1,
    resource_ids: wasteOperatorGrossResourceIds,
    source_refs: detailSourceRefs(
      wasteOperatorDocumentTotalsSource,
      wasteOperatorCalculationSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-operator-materials-calculation-conflict',
    estimate_row_id: 'waste-operator-service',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(7_623_208),
    tolerance_rub: 0.01,
    resource_ids: [wasteOperatorMaterialsCalculationResourceId],
    source_refs: detailSourceRefs(
      wasteOperatorContractorSource,
      wasteOperatorCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      'Калькуляция относит 7 623 208 к материальным ресурсам, а локальный ресурсный расчет и estimate-2026 относят сумму к сторонним организациям/подрядчикам.',
      detailSourceRefs(
        wasteOperatorContractorSource,
        wasteOperatorCalculationSource,
      ),
    ),
  }),
  detailControlTotal({
    id: 'waste-transfer-primary-salary',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(3_418_555.1),
    tolerance_rub: 0.01,
    resource_ids: wasteTransferPrimarySalaryResourceIds,
    source_refs: detailSourceRefs(
      wasteTransferWorkerPositionSource,
      wasteTransferResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-transfer-machinist-salary',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'machinist_salary',
    source_total_rub: detailMoney(1_364_107.2),
    tolerance_rub: 0.01,
    resource_ids: wasteTransferMachinistSalaryResourceIds,
    source_refs: detailSourceRefs(
      wasteTransferMachinePositionSource,
      wasteTransferResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-transfer-machines',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'machines',
    source_total_rub: detailMoney(464_303.42),
    tolerance_rub: 0.01,
    resource_ids: wasteTransferMachineResourceIds,
    source_refs: detailSourceRefs(
      wasteTransferMachinePositionSource,
      wasteTransferResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-transfer-insurance',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(1_444_364.01),
    tolerance_rub: 0.01,
    resource_ids: wasteTransferInsuranceResourceIds,
    source_refs: detailSourceRefs(wasteTransferDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-transfer-overhead',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(3_347_863.61),
    tolerance_rub: 0.01,
    resource_ids: wasteTransferOverheadResourceIds,
    source_refs: detailSourceRefs(wasteTransferDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-transfer-profit',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(1_913_064.92),
    tolerance_rub: 0.01,
    resource_ids: wasteTransferProfitResourceIds,
    source_refs: detailSourceRefs(wasteTransferDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-transfer-usn',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(286_960),
    aggregate_total_unknown: {
      value: null,
      note: 'в breakdown строки estimate-2026 отдельного bucket usn нет',
    },
    tolerance_rub: 0.01,
    resource_ids: [wasteTransferUsnResourceId],
    source_refs: detailSourceRefs(wasteTransferCalculationSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'waste-transfer-gross',
    estimate_row_id: 'waste-transfer-from-homes',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(12_851_177.85),
    detail_total_note: 'Сумма строковых ресурсов с расчетным НДС 5%.',
    tolerance_rub: 2,
    resource_ids: wasteTransferGrossResourceIds,
    source_refs: detailSourceRefs(
      wasteTransferDocumentTotalsSource,
      wasteTransferCalculationSource,
    ),
    note: 'Сверка с annual_gross estimate-2026 требует расчетного НДС от калькуляционных доходов; прямой НДС в локальном расчете меньше.',
    ...detailNeedsCheckStatus(
      'Прямой НДС 597 612,91 из локального расчета не сходится с агрегированной строкой 12 851 178; сходится расчетный НДС 5% от доходов 12 239 217.',
      detailSourceRefs(
        wasteTransferDocumentTotalsSource,
        wasteTransferCalculationSource,
      ),
    ),
  }),
] satisfies readonly EstimateDetailControlTotalInput[];
