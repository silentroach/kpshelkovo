import type {
  EstimateDetailControlTotalInput,
  EstimateDetailResource,
  EstimateDetailWorkItem,
} from '@/lib/reglament/detail-schema';

import {
  detailControlTotal,
  detailMoney,
  detailQuantity,
  detailResource,
  detailSource,
  detailSourceQuoteItem,
  detailSourceQuoteItems,
  detailSourceRefs,
  detailStatus,
  detailWorkItem,
} from './shared';

const landscapingMowingLaborResourceId = 'landscaping-mowing-trimmer-labor';
const landscapingMowingTrimmerMachineResourceId =
  'landscaping-mowing-trimmer-machine';
const landscapingMowingPpeCottonSuitResourceId =
  'landscaping-mowing-ppe-cotton-suit';
const landscapingMowingPpeInsulatedJacketResourceId =
  'landscaping-mowing-ppe-insulated-jacket';
const landscapingMowingPpeSignalVestResourceId =
  'landscaping-mowing-ppe-signal-vest';
const landscapingMowingPpeInsulatedBootsResourceId =
  'landscaping-mowing-ppe-insulated-boots';
const landscapingMowingPpePolymerGlovesResourceId =
  'landscaping-mowing-ppe-polymer-gloves';
const landscapingMowingPpeInsulatedMittensResourceId =
  'landscaping-mowing-ppe-insulated-mittens';
const landscapingMowingPpeRubberBootsResourceId =
  'landscaping-mowing-ppe-rubber-boots';
const landscapingMowingPpeSoapResourceId = 'landscaping-mowing-ppe-soap';
const landscapingMowingInsuranceResourceId = 'landscaping-mowing-insurance';
const landscapingMowingOverheadResourceId = 'landscaping-mowing-overhead';
const landscapingMowingProfitResourceId = 'landscaping-mowing-profit';
const landscapingMowingUsnResourceId = 'landscaping-mowing-usn-derived';
const landscapingMowingVatResourceId = 'landscaping-mowing-vat-derived';
const landscapingTreesFertilizerLaborResourceId =
  'landscaping-trees-fertilizer-labor';
const landscapingTreesWaterMachinistResourceId =
  'landscaping-trees-water-machinist-labor';
const landscapingTreesWaterTractorResourceId =
  'landscaping-trees-water-tractor-machine';
const landscapingTreesWaterTankResourceId =
  'landscaping-trees-water-tank-machine';
const landscapingTreesLooseningLaborResourceId =
  'landscaping-trees-loosening-labor';
const landscapingTreesConiferPruningLaborResourceId =
  'landscaping-trees-conifer-pruning-labor';
const landscapingTreesBranchCollectionLaborResourceId =
  'landscaping-trees-branch-collection-labor';
const landscapingTreesPlantWasteLoadingLaborResourceId =
  'landscaping-trees-plant-waste-loading-labor';
const landscapingTreesWeedingLaborResourceId =
  'landscaping-trees-weeding-labor';
const landscapingTreesSnowLoadLaborResourceId =
  'landscaping-trees-snow-load-labor';
const landscapingTreesOmuFertilizerResourceId =
  'landscaping-trees-omu-fertilizer';
const landscapingTreesAzofoskaResourceId = 'landscaping-trees-azofoska';
const landscapingTreesWaterResourceId = 'landscaping-trees-water';
const landscapingTreesPpeCottonSuitResourceId =
  'landscaping-trees-ppe-cotton-suit';
const landscapingTreesPpeInsulatedJacketResourceId =
  'landscaping-trees-ppe-insulated-jacket';
const landscapingTreesPpeSignalVestResourceId =
  'landscaping-trees-ppe-signal-vest';
const landscapingTreesPpeInsulatedBootsResourceId =
  'landscaping-trees-ppe-insulated-boots';
const landscapingTreesPpePolymerGlovesResourceId =
  'landscaping-trees-ppe-polymer-gloves';
const landscapingTreesPpeInsulatedMittensResourceId =
  'landscaping-trees-ppe-insulated-mittens';
const landscapingTreesPpeRubberBootsResourceId =
  'landscaping-trees-ppe-rubber-boots';
const landscapingTreesPpeSoapResourceId = 'landscaping-trees-ppe-soap';
const landscapingTreesToolSetResourceId = 'landscaping-trees-tool-set';
const landscapingTreesBatteryPrunerResourceId =
  'landscaping-trees-battery-pruner';
const landscapingTreesGardenSawResourceId = 'landscaping-trees-garden-saw';
const landscapingTreesPolePrunerResourceId = 'landscaping-trees-pole-pruner';
const landscapingTreesLopperResourceId = 'landscaping-trees-lopper';
const landscapingTreesLadderResourceId = 'landscaping-trees-ladder';
const landscapingTreesInsuranceResourceId = 'landscaping-trees-insurance';
const landscapingTreesOverheadResourceId = 'landscaping-trees-overhead';
const landscapingTreesProfitResourceId = 'landscaping-trees-profit';
const landscapingTreesUsnResourceId = 'landscaping-trees-usn-derived';
const landscapingTreesVatResourceId = 'landscaping-trees-vat-derived';
const landscapingTicksTreatmentContractorResourceId =
  'landscaping-ticks-treatment-contractor';
const landscapingHogweedContractorResourceId = 'landscaping-hogweed-contractor';
const landscapingTicksHogweedUsnResourceId =
  'landscaping-ticks-hogweed-usn-derived';
const landscapingTicksHogweedVatResourceId =
  'landscaping-ticks-hogweed-vat-derived';
const landscapingForestLaborResourceId = 'landscaping-forest-care-labor';
const landscapingForestInsuranceResourceId = 'landscaping-forest-insurance';
const landscapingForestOverheadResourceId = 'landscaping-forest-overhead';
const landscapingForestProfitResourceId = 'landscaping-forest-profit';
const landscapingForestUsnResourceId = 'landscaping-forest-usn-derived';
const landscapingForestVatResourceId = 'landscaping-forest-vat-derived';

const landscapingRoundedQuantityNote =
  'количество в PDF округлено; итог сохранен по исходной строке';

const landscapingProductionMowingSource = detailSource(
  'landscaping',
  1,
  'производственная программа / кошение травостоя вдоль открытых ливневых траншей',
  {
    quote:
      'Кошение травостоя вдоль открытых ливневых траншей; м²; 98136; V-X; кратность 15; объем работ 14 720,40; трудозатраты 1030,4; Триммер бензиновый 1030',
  },
);

const landscapingProductionTreesFertilizerSource = detailSource(
  'landscaping',
  1,
  'производственная программа / внесение органических удобрений',
  {
    quote:
      'Хвойные деревья 485; Внесение органических удобрений ... IV; кратность 1; объем 0,10; трудозатраты 0,04; ОМУ ... 38,8 кг; Азофоска ... 38,8 кг',
  },
);

const landscapingProductionTreesWaterSource = detailSource(
  'landscaping',
  1,
  'производственная программа / полив деревьев водой',
  {
    quote:
      'Полив деревьев водой в приствольные лунки механизированным способом; V-VIII; кратность 20; объем 4,9; Трактор МТЗ 80 ... 163,9; Вода 291,00 м³',
  },
);

const landscapingProductionTreesWaterEquipmentSource = detailSource(
  'landscaping',
  2,
  'производственная программа / поливомоечное оборудование',
  {
    quote: 'Оборудование поливомоечное ОПМ-5,0 (бочка); 163,9 маш-час',
  },
);

const landscapingProductionTreesLooseningSource = detailSource(
  'landscaping',
  2,
  'производственная программа / рыхление приствольных лунок',
  {
    quote:
      'Рыхление приствольных лунок лиственных деревьев и удаление сорной растительности; шт; IV-VIII; кратность 2; объем 970,00; трудозатраты 455,9',
  },
);

const landscapingProductionTreesConiferSource = detailSource(
  'landscaping',
  3,
  'производственная программа / удаление старой хвои',
  {
    quote:
      'Вырезка сухих ветвей и мелкой суши; 72,75; трудозатраты 5,8; Сбор срезанных ветвей; 2,43; трудозатраты 1,0; Погрузка ... 1,94; трудозатраты 1,3',
  },
);

const landscapingProductionTreesWeedingSnowSource = detailSource(
  'landscaping',
  4,
  'производственная программа / прополка и снижение снеговой нагрузки',
  {
    quote:
      'Прополка приствольных лунок ... V-X; кратность 5; объем 4,85; трудозатраты 137,5; Стряхивание снега ... I-II; кратность 3; объем 4,9; трудозатраты 24,7',
  },
);

const landscapingProductionTreesPpeSource = detailSource(
  'landscaping',
  4,
  'производственная программа / СИЗ для ухода за деревьями',
  {
    quote:
      'Средства охраны труда; Костюм хлопчатобумажный 0,5; Куртка 0,21; Жилет 0,5; Сапоги утепленные 0,21; Перчатки 2,1; Рукавицы 2,1; Сапоги резиновые 0,5; Мыло 6,4',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [landscapingTreesPpeCottonSuitResourceId],
        quantity: detailQuantity(0.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [landscapingTreesPpeInsulatedJacketResourceId],
        quantity: detailQuantity(0.21, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [landscapingTreesPpeSignalVestResourceId],
        quantity: detailQuantity(0.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [landscapingTreesPpeInsulatedBootsResourceId],
        quantity: detailQuantity(0.21, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [landscapingTreesPpePolymerGlovesResourceId],
        quantity: detailQuantity(2.1, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [landscapingTreesPpeInsulatedMittensResourceId],
        quantity: detailQuantity(2.1, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [landscapingTreesPpeRubberBootsResourceId],
        quantity: detailQuantity(0.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [landscapingTreesPpeSoapResourceId],
        quantity: detailQuantity(6.4, 'шт.'),
      }),
    ),
  },
);

const landscapingProductionTreesInventorySource = detailSource(
  'landscaping',
  5,
  'производственная программа / износ оборудования и инструментов',
  {
    quote:
      'Износ оборудования, инструментов; Набор садовых инструментов; Секатор-кусторез аккумуляторный; Садовая ножовка; Высоторез; Сучкорез; Стремянка трансформер',
  },
);

const landscapingProductionTicksHogweedSource = detailSource(
  'landscaping',
  5,
  'производственная программа / обработка от клещей и борьба с борщевиком',
  {
    quote:
      'Обработка от клещей; V-X; кратность 1; услуга сторонней организации 34200,00; Борьба с борщевиком; V-X; кратность 3; услуга сторонней организации 5826000,00',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Услуги сторонней организации: обработка от клещей',
        resource_ids: [landscapingTicksTreatmentContractorResourceId],
        quantity: detailQuantity(1, 'обработка'),
        unit_price_rub: detailMoney(34_200),
        total_rub: detailMoney(34_200),
      }),
      detailSourceQuoteItem({
        label: 'Услуги сторонней организации: борьба с борщевиком',
        resource_ids: [landscapingHogweedContractorResourceId],
        quantity: detailQuantity(1, 'обработка'),
        unit_price_rub: detailMoney(5_826_000),
        total_rub: detailMoney(5_826_000),
      }),
    ),
  },
);

const landscapingProductionForestSource = detailSource(
  'landscaping',
  6,
  'производственная программа / уход за лесом',
  {
    quote:
      'Уход за лесом; м²; 129606; Сбор валежника; 10000 м²; V-X; кратность 1; объем 13,0; трудозатраты 259,2',
  },
);

const landscapingStaffSource = detailSource(
  'landscaping',
  7,
  'нормативное штатное расписание по озеленению',
  {
    quote:
      'Рабочий по уборке территории ... 0,95 ... 664,15; Машинист 0,08 ... 934,32',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Рабочий по уборке территории',
        quantity: detailQuantity(0.95, 'чел.'),
        unit_price_rub: detailMoney(664.15),
      }),
      detailSourceQuoteItem({
        label: 'Машинист',
        quantity: detailQuantity(0.08, 'чел.'),
        unit_price_rub: detailMoney(934.32),
      }),
    ),
  },
);

const landscapingMowingLaborSource = detailSource(
  'landscaping',
  8,
  'позиция 1.1 / кошение травостоя при помощи бензиновых триммеров',
  {
    quote:
      'Кошение травостоя при помощи бензиновых триммеров; 100 м2; 14720,40; 746 147,26; Затраты труда Рабочий ... 1030; 664,15; 684 354,43',
  },
);

const landscapingMowingMachinePpeSource = detailSource(
  'landscaping',
  9,
  'позиция 1.1-2.1 / триммер и средства охраны труда',
  {
    quote:
      'Триммер бензиновый; маш-час; 1030; 59,97; 61 792,83; ИТОГО ПО ПОЗИЦИИ 1 705 612,17; Средства охраны труда ... 9 046,00',
  },
);

const landscapingMowingTotalsSource = detailSource(
  'landscaping',
  10,
  'итого по разделу кошения травостоя',
  {
    quote:
      'Итого по разделу ... 1 714 658,17; Машины 61 792,83; Зарплата машинистов 684 354,43; Материальные затраты 9 046,00',
  },
);

const landscapingTreesFertilizerSource = detailSource(
  'landscaping',
  10,
  'позиция 3.1 / внесение органических удобрений',
  {
    quote:
      'Внесение органических удобрений ... 0,10; 11 277,77; Затраты труда Рабочий ... 0,039; 664,15; 25,77',
  },
);

const landscapingTreesFertilizerMaterialsSource = detailSource(
  'landscaping',
  11,
  'позиция 3.1 / материалы удобрений',
  {
    quote:
      'ОМУ "Универсал" ... кг. 39; 170,00; 6 596,00; Азофоска ... кг. 39; 120,00; 4 656,00; ИТОГО ПО ПОЗИЦИИ 11 313,90',
  },
);

const landscapingTreesWaterSource = detailSource(
  'landscaping',
  11,
  'позиция 4.1 / полив деревьев механизированным способом',
  {
    quote:
      'Полив деревьев водой ... 4,85; 416 842,84; Затраты труда Машинист; 164; 934,32; 153 163,08; Трактор МТЗ 80 ... 241 964,04; ОПМ-5,0 ... 17 769,76',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Машинист',
        resource_ids: [landscapingTreesWaterMachinistResourceId],
        quantity: detailQuantity(164, 'чел-час', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(934.32),
        total_rub: detailMoney(153_163.08),
      }),
      detailSourceQuoteItem({
        label: 'Трактор МТЗ 80',
        resource_ids: [landscapingTreesWaterTractorResourceId],
        quantity: detailQuantity(164, 'маш-час', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(1_476.02),
        total_rub: detailMoney(241_964.04),
      }),
      detailSourceQuoteItem({
        label: 'ОПМ-5,0',
        resource_ids: [landscapingTreesWaterTankResourceId],
        quantity: detailQuantity(164, 'маш-час', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(108.4),
        total_rub: detailMoney(17_769.76),
      }),
    ),
  },
);

const landscapingTreesWaterTotalsSource = detailSource(
  'landscaping',
  12,
  'позиция 4.1 / вода и итог полива',
  {
    quote: 'Вода; м³; 291; 13,56; 3 945,96; ИТОГО ПО ПОЗИЦИИ 631 577,48',
  },
);

const landscapingTreesLooseningSource = detailSource(
  'landscaping',
  12,
  'позиция 5.1 / рыхление приствольных лунок',
  {
    quote:
      'Рыхление приствольных лунок лиственных деревьев ... 970,00; 302 784,07; Затраты труда Рабочий ... 456; 664,15; 302 784,07; ИТОГО ПО ПОЗИЦИИ 727 287,34',
  },
);

const landscapingTreesConiferPruningSource = detailSource(
  'landscaping',
  13,
  'позиция 6.1 / вырезка сухих ветвей и мелкой суши',
  {
    quote:
      'Вырезка сухих ветвей и мелкой суши; 72,75; 3 865,33; Затраты труда Рабочий ... 6; 664,15; 3 865,33; ИТОГО ПО ПОЗИЦИИ 9 284,52',
  },
);

const landscapingTreesBranchCollectionSource = detailSource(
  'landscaping',
  13,
  'позиция 6.2 / сбор срезанных ветвей',
  {
    quote:
      'Сбор срезанных ветвей; 100 м2; 2,43; 644,22; Затраты труда Рабочий ... 1; 664,15; 644,22; ИТОГО ПО ПОЗИЦИИ 1 547,41',
  },
);

const landscapingTreesPlantWasteLoadingSource = detailSource(
  'landscaping',
  14,
  'позиция 6.3 / погрузка растительных остатков',
  {
    quote:
      'Погрузка и разгрузка растительных остатков ... м3; 1,94; 837,49; Затраты труда Рабочий ... 1; 664,15; 837,49; ИТОГО ПО ПОЗИЦИИ 2 011,65',
  },
);

const landscapingTreesWeedingSource = detailSource(
  'landscaping',
  14,
  'позиция 7.1 / прополка приствольных кругов',
  {
    quote:
      'Прополка приствольных лунок ... 100 м2; 4,85; 91 318,39; Затраты труда Рабочий ... 137; 664,15; 91 318,39; ИТОГО ПО ПОЗИЦИИ 219 346,77',
  },
);

const landscapingTreesSnowLoadSource = detailSource(
  'landscaping',
  15,
  'позиция 8.1 / снижение снеговой нагрузки',
  {
    quote:
      'Стряхивание снега с ветвей ... 4,85; 16 427,65; Затраты труда Рабочий ... 25; 664,15; 16 427,65; ИТОГО ПО ПОЗИЦИИ 39 459,21',
  },
);

const landscapingTreesPpeStartSource = detailSource(
  'landscaping',
  15,
  'позиция 9.1 / средства охраны труда для ухода за деревьями, начало',
  {
    quote:
      'Средства охраны труда ... 9 588,76; Костюм 2 915,00; Куртка 1 272,00; Жилет 636,00; Сапоги утепленные 742,00',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [landscapingTreesPpeCottonSuitResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(5_500),
        total_rub: detailMoney(2_915),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [landscapingTreesPpeInsulatedJacketResourceId],
        quantity: detailQuantity(0.21, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(6_000),
        total_rub: detailMoney(1_272),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [landscapingTreesPpeSignalVestResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(1_200),
        total_rub: detailMoney(636),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [landscapingTreesPpeInsulatedBootsResourceId],
        quantity: detailQuantity(0.2, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(3_500),
        total_rub: detailMoney(742),
      }),
    ),
  },
);

const landscapingTreesPpeSource = detailSource(
  'landscaping',
  16,
  'позиция 9.1 / средства охраны труда для ухода за деревьями, окончание',
  {
    quote:
      'Перчатки 742,00; Рукавицы 1 484,00; Сапоги резиновые 1 060,00; Мыло 737,76; ИТОГО ПО ПОЗИЦИИ 9 588,76',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [landscapingTreesPpePolymerGlovesResourceId],
        quantity: detailQuantity(2.1, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(350),
        total_rub: detailMoney(742),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [landscapingTreesPpeInsulatedMittensResourceId],
        quantity: detailQuantity(2.1, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(1_484),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [landscapingTreesPpeRubberBootsResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(2_000),
        total_rub: detailMoney(1_060),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [landscapingTreesPpeSoapResourceId],
        quantity: detailQuantity(6.4, 'шт.', {
          note: landscapingRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(116),
        total_rub: detailMoney(737.76),
      }),
    ),
  },
);

const landscapingTreesInventorySource = detailSource(
  'landscaping',
  16,
  'позиция 10.1 / износ оборудования и инструментов',
  {
    quote:
      'Износ оборудования, инструментов ... 6 178,95; Набор садовых инструментов 222,75; Секатор-кусторез аккумуляторный 1 620,00; Садовая ножовка 178,20; Высоторез 1 782,00; Сучкорез 891,00',
  },
);

const landscapingTreesInventoryLadderSource = detailSource(
  'landscaping',
  17,
  'позиция 10.1 / стремянка и итог износа оборудования',
  {
    quote:
      'Стремянка трансформер; шт.; 0,1; 10000,00; 1 485,00; ИТОГО ПО ПОЗИЦИИ 6 178,95',
  },
);

const landscapingTreesTotalsSource = detailSource(
  'landscaping',
  17,
  'итого по разделу ухода за деревьями и кустарниками',
  {
    quote:
      'Итого по разделу ... 1 657 595,98; Основная зарплата 415 902,91; Машины 259 733,80; Зарплата машинистов 153 163,08; Материальные затраты 30 965,67',
  },
);

const landscapingTicksTreatmentSource = detailSource(
  'landscaping',
  17,
  'позиция 11.1 / акарицидная обработка',
  {
    quote:
      'Обработка от клещей; услуга; 1,00; 34 200,00; Договорная цена; кол-во обработок 1,0; 34200,00',
  },
);

const landscapingHogweedSource = detailSource(
  'landscaping',
  18,
  'позиция 12.1 / борьба с борщевиком',
  {
    quote:
      'Борьба с борщевиком; услуга; 1,00; 5 826 000,00; Договорная цена; кол-во обработок 1,0; 5826000,00; ИТОГО ПО ПОЗИЦИИ 5 826 000,00',
  },
);

const landscapingTicksHogweedTotalsSource = detailSource(
  'landscaping',
  19,
  'итого по услуге обработки территорий от клещей и борьбы с борщевиком',
  {
    quote:
      'Итого по услуге ... 5 860 200,00; Основная зарплата 0,00; Машины 0,00; Сторонние организации 5 860 200,00; Материальные затраты 0,00',
  },
);

const landscapingForestSource = detailSource(
  'landscaping',
  19,
  'позиция 13.1 / очистка леса от захламленности',
  {
    quote:
      'Сбор валежника; 10000 м²; 12,96; 172 154,56; Затраты труда Рабочий ... 259,212; 664,15; 172 154,56; ИТОГО ПО ПОЗИЦИИ 413 515,26',
  },
);

const landscapingDocumentTotalsSource = detailSource(
  'landscaping',
  20,
  'итоги локального ресурсного сметного расчета по озеленению',
  {
    quote:
      'Итого по услуге «Озеленение территории» 9 645 969,41; Основная зарплата 588 057,47; Машины 321 526,62; Зарплата машинистов 837 517,51; Сторонние организации 5 860 200,00; Материальные затраты 40 011,67; НДС 5% 482 298,47',
  },
);

const landscapingResourceStatementSource = detailSource(
  'landscaping',
  21,
  'ресурсная ведомость по локальному ресурсному сметному расчету',
  {
    quote:
      'Рабочий ... 1915,9 664,15 1 272 411,90; Машинист 163,9 934,32 153 163,08; Трактор МТЗ 80 ... 241 964,04; ОПМ-5,0 ... 17 769,76; Триммер бензиновый ... 61 792,83; Вода 291,0 13,56 3 945,96',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Рабочий',
        quantity: detailQuantity(1_915.9, 'чел-час'),
        unit_price_rub: detailMoney(664.15),
        total_rub: detailMoney(1_272_411.9),
      }),
      detailSourceQuoteItem({
        label: 'Машинист',
        resource_ids: [landscapingTreesWaterMachinistResourceId],
        quantity: detailQuantity(163.9, 'чел-час'),
        unit_price_rub: detailMoney(934.32),
        total_rub: detailMoney(153_163.08),
      }),
      detailSourceQuoteItem({
        label: 'Трактор МТЗ 80',
        resource_ids: [landscapingTreesWaterTractorResourceId],
        quantity: detailQuantity(163.9, 'маш.-час'),
        unit_price_rub: detailMoney(1_476.02),
        total_rub: detailMoney(241_964.04),
      }),
      detailSourceQuoteItem({
        label: 'ОПМ-5,0',
        resource_ids: [landscapingTreesWaterTankResourceId],
        quantity: detailQuantity(163.9, 'маш.-час'),
        unit_price_rub: detailMoney(108.4),
        total_rub: detailMoney(17_769.76),
      }),
      detailSourceQuoteItem({
        label: 'Триммер бензиновый',
        resource_ids: [landscapingMowingTrimmerMachineResourceId],
        quantity: detailQuantity(1_030.4, 'маш.-час'),
        unit_price_rub: detailMoney(59.97),
        total_rub: detailMoney(61_792.83),
      }),
      detailSourceQuoteItem({
        label: 'Вода',
        resource_ids: [landscapingTreesWaterResourceId],
        quantity: detailQuantity(291, 'м³'),
        unit_price_rub: detailMoney(13.56),
        total_rub: detailMoney(3_945.96),
      }),
    ),
  },
);

const landscapingCalculationSource = detailSource(
  'landscaping',
  22,
  'калькуляция себестоимости услуг по озеленению',
  {
    quote:
      'ИТОГО расходов 9 075 740; налог по УСН 85 534; прибыль ... 570 230; Доходов - всего 9 731 505',
  },
);

const landscapingVatReconciliationNote =
  'Прямой НДС 482 298,47 в локальном расчете равен 5% от 9 645 969,41 до УСН; для сверки с агрегированной сметой 10 218 079 НДС оставлен расчетным от строковых итогов с учетом УСН и округлений.';

const landscapingMowingMaterialResourceIds = [
  landscapingMowingPpeCottonSuitResourceId,
  landscapingMowingPpeInsulatedJacketResourceId,
  landscapingMowingPpeSignalVestResourceId,
  landscapingMowingPpeInsulatedBootsResourceId,
  landscapingMowingPpePolymerGlovesResourceId,
  landscapingMowingPpeInsulatedMittensResourceId,
  landscapingMowingPpeRubberBootsResourceId,
  landscapingMowingPpeSoapResourceId,
] as const;
const landscapingMowingGrossResourceIds = [
  landscapingMowingLaborResourceId,
  landscapingMowingTrimmerMachineResourceId,
  ...landscapingMowingMaterialResourceIds,
  landscapingMowingInsuranceResourceId,
  landscapingMowingOverheadResourceId,
  landscapingMowingProfitResourceId,
  landscapingMowingUsnResourceId,
  landscapingMowingVatResourceId,
] as const;
const landscapingTreesPrimarySalaryResourceIds = [
  landscapingTreesFertilizerLaborResourceId,
  landscapingTreesLooseningLaborResourceId,
  landscapingTreesConiferPruningLaborResourceId,
  landscapingTreesBranchCollectionLaborResourceId,
  landscapingTreesPlantWasteLoadingLaborResourceId,
  landscapingTreesWeedingLaborResourceId,
  landscapingTreesSnowLoadLaborResourceId,
] as const;
const landscapingTreesMachineResourceIds = [
  landscapingTreesWaterTractorResourceId,
  landscapingTreesWaterTankResourceId,
] as const;
const landscapingTreesMaterialResourceIds = [
  landscapingTreesOmuFertilizerResourceId,
  landscapingTreesAzofoskaResourceId,
  landscapingTreesWaterResourceId,
  landscapingTreesPpeCottonSuitResourceId,
  landscapingTreesPpeInsulatedJacketResourceId,
  landscapingTreesPpeSignalVestResourceId,
  landscapingTreesPpeInsulatedBootsResourceId,
  landscapingTreesPpePolymerGlovesResourceId,
  landscapingTreesPpeInsulatedMittensResourceId,
  landscapingTreesPpeRubberBootsResourceId,
  landscapingTreesPpeSoapResourceId,
  landscapingTreesToolSetResourceId,
  landscapingTreesBatteryPrunerResourceId,
  landscapingTreesGardenSawResourceId,
  landscapingTreesPolePrunerResourceId,
  landscapingTreesLopperResourceId,
  landscapingTreesLadderResourceId,
] as const;
const landscapingTreesGrossResourceIds = [
  ...landscapingTreesPrimarySalaryResourceIds,
  landscapingTreesWaterMachinistResourceId,
  ...landscapingTreesMachineResourceIds,
  ...landscapingTreesMaterialResourceIds,
  landscapingTreesInsuranceResourceId,
  landscapingTreesOverheadResourceId,
  landscapingTreesProfitResourceId,
  landscapingTreesUsnResourceId,
  landscapingTreesVatResourceId,
] as const;
const landscapingTicksHogweedContractorResourceIds = [
  landscapingTicksTreatmentContractorResourceId,
  landscapingHogweedContractorResourceId,
] as const;
const landscapingTicksHogweedGrossResourceIds = [
  ...landscapingTicksHogweedContractorResourceIds,
  landscapingTicksHogweedUsnResourceId,
  landscapingTicksHogweedVatResourceId,
] as const;
const landscapingForestGrossResourceIds = [
  landscapingForestLaborResourceId,
  landscapingForestInsuranceResourceId,
  landscapingForestOverheadResourceId,
  landscapingForestProfitResourceId,
  landscapingForestUsnResourceId,
  landscapingForestVatResourceId,
] as const;

export const landscapingWorkItems = [
  detailWorkItem({
    id: 'landscaping-mowing-ditches',
    title: 'Кошение травостоя вдоль открытых ливневых траншей',
    estimate_row_id: 'landscaping-mowing-ditches',
    service_ids: ['summer-lawn-mowing'],
    source_refs: detailSourceRefs(
      landscapingProductionMowingSource,
      landscapingMowingTotalsSource,
    ),
    note: 'PDF-база: 98 136 м²; кратность кошения: 15 раз за период V-X; объем с учетом кратности: 14 720,40 × 100 м².',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'landscaping-trees-shrubs',
    title: 'Уход за деревьями и кустарниками',
    estimate_row_id: 'landscaping-trees-shrubs',
    service_ids: ['summer-tree-shrub-care', 'summer-plant-watering'],
    source_refs: detailSourceRefs(
      landscapingProductionTreesFertilizerSource,
      landscapingProductionTreesWaterSource,
      landscapingProductionTreesLooseningSource,
      landscapingProductionTreesConiferSource,
      landscapingProductionTreesWeedingSnowSource,
      landscapingTreesTotalsSource,
    ),
    note: 'PDF-базы и кратности внутри строки разные: 485 хвойных деревьев для удобрений и части работ; 970 лиственных деревьев для рыхления; полив 20 раз; рыхление 2 раза; прополка 5 раз; снижение снеговой нагрузки 3 раза.',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'landscaping-ticks-hogweed',
    title: 'Обработка территорий от клещей и борьба с борщевиком',
    estimate_row_id: 'landscaping-ticks-hogweed',
    source_refs: detailSourceRefs(
      landscapingProductionTicksHogweedSource,
      landscapingTicksHogweedTotalsSource,
    ),
    note: 'PDF показывает акарицидную обработку как 1 услугу и борьбу с борщевиком как 1 услугу при кратности 3 в производственной программе.',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'landscaping-forest-care',
    title: 'Уход за лесом',
    estimate_row_id: 'landscaping-forest-care',
    source_refs: detailSourceRefs(
      landscapingProductionForestSource,
      landscapingForestSource,
    ),
    note: 'PDF-база: 129 606 м² леса; расчетный объем: 12,96 × 10 000 м²; кратность сбора валежника: 1 раз в период V-X.',
    ...detailStatus('verified'),
  }),
] satisfies readonly EstimateDetailWorkItem[];

export const landscapingResources = [
  detailResource({
    id: landscapingMowingLaborResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'machinist_labor',
    title: 'Рабочий по уборке территории: кошение бензиновыми триммерами',
    cost_bucket: 'machinist_salary',
    quantity: detailQuantity(1_030, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(684_354.43),
    source_refs: detailSourceRefs(
      landscapingProductionMowingSource,
      landscapingMowingLaborSource,
      landscapingResourceStatementSource,
    ),
    note: 'PDF называет ресурс рабочим, но сумма стоит в колонке зарплаты машинистов и так же классифицирована в estimate-2026.',
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingTrimmerMachineResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'machine',
    title: 'Триммер бензиновый',
    cost_bucket: 'machines',
    quantity: detailQuantity(1_030, 'маш-час'),
    unit_price_rub: detailMoney(59.97),
    total_rub: detailMoney(61_792.83),
    source_refs: detailSourceRefs(
      landscapingProductionMowingSource,
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpeCottonSuitResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Костюм хлопчатобумажный для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.'),
    unit_price_rub: detailMoney(5_500),
    total_rub: detailMoney(2_750),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpeInsulatedJacketResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Куртка на утепляющей прокладке для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.2, 'шт.'),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(1_200),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpeSignalVestResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Жилет сигнальный для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.'),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(600),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpeInsulatedBootsResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Сапоги утепленные для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.2, 'шт.'),
    unit_price_rub: detailMoney(3_500),
    total_rub: detailMoney(700),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpePolymerGlovesResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Перчатки с полимерным покрытием для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(2, 'шт.'),
    unit_price_rub: detailMoney(350),
    total_rub: detailMoney(700),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpeInsulatedMittensResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Рукавицы утепленные для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(2, 'шт.'),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(1_400),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpeRubberBootsResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Сапоги резиновые для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.'),
    unit_price_rub: detailMoney(2_000),
    total_rub: detailMoney(1_000),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingPpeSoapResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'material',
    title: 'Мыло туалетное для кошения',
    cost_bucket: 'materials',
    quantity: detailQuantity(6, 'шт.'),
    unit_price_rub: detailMoney(116),
    total_rub: detailMoney(696),
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingInsuranceResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'other_cost',
    title: 'Страховые взносы по кошению травостоя',
    cost_bucket: 'insurance',
    total_rub: detailMoney(206_675.04),
    source_refs: detailSourceRefs(landscapingMowingMachinePpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingOverheadResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по кошению травостоя',
    cost_bucket: 'overhead',
    total_rub: detailMoney(479_048.1),
    source_refs: detailSourceRefs(landscapingMowingMachinePpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingProfitResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'other_cost',
    title: 'Прибыль по кошению травостоя',
    cost_bucket: 'profit',
    total_rub: detailMoney(273_741.77),
    source_refs: detailSourceRefs(landscapingMowingMachinePpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingMowingUsnResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по кошению травостоя',
    cost_bucket: 'usn',
    total_rub: detailMoney(15_204.69, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingMowingTotalsSource,
      landscapingCalculationSource,
    ),
    note: 'В landscaping.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: landscapingMowingVatResourceId,
    work_item_id: 'landscaping-mowing-ditches',
    estimate_row_id: 'landscaping-mowing-ditches',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по кошению травостоя',
    cost_bucket: 'vat',
    total_rub: detailMoney(86_493.14, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailResource({
    id: landscapingTreesFertilizerLaborResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'labor',
    title: 'Рабочий по уборке территории: внесение органических удобрений',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(0.039, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(25.77),
    source_refs: detailSourceRefs(
      landscapingProductionTreesFertilizerSource,
      landscapingTreesFertilizerSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesWaterMachinistResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'machinist_labor',
    title: 'Машинист: полив деревьев механизированным способом',
    cost_bucket: 'machinist_salary',
    quantity: detailQuantity(164, 'чел-час'),
    unit_price_rub: detailMoney(934.32),
    total_rub: detailMoney(153_163.08),
    source_refs: detailSourceRefs(
      landscapingStaffSource,
      landscapingTreesWaterSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesWaterTractorResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'machine',
    title: 'Трактор МТЗ 80 с навесным оборудованием',
    cost_bucket: 'machines',
    quantity: detailQuantity(164, 'маш-час'),
    unit_price_rub: detailMoney(1_476.02),
    total_rub: detailMoney(241_964.04),
    source_refs: detailSourceRefs(
      landscapingProductionTreesWaterSource,
      landscapingTreesWaterSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesWaterTankResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'machine',
    title: 'Оборудование поливомоечное ОПМ-5,0 (бочка)',
    cost_bucket: 'machines',
    quantity: detailQuantity(164, 'маш-час'),
    unit_price_rub: detailMoney(108.4),
    total_rub: detailMoney(17_769.76),
    source_refs: detailSourceRefs(
      landscapingProductionTreesWaterEquipmentSource,
      landscapingTreesWaterSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesLooseningLaborResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'labor',
    title: 'Рабочий по уборке территории: рыхление приствольных лунок',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(456, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(302_784.07),
    source_refs: detailSourceRefs(
      landscapingProductionTreesLooseningSource,
      landscapingTreesLooseningSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesConiferPruningLaborResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'labor',
    title: 'Рабочий по уборке территории: вырезка сухих ветвей и мелкой суши',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(6, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(3_865.33),
    source_refs: detailSourceRefs(
      landscapingProductionTreesConiferSource,
      landscapingTreesConiferPruningSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesBranchCollectionLaborResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'labor',
    title: 'Рабочий по уборке территории: сбор срезанных ветвей',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(1, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(644.22),
    source_refs: detailSourceRefs(
      landscapingProductionTreesConiferSource,
      landscapingTreesBranchCollectionSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPlantWasteLoadingLaborResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'labor',
    title: 'Рабочий по уборке территории: погрузка растительных остатков',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(1, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(837.49),
    source_refs: detailSourceRefs(
      landscapingProductionTreesConiferSource,
      landscapingTreesPlantWasteLoadingSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesWeedingLaborResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'labor',
    title: 'Рабочий по уборке территории: прополка приствольных кругов',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(137, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(91_318.39),
    source_refs: detailSourceRefs(
      landscapingProductionTreesWeedingSnowSource,
      landscapingTreesWeedingSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesSnowLoadLaborResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'labor',
    title: 'Рабочий по уборке территории: снижение снеговой нагрузки',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(25, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(16_427.65),
    source_refs: detailSourceRefs(
      landscapingProductionTreesWeedingSnowSource,
      landscapingTreesSnowLoadSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesOmuFertilizerResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'ОМУ «Универсал» 40% органики с микроэлементами',
    cost_bucket: 'materials',
    quantity: detailQuantity(38.8, 'кг.'),
    unit_price_rub: detailMoney(170),
    total_rub: detailMoney(6_596),
    source_refs: detailSourceRefs(
      landscapingProductionTreesFertilizerSource,
      landscapingTreesFertilizerMaterialsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesAzofoskaResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Азофоска 16-16-16',
    cost_bucket: 'materials',
    quantity: detailQuantity(38.8, 'кг.'),
    unit_price_rub: detailMoney(120),
    total_rub: detailMoney(4_656),
    source_refs: detailSourceRefs(
      landscapingProductionTreesFertilizerSource,
      landscapingTreesFertilizerMaterialsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesWaterResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Вода для полива деревьев',
    cost_bucket: 'materials',
    quantity: detailQuantity(291, 'м³'),
    unit_price_rub: detailMoney(13.56),
    total_rub: detailMoney(3_945.96),
    source_refs: detailSourceRefs(
      landscapingProductionTreesWaterSource,
      landscapingTreesWaterTotalsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpeCottonSuitResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Костюм хлопчатобумажный для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(5_500),
    total_rub: detailMoney(2_915),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeStartSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpeInsulatedJacketResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Куртка на утепляющей прокладке для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.21, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(1_272),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeStartSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpeSignalVestResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Жилет сигнальный для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(636),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeStartSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpeInsulatedBootsResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Сапоги утепленные для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.21, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(3_500),
    total_rub: detailMoney(742),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeStartSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpePolymerGlovesResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Перчатки с полимерным покрытием для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(2.1, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(350),
    total_rub: detailMoney(742),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpeInsulatedMittensResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Рукавицы утепленные для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(2.1, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(1_484),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpeRubberBootsResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Сапоги резиновые для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(2_000),
    total_rub: detailMoney(1_060),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPpeSoapResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Мыло туалетное для ухода за деревьями',
    cost_bucket: 'materials',
    quantity: detailQuantity(6.4, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(116),
    total_rub: detailMoney(737.76),
    source_refs: detailSourceRefs(
      landscapingProductionTreesPpeSource,
      landscapingTreesPpeSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesToolSetResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Набор садовых инструментов в футляре',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.15, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_500),
    total_rub: detailMoney(222.75),
    source_refs: detailSourceRefs(
      landscapingProductionTreesInventorySource,
      landscapingTreesInventoryLadderSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesBatteryPrunerResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Секатор-кусторез аккумуляторный',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.14, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(12_000),
    total_rub: detailMoney(1_620),
    source_refs: detailSourceRefs(
      landscapingProductionTreesInventorySource,
      landscapingTreesInventorySource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesGardenSawResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Садовая ножовка',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.15, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(178.2),
    source_refs: detailSourceRefs(
      landscapingProductionTreesInventorySource,
      landscapingTreesInventorySource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesPolePrunerResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Высоторез',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.15, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(12_000),
    total_rub: detailMoney(1_782),
    source_refs: detailSourceRefs(
      landscapingProductionTreesInventorySource,
      landscapingTreesInventorySource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesLopperResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Сучкорез',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.15, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(891),
    source_refs: detailSourceRefs(
      landscapingProductionTreesInventorySource,
      landscapingTreesInventorySource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesLadderResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'material',
    title: 'Стремянка трансформер',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.15, 'шт.', {
      note: landscapingRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(10_000),
    total_rub: detailMoney(1_485),
    source_refs: detailSourceRefs(
      landscapingProductionTreesInventorySource,
      landscapingTreesInventorySource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesInsuranceResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'other_cost',
    title: 'Страховые взносы по уходу за деревьями и кустарниками',
    cost_bucket: 'insurance',
    total_rub: detailMoney(171_857.92),
    source_refs: detailSourceRefs(landscapingTreesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesOverheadResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по уходу за деревьями и кустарниками',
    cost_bucket: 'overhead',
    total_rub: detailMoney(398_346.19),
    source_refs: detailSourceRefs(landscapingTreesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesProfitResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'other_cost',
    title: 'Прибыль по уходу за деревьями и кустарниками',
    cost_bucket: 'profit',
    total_rub: detailMoney(227_626.4),
    source_refs: detailSourceRefs(landscapingTreesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTreesUsnResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по уходу за деревьями и кустарниками',
    cost_bucket: 'usn',
    total_rub: detailMoney(14_698.31, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingTreesTotalsSource,
      landscapingCalculationSource,
    ),
    note: 'В landscaping.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: landscapingTreesVatResourceId,
    work_item_id: 'landscaping-trees-shrubs',
    estimate_row_id: 'landscaping-trees-shrubs',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по уходу за деревьями и кустарниками',
    cost_bucket: 'vat',
    total_rub: detailMoney(83_614.71, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailResource({
    id: landscapingTicksTreatmentContractorResourceId,
    work_item_id: 'landscaping-ticks-hogweed',
    estimate_row_id: 'landscaping-ticks-hogweed',
    kind: 'contractor',
    title: 'Услуги сторонней организации: обработка от клещей',
    cost_bucket: 'contractors',
    quantity: detailQuantity(1, 'обработка'),
    unit_price_rub: detailMoney(34_200),
    total_rub: detailMoney(34_200),
    source_refs: detailSourceRefs(
      landscapingProductionTicksHogweedSource,
      landscapingTicksTreatmentSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingHogweedContractorResourceId,
    work_item_id: 'landscaping-ticks-hogweed',
    estimate_row_id: 'landscaping-ticks-hogweed',
    kind: 'contractor',
    title: 'Услуги сторонней организации: борьба с борщевиком',
    cost_bucket: 'contractors',
    quantity: detailQuantity(1, 'обработка'),
    unit_price_rub: detailMoney(5_826_000),
    total_rub: detailMoney(5_826_000),
    source_refs: detailSourceRefs(
      landscapingProductionTicksHogweedSource,
      landscapingHogweedSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingTicksHogweedUsnResourceId,
    work_item_id: 'landscaping-ticks-hogweed',
    estimate_row_id: 'landscaping-ticks-hogweed',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по обработке от клещей и борьбе с борщевиком',
    cost_bucket: 'usn',
    total_rub: detailMoney(51_964.76, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingTicksHogweedTotalsSource,
      landscapingCalculationSource,
    ),
    note: 'В landscaping.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: landscapingTicksHogweedVatResourceId,
    work_item_id: 'landscaping-ticks-hogweed',
    estimate_row_id: 'landscaping-ticks-hogweed',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по обработке от клещей и борьбе с борщевиком',
    cost_bucket: 'vat',
    total_rub: detailMoney(295_608.24, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailResource({
    id: landscapingForestLaborResourceId,
    work_item_id: 'landscaping-forest-care',
    estimate_row_id: 'landscaping-forest-care',
    kind: 'labor',
    title: 'Рабочий по уборке территории: сбор валежника',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(259.212, 'чел-час'),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(172_154.56),
    source_refs: detailSourceRefs(
      landscapingProductionForestSource,
      landscapingForestSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingForestInsuranceResourceId,
    work_item_id: 'landscaping-forest-care',
    estimate_row_id: 'landscaping-forest-care',
    kind: 'other_cost',
    title: 'Страховые взносы по уходу за лесом',
    cost_bucket: 'insurance',
    total_rub: detailMoney(51_990.68),
    source_refs: detailSourceRefs(landscapingForestSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingForestOverheadResourceId,
    work_item_id: 'landscaping-forest-care',
    estimate_row_id: 'landscaping-forest-care',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по уходу за лесом',
    cost_bucket: 'overhead',
    total_rub: detailMoney(120_508.19),
    source_refs: detailSourceRefs(landscapingForestSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingForestProfitResourceId,
    work_item_id: 'landscaping-forest-care',
    estimate_row_id: 'landscaping-forest-care',
    kind: 'other_cost',
    title: 'Прибыль по уходу за лесом',
    cost_bucket: 'profit',
    total_rub: detailMoney(68_861.82),
    source_refs: detailSourceRefs(landscapingForestSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: landscapingForestUsnResourceId,
    work_item_id: 'landscaping-forest-care',
    estimate_row_id: 'landscaping-forest-care',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по уходу за лесом',
    cost_bucket: 'usn',
    total_rub: detailMoney(3_666.64, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingForestSource,
      landscapingCalculationSource,
    ),
    note: 'В landscaping.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: landscapingForestVatResourceId,
    work_item_id: 'landscaping-forest-care',
    estimate_row_id: 'landscaping-forest-care',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по уходу за лесом',
    cost_bucket: 'vat',
    total_rub: detailMoney(20_859.1, {
      note: 'выведено из gross строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
] satisfies readonly EstimateDetailResource[];

export const landscapingControlTotals = [
  detailControlTotal({
    id: 'landscaping-mowing-machinist-salary',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'machinist_salary',
    source_total_rub: detailMoney(684_354.43),
    tolerance_rub: 0.01,
    resource_ids: [landscapingMowingLaborResourceId],
    source_refs: detailSourceRefs(
      landscapingMowingLaborSource,
      landscapingMowingTotalsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-machines',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'machines',
    source_total_rub: detailMoney(61_792.83),
    tolerance_rub: 0.01,
    resource_ids: [landscapingMowingTrimmerMachineResourceId],
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingMowingTotalsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-materials',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(9_046),
    tolerance_rub: 0.01,
    resource_ids: landscapingMowingMaterialResourceIds,
    source_refs: detailSourceRefs(
      landscapingMowingMachinePpeSource,
      landscapingMowingTotalsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-insurance',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(206_675.04),
    tolerance_rub: 0.01,
    resource_ids: [landscapingMowingInsuranceResourceId],
    source_refs: detailSourceRefs(landscapingMowingMachinePpeSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-overhead',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(479_048.1),
    tolerance_rub: 0.01,
    resource_ids: [landscapingMowingOverheadResourceId],
    source_refs: detailSourceRefs(landscapingMowingMachinePpeSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-profit',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(273_741.77),
    tolerance_rub: 0.01,
    resource_ids: [landscapingMowingProfitResourceId],
    source_refs: detailSourceRefs(landscapingMowingMachinePpeSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-usn',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(15_204.69),
    tolerance_rub: 0.01,
    resource_ids: [landscapingMowingUsnResourceId],
    source_refs: detailSourceRefs(
      landscapingMowingTotalsSource,
      landscapingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-vat',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(86_493.14),
    tolerance_rub: 0.01,
    resource_ids: [landscapingMowingVatResourceId],
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-mowing-gross',
    estimate_row_id: 'landscaping-mowing-ditches',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(1_816_356),
    tolerance_rub: 1,
    resource_ids: landscapingMowingGrossResourceIds,
    source_refs: detailSourceRefs(
      landscapingMowingTotalsSource,
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-primary-salary',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(415_902.91),
    detail_total_note: 'Построчные округления дают +0,01 к итогу раздела.',
    tolerance_rub: 0.02,
    resource_ids: landscapingTreesPrimarySalaryResourceIds,
    source_refs: detailSourceRefs(
      landscapingTreesTotalsSource,
      landscapingResourceStatementSource,
    ),
    note: 'Сумма построчных трудовых ресурсов на 0,01 руб. больше итоговой строки раздела.',
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-machinist-salary',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'machinist_salary',
    source_total_rub: detailMoney(153_163.08),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTreesWaterMachinistResourceId],
    source_refs: detailSourceRefs(
      landscapingTreesWaterSource,
      landscapingTreesTotalsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-machines',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'machines',
    source_total_rub: detailMoney(259_733.8),
    tolerance_rub: 0.01,
    resource_ids: landscapingTreesMachineResourceIds,
    source_refs: detailSourceRefs(
      landscapingTreesWaterSource,
      landscapingTreesTotalsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-materials',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(30_965.67),
    tolerance_rub: 0.01,
    resource_ids: landscapingTreesMaterialResourceIds,
    source_refs: detailSourceRefs(
      landscapingTreesTotalsSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-insurance',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(171_857.92),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTreesInsuranceResourceId],
    source_refs: detailSourceRefs(landscapingTreesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-overhead',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(398_346.19),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTreesOverheadResourceId],
    source_refs: detailSourceRefs(landscapingTreesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-profit',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(227_626.4),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTreesProfitResourceId],
    source_refs: detailSourceRefs(landscapingTreesTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-usn',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(14_698.31),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTreesUsnResourceId],
    source_refs: detailSourceRefs(
      landscapingTreesTotalsSource,
      landscapingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-vat',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(83_614.71),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTreesVatResourceId],
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-trees-gross',
    estimate_row_id: 'landscaping-trees-shrubs',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(1_755_909),
    tolerance_rub: 1,
    resource_ids: landscapingTreesGrossResourceIds,
    source_refs: detailSourceRefs(
      landscapingTreesTotalsSource,
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-ticks-hogweed-contractors',
    estimate_row_id: 'landscaping-ticks-hogweed',
    cost_bucket: 'contractors',
    source_total_rub: detailMoney(5_860_200),
    tolerance_rub: 0.01,
    resource_ids: landscapingTicksHogweedContractorResourceIds,
    source_refs: detailSourceRefs(
      landscapingTicksTreatmentSource,
      landscapingHogweedSource,
      landscapingTicksHogweedTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-ticks-hogweed-usn',
    estimate_row_id: 'landscaping-ticks-hogweed',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(51_964.76),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTicksHogweedUsnResourceId],
    source_refs: detailSourceRefs(
      landscapingTicksHogweedTotalsSource,
      landscapingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-ticks-hogweed-vat',
    estimate_row_id: 'landscaping-ticks-hogweed',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(295_608.24),
    tolerance_rub: 0.01,
    resource_ids: [landscapingTicksHogweedVatResourceId],
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-ticks-hogweed-gross',
    estimate_row_id: 'landscaping-ticks-hogweed',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(6_207_773),
    tolerance_rub: 1,
    resource_ids: landscapingTicksHogweedGrossResourceIds,
    source_refs: detailSourceRefs(
      landscapingTicksHogweedTotalsSource,
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-forest-primary-salary',
    estimate_row_id: 'landscaping-forest-care',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(172_154.56),
    tolerance_rub: 0.01,
    resource_ids: [landscapingForestLaborResourceId],
    source_refs: detailSourceRefs(
      landscapingForestSource,
      landscapingResourceStatementSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-forest-insurance',
    estimate_row_id: 'landscaping-forest-care',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(51_990.68),
    tolerance_rub: 0.01,
    resource_ids: [landscapingForestInsuranceResourceId],
    source_refs: detailSourceRefs(landscapingForestSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-forest-overhead',
    estimate_row_id: 'landscaping-forest-care',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(120_508.19),
    tolerance_rub: 0.01,
    resource_ids: [landscapingForestOverheadResourceId],
    source_refs: detailSourceRefs(landscapingForestSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-forest-profit',
    estimate_row_id: 'landscaping-forest-care',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(68_861.82),
    tolerance_rub: 0.01,
    resource_ids: [landscapingForestProfitResourceId],
    source_refs: detailSourceRefs(landscapingForestSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'landscaping-forest-usn',
    estimate_row_id: 'landscaping-forest-care',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(3_666.64),
    tolerance_rub: 0.01,
    resource_ids: [landscapingForestUsnResourceId],
    source_refs: detailSourceRefs(
      landscapingForestSource,
      landscapingCalculationSource,
    ),
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-forest-vat',
    estimate_row_id: 'landscaping-forest-care',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(20_859.1),
    tolerance_rub: 0.01,
    resource_ids: [landscapingForestVatResourceId],
    source_refs: detailSourceRefs(
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'landscaping-forest-gross',
    estimate_row_id: 'landscaping-forest-care',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(438_041),
    tolerance_rub: 1,
    resource_ids: landscapingForestGrossResourceIds,
    source_refs: detailSourceRefs(
      landscapingForestSource,
      landscapingDocumentTotalsSource,
      landscapingCalculationSource,
    ),
    note: landscapingVatReconciliationNote,
    ...detailStatus('derived'),
  }),
] satisfies readonly EstimateDetailControlTotalInput[];
