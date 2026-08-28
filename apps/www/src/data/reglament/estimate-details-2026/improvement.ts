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

const improvementPlaygroundElementsWipeLaborResourceId =
  'improvement-playground-elements-wipe-labor';
const improvementPlaygroundElementsWashLaborResourceId =
  'improvement-playground-elements-wash-labor';
const improvementPlaygroundElementsSnowLaborResourceId =
  'improvement-playground-elements-snow-labor';
const improvementSandboxCareLaborResourceId = 'improvement-sandbox-care-labor';
const improvementPlaygroundGroundSweepFirstLaborResourceId =
  'improvement-playground-ground-sweep-first-labor';
const improvementSportsElementsWipeLaborResourceId =
  'improvement-sports-elements-wipe-labor';
const improvementSportsElementsWashLaborResourceId =
  'improvement-sports-elements-wash-labor';
const improvementWaterSurfaceTrashLaborResourceId =
  'improvement-water-surface-trash-labor';
const improvementWaterVegetationLaborResourceId =
  'improvement-water-vegetation-labor';
const improvementPlaygroundGroundSweepSecondLaborResourceId =
  'improvement-playground-ground-sweep-second-labor';
const improvementCurbstonePaintLaborResourceId =
  'improvement-curbstone-paint-labor';
const improvementPpeCottonSuitResourceId = 'improvement-ppe-cotton-suit';
const improvementPpeInsulatedJacketResourceId =
  'improvement-ppe-insulated-jacket';
const improvementPpeSignalVestResourceId = 'improvement-ppe-signal-vest';
const improvementPpeInsulatedBootsResourceId =
  'improvement-ppe-insulated-boots';
const improvementPpePolymerGlovesResourceId = 'improvement-ppe-polymer-gloves';
const improvementPpeInsulatedMittensResourceId =
  'improvement-ppe-insulated-mittens';
const improvementPpeRubberBootsResourceId = 'improvement-ppe-rubber-boots';
const improvementPpeSoapResourceId = 'improvement-ppe-soap';
const improvementSandboxSandResourceId = 'improvement-sandbox-sand';
const improvementTrashBagsResourceId = 'improvement-trash-bags';
const improvementCurbstonePaintResourceId = 'improvement-curbstone-paint';
const improvementIceAxeResourceId = 'improvement-ice-axe';
const improvementBroomResourceId = 'improvement-broom';
const improvementSnowShovelResourceId = 'improvement-snow-shovel';
const improvementScoopShovelResourceId = 'improvement-scoop-shovel';
const improvementGardenWheelbarrowResourceId = 'improvement-garden-wheelbarrow';
const improvementObjectsInsuranceResourceId = 'improvement-objects-insurance';
const improvementObjectsOverheadResourceId = 'improvement-objects-overhead';
const improvementObjectsProfitResourceId = 'improvement-objects-profit';
const improvementObjectsUsnResourceId = 'improvement-objects-usn-derived';
const improvementObjectsVatResourceId = 'improvement-objects-vat-derived';
const improvementFenceProfileSheetResourceId =
  'improvement-fence-profile-sheet-repair';
const improvementFenceUsnResourceId = 'improvement-fence-repair-usn-derived';
const improvementFenceVatResourceId = 'improvement-fence-repair-vat-derived';

const improvementRoundedQuantityNote =
  'количество в PDF округлено; итог сохранен по исходной строке';

const improvementFinalObjectsSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 4.1',
  {
    quote:
      '4.1 Содержание объектов благоустройства; периодичность 300; стоимость 4 366 756',
  },
);

const improvementFinalRoadSurfaceSource = detailSource(
  'final',
  2,
  'итоговая смета / строка 4.2',
  {
    quote:
      '4.2 Текущий ремонт покрытия дорог, площадок; периодичность 1; стоимость 320 424',
  },
);

const improvementProductionObjectsSource = detailSource(
  'improvement',
  1,
  'производственная программа / содержание и текущий ремонт объектов благоустройства',
  {
    quote:
      'Содержание и текущий ремонт объектов благоустройства; трудозатраты 2 513,1; материалы: песок, мешки для мусора',
  },
);

const improvementProductionFenceSource = detailSource(
  'improvement',
  2,
  'производственная программа / ремонт периметрального ограждения',
  {
    quote:
      'Ремонт периметрального ограждения; п.м.; 12430; Замена поврежденных элементов (2% от общего объема); 249; Профнастил оцинкованный ... 248,6 м²',
  },
);

const improvementProductionCurbstonePpeToolsSource = detailSource(
  'improvement',
  3,
  'производственная программа / бордюры, СИЗ и инструмент',
  {
    quote:
      'Окраска бетонных дорожных бордюров; 83 м²; краска 33,0 кг; средства охраны труда; износ оборудования, инструментов',
  },
);

const improvementStaffSource = detailSource(
  'improvement',
  5,
  'нормативное штатное расписание по благоустройству',
  {
    quote:
      'Рабочий по уборке территории (средний разряд 3.0); 1,3; тарифная ставка 664,15; всего 863,39',
  },
);

const improvementDocumentHeaderSource = detailSource(
  'improvement',
  6,
  'локальный ресурсный сметный расчет по благоустройству / шапка',
  {
    quote:
      'Сметная стоимость 4 363 835,75; Средства на оплату труда 1 669 095,98; Трудозатраты рабочих 2 513,15',
  },
);

const improvementPlaygroundElementsWipeSource = detailSource(
  'improvement',
  6,
  'позиция 1.1 / протирка поверхностей элементов детского игрового комплекса',
  {
    quote:
      'Протирка поверхностей; 10 шт.; 7,92; 26 826,18; Затраты труда Рабочий ... 40; 664,15; 26 826,18',
  },
);

const improvementPlaygroundElementsWashSource = detailSource(
  'improvement',
  7,
  'позиция 1.2 / мытье поверхностей элементов детского игрового комплекса',
  {
    quote:
      'Мытье поверхностей; 10 шт.; 0,99; 3 675,45; Затраты труда Рабочий ... 6; 664,15; 3 675,45',
  },
);

const improvementPlaygroundElementsSnowSource = detailSource(
  'improvement',
  7,
  'позиция 1.3 / сметание снега с поверхностей',
  {
    quote:
      'Сметание снега с поверхностей и откидывание его в сторону; 100 м2; 33,00; 89 858,93; Затраты труда Рабочий ... 135; 664,15; 89 858,93',
  },
);

const improvementSandboxCareSource = detailSource(
  'improvement',
  8,
  'позиция 1.4 / уход за детскими песочницами',
  {
    quote:
      'Уход за детскими песочницами; 10 м2; 0,40; 53 010,45; Затраты труда 52 135,45; Песок мытый 1 категории 875,00',
  },
);

const improvementPlaygroundGroundSweepFirstSource = detailSource(
  'improvement',
  8,
  'позиция 2.1 / подметание детских площадок со сбором и удалением мусора',
  {
    quote:
      'Подметание детских площадок со сбором и удалением мусора; 100 м2; 18,00; 549 912,72; Затраты труда Рабочий ... 828; 664,15; 549 912,72',
  },
);

const improvementSportsElementsWipeSource = detailSource(
  'improvement',
  9,
  'позиция 3.1 / протирка поверхностей элементов спортивного комплекса',
  {
    quote:
      'Протирка поверхностей; 10 шт.; 6,72; 22 761,60; Затраты труда Рабочий ... 34; 664,15; 22 761,60',
  },
);

const improvementSportsElementsWashSource = detailSource(
  'improvement',
  9,
  'позиция 3.2 / мытье поверхностей элементов спортивного комплекса',
  {
    quote:
      'Мытье поверхностей; 10 шт.; 0,84; 3 118,56; Затраты труда Рабочий ... 5; 664,15; 3 118,56',
  },
);

const improvementWaterSurfaceTrashSource = detailSource(
  'improvement',
  10,
  'позиция 4.1 / сбор наплавного мусора с поверхности воды',
  {
    quote:
      'Сбор наплавного мусора с поверхности воды лодкой; 100 м2; 6,39; 365 743,67; Затраты труда 364 888,17; мешки для мусора 855,50',
  },
);

const improvementWaterVegetationSource = detailSource(
  'improvement',
  11,
  'позиция 4.2 / удаление водной растительности',
  {
    quote:
      'Удаление водной растительности (водоросли) лодкой с последующим сбором/вывозом; 1 м2; 212,90; 10 679,90; Затраты труда 4 241,90; мешки 6 438,00',
  },
);

const improvementFencePositionSource = detailSource(
  'improvement',
  11,
  'позиция 5.1 / замена поврежденных элементов периметрального ограждения',
  {
    quote:
      'Ремонт периметрального ограждения; Замена поврежденных элементов (2% от общего объема); п.м.; 248,60; 298 320,00',
  },
);

const improvementFenceMaterialSource = detailSource(
  'improvement',
  12,
  'позиция 5.1 / материал профнастила',
  {
    quote:
      'Профнастил оцинкованный (с учетом стоимости монтажа); м²; 248,60; 1200,00; 298 320,00; ИТОГО ПО ПОЗИЦИИ 298 320,00',
  },
);

const improvementPlaygroundGroundSweepSecondSource = detailSource(
  'improvement',
  12,
  'позиция 6.1 / повторное подметание детских площадок со сбором и удалением мусора',
  {
    quote:
      'Подметание детских площадок со сбором и удалением мусора; 100 м2; 18,00; 549 912,72; Затраты труда Рабочий ... 828; 664,15; 549 912,72',
  },
);

const improvementCurbstonePaintSource = detailSource(
  'improvement',
  13,
  'позиция 7.1 / окраска бетонных дорожных бордюров',
  {
    quote:
      'Окраска бетонных дорожных бордюров; 100 м2; 0,83; 19 914,30; Затраты труда 1 764,30; Краска для бордюров влагостойкая 18 150,00',
  },
);

const improvementPpeSource = detailSource(
  'improvement',
  14,
  'позиция 8.1 / средства охраны труда',
  {
    quote:
      'Костюм 7 150,00; Куртка 3 120,00; Жилет 1 560,00; Сапоги утепленные 1 820,00; Перчатки 1 820,00; Рукавицы 3 640,00; Сапоги резиновые 2 600,00; Мыло 1 809,60',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [improvementPpeCottonSuitResourceId],
        quantity: detailQuantity(1.3, 'шт.'),
        unit_price_rub: detailMoney(5_500),
        total_rub: detailMoney(7_150),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [improvementPpeInsulatedJacketResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: improvementRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(6_000),
        total_rub: detailMoney(3_120),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [improvementPpeSignalVestResourceId],
        quantity: detailQuantity(1.3, 'шт.'),
        unit_price_rub: detailMoney(1_200),
        total_rub: detailMoney(1_560),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [improvementPpeInsulatedBootsResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: improvementRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(3_500),
        total_rub: detailMoney(1_820),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [improvementPpePolymerGlovesResourceId],
        quantity: detailQuantity(5.2, 'шт.'),
        unit_price_rub: detailMoney(350),
        total_rub: detailMoney(1_820),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [improvementPpeInsulatedMittensResourceId],
        quantity: detailQuantity(5.2, 'шт.'),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(3_640),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [improvementPpeRubberBootsResourceId],
        quantity: detailQuantity(1.3, 'шт.'),
        unit_price_rub: detailMoney(2_000),
        total_rub: detailMoney(2_600),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [improvementPpeSoapResourceId],
        quantity: detailQuantity(15.6, 'шт.'),
        unit_price_rub: detailMoney(116),
        total_rub: detailMoney(1_809.6),
      }),
    ),
  },
);

const improvementToolsSource = detailSource(
  'improvement',
  14,
  'позиция 9.1 / износ оборудования и инструментов',
  {
    quote:
      'Ледоруб-топор 182,00; Метла 2 405,00; Лопата снегоуборочная 1 625,00; Лопата совковая 672,10; Тачка садовая 1 625,00; ИТОГО 6 509,10',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Ледоруб-топор с металлической ручкой',
        resource_ids: [improvementIceAxeResourceId],
        quantity: detailQuantity(0.3, 'шт.'),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(182),
      }),
      detailSourceQuoteItem({
        label: 'Метла полипропиленовая с черенком',
        resource_ids: [improvementBroomResourceId],
        quantity: detailQuantity(6.5, 'шт.'),
        unit_price_rub: detailMoney(370),
        total_rub: detailMoney(2_405),
      }),
      detailSourceQuoteItem({
        label: 'Лопата снегоуборочная оцинкованная',
        resource_ids: [improvementSnowShovelResourceId],
        quantity: detailQuantity(0.7, 'шт.'),
        unit_price_rub: detailMoney(2_500),
        total_rub: detailMoney(1_625),
      }),
      detailSourceQuoteItem({
        label: 'Лопата совковая',
        resource_ids: [improvementScoopShovelResourceId],
        quantity: detailQuantity(0.7, 'шт.'),
        unit_price_rub: detailMoney(1_034),
        total_rub: detailMoney(672.1),
      }),
      detailSourceQuoteItem({
        label: 'Тачка садовая',
        resource_ids: [improvementGardenWheelbarrowResourceId],
        quantity: detailQuantity(0.7, 'шт.'),
        unit_price_rub: detailMoney(2_500),
        total_rub: detailMoney(1_625),
      }),
    ),
  },
);

const improvementDocumentTotalsSource = detailSource(
  'improvement',
  15,
  'итоги локального ресурсного сметного расчета по благоустройству',
  {
    quote:
      'Итого по разделу ... 4 363 835,75; Основная зарплата 1 669 095,98; Материальные затраты 354 667,20; страховые взносы 504 066,99; общеэксплуатационные расходы 1 168 367,19; прибыль 667 638,39',
  },
);

const improvementDocumentVatSource = detailSource(
  'improvement',
  16,
  'НДС в локальном ресурсном сметном расчете по благоустройству',
  {
    quote: 'ВСЕГО по документу 4 363 835,75; НДС 5% 218 191,79',
  },
);

const improvementResourceStatementSource = detailSource(
  'improvement',
  17,
  'ресурсная ведомость по локальному ресурсному сметному расчету',
  {
    quote:
      'Рабочий по уборке территории 2513,1 664,15 1 669 095,98; Профнастил 248,6 1200,00 298 320,00; материалы всего по строкам ресурсной ведомости',
  },
);

const improvementCalculationSource = detailSource(
  'improvement',
  18,
  'калькуляция себестоимости услуг по благоустройству',
  {
    quote:
      'ИТОГО расходов 3 696 197; налог по УСН 100 146; прибыль 667 638; Доходов - всего 4 463 981',
  },
);

const improvementVatReconciliationNote =
  'Прямой НДС 218 191,79 в локальном расчете равен 5% от 4 363 835,75 до УСН; агрегированная смета сходится с НДС 5% от калькуляционных доходов 4 463 981.';
const improvementFenceMismatchReason =
  'Итоговая смета называет строку 4.2 «Текущий ремонт покрытия дорог, площадок», но improvement.pdf по близкой сумме показывает ремонт периметрального ограждения и материал «Профнастил оцинкованный». Нужно сверить первичный источник строки 4.2.';
const improvementFenceMismatchRefs = detailSourceRefs(
  improvementFinalRoadSurfaceSource,
  improvementProductionFenceSource,
  improvementFencePositionSource,
  improvementFenceMaterialSource,
);

const improvementObjectLaborResourceIds = [
  improvementPlaygroundElementsWipeLaborResourceId,
  improvementPlaygroundElementsWashLaborResourceId,
  improvementPlaygroundElementsSnowLaborResourceId,
  improvementSandboxCareLaborResourceId,
  improvementPlaygroundGroundSweepFirstLaborResourceId,
  improvementSportsElementsWipeLaborResourceId,
  improvementSportsElementsWashLaborResourceId,
  improvementWaterSurfaceTrashLaborResourceId,
  improvementWaterVegetationLaborResourceId,
  improvementPlaygroundGroundSweepSecondLaborResourceId,
  improvementCurbstonePaintLaborResourceId,
] as const;
const improvementObjectMaterialResourceIds = [
  improvementPpeCottonSuitResourceId,
  improvementPpeInsulatedJacketResourceId,
  improvementPpeSignalVestResourceId,
  improvementPpeInsulatedBootsResourceId,
  improvementPpePolymerGlovesResourceId,
  improvementPpeInsulatedMittensResourceId,
  improvementPpeRubberBootsResourceId,
  improvementPpeSoapResourceId,
  improvementSandboxSandResourceId,
  improvementTrashBagsResourceId,
  improvementCurbstonePaintResourceId,
  improvementIceAxeResourceId,
  improvementBroomResourceId,
  improvementSnowShovelResourceId,
  improvementScoopShovelResourceId,
  improvementGardenWheelbarrowResourceId,
] as const;
const improvementObjectsGrossResourceIds = [
  ...improvementObjectLaborResourceIds,
  ...improvementObjectMaterialResourceIds,
  improvementObjectsInsuranceResourceId,
  improvementObjectsOverheadResourceId,
  improvementObjectsProfitResourceId,
  improvementObjectsUsnResourceId,
  improvementObjectsVatResourceId,
] as const;
const improvementFenceGrossResourceIds = [
  improvementFenceProfileSheetResourceId,
  improvementFenceUsnResourceId,
  improvementFenceVatResourceId,
] as const;

export const improvementWorkItems = [
  detailWorkItem({
    id: 'improvement-objects-maintenance',
    title: 'Содержание объектов благоустройства',
    estimate_row_id: 'improvement-objects-maintenance',
    service_ids: [
      'year-round-common-area-repair',
      'summer-waterbody-cleaning',
      'summer-curbstone-painting',
    ],
    source_refs: detailSourceRefs(
      improvementFinalObjectsSource,
      improvementProductionObjectsSource,
      improvementDocumentTotalsSource,
    ),
    note: 'В локальном расчете improvement.pdf строка ремонта периметрального ограждения входит в общий раздел благоустройства; для сверки с estimate-2026 ее материалы вынесены в отдельную work item строку 4.2.',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'improvement-road-surface-repair',
    title: 'Текущий ремонт покрытия дорог и площадок',
    estimate_row_id: 'improvement-road-surface-repair',
    service_ids: ['year-round-perimeter-fence-repair'],
    source_refs: improvementFenceMismatchRefs,
    note: 'Название сохранено по агрегированной смете, но detail-источник описывает ремонт периметрального ограждения.',
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
] satisfies readonly EstimateDetailWorkItem[];

export const improvementResources = [
  detailResource({
    id: improvementPlaygroundElementsWipeLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: протирка элементов детского игрового комплекса',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(40.4, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(26_826.18),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementPlaygroundElementsWipeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPlaygroundElementsWashLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: мытье элементов детского игрового комплекса',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(5.5, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(3_675.45),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementPlaygroundElementsWashSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPlaygroundElementsSnowLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: сметание снега с элементов детского игрового комплекса',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(135.3, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(89_858.93),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementPlaygroundElementsSnowSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementSandboxCareLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title: 'Рабочий по уборке территории: уход за детскими песочницами',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(78.5, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(52_135.45),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementSandboxCareSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPlaygroundGroundSweepFirstLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: подметание детской площадки на грунтовом основании, позиция 2.1',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(828, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(549_912.72),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementPlaygroundGroundSweepFirstSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementSportsElementsWipeLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: протирка элементов спортивного комплекса',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(34.3, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(22_761.6),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementSportsElementsWipeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementSportsElementsWashLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: мытье элементов спортивного комплекса',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(4.7, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(3_118.56),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementSportsElementsWashSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementWaterSurfaceTrashLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: сбор наплавного мусора с поверхности воды',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(549.4, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(364_888.17),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementWaterSurfaceTrashSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementWaterVegetationLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title: 'Рабочий по уборке территории: удаление водной растительности',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(6.4, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(4_241.9),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementWaterVegetationSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPlaygroundGroundSweepSecondLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: подметание детской площадки на грунтовом основании, позиция 6.1',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(828, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(549_912.72),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementStaffSource,
      improvementPlaygroundGroundSweepSecondSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementCurbstonePaintLaborResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'labor',
    title: 'Рабочий по уборке территории: окраска бетонных дорожных бордюров',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(2.7, 'чел-час', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(1_764.3),
    source_refs: detailSourceRefs(
      improvementProductionCurbstonePpeToolsSource,
      improvementStaffSource,
      improvementCurbstonePaintSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpeCottonSuitResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Костюм хлопчатобумажный для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(1.3, 'шт.'),
    unit_price_rub: detailMoney(5_500),
    total_rub: detailMoney(7_150),
    source_refs: detailSourceRefs(
      improvementProductionCurbstonePpeToolsSource,
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpeInsulatedJacketResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Куртка на утепляющей прокладке для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(3_120),
    source_refs: detailSourceRefs(
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpeSignalVestResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Жилет сигнальный для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(1.3, 'шт.'),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(1_560),
    source_refs: detailSourceRefs(
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpeInsulatedBootsResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Сапоги утепленные для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(3_500),
    total_rub: detailMoney(1_820),
    source_refs: detailSourceRefs(
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpePolymerGlovesResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Перчатки с полимерным покрытием для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(5.2, 'шт.'),
    unit_price_rub: detailMoney(350),
    total_rub: detailMoney(1_820),
    source_refs: detailSourceRefs(
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpeInsulatedMittensResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Рукавицы утепленные для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(5.2, 'шт.'),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(3_640),
    source_refs: detailSourceRefs(
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpeRubberBootsResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Сапоги резиновые для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(1.3, 'шт.'),
    unit_price_rub: detailMoney(2_000),
    total_rub: detailMoney(2_600),
    source_refs: detailSourceRefs(
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementPpeSoapResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Мыло туалетное для работ по благоустройству',
    cost_bucket: 'materials',
    quantity: detailQuantity(15.6, 'шт.'),
    unit_price_rub: detailMoney(116),
    total_rub: detailMoney(1_809.6),
    source_refs: detailSourceRefs(
      improvementPpeSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementSandboxSandResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Песок мытый 1 категории для детских песочниц',
    cost_bucket: 'materials',
    quantity: detailQuantity(1.4, 'м³'),
    unit_price_rub: detailMoney(625),
    total_rub: detailMoney(875),
    source_refs: detailSourceRefs(
      improvementProductionObjectsSource,
      improvementSandboxCareSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementTrashBagsResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Мешки для мусора ПВД 70*110, 120 литров, 50 мкм, черные',
    cost_bucket: 'materials',
    quantity: detailQuantity(1_006, 'шт.'),
    unit_price_rub: detailMoney(7.25),
    total_rub: detailMoney(7_293.5),
    source_refs: detailSourceRefs(
      improvementWaterSurfaceTrashSource,
      improvementWaterVegetationSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementCurbstonePaintResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Краска для бордюров влагостойкая',
    cost_bucket: 'materials',
    quantity: detailQuantity(33, 'кг.'),
    unit_price_rub: detailMoney(550),
    total_rub: detailMoney(18_150),
    source_refs: detailSourceRefs(
      improvementProductionCurbstonePpeToolsSource,
      improvementCurbstonePaintSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementIceAxeResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Ледоруб-топор с металлической ручкой',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.3, 'шт.', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(182),
    source_refs: detailSourceRefs(
      improvementToolsSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementBroomResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Метла полипропиленовая с черенком',
    cost_bucket: 'materials',
    quantity: detailQuantity(6.5, 'шт.'),
    unit_price_rub: detailMoney(370),
    total_rub: detailMoney(2_405),
    source_refs: detailSourceRefs(
      improvementToolsSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementSnowShovelResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Лопата снегоуборочная оцинкованная',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.7, 'шт.', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(2_500),
    total_rub: detailMoney(1_625),
    source_refs: detailSourceRefs(
      improvementToolsSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementScoopShovelResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Лопата совковая',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.7, 'шт.', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_034),
    total_rub: detailMoney(672.1),
    source_refs: detailSourceRefs(
      improvementToolsSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementGardenWheelbarrowResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'material',
    title: 'Тачка садовая',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.7, 'шт.', {
      note: improvementRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(2_500),
    total_rub: detailMoney(1_625),
    source_refs: detailSourceRefs(
      improvementToolsSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementObjectsInsuranceResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'other_cost',
    title: 'Страховые взносы по содержанию объектов благоустройства',
    cost_bucket: 'insurance',
    total_rub: detailMoney(504_066.99),
    source_refs: detailSourceRefs(improvementDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementObjectsOverheadResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'other_cost',
    title:
      'Общеэксплуатационные расходы по содержанию объектов благоустройства',
    cost_bucket: 'overhead',
    total_rub: detailMoney(1_168_367.19),
    source_refs: detailSourceRefs(improvementDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementObjectsProfitResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'other_cost',
    title: 'Прибыль по содержанию объектов благоустройства',
    cost_bucket: 'profit',
    total_rub: detailMoney(667_638.39),
    source_refs: detailSourceRefs(improvementDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: improvementObjectsUsnResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по содержанию объектов благоустройства',
    cost_bucket: 'usn',
    total_rub: detailMoney(93_299.49, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      improvementDocumentTotalsSource,
      improvementCalculationSource,
    ),
    note: 'В improvement.pdf УСН показан только общей суммой по услуге, без распределения между строками 4.1 и 4.2.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: improvementObjectsVatResourceId,
    work_item_id: 'improvement-objects-maintenance',
    estimate_row_id: 'improvement-objects-maintenance',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по содержанию объектов благоустройства',
    cost_bucket: 'vat',
    total_rub: detailMoney(207_940.76, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      improvementDocumentVatSource,
      improvementCalculationSource,
    ),
    note: improvementVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailResource({
    id: improvementFenceProfileSheetResourceId,
    work_item_id: 'improvement-road-surface-repair',
    estimate_row_id: 'improvement-road-surface-repair',
    kind: 'material',
    title:
      'Профнастил оцинкованный для замены элементов периметрального ограждения',
    cost_bucket: 'materials',
    quantity: detailQuantity(248.6, 'м²'),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(298_320),
    source_refs: improvementFenceMismatchRefs,
    note: 'Ресурс прямо указывает на ограждение и профнастил с монтажом; в improvement.pdf нет материала для ремонта дорожного покрытия или площадок в этой сумме.',
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
  detailResource({
    id: improvementFenceUsnResourceId,
    work_item_id: 'improvement-road-surface-repair',
    estimate_row_id: 'improvement-road-surface-repair',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по спорной строке ремонта',
    cost_bucket: 'usn',
    total_rub: detailMoney(6_845.71, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      improvementFinalRoadSurfaceSource,
      improvementFenceMaterialSource,
      improvementCalculationSource,
    ),
    note: 'Начисление рассчитано для сверки с агрегированной сметой; detail-источник строки описывает ограждение, а не дорожное покрытие.',
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
  detailResource({
    id: improvementFenceVatResourceId,
    work_item_id: 'improvement-road-surface-repair',
    estimate_row_id: 'improvement-road-surface-repair',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по спорной строке ремонта',
    cost_bucket: 'vat',
    total_rub: detailMoney(15_258.29, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      improvementFinalRoadSurfaceSource,
      improvementDocumentVatSource,
      improvementCalculationSource,
    ),
    note: improvementVatReconciliationNote,
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
] satisfies readonly EstimateDetailResource[];

export const improvementControlTotals = [
  detailControlTotal({
    id: 'improvement-objects-primary-salary',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(1_669_095.98),
    tolerance_rub: 0.01,
    resource_ids: improvementObjectLaborResourceIds,
    source_refs: detailSourceRefs(
      improvementDocumentHeaderSource,
      improvementDocumentTotalsSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'improvement-objects-materials',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(56_347.2, {
      note: 'материалы локального расчета без спорной строки ограждения',
    }),
    tolerance_rub: 0.01,
    resource_ids: improvementObjectMaterialResourceIds,
    source_refs: detailSourceRefs(
      improvementDocumentTotalsSource,
      improvementResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'improvement-objects-insurance',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(504_066.99),
    tolerance_rub: 0.01,
    resource_ids: [improvementObjectsInsuranceResourceId],
    source_refs: detailSourceRefs(improvementDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'improvement-objects-overhead',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(1_168_367.19),
    tolerance_rub: 0.01,
    resource_ids: [improvementObjectsOverheadResourceId],
    source_refs: detailSourceRefs(improvementDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'improvement-objects-profit',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(667_638.39),
    tolerance_rub: 0.01,
    resource_ids: [improvementObjectsProfitResourceId],
    source_refs: detailSourceRefs(improvementDocumentTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'improvement-objects-usn',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(93_299.49),
    tolerance_rub: 0.01,
    resource_ids: [improvementObjectsUsnResourceId],
    source_refs: detailSourceRefs(
      improvementDocumentTotalsSource,
      improvementCalculationSource,
    ),
    note: 'УСН распределен расчетно, потому что improvement.pdf показывает налог только общей суммой 100 146.',
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'improvement-objects-vat',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(207_940.76),
    tolerance_rub: 0.01,
    resource_ids: [improvementObjectsVatResourceId],
    source_refs: detailSourceRefs(
      improvementDocumentVatSource,
      improvementCalculationSource,
    ),
    note: improvementVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'improvement-objects-gross',
    estimate_row_id: 'improvement-objects-maintenance',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(4_366_756),
    tolerance_rub: 1,
    resource_ids: improvementObjectsGrossResourceIds,
    source_refs: detailSourceRefs(
      improvementFinalObjectsSource,
      improvementDocumentTotalsSource,
      improvementDocumentVatSource,
      improvementCalculationSource,
    ),
    note: improvementVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'improvement-fence-repair-materials',
    estimate_row_id: 'improvement-road-surface-repair',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(298_320),
    tolerance_rub: 0.01,
    resource_ids: [improvementFenceProfileSheetResourceId],
    source_refs: improvementFenceMismatchRefs,
    note: 'Сумма сходится с материалами строки 4.2 estimate-2026, но предмет работ в detail-источнике другой.',
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
  detailControlTotal({
    id: 'improvement-fence-repair-usn',
    estimate_row_id: 'improvement-road-surface-repair',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(6_845.71),
    tolerance_rub: 0.01,
    resource_ids: [improvementFenceUsnResourceId],
    source_refs: detailSourceRefs(
      improvementFinalRoadSurfaceSource,
      improvementFenceMaterialSource,
      improvementCalculationSource,
    ),
    note: 'УСН расчетный: improvement.pdf не распределяет общий налог 100 146 между строками.',
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
  detailControlTotal({
    id: 'improvement-fence-repair-vat',
    estimate_row_id: 'improvement-road-surface-repair',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(15_258.29),
    tolerance_rub: 0.01,
    resource_ids: [improvementFenceVatResourceId],
    source_refs: detailSourceRefs(
      improvementFinalRoadSurfaceSource,
      improvementDocumentVatSource,
      improvementCalculationSource,
    ),
    note: improvementVatReconciliationNote,
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
  detailControlTotal({
    id: 'improvement-fence-repair-gross',
    estimate_row_id: 'improvement-road-surface-repair',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(320_424),
    tolerance_rub: 1,
    resource_ids: improvementFenceGrossResourceIds,
    source_refs: improvementFenceMismatchRefs,
    note: 'Gross сходится с итоговой сметой, но detail-ресурс указывает на периметральное ограждение, а не на покрытие дорог или площадок.',
    ...detailNeedsCheckStatus(
      improvementFenceMismatchReason,
      improvementFenceMismatchRefs,
    ),
  }),
] satisfies readonly EstimateDetailControlTotalInput[];
