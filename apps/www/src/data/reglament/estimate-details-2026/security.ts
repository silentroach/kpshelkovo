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

const securityAccessControlChopResourceId =
  'security-access-control-chop-service';
const securityAccessControlKppMaterialsResourceId =
  'security-access-control-kpp-materials';
const securityAccessControlUsnResourceId = 'security-access-control-usn';
const securityAccessControlVatResourceId =
  'security-access-control-vat-derived';
const securityEquipmentVideoLaborResourceId = 'security-equipment-video-labor';
const securityEquipmentVideoCamerasResourceId =
  'security-equipment-video-cameras';
const securityEquipmentMonitorLaborResourceId =
  'security-equipment-monitor-labor';
const securityEquipmentServerPowerLaborResourceId =
  'security-equipment-server-power-labor';
const securityEquipmentSkudLaborResourceId = 'security-equipment-skud-labor';
const securityEquipmentBarrierContractorResourceId =
  'security-equipment-barrier-contractor';
const securityEquipmentDomilendContractorResourceId =
  'security-equipment-domilend-contractor';
const securityEquipmentInsuranceResourceId = 'security-equipment-insurance';
const securityEquipmentOverheadResourceId = 'security-equipment-overhead';
const securityEquipmentProfitResourceId = 'security-equipment-profit';
const securityEquipmentUsnResourceId = 'security-equipment-usn';
const securityEquipmentVatResourceId = 'security-equipment-vat-derived';
const securityDispatchLaborResourceId = 'security-dispatch-labor';
const securityDispatchInsuranceResourceId = 'security-dispatch-insurance';
const securityDispatchOverheadResourceId = 'security-dispatch-overhead';
const securityDispatchProfitResourceId = 'security-dispatch-profit';
const securityDispatchUsnResourceId = 'security-dispatch-usn';
const securityDispatchVatResourceId = 'security-dispatch-vat-derived';

const securityProductionAccessSource = detailSource(
  'security',
  1,
  'производственная программа / круглосуточный пропускной режим',
  {
    quote:
      'Услуги по круглосуточной охране поселка стационарными постами ... периодический обход/объезд территории поселка - 4 стационарных круглосуточных поста; пост; I-XII; 365; 4,0',
  },
);

const securityProductionEquipmentSource = detailSource(
  'security',
  2,
  'производственная программа / техническое обслуживание средств охраны',
  {
    quote:
      'видеокамеры 34,0; трудозатраты 584,1; мониторы 3,0; блок питания сервера 3,0; СКУД TRASSIR 5,0; шлагбаум 3,0',
  },
);

const securityProductionDomilendDispatchSource = detailSource(
  'security',
  3,
  'производственная программа / Домиленд и диспетчерское обслуживание',
  {
    quote:
      'Обслуживание СРМ "Домиленд" ... 1,0 ... 11215; Оказание круглосуточных услуг по приему заявок ... 365; 1,4; 2826,5',
  },
);

const securityStaffSource = detailSource(
  'security',
  4,
  'нормативное штатное расписание по охране',
  {
    quote:
      'Техник по обслуживанию слаботочных систем ... 3,2 ... 749,01; Диспетчер ... 1,4 ... 559,81',
  },
);

const securityAccessChopSource = detailSource(
  'security',
  5,
  'позиция 1.1 / услуги сторонней организации по охране',
  {
    quote: 'Договорная цена; плата в месяц; 12,0; 720000,00; 8 640 000,00',
  },
);

const securityAccessMaterialsSource = detailSource(
  'security',
  6,
  'позиция 1.1 / материальные затраты на содержание КПП',
  {
    quote:
      'Материальные затраты на содержание КПП ... пост; 4,0; 252000,00; 1 008 000,00',
  },
);

const securityAccessTotalsSource = detailSource(
  'security',
  6,
  'итого по разделу круглосуточного пропускного режима',
  {
    quote:
      'Итого по разделу ... 9 648 000,00; 0,00; 0,00; 0,00; 8 640 000,00; 1 008 000,00',
  },
);

const securityEquipmentVideoSource = detailSource(
  'security',
  7,
  'позиция 2.1 / обслуживание видеонаблюдения и замена видеокамер',
  {
    quote:
      '584,1; 749,01; 437 513,59; Видеокамера; шт.; 2,0; 5000,00; 10 000,00; ИТОГО ПО ПОЗИЦИИ 1 060 907,64',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Труд по обслуживанию охранного видеонаблюдения',
        resource_ids: [securityEquipmentVideoLaborResourceId],
        quantity: detailQuantity(584.1, 'чел-час'),
        unit_price_rub: detailMoney(749.01),
        total_rub: detailMoney(437_513.59),
      }),
      detailSourceQuoteItem({
        label: 'Видеокамера',
        resource_ids: [securityEquipmentVideoCamerasResourceId],
        quantity: detailQuantity(2, 'шт.'),
        unit_price_rub: detailMoney(5_000),
        total_rub: detailMoney(10_000),
      }),
    ),
  },
);

const securityEquipmentMonitorSource = detailSource(
  'security',
  8,
  'позиция 2.2 / обслуживание монитора',
  {
    quote:
      'Затраты труда ... 38,6; 749,01; 28 919,40; ИТОГО ПО ПОЗИЦИИ 69 464,40',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Труд по обслуживанию монитора',
        resource_ids: [securityEquipmentMonitorLaborResourceId],
        quantity: detailQuantity(38.6, 'чел-час'),
        unit_price_rub: detailMoney(749.01),
        total_rub: detailMoney(28_919.4),
      }),
    ),
  },
);

const securityEquipmentServerPowerSource = detailSource(
  'security',
  8,
  'позиция 2.3 / обслуживание блока питания сервера',
  {
    quote:
      'Затраты труда ... 14,0; 749,01; 10 516,15; ИТОГО ПО ПОЗИЦИИ 25 259,79',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Труд по обслуживанию блока питания сервера',
        resource_ids: [securityEquipmentServerPowerLaborResourceId],
        quantity: detailQuantity(14, 'чел-час'),
        unit_price_rub: detailMoney(749.01),
        total_rub: detailMoney(10_516.15),
      }),
    ),
  },
);

const securityEquipmentSkudSource = detailSource(
  'security',
  9,
  'позиция 3.1 / обслуживание системы СКУД TRASSIR',
  {
    quote:
      'Затраты труда ... 35,1; 749,01; 26 252,91; ИТОГО ПО ПОЗИЦИИ 63 059,49',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Труд по обслуживанию системы СКУД TRASSIR',
        resource_ids: [securityEquipmentSkudLaborResourceId],
        quantity: detailQuantity(35.1, 'чел-час'),
        unit_price_rub: detailMoney(749.01),
        total_rub: detailMoney(26_252.91),
      }),
    ),
  },
);

const securityEquipmentBarrierSource = detailSource(
  'security',
  9,
  'позиция 4.1 / обслуживание автоматического гидравлического шлагбаума',
  {
    quote: 'Договорная цена; мес; 12,0; 30000,00; 360 000,00',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Услуги сторонней организации по обслуживанию шлагбаумов',
        resource_ids: [securityEquipmentBarrierContractorResourceId],
        quantity: detailQuantity(12, 'мес'),
        unit_price_rub: detailMoney(30_000),
        total_rub: detailMoney(360_000),
      }),
    ),
  },
);

const securityEquipmentDomilendSource = detailSource(
  'security',
  10,
  'позиция 5.1 / обслуживание CRM Домиленд',
  {
    quote: 'Договорная цена; мес; 12,0; 11215,38; 134 584,56',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Услуги сторонней организации по обслуживанию CRM Домиленд',
        resource_ids: [securityEquipmentDomilendContractorResourceId],
        quantity: detailQuantity(12, 'мес'),
        unit_price_rub: detailMoney(11_215.38),
        total_rub: detailMoney(134_584.56),
      }),
    ),
  },
);

const securityEquipmentTotalsSource = detailSource(
  'security',
  10,
  'итого по разделу технического обслуживания средств охраны',
  {
    quote:
      'Итого по разделу ... 1 713 275,88; 503 202,05; 0,00; 0,00; 494 584,56; 10 000,00',
  },
);

const securityDispatchPositionSource = detailSource(
  'security',
  11,
  'позиция 6.1 / диспетчерское обслуживание',
  {
    quote:
      'Затраты труда Диспетчер ... 2826,5; 382,09; 1 080 000,00; Итого по разделу ... 2 594 160,00',
  },
);

const securityDocumentTotalsSource = detailSource(
  'security',
  12,
  'итого по услуге охраны в локальном ресурсном сметном расчете',
  {
    quote:
      'Итого по услуге ... 13 955 435,88; Основная зарплата 1 583 202,05; Услуги сторонних организаций 9 134 584,56; Материальные затраты 1 018 000,00; НДС 5% 697 771,79',
  },
);

const securityCalculationSource = detailSource(
  'security',
  13,
  'калькуляция себестоимости услуг по охране',
  {
    quote:
      'ИТОГО расходов 13 322 155; налог по УСН 94 992; прибыль ... 633 281; Доходов - всего 14 050 428',
  },
);

const securityDerivedAllocationNeedsCheckReason =
  'security.pdf не показывает распределение УСН и НДС по трем строкам охраны; значения выведены из gross-строк estimate-2026 и общей калькуляции доходов.';
const securityDerivedAllocationRefs = detailSourceRefs(
  securityDocumentTotalsSource,
  securityCalculationSource,
);

const securityAccessControlContractorResourceIds = [
  securityAccessControlChopResourceId,
] as const;
const securityAccessControlMaterialResourceIds = [
  securityAccessControlKppMaterialsResourceId,
] as const;
const securityAccessControlGrossResourceIds = [
  securityAccessControlChopResourceId,
  securityAccessControlKppMaterialsResourceId,
  securityAccessControlUsnResourceId,
  securityAccessControlVatResourceId,
] as const;
const securityEquipmentPrimarySalaryResourceIds = [
  securityEquipmentVideoLaborResourceId,
  securityEquipmentMonitorLaborResourceId,
  securityEquipmentServerPowerLaborResourceId,
  securityEquipmentSkudLaborResourceId,
] as const;
const securityEquipmentMaterialResourceIds = [
  securityEquipmentVideoCamerasResourceId,
] as const;
const securityEquipmentContractorResourceIds = [
  securityEquipmentBarrierContractorResourceId,
  securityEquipmentDomilendContractorResourceId,
] as const;
const securityEquipmentGrossResourceIds = [
  ...securityEquipmentPrimarySalaryResourceIds,
  securityEquipmentVideoCamerasResourceId,
  ...securityEquipmentContractorResourceIds,
  securityEquipmentInsuranceResourceId,
  securityEquipmentOverheadResourceId,
  securityEquipmentProfitResourceId,
  securityEquipmentUsnResourceId,
  securityEquipmentVatResourceId,
] as const;
const securityDispatchGrossResourceIds = [
  securityDispatchLaborResourceId,
  securityDispatchInsuranceResourceId,
  securityDispatchOverheadResourceId,
  securityDispatchProfitResourceId,
  securityDispatchUsnResourceId,
  securityDispatchVatResourceId,
] as const;

export const securityWorkItems = [
  detailWorkItem({
    id: 'security-access-control',
    title:
      'Круглосуточный пропускной режим и поддержание внутриобъектного порядка',
    estimate_row_id: 'security-access-control',
    service_ids: ['year-round-access-control'],
    source_refs: detailSourceRefs(
      securityProductionAccessSource,
      securityAccessTotalsSource,
    ),
    note: 'security.pdf подтверждает периодический обход/объезд как часть услуги ЧОП, но не содержит километраж маршрута или кратность обходов в сутки. Эти показатели есть в слое полного регламента по имуществу, но они не перенесены в детальный слой, потому что их источник: full.pdf.',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'security-equipment-maintenance',
    title: 'Техническое обслуживание средств охраны',
    estimate_row_id: 'security-equipment-maintenance',
    source_refs: detailSourceRefs(
      securityProductionEquipmentSource,
      securityProductionDomilendDispatchSource,
      securityEquipmentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'security-dispatch',
    title: 'Диспетчерское обслуживание пропускного режима',
    estimate_row_id: 'security-dispatch',
    source_refs: detailSourceRefs(
      securityProductionDomilendDispatchSource,
      securityDispatchPositionSource,
    ),
    ...detailStatus('verified'),
  }),
] satisfies readonly EstimateDetailWorkItem[];

export const securityResources = [
  detailResource({
    id: securityAccessControlChopResourceId,
    work_item_id: 'security-access-control',
    estimate_row_id: 'security-access-control',
    kind: 'contractor',
    title:
      'Услуги ЧОП: четыре круглосуточных стационарных поста с периодическим обходом/объездом',
    cost_bucket: 'contractors',
    quantity: detailQuantity(12, 'мес'),
    unit_price_rub: detailMoney(720_000),
    total_rub: detailMoney(8_640_000),
    source_refs: detailSourceRefs(
      securityProductionAccessSource,
      securityAccessChopSource,
      securityAccessTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityAccessControlKppMaterialsResourceId,
    work_item_id: 'security-access-control',
    estimate_row_id: 'security-access-control',
    kind: 'material',
    title: 'Материальные затраты на содержание КПП',
    cost_bucket: 'materials',
    quantity: detailQuantity(4, 'поста'),
    unit_price_rub: detailMoney(252_000),
    total_rub: detailMoney(1_008_000),
    source_refs: detailSourceRefs(
      securityProductionAccessSource,
      securityAccessMaterialsSource,
      securityAccessTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityAccessControlUsnResourceId,
    work_item_id: 'security-access-control',
    estimate_row_id: 'security-access-control',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по пропускному режиму',
    cost_bucket: 'usn',
    total_rub: detailMoney(65_672.38, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      securityAccessTotalsSource,
      securityCalculationSource,
    ),
    note: 'В security.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: securityAccessControlVatResourceId,
    work_item_id: 'security-access-control',
    estimate_row_id: 'security-access-control',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по пропускному режиму',
    cost_bucket: 'vat',
    total_rub: detailMoney(485_683.62, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    note: 'Прямой НДС в security.pdf дан только по всему локальному расчету; агрегированная смета сходится с НДС от калькуляционных доходов.',
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: securityEquipmentVideoLaborResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'labor',
    title: 'Труд по обслуживанию охранного видеонаблюдения',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(584.1, 'чел-час'),
    unit_price_rub: detailMoney(749.01),
    total_rub: detailMoney(437_513.59),
    source_refs: detailSourceRefs(
      securityProductionEquipmentSource,
      securityStaffSource,
      securityEquipmentVideoSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentVideoCamerasResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'material',
    title: 'Замена 5% видеокамер',
    cost_bucket: 'materials',
    quantity: detailQuantity(2, 'шт.'),
    unit_price_rub: detailMoney(5_000),
    total_rub: detailMoney(10_000),
    source_refs: detailSourceRefs(
      securityProductionEquipmentSource,
      securityEquipmentVideoSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentMonitorLaborResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'labor',
    title: 'Труд по обслуживанию монитора',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(38.6, 'чел-час'),
    unit_price_rub: detailMoney(749.01),
    total_rub: detailMoney(28_919.4),
    source_refs: detailSourceRefs(securityEquipmentMonitorSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentServerPowerLaborResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'labor',
    title: 'Труд по обслуживанию блока питания сервера',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(14, 'чел-час'),
    unit_price_rub: detailMoney(749.01),
    total_rub: detailMoney(10_516.15),
    source_refs: detailSourceRefs(securityEquipmentServerPowerSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentSkudLaborResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'labor',
    title: 'Труд по обслуживанию системы СКУД TRASSIR',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(35.1, 'чел-час'),
    unit_price_rub: detailMoney(749.01),
    total_rub: detailMoney(26_252.91),
    source_refs: detailSourceRefs(securityEquipmentSkudSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentBarrierContractorResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'contractor',
    title: 'Услуги сторонней организации по обслуживанию шлагбаумов',
    cost_bucket: 'contractors',
    quantity: detailQuantity(12, 'мес'),
    unit_price_rub: detailMoney(30_000),
    total_rub: detailMoney(360_000),
    source_refs: detailSourceRefs(
      securityProductionEquipmentSource,
      securityEquipmentBarrierSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentDomilendContractorResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'contractor',
    title: 'Услуги сторонней организации по обслуживанию CRM Домиленд',
    cost_bucket: 'contractors',
    quantity: detailQuantity(12, 'мес'),
    unit_price_rub: detailMoney(11_215.38),
    total_rub: detailMoney(134_584.56),
    source_refs: detailSourceRefs(
      securityProductionDomilendDispatchSource,
      securityEquipmentDomilendSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentInsuranceResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'other_cost',
    title: 'Страховые взносы по техническому обслуживанию средств охраны',
    cost_bucket: 'insurance',
    total_rub: detailMoney(151_967.02),
    source_refs: detailSourceRefs(securityEquipmentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentOverheadResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'other_cost',
    title:
      'Общеэксплуатационные расходы по техническому обслуживанию средств охраны',
    cost_bucket: 'overhead',
    total_rub: detailMoney(352_241.43),
    source_refs: detailSourceRefs(securityEquipmentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentProfitResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'other_cost',
    title: 'Прибыль по техническому обслуживанию средств охраны',
    cost_bucket: 'profit',
    total_rub: detailMoney(201_280.82),
    source_refs: detailSourceRefs(securityEquipmentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityEquipmentUsnResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по техническому обслуживанию средств охраны',
    cost_bucket: 'usn',
    total_rub: detailMoney(11_662.22, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      securityEquipmentTotalsSource,
      securityCalculationSource,
    ),
    note: 'В security.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: securityEquipmentVatResourceId,
    work_item_id: 'security-equipment-maintenance',
    estimate_row_id: 'security-equipment-maintenance',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по техническому обслуживанию средств охраны',
    cost_bucket: 'vat',
    total_rub: detailMoney(86_246.9, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    note: 'Прямой НДС в security.pdf дан только по всему локальному расчету; агрегированная смета сходится с НДС от калькуляционных доходов.',
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: securityDispatchLaborResourceId,
    work_item_id: 'security-dispatch',
    estimate_row_id: 'security-dispatch',
    kind: 'labor',
    title: 'Труд диспетчера по приему заявок собственников',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(2_826.5, 'чел-час'),
    unit_price_rub: detailMoney(382.09),
    total_rub: detailMoney(1_080_000),
    source_refs: detailSourceRefs(
      securityProductionDomilendDispatchSource,
      securityStaffSource,
      securityDispatchPositionSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityDispatchInsuranceResourceId,
    work_item_id: 'security-dispatch',
    estimate_row_id: 'security-dispatch',
    kind: 'other_cost',
    title: 'Страховые взносы по диспетчерскому обслуживанию',
    cost_bucket: 'insurance',
    total_rub: detailMoney(326_160),
    source_refs: detailSourceRefs(securityDispatchPositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityDispatchOverheadResourceId,
    work_item_id: 'security-dispatch',
    estimate_row_id: 'security-dispatch',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по диспетчерскому обслуживанию',
    cost_bucket: 'overhead',
    total_rub: detailMoney(756_000),
    source_refs: detailSourceRefs(securityDispatchPositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityDispatchProfitResourceId,
    work_item_id: 'security-dispatch',
    estimate_row_id: 'security-dispatch',
    kind: 'other_cost',
    title: 'Прибыль по диспетчерскому обслуживанию',
    cost_bucket: 'profit',
    total_rub: detailMoney(432_000),
    source_refs: detailSourceRefs(securityDispatchPositionSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: securityDispatchUsnResourceId,
    work_item_id: 'security-dispatch',
    estimate_row_id: 'security-dispatch',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по диспетчерскому обслуживанию',
    cost_bucket: 'usn',
    total_rub: detailMoney(17_658.1, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      securityDispatchPositionSource,
      securityCalculationSource,
    ),
    note: 'В security.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: securityDispatchVatResourceId,
    work_item_id: 'security-dispatch',
    estimate_row_id: 'security-dispatch',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по диспетчерскому обслуживанию',
    cost_bucket: 'vat',
    total_rub: detailMoney(130_590.9, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    note: 'Прямой НДС в security.pdf дан только по всему локальному расчету; агрегированная смета сходится с НДС от калькуляционных доходов.',
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
] satisfies readonly EstimateDetailResource[];

export const securityControlTotals = [
  detailControlTotal({
    id: 'security-access-control-contractors',
    estimate_row_id: 'security-access-control',
    cost_bucket: 'contractors',
    source_total_rub: detailMoney(8_640_000),
    tolerance_rub: 0.01,
    resource_ids: securityAccessControlContractorResourceIds,
    source_refs: detailSourceRefs(
      securityAccessChopSource,
      securityAccessTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-access-control-materials',
    estimate_row_id: 'security-access-control',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(1_008_000),
    tolerance_rub: 0.01,
    resource_ids: securityAccessControlMaterialResourceIds,
    source_refs: detailSourceRefs(
      securityAccessMaterialsSource,
      securityAccessTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-access-control-usn',
    estimate_row_id: 'security-access-control',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(65_672.38),
    tolerance_rub: 0.01,
    resource_ids: [securityAccessControlUsnResourceId],
    source_refs: detailSourceRefs(
      securityAccessTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-access-control-vat',
    estimate_row_id: 'security-access-control',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(485_683.62),
    tolerance_rub: 0.01,
    resource_ids: [securityAccessControlVatResourceId],
    source_refs: detailSourceRefs(
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-access-control-gross',
    estimate_row_id: 'security-access-control',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(10_199_356),
    tolerance_rub: 1,
    resource_ids: securityAccessControlGrossResourceIds,
    source_refs: detailSourceRefs(
      securityAccessTotalsSource,
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-equipment-primary-salary',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(503_202.05),
    tolerance_rub: 0.01,
    resource_ids: securityEquipmentPrimarySalaryResourceIds,
    source_refs: detailSourceRefs(
      securityEquipmentVideoSource,
      securityEquipmentMonitorSource,
      securityEquipmentServerPowerSource,
      securityEquipmentSkudSource,
      securityEquipmentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-equipment-materials',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(10_000),
    tolerance_rub: 0.01,
    resource_ids: securityEquipmentMaterialResourceIds,
    source_refs: detailSourceRefs(
      securityEquipmentVideoSource,
      securityEquipmentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-equipment-contractors',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'contractors',
    source_total_rub: detailMoney(494_584.56),
    tolerance_rub: 0.01,
    resource_ids: securityEquipmentContractorResourceIds,
    source_refs: detailSourceRefs(
      securityEquipmentBarrierSource,
      securityEquipmentDomilendSource,
      securityEquipmentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-equipment-insurance',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(151_967.02),
    tolerance_rub: 0.01,
    resource_ids: [securityEquipmentInsuranceResourceId],
    source_refs: detailSourceRefs(securityEquipmentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-equipment-overhead',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(352_241.43),
    tolerance_rub: 0.01,
    resource_ids: [securityEquipmentOverheadResourceId],
    source_refs: detailSourceRefs(securityEquipmentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-equipment-profit',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(201_280.82),
    tolerance_rub: 0.01,
    resource_ids: [securityEquipmentProfitResourceId],
    source_refs: detailSourceRefs(securityEquipmentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-equipment-usn',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(11_662.22),
    tolerance_rub: 0.01,
    resource_ids: [securityEquipmentUsnResourceId],
    source_refs: detailSourceRefs(
      securityEquipmentTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-equipment-vat',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(86_246.9),
    tolerance_rub: 0.01,
    resource_ids: [securityEquipmentVatResourceId],
    source_refs: detailSourceRefs(
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-equipment-gross',
    estimate_row_id: 'security-equipment-maintenance',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(1_811_185),
    tolerance_rub: 1,
    resource_ids: securityEquipmentGrossResourceIds,
    source_refs: detailSourceRefs(
      securityEquipmentTotalsSource,
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-dispatch-primary-salary',
    estimate_row_id: 'security-dispatch',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(1_080_000),
    tolerance_rub: 0.01,
    resource_ids: [securityDispatchLaborResourceId],
    source_refs: detailSourceRefs(securityDispatchPositionSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-dispatch-insurance',
    estimate_row_id: 'security-dispatch',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(326_160),
    tolerance_rub: 0.01,
    resource_ids: [securityDispatchInsuranceResourceId],
    source_refs: detailSourceRefs(securityDispatchPositionSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-dispatch-overhead',
    estimate_row_id: 'security-dispatch',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(756_000),
    tolerance_rub: 0.01,
    resource_ids: [securityDispatchOverheadResourceId],
    source_refs: detailSourceRefs(securityDispatchPositionSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-dispatch-profit',
    estimate_row_id: 'security-dispatch',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(432_000),
    tolerance_rub: 0.01,
    resource_ids: [securityDispatchProfitResourceId],
    source_refs: detailSourceRefs(securityDispatchPositionSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'security-dispatch-usn',
    estimate_row_id: 'security-dispatch',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(17_658.1),
    tolerance_rub: 0.01,
    resource_ids: [securityDispatchUsnResourceId],
    source_refs: detailSourceRefs(
      securityDispatchPositionSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-dispatch-vat',
    estimate_row_id: 'security-dispatch',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(130_590.9),
    tolerance_rub: 0.01,
    resource_ids: [securityDispatchVatResourceId],
    source_refs: detailSourceRefs(
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'security-dispatch-gross',
    estimate_row_id: 'security-dispatch',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(2_742_409),
    tolerance_rub: 1,
    resource_ids: securityDispatchGrossResourceIds,
    source_refs: detailSourceRefs(
      securityDispatchPositionSource,
      securityDocumentTotalsSource,
      securityCalculationSource,
    ),
    ...detailNeedsCheckStatus(
      securityDerivedAllocationNeedsCheckReason,
      securityDerivedAllocationRefs,
    ),
  }),
] satisfies readonly EstimateDetailControlTotalInput[];
