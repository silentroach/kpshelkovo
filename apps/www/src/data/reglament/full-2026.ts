import type {
  FullReglamentAuditNote,
  FullReglamentCalculationAssumption,
  FullReglamentCommonAsset,
  FullReglamentDataset,
  FullReglamentQuantityStatus,
  FullReglamentQuantityValue,
  FullReglamentService,
  FullReglamentServiceToEstimateMapItem,
  FullReglamentSourceRef,
  FullReglamentVillage
} from '@/lib/reglament/full-schema';

const source = (
  page: number,
  fragment: string,
  extra?: Pick<FullReglamentSourceRef, 'quote' | 'note'>
): FullReglamentSourceRef => ({ pdf: 'full', page, fragment, ...extra });

const quantity = (
  raw: string,
  value: number | null,
  status?: FullReglamentQuantityStatus
): FullReglamentQuantityValue => ({
  raw,
  value,
  status: status ?? (value === null ? 'empty_cell' : 'present')
});

const valuesByVillage = (
  village: FullReglamentQuantityValue,
  forest: FullReglamentQuantityValue,
  park: FullReglamentQuantityValue,
  river: FullReglamentQuantityValue
): FullReglamentCommonAsset['values_by_village'] => ({
  'shelkovo-village': village,
  'shelkovo-forest': forest,
  'shelkovo-park': park,
  'shelkovo-river': river
});

const asset = (
  input: Omit<FullReglamentCommonAsset, 'values_by_village'> & {
    readonly values_by_village: readonly [
      FullReglamentQuantityValue,
      FullReglamentQuantityValue,
      FullReglamentQuantityValue,
      FullReglamentQuantityValue
    ];
  }
): FullReglamentCommonAsset => ({
  ...input,
  values_by_village: valuesByVillage(...input.values_by_village)
});

const service = (
  id: string,
  group: FullReglamentService['group'],
  groupLabel: string,
  row: string,
  title: string,
  frequencyRaw: string,
  frequencyNote: string | null = null
): FullReglamentService => {
  const quote = `${title}: ${frequencyRaw}`;

  return {
    id,
    group,
    title,
    frequency_raw: frequencyRaw,
    frequency_note: frequencyNote,
    source_refs: [
      source(135, `Приложение №4 / ${groupLabel} / строка ${row}`, {
        quote
      })
    ],
    quote
  };
};

const explicitFound = 'явно найдено';
const partial = 'частично';
const notFound = 'не найдено';
const needsCheck = 'требует проверки';

const villages = [
  {
    id: 'shelkovo-village',
    title: 'Шелково Вилладж',
    households_count: 507,
    land_area_sotka: 5031.42,
    land_area_share_percent: 24.61,
    land_area_share_kind: 'calculated_from_pdf',
    source_refs: [source(127, 'Приложение №1 / строки 1.1-1.2 / Шелково Вилладж')],
    verification_note: null
  },
  {
    id: 'shelkovo-forest',
    title: 'Шелково Форест',
    households_count: 361,
    land_area_sotka: 3768.87,
    land_area_share_percent: 18.44,
    land_area_share_kind: 'calculated_from_pdf',
    source_refs: [source(127, 'Приложение №1 / строки 1.1-1.2 / Шелково Форест')],
    verification_note: null
  },
  {
    id: 'shelkovo-park',
    title: 'Шелково Парк',
    households_count: 574,
    land_area_sotka: 6015.9,
    land_area_share_percent: 29.43,
    land_area_share_kind: 'calculated_from_pdf',
    source_refs: [source(127, 'Приложение №1 / строки 1.1-1.2 / Шелково Парк')],
    verification_note: null
  },
  {
    id: 'shelkovo-river',
    title: 'Шелково Ривер',
    households_count: 526,
    land_area_sotka: 5624.35,
    land_area_share_percent: 27.52,
    land_area_share_kind: 'calculated_from_pdf',
    source_refs: [source(127, 'Приложение №1 / строки 1.1-1.2 / Шелково Ривер')],
    verification_note: null
  }
] satisfies readonly FullReglamentVillage[];

const commonAssets = [
  asset({
    id: 'roads-asphalt',
    category: 'roads',
    title: 'Дороги (асфальт)',
    unit: 'м²',
    values_by_village: [
      quantity('4785', 4785),
      quantity('2750', 2750),
      quantity('5000', 5000),
      quantity('625', 625)
    ],
    total: quantity('13 160', 13160, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Дороги и тротуары / строка 1')],
    verification_note: null
  }),
  asset({
    id: 'roads-gravel',
    category: 'roads',
    title: 'Дороги без покрытия (щебеночные)',
    unit: 'м²',
    values_by_village: [
      quantity('10 565', 10565),
      quantity('26 343', 26343),
      quantity('10 350', 10350),
      quantity('21 360', 21360)
    ],
    total: quantity('68 618', 68618, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Дороги и тротуары / строка 1.1')],
    verification_note: null
  }),
  asset({
    id: 'roads-container-site',
    category: 'roads',
    title: 'Контейнерная площадка',
    unit: 'м²',
    values_by_village: [
      quantity('36', 36),
      quantity('-', null),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('36', 36, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Дороги и тротуары / строка 2')],
    verification_note: null
  }),
  asset({
    id: 'roads-speed-bumps',
    category: 'roads',
    title: 'Искусственные дорожные неровности (ИДН)',
    unit: 'шт.',
    values_by_village: [quantity('3', 3), quantity('3', 3), quantity('-', null), quantity('3', 3)],
    total: quantity('9', 9, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [
      source(128, 'Приложение №2 / Дороги и тротуары / строка 3', {
        note: 'Единица измерения не указана; по смыслу это количество в штуках.'
      })
    ],
    verification_note: null
  }),
  asset({
    id: 'roads-parking-sites',
    category: 'roads',
    title: 'Парковочные и иные площадки',
    unit: 'м²',
    values_by_village: [
      quantity('164,5', 164.5),
      quantity('164,5', 164.5),
      quantity('-', null),
      quantity('120', 120)
    ],
    total: quantity('449', 449, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Дороги и тротуары / строка 4')],
    verification_note: null
  }),
  asset({
    id: 'stormwater-open-ditches',
    category: 'stormwater',
    title: 'Открытые ливневые траншеи вдоль дорог',
    unit: 'п.м.',
    values_by_village: [
      quantity('6140', 6140),
      quantity('11 638', 11638),
      quantity('6140', 6140),
      quantity('8794', 8794)
    ],
    total: quantity('32 712', 32712, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Дороги и тротуары / строка 5')],
    verification_note: null
  }),
  asset({
    id: 'roads-curbstone',
    category: 'roads',
    title: 'Бордюрный камень',
    unit: 'п.м.',
    values_by_village: [
      quantity('110', 110),
      quantity('-', null),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('110', 110, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Дороги и тротуары / строка 6')],
    verification_note: null
  }),
  asset({
    id: 'green-mowing-area',
    category: 'greenery',
    title: 'Площадь окашиваемой территории вдоль дорог и ливневых траншей',
    unit: 'м²',
    values_by_village: [
      quantity('18 420', 18420),
      quantity('34 914', 34914),
      quantity('18 420', 18420),
      quantity('26 382', 26382)
    ],
    total: quantity('98 136', 98136, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Зеленые насаждения / строка 1')],
    verification_note: null
  }),
  asset({
    id: 'green-coniferous-trees',
    category: 'greenery',
    title: 'Хвойные деревья',
    unit: 'шт.',
    values_by_village: [
      quantity('221', 221),
      quantity('6', 6),
      quantity('221', 221),
      quantity('37', 37)
    ],
    total: quantity('485', 485, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Зеленые насаждения / строка 2')],
    verification_note: null
  }),
  asset({
    id: 'forest-deadwood-collection-area',
    category: 'forest',
    title: 'Площадь для сбора валежника в лесу',
    unit: 'м²',
    values_by_village: [
      quantity('-', null),
      quantity('5570', 5570),
      quantity('7600', 7600),
      quantity('116 436', 116436)
    ],
    total: quantity('129 606', 129606, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Зеленые насаждения / строка 3')],
    verification_note: null
  }),
  asset({
    id: 'improvement-playground-ground',
    category: 'improvement',
    title: 'Детская площадка на земляном основании',
    unit: 'м²',
    values_by_village: [
      quantity('900', 900),
      quantity('900', 900),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('1800', 1800, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Объекты благоустройства / строка 2')],
    verification_note: null
  }),
  asset({
    id: 'improvement-playground-elements',
    category: 'improvement',
    title: 'Элементы детского игрового комплекса',
    unit: 'шт.',
    values_by_village: [
      quantity('16', 16),
      quantity('17', 17),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('33', 33, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Объекты благоустройства / строка 3')],
    verification_note: null
  }),
  asset({
    id: 'improvement-sandbox-sand',
    category: 'improvement',
    title: 'Песочницы, 1 шт.',
    unit: 'м³ песка в год',
    values_by_village: [
      quantity('0,7', 0.7),
      quantity('0,7', 0.7),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('1,4', 1.4, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(128, 'Приложение №2 / Объекты благоустройства / строка 4')],
    verification_note: null
  }),
  asset({
    id: 'improvement-sports-ground',
    category: 'improvement',
    title: 'Спортивная площадка на земляном основании',
    unit: 'м²',
    values_by_village: [
      quantity('375', 375),
      quantity('400', 400),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('775', 775, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Объекты благоустройства / строка 5')],
    verification_note: null
  }),
  asset({
    id: 'improvement-sports-elements',
    category: 'improvement',
    title: 'Элементы спортивного комплекса',
    unit: 'шт.',
    values_by_village: [
      quantity('13', 13),
      quantity('15', 15),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('28', 28, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Объекты благоустройства / строка 8')],
    verification_note: null
  }),
  asset({
    id: 'improvement-water-area',
    category: 'improvement',
    title: 'Акватория',
    unit: 'м²',
    values_by_village: [
      quantity('-', null),
      quantity('-', null),
      quantity('2129', 2129),
      quantity('-', null)
    ],
    total: quantity('2129', 2129, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Объекты благоустройства / строка 11')],
    verification_note: null
  }),
  asset({
    id: 'improvement-fence-profile-sheet',
    category: 'improvement',
    title: 'Ограждение поселка (профлист)',
    unit: 'п.м.',
    values_by_village: [
      quantity('1151', 1151),
      quantity('1334', 1334),
      quantity('1151', 1151),
      quantity('8794', 8794)
    ],
    total: quantity('12 430', 12430, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Объекты благоустройства / строка 12')],
    verification_note: null
  }),
  asset({
    id: 'electric-street-lights-group',
    category: 'electricity',
    title: 'Уличные светильники',
    unit: null,
    values_by_village: [
      quantity('-', null),
      quantity('-', null),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('-', null, 'group_row'),
    total_mode: 'group_row',
    source_refs: [source(129, 'Приложение №2 / Электроснабжение / строка 1')],
    verification_note: null
  }),
  asset({
    id: 'electric-street-light-zhku-16-100-001',
    category: 'electricity',
    title: 'Уличный светильник ЖКУ 16-100-001',
    unit: 'шт.',
    values_by_village: [
      quantity('50', 50),
      quantity('72', 72),
      quantity('249', 249),
      quantity('135', 135)
    ],
    total: quantity('506', 506, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [
      source(129, 'Приложение №2 / Электроснабжение / строка 1.1', {
        note: 'Значение «100» относится к мощности светильника, 100 Вт; количество учтено в штуках.'
      })
    ],
    verification_note: null
  }),
  asset({
    id: 'electric-cable-line-length',
    category: 'electricity',
    title: 'Протяженность кабельной линии',
    unit: 'км.',
    values_by_village: [
      quantity('9,4', 9.4),
      quantity('7,5', 7.5),
      quantity('9,4', 9.4),
      quantity('16', 16)
    ],
    total: quantity('42,3', 42.3, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Электроснабжение / строка 2')],
    verification_note: null
  }),
  asset({
    id: 'electric-lighting-poles-metal',
    category: 'electricity',
    title: 'Металлические опоры освещения, высота 6 м',
    unit: 'м²',
    values_by_village: [
      quantity('140', 140),
      quantity('201,6', 201.6),
      quantity('697,2', 697.2),
      quantity('378', 378)
    ],
    total: quantity('1416,8', 1416.8, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [
      source(129, 'Приложение №2 / Электроснабжение / строка 3', {
        note: 'Единица «м²» подтверждена по PDF.'
      })
    ],
    verification_note: null
  }),
  asset({
    id: 'electric-krn-10kv',
    category: 'electricity',
    title: 'Комплектное устройство наружной установки КРН-10 кВ',
    unit: 'шт.',
    values_by_village: [
      quantity('-', null),
      quantity('-', null),
      quantity('-', null),
      quantity('1', 1)
    ],
    total: quantity('1', 1, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Электроснабжение / строка 4')],
    verification_note: null
  }),
  asset({
    id: 'electric-ktppnkkk',
    category: 'electricity',
    title: 'КТППНккк',
    unit: 'шт.',
    values_by_village: [
      quantity('-', null),
      quantity('-', null),
      quantity('2', 2),
      quantity('3', 3)
    ],
    total: quantity('5', 5, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [
      source(129, 'Приложение №2 / Электроснабжение / строка 5', {
        note: 'В PDF указано именно «КТППНккк»; вероятно это обозначение КТППН с суффиксом кабельного исполнения, но источник не раскрывает расшифровку.'
      })
    ],
    verification_note: null
  }),
  asset({
    id: 'electric-transformer-10kv-160kva',
    category: 'electricity',
    title: 'Трансформатор 10 кВ 160 кВа',
    unit: 'шт.',
    values_by_village: [
      quantity('-', null),
      quantity('-', null),
      quantity('2', 2),
      quantity('3', 3)
    ],
    total: quantity('5', 5, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Электроснабжение / строка 7')],
    verification_note: null
  }),
  asset({
    id: 'security-post-24h',
    category: 'security',
    title: 'Пост (круглосуточный)',
    unit: 'шт.',
    values_by_village: [quantity('1', 1), quantity('1', 1), quantity('1', 1), quantity('1', 1)],
    total: quantity('4', 4, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(129, 'Приложение №2 / Охрана / строка 1')],
    verification_note: null
  }),
  asset({
    id: 'security-patrol-route-km',
    category: 'security',
    title: 'Обходы и объезды на автомобиле, маршрут',
    unit: 'маршрут, км',
    values_by_village: [
      quantity('1', 1),
      quantity('1', 1),
      quantity('2,5', 2.5),
      quantity('2,5', 2.5)
    ],
    total: quantity('7', 7, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [
      source(130, 'Приложение №2 / Охрана / продолжение строки 1', {
        note: 'Строка продолжает таблицу после разрыва страницы.'
      })
    ],
    verification_note: null
  }),
  asset({
    id: 'security-patrol-times-per-day',
    category: 'security',
    title: 'Обходы и объезды на автомобиле, раз в сутки',
    unit: 'раз в сутки',
    values_by_village: [quantity('5', 5), quantity('5', 5), quantity('5', 5), quantity('5', 5)],
    total: quantity('не суммируется', null, 'not_summed'),
    total_mode: 'not_summed',
    source_refs: [
      source(130, 'Приложение №2 / Охрана / продолжение строки 1', {
        note: 'Показатель является периодичностью, а не инвентарной суммой.'
      })
    ],
    verification_note: null
  }),
  asset({
    id: 'security-barrier',
    category: 'security',
    title: 'Шлагбаум',
    unit: 'шт.',
    values_by_village: [quantity('1', 1), quantity('1', 1), quantity('-', null), quantity('1', 1)],
    total: quantity('3', 3, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(130, 'Приложение №2 / Охрана / строка 2')],
    verification_note: null
  }),
  asset({
    id: 'security-skud-trassir',
    category: 'security',
    title: 'СКУД Trassir',
    unit: 'шт.',
    values_by_village: [
      quantity('1', 1),
      quantity('4', 4),
      quantity('-', null),
      quantity('-', null)
    ],
    total: quantity('5', 5, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(130, 'Приложение №2 / Охрана / строка 3')],
    verification_note: null
  }),
  asset({
    id: 'security-cameras',
    category: 'security',
    title: 'Видеокамеры',
    unit: 'шт.',
    values_by_village: [
      quantity('16', 16),
      quantity('14', 14),
      quantity('-', null),
      quantity('4', 4)
    ],
    total: quantity('34', 34, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(130, 'Приложение №2 / Охрана / строка 4')],
    verification_note: null
  }),
  asset({
    id: 'security-monitors',
    category: 'security',
    title: 'Мониторы',
    unit: 'шт.',
    values_by_village: [quantity('1', 1), quantity('1', 1), quantity('-', null), quantity('1', 1)],
    total: quantity('3', 3, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(130, 'Приложение №2 / Охрана / строка 5')],
    verification_note: null
  }),
  asset({
    id: 'security-server',
    category: 'security',
    title: 'Сервер',
    unit: 'шт.',
    values_by_village: [quantity('1', 1), quantity('1', 1), quantity('-', null), quantity('1', 1)],
    total: quantity('3', 3, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(130, 'Приложение №2 / Охрана / строка 6')],
    verification_note: null
  }),
  asset({
    id: 'security-crm-domilend',
    category: 'security',
    title: 'CRM «Домиленд»',
    unit: 'шт.',
    values_by_village: [quantity('1', 1), quantity('1', 1), quantity('1', 1), quantity('1', 1)],
    total: quantity('4', 4, 'sum_explicit_values'),
    total_mode: 'sum_explicit_values',
    source_refs: [source(130, 'Приложение №2 / Охрана / строка 7')],
    verification_note: null
  })
] satisfies readonly FullReglamentCommonAsset[];

const services = [
  service(
    'year-round-access-control',
    'year_round',
    'Круглогодично',
    '1',
    'Организация контрольно-пропускного режима с привлечением ЧОП',
    'Круглосуточно'
  ),
  service(
    'year-round-office-reception',
    'year_round',
    'Круглогодично',
    '2',
    'Прием жителей поселка в офисе обслуживающей компании',
    'Ежедневно'
  ),
  service(
    'year-round-common-area-repair',
    'year_round',
    'Круглогодично',
    '3',
    'Ремонт объектов на территории общего пользования',
    'По необходимости'
  ),
  service(
    'year-round-perimeter-fence-repair',
    'year_round',
    'Круглогодично',
    '4',
    'Ремонт периметрального ограждения поселка',
    'По необходимости'
  ),
  service(
    'year-round-common-bins-cleaning',
    'year_round',
    'Круглогодично',
    '5',
    'Очистка урн в местах общего пользования',
    'Ежедневно'
  ),
  service(
    'year-round-private-bins-cleaning',
    'year_round',
    'Круглогодично',
    '6',
    'Очистка индивидуальных мусорных баков',
    'Ежедневно'
  ),
  service(
    'year-round-solid-waste-removal',
    'year_round',
    'Круглогодично',
    '7',
    'Вывоз ТКО',
    '3 раза в неделю'
  ),
  service(
    'year-round-gas-pipeline-maintenance',
    'year_round',
    'Круглогодично',
    '8',
    'Газопровод: обслуживание и содержание после ввода в эксплуатацию',
    '1 раз в месяц'
  ),
  service(
    'year-round-power-lines-maintenance',
    'year_round',
    'Круглогодично',
    '9',
    'Линии электропередач: обслуживание и содержание после ввода в эксплуатацию',
    '1 раз в месяц'
  ),
  service(
    'winter-road-snow-ice-clearing',
    'winter_period',
    'В зимний период',
    '1',
    'Расчистка внутренних дорог поселка от снега и наледи',
    '1 раз в день',
    'В смете эта периодичность сведена к годовой кратности.'
  ),
  service(
    'winter-paths-playgrounds-clearing',
    'winter_period',
    'В зимний период',
    '2',
    'Расчистка снега на тропинках, детских и спортивных площадках',
    '1 раз в день',
    'В смете эта периодичность сведена к годовой кратности.'
  ),
  service(
    'winter-heavy-snowfall-road-clearing',
    'winter_period',
    'В зимний период',
    '3',
    'Расчистка свежевыпавшего снега с дорог в дни обильных снегопадов',
    '2 раза в день',
    'В смете нет отдельной кратности для дней с обильным снегопадом.'
  ),
  service(
    'winter-snow-removal-outside-settlement',
    'winter_period',
    'В зимний период',
    '4',
    'Вывоз снега в места временного складирования за пределами поселка',
    'По необходимости'
  ),
  service(
    'winter-anti-ice-spreading',
    'winter_period',
    'В зимний период',
    '5',
    'Отсыпка внутренних дорог антигололедным составом',
    'По необходимости'
  ),
  service(
    'summer-road-manual-cleaning',
    'summer_period',
    'В летний период',
    '1',
    'Чистка дорог ручным способом',
    'В местах загрязнения'
  ),
  service(
    'summer-road-dust-suppression',
    'summer_period',
    'В летний период',
    '2',
    'Обеспыливание дорог механизированным способом',
    'ежедневно',
    'В смете эта периодичность сведена к годовой кратности.'
  ),
  service(
    'summer-road-watering',
    'summer_period',
    'В летний период',
    '3',
    'Полив дорог',
    'По необходимости'
  ),
  service(
    'summer-lawn-care-weeding',
    'summer_period',
    'В летний период',
    '4',
    'Уход за газонами в местах общего пользования: уборка и прополка',
    '7 раз в летний период',
    'В смете эта периодичность может быть сведена к годовой кратности.'
  ),
  service(
    'summer-lawn-mowing',
    'summer_period',
    'В летний период',
    '5',
    'Покос газонов в местах общего пользования',
    '15 раз в летний период',
    'В смете эта периодичность может быть сведена к годовой кратности.'
  ),
  service(
    'summer-road-gutters-cleaning',
    'summer_period',
    'В летний период',
    '6',
    'Уборка дорожных лотков от мусора и скошенной травы ручным способом',
    '15 раз в летний период',
    'В смете эта периодичность может быть сведена к годовой кратности.'
  ),
  service(
    'summer-tree-shrub-care',
    'summer_period',
    'В летний период',
    '7',
    'Уход за деревьями и кустарниками. Санитарная обрезка, опрыскивание от вредителей',
    '2 раза в год'
  ),
  service(
    'summer-plant-watering',
    'summer_period',
    'В летний период',
    '8',
    'Полив деревьев, кустарников, зеленых насаждений в местах общего пользования',
    '4 раза в месяц',
    'В смете эта периодичность может быть сведена к годовой кратности.'
  ),
  service(
    'summer-waterbody-cleaning',
    'summer_period',
    'В летний период',
    '9',
    'Очистка водоемов',
    '1 раз в неделю'
  ),
  service(
    'summer-curbstone-painting',
    'summer_period',
    'В летний период',
    '10',
    'Покраска бортового камня',
    '1 раз в год'
  )
] satisfies readonly FullReglamentService[];

const serviceSource = (serviceId: string): FullReglamentSourceRef => {
  const item = services.find((entry) => entry.id === serviceId);

  if (!item) {
    throw new Error(`Unknown full reglament service: ${serviceId}`);
  }

  return item.source_refs[0] ?? source(135, `Приложение №4 / ${serviceId}`);
};

const mapItem = (
  serviceId: string,
  status: FullReglamentServiceToEstimateMapItem['status'],
  statusLabelRu: string,
  estimateSectionIds: readonly string[],
  estimateRowIds: readonly string[],
  estimateSourceRefs: readonly FullReglamentSourceRef[],
  explanation: string,
  verificationNote: string | null
): FullReglamentServiceToEstimateMapItem => ({
  service_id: serviceId,
  status,
  status_label_ru: statusLabelRu,
  estimate_section_ids: estimateSectionIds,
  estimate_row_ids: estimateRowIds,
  source_refs: [serviceSource(serviceId), ...estimateSourceRefs],
  estimate_source_refs: estimateSourceRefs,
  explanation,
  verification_note: verificationNote
});

const serviceToEstimateMap = [
  mapItem(
    'year-round-access-control',
    'explicit_found',
    explicitFound,
    ['security'],
    ['security-access-control'],
    [source(126, 'Сводная смета / строка 5.1')],
    'В смете есть строка круглосуточного пропускного режима; смысл услуги совпадает с работой КПП и ЧОП.',
    null
  ),
  mapItem(
    'year-round-office-reception',
    'not_found',
    notFound,
    [],
    [],
    [],
    'В текущей смете нет отдельной строки приема жителей в офисе.',
    'нужно сверить с первичными документами'
  ),
  mapItem(
    'year-round-common-area-repair',
    'partial',
    partial,
    ['improvement'],
    ['improvement-objects-maintenance', 'improvement-road-surface-repair'],
    [source(126, 'Сводная смета / строка 4.1'), source(126, 'Сводная смета / строка 4.2')],
    'В смете есть содержание объектов благоустройства и текущий ремонт покрытия дорог и площадок, но отдельной строки ремонта объектов общего пользования нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'year-round-perimeter-fence-repair',
    'needs_check',
    needsCheck,
    ['improvement'],
    ['improvement-road-surface-repair'],
    [source(126, 'Сводная смета / строка 4.2')],
    'Название строки сметы говорит о ремонте дорог и площадок, а детализация источников указывает на ремонт ограждения.',
    'требует проверки конфликта названия и детализации'
  ),
  mapItem(
    'year-round-common-bins-cleaning',
    'not_found',
    notFound,
    [],
    [],
    [],
    'В текущей смете нет отдельной строки для урн в местах общего пользования.',
    'нужно сверить с первичными документами'
  ),
  mapItem(
    'year-round-private-bins-cleaning',
    'partial',
    partial,
    ['waste-transfer'],
    ['waste-transfer-from-homes'],
    [source(125, 'Сводная смета / строка 1.1')],
    'Строка сметы описывает перемещение мусора от частных домовладений на мусорную площадку; прямой формулировки очистки индивидуальных баков нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'year-round-solid-waste-removal',
    'partial',
    partial,
    ['waste-operator', 'waste-transfer'],
    ['waste-operator-service', 'waste-transfer-from-homes'],
    [source(126, 'Сводная смета / строка 6.1'), source(125, 'Сводная смета / строка 1.1')],
    'Есть организация работы с региональным оператором и перемещение мусора, но нет отдельной строки «Вывоз ТКО» с периодичностью 3 раза в неделю.',
    'частично сопоставлено'
  ),
  mapItem(
    'year-round-gas-pipeline-maintenance',
    'not_found',
    notFound,
    [],
    [],
    [],
    'В текущей смете нет секции или строки по газопроводу.',
    'нужно сверить с первичными документами после ввода газопровода'
  ),
  mapItem(
    'year-round-power-lines-maintenance',
    'partial',
    partial,
    ['lighting-power'],
    ['lighting-power-system-repair', 'lighting-street-maintenance'],
    [source(126, 'Сводная смета / раздел 7'), source(126, 'Сводная смета / строка 7.4')],
    'Есть секция по уличному освещению и системе электроснабжения, но отдельной строки по линиям электропередач после ввода в эксплуатацию нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'winter-road-snow-ice-clearing',
    'explicit_found',
    explicitFound,
    ['cleaning'],
    ['cleaning-winter-mechanized'],
    [source(125, 'Сводная смета / строка 2.1')],
    'В смете есть зимняя механизированная уборка территории с базой «дороги и проезды».',
    null
  ),
  mapItem(
    'winter-paths-playgrounds-clearing',
    'partial',
    partial,
    ['cleaning'],
    ['cleaning-winter-manual'],
    [source(125, 'Сводная смета / строка 2.2')],
    'В смете есть зимняя ручная уборка территории, но тропинки, детские и спортивные площадки не выделены в названии строки.',
    'частично сопоставлено'
  ),
  mapItem(
    'winter-heavy-snowfall-road-clearing',
    'partial',
    partial,
    ['cleaning'],
    ['cleaning-winter-mechanized'],
    [source(125, 'Сводная смета / строка 2.1')],
    'Снег на дорогах относится к зимней механизированной уборке, но отдельной строки для дней обильных снегопадов нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'winter-snow-removal-outside-settlement',
    'not_found',
    notFound,
    [],
    [],
    [],
    'В текущей смете найдены уборка и расчистка, но отдельная строка вывоза снега за пределы поселка не найдена.',
    'нужно сверить с первичными документами'
  ),
  mapItem(
    'winter-anti-ice-spreading',
    'partial',
    partial,
    ['cleaning'],
    ['cleaning-winter-mechanized', 'cleaning-winter-manual'],
    [source(125, 'Сводная смета / строка 2.1'), source(125, 'Сводная смета / строка 2.2')],
    'В зимних строках уборки есть материалы, но отдельной строки антигололедной отсыпки нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'summer-road-manual-cleaning',
    'explicit_found',
    explicitFound,
    ['cleaning'],
    ['cleaning-summer-manual'],
    [source(125, 'Сводная смета / строка 2.4')],
    'В смете есть летняя ручная уборка территории.',
    null
  ),
  mapItem(
    'summer-road-dust-suppression',
    'explicit_found',
    explicitFound,
    ['cleaning'],
    ['cleaning-summer-mechanized'],
    [source(125, 'Сводная смета / строка 2.3')],
    'В смете есть летняя механизированная уборка; в описании строки указаны вода и поливомоечная техника.',
    null
  ),
  mapItem(
    'summer-road-watering',
    'partial',
    partial,
    ['cleaning'],
    ['cleaning-summer-mechanized'],
    [source(125, 'Сводная смета / строка 2.3')],
    'Полив дорог может входить в летнюю механизированную уборку, но отдельной строки «Полив дорог» нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'summer-lawn-care-weeding',
    'partial',
    partial,
    ['landscaping'],
    ['landscaping-mowing-ditches', 'landscaping-trees-shrubs'],
    [source(125, 'Сводная смета / строка 3.1'), source(125, 'Сводная смета / строка 3.2')],
    'В смете есть озеленение, кошение травостоя и уход за деревьями и кустарниками, но отдельной строки ухода за газонами и прополки нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'summer-lawn-mowing',
    'partial',
    partial,
    ['landscaping'],
    ['landscaping-mowing-ditches'],
    [source(125, 'Сводная смета / строка 3.1')],
    'В смете есть кошение травостоя вдоль открытых ливневых траншей; формулировка уже, чем газоны в местах общего пользования.',
    'частично сопоставлено'
  ),
  mapItem(
    'summer-road-gutters-cleaning',
    'explicit_found',
    explicitFound,
    ['cleaning'],
    ['cleaning-summer-manual'],
    [source(125, 'Сводная смета / строка 2.4')],
    'Летняя ручная уборка использует базу «открытые ливневые траншеи»; это близко к дорожным лоткам, но не совпадает дословно.',
    null
  ),
  mapItem(
    'summer-tree-shrub-care',
    'explicit_found',
    explicitFound,
    ['landscaping'],
    ['landscaping-trees-shrubs'],
    [source(125, 'Сводная смета / строка 3.2')],
    'В смете есть строка «Уход за деревьями, кустарниками».',
    null
  ),
  mapItem(
    'summer-plant-watering',
    'partial',
    partial,
    ['landscaping'],
    ['landscaping-trees-shrubs'],
    [source(125, 'Сводная смета / строка 3.2')],
    'Вода указана в материалах строки, но отдельной строки полива нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'summer-waterbody-cleaning',
    'partial',
    partial,
    ['improvement'],
    ['improvement-objects-maintenance'],
    [source(126, 'Сводная смета / строка 4.1')],
    'В описании строки «Содержание объектов благоустройства» указаны акватории, но отдельной строки очистки водоемов нет.',
    'частично сопоставлено'
  ),
  mapItem(
    'summer-curbstone-painting',
    'partial',
    partial,
    ['improvement'],
    ['improvement-objects-maintenance'],
    [source(126, 'Сводная смета / строка 4.1')],
    'В описании строки «Содержание объектов благоустройства» указаны бордюры, но отдельной строки покраски бортового камня нет.',
    'частично сопоставлено'
  )
] satisfies readonly FullReglamentServiceToEstimateMapItem[];

const calculationAssumptions = [
  {
    id: 'single-tariff-four-villages',
    title: 'Единый тариф для четырех поселков',
    summary:
      'Расходы четырех поселков объединяются в один расчет, а тариф применяется единообразно ко всем поселкам.',
    status_label_ru: 'требует проверки',
    why_important:
      'Тариф не рассчитан отдельно для Вилладж, Форест, Парк и Ривер, хотя площади и состав имущества по поселкам отличаются.',
    how_to_verify:
      'Сверить наличие раздельного управленческого учета, фактическое пользование инфраструктурой и первичные документы по общим расходам.',
    related_fact_ids: ['villages:shelkovo-village', 'common_assets:roads-asphalt'],
    source_refs: [
      source(3, 'п. 2.1', {
        quote: 'не ведёт раздельный учёт по каждому поселку'
      }),
      source(5, 'п. 2.5', {
        quote: 'экономический расчёт тарифа представляется в сводном виде'
      })
    ],
    quotes: [
      'не ведёт раздельный учёт по каждому поселку',
      'экономический расчёт тарифа представляется в сводном виде для всего комплекса «Шелково»'
    ]
  },
  {
    id: 'area-based-allocation',
    title: 'Распределение платы по площади участка',
    summary:
      'Стоимость содержания общего имущества распределяется пропорционально площади участка; калькуляционная единица равна 1 сотке.',
    status_label_ru: 'важно явно объяснять',
    why_important: 'От знаменателя 20 440,54 сотки зависит сумма за 1 сотку в месяц.',
    how_to_verify:
      'Сверить реестр участков, площадь каждого участка и агрегаты Приложения №1 с первичными земельными данными.',
    related_fact_ids: villages.map((item) => `villages:${item.id}`),
    source_refs: [
      source(5, 'пп. 3.1-3.2', {
        quote: 'пропорционально доле площади земельного участка собственника'
      }),
      source(127, 'Приложение №1 / строки 1.1-1.2')
    ],
    quotes: [
      'пропорционально доле площади земельного участка собственника в общей площади земельных участков всех собственников',
      'Калькуляционной единицей платы за Услуги является 1 сотка'
    ]
  },
  {
    id: 'normative-and-expert-method',
    title: 'Нормативный метод и экспертные оценки',
    summary:
      'Часть затрат опирается на нормативные базы, а часть может опираться на экспертные оценки, рыночные цены, договорные цены или коммерческие предложения.',
    status_label_ru: 'требует первичных оснований',
    why_important:
      'Строки сметы имеют разную проверяемость: трудозатраты, подрядные услуги и материалы нужно проверять разными первичными документами.',
    how_to_verify:
      'Для каждой крупной строки хранить тип основания и запрашивать первичные документы именно под этот тип основания.',
    related_fact_ids: ['services:summer-lawn-mowing', 'service_to_estimate_map:summer-lawn-mowing'],
    source_refs: [
      source(7, 'п. 4.8', { quote: 'определяются нормативным методом' }),
      source(8, 'пп. 4.9-4.11', {
        quote: 'при отсутствии ... норм и нормативов'
      })
    ],
    quotes: [
      'определяются нормативным методом',
      'при отсутствии ... норм и нормативов ... определяется с использованием метода экспертных оценок'
    ]
  },
  {
    id: 'overhead-70-percent-fot',
    title: 'ОЭР 70% от ФОТ',
    summary:
      'Общеэксплуатационные расходы начисляются как 70% от ФОТ основных рабочих и машинистов.',
    status_label_ru: 'требует проверки применения по строкам',
    why_important: 'Для трудоемких услуг это крупный множитель поверх прямых затрат.',
    how_to_verify:
      'По каждой строке с трудом пересчитывать 0,70 × (ФОТ основных рабочих + ФОТ машинистов).',
    related_fact_ids: ['estimate_rows:cleaning', 'services:winter-road-snow-ice-clearing'],
    source_refs: [
      source(9, 'п. 4.12', {
        quote: 'ОЭРi = НОЭР / 100% × ( ФОТоснi + ФОТмашi )'
      }),
      source(10, 'п. 4.12', {
        quote: 'установлено значение норматива на уровне 70%'
      }),
      source(123, 'общая калькуляция / строка 0260')
    ],
    quotes: [
      'ОЭРi = НОЭР / 100% × ( ФОТоснi + ФОТмашi )',
      'установлено значение норматива на уровне 70% от планируемых расходов на оплату труда'
    ]
  },
  {
    id: 'profit-40-percent-fot',
    title: 'Прибыль 40% от ФОТ',
    summary:
      'Плановая прибыль в локальных расчетах применяется как 40% от ФОТ основных рабочих и машинистов.',
    status_label_ru: 'требует проверки применения по строкам',
    why_important:
      'Прибыль является отдельным расчетным слоем поверх себестоимости и влияет на итоговую плату.',
    how_to_verify: 'По строкам с ФОТ пересчитать 0,40 × (ФОТ основных рабочих + ФОТ машинистов).',
    related_fact_ids: ['estimate_rows:cleaning', 'services:summer-road-manual-cleaning'],
    source_refs: [
      source(10, 'п. 4.13', {
        quote: 'Пi = НП / 100% × ( ФОТоснi + ФОТмашi )'
      }),
      source(96, 'локальный ресурсный сметный расчет по работе с региональным оператором', {
        quote: 'Величина прибыли в % от ФОТ основных 40%'
      }),
      source(124, 'общая калькуляция / строки 1300-1320')
    ],
    quotes: ['Пi = НП / 100% × ( ФОТоснi + ФОТмашi )', 'Величина прибыли в % от ФОТ основных 40%']
  }
] satisfies readonly FullReglamentCalculationAssumption[];

const auditNotes = [
  {
    id: 'empty-cells-not-zero',
    category: 'data_quality',
    title: 'Пустые ячейки не являются подтвержденным нулем',
    summary:
      'В Приложении №2 много пустых значений; в наборе данных они сохранены как null + empty_cell.',
    public_wording: 'нет значения в таблице PDF',
    severity: 'watch',
    related_fact_ids: [
      'common_assets:roads-parking-sites',
      'common_assets:electric-transformer-10kv-160kva'
    ],
    source_refs: [
      source(128, 'Приложение №2 / таблицы общего имущества'),
      source(129, 'Приложение №2 / продолжение таблиц')
    ],
    next_step:
      'Сверить пустые ячейки с исходным изображением и первичными инвентарными документами.'
  },
  {
    id: 'sotka-vs-m2-unit',
    category: 'calculation_check',
    title: 'Единицы формулы: м² и сотки согласуются через пересчет',
    summary:
      'Формула описывает общую площадь как м², а сводная смета публикует тариф за 1 сотку; расчет совпадает при переводе 1 сотки в 100 м².',
    public_wording: 'единицы согласованы через перевод м² в сотки',
    severity: 'info',
    related_fact_ids: ['villages:shelkovo-village', 'audit_notes:tariff-summary'],
    source_refs: [
      source(6, 'п. 4.5', {
        quote: 'Sобщ. уч – общая площадь земельных участков ... м²'
      }),
      source(125, 'раздел 10 / тарифицируемая площадь', {
        quote: '20440,54 соток'
      }),
      source(126, 'ИТОГО', { quote: '221 264 198 ... 902,07' })
    ],
    next_step:
      'Контрольный расчет: 221 264 198 / 20 440,54 / 12 = 902,064 ₽/сотка/мес; в м² это 9,02064 ₽/м²/мес.'
  },
  {
    id: 'waste-temporary-residence-0-5',
    category: 'calculation_check',
    title: 'Коэффициент временного проживания 0,50 в ТКО не подтвержден внешним нормативом',
    summary:
      'В расчете ТКО норматив 0,1000 и К1=0,5252 отделены от коэффициента временного проживания 0,50; публичное нормативное основание для 0,50 не найдено.',
    public_wording: 'требует основания для коэффициента 0,50',
    severity: 'needs_check',
    related_fact_ids: [
      'services:year-round-solid-waste-removal',
      'estimate_rows:waste-operator-service'
    ],
    source_refs: [
      source(94, 'нормативный расчет накопления ТКО', {
        quote: 'Коэффициент ... временный характер проживания'
      })
    ],
    next_step:
      'Запросить у составителя сметы основание коэффициента 0,50; без него расчетный объем ТКО меняется с 6 202 до 12 403 м³ в год.'
  },
  {
    id: 'perimeter-fence-estimate-conflict',
    category: 'estimate_mapping',
    title: 'Ремонт периметрального ограждения конфликтует с названием строки сметы',
    summary:
      'Приложение №4 выделяет ремонт ограждения, а строка сметы названа ремонтом дорог и площадок.',
    public_wording: 'требует проверки',
    severity: 'needs_check',
    related_fact_ids: [
      'services:year-round-perimeter-fence-repair',
      'estimate_rows:improvement-road-surface-repair'
    ],
    source_refs: [
      source(135, 'Приложение №4 / Круглогодично / строка 4'),
      source(126, 'Сводная смета / строка 4.2')
    ],
    next_step: 'Сверить детализацию строки 4.2 и первичные документы по ремонту ограждения.'
  },
  {
    id: 'service-frequency-vs-estimate-annualization',
    category: 'estimate_mapping',
    title: 'Периодичность услуг свернута в годовые кратности сметы',
    summary:
      'Часть услуг задана ежедневной/еженедельной периодичностью, а смета использует агрегированные годовые кратности.',
    public_wording: 'часть периодичности нужно сверять с годовыми расчетами',
    severity: 'watch',
    related_fact_ids: ['services:winter-road-snow-ice-clearing', 'services:summer-lawn-mowing'],
    source_refs: [
      source(135, 'Приложение №4 / перечень услуг'),
      source(125, 'Сводная смета / строки 2.1-3.1')
    ],
    next_step:
      'Сопоставлять периодичность услуг с производственными программами и годовыми кратностями.'
  },
  {
    id: 'office-reception-not-found',
    category: 'estimate_mapping',
    title: 'Прием жителей в офисе не найден в явной строке сметы',
    summary: 'Услуга есть в Приложении №4, но отдельная строка в текущей смете не найдена.',
    public_wording: 'не найдено в явной строке сметы',
    severity: 'watch',
    related_fact_ids: ['services:year-round-office-reception'],
    source_refs: [source(135, 'Приложение №4 / Круглогодично / строка 2')],
    next_step: 'Сверить с первичными документами, где отражена офисная работа с жителями.'
  },
  {
    id: 'gas-pipeline-not-found',
    category: 'estimate_mapping',
    title: 'Газопровод не найден в явной строке сметы',
    summary:
      'Услуга обслуживания газопровода после ввода в эксплуатацию есть в Приложении №4, но в смете нет строки или секции по газопроводу.',
    public_wording: 'не найдено в явной строке сметы',
    severity: 'watch',
    related_fact_ids: ['services:year-round-gas-pipeline-maintenance'],
    source_refs: [source(135, 'Приложение №4 / Круглогодично / строка 8')],
    next_step:
      'Проверить статус ввода газопровода в эксплуатацию и первичные документы на обслуживание.'
  },
  {
    id: 'common-bins-cleaning-not-found',
    category: 'estimate_mapping',
    title: 'Очистка урн в местах общего пользования не найдена в явной строке сметы',
    summary: 'Приложение №4 выделяет очистку общих урн отдельно от индивидуальных баков.',
    public_wording: 'не найдено в явной строке сметы',
    severity: 'watch',
    related_fact_ids: ['services:year-round-common-bins-cleaning'],
    source_refs: [source(135, 'Приложение №4 / Круглогодично / строка 5')],
    next_step: 'Проверить, включена ли очистка урн в уборку территории или в мусорные строки.'
  },
  {
    id: 'snow-removal-outside-not-found',
    category: 'estimate_mapping',
    title: 'Вывоз снега за пределы поселка не найден в явной строке сметы',
    summary:
      'В Приложении №4 есть вывоз снега за пределы поселка по необходимости, но в смете найдена только уборка/расчистка.',
    public_wording: 'не найдено в явной строке сметы',
    severity: 'watch',
    related_fact_ids: ['services:winter-snow-removal-outside-settlement'],
    source_refs: [source(135, 'Приложение №4 / В зимний период / строка 4')],
    next_step: 'Сверить договоры или первичные расчеты по вывозу снега за пределы поселка.'
  }
] satisfies readonly FullReglamentAuditNote[];

export const fullReglamentDataset2026 = {
  schema_version: '1',
  dataset_id: 'full-reglament-2026',
  title: 'Полный регламент содержания Шелково, слой фактов для LLM',
  source_pdf: {
    pdf: 'full',
    title: 'Полный регламент',
    pages_total: 138
  },
  curation_sources: [
    '020-common-assets',
    '030-service-catalog',
    '040-village-characteristics',
    '050-service-to-estimate-map',
    '060-calculation-assumptions',
    '070-llm-dataset-contract',
    '080-public-pages-decision'
  ],
  tariff_summary: {
    tariff_area_sotka: 20440.54,
    total_annual_cost_rub: 221264198,
    tariff_rub_per_sotka_month: 902.07,
    source_refs: [
      source(125, 'раздел 10 / тарифицируемая площадь', {
        quote: '20440,54 соток'
      }),
      source(126, 'ИТОГО', { quote: '221 264 198 ... 902,07' })
    ]
  },
  villages,
  common_assets: commonAssets,
  services,
  service_to_estimate_map: serviceToEstimateMap,
  calculation_assumptions: calculationAssumptions,
  audit_notes: auditNotes
} satisfies FullReglamentDataset;
