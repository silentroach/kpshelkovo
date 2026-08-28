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

const cleaningRoundedQuantityNote =
  'количество в PDF округлено; итог сохранен по исходной строке';
const cleaningResourceStatementSandUnitNeedsCheckReason =
  'В ресурсной ведомости единица песка извлекается как «кг.», но производственная программа и локальные позиции показывают песок в тоннах при цене 1800 руб.; рублевый итог сходится, единицу нужно проверить глазами в PDF.';

const cleaningWinterMechanizedSnow2cmMachinistResourceId =
  'cleaning-winter-mechanized-snow-2cm-machinist-labor';
const cleaningWinterMechanizedHeavySnowMachinistResourceId =
  'cleaning-winter-mechanized-heavy-snow-machinist-labor';
const cleaningWinterMechanizedSandMachinistResourceId =
  'cleaning-winter-mechanized-sand-machinist-labor';
const cleaningWinterMechanizedSnow2cmTractorResourceId =
  'cleaning-winter-mechanized-snow-2cm-tractor-machine';
const cleaningWinterMechanizedHeavySnowTractorResourceId =
  'cleaning-winter-mechanized-heavy-snow-tractor-machine';
const cleaningWinterMechanizedSandTractorResourceId =
  'cleaning-winter-mechanized-sand-tractor-machine';
const cleaningWinterMechanizedSandSpreaderResourceId =
  'cleaning-winter-mechanized-sand-spreader-machine';
const cleaningWinterMechanizedSandResourceId =
  'cleaning-winter-mechanized-sand';
const cleaningWinterMechanizedPpeCottonSuitResourceId =
  'cleaning-winter-mechanized-ppe-cotton-suit';
const cleaningWinterMechanizedPpeInsulatedJacketResourceId =
  'cleaning-winter-mechanized-ppe-insulated-jacket';
const cleaningWinterMechanizedPpeSignalVestResourceId =
  'cleaning-winter-mechanized-ppe-signal-vest';
const cleaningWinterMechanizedPpeInsulatedBootsResourceId =
  'cleaning-winter-mechanized-ppe-insulated-boots';
const cleaningWinterMechanizedPpePolymerGlovesResourceId =
  'cleaning-winter-mechanized-ppe-polymer-gloves';
const cleaningWinterMechanizedPpeInsulatedMittensResourceId =
  'cleaning-winter-mechanized-ppe-insulated-mittens';
const cleaningWinterMechanizedPpeRubberBootsResourceId =
  'cleaning-winter-mechanized-ppe-rubber-boots';
const cleaningWinterMechanizedPpeSoapResourceId =
  'cleaning-winter-mechanized-ppe-soap';
const cleaningWinterMechanizedInsuranceResourceId =
  'cleaning-winter-mechanized-insurance';
const cleaningWinterMechanizedOverheadResourceId =
  'cleaning-winter-mechanized-overhead';
const cleaningWinterMechanizedProfitResourceId =
  'cleaning-winter-mechanized-profit';
const cleaningWinterMechanizedUsnResourceId =
  'cleaning-winter-mechanized-usn-derived';
const cleaningWinterMechanizedVatResourceId =
  'cleaning-winter-mechanized-vat-derived';

const cleaningWinterManualSnowSweepingWorkerResourceId =
  'cleaning-winter-manual-snow-sweeping-worker-labor';
const cleaningWinterManualAntiIceWorkerResourceId =
  'cleaning-winter-manual-anti-ice-worker-labor';
const cleaningWinterManualRoadSnowIceWorkerResourceId =
  'cleaning-winter-manual-road-snow-ice-worker-labor';
const cleaningWinterManualContainerSiteWorkerResourceId =
  'cleaning-winter-manual-container-site-worker-labor';
const cleaningWinterManualSandResourceId = 'cleaning-winter-manual-sand';
const cleaningWinterManualPpeCottonSuitResourceId =
  'cleaning-winter-manual-ppe-cotton-suit';
const cleaningWinterManualPpeInsulatedJacketResourceId =
  'cleaning-winter-manual-ppe-insulated-jacket';
const cleaningWinterManualPpeSignalVestResourceId =
  'cleaning-winter-manual-ppe-signal-vest';
const cleaningWinterManualPpeInsulatedBootsResourceId =
  'cleaning-winter-manual-ppe-insulated-boots';
const cleaningWinterManualPpePolymerGlovesResourceId =
  'cleaning-winter-manual-ppe-polymer-gloves';
const cleaningWinterManualPpeInsulatedMittensResourceId =
  'cleaning-winter-manual-ppe-insulated-mittens';
const cleaningWinterManualPpeRubberBootsResourceId =
  'cleaning-winter-manual-ppe-rubber-boots';
const cleaningWinterManualPpeSoapResourceId = 'cleaning-winter-manual-ppe-soap';
const cleaningWinterManualInventoryIceAxeResourceId =
  'cleaning-winter-manual-inventory-ice-axe';
const cleaningWinterManualInventoryPolypropyleneBroomResourceId =
  'cleaning-winter-manual-inventory-polypropylene-broom';
const cleaningWinterManualInventoryRakeResourceId =
  'cleaning-winter-manual-inventory-rake';
const cleaningWinterManualInventorySnowShovelResourceId =
  'cleaning-winter-manual-inventory-snow-shovel';
const cleaningWinterManualInventoryScoopShovelResourceId =
  'cleaning-winter-manual-inventory-scoop-shovel';
const cleaningWinterManualInventoryWheelbarrowResourceId =
  'cleaning-winter-manual-inventory-wheelbarrow';
const cleaningWinterManualInventoryBucketResourceId =
  'cleaning-winter-manual-inventory-bucket-12l';
const cleaningWinterManualInsuranceResourceId =
  'cleaning-winter-manual-insurance';
const cleaningWinterManualOverheadResourceId =
  'cleaning-winter-manual-overhead';
const cleaningWinterManualProfitResourceId = 'cleaning-winter-manual-profit';
const cleaningWinterManualUsnResourceId = 'cleaning-winter-manual-usn-derived';
const cleaningWinterManualVatResourceId = 'cleaning-winter-manual-vat-derived';

const cleaningSummerMechanizedWateringMachinistResourceId =
  'cleaning-summer-mechanized-watering-machinist-labor';
const cleaningSummerMechanizedWateringTractorResourceId =
  'cleaning-summer-mechanized-watering-tractor-machine';
const cleaningSummerMechanizedWateringOpm5ResourceId =
  'cleaning-summer-mechanized-watering-opm5-machine';
const cleaningSummerMechanizedWaterResourceId =
  'cleaning-summer-mechanized-water';
const cleaningSummerMechanizedPpeCottonSuitResourceId =
  'cleaning-summer-mechanized-ppe-cotton-suit';
const cleaningSummerMechanizedPpeInsulatedJacketResourceId =
  'cleaning-summer-mechanized-ppe-insulated-jacket';
const cleaningSummerMechanizedPpeSignalVestResourceId =
  'cleaning-summer-mechanized-ppe-signal-vest';
const cleaningSummerMechanizedPpeInsulatedBootsResourceId =
  'cleaning-summer-mechanized-ppe-insulated-boots';
const cleaningSummerMechanizedPpePolymerGlovesResourceId =
  'cleaning-summer-mechanized-ppe-polymer-gloves';
const cleaningSummerMechanizedPpeInsulatedMittensResourceId =
  'cleaning-summer-mechanized-ppe-insulated-mittens';
const cleaningSummerMechanizedPpeRubberBootsResourceId =
  'cleaning-summer-mechanized-ppe-rubber-boots';
const cleaningSummerMechanizedPpeSoapResourceId =
  'cleaning-summer-mechanized-ppe-soap';
const cleaningSummerMechanizedInsuranceResourceId =
  'cleaning-summer-mechanized-insurance';
const cleaningSummerMechanizedOverheadResourceId =
  'cleaning-summer-mechanized-overhead';
const cleaningSummerMechanizedProfitResourceId =
  'cleaning-summer-mechanized-profit';
const cleaningSummerMechanizedUsnResourceId =
  'cleaning-summer-mechanized-usn-derived';
const cleaningSummerMechanizedVatResourceId =
  'cleaning-summer-mechanized-vat-derived';

const cleaningSummerManualCurbCleaningWorkerResourceId =
  'cleaning-summer-manual-curb-cleaning-worker-labor';
const cleaningSummerManualParkingTrashWorkerResourceId =
  'cleaning-summer-manual-parking-trash-worker-labor';
const cleaningSummerManualParkingSweepingWorkerResourceId =
  'cleaning-summer-manual-parking-sweeping-worker-labor';
const cleaningSummerManualContainerSiteWorkerResourceId =
  'cleaning-summer-manual-container-site-worker-labor';
const cleaningSummerManualDitchCleaningWorkerResourceId =
  'cleaning-summer-manual-ditch-cleaning-worker-labor';
const cleaningSummerManualPpeCottonSuitResourceId =
  'cleaning-summer-manual-ppe-cotton-suit';
const cleaningSummerManualPpeInsulatedJacketResourceId =
  'cleaning-summer-manual-ppe-insulated-jacket';
const cleaningSummerManualPpeSignalVestResourceId =
  'cleaning-summer-manual-ppe-signal-vest';
const cleaningSummerManualPpeInsulatedBootsResourceId =
  'cleaning-summer-manual-ppe-insulated-boots';
const cleaningSummerManualPpePolymerGlovesResourceId =
  'cleaning-summer-manual-ppe-polymer-gloves';
const cleaningSummerManualPpeInsulatedMittensResourceId =
  'cleaning-summer-manual-ppe-insulated-mittens';
const cleaningSummerManualPpeRubberBootsResourceId =
  'cleaning-summer-manual-ppe-rubber-boots';
const cleaningSummerManualPpeSoapResourceId = 'cleaning-summer-manual-ppe-soap';
const cleaningSummerManualInventoryPolypropyleneBroomResourceId =
  'cleaning-summer-manual-inventory-polypropylene-broom';
const cleaningSummerManualInventoryRakeResourceId =
  'cleaning-summer-manual-inventory-rake';
const cleaningSummerManualInventoryScoopShovelResourceId =
  'cleaning-summer-manual-inventory-scoop-shovel';
const cleaningSummerManualInventoryWheelbarrowResourceId =
  'cleaning-summer-manual-inventory-wheelbarrow';
const cleaningSummerManualInventoryBucketResourceId =
  'cleaning-summer-manual-inventory-bucket-12l';
const cleaningSummerManualInsuranceResourceId =
  'cleaning-summer-manual-insurance';
const cleaningSummerManualOverheadResourceId =
  'cleaning-summer-manual-overhead';
const cleaningSummerManualProfitResourceId = 'cleaning-summer-manual-profit';
const cleaningSummerManualUsnResourceId = 'cleaning-summer-manual-usn-derived';
const cleaningSummerManualVatResourceId = 'cleaning-summer-manual-vat-derived';

const cleaningWinterMechanizedProductionSnowSource = detailSource(
  'cleaning',
  1,
  'производственная программа / зимняя механизированная уборка / подметание снега',
  {
    quote:
      'Подметание свежевыпавшего снега толщиной слоя 2 см; кратность 70; объем 81 778; Трактор МТЗ 80 ... 2160; Подметание ... свыше 2 см; кратность 92; Трактор МТЗ 80 ... 2980',
  },
);

const cleaningWinterMechanizedProductionSandSource = detailSource(
  'cleaning',
  2,
  'производственная программа / зимняя механизированная уборка / посыпка песком и СИЗ',
  {
    quote:
      'Посыпка дорог песком - в дни с гололедом и гололедицей; кратность 30; Трактор МТЗ 80 ... 210; Навесной разбрасыватель песка РПМ-01 210; Песок для посыпки дорог 73,6 т.; СИЗ 2,7 чел.',
  },
);

const cleaningStaffSource = detailSource(
  'cleaning',
  8,
  'нормативное штатное расписание по уборке территории',
  {
    quote:
      'Рабочий по уборке территории (средний разряд 3.0); 13,4; тарифная ставка 664,15; всего 8 899,55; Машинист; 14,1; тарифная ставка 934,32; всего 13 173,91',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Рабочий по уборке территории (средний разряд 3.0)',
        quantity: detailQuantity(13.4, 'чел.'),
        unit_price_rub: detailMoney(664.15),
        total_rub: detailMoney(8_899.55),
      }),
      detailSourceQuoteItem({
        label: 'Машинист',
        quantity: detailQuantity(14.1, 'чел.'),
        unit_price_rub: detailMoney(934.32),
        total_rub: detailMoney(13_173.91),
      }),
    ),
  },
);

const cleaningWinterMechanizedSnow2cmSource = detailSource(
  'cleaning',
  10,
  'позиция 1.1 / подметание снега толщиной 2 см',
  {
    quote:
      'Подметание свежевыпавшего снега толщиной слоя 2 см ... 5 206 753,87; Машинист 2160 934,32 2 018 293,38; Трактор МТЗ 80 ... 3 188 460,49; ИТОГО ПО ПОЗИЦИИ 8 036 401,19',
  },
);

const cleaningWinterMechanizedHeavySnowSource = detailSource(
  'cleaning',
  10,
  'позиция 1.2 / подметание снега толщиной свыше 2 см',
  {
    quote:
      'Подметание свежевыпавшего снега толщиной слоя свыше 2 см ... 7 181 932,63; Машинист 2980 934,32 2 783 931,69; Трактор МТЗ 80 ... 4 398 000,94',
  },
);

const cleaningWinterMechanizedHeavySnowTotalSource = detailSource(
  'cleaning',
  11,
  'позиция 1.2 / начисления и итог подметания снега свыше 2 см',
  {
    quote:
      'Расходы на страховые взносы 840 747,37; общеэксплуатационные расходы 1 948 752,19; прибыль 1 113 572,68; ИТОГО ПО ПОЗИЦИИ 11 085 004,86',
  },
);

const cleaningWinterMechanizedSandSource = detailSource(
  'cleaning',
  11,
  'позиция 1.3 / посыпка дорог песком',
  {
    quote:
      'Посыпка дорог песком ... 648 097,51; Машинист 210 934,32 196 544,88; Трактор МТЗ 80 ... 310 497,76; Навесной разбрасыватель песка РПМ-01 8 574,51; Песок 74 т. 1800,00 132 480,36',
  },
);

const cleaningWinterMechanizedSandTotalSource = detailSource(
  'cleaning',
  12,
  'позиция 1.3 / начисления и итог посыпки песком',
  {
    quote:
      'Расходы на страховые взносы 59 356,55; общеэксплуатационные расходы 137 581,41; прибыль 78 617,95; ИТОГО ПО ПОЗИЦИИ 923 653,42',
  },
);

const cleaningWinterMechanizedPpeSource = detailSource(
  'cleaning',
  12,
  'позиция 1.4 / средства охраны труда для зимней механизированной уборки',
  {
    quote:
      'Костюм 14 850,00; Куртка 6 480,00; Жилет 3 240,00; Сапоги утепленные 3 780,00; Перчатки 3 780,00; Рукавицы 7 560,00; Сапоги резиновые 5 400,00; Мыло 3 758,40; ИТОГО 48 848,40',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [cleaningWinterMechanizedPpeCottonSuitResourceId],
        quantity: detailQuantity(2.7, 'шт.'),
        unit_price_rub: detailMoney(5_500),
        total_rub: detailMoney(14_850),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [cleaningWinterMechanizedPpeInsulatedJacketResourceId],
        quantity: detailQuantity(1.1, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(6_000),
        total_rub: detailMoney(6_480),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [cleaningWinterMechanizedPpeSignalVestResourceId],
        quantity: detailQuantity(2.7, 'шт.'),
        unit_price_rub: detailMoney(1_200),
        total_rub: detailMoney(3_240),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [cleaningWinterMechanizedPpeInsulatedBootsResourceId],
        quantity: detailQuantity(1.1, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(3_500),
        total_rub: detailMoney(3_780),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [cleaningWinterMechanizedPpePolymerGlovesResourceId],
        quantity: detailQuantity(10.8, 'шт.'),
        unit_price_rub: detailMoney(350),
        total_rub: detailMoney(3_780),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [cleaningWinterMechanizedPpeInsulatedMittensResourceId],
        quantity: detailQuantity(10.8, 'шт.'),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(7_560),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [cleaningWinterMechanizedPpeRubberBootsResourceId],
        quantity: detailQuantity(2.7, 'шт.'),
        unit_price_rub: detailMoney(2_000),
        total_rub: detailMoney(5_400),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [cleaningWinterMechanizedPpeSoapResourceId],
        quantity: detailQuantity(32.4, 'шт.'),
        unit_price_rub: detailMoney(116),
        total_rub: detailMoney(3_758.4),
      }),
    ),
  },
);

const cleaningWinterMechanizedTotalsSource = detailSource(
  'cleaning',
  13,
  'итого по разделу зимней механизированной уборки территории',
  {
    quote:
      'Прямые затраты 13 085 632,41; страховые взносы 1 509 628,52; общеэксплуатационные расходы 3 499 138,97; прибыль 1 999 507,98; Итого 20 093 907,88; Машины 7 905 533,70; Зарплата машинистов 4 998 769,96; Материальные затраты 181 328,76',
  },
);

const cleaningWinterManualProductionSnowSource = detailSource(
  'cleaning',
  2,
  'производственная программа / зимняя ручная уборка / подметание снега',
  {
    quote:
      'Зимняя ручная уборка территории; трудозатраты 1 825,3; Подметание свежевыпавшего снега ... кратность 70; объем 449; трудозатраты 73,3',
  },
);

const cleaningWinterManualProductionWorksSource = detailSource(
  'cleaning',
  3,
  'производственная программа / зимняя ручная уборка / подсыпка, дороги и контейнерная площадка',
  {
    quote:
      'Подсыпка территории противогололедным материалом ... кратность 30; объем 449; трудозатраты 29,2; Песок 2,7 т.; Очистка участков территорий от снега и наледи ... кратность 116; объем 8 178; трудозатраты 1264,8; Очистка контейнерной площадки ... кратность 212; объем 36,0; трудозатраты 457,9',
  },
);

const cleaningWinterManualProductionInventorySource = detailSource(
  'cleaning',
  4,
  'производственная программа / зимняя ручная уборка / СИЗ и инвентарь',
  {
    quote:
      'Сапоги резиновые 0,9; Мыло туалетное 10,8; Износ оборудования, инструментов: Ледоруб-топор 0,2; Метла 4,5; Грабли 0,3; Лопата снегоуборочная 0,5; Лопата совковая 0,5; Тачка садовая 0,5; Ведро п\\э 12л 0,3',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [cleaningWinterManualPpeRubberBootsResourceId],
        quantity: detailQuantity(0.9, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [cleaningWinterManualPpeSoapResourceId],
        quantity: detailQuantity(10.8, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Ледоруб-топор',
        resource_ids: [cleaningWinterManualInventoryIceAxeResourceId],
        quantity: detailQuantity(0.2, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Метла',
        resource_ids: [
          cleaningWinterManualInventoryPolypropyleneBroomResourceId,
        ],
        quantity: detailQuantity(4.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Грабли',
        resource_ids: [cleaningWinterManualInventoryRakeResourceId],
        quantity: detailQuantity(0.3, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Лопата снегоуборочная',
        resource_ids: [cleaningWinterManualInventorySnowShovelResourceId],
        quantity: detailQuantity(0.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Лопата совковая',
        resource_ids: [cleaningWinterManualInventoryScoopShovelResourceId],
        quantity: detailQuantity(0.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Тачка садовая',
        resource_ids: [cleaningWinterManualInventoryWheelbarrowResourceId],
        quantity: detailQuantity(0.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Ведро п\\э 12л',
        resource_ids: [cleaningWinterManualInventoryBucketResourceId],
        quantity: detailQuantity(0.3, 'шт.'),
      }),
    ),
  },
);

const cleaningWinterManualSnowSweepingSource = detailSource(
  'cleaning',
  13,
  'позиция 2.1 / подметание свежевыпавшего снега вручную',
  {
    quote:
      'Подметание свежевыпавшего снега ... 48 706,24; Затраты труда Рабочий по уборке территории 73 664,15 48 706,24',
  },
);

const cleaningWinterManualAntiIceSource = detailSource(
  'cleaning',
  14,
  'позиция 2.2 / подсыпка противогололедным материалом',
  {
    quote:
      'Подсыпка территории противогололедным материалом ... 24 232,30; Рабочий по уборке территории 29 664,15 19 383,10; Песок для посыпки дорог 3 т. 1800,00 4 849,20; ИТОГО ПО ПОЗИЦИИ 51 407,39',
  },
);

const cleaningWinterManualRoadSnowIceSource = detailSource(
  'cleaning',
  15,
  'позиция 2.3 / очистка участков территорий от снега и наледи',
  {
    quote:
      'Рабочий по уборке территории 1265 664,15 840 033,57; страховые взносы 253 690,14; общеэксплуатационные расходы 588 023,50; прибыль 336 013,43; ИТОГО ПО ПОЗИЦИИ 2 017 760,64',
  },
);

const cleaningWinterManualContainerSiteSource = detailSource(
  'cleaning',
  15,
  'позиция 2.4 / очистка контейнерной площадки в холодный период',
  {
    quote:
      'Очистка контейнерной площадки в холодный период - ежедневно ... 304 125,64; Рабочий по уборке территории 458 664,15 304 125,64; ИТОГО ПО ПОЗИЦИИ 730 509,79',
  },
);

const cleaningWinterManualPpeSource = detailSource(
  'cleaning',
  16,
  'позиция 2.5 / средства охраны труда для зимней ручной уборки',
  {
    quote:
      'Костюм 4 950,00; Куртка 2 160,00; Жилет 1 080,00; Сапоги утепленные 1 260,00; Перчатки 1 260,00; Рукавицы 2 520,00; Сапоги резиновые 1 800,00; Мыло 1 252,80; ИТОГО 16 282,80',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [cleaningWinterManualPpeCottonSuitResourceId],
        quantity: detailQuantity(0.9, 'шт.'),
        unit_price_rub: detailMoney(5_500),
        total_rub: detailMoney(4_950),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [cleaningWinterManualPpeInsulatedJacketResourceId],
        quantity: detailQuantity(0.4, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(6_000),
        total_rub: detailMoney(2_160),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [cleaningWinterManualPpeSignalVestResourceId],
        quantity: detailQuantity(0.9, 'шт.'),
        unit_price_rub: detailMoney(1_200),
        total_rub: detailMoney(1_080),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [cleaningWinterManualPpeInsulatedBootsResourceId],
        quantity: detailQuantity(0.4, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(3_500),
        total_rub: detailMoney(1_260),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [cleaningWinterManualPpePolymerGlovesResourceId],
        quantity: detailQuantity(3.6, 'шт.'),
        unit_price_rub: detailMoney(350),
        total_rub: detailMoney(1_260),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [cleaningWinterManualPpeInsulatedMittensResourceId],
        quantity: detailQuantity(3.6, 'шт.'),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(2_520),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [cleaningWinterManualPpeRubberBootsResourceId],
        quantity: detailQuantity(0.9, 'шт.'),
        unit_price_rub: detailMoney(2_000),
        total_rub: detailMoney(1_800),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [cleaningWinterManualPpeSoapResourceId],
        quantity: detailQuantity(10.8, 'шт.'),
        unit_price_rub: detailMoney(116),
        total_rub: detailMoney(1_252.8),
      }),
    ),
  },
);

const cleaningWinterManualInventorySource = detailSource(
  'cleaning',
  17,
  'позиция 2.7 / износ оборудования и инструментов для зимней ручной уборки',
  {
    quote:
      'Ледоруб-топор 126,00; Метла полипропиленовая 1 665,00; Грабли 148,50; Лопата снегоуборочная 1 125,00; Лопата совковая 465,30; Тачка садовая 1 125,00; Ведро п\\э 12л 59,40; ИТОГО 4 714,20',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Ледоруб-топор',
        resource_ids: [cleaningWinterManualInventoryIceAxeResourceId],
        quantity: detailQuantity(0.2, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(126),
      }),
      detailSourceQuoteItem({
        label: 'Метла полипропиленовая',
        resource_ids: [
          cleaningWinterManualInventoryPolypropyleneBroomResourceId,
        ],
        quantity: detailQuantity(4.5, 'шт.'),
        unit_price_rub: detailMoney(370),
        total_rub: detailMoney(1_665),
      }),
      detailSourceQuoteItem({
        label: 'Грабли',
        resource_ids: [cleaningWinterManualInventoryRakeResourceId],
        quantity: detailQuantity(0.3, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(500),
        total_rub: detailMoney(148.5),
      }),
      detailSourceQuoteItem({
        label: 'Лопата снегоуборочная',
        resource_ids: [cleaningWinterManualInventorySnowShovelResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(2_500),
        total_rub: detailMoney(1_125),
      }),
      detailSourceQuoteItem({
        label: 'Лопата совковая',
        resource_ids: [cleaningWinterManualInventoryScoopShovelResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(1_034),
        total_rub: detailMoney(465.3),
      }),
      detailSourceQuoteItem({
        label: 'Тачка садовая',
        resource_ids: [cleaningWinterManualInventoryWheelbarrowResourceId],
        quantity: detailQuantity(0.5, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(2_500),
        total_rub: detailMoney(1_125),
      }),
      detailSourceQuoteItem({
        label: 'Ведро п\\э 12л',
        resource_ids: [cleaningWinterManualInventoryBucketResourceId],
        quantity: detailQuantity(0.3, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(200),
        total_rub: detailMoney(59.4),
      }),
    ),
  },
);

const cleaningWinterManualTotalsSource = detailSource(
  'cleaning',
  17,
  'итого по разделу зимней ручной уборки территории',
  {
    quote:
      'Прямые затраты 1 238 094,75; страховые взносы 366 099,05; общеэксплуатационные расходы 848 573,98; прибыль 484 899,42; Итого 2 937 667,20; Основная зарплата 1 212 248,55; Материальные затраты 25 846,20',
  },
);

const cleaningSummerMechanizedProductionWateringSource = detailSource(
  'cleaning',
  4,
  'производственная программа / летняя механизированная уборка / полив водой (обеспыливание)',
  {
    quote:
      'Дороги (асфальт). Полив водой (обеспыливание) - 3 раза в день без дождя; V-X; кратность 234; объем 81,8; Трактор МТЗ 80 ... 22389; Оборудование поливомоечное ОПМ-5,0 (бочка) 22389; Вода 9568,0 м³',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Трактор МТЗ 80',
        resource_ids: [cleaningSummerMechanizedWateringTractorResourceId],
        quantity: detailQuantity(22_389, 'маш.-час'),
      }),
      detailSourceQuoteItem({
        label: 'Оборудование поливомоечное ОПМ-5,0 (бочка)',
        resource_ids: [cleaningSummerMechanizedWateringOpm5ResourceId],
        quantity: detailQuantity(22_389, 'маш.-час'),
      }),
      detailSourceQuoteItem({
        label: 'Вода',
        resource_ids: [cleaningSummerMechanizedWaterResourceId],
        quantity: detailQuantity(9_568, 'м³'),
      }),
    ),
    note: 'Кратность 234 относится именно к поливу. В агрегированной строке estimate-2026 частота 153 раз/год относится к летней уборке территории в целом; почему расчетный полив чаще и почему эти частоты отличаются, в cleaning.pdf не поясняется.',
  },
);

const cleaningSummerMechanizedProductionPpeSource = detailSource(
  'cleaning',
  5,
  'производственная программа / летняя механизированная уборка / СИЗ',
  {
    quote:
      'Средства охраны труда (спецодежда, смывающие средства); Костюм хлопчатобумажный 11,4; Куртка 4,6; Жилет 11,4; Сапоги утепленные 4,6; Перчатки 45,6; Рукавицы 45,6; Сапоги резиновые 11,4; Мыло туалетное 136,8',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [cleaningSummerMechanizedPpeCottonSuitResourceId],
        quantity: detailQuantity(11.4, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [cleaningSummerMechanizedPpeInsulatedJacketResourceId],
        quantity: detailQuantity(4.6, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [cleaningSummerMechanizedPpeSignalVestResourceId],
        quantity: detailQuantity(11.4, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [cleaningSummerMechanizedPpeInsulatedBootsResourceId],
        quantity: detailQuantity(4.6, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [cleaningSummerMechanizedPpePolymerGlovesResourceId],
        quantity: detailQuantity(45.6, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [cleaningSummerMechanizedPpeInsulatedMittensResourceId],
        quantity: detailQuantity(45.6, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [cleaningSummerMechanizedPpeRubberBootsResourceId],
        quantity: detailQuantity(11.4, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [cleaningSummerMechanizedPpeSoapResourceId],
        quantity: detailQuantity(136.8, 'шт.'),
      }),
    ),
  },
);

const cleaningSummerMechanizedWateringSource = detailSource(
  'cleaning',
  18,
  'позиция 3.1 / дороги (асфальт), полив водой (обеспыливание)',
  {
    quote:
      'Дороги (асфальт). Полив водой (обеспыливание) - 3 раза в день без дождя; Машинист 22389 934,32 20 918 659,44; Трактор МТЗ 80 ... 33 046 889,80; ОПМ-5,0 (бочка) 2 426 952,22; Вода 9568 13,56 129 742,08; ИТОГО ПО ПОЗИЦИИ 85 850 204,08',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Машинист',
        resource_ids: [cleaningSummerMechanizedWateringMachinistResourceId],
        quantity: detailQuantity(22_389, 'чел-час'),
        unit_price_rub: detailMoney(934.32),
        total_rub: detailMoney(20_918_659.44),
      }),
      detailSourceQuoteItem({
        label: 'Трактор МТЗ 80',
        resource_ids: [cleaningSummerMechanizedWateringTractorResourceId],
        quantity: detailQuantity(22_389, 'маш-час'),
        unit_price_rub: detailMoney(1_476.02),
        total_rub: detailMoney(33_046_889.8),
      }),
      detailSourceQuoteItem({
        label: 'ОПМ-5,0 (бочка)',
        resource_ids: [cleaningSummerMechanizedWateringOpm5ResourceId],
        quantity: detailQuantity(22_389, 'маш-час'),
        unit_price_rub: detailMoney(108.4),
        total_rub: detailMoney(2_426_952.22),
      }),
      detailSourceQuoteItem({
        label: 'Вода',
        resource_ids: [cleaningSummerMechanizedWaterResourceId],
        quantity: detailQuantity(9_568, 'м³'),
        unit_price_rub: detailMoney(13.56),
        total_rub: detailMoney(129_742.08),
      }),
    ),
  },
);

const cleaningSummerMechanizedPpeHeaderSource = detailSource(
  'cleaning',
  18,
  'позиция 3.2 / средства охраны труда для летней механизированной уборки',
  {
    quote:
      'Средства охраны труда (спецодежда, смывающие средства); 11,40 чел.; 18 092,00; 206 248,80',
  },
);

const cleaningSummerMechanizedPpeMaterialsSource = detailSource(
  'cleaning',
  19,
  'позиция 3.2 / материалы СИЗ для летней механизированной уборки',
  {
    quote:
      'Костюм хлопчатобумажный 62 700,00; Куртка на утепляющей прокладке 27 360,00; Жилет сигнальный 13 680,00; Сапоги утепленные 15 960,00; Перчатки 15 960,00; Рукавицы 31 920,00; Сапоги резиновые 22 800,00; Мыло туалетное 15 868,80; ИТОГО ПО ПОЗИЦИИ 206 248,80',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [cleaningSummerMechanizedPpeCottonSuitResourceId],
        quantity: detailQuantity(11.4, 'шт.'),
        unit_price_rub: detailMoney(5_500),
        total_rub: detailMoney(62_700),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [cleaningSummerMechanizedPpeInsulatedJacketResourceId],
        quantity: detailQuantity(4.6, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(6_000),
        total_rub: detailMoney(27_360),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [cleaningSummerMechanizedPpeSignalVestResourceId],
        quantity: detailQuantity(11.4, 'шт.'),
        unit_price_rub: detailMoney(1_200),
        total_rub: detailMoney(13_680),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [cleaningSummerMechanizedPpeInsulatedBootsResourceId],
        quantity: detailQuantity(4.6, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(3_500),
        total_rub: detailMoney(15_960),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [cleaningSummerMechanizedPpePolymerGlovesResourceId],
        quantity: detailQuantity(45.6, 'шт.'),
        unit_price_rub: detailMoney(350),
        total_rub: detailMoney(15_960),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [cleaningSummerMechanizedPpeInsulatedMittensResourceId],
        quantity: detailQuantity(45.6, 'шт.'),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(31_920),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [cleaningSummerMechanizedPpeRubberBootsResourceId],
        quantity: detailQuantity(11.4, 'шт.'),
        unit_price_rub: detailMoney(2_000),
        total_rub: detailMoney(22_800),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [cleaningSummerMechanizedPpeSoapResourceId],
        quantity: detailQuantity(136.8, 'шт.'),
        unit_price_rub: detailMoney(116),
        total_rub: detailMoney(15_868.8),
      }),
    ),
  },
);

const cleaningSummerMechanizedTotalsSource = detailSource(
  'cleaning',
  19,
  'итого по разделу летней механизированной уборки',
  {
    quote:
      'Прямые затраты 56 728 492,34; страховые взносы 6 317 435,15; общеэксплуатационные расходы 14 643 061,61; прибыль 8 367 463,78; Итого 86 056 452,88; Машины 35 473 842,02; Зарплата машинистов 20 918 659,44; Материальные затраты 335 990,88',
  },
);

const cleaningSummerManualProductionWorksSource = detailSource(
  'cleaning',
  5,
  'производственная программа / летняя ручная уборка / кромка, парковки и контейнерная площадка',
  {
    quote:
      'Летняя ручная уборка территории; трудозатраты 24738,0; Бордюрный камень ... кратность 153; объем 0,055; трудозатраты 164,9; Парковочные/иные площадки. Уборка территории от случайного мусора ... кратность 153; объем 449; трудозатраты 88,2; Подметание территории ... кратность 22; трудозатраты 13,2; Контейнерная площадка ... кратность 153; объем 36; трудозатраты 134,0',
  },
);

const cleaningSummerManualProductionDitchSource = detailSource(
  'cleaning',
  6,
  'производственная программа / летняя ручная уборка / открытые ливневые траншеи',
  {
    quote:
      'Очистка открытых ливневых траншей вдоль дорог вручную (15 раз в летний период); V-X; кратность 15; объем 327,1; трудозатраты 24337,7',
  },
);

const cleaningSummerManualProductionPpeInventorySource = detailSource(
  'cleaning',
  6,
  'производственная программа / летняя ручная уборка / СИЗ и инвентарь',
  {
    quote:
      'Средства охраны труда: Костюм хлопчатобумажный 12,5; Куртка 5,0; Жилет 12,5; Сапоги утепленные 5,0; Перчатки 50,0; Рукавицы 50,0; Сапоги резиновые 12,5; Мыло 150,0; Износ оборудования, инструментов: Метла 62,5; Грабли 4,1; Лопата совковая 6,3; Тачка садовая 6,3; Ведро п\\э 12л 4,1',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [cleaningSummerManualPpeCottonSuitResourceId],
        quantity: detailQuantity(12.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [cleaningSummerManualPpeInsulatedJacketResourceId],
        quantity: detailQuantity(5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [cleaningSummerManualPpeSignalVestResourceId],
        quantity: detailQuantity(12.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [cleaningSummerManualPpeInsulatedBootsResourceId],
        quantity: detailQuantity(5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [cleaningSummerManualPpePolymerGlovesResourceId],
        quantity: detailQuantity(50, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [cleaningSummerManualPpeInsulatedMittensResourceId],
        quantity: detailQuantity(50, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [cleaningSummerManualPpeRubberBootsResourceId],
        quantity: detailQuantity(12.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [cleaningSummerManualPpeSoapResourceId],
        quantity: detailQuantity(150, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Метла полипропиленовая',
        resource_ids: [
          cleaningSummerManualInventoryPolypropyleneBroomResourceId,
        ],
        quantity: detailQuantity(62.5, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Грабли',
        resource_ids: [cleaningSummerManualInventoryRakeResourceId],
        quantity: detailQuantity(4.1, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Лопата совковая',
        resource_ids: [cleaningSummerManualInventoryScoopShovelResourceId],
        quantity: detailQuantity(6.3, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Тачка садовая',
        resource_ids: [cleaningSummerManualInventoryWheelbarrowResourceId],
        quantity: detailQuantity(6.3, 'шт.'),
      }),
      detailSourceQuoteItem({
        label: 'Ведро п\\э 12л',
        resource_ids: [cleaningSummerManualInventoryBucketResourceId],
        quantity: detailQuantity(4.1, 'шт.'),
      }),
    ),
  },
);

const cleaningSummerManualCurbCleaningSource = detailSource(
  'cleaning',
  20,
  'позиция 4.1 / очистка кромки вдоль бортового камня',
  {
    quote:
      'Бордюрный камень. Очистка кромки проезжей части вдоль бортового камня от грязи и мусора вручную - ежедневно; Рабочий по уборке территории 165 664,15 109 540,22; страховые взносы 33 081,15; общеэксплуатационные расходы 76 678,16; прибыль 43 816,09; ИТОГО ПО ПОЗИЦИИ 263 115,62',
  },
);

const cleaningSummerManualParkingTrashSource = detailSource(
  'cleaning',
  20,
  'позиция 4.2 / уборка парковочных и иных площадок от случайного мусора',
  {
    quote:
      'Парковочные/иные площадки. Уборка территории от случайного мусора - 1 раз в день; Рабочий по уборке территории 88 664,15 58 551,86',
  },
);

const cleaningSummerManualParkingSweepingSource = detailSource(
  'cleaning',
  21,
  'позиция 4.3 / подметание парковочных и иных площадок',
  {
    quote:
      'Парковочные/иные площадки. Подметание территории - 1 раз в неделю; Рабочий по уборке территории 13 664,15 8 747,24; ИТОГО ПО ПОЗИЦИИ 21 010,88',
  },
);

const cleaningSummerManualContainerSiteSource = detailSource(
  'cleaning',
  22,
  'позиция 4.4 / очистка контейнерной площадки в теплый период',
  {
    quote:
      'Контейнерная площадка. Очистка контейнерной площадки в теплый период - 1 раз в день; Рабочий по уборке территории 134 664,15 89 014,13; ИТОГО ПО ПОЗИЦИИ 213 811,95',
  },
);

const cleaningSummerManualDitchCleaningSource = detailSource(
  'cleaning',
  22,
  'позиция 4.5 / очистка открытых ливневых траншей вдоль дорог',
  {
    quote:
      'Очистка открытых ливневых траншей вдоль дорог вручную (15 раз в летний период); Рабочий по уборке территории 24338 664,15 16 163 799,83; ИТОГО ПО ПОЗИЦИИ 38 825 447,20',
  },
);

const cleaningSummerManualPpeSource = detailSource(
  'cleaning',
  23,
  'позиция 4.6 / средства охраны труда для летней ручной уборки',
  {
    quote:
      'Костюм хлопчатобумажный 68 750,00; Куртка на утепляющей прокладке 30 000,00; Жилет сигнальный 15 000,00; Сапоги утепленные 17 500,00; Перчатки 17 500,00; Рукавицы 35 000,00; Сапоги резиновые 25 000,00; Мыло туалетное 17 400,00; ИТОГО ПО ПОЗИЦИИ 226 150,00',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм хлопчатобумажный',
        resource_ids: [cleaningSummerManualPpeCottonSuitResourceId],
        quantity: detailQuantity(12.5, 'шт.'),
        unit_price_rub: detailMoney(5_500),
        total_rub: detailMoney(68_750),
      }),
      detailSourceQuoteItem({
        label: 'Куртка на утепляющей прокладке',
        resource_ids: [cleaningSummerManualPpeInsulatedJacketResourceId],
        quantity: detailQuantity(5, 'шт.'),
        unit_price_rub: detailMoney(6_000),
        total_rub: detailMoney(30_000),
      }),
      detailSourceQuoteItem({
        label: 'Жилет сигнальный',
        resource_ids: [cleaningSummerManualPpeSignalVestResourceId],
        quantity: detailQuantity(12.5, 'шт.'),
        unit_price_rub: detailMoney(1_200),
        total_rub: detailMoney(15_000),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        resource_ids: [cleaningSummerManualPpeInsulatedBootsResourceId],
        quantity: detailQuantity(5, 'шт.'),
        unit_price_rub: detailMoney(3_500),
        total_rub: detailMoney(17_500),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки с полимерным покрытием',
        resource_ids: [cleaningSummerManualPpePolymerGlovesResourceId],
        quantity: detailQuantity(50, 'шт.'),
        unit_price_rub: detailMoney(350),
        total_rub: detailMoney(17_500),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы утепленные',
        resource_ids: [cleaningSummerManualPpeInsulatedMittensResourceId],
        quantity: detailQuantity(50, 'шт.'),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(35_000),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        resource_ids: [cleaningSummerManualPpeRubberBootsResourceId],
        quantity: detailQuantity(12.5, 'шт.'),
        unit_price_rub: detailMoney(2_000),
        total_rub: detailMoney(25_000),
      }),
      detailSourceQuoteItem({
        label: 'Мыло туалетное',
        resource_ids: [cleaningSummerManualPpeSoapResourceId],
        quantity: detailQuantity(150, 'шт.'),
        unit_price_rub: detailMoney(116),
        total_rub: detailMoney(17_400),
      }),
    ),
  },
);

const cleaningSummerManualInventorySource = detailSource(
  'cleaning',
  24,
  'позиция 4.7 / износ оборудования и инструментов для летней ручной уборки',
  {
    quote:
      'Метла полипропиленовая 23 125,00; Грабли с черенком 2 062,50; Лопата совковая 6 462,50; Тачка садовая 15 625,00; Ведро п\\э 12л 825,00; ИТОГО ПО ПОЗИЦИИ 48 100,00',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Метла полипропиленовая',
        resource_ids: [
          cleaningSummerManualInventoryPolypropyleneBroomResourceId,
        ],
        quantity: detailQuantity(62.5, 'шт.'),
        unit_price_rub: detailMoney(370),
        total_rub: detailMoney(23_125),
      }),
      detailSourceQuoteItem({
        label: 'Грабли с черенком',
        resource_ids: [cleaningSummerManualInventoryRakeResourceId],
        quantity: detailQuantity(4.1, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(500),
        total_rub: detailMoney(2_062.5),
      }),
      detailSourceQuoteItem({
        label: 'Лопата совковая',
        resource_ids: [cleaningSummerManualInventoryScoopShovelResourceId],
        quantity: detailQuantity(6.3, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(1_034),
        total_rub: detailMoney(6_462.5),
      }),
      detailSourceQuoteItem({
        label: 'Тачка садовая',
        resource_ids: [cleaningSummerManualInventoryWheelbarrowResourceId],
        quantity: detailQuantity(6.3, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(2_500),
        total_rub: detailMoney(15_625),
      }),
      detailSourceQuoteItem({
        label: 'Ведро п\\э 12л',
        resource_ids: [cleaningSummerManualInventoryBucketResourceId],
        quantity: detailQuantity(4.1, 'шт.', {
          note: cleaningRoundedQuantityNote,
        }),
        unit_price_rub: detailMoney(200),
        total_rub: detailMoney(825),
      }),
    ),
  },
);

const cleaningSummerManualTotalsSource = detailSource(
  'cleaning',
  24,
  'итого по разделу летней ручной уборки территории',
  {
    quote:
      'Прямые затраты 16 703 903,28; страховые взносы 4 961 755,30; общеэксплуатационные расходы 11 500 757,30; прибыль 6 571 861,32; Итого 39 738 277,20; Основная зарплата 16 429 653,29; Материальные затраты 274 250,00',
  },
);

const cleaningDocumentVatSource = detailSource(
  'cleaning',
  25,
  'итоги локального ресурсного сметного расчета по уборке территории',
  {
    quote: 'ВСЕГО по документу 148 826 305,16; НДС 5% 7 441 315,26',
  },
);

const cleaningResourceStatementLaborSource = detailSource(
  'cleaning',
  26,
  'ресурсная ведомость по локальному ресурсному сметному расчету / труд',
  {
    quote:
      'Рабочий по уборке территории 26563,3 664,15 17 641 901,84; Машинист 27739,3 934,32 25 917 429,40',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Рабочий по уборке территории',
        quantity: detailQuantity(26_563.3, 'чел-час'),
        unit_price_rub: detailMoney(664.15),
        total_rub: detailMoney(17_641_901.84),
      }),
      detailSourceQuoteItem({
        label: 'Машинист',
        quantity: detailQuantity(27_739.3, 'чел-час'),
        unit_price_rub: detailMoney(934.32),
        total_rub: detailMoney(25_917_429.4),
      }),
    ),
  },
);

const cleaningResourceStatementMachinesSource = detailSource(
  'cleaning',
  26,
  'ресурсная ведомость по локальному ресурсному сметному расчету / машины и механизмы',
  {
    quote:
      'Трактор МТЗ 80 с навесным оборудованием 27739,3 1476,02 40 943 848,99; Навесной разбрасыватель песка РПМ-01 210,4 40,8 8 574,51; ОПМ-5,0 (бочка) 22389,2 108,4 2 426 952,22',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Трактор МТЗ 80 с навесным оборудованием',
        resource_ids: [
          cleaningWinterMechanizedSnow2cmTractorResourceId,
          cleaningWinterMechanizedHeavySnowTractorResourceId,
          cleaningWinterMechanizedSandTractorResourceId,
          cleaningSummerMechanizedWateringTractorResourceId,
        ],
        quantity: detailQuantity(27_739.3, 'маш.-час'),
        unit_price_rub: detailMoney(1_476.02),
        total_rub: detailMoney(40_943_848.99),
      }),
      detailSourceQuoteItem({
        label: 'Навесной разбрасыватель песка РПМ-01',
        resource_ids: [cleaningWinterMechanizedSandSpreaderResourceId],
        quantity: detailQuantity(210.4, 'маш.-час'),
        unit_price_rub: detailMoney(40.8),
        total_rub: detailMoney(8_574.51),
      }),
      detailSourceQuoteItem({
        label: 'ОПМ-5,0 (бочка)',
        resource_ids: [cleaningSummerMechanizedWateringOpm5ResourceId],
        quantity: detailQuantity(22_389.2, 'маш.-час'),
        unit_price_rub: detailMoney(108.4),
        total_rub: detailMoney(2_426_952.22),
      }),
    ),
  },
);

const cleaningResourceStatementMaterialsSource = detailSource(
  'cleaning',
  26,
  'ресурсная ведомость по локальному ресурсному сметному расчету / материалы',
  {
    quote:
      'Костюм 151 250,00; Куртка 66 000,00; Жилет 33 000,00; Сапоги утепленные 38 500,00; Перчатки 38 500,00; Рукавицы 77 000,00; Сапоги резиновые 55 000,00; Мыло 38 280,00; инвентарь 52 194,20; Песок для посыпки дорог кг. 76,3 1800,00 137 329,56; Вода 9568,0 13,56 129 742,08',
    quote_items: detailSourceQuoteItems(
      detailSourceQuoteItem({
        label: 'Костюм',
        quantity: detailQuantity(27.5, 'шт.'),
        unit_price_rub: detailMoney(5_500),
        total_rub: detailMoney(151_250),
      }),
      detailSourceQuoteItem({
        label: 'Куртка',
        quantity: detailQuantity(11, 'шт.'),
        unit_price_rub: detailMoney(6_000),
        total_rub: detailMoney(66_000),
      }),
      detailSourceQuoteItem({
        label: 'Жилет',
        quantity: detailQuantity(27.5, 'шт.'),
        unit_price_rub: detailMoney(1_200),
        total_rub: detailMoney(33_000),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги утепленные',
        quantity: detailQuantity(11, 'шт.'),
        unit_price_rub: detailMoney(3_500),
        total_rub: detailMoney(38_500),
      }),
      detailSourceQuoteItem({
        label: 'Перчатки',
        quantity: detailQuantity(110, 'шт.'),
        unit_price_rub: detailMoney(350),
        total_rub: detailMoney(38_500),
      }),
      detailSourceQuoteItem({
        label: 'Рукавицы',
        quantity: detailQuantity(110, 'шт.'),
        unit_price_rub: detailMoney(700),
        total_rub: detailMoney(77_000),
      }),
      detailSourceQuoteItem({
        label: 'Сапоги резиновые',
        quantity: detailQuantity(27.5, 'шт.'),
        unit_price_rub: detailMoney(2_000),
        total_rub: detailMoney(55_000),
      }),
      detailSourceQuoteItem({
        label: 'Мыло',
        quantity: detailQuantity(330, 'шт.'),
        unit_price_rub: detailMoney(116),
        total_rub: detailMoney(38_280),
      }),
      detailSourceQuoteItem({
        label: 'Инвентарь',
        total_rub: detailMoney(52_194.2),
        note: 'Это сводная строка legacy quote для инвентаря; в PDF инвентарь раскрыт строками 9-15, поэтому единой единицы, количества и цены нет.',
      }),
      detailSourceQuoteItem({
        label: 'Песок для посыпки дорог',
        resource_ids: [
          cleaningWinterMechanizedSandResourceId,
          cleaningWinterManualSandResourceId,
        ],
        quantity: detailQuantity(76.3, 'кг.', {
          note: cleaningResourceStatementSandUnitNeedsCheckReason,
        }),
        unit_price_rub: detailMoney(1_800),
        total_rub: detailMoney(137_329.56),
      }),
      detailSourceQuoteItem({
        label: 'Вода',
        resource_ids: [cleaningSummerMechanizedWaterResourceId],
        quantity: detailQuantity(9_568, 'м³'),
        unit_price_rub: detailMoney(13.56),
        total_rub: detailMoney(129_742.08),
      }),
    ),
  },
);

const cleaningCalculationSource = detailSource(
  'cleaning',
  27,
  'калькуляция себестоимости услуг по уборке территории',
  {
    quote:
      'ИТОГО расходов 131 402 572; налог по УСН 2 613 560; прибыль 17 423 732; Доходов - всего 151 439 865',
  },
);

const cleaningResourceStatementRoundingNote =
  'Ресурсная ведомость показывает годовые количества с большей точностью, чем часть строковых позиций; рублевые итоги сверяются по source totals.';
const cleaningVatNeedsCheckNote =
  'Прямой НДС 7 441 315,26 в локальном расчете равен 5% от 148 826 305,16 до УСН; агрегированная смета уборки сходится с НДС 5% от калькуляционных доходов 151 439 865.';
const cleaningDerivedVatNeedsCheckReason =
  'cleaning.pdf показывает НДС 5% двумя несовпадающими способами: прямой НДС в локальном расчете и расчетный НДС от калькуляционных доходов; строковая доля выведена для сверки с estimate-2026.';
const cleaningDerivedVatNeedsCheckRefs = detailSourceRefs(
  cleaningWinterMechanizedTotalsSource,
  cleaningDocumentVatSource,
  cleaningCalculationSource,
);
const cleaningWinterManualDerivedVatNeedsCheckRefs = detailSourceRefs(
  cleaningWinterManualTotalsSource,
  cleaningDocumentVatSource,
  cleaningCalculationSource,
);
const cleaningSummerMechanizedDerivedVatNeedsCheckRefs = detailSourceRefs(
  cleaningSummerMechanizedTotalsSource,
  cleaningDocumentVatSource,
  cleaningCalculationSource,
);
const cleaningSummerManualDerivedVatNeedsCheckRefs = detailSourceRefs(
  cleaningSummerManualTotalsSource,
  cleaningDocumentVatSource,
  cleaningCalculationSource,
);

const cleaningWinterMechanizedMachinistResourceIds = [
  cleaningWinterMechanizedSnow2cmMachinistResourceId,
  cleaningWinterMechanizedHeavySnowMachinistResourceId,
  cleaningWinterMechanizedSandMachinistResourceId,
] as const;
const cleaningWinterMechanizedMachineResourceIds = [
  cleaningWinterMechanizedSnow2cmTractorResourceId,
  cleaningWinterMechanizedHeavySnowTractorResourceId,
  cleaningWinterMechanizedSandTractorResourceId,
  cleaningWinterMechanizedSandSpreaderResourceId,
] as const;
const cleaningWinterMechanizedMaterialResourceIds = [
  cleaningWinterMechanizedSandResourceId,
  cleaningWinterMechanizedPpeCottonSuitResourceId,
  cleaningWinterMechanizedPpeInsulatedJacketResourceId,
  cleaningWinterMechanizedPpeSignalVestResourceId,
  cleaningWinterMechanizedPpeInsulatedBootsResourceId,
  cleaningWinterMechanizedPpePolymerGlovesResourceId,
  cleaningWinterMechanizedPpeInsulatedMittensResourceId,
  cleaningWinterMechanizedPpeRubberBootsResourceId,
  cleaningWinterMechanizedPpeSoapResourceId,
] as const;
const cleaningWinterMechanizedGrossResourceIds = [
  ...cleaningWinterMechanizedMachinistResourceIds,
  ...cleaningWinterMechanizedMachineResourceIds,
  ...cleaningWinterMechanizedMaterialResourceIds,
  cleaningWinterMechanizedInsuranceResourceId,
  cleaningWinterMechanizedOverheadResourceId,
  cleaningWinterMechanizedProfitResourceId,
  cleaningWinterMechanizedUsnResourceId,
  cleaningWinterMechanizedVatResourceId,
] as const;

const cleaningWinterManualLaborResourceIds = [
  cleaningWinterManualSnowSweepingWorkerResourceId,
  cleaningWinterManualAntiIceWorkerResourceId,
  cleaningWinterManualRoadSnowIceWorkerResourceId,
  cleaningWinterManualContainerSiteWorkerResourceId,
] as const;
const cleaningWinterManualPpeResourceIds = [
  cleaningWinterManualPpeCottonSuitResourceId,
  cleaningWinterManualPpeInsulatedJacketResourceId,
  cleaningWinterManualPpeSignalVestResourceId,
  cleaningWinterManualPpeInsulatedBootsResourceId,
  cleaningWinterManualPpePolymerGlovesResourceId,
  cleaningWinterManualPpeInsulatedMittensResourceId,
  cleaningWinterManualPpeRubberBootsResourceId,
  cleaningWinterManualPpeSoapResourceId,
] as const;
const cleaningWinterManualInventoryResourceIds = [
  cleaningWinterManualInventoryIceAxeResourceId,
  cleaningWinterManualInventoryPolypropyleneBroomResourceId,
  cleaningWinterManualInventoryRakeResourceId,
  cleaningWinterManualInventorySnowShovelResourceId,
  cleaningWinterManualInventoryScoopShovelResourceId,
  cleaningWinterManualInventoryWheelbarrowResourceId,
  cleaningWinterManualInventoryBucketResourceId,
] as const;
const cleaningWinterManualMaterialResourceIds = [
  cleaningWinterManualSandResourceId,
  ...cleaningWinterManualPpeResourceIds,
  ...cleaningWinterManualInventoryResourceIds,
] as const;
const cleaningWinterManualGrossResourceIds = [
  ...cleaningWinterManualLaborResourceIds,
  ...cleaningWinterManualMaterialResourceIds,
  cleaningWinterManualInsuranceResourceId,
  cleaningWinterManualOverheadResourceId,
  cleaningWinterManualProfitResourceId,
  cleaningWinterManualUsnResourceId,
  cleaningWinterManualVatResourceId,
] as const;

const cleaningSummerMechanizedMachinistResourceIds = [
  cleaningSummerMechanizedWateringMachinistResourceId,
] as const;
const cleaningSummerMechanizedMachineResourceIds = [
  cleaningSummerMechanizedWateringTractorResourceId,
  cleaningSummerMechanizedWateringOpm5ResourceId,
] as const;
const cleaningSummerMechanizedPpeResourceIds = [
  cleaningSummerMechanizedPpeCottonSuitResourceId,
  cleaningSummerMechanizedPpeInsulatedJacketResourceId,
  cleaningSummerMechanizedPpeSignalVestResourceId,
  cleaningSummerMechanizedPpeInsulatedBootsResourceId,
  cleaningSummerMechanizedPpePolymerGlovesResourceId,
  cleaningSummerMechanizedPpeInsulatedMittensResourceId,
  cleaningSummerMechanizedPpeRubberBootsResourceId,
  cleaningSummerMechanizedPpeSoapResourceId,
] as const;
const cleaningSummerMechanizedMaterialResourceIds = [
  cleaningSummerMechanizedWaterResourceId,
  ...cleaningSummerMechanizedPpeResourceIds,
] as const;
const cleaningSummerMechanizedGrossResourceIds = [
  ...cleaningSummerMechanizedMachinistResourceIds,
  ...cleaningSummerMechanizedMachineResourceIds,
  ...cleaningSummerMechanizedMaterialResourceIds,
  cleaningSummerMechanizedInsuranceResourceId,
  cleaningSummerMechanizedOverheadResourceId,
  cleaningSummerMechanizedProfitResourceId,
  cleaningSummerMechanizedUsnResourceId,
  cleaningSummerMechanizedVatResourceId,
] as const;

const cleaningSummerManualLaborResourceIds = [
  cleaningSummerManualCurbCleaningWorkerResourceId,
  cleaningSummerManualParkingTrashWorkerResourceId,
  cleaningSummerManualParkingSweepingWorkerResourceId,
  cleaningSummerManualContainerSiteWorkerResourceId,
  cleaningSummerManualDitchCleaningWorkerResourceId,
] as const;
const cleaningSummerManualPpeResourceIds = [
  cleaningSummerManualPpeCottonSuitResourceId,
  cleaningSummerManualPpeInsulatedJacketResourceId,
  cleaningSummerManualPpeSignalVestResourceId,
  cleaningSummerManualPpeInsulatedBootsResourceId,
  cleaningSummerManualPpePolymerGlovesResourceId,
  cleaningSummerManualPpeInsulatedMittensResourceId,
  cleaningSummerManualPpeRubberBootsResourceId,
  cleaningSummerManualPpeSoapResourceId,
] as const;
const cleaningSummerManualInventoryResourceIds = [
  cleaningSummerManualInventoryPolypropyleneBroomResourceId,
  cleaningSummerManualInventoryRakeResourceId,
  cleaningSummerManualInventoryScoopShovelResourceId,
  cleaningSummerManualInventoryWheelbarrowResourceId,
  cleaningSummerManualInventoryBucketResourceId,
] as const;
const cleaningSummerManualMaterialResourceIds = [
  ...cleaningSummerManualPpeResourceIds,
  ...cleaningSummerManualInventoryResourceIds,
] as const;
const cleaningSummerManualGrossResourceIds = [
  ...cleaningSummerManualLaborResourceIds,
  ...cleaningSummerManualMaterialResourceIds,
  cleaningSummerManualInsuranceResourceId,
  cleaningSummerManualOverheadResourceId,
  cleaningSummerManualProfitResourceId,
  cleaningSummerManualUsnResourceId,
  cleaningSummerManualVatResourceId,
] as const;

const cleaningResourceStatementPrimarySalaryResourceIds = [
  ...cleaningWinterManualLaborResourceIds,
  ...cleaningSummerManualLaborResourceIds,
] as const;
const cleaningResourceStatementMachinistSalaryResourceIds = [
  ...cleaningWinterMechanizedMachinistResourceIds,
  ...cleaningSummerMechanizedMachinistResourceIds,
] as const;
const cleaningResourceStatementMachineResourceIds = [
  ...cleaningWinterMechanizedMachineResourceIds,
  ...cleaningSummerMechanizedMachineResourceIds,
] as const;
const cleaningResourceStatementMaterialResourceIds = [
  ...cleaningWinterMechanizedMaterialResourceIds,
  ...cleaningWinterManualMaterialResourceIds,
  ...cleaningSummerMechanizedMaterialResourceIds,
  ...cleaningSummerManualMaterialResourceIds,
] as const;

export const cleaningWorkItems = [
  detailWorkItem({
    id: 'cleaning-winter-mechanized',
    title: 'Зимняя механизированная уборка территории',
    estimate_row_id: 'cleaning-winter-mechanized',
    service_ids: [
      'winter-road-snow-ice-clearing',
      'winter-heavy-snowfall-road-clearing',
      'winter-anti-ice-spreading',
    ],
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSnowSource,
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedTotalsSource,
    ),
    note: 'Внутри агрегированной строки сохранены позиции 1.1-1.4: обычное подметание снега, подметание при обильном снегопаде, посыпка песком и СИЗ.',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'cleaning-winter-manual',
    title: 'Зимняя ручная уборка территории',
    estimate_row_id: 'cleaning-winter-manual',
    service_ids: [
      'winter-paths-playgrounds-clearing',
      'winter-anti-ice-spreading',
    ],
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionSnowSource,
      cleaningWinterManualProductionWorksSource,
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualTotalsSource,
    ),
    note: 'Внутри агрегированной строки сохранены позиции 2.1-2.7: ручное подметание снега, подсыпка песком, очистка участков дорог от снега и наледи, контейнерная площадка, СИЗ и инвентарь. В PDF нет позиции 2.6.',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'cleaning-summer-mechanized',
    title:
      'Летняя механизированная уборка: Дороги (асфальт). Полив водой (обеспыливание) - 3 раза в день без дождя',
    estimate_row_id: 'cleaning-summer-mechanized',
    service_ids: ['summer-road-dust-suppression', 'summer-road-watering'],
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionWateringSource,
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedTotalsSource,
    ),
    note: 'Внутри агрегированной строки сохранены позиции 3.1-3.2: полив водой (обеспыливание) 3 раза в день без дождя, вода, поливомоечная техника и СИЗ. Производственная программа показывает кратность 234 именно для полива. В агрегированной строке estimate-2026 частота 153 раз/год относится к летней уборке территории в целом; почему расчетный полив чаще и почему эти частоты отличаются, в cleaning.pdf не поясняется.',
    ...detailStatus('verified'),
  }),
  detailWorkItem({
    id: 'cleaning-summer-manual',
    title: 'Летняя ручная уборка территории',
    estimate_row_id: 'cleaning-summer-manual',
    service_ids: [
      'summer-road-manual-cleaning',
      'summer-road-gutters-cleaning',
    ],
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionWorksSource,
      cleaningSummerManualProductionDitchSource,
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualTotalsSource,
    ),
    note: 'Внутри агрегированной строки сохранены позиции 4.1-4.7: очистка кромки вдоль бортового камня 153 раза, уборка случайного мусора на парковочных и иных площадках 153 раза, подметание парковочных и иных площадок 22 раза, очистка контейнерной площадки 153 раза, очистка открытых ливневых траншей 15 раз в летний период, СИЗ и инвентарь.',
    ...detailStatus('verified'),
  }),
] satisfies readonly EstimateDetailWorkItem[];

export const cleaningResources = [
  detailResource({
    id: cleaningWinterMechanizedSnow2cmMachinistResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'machinist_labor',
    title: 'Машинист: подметание свежевыпавшего снега толщиной 2 см',
    cost_bucket: 'machinist_salary',
    quantity: detailQuantity(2_160, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(934.32),
    total_rub: detailMoney(2_018_293.38),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSnowSource,
      cleaningStaffSource,
      cleaningWinterMechanizedSnow2cmSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedHeavySnowMachinistResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'machinist_labor',
    title: 'Машинист: подметание снега толщиной свыше 2 см',
    cost_bucket: 'machinist_salary',
    quantity: detailQuantity(2_980, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(934.32),
    total_rub: detailMoney(2_783_931.69),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSnowSource,
      cleaningStaffSource,
      cleaningWinterMechanizedHeavySnowSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedSandMachinistResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'machinist_labor',
    title: 'Машинист: посыпка дорог песком',
    cost_bucket: 'machinist_salary',
    quantity: detailQuantity(210, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(934.32),
    total_rub: detailMoney(196_544.88),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningStaffSource,
      cleaningWinterMechanizedSandSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedSnow2cmTractorResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'machine',
    title: 'Трактор МТЗ 80 с навесным оборудованием: подметание снега 2 см',
    cost_bucket: 'machines',
    quantity: detailQuantity(2_160, 'маш-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_476.02),
    total_rub: detailMoney(3_188_460.49),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSnowSource,
      cleaningWinterMechanizedSnow2cmSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedHeavySnowTractorResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'machine',
    title:
      'Трактор МТЗ 80 с навесным оборудованием: подметание снега свыше 2 см',
    cost_bucket: 'machines',
    quantity: detailQuantity(2_980, 'маш-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_476.02),
    total_rub: detailMoney(4_398_000.94),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSnowSource,
      cleaningWinterMechanizedHeavySnowSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedSandTractorResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'machine',
    title: 'Трактор МТЗ 80 с навесным оборудованием: посыпка дорог песком',
    cost_bucket: 'machines',
    quantity: detailQuantity(210, 'маш-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_476.02),
    total_rub: detailMoney(310_497.76),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedSandSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedSandSpreaderResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'machine',
    title: 'Навесной разбрасыватель песка РПМ-01',
    cost_bucket: 'machines',
    quantity: detailQuantity(210, 'маш-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(40.76),
    total_rub: detailMoney(8_574.51),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedSandSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedSandResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Песок для посыпки дорог',
    cost_bucket: 'materials',
    quantity: detailQuantity(73.6, 'т.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_800),
    total_rub: detailMoney(132_480.36),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedSandSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpeCottonSuitResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Костюм хлопчатобумажный',
    cost_bucket: 'materials',
    quantity: detailQuantity(2.7, 'шт.'),
    unit_price_rub: detailMoney(5_500),
    total_rub: detailMoney(14_850),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpeInsulatedJacketResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Куртка на утепляющей прокладке',
    cost_bucket: 'materials',
    quantity: detailQuantity(1.1, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(6_480),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpeSignalVestResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Жилет сигнальный',
    cost_bucket: 'materials',
    quantity: detailQuantity(2.7, 'шт.'),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(3_240),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpeInsulatedBootsResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Сапоги утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(1.1, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(3_500),
    total_rub: detailMoney(3_780),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpePolymerGlovesResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Перчатки с полимерным покрытием',
    cost_bucket: 'materials',
    quantity: detailQuantity(10.8, 'шт.'),
    unit_price_rub: detailMoney(350),
    total_rub: detailMoney(3_780),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpeInsulatedMittensResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Рукавицы утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(10.8, 'шт.'),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(7_560),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpeRubberBootsResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Сапоги резиновые',
    cost_bucket: 'materials',
    quantity: detailQuantity(2.7, 'шт.'),
    unit_price_rub: detailMoney(2_000),
    total_rub: detailMoney(5_400),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedPpeSoapResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'material',
    title: 'Мыло туалетное',
    cost_bucket: 'materials',
    quantity: detailQuantity(32.4, 'шт.'),
    unit_price_rub: detailMoney(116),
    total_rub: detailMoney(3_758.4),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedProductionSandSource,
      cleaningWinterMechanizedPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedInsuranceResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'other_cost',
    title: 'Страховые взносы по зимней механизированной уборке',
    cost_bucket: 'insurance',
    total_rub: detailMoney(1_509_628.52),
    source_refs: detailSourceRefs(cleaningWinterMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedOverheadResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по зимней механизированной уборке',
    cost_bucket: 'overhead',
    total_rub: detailMoney(3_499_138.97),
    source_refs: detailSourceRefs(cleaningWinterMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedProfitResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'other_cost',
    title: 'Прибыль по зимней механизированной уборке',
    cost_bucket: 'profit',
    total_rub: detailMoney(1_999_507.98),
    source_refs: detailSourceRefs(cleaningWinterMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterMechanizedUsnResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по зимней механизированной уборке',
    cost_bucket: 'usn',
    total_rub: detailMoney(352_872.12, {
      note: 'выведено из строки estimate-2026 и итога раздела cleaning.pdf',
    }),
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'В cleaning.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: cleaningWinterMechanizedVatResourceId,
    work_item_id: 'cleaning-winter-mechanized',
    estimate_row_id: 'cleaning-winter-mechanized',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по зимней механизированной уборке',
    cost_bucket: 'vat',
    total_rub: detailMoney(1_022_339, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningDerivedVatNeedsCheckRefs,
    ),
  }),
  detailResource({
    id: cleaningWinterManualSnowSweepingWorkerResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: подметание свежевыпавшего снега вручную',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(73.3, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(48_706.24),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionSnowSource,
      cleaningStaffSource,
      cleaningWinterManualSnowSweepingSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualAntiIceWorkerResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: подсыпка противогололедным материалом',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(29.2, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(19_383.1),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionWorksSource,
      cleaningStaffSource,
      cleaningWinterManualAntiIceSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualRoadSnowIceWorkerResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: очистка участков от снега и наледи при механизированной уборке',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(1_264.8, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(840_033.57),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionWorksSource,
      cleaningStaffSource,
      cleaningWinterManualRoadSnowIceSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualContainerSiteWorkerResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: очистка контейнерной площадки в холодный период',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(457.9, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(304_125.64),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionWorksSource,
      cleaningStaffSource,
      cleaningWinterManualContainerSiteSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualSandResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Песок для посыпки дорог',
    cost_bucket: 'materials',
    quantity: detailQuantity(2.7, 'т.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_800),
    total_rub: detailMoney(4_849.2),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionWorksSource,
      cleaningWinterManualAntiIceSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpeCottonSuitResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Костюм хлопчатобумажный',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.9, 'шт.'),
    unit_price_rub: detailMoney(5_500),
    total_rub: detailMoney(4_950),
    source_refs: detailSourceRefs(cleaningWinterManualPpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpeInsulatedJacketResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Куртка на утепляющей прокладке',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.4, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(2_160),
    source_refs: detailSourceRefs(cleaningWinterManualPpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpeSignalVestResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Жилет сигнальный',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.9, 'шт.'),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(1_080),
    source_refs: detailSourceRefs(cleaningWinterManualPpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpeInsulatedBootsResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Сапоги утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.4, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(3_500),
    total_rub: detailMoney(1_260),
    source_refs: detailSourceRefs(cleaningWinterManualPpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpePolymerGlovesResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Перчатки с полимерным покрытием',
    cost_bucket: 'materials',
    quantity: detailQuantity(3.6, 'шт.'),
    unit_price_rub: detailMoney(350),
    total_rub: detailMoney(1_260),
    source_refs: detailSourceRefs(cleaningWinterManualPpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpeInsulatedMittensResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Рукавицы утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(3.6, 'шт.'),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(2_520),
    source_refs: detailSourceRefs(cleaningWinterManualPpeSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpeRubberBootsResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Сапоги резиновые',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.9, 'шт.'),
    unit_price_rub: detailMoney(2_000),
    total_rub: detailMoney(1_800),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualPpeSoapResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Мыло туалетное',
    cost_bucket: 'materials',
    quantity: detailQuantity(10.8, 'шт.'),
    unit_price_rub: detailMoney(116),
    total_rub: detailMoney(1_252.8),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInventoryIceAxeResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Ледоруб-топор с металлической ручкой',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.2, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(126),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInventoryPolypropyleneBroomResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Метла полипропиленовая с черенком',
    cost_bucket: 'materials',
    quantity: detailQuantity(4.5, 'шт.'),
    unit_price_rub: detailMoney(370),
    total_rub: detailMoney(1_665),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInventoryRakeResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Грабли с черенком',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.3, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(500),
    total_rub: detailMoney(148.5),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInventorySnowShovelResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Лопата снегоуборочная оцинкованная',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(2_500),
    total_rub: detailMoney(1_125),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInventoryScoopShovelResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Лопата совковая',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_034),
    total_rub: detailMoney(465.3),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInventoryWheelbarrowResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Тачка садовая',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.5, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(2_500),
    total_rub: detailMoney(1_125),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInventoryBucketResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'material',
    title: 'Ведро п\\э 12 л',
    cost_bucket: 'materials',
    quantity: detailQuantity(0.3, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(200),
    total_rub: detailMoney(59.4),
    source_refs: detailSourceRefs(
      cleaningWinterManualProductionInventorySource,
      cleaningWinterManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualInsuranceResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'other_cost',
    title: 'Страховые взносы по зимней ручной уборке',
    cost_bucket: 'insurance',
    total_rub: detailMoney(366_099.05),
    source_refs: detailSourceRefs(cleaningWinterManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualOverheadResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по зимней ручной уборке',
    cost_bucket: 'overhead',
    total_rub: detailMoney(848_573.98),
    source_refs: detailSourceRefs(cleaningWinterManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualProfitResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'other_cost',
    title: 'Прибыль по зимней ручной уборке',
    cost_bucket: 'profit',
    total_rub: detailMoney(484_899.42),
    source_refs: detailSourceRefs(cleaningWinterManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningWinterManualUsnResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по зимней ручной уборке',
    cost_bucket: 'usn',
    total_rub: detailMoney(51_588.99, {
      note: 'выведено из строки estimate-2026 и итога раздела cleaning.pdf',
    }),
    source_refs: detailSourceRefs(
      cleaningWinterManualTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'В cleaning.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: cleaningWinterManualVatResourceId,
    work_item_id: 'cleaning-winter-manual',
    estimate_row_id: 'cleaning-winter-manual',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по зимней ручной уборке',
    cost_bucket: 'vat',
    total_rub: detailMoney(149_462.81, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningWinterManualDerivedVatNeedsCheckRefs,
    ),
  }),
  detailResource({
    id: cleaningSummerMechanizedWateringMachinistResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'machinist_labor',
    title: 'Машинист: полив дорог водой (обеспыливание)',
    cost_bucket: 'machinist_salary',
    quantity: detailQuantity(22_389, 'чел-час'),
    unit_price_rub: detailMoney(934.32),
    total_rub: detailMoney(20_918_659.44),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionWateringSource,
      cleaningStaffSource,
      cleaningSummerMechanizedWateringSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedWateringTractorResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'machine',
    title: 'Трактор МТЗ 80 с навесным оборудованием: полив дорог',
    cost_bucket: 'machines',
    quantity: detailQuantity(22_389, 'маш-час'),
    unit_price_rub: detailMoney(1_476.02),
    total_rub: detailMoney(33_046_889.8),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionWateringSource,
      cleaningSummerMechanizedWateringSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedWateringOpm5ResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'machine',
    title: 'Оборудование поливомоечное ОПМ-5,0 (бочка)',
    cost_bucket: 'machines',
    quantity: detailQuantity(22_389, 'маш-час'),
    unit_price_rub: detailMoney(108.4),
    total_rub: detailMoney(2_426_952.22),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionWateringSource,
      cleaningSummerMechanizedWateringSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedWaterResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Вода для полива дорог (обеспыливание)',
    cost_bucket: 'materials',
    quantity: detailQuantity(9_568, 'м³'),
    unit_price_rub: detailMoney(13.56),
    total_rub: detailMoney(129_742.08),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionWateringSource,
      cleaningSummerMechanizedWateringSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpeCottonSuitResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Костюм хлопчатобумажный',
    cost_bucket: 'materials',
    quantity: detailQuantity(11.4, 'шт.'),
    unit_price_rub: detailMoney(5_500),
    total_rub: detailMoney(62_700),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpeInsulatedJacketResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Куртка на утепляющей прокладке',
    cost_bucket: 'materials',
    quantity: detailQuantity(4.6, 'шт.'),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(27_360),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpeSignalVestResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Жилет сигнальный',
    cost_bucket: 'materials',
    quantity: detailQuantity(11.4, 'шт.'),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(13_680),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpeInsulatedBootsResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Сапоги утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(4.6, 'шт.'),
    unit_price_rub: detailMoney(3_500),
    total_rub: detailMoney(15_960),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpePolymerGlovesResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Перчатки с полимерным покрытием',
    cost_bucket: 'materials',
    quantity: detailQuantity(45.6, 'шт.'),
    unit_price_rub: detailMoney(350),
    total_rub: detailMoney(15_960),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpeInsulatedMittensResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Рукавицы утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(45.6, 'шт.'),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(31_920),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpeRubberBootsResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Сапоги резиновые',
    cost_bucket: 'materials',
    quantity: detailQuantity(11.4, 'шт.'),
    unit_price_rub: detailMoney(2_000),
    total_rub: detailMoney(22_800),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedPpeSoapResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'material',
    title: 'Мыло туалетное',
    cost_bucket: 'materials',
    quantity: detailQuantity(136.8, 'шт.'),
    unit_price_rub: detailMoney(116),
    total_rub: detailMoney(15_868.8),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedProductionPpeSource,
      cleaningSummerMechanizedPpeHeaderSource,
      cleaningSummerMechanizedPpeMaterialsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedInsuranceResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'other_cost',
    title: 'Страховые взносы по летней механизированной уборке',
    cost_bucket: 'insurance',
    total_rub: detailMoney(6_317_435.15),
    source_refs: detailSourceRefs(cleaningSummerMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedOverheadResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по летней механизированной уборке',
    cost_bucket: 'overhead',
    total_rub: detailMoney(14_643_061.61),
    source_refs: detailSourceRefs(cleaningSummerMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedProfitResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'other_cost',
    title: 'Прибыль по летней механизированной уборке',
    cost_bucket: 'profit',
    total_rub: detailMoney(8_367_463.78),
    source_refs: detailSourceRefs(cleaningSummerMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerMechanizedUsnResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по летней механизированной уборке',
    cost_bucket: 'usn',
    total_rub: detailMoney(1_511_249.98, {
      note: 'выведено из строки estimate-2026 и итога раздела cleaning.pdf',
    }),
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'В cleaning.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: cleaningSummerMechanizedVatResourceId,
    work_item_id: 'cleaning-summer-mechanized',
    estimate_row_id: 'cleaning-summer-mechanized',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по летней механизированной уборке',
    cost_bucket: 'vat',
    total_rub: detailMoney(4_378_385.14, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningSummerMechanizedDerivedVatNeedsCheckRefs,
    ),
  }),
  detailResource({
    id: cleaningSummerManualCurbCleaningWorkerResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'labor',
    title: 'Рабочий по уборке территории: очистка кромки вдоль бортового камня',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(164.9, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(109_540.22),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionWorksSource,
      cleaningStaffSource,
      cleaningSummerManualCurbCleaningSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualParkingTrashWorkerResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: уборка парковочных и иных площадок от случайного мусора',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(88.2, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(58_551.86),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionWorksSource,
      cleaningStaffSource,
      cleaningSummerManualParkingTrashSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualParkingSweepingWorkerResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: подметание парковочных и иных площадок',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(13.2, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(8_747.24),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionWorksSource,
      cleaningStaffSource,
      cleaningSummerManualParkingSweepingSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualContainerSiteWorkerResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: очистка контейнерной площадки в теплый период',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(134, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(89_014.13),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionWorksSource,
      cleaningStaffSource,
      cleaningSummerManualContainerSiteSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualDitchCleaningWorkerResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'labor',
    title:
      'Рабочий по уборке территории: очистка открытых ливневых траншей вдоль дорог вручную',
    cost_bucket: 'primary_salary',
    quantity: detailQuantity(24_337.7, 'чел-час', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(664.15),
    total_rub: detailMoney(16_163_799.83),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionDitchSource,
      cleaningStaffSource,
      cleaningSummerManualDitchCleaningSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpeCottonSuitResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Костюм хлопчатобумажный',
    cost_bucket: 'materials',
    quantity: detailQuantity(12.5, 'шт.'),
    unit_price_rub: detailMoney(5_500),
    total_rub: detailMoney(68_750),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpeInsulatedJacketResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Куртка на утепляющей прокладке',
    cost_bucket: 'materials',
    quantity: detailQuantity(5, 'шт.'),
    unit_price_rub: detailMoney(6_000),
    total_rub: detailMoney(30_000),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpeSignalVestResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Жилет сигнальный',
    cost_bucket: 'materials',
    quantity: detailQuantity(12.5, 'шт.'),
    unit_price_rub: detailMoney(1_200),
    total_rub: detailMoney(15_000),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpeInsulatedBootsResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Сапоги утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(5, 'шт.'),
    unit_price_rub: detailMoney(3_500),
    total_rub: detailMoney(17_500),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpePolymerGlovesResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Перчатки с полимерным покрытием',
    cost_bucket: 'materials',
    quantity: detailQuantity(50, 'шт.'),
    unit_price_rub: detailMoney(350),
    total_rub: detailMoney(17_500),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpeInsulatedMittensResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Рукавицы утепленные',
    cost_bucket: 'materials',
    quantity: detailQuantity(50, 'шт.'),
    unit_price_rub: detailMoney(700),
    total_rub: detailMoney(35_000),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpeRubberBootsResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Сапоги резиновые',
    cost_bucket: 'materials',
    quantity: detailQuantity(12.5, 'шт.'),
    unit_price_rub: detailMoney(2_000),
    total_rub: detailMoney(25_000),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualPpeSoapResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Мыло туалетное',
    cost_bucket: 'materials',
    quantity: detailQuantity(150, 'шт.'),
    unit_price_rub: detailMoney(116),
    total_rub: detailMoney(17_400),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualPpeSource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualInventoryPolypropyleneBroomResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Метла полипропиленовая с черенком',
    cost_bucket: 'materials',
    quantity: detailQuantity(62.5, 'шт.'),
    unit_price_rub: detailMoney(370),
    total_rub: detailMoney(23_125),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualInventoryRakeResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Грабли с черенком',
    cost_bucket: 'materials',
    quantity: detailQuantity(4.1, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(500),
    total_rub: detailMoney(2_062.5),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualInventoryScoopShovelResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Лопата совковая',
    cost_bucket: 'materials',
    quantity: detailQuantity(6.3, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(1_034),
    total_rub: detailMoney(6_462.5),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualInventoryWheelbarrowResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Тачка садовая',
    cost_bucket: 'materials',
    quantity: detailQuantity(6.3, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(2_500),
    total_rub: detailMoney(15_625),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualInventoryBucketResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'material',
    title: 'Ведро п\\э 12 л',
    cost_bucket: 'materials',
    quantity: detailQuantity(4.1, 'шт.', {
      note: cleaningRoundedQuantityNote,
    }),
    unit_price_rub: detailMoney(200),
    total_rub: detailMoney(825),
    source_refs: detailSourceRefs(
      cleaningSummerManualProductionPpeInventorySource,
      cleaningSummerManualInventorySource,
    ),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualInsuranceResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'other_cost',
    title: 'Страховые взносы по летней ручной уборке',
    cost_bucket: 'insurance',
    total_rub: detailMoney(4_961_755.3),
    source_refs: detailSourceRefs(cleaningSummerManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualOverheadResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'other_cost',
    title: 'Общеэксплуатационные расходы по летней ручной уборке',
    cost_bucket: 'overhead',
    total_rub: detailMoney(11_500_757.3),
    source_refs: detailSourceRefs(cleaningSummerManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualProfitResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'other_cost',
    title: 'Прибыль по летней ручной уборке',
    cost_bucket: 'profit',
    total_rub: detailMoney(6_571_861.32),
    source_refs: detailSourceRefs(cleaningSummerManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailResource({
    id: cleaningSummerManualUsnResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'other_cost',
    title: 'Расчетная доля УСН по летней ручной уборке',
    cost_bucket: 'usn',
    total_rub: detailMoney(697_849.46, {
      note: 'выведено из строки estimate-2026 и сумм bucket-ов; итог раздела cleaning.pdf 39 738 277,20 отличается на 0,01 из-за округления',
    }),
    source_refs: detailSourceRefs(
      cleaningSummerManualTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'В cleaning.pdf УСН показан только общей суммой по услуге, без распределения по строкам.',
    ...detailStatus('derived'),
  }),
  detailResource({
    id: cleaningSummerManualVatResourceId,
    work_item_id: 'cleaning-summer-manual',
    estimate_row_id: 'cleaning-summer-manual',
    kind: 'other_cost',
    title: 'Расчетный НДС 5% по летней ручной уборке',
    cost_bucket: 'vat',
    total_rub: detailMoney(2_021_806.33, {
      note: 'выведено из строки estimate-2026',
    }),
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningSummerManualDerivedVatNeedsCheckRefs,
    ),
  }),
] satisfies readonly EstimateDetailResource[];

export const cleaningControlTotals = [
  detailControlTotal({
    id: 'cleaning-resource-statement-primary-salary',
    estimate_row_id: 'cleaning',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(17_641_901.84),
    detail_total_note:
      'Сумма округленных строковых ресурсов; ведомость дает 17 641 901,84.',
    tolerance_rub: 0.02,
    resource_ids: cleaningResourceStatementPrimarySalaryResourceIds,
    source_refs: detailSourceRefs(cleaningResourceStatementLaborSource),
    note: `${cleaningResourceStatementRoundingNote} Контроль по всей уборке: 26 563,3 чел-час рабочих.`,
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-resource-statement-machinist-salary',
    estimate_row_id: 'cleaning',
    cost_bucket: 'machinist_salary',
    source_total_rub: detailMoney(25_917_429.4),
    detail_total_note:
      'Сумма округленных строковых ресурсов; ведомость дает 25 917 429,40.',
    tolerance_rub: 0.02,
    resource_ids: cleaningResourceStatementMachinistSalaryResourceIds,
    source_refs: detailSourceRefs(cleaningResourceStatementLaborSource),
    note: `${cleaningResourceStatementRoundingNote} Контроль по всей уборке: 27 739,3 чел-час машинистов.`,
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-resource-statement-machines',
    estimate_row_id: 'cleaning',
    cost_bucket: 'machines',
    source_total_rub: detailMoney(43_379_375.72),
    tolerance_rub: 0.01,
    resource_ids: cleaningResourceStatementMachineResourceIds,
    source_refs: detailSourceRefs(cleaningResourceStatementMachinesSource),
    note: `${cleaningResourceStatementRoundingNote} Контроль по всей уборке: трактор 27 739,3 маш.-час, разбрасыватель 210,4 маш.-час, ОПМ-5,0 22 389,2 маш.-час.`,
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-resource-statement-materials',
    estimate_row_id: 'cleaning',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(817_415.84),
    tolerance_rub: 0.01,
    resource_ids: cleaningResourceStatementMaterialResourceIds,
    source_refs: detailSourceRefs(cleaningResourceStatementMaterialsSource),
    note: `${cleaningResourceStatementRoundingNote} Рублевые итоги материалов сходятся с ведомостью; единица песка в ведомости требует визуальной проверки.`,
    ...detailNeedsCheckStatus(
      cleaningResourceStatementSandUnitNeedsCheckReason,
      detailSourceRefs(cleaningResourceStatementMaterialsSource),
    ),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-machinist-salary',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'machinist_salary',
    source_total_rub: detailMoney(4_998_769.96),
    detail_total_note:
      'Сумма округленных позиций; итог раздела в PDF: 4 998 769,96.',
    tolerance_rub: 0.02,
    resource_ids: cleaningWinterMechanizedMachinistResourceIds,
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedSnow2cmSource,
      cleaningWinterMechanizedHeavySnowSource,
      cleaningWinterMechanizedHeavySnowTotalSource,
      cleaningWinterMechanizedSandSource,
      cleaningWinterMechanizedSandTotalSource,
      cleaningWinterMechanizedTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-machines',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'machines',
    source_total_rub: detailMoney(7_905_533.7),
    tolerance_rub: 0.01,
    resource_ids: cleaningWinterMechanizedMachineResourceIds,
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedSnow2cmSource,
      cleaningWinterMechanizedHeavySnowSource,
      cleaningWinterMechanizedHeavySnowTotalSource,
      cleaningWinterMechanizedSandSource,
      cleaningWinterMechanizedSandTotalSource,
      cleaningWinterMechanizedTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-materials',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(181_328.76),
    tolerance_rub: 0.01,
    resource_ids: cleaningWinterMechanizedMaterialResourceIds,
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedSandSource,
      cleaningWinterMechanizedSandTotalSource,
      cleaningWinterMechanizedPpeSource,
      cleaningWinterMechanizedTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-insurance',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(1_509_628.52),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterMechanizedInsuranceResourceId],
    source_refs: detailSourceRefs(cleaningWinterMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-overhead',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(3_499_138.97),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterMechanizedOverheadResourceId],
    source_refs: detailSourceRefs(cleaningWinterMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-profit',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(1_999_507.98),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterMechanizedProfitResourceId],
    source_refs: detailSourceRefs(cleaningWinterMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-usn',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(352_872.12),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterMechanizedUsnResourceId],
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'УСН выведен для строки, потому что cleaning.pdf показывает УСН только общей суммой по услуге.',
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-vat',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(1_022_339),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterMechanizedVatResourceId],
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningDerivedVatNeedsCheckRefs,
    ),
  }),
  detailControlTotal({
    id: 'cleaning-winter-mechanized-gross',
    estimate_row_id: 'cleaning-winter-mechanized',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(21_469_119),
    tolerance_rub: 0.01,
    resource_ids: cleaningWinterMechanizedGrossResourceIds,
    source_refs: detailSourceRefs(
      cleaningWinterMechanizedTotalsSource,
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningDerivedVatNeedsCheckRefs,
    ),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-primary-salary',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(1_212_248.55),
    tolerance_rub: 0.01,
    resource_ids: cleaningWinterManualLaborResourceIds,
    source_refs: detailSourceRefs(
      cleaningWinterManualSnowSweepingSource,
      cleaningWinterManualAntiIceSource,
      cleaningWinterManualRoadSnowIceSource,
      cleaningWinterManualContainerSiteSource,
      cleaningWinterManualTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-materials',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(25_846.2),
    tolerance_rub: 0.01,
    resource_ids: cleaningWinterManualMaterialResourceIds,
    source_refs: detailSourceRefs(
      cleaningWinterManualAntiIceSource,
      cleaningWinterManualPpeSource,
      cleaningWinterManualInventorySource,
      cleaningWinterManualTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-insurance',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(366_099.05),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterManualInsuranceResourceId],
    source_refs: detailSourceRefs(cleaningWinterManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-overhead',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(848_573.98),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterManualOverheadResourceId],
    source_refs: detailSourceRefs(cleaningWinterManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-profit',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(484_899.42),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterManualProfitResourceId],
    source_refs: detailSourceRefs(cleaningWinterManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-usn',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(51_588.99),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterManualUsnResourceId],
    source_refs: detailSourceRefs(
      cleaningWinterManualTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'УСН выведен для строки, потому что cleaning.pdf показывает УСН только общей суммой по услуге.',
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-vat',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(149_462.81),
    tolerance_rub: 0.01,
    resource_ids: [cleaningWinterManualVatResourceId],
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningWinterManualDerivedVatNeedsCheckRefs,
    ),
  }),
  detailControlTotal({
    id: 'cleaning-winter-manual-gross',
    estimate_row_id: 'cleaning-winter-manual',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(3_138_719),
    tolerance_rub: 0.01,
    resource_ids: cleaningWinterManualGrossResourceIds,
    source_refs: detailSourceRefs(
      cleaningWinterManualTotalsSource,
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningWinterManualDerivedVatNeedsCheckRefs,
    ),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-machinist-salary',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'machinist_salary',
    source_total_rub: detailMoney(20_918_659.44),
    tolerance_rub: 0.01,
    resource_ids: cleaningSummerMechanizedMachinistResourceIds,
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedWateringSource,
      cleaningSummerMechanizedTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-machines',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'machines',
    source_total_rub: detailMoney(35_473_842.02),
    tolerance_rub: 0.01,
    resource_ids: cleaningSummerMechanizedMachineResourceIds,
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedWateringSource,
      cleaningSummerMechanizedTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-materials',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(335_990.88),
    tolerance_rub: 0.01,
    resource_ids: cleaningSummerMechanizedMaterialResourceIds,
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedWateringSource,
      cleaningSummerMechanizedPpeMaterialsSource,
      cleaningSummerMechanizedTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-insurance',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(6_317_435.15),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerMechanizedInsuranceResourceId],
    source_refs: detailSourceRefs(cleaningSummerMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-overhead',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(14_643_061.61),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerMechanizedOverheadResourceId],
    source_refs: detailSourceRefs(cleaningSummerMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-profit',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(8_367_463.78),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerMechanizedProfitResourceId],
    source_refs: detailSourceRefs(cleaningSummerMechanizedTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-usn',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(1_511_249.98),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerMechanizedUsnResourceId],
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'УСН выведен для строки, потому что cleaning.pdf показывает УСН только общей суммой по услуге.',
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-vat',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(4_378_385.14),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerMechanizedVatResourceId],
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningSummerMechanizedDerivedVatNeedsCheckRefs,
    ),
  }),
  detailControlTotal({
    id: 'cleaning-summer-mechanized-gross',
    estimate_row_id: 'cleaning-summer-mechanized',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(91_946_088),
    tolerance_rub: 0.01,
    resource_ids: cleaningSummerMechanizedGrossResourceIds,
    source_refs: detailSourceRefs(
      cleaningSummerMechanizedTotalsSource,
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningSummerMechanizedDerivedVatNeedsCheckRefs,
    ),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-primary-salary',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'primary_salary',
    source_total_rub: detailMoney(16_429_653.29),
    detail_total_note:
      'Сумма округленных позиций; итог раздела в PDF: 16 429 653,29.',
    tolerance_rub: 0.02,
    resource_ids: cleaningSummerManualLaborResourceIds,
    source_refs: detailSourceRefs(
      cleaningSummerManualCurbCleaningSource,
      cleaningSummerManualParkingTrashSource,
      cleaningSummerManualParkingSweepingSource,
      cleaningSummerManualContainerSiteSource,
      cleaningSummerManualDitchCleaningSource,
      cleaningSummerManualTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-materials',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'materials',
    source_total_rub: detailMoney(274_250),
    tolerance_rub: 0.01,
    resource_ids: cleaningSummerManualMaterialResourceIds,
    source_refs: detailSourceRefs(
      cleaningSummerManualPpeSource,
      cleaningSummerManualInventorySource,
      cleaningSummerManualTotalsSource,
    ),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-insurance',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'insurance',
    source_total_rub: detailMoney(4_961_755.3),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerManualInsuranceResourceId],
    source_refs: detailSourceRefs(cleaningSummerManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-overhead',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'overhead',
    source_total_rub: detailMoney(11_500_757.3),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerManualOverheadResourceId],
    source_refs: detailSourceRefs(cleaningSummerManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-profit',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'profit',
    source_total_rub: detailMoney(6_571_861.32),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerManualProfitResourceId],
    source_refs: detailSourceRefs(cleaningSummerManualTotalsSource),
    ...detailStatus('verified'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-usn',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'usn',
    source_total_rub: detailMoney(697_849.46, {
      note: 'выведено из строки estimate-2026 и сумм bucket-ов; итог раздела cleaning.pdf 39 738 277,20 отличается на 0,01 из-за округления',
    }),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerManualUsnResourceId],
    source_refs: detailSourceRefs(
      cleaningSummerManualTotalsSource,
      cleaningCalculationSource,
    ),
    note: 'УСН выведен для строки, потому что cleaning.pdf показывает УСН только общей суммой по услуге.',
    ...detailStatus('derived'),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-vat',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'vat',
    source_total_rub: detailMoney(2_021_806.33),
    tolerance_rub: 0.01,
    resource_ids: [cleaningSummerManualVatResourceId],
    source_refs: detailSourceRefs(
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningSummerManualDerivedVatNeedsCheckRefs,
    ),
  }),
  detailControlTotal({
    id: 'cleaning-summer-manual-gross',
    estimate_row_id: 'cleaning-summer-manual',
    cost_bucket: 'gross',
    source_total_rub: detailMoney(42_457_933),
    detail_total_note:
      'Сумма ресурсов дает 42 457 932,99 из-за построчных округлений.',
    tolerance_rub: 0.02,
    resource_ids: cleaningSummerManualGrossResourceIds,
    source_refs: detailSourceRefs(
      cleaningSummerManualTotalsSource,
      cleaningDocumentVatSource,
      cleaningCalculationSource,
    ),
    note: cleaningVatNeedsCheckNote,
    ...detailNeedsCheckStatus(
      cleaningDerivedVatNeedsCheckReason,
      cleaningSummerManualDerivedVatNeedsCheckRefs,
    ),
  }),
] satisfies readonly EstimateDetailControlTotalInput[];
