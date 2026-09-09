import type {
  CostBreakdown,
  EditableField,
  Estimate,
  EstimateCoefficientPolicy,
  EstimateRow,
  EstimateRowKind,
  EstimateSourcePdf,
  EstimateSourceRef,
  NonEmptyReadonlyArray
} from '@/lib/reglament/schema';

const TARIFF_AREA_SOTKI = 20_440.54;

const coefficients = {
  insurance_rate: 0.302,
  overhead_rate: 0.7,
  profit_rate: 0.4,
  usn_rate: 0.15,
  vat_rate: 0.05
} as const;

const enabledEditableField = {
  key: 'enabled',
  label: 'Включить позицию',
  level: 'basic'
} satisfies EditableField;

const volumeEditableField = {
  key: 'volume',
  label: 'Объем',
  level: 'basic',
  min: 0
} satisfies EditableField;

const frequencyEditableField = {
  key: 'frequency',
  label: 'Кратность',
  level: 'basic',
  min: 0
} satisfies EditableField;

const rateEditableField = {
  key: 'rate',
  label: 'Цена/ставка',
  level: 'basic',
  min: 0
} satisfies EditableField;

const fixedPriceEditableField = {
  key: 'fixed_price',
  label: 'Годовая стоимость',
  level: 'expert',
  unit: '₽/год',
  min: 0,
  step: 1
} satisfies EditableField;

const expertCostEditableFields = [
  {
    key: 'primary_salary',
    label: 'Основная зарплата',
    level: 'expert',
    unit: '₽/год',
    min: 0,
    step: 1
  },
  {
    key: 'machinist_salary',
    label: 'Зарплата машинистов',
    level: 'expert',
    unit: '₽/год',
    min: 0,
    step: 1
  },
  {
    key: 'machines',
    label: 'Машины и механизмы',
    level: 'expert',
    unit: '₽/год',
    min: 0,
    step: 1
  },
  {
    key: 'materials',
    label: 'Материалы',
    level: 'expert',
    unit: '₽/год',
    min: 0,
    step: 1
  },
  {
    key: 'contractors',
    label: 'Подрядчики',
    level: 'expert',
    unit: '₽/год',
    min: 0,
    step: 1
  }
] satisfies readonly EditableField[];

type EditableFieldsInput = {
  readonly base?: EstimateRow['baseline']['base'];
  readonly frequency?: EstimateRow['baseline']['frequency'];
  readonly price?: EstimateRow['baseline']['price'];
};

const basicEditableFieldsForInput = (input: EditableFieldsInput): readonly EditableField[] =>
  [
    enabledEditableField,
    ...(input.base ? [volumeEditableField] : []),
    ...(input.frequency ? [frequencyEditableField] : []),
    ...(input.price ? [rateEditableField] : [])
  ] satisfies readonly EditableField[];

const compactEditableFieldsForInput = (input: EditableFieldsInput): readonly EditableField[] =>
  [
    ...basicEditableFieldsForInput(input),
    fixedPriceEditableField
  ] satisfies readonly EditableField[];

const expertEditableFieldsForInput = (input: EditableFieldsInput): readonly EditableField[] =>
  [
    ...basicEditableFieldsForInput(input),
    fixedPriceEditableField,
    ...expertCostEditableFields
  ] satisfies readonly EditableField[];

type BreakdownInput = {
  readonly gross: number;
  readonly income?: number;
  readonly primary_salary?: number;
  readonly machinist_salary?: number;
  readonly machines?: number;
  readonly materials?: number;
  readonly contractors?: number;
  readonly insurance?: number;
  readonly overhead?: number;
  readonly profit?: number;
  readonly usn?: number;
};

type EstimateRowInput = {
  readonly id: string;
  readonly title: string;
  readonly kind: EstimateRowKind;
  readonly coefficient_policy: EstimateCoefficientPolicy;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly breakdown: Omit<BreakdownInput, 'gross'>;
  readonly source_refs: NonEmptyReadonlyArray<EstimateSourceRef>;
  readonly base?: EstimateRow['baseline']['base'];
  readonly frequency?: EstimateRow['baseline']['frequency'];
  readonly price?: EstimateRow['baseline']['price'];
  readonly editable_fields?: readonly EditableField[] | 'basic';
  readonly description?: string;
  readonly tags?: readonly string[];
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const source = (
  pdf: EstimateSourcePdf,
  page: number,
  fragment: string,
  note?: string
): EstimateSourceRef => ({ pdf, page, fragment, note });

const costBreakdown = (input: BreakdownInput): CostBreakdown => {
  const primarySalary = input.primary_salary ?? 0;
  const machinistSalary = input.machinist_salary ?? 0;
  const machines = input.machines ?? 0;
  const materials = input.materials ?? 0;
  const contractors = input.contractors ?? 0;
  const insurance = input.insurance ?? 0;
  const overhead = input.overhead ?? 0;
  const profit = input.profit ?? 0;
  const income = input.income ?? round2(input.gross / (1 + coefficients.vat_rate));
  const usn =
    input.usn ??
    round2(
      income -
        (primarySalary +
          machinistSalary +
          machines +
          materials +
          contractors +
          insurance +
          overhead +
          profit)
    );

  return {
    primary_salary: primarySalary,
    machinist_salary: machinistSalary,
    fot: round2(primarySalary + machinistSalary),
    machines,
    materials,
    contractors,
    insurance,
    overhead,
    profit,
    usn,
    income,
    vat: round2(input.gross - income),
    gross: input.gross
  };
};

const estimateRow = (input: EstimateRowInput): EstimateRow => ({
  id: input.id,
  title: input.title,
  kind: input.kind,
  coefficient_policy: input.coefficient_policy,
  baseline: {
    is_enabled: true,
    base: input.base,
    frequency: input.frequency,
    price: input.price,
    annual_gross: input.annual_gross,
    tariff_per_sotka_month: input.tariff_per_sotka_month,
    breakdown: costBreakdown({ ...input.breakdown, gross: input.annual_gross })
  },
  source_refs: input.source_refs,
  editable_fields:
    input.editable_fields === 'basic'
      ? compactEditableFieldsForInput(input)
      : (input.editable_fields ?? expertEditableFieldsForInput(input)),
  description: input.description,
  tags: input.tags
});

export const estimate2026 = {
  id: 'estimate-2026',
  year: 2026,
  title: 'Калькулятор тарифа по смете 2026',
  tariff_area_sotki: TARIFF_AREA_SOTKI,
  coefficients,
  baseline: {
    annual_gross: 221_264_198,
    tariff_per_sotka_month: 902.07
  },
  source_refs: [
    source('final', 1, 'тарифицируемая площадь и строки 1-3.2'),
    source('final', 2, 'строки 3.3-7 и итог по смете')
  ],
  sections: [
    {
      id: 'waste-transfer',
      title: 'Перемещение мусора от участков собственников на площадку временного размещения',
      baseline: {
        annual_gross: 12_851_178,
        tariff_per_sotka_month: 52.39
      },
      source_refs: [
        source('final', 1, 'раздел 1'),
        source('waste', 6, 'производственная программа по перемещению мусора')
      ],
      rows: [
        estimateRow({
          id: 'waste-transfer-from-homes',
          title:
            'Перемещение мусора из мест временного накопления от частных домовладений на мусорную площадку',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 12_851_178,
          tariff_per_sotka_month: 52.39,
          base: {
            value: 6_201.6,
            unit: 'м³/год',
            label: 'расчет накопления ТКО'
          },
          frequency: { value: 365, unit: 'раз/год' },
          price: { value: 20_885.5, unit: '₽/день' },
          breakdown: {
            primary_salary: 3_418_555.1,
            machinist_salary: 1_364_107.2,
            machines: 464_303.42,
            insurance: 1_444_364.01,
            overhead: 3_347_863.61,
            profit: 1_913_064.92
          },
          source_refs: [
            source('final', 1, 'строка 1.1'),
            source('waste', 9, 'локальный ресурсный сметный расчет'),
            source('waste', 13, 'калькуляция стоимости услуг')
          ],
          description:
            'В строку включены погрузка мусора, работа «Газели», зарплата рабочего и зарплата машиниста.',
          tags: ['ручной труд', 'машино-часы', 'крупная статья']
        })
      ]
    },
    {
      id: 'cleaning',
      title: 'Уборка территории',
      baseline: {
        annual_gross: 159_011_858,
        tariff_per_sotka_month: 648.27
      },
      source_refs: [
        source('final', 1, 'раздел 2'),
        source('cleaning', 1, 'производственная программа по уборке территории')
      ],
      rows: [
        estimateRow({
          id: 'cleaning-winter-mechanized',
          title: 'Зимняя механизированная уборка территории',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 21_469_119,
          tariff_per_sotka_month: 87.53,
          base: { value: 81_778, unit: 'м²', label: 'дороги и проезды' },
          frequency: { value: 116, unit: 'раз/год' },
          breakdown: {
            machinist_salary: 4_998_769.96,
            machines: 7_905_533.7,
            materials: 181_328.76,
            insurance: 1_509_628.52,
            overhead: 3_499_138.97,
            profit: 1_999_507.98
          },
          source_refs: [
            source('final', 1, 'строка 2.1'),
            source('cleaning', 12, 'итого по разделу зимней механизированной уборки')
          ],
          description:
            'Песок и служебная спецодежда отнесены к материалам; техника отнесена к машинам и механизмам, а труд механизаторов к зарплате машинистов.',
          tags: ['машино-часы', 'крупная статья']
        }),
        estimateRow({
          id: 'cleaning-winter-manual',
          title: 'Зимняя ручная уборка территории',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 3_138_719,
          tariff_per_sotka_month: 12.8,
          base: {
            value: 449,
            unit: 'м²',
            label: 'парковочные и иные площадки'
          },
          frequency: { value: 212, unit: 'раз/год' },
          breakdown: {
            primary_salary: 1_212_248.55,
            materials: 25_846.2,
            insurance: 366_099.05,
            overhead: 848_573.98,
            profit: 484_899.42
          },
          source_refs: [
            source('final', 1, 'строка 2.2'),
            source('cleaning', 17, 'итого по разделу зимней ручной уборки')
          ],
          description: 'Песок, спецодежда и инвентарь отнесены к материалам этой строки.',
          tags: ['ручной труд']
        }),
        estimateRow({
          id: 'cleaning-summer-mechanized',
          title: 'Летняя механизированная уборка',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 91_946_088,
          tariff_per_sotka_month: 374.85,
          base: { value: 81_778, unit: 'м²', label: 'дороги и проезды' },
          frequency: { value: 153, unit: 'раз/год' },
          breakdown: {
            machinist_salary: 20_918_659.44,
            machines: 35_473_842.02,
            materials: 335_990.88,
            insurance: 6_317_435.15,
            overhead: 14_643_061.61,
            profit: 8_367_463.78
          },
          source_refs: [
            source('final', 1, 'строка 2.3'),
            source('cleaning', 19, 'итого по разделу летней механизированной уборки')
          ],
          description:
            'Вода и спецодежда отнесены к материалам; поливомоечная техника отнесена к машинам и механизмам.',
          tags: ['машино-часы', 'крупная статья']
        }),
        estimateRow({
          id: 'cleaning-summer-manual',
          title: 'Летняя ручная уборка территории',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 42_457_933,
          tariff_per_sotka_month: 173.09,
          base: {
            value: 32_712,
            unit: 'м',
            label: 'открытые ливневые траншеи'
          },
          frequency: { value: 153, unit: 'раз/год' },
          breakdown: {
            primary_salary: 16_429_653.29,
            materials: 274_250,
            insurance: 4_961_755.3,
            overhead: 11_500_757.3,
            profit: 6_571_861.32
          },
          source_refs: [
            source('final', 1, 'строка 2.4'),
            source('cleaning', 24, 'итого по разделу летней ручной уборки')
          ],
          description: 'Спецодежда и инвентарь отнесены к материалам этой строки.',
          tags: ['ручной труд', 'крупная статья']
        })
      ]
    },
    {
      id: 'landscaping',
      title: 'Озеленение территории',
      baseline: {
        annual_gross: 10_218_079,
        tariff_per_sotka_month: 41.66
      },
      source_refs: [
        source('final', 1, 'раздел 3'),
        source('landscaping', 1, 'производственная программа по озеленению')
      ],
      rows: [
        estimateRow({
          id: 'landscaping-mowing-ditches',
          title: 'Кошение травостоя вдоль открытых ливневых траншей',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 1_816_356,
          tariff_per_sotka_month: 7.4,
          base: { value: 98_136, unit: 'м²', label: 'ливневые траншеи' },
          frequency: { value: 105, unit: 'раз/год' },
          breakdown: {
            machinist_salary: 684_354.43,
            machines: 61_792.83,
            materials: 9_046,
            insurance: 206_675.04,
            overhead: 479_048.1,
            profit: 273_741.77
          },
          source_refs: [
            source('final', 1, 'строка 3.1'),
            source('landscaping', 9, 'итого по разделу кошения травостоя')
          ],
          description:
            'Спецодежда отнесена к материалам; триммеры отнесены к машинам и механизмам.',
          tags: ['ручной труд', 'машино-часы']
        }),
        estimateRow({
          id: 'landscaping-trees-shrubs',
          title: 'Уход за деревьями, кустарниками',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 1_755_909,
          tariff_per_sotka_month: 7.16,
          base: { value: 970, unit: 'деревьев', label: 'лиственные деревья' },
          frequency: { value: 46, unit: 'раз/год' },
          breakdown: {
            primary_salary: 415_902.91,
            machinist_salary: 153_163.08,
            machines: 259_733.8,
            materials: 30_965.67,
            insurance: 171_857.92,
            overhead: 398_346.19,
            profit: 227_626.4
          },
          source_refs: [
            source('final', 1, 'строка 3.2'),
            source('landscaping', 17, 'итого по разделу ухода за деревьями')
          ],
          description:
            'Удобрения, вода, спецодежда и инвентарь отнесены к материалам; поливочная техника отнесена к машинам и механизмам.',
          tags: ['ручной труд', 'машино-часы']
        }),
        estimateRow({
          id: 'landscaping-ticks-hogweed',
          title: 'Обработка территорий от клещей, борьба с борщевиком',
          kind: 'contractor',
          coefficient_policy: 'none',
          annual_gross: 6_207_773,
          tariff_per_sotka_month: 25.31,
          frequency: { value: 2, unit: 'раз/год' },
          breakdown: {
            contractors: 5_860_200
          },
          source_refs: [
            source('final', 2, 'строка 3.3'),
            source('landscaping', 18, 'обработка от клещей и борьба с борщевиком')
          ],
          editable_fields: 'basic',
          description:
            'Акарицидная обработка и борьба с борщевиком учтены одной суммой услуг подрядчиков.',
          tags: ['подрядная услуга', 'крупная статья']
        }),
        estimateRow({
          id: 'landscaping-forest-care',
          title: 'Уход за лесом',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 438_041,
          tariff_per_sotka_month: 1.79,
          base: { value: 129_606, unit: 'м²', label: 'площадь леса' },
          frequency: { value: 22, unit: 'раз/год' },
          breakdown: {
            primary_salary: 172_154.56,
            insurance: 51_990.68,
            overhead: 120_508.19,
            profit: 68_861.82
          },
          source_refs: [
            source('final', 2, 'строка 3.4'),
            source('landscaping', 19, 'итого по услуге ухода за лесом')
          ],
          tags: ['ручной труд']
        })
      ]
    },
    {
      id: 'improvement',
      title: 'Благоустройство территории',
      baseline: {
        annual_gross: 4_687_181,
        tariff_per_sotka_month: 19.11
      },
      source_refs: [
        source('final', 2, 'раздел 4'),
        source('improvement', 1, 'производственная программа по благоустройству')
      ],
      rows: [
        estimateRow({
          id: 'improvement-objects-maintenance',
          title: 'Содержание объектов благоустройства',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 4_366_756,
          tariff_per_sotka_month: 17.8,
          frequency: { value: 300, unit: 'раз/год' },
          breakdown: {
            primary_salary: 1_669_095.98,
            materials: 56_347.2,
            insurance: 504_066.99,
            overhead: 1_168_367.19,
            profit: 667_638.39
          },
          source_refs: [
            source('final', 2, 'строка 4.1'),
            source('improvement', 6, 'локальный ресурсный сметный расчет')
          ],
          description:
            'Объединяет работы по детским и спортивным площадкам, акватории, бордюрам, спецодежде и инвентарю.',
          tags: ['ручной труд']
        }),
        estimateRow({
          id: 'improvement-road-surface-repair',
          title: 'Текущий ремонт покрытия дорог и площадок',
          kind: 'material',
          coefficient_policy: 'none',
          annual_gross: 320_424,
          tariff_per_sotka_month: 1.31,
          frequency: { value: 1, unit: 'раз/год' },
          breakdown: {
            materials: 298_320
          },
          source_refs: [
            source('final', 2, 'строка 4.2'),
            source(
              'improvement',
              2,
              'производственная программа, ремонт периметрального ограждения',
              'В детализации благоустройства не найдена строка ремонта покрытия дорог или площадок; сопоставление с этой строкой не подтверждено.'
            ),
            source(
              'improvement',
              11,
              'локальный расчет, замена поврежденных элементов периметрального ограждения',
              'Материалы 298 320 ₽ близки к строке 4.2 после налоговых начислений, но название работ отличается от итоговой сметы.'
            ),
            source(
              'improvement',
              12,
              'локальный расчет, материалы профнастила и итог 298 320 ₽',
              'Страница продолжает строку ремонта периметрального ограждения и подтверждает материальную сумму, использованную в расчете строки.'
            )
          ],
          editable_fields: 'basic',
          description:
            'Сопоставление с детализацией не подтверждено: в итоговой смете указано покрытие дорог и площадок, а в детализации благоустройства найдена только близкая по сумме строка ремонта периметрального ограждения. Официальная сумма сохранена по итоговой смете; строку нужно проверить по рабочей книге или у составителя сметы.',
          tags: ['материалы', 'требует проверки']
        })
      ]
    },
    {
      id: 'security',
      title: 'Охрана и техническое обслуживание средств охраны',
      baseline: {
        annual_gross: 14_752_949,
        tariff_per_sotka_month: 60.15
      },
      source_refs: [
        source('final', 2, 'раздел 5'),
        source('security', 1, 'производственная программа по охране')
      ],
      rows: [
        estimateRow({
          id: 'security-access-control',
          title:
            'Осуществление круглосуточного пропускного режима и поддержание внутриобъектного порядка',
          kind: 'contractor',
          coefficient_policy: 'none',
          annual_gross: 10_199_356,
          tariff_per_sotka_month: 41.59,
          base: {
            value: 4,
            unit: 'поста',
            label: 'круглосуточные стационарные посты'
          },
          frequency: { value: 365, unit: 'дней/год' },
          breakdown: {
            materials: 1_008_000,
            contractors: 8_640_000
          },
          source_refs: [
            source('final', 2, 'строка 5.1'),
            source('security', 5, 'раздел круглосуточного пропускного режима')
          ],
          editable_fields: 'basic',
          description:
            'Подрядная охрана и материальные расходы КПП отнесены к услугам подрядчиков и материалам.',
          tags: ['подрядная услуга', 'крупная статья']
        }),
        estimateRow({
          id: 'security-equipment-maintenance',
          title: 'Техническое обслуживание средств охраны',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 1_811_185,
          tariff_per_sotka_month: 7.38,
          frequency: { value: 12, unit: 'раз/год' },
          breakdown: {
            primary_salary: 503_202.05,
            materials: 10_000,
            contractors: 494_584.56,
            insurance: 151_967.02,
            overhead: 352_241.43,
            profit: 201_280.82
          },
          source_refs: [
            source('final', 2, 'строка 5.2'),
            source('security', 10, 'итого по техническому обслуживанию средств охраны')
          ],
          description:
            'Включает видеонаблюдение, СКУД, шлагбаумы, Домиленд и материальную замену видеокамер.',
          tags: ['ручной труд', 'подрядная услуга']
        }),
        estimateRow({
          id: 'security-dispatch',
          title: 'Диспетчерское обслуживание',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 2_742_409,
          tariff_per_sotka_month: 11.18,
          frequency: { value: 365, unit: 'дней/год' },
          breakdown: {
            primary_salary: 1_080_000,
            insurance: 326_160,
            overhead: 756_000,
            profit: 432_000
          },
          source_refs: [
            source('final', 2, 'строка 5.3'),
            source('security', 11, 'итого по диспетчерскому обслуживанию')
          ],
          tags: ['ручной труд']
        })
      ]
    },
    {
      id: 'waste-operator',
      title: 'Организация работы с региональным оператором по вывозу мусора',
      baseline: {
        annual_gross: 8_004_368,
        tariff_per_sotka_month: 32.63
      },
      source_refs: [
        source('final', 2, 'раздел 6'),
        source('waste', 1, 'производственная программа по работе с региональным оператором')
      ],
      rows: [
        estimateRow({
          id: 'waste-operator-service',
          title: 'Организация работы с региональным оператором по вывозу мусора',
          kind: 'contractor',
          coefficient_policy: 'none',
          annual_gross: 8_004_368,
          tariff_per_sotka_month: 32.63,
          base: {
            value: 6_201.6,
            unit: 'м³/год',
            label: 'расчет накопления ТКО'
          },
          frequency: { value: 365, unit: 'дней/год' },
          price: { value: 1_229.24, unit: '₽/м³' },
          breakdown: {
            income: 7_623_207.58,
            contractors: 7_623_207.58,
            usn: 0
          },
          source_refs: [
            source('final', 2, 'строка 6.1'),
            source(
              'waste',
              3,
              'локальный ресурсный сметный расчет по работе с региональным оператором'
            ),
            source('waste', 5, 'калькуляция стоимости услуг по работе с региональным оператором')
          ],
          editable_fields: 'basic',
          tags: ['подрядная услуга', 'крупная статья']
        })
      ]
    },
    {
      id: 'lighting-power',
      title: 'Техническое обслуживание уличного освещения и системы электроснабжения',
      baseline: {
        annual_gross: 11_738_585,
        tariff_per_sotka_month: 47.86
      },
      source_refs: [
        source('final', 2, 'раздел 7'),
        source('lighting', 1, 'производственная программа по освещению')
      ],
      rows: [
        estimateRow({
          id: 'lighting-street-maintenance',
          title: 'Техническое обслуживание уличного освещения',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 6_670_979,
          tariff_per_sotka_month: 27.2,
          base: {
            value: 506,
            unit: 'светильников',
            label: 'уличные светильники'
          },
          frequency: { value: 12, unit: 'раз/год' },
          breakdown: {
            primary_salary: 2_549_913.41,
            materials: 97_820,
            insurance: 770_073.85,
            overhead: 1_784_939.39,
            profit: 1_019_965.36
          },
          source_refs: [
            source('final', 2, 'строка 7.1'),
            source('lighting', 7, 'обслуживание светильников и кабельных сетей')
          ],
          description: 'Замена светильников отнесена к материалам этой строки.',
          tags: ['ручной труд']
        }),
        estimateRow({
          id: 'lighting-electricity',
          title: 'Оплата электроэнергии на уличное освещение',
          kind: 'material',
          coefficient_policy: 'none',
          annual_gross: 1_473_084,
          tariff_per_sotka_month: 6.01,
          base: { value: 218_457.5, unit: 'кВт*час/год' },
          frequency: { value: 12, unit: 'мес/год' },
          price: { value: 6.29, unit: '₽/кВт*час' },
          breakdown: {
            materials: 1_374_097.6
          },
          source_refs: [
            source('final', 2, 'строка 7.2'),
            source('lighting', 6, 'нормативный расчет электроэнергии'),
            source('lighting', 8, 'локальный расчет электроэнергии')
          ],
          editable_fields: 'basic',
          tags: ['материалы']
        }),
        estimateRow({
          id: 'lighting-poles-repair',
          title: 'Текущий ремонт опор уличного освещения',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 869_527,
          tariff_per_sotka_month: 3.54,
          base: { value: 1_416.8, unit: 'м²', label: 'опоры освещения' },
          frequency: { value: 0.2, unit: 'раз/год' },
          breakdown: {
            primary_salary: 222_066.98,
            materials: 277_692.8,
            insurance: 67_064.23,
            overhead: 155_446.88,
            profit: 88_826.79
          },
          source_refs: [
            source('final', 2, 'строка 7.3'),
            source('lighting', 9, 'текущий ремонт опор уличного освещения')
          ],
          tags: ['ручной труд', 'материалы']
        }),
        estimateRow({
          id: 'lighting-power-system-repair',
          title: 'Текущий ремонт системы электроснабжения',
          kind: 'work',
          coefficient_policy: 'fot',
          annual_gross: 2_724_995,
          tariff_per_sotka_month: 11.11,
          frequency: { value: 75, unit: 'раз/год' },
          breakdown: {
            primary_salary: 1_058_236.64,
            insurance: 319_587.46,
            overhead: 740_765.64,
            profit: 423_294.65
          },
          source_refs: [
            source('final', 2, 'строка 7.4'),
            source('lighting', 10, 'обслуживание КТП, КРН и трансформаторов')
          ],
          tags: ['ручной труд']
        })
      ]
    }
  ]
} satisfies Estimate;
