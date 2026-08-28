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

const lightingStreetFixtureLaborResourceId = 'lighting-street-fixture-labor';
const lightingStreetCableLaborResourceId = 'lighting-street-cable-labor';
const lightingStreetFixtureMaterialResourceId =
  'lighting-street-fixture-material';
const lightingStreetInsuranceResourceId = 'lighting-street-insurance';
const lightingStreetOverheadResourceId = 'lighting-street-overhead';
const lightingStreetProfitResourceId = 'lighting-street-profit';
const lightingStreetUsnResourceId = 'lighting-street-usn-derived';
const lightingStreetVatResourceId = 'lighting-street-vat-derived';
const lightingElectricityMaterialResourceId = 'lighting-electricity-material';
const lightingElectricityUsnResourceId = 'lighting-electricity-usn-derived';
const lightingElectricityVatResourceId = 'lighting-electricity-vat-derived';
const lightingPolesPaintLaborResourceId = 'lighting-poles-paint-labor';
const lightingPolesPaintMaterialResourceId = 'lighting-poles-paint-material';
const lightingPolesInsuranceResourceId = 'lighting-poles-insurance';
const lightingPolesOverheadResourceId = 'lighting-poles-overhead';
const lightingPolesProfitResourceId = 'lighting-poles-profit';
const lightingPolesUsnResourceId = 'lighting-poles-usn-derived';
const lightingPolesVatResourceId = 'lighting-poles-vat-derived';
const lightingPowerSystemKtpKrnLaborResourceId =
  'lighting-power-system-ktp-krn-labor';
const lightingPowerSystemTransformerLaborResourceId =
  'lighting-power-system-transformer-labor';
const lightingPowerSystemInsuranceResourceId =
  'lighting-power-system-insurance';
const lightingPowerSystemOverheadResourceId = 'lighting-power-system-overhead';
const lightingPowerSystemProfitResourceId = 'lighting-power-system-profit';
const lightingPowerSystemUsnResourceId = 'lighting-power-system-usn-derived';
const lightingPowerSystemVatResourceId = 'lighting-power-system-vat-derived';

const lightingResourceStatementRoundedQuantityNote =
  'ресурсная ведомость округляет количество; итог сохранен по исходной строке';

const lightingProductionStreetSource = detailSource(
  'lighting',
  1,
  'производственная программа / техническое обслуживание уличного освещения',
  {
    quote:
      'Техническое обслуживание уличного освещения 3 839,4; обслуживание светильников ... 3776,8; уличный светильник ЖКУ 16-100-001 ... 146,0; обслуживание кабельных сетей ... 62,6',
  },
);

const lightingProductionPolesSource = detailSource(
  'lighting',
  2,
  'производственная программа / текущий ремонт опор уличного освещения',
  {
    quote:
      'Текущий ремонт опор уличного освещения (1 раз в 5 лет); окраска металлических поверхностей в 2 слоя; 0,20; 2 833,60; 334,4; краска ... 453,4',
  },
);

const lightingProductionPowerKtpSource = detailSource(
  'lighting',
  2,
  'производственная программа / техническое обслуживание КТП и КРН',
  {
    quote:
      'Техническое обслуживание КТП, КРН; шт.; 3; 1 466,6; осмотр и уборка помещения ТП; очистка от снега КТП',
  },
);

const lightingProductionPowerTransformerSource = detailSource(
  'lighting',
  5,
  'производственная программа / техническое обслуживание трансформаторов 10кВ',
  {
    quote:
      'Техническое обслуживание трансформаторов 10кВ; 2; 126,8; замер нагрузок; осмотр трансформатора; очистка трансформатора',
  },
);

const lightingNormativeElectricitySource = detailSource(
  'lighting',
  6,
  'нормативный расчет электроэнергии для уличного освещения',
  {
    quote:
      'Уличный светильник ЖКУ 16-100-001; 506; 0,10; 218 457; продолжительность работы освещения 4 317,3 часов в год',
  },
);

const lightingNormativeMaterialsSource = detailSource(
  'lighting',
  6,
  'нормативный расчет материалов для уличного освещения',
  {
    quote:
      'Уличный светильник ЖКУ 16-100-001; срок службы 15 000; время работы за 1 год 4 317; износ за год 28,8%; кол-во ламп для замены 146',
  },
);

const lightingStreetFixturePositionSource = detailSource(
  'lighting',
  7,
  'позиция 1.1 / обслуживание светильников наружного освещения',
  {
    quote:
      'Затраты труда Электромонтажник ... 3776,8; 664,15; 2 508 335,23; ИТОГО ПО ПОЗИЦИИ 6 122 841,22',
  },
);

const lightingStreetFixtureMaterialSource = detailSource(
  'lighting',
  8,
  'позиция 1.1 / материал и начисления по обслуживанию светильников',
  {
    quote:
      'Уличный светильник ЖКУ 16-100-001; шт; 146,0; 670,00; 97 820,00; страховые взносы 757 517,24; общеэксплуатационные расходы 1 755 834,66; прибыль 1 003 334,09',
  },
);

const lightingStreetCablePositionSource = detailSource(
  'lighting',
  8,
  'позиция 1.2 / обслуживание кабельных сетей',
  {
    quote:
      'Обслуживание кабельных сетей ... 62,6; 664,15; 41 578,18; страховые взносы 12 556,61; общеэксплуатационные расходы 29 104,73; прибыль 16 631,27; ИТОГО ПО ПОЗИЦИИ 99 870,79',
  },
);

const lightingElectricityPositionSource = detailSource(
  'lighting',
  9,
  'позиция 2.1 / электроэнергия на уличное освещение',
  {
    quote:
      'Электроэнергия; кВт*час; 218457,5; 6,29; 1 374 097,60; ИТОГО ПО ПОЗИЦИИ 1 374 097,60',
  },
);

const lightingPolesPositionSource = detailSource(
  'lighting',
  9,
  'позиция 3.1 / окраска металлических поверхностей опор',
  {
    quote:
      'Затраты труда Электромонтажник ... 334,4; 664,15; 222 066,98; краска по металлу ... 453,4; 612,50; 277 692,80',
  },
);

const lightingPolesTotalsSource = detailSource(
  'lighting',
  10,
  'позиция 3.1 / начисления и итог ремонта опор',
  {
    quote:
      'Расходы на страховые взносы 67 064,23; общеэксплуатационные расходы 155 446,88; прибыль 88 826,79; ИТОГО ПО ПОЗИЦИИ 811 097,69',
  },
);

const lightingPowerKtpPositionSource = detailSource(
  'lighting',
  10,
  'позиция 4.1 / техническое обслуживание КТП и КРН',
  {
    quote:
      'Техническое обслуживание КТП, КРН; 3,00; затраты труда 1466,6; 664,15; 974 022,95; страховые взносы 294 154,93; общеэксплуатационные расходы 681 816,06; прибыль 389 609,18; ИТОГО ПО ПОЗИЦИИ 2 339 603,12',
  },
);

const lightingPowerTransformerPositionSource = detailSource(
  'lighting',
  10,
  'позиция 4.2 / техническое обслуживание трансформаторов 10кВ',
  {
    quote:
      'Техническое обслуживание трансформаторов 10кВ; 2,00; затраты труда 126,8; 664,15; 84 213,69; страховые взносы 25 432,53; общеэксплуатационные расходы 58 949,58; прибыль 33 685,47; ИТОГО ПО ПОЗИЦИИ 202 281,28',
  },
);

const lightingDocumentTotalsSource = detailSource(
  'lighting',
  11,
  'итоги локального ресурсного сметного расчета по освещению',
  {
    quote:
      'Итого по разделу ... 10 949 791,70; основная зарплата 3 830 217,03; материальные затраты 1 749 610,40; страховые взносы 1 156 725,54; общеэксплуатационные расходы 2 681 151,92; прибыль 1 532 086,81',
  },
);

const lightingDocumentVatSource = detailSource(
  'lighting',
  12,
  'НДС в локальном ресурсном сметном расчете по освещению',
  {
    quote: 'ВСЕГО по документу 10 949 791,70; НДС 5% 547 489,58',
  },
);

const lightingResourceStatementSource = detailSource(
  'lighting',
  13,
  'ресурсная ведомость по локальному ресурсному сметному расчету',
  {
    quote:
      'Электромонтажник 5767,1 664,15 3 830 217,03; Уличный светильник ЖКУ 16-100-001 146 670,00 97 820,00; Краска ... 453 612,50 277 692,80; Электроэнергия 218457 6,29 1 374 097,60',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Электромонтажник',
        resource_ids: [
          lightingStreetFixtureLaborResourceId,
          lightingStreetCableLaborResourceId,
          lightingPolesPaintLaborResourceId,
          lightingPowerSystemKtpKrnLaborResourceId,
          lightingPowerSystemTransformerLaborResourceId,
        ],
        quantity: detailQuantity(5_767.1, 'чел-час', {
          note: lightingResourceStatementRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(664.15),
        total_rub: detailMoney(3_830_217.03),
      }),
      detailSourceQuoteItem({
        label: 'Уличный светильник ЖКУ 16-100-001',
        resource_ids: [lightingStreetFixtureMaterialResourceId],
        quantity: detailQuantity(146, 'шт.'),
        unit_price_rub: detailMoney(670),
        total_rub: detailMoney(97_820),
      }),
      detailSourceQuoteItem({
        label: 'Краска по металлу',
        resource_ids: [lightingPolesPaintMaterialResourceId],
        quantity: detailQuantity(453, 'кг.', {
          note: lightingResourceStatementRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(612.5),
        total_rub: detailMoney(277_692.8),
      }),
      detailSourceQuoteItem({
        label: 'Электроэнергия',
        resource_ids: [lightingElectricityMaterialResourceId],
        quantity: detailQuantity(218_457, 'кВт*час', {
          note: lightingResourceStatementRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(6.29),
        total_rub: detailMoney(1_374_097.6),
      }),
    ),
  },
);

const lightingCalculationSource = detailSource(
  'lighting',
  14,
  'калькуляция себестоимости услуг по освещению и электроснабжению',
  {
    quote:
      'ИТОГО расходов 9 417 705; налог по УСН 229 813; прибыль ... 1 532 087; Доходов - всего 11 179 605',
  },
);

const lightingDerivedAllocationNeedsCheckReason =
  'lighting.pdf показывает НДС 5% двумя несовпадающими способами: прямой НДС в локальном расчете и расчетный НДС от калькуляционных доходов; распределение по четырем строкам выведено для сверки с estimate-2026.';
const lightingDerivedAllocationRefs = detailSourceRefs(
  lightingDocumentTotalsSource,
  lightingDocumentVatSource,
  lightingCalculationSource,
);
const lightingVatNeedsCheckNote =
  'Прямой НДС 547 489,58 в локальном расчете равен 5% от 10 949 791,70 до УСН; агрегированная смета 11 738 585 сходится с НДС 5% от доходов 11 179 605 из калькуляции.';

const lightingStreetPrimarySalaryResourceIds = [
  lightingStreetFixtureLaborResourceId,
  lightingStreetCableLaborResourceId,
] as const;
const lightingStreetMaterialResourceIds = [
  lightingStreetFixtureMaterialResourceId,
] as const;
const lightingStreetGrossResourceIds = [
  ...lightingStreetPrimarySalaryResourceIds,
  lightingStreetFixtureMaterialResourceId,
  lightingStreetInsuranceResourceId,
  lightingStreetOverheadResourceId,
  lightingStreetProfitResourceId,
  lightingStreetUsnResourceId,
  lightingStreetVatResourceId,
] as const;
const lightingElectricityGrossResourceIds = [
  lightingElectricityMaterialResourceId,
  lightingElectricityUsnResourceId,
  lightingElectricityVatResourceId,
] as const;
const lightingPolesGrossResourceIds = [
  lightingPolesPaintLaborResourceId,
  lightingPolesPaintMaterialResourceId,
  lightingPolesInsuranceResourceId,
  lightingPolesOverheadResourceId,
  lightingPolesProfitResourceId,
  lightingPolesUsnResourceId,
  lightingPolesVatResourceId,
] as const;
const lightingPowerSystemPrimarySalaryResourceIds = [
  lightingPowerSystemKtpKrnLaborResourceId,
  lightingPowerSystemTransformerLaborResourceId,
] as const;
const lightingPowerSystemGrossResourceIds = [
  ...lightingPowerSystemPrimarySalaryResourceIds,
  lightingPowerSystemInsuranceResourceId,
  lightingPowerSystemOverheadResourceId,
  lightingPowerSystemProfitResourceId,
  lightingPowerSystemUsnResourceId,
  lightingPowerSystemVatResourceId,
] as const;

export const lightingWorkItems = [
  detailWorkItem({
    id: 'lighting-street-maintenance',
    title: 'Техническое обслуживание уличного освещения',
    estimate_row_id: 'lighting-street-maintenance',
    service_ids: ['year-round-power-lines-maintenance'],
    source_refs: detailSourceRefs(
      lightingProductionStreetSource,
      lightingStreetFixturePositionSource,
      lightingStreetCablePositionSource,
    ),
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'lighting-electricity',
    title: 'Оплата электроэнергии на уличное освещение',
    estimate_row_id: 'lighting-electricity',
    source_refs: detailSourceRefs(
      lightingNormativeElectricitySource,
      lightingElectricityPositionSource,
    ),
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'lighting-poles-repair',
    title: 'Текущий ремонт опор уличного освещения',
    estimate_row_id: 'lighting-poles-repair',
    source_refs: detailSourceRefs(
      lightingProductionPolesSource,
      lightingPolesPositionSource,
      lightingPolesTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'lighting-power-system-repair',
    title: 'Текущий ремонт системы электроснабжения',
    estimate_row_id: 'lighting-power-system-repair',
    service_ids: ['year-round-power-lines-maintenance'],
    source_refs: detailSourceRefs(
      lightingProductionPowerKtpSource,
      lightingProductionPowerTransformerSource,
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
    ),
    ...detailStatus('verified'),
  }),
] satisfies readonly EstimateDetailWorkItem[];

export const lightingResources = [
  detailResource({
    id: lightingStreetFixtureLaborResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'labor',
    title: 'Электромонтажник: обслуживание светильников наружного освещения',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(3_776.8, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(2_508_335.23),
    source_refs: detailSourceRefs(
      lightingProductionStreetSource,
      lightingStreetFixturePositionSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingStreetCableLaborResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'labor',
    title: 'Электромонтажник: обслуживание кабельных сетей',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(62.6, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(41_578.18),
    source_refs: detailSourceRefs(
      lightingProductionStreetSource,
      lightingStreetCablePositionSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingStreetFixtureMaterialResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'material',
    title: 'Уличный светильник ЖКУ 16-100-001 для замены',
    cost_bucket: 'materials',
    quantity: detailQuantity(146, 'шт.'),
    unit_price_rub: detailMoney(670),
    total_rub: detailMoney(97_820),
    source_refs: detailSourceRefs(
      lightingProductionStreetSource,
      lightingNormativeMaterialsSource,
      lightingStreetFixtureMaterialSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingStreetInsuranceResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'other_cost',
    title: 'Страховые взносы по обслуживанию светильников и кабельных сетей',
    cost_bucket: 'insurance',
    total_rub: detailMoney(770_073.85),
    source_refs: detailSourceRefs(
      lightingStreetFixtureMaterialSource,
      lightingStreetCablePositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingStreetOverheadResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'other_cost',
    title:
      'Общеэксплуатационные расходы по обслуживанию светильников и кабельных сетей',
    cost_bucket: 'overhead',
    total_rub: detailMoney(1_784_939.39),
    source_refs: detailSourceRefs(
      lightingStreetFixtureMaterialSource,
      lightingStreetCablePositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingStreetProfitResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'other_cost',
    title: 'Прибыль по обслуживанию светильников и кабельных сетей',
    cost_bucket: 'profit',
    total_rub: detailMoney(1_019_965.36),
    source_refs: detailSourceRefs(
      lightingStreetFixtureMaterialSource,
      lightingStreetCablePositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingStreetUsnResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по обслуживанию уличного освещения',
    cost_bucket: 'usn',
    total_rub: detailMoney(130_601.32, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingStreetFixturePositionSource,
      lightingStreetCablePositionSource,
      lightingCalculationSource,
    ),
    note: 'В lighting.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: lightingStreetVatResourceId,
    work_item_id: 'lighting-street-maintenance',
    estimate_row_id: 'lighting-street-maintenance',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по обслуживанию уличного освещения',
    cost_bucket: 'vat',
    total_rub: detailMoney(317_665.67, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: lightingElectricityMaterialResourceId,
    work_item_id: 'lighting-electricity',
    estimate_row_id: 'lighting-electricity',
    kind: 'material',
    title: 'Электроэнергия на уличное освещение',
    cost_bucket: 'materials',
    quantity: detailQuantity(218_457.5, 'кВт*час'),
    unit_price_rub: detailMoney(6.29),
    total_rub: detailMoney(1_374_097.6),
    source_refs: detailSourceRefs(
      lightingNormativeElectricitySource,
      lightingElectricityPositionSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingElectricityUsnResourceId,
    work_item_id: 'lighting-electricity',
    estimate_row_id: 'lighting-electricity',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по электроэнергии уличного освещения',
    cost_bucket: 'usn',
    total_rub: detailMoney(28_839.54, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingElectricityPositionSource,
      lightingCalculationSource,
    ),
    note: 'В lighting.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: lightingElectricityVatResourceId,
    work_item_id: 'lighting-electricity',
    estimate_row_id: 'lighting-electricity',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по электроэнергии уличного освещения',
    cost_bucket: 'vat',
    total_rub: detailMoney(70_146.86, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: lightingPolesPaintLaborResourceId,
    work_item_id: 'lighting-poles-repair',
    estimate_row_id: 'lighting-poles-repair',
    kind: 'labor',
    title: 'Электромонтажник: окраска металлических поверхностей опор',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(334.4, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(222_066.98),
    source_refs: detailSourceRefs(
      lightingProductionPolesSource,
      lightingPolesPositionSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPolesPaintMaterialResourceId,
    work_item_id: 'lighting-poles-repair',
    estimate_row_id: 'lighting-poles-repair',
    kind: 'material',
    title: 'Краска по металлу кузнечная «Церта» черная матовая',
    cost_bucket: 'materials',
    quantity: detailQuantity(453.4, 'кг.', {
      note: 'количество показано с одним десятичным знаком; сумма соответствует скрытой точности около 453,376 кг',
    }),
    unit_price_rub: detailMoney(612.5),
    total_rub: detailMoney(277_692.8),
    source_refs: detailSourceRefs(
      lightingProductionPolesSource,
      lightingPolesPositionSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPolesInsuranceResourceId,
    work_item_id: 'lighting-poles-repair',
    estimate_row_id: 'lighting-poles-repair',
    kind: 'other_cost',
    title: 'Страховые взносы по ремонту опор уличного освещения',
    cost_bucket: 'insurance',
    total_rub: detailMoney(67_064.23),
    source_refs: detailSourceRefs(lightingPolesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPolesOverheadResourceId,
    work_item_id: 'lighting-poles-repair',
    estimate_row_id: 'lighting-poles-repair',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по ремонту опор уличного освещения',
    cost_bucket: 'overhead',
    total_rub: detailMoney(155_446.88),
    source_refs: detailSourceRefs(lightingPolesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPolesProfitResourceId,
    work_item_id: 'lighting-poles-repair',
    estimate_row_id: 'lighting-poles-repair',
    kind: 'other_cost',
    title: 'Прибыль по ремонту опор уличного освещения',
    cost_bucket: 'profit',
    total_rub: detailMoney(88_826.79),
    source_refs: detailSourceRefs(lightingPolesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPolesUsnResourceId,
    work_item_id: 'lighting-poles-repair',
    estimate_row_id: 'lighting-poles-repair',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по ремонту опор уличного освещения',
    cost_bucket: 'usn',
    total_rub: detailMoney(17_023.27, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingPolesTotalsSource,
      lightingCalculationSource,
    ),
    note: 'В lighting.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: lightingPolesVatResourceId,
    work_item_id: 'lighting-poles-repair',
    estimate_row_id: 'lighting-poles-repair',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по ремонту опор уличного освещения',
    cost_bucket: 'vat',
    total_rub: detailMoney(41_406.05, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailResource({
    id: lightingPowerSystemKtpKrnLaborResourceId,
    work_item_id: 'lighting-power-system-repair',
    estimate_row_id: 'lighting-power-system-repair',
    kind: 'labor',
    title: 'Электромонтажник: техническое обслуживание КТП и КРН',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(1_466.6, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(974_022.95),
    source_refs: detailSourceRefs(
      lightingProductionPowerKtpSource,
      lightingPowerKtpPositionSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPowerSystemTransformerLaborResourceId,
    work_item_id: 'lighting-power-system-repair',
    estimate_row_id: 'lighting-power-system-repair',
    kind: 'labor',
    title: 'Электромонтажник: техническое обслуживание трансформаторов 10кВ',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(126.8, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(84_213.69),
    source_refs: detailSourceRefs(
      lightingProductionPowerTransformerSource,
      lightingPowerTransformerPositionSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPowerSystemInsuranceResourceId,
    work_item_id: 'lighting-power-system-repair',
    estimate_row_id: 'lighting-power-system-repair',
    kind: 'other_cost',
    title: 'Страховые взносы по ремонту системы электроснабжения',
    cost_bucket: 'insurance',
    total_rub: detailMoney(319_587.46),
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPowerSystemOverheadResourceId,
    work_item_id: 'lighting-power-system-repair',
    estimate_row_id: 'lighting-power-system-repair',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по ремонту системы электроснабжения',
    cost_bucket: 'overhead',
    total_rub: detailMoney(740_765.64),
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPowerSystemProfitResourceId,
    work_item_id: 'lighting-power-system-repair',
    estimate_row_id: 'lighting-power-system-repair',
    kind: 'other_cost',
    title: 'Прибыль по ремонту системы электроснабжения',
    cost_bucket: 'profit',
    total_rub: detailMoney(423_294.65),
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: lightingPowerSystemUsnResourceId,
    work_item_id: 'lighting-power-system-repair',
    estimate_row_id: 'lighting-power-system-repair',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по ремонту системы электроснабжения',
    cost_bucket: 'usn',
    total_rub: detailMoney(53_348.94, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingCalculationSource,
    ),
    note: 'В lighting.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: lightingPowerSystemVatResourceId,
    work_item_id: 'lighting-power-system-repair',
    estimate_row_id: 'lighting-power-system-repair',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по ремонту системы электроснабжения',
    cost_bucket: 'vat',
    total_rub: detailMoney(129_761.67, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
] satisfies readonly EstimateDetailResource[];

export const lightingControlTotals = [
  detailControlTotal({
    id: 'lighting-street-primary-salary',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(2_549_913.41),
    tolerance_rub: 0.01,
    resource_ids: lightingStreetPrimarySalaryResourceIds,
    source_refs: detailSourceRefs(
      lightingStreetFixturePositionSource,
      lightingStreetCablePositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-street-materials',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(97_820),
    tolerance_rub: 0.01,
    resource_ids: lightingStreetMaterialResourceIds,
    source_refs: detailSourceRefs(
      lightingStreetFixtureMaterialSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-street-insurance',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(770_073.85),
    tolerance_rub: 0.01,
    resource_ids: [lightingStreetInsuranceResourceId],
    source_refs: detailSourceRefs(
      lightingStreetFixtureMaterialSource,
      lightingStreetCablePositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-street-overhead',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(1_784_939.39),
    tolerance_rub: 0.01,
    resource_ids: [lightingStreetOverheadResourceId],
    source_refs: detailSourceRefs(
      lightingStreetFixtureMaterialSource,
      lightingStreetCablePositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-street-profit',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(1_019_965.36),
    tolerance_rub: 0.01,
    resource_ids: [lightingStreetProfitResourceId],
    source_refs: detailSourceRefs(
      lightingStreetFixtureMaterialSource,
      lightingStreetCablePositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-street-usn',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(130_601.32),
    tolerance_rub: 0.01,
    resource_ids: [lightingStreetUsnResourceId],
    source_refs: detailSourceRefs(
      lightingDocumentTotalsSource,
      lightingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'lighting-street-vat',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(317_665.67),
    tolerance_rub: 0.01,
    resource_ids: [lightingStreetVatResourceId],
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'lighting-street-gross',
    estimate_row_id: 'lighting-street-maintenance',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(6_670_979),
    tolerance_rub: 1,
    resource_ids: lightingStreetGrossResourceIds,
    source_refs: detailSourceRefs(
      lightingDocumentTotalsSource,
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'lighting-electricity-materials',
    estimate_row_id: 'lighting-electricity',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(1_374_097.6),
    tolerance_rub: 0.01,
    resource_ids: [lightingElectricityMaterialResourceId],
    source_refs: detailSourceRefs(
      lightingElectricityPositionSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-electricity-usn',
    estimate_row_id: 'lighting-electricity',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(28_839.54),
    tolerance_rub: 0.01,
    resource_ids: [lightingElectricityUsnResourceId],
    source_refs: detailSourceRefs(
      lightingElectricityPositionSource,
      lightingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'lighting-electricity-vat',
    estimate_row_id: 'lighting-electricity',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(70_146.86),
    tolerance_rub: 0.01,
    resource_ids: [lightingElectricityVatResourceId],
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'lighting-electricity-gross',
    estimate_row_id: 'lighting-electricity',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(1_473_084),
    tolerance_rub: 1,
    resource_ids: lightingElectricityGrossResourceIds,
    source_refs: detailSourceRefs(
      lightingElectricityPositionSource,
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'lighting-poles-primary-salary',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(222_066.98),
    tolerance_rub: 0.01,
    resource_ids: [lightingPolesPaintLaborResourceId],
    source_refs: detailSourceRefs(
      lightingPolesPositionSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-poles-materials',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(277_692.8),
    tolerance_rub: 0.01,
    resource_ids: [lightingPolesPaintMaterialResourceId],
    source_refs: detailSourceRefs(
      lightingPolesPositionSource,
      lightingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-poles-insurance',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(67_064.23),
    tolerance_rub: 0.01,
    resource_ids: [lightingPolesInsuranceResourceId],
    source_refs: detailSourceRefs(lightingPolesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-poles-overhead',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(155_446.88),
    tolerance_rub: 0.01,
    resource_ids: [lightingPolesOverheadResourceId],
    source_refs: detailSourceRefs(lightingPolesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-poles-profit',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(88_826.79),
    tolerance_rub: 0.01,
    resource_ids: [lightingPolesProfitResourceId],
    source_refs: detailSourceRefs(lightingPolesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-poles-usn',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(17_023.27),
    tolerance_rub: 0.01,
    resource_ids: [lightingPolesUsnResourceId],
    source_refs: detailSourceRefs(
      lightingPolesTotalsSource,
      lightingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'lighting-poles-vat',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(41_406.05),
    tolerance_rub: 0.01,
    resource_ids: [lightingPolesVatResourceId],
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'lighting-poles-gross',
    estimate_row_id: 'lighting-poles-repair',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(869_527),
    tolerance_rub: 1,
    resource_ids: lightingPolesGrossResourceIds,
    source_refs: detailSourceRefs(
      lightingPolesTotalsSource,
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'lighting-power-system-primary-salary',
    estimate_row_id: 'lighting-power-system-repair',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(1_058_236.64),
    tolerance_rub: 0.01,
    resource_ids: lightingPowerSystemPrimarySalaryResourceIds,
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-power-system-insurance',
    estimate_row_id: 'lighting-power-system-repair',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(319_587.46),
    tolerance_rub: 0.01,
    resource_ids: [lightingPowerSystemInsuranceResourceId],
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-power-system-overhead',
    estimate_row_id: 'lighting-power-system-repair',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(740_765.64),
    tolerance_rub: 0.01,
    resource_ids: [lightingPowerSystemOverheadResourceId],
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-power-system-profit',
    estimate_row_id: 'lighting-power-system-repair',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(423_294.65),
    tolerance_rub: 0.01,
    resource_ids: [lightingPowerSystemProfitResourceId],
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'lighting-power-system-usn',
    estimate_row_id: 'lighting-power-system-repair',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(53_348.94),
    tolerance_rub: 0.01,
    resource_ids: [lightingPowerSystemUsnResourceId],
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'lighting-power-system-vat',
    estimate_row_id: 'lighting-power-system-repair',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(129_761.67),
    tolerance_rub: 0.01,
    resource_ids: [lightingPowerSystemVatResourceId],
    source_refs: detailSourceRefs(
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
  detailControlTotal({
    id: 'lighting-power-system-gross',
    estimate_row_id: 'lighting-power-system-repair',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(2_724_995),
    tolerance_rub: 1,
    resource_ids: lightingPowerSystemGrossResourceIds,
    source_refs: detailSourceRefs(
      lightingPowerKtpPositionSource,
      lightingPowerTransformerPositionSource,
      lightingDocumentVatSource,
      lightingCalculationSource,
    ),
    note: lightingVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      lightingDerivedAllocationNeedsCheckReason,
      lightingDerivedAllocationRefs,
    ),
  }),
] satisfies readonly EstimateDetailControlTotalInput[];
