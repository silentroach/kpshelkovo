import { describe, expect, it } from 'vitest';

import type { EstimateDetailDataset } from './detail-schema';
import {
  buildEstimateDetailChecksMarkdown,
  buildEstimateDetailLaborMarkdown,
  buildEstimateDetailMachinesMarkdown,
  buildEstimateDetailMarkdown,
  buildEstimateDetailMaterialsMarkdown,
} from './detail-markdown';
import type { PublicEstimateDetailDataset } from './detail-public';

const fixtureDataset = {
  schema_version: '1',
  dataset_id: 'estimate-details-2026',
  title: 'Тестовая детализация сметы 2026',
  year: 2026,
  source_pdfs: [
    {
      pdf: 'cleaning',
      title: 'Детализация уборки',
      pages_total: 4,
    },
  ],
  curation_notes: ['Тестовая заметка.'],
  work_items: [
    {
      id: 'work-verified',
      title: 'Проверенная работа',
      estimate_row_id: 'cleaning-row',
      service_ids: ['service-cleaning'],
      status: 'verified',
      status_label_ru: 'проверено',
      source_refs: [
        {
          pdf: 'cleaning',
          page: 2,
          fragment: 'Локальная смета / строка 1',
          quote: 'Проверенная работа',
        },
      ],
    },
    {
      id: 'work-needs-check',
      title: 'Работа для сверки',
      estimate_row_id: 'cleaning-row-check',
      status: 'needs_check',
      status_label_ru: 'требует проверки',
      needs_check: {
        reason: 'Неоднозначная строка PDF.',
      },
      source_refs: [
        {
          pdf: 'cleaning',
          page: 3,
          fragment: 'Локальная смета / строка 2',
        },
      ],
    },
  ],
  resources: [
    {
      id: 'material-sand',
      work_item_id: 'work-verified',
      estimate_row_id: 'cleaning-row',
      kind: 'material',
      title: 'Песок',
      cost_bucket: 'materials',
      quantity: {
        value: 12.5,
        unit: 'т',
      },
      unit_price_rub: {
        value: 1000,
      },
      total_rub: {
        value: 12500,
      },
      status: 'verified',
      status_label_ru: 'проверено',
      source_refs: [
        {
          pdf: 'cleaning',
          page: 4,
          fragment: 'Ведомость ресурсов / материалы / строка 1',
          quote: 'Песок 12,5 т 1 000,00 12 500,00',
          quote_items: [
            {
              label: 'Песок',
              resource_ids: ['material-sand'],
              quantity: {
                value: 12.5,
                unit: 'т',
              },
              unit_price_rub: {
                value: 1000,
              },
              total_rub: {
                value: 12500,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'machine-loader',
      work_item_id: 'work-verified',
      estimate_row_id: 'cleaning-row',
      kind: 'machine',
      title: 'Погрузчик',
      cost_bucket: 'machines',
      total_rub: {
        value: 5000,
      },
      status: 'verified',
      status_label_ru: 'проверено',
      source_refs: [
        {
          pdf: 'cleaning',
          page: 4,
          fragment: 'Ведомость ресурсов / машины / строка 2',
        },
      ],
    },
    {
      id: 'labor-worker',
      work_item_id: 'work-verified',
      estimate_row_id: 'cleaning-row',
      kind: 'labor',
      title: 'Рабочий зеленого хозяйства',
      cost_bucket: 'primary_salary',
      quantity: {
        value: 8,
        unit: 'чел.-ч',
      },
      unit_price_rub: {
        value: 2000,
      },
      total_rub: {
        value: 16000,
      },
      status: 'verified',
      status_label_ru: 'проверено',
      source_refs: [
        {
          pdf: 'cleaning',
          page: 4,
          fragment: 'Ведомость ресурсов / труд / строка 3',
        },
      ],
    },
    {
      id: 'machinist-loader',
      work_item_id: 'work-verified',
      estimate_row_id: 'cleaning-row',
      kind: 'machinist_labor',
      title: 'Машинист погрузчика',
      cost_bucket: 'machinist_salary',
      total_rub: {
        value: 3000,
      },
      status: 'needs_check',
      status_label_ru: 'требует проверки',
      needs_check: {
        reason: 'Ставка не выделена отдельной строкой.',
      },
      source_refs: [
        {
          pdf: 'cleaning',
          page: 4,
          fragment: 'Ведомость ресурсов / труд машинистов / строка 4',
        },
      ],
    },
  ],
  control_totals: [
    {
      id: 'cleaning-materials-total',
      estimate_row_id: 'cleaning-row',
      control_source: 'section_pdf',
      cost_bucket: 'materials',
      source_total_rub: {
        value: 12500,
      },
      detail_total_rub: {
        value: 12500,
      },
      aggregate_total_rub: {
        value: 12525,
      },
      delta_rub: -25,
      tolerance_rub: 1,
      resource_ids: ['material-sand'],
      status: 'needs_check',
      status_label_ru: 'требует проверки',
      needs_check: {
        reason: 'Расхождение больше допуска.',
      },
      source_refs: [
        {
          pdf: 'cleaning',
          page: 4,
          fragment: 'Итого материалы',
        },
      ],
    },
  ],
} satisfies EstimateDetailDataset;

describe('estimate detail markdown companions', () => {
  it('serves every detail markdown endpoint', async () => {
    const cases = [
      {
        name: 'overview',
        load: () => import('../../pages/815/regulation/details.md'),
        marker: '# Детальная смета 2026',
      },
      {
        name: 'materials',
        load: () => import('../../pages/815/regulation/details/materials.md'),
        marker: '# Детальная смета 2026: материалы',
      },
      {
        name: 'machines',
        load: () => import('../../pages/815/regulation/details/machines.md'),
        marker: '# Детальная смета 2026: машины',
      },
      {
        name: 'labor',
        load: () => import('../../pages/815/regulation/details/labor.md'),
        marker: '# Детальная смета 2026: труд',
      },
      {
        name: 'checks',
        load: () => import('../../pages/815/regulation/details/checks.md'),
        marker: '# Детальная смета 2026: проверки',
      },
    ];

    for (const item of cases) {
      const route = await item.load();
      const response = await route.GET({} as never);
      const body = await response.text();

      expect(response.headers.get('Content-Type'), item.name).toContain(
        'text/markdown',
      );
      expect(body, item.name).toContain(item.marker);
      expect(body, item.name).toContain(
        '/815/regulation/data/estimate-details-2026.json',
      );
    }
  });

  it('publishes the same schema version in JSON and Markdown routes', async () => {
    const [jsonRoute, markdownRoute] = await Promise.all([
      import('../../pages/815/regulation/data/estimate-details-2026.json'),
      import('../../pages/815/regulation/details.md'),
    ]);
    const [jsonResponse, markdownResponse] = await Promise.all([
      jsonRoute.GET({} as never),
      markdownRoute.GET({} as never),
    ]);
    const json = (await jsonResponse.json()) as PublicEstimateDetailDataset;
    const markdown = await markdownResponse.text();
    const markdownSchemaVersion = markdown.match(/версия схемы: ([^;]+)/)?.[1];

    expect(markdownSchemaVersion).toBe(json.schema_version);
  });

  it('builds an overview from dataset counts and links topical files', () => {
    const markdown = buildEstimateDetailMarkdown(fixtureDataset);

    expect(markdown).toMatchInlineSnapshot(`
      "# Детальная смета 2026

      Машиночитаемый Markdown-индекс набора данных \`estimate-details-2026\` для маленьких PDF сметы. PDF не парсятся во время запроса или сборки страницы.

      ## Главные URL

      - JSON-набор данных: <https://kpshelkovo.online/815/regulation/data/estimate-details-2026.json>
      - Агрегированная смета: <https://kpshelkovo.online/815/regulation/data/estimate-2026.json>
      - Набор данных полного регламента: <https://kpshelkovo.online/815/regulation/data/full-2026.json>
      - Услуги полного регламента: <https://kpshelkovo.online/815/regulation/full/services.md>
      - Сопоставление услуг со сметой: <https://kpshelkovo.online/815/regulation/full/service-map.md>
      - Этот индекс: <https://kpshelkovo.online/815/regulation/details.md>

      ## Как соединять слои

      - \`estimate-2026.json\` — агрегированная смета: разделы, строки, итоговые суммы, базовые частоты и разбивка сумм (\`breakdown\`).
      - \`full-2026.json\` и \`full/services.md\` — услуги полного регламента, периодичность и исходные формулировки услуг.
      - \`estimate-details-2026.json\` и \`details/*.md\` — детальные работы, материалы, машины, труд, контрольные итоги и позиции со статусом \`needs_check\` из маленьких PDF.
      - \`estimate_row_id\` связывает работы, ресурсы и контрольные итоги с агрегированной сметой; \`service_ids\` связывает работы с услугами полного регламента.
      - Для ответа сначала берите формулировку и периодичность услуги из полного регламента, затем строку и сумму из агрегированной сметы, затем ресурсы и проверки из детального слоя.

      ## Проверочные вопросы для агента

      - Какова периодичность полива дорог: сравните услуги \`summer-road-dust-suppression\` и \`summer-road-watering\`, строку \`cleaning-summer-mechanized\` и ресурсы детальной сметы по поливу.
      - Какие материалы, машины и труд входят в выбранную строку сметы: найдите строку по \`estimate_row_id\`, затем смотрите тематические файлы \`materials.md\`, \`machines.md\` и \`labor.md\`.
      - Какие суммы требуют ручной перепроверки: откройте \`checks.md\` и сверяйте причины \`needs_check\` с \`source_refs\`.

      ## Тематические файлы

      - [Материалы](https://kpshelkovo.online/815/regulation/details/materials.md): ресурсы с \`kind=material\`: количество, цена и итог
      - [Машины](https://kpshelkovo.online/815/regulation/details/machines.md): ресурсы с \`kind=machine\` и машинные затраты
      - [Труд](https://kpshelkovo.online/815/regulation/details/labor.md): ресурсы с \`kind=labor\` и \`kind=machinist_labor\`: ставки и итоги
      - [Проверки](https://kpshelkovo.online/815/regulation/details/checks.md): контрольные итоги, дельты и все позиции со статусом \`needs_check\`

      ## Сводка

      - Набор данных: estimate-details-2026; версия схемы: 2; год: 2026
      - PDF-источники: 1
      - Работы: 2
      - Ресурсы: 4
      - Контрольные итоги: 1
      - Со статусом \`needs_check\`: 3

      ## Ресурсы по видам

      - \`labor\`: 1 (труд)
      - \`machinist_labor\`: 1 (труд машинистов)
      - \`machine\`: 1 (машины)
      - \`material\`: 1 (материалы)
      - \`contractor\`: 0 (подрядчики)
      - \`other_cost\`: 0 (прочие затраты)

      ## PDF-источники

      - cleaning.pdf: Детализация уборки; страниц: 4; ссылка: <https://media.kpshelkovo.online/815/regulation/cleaning.pdf>

      ## Кураторские заметки

      - Тестовая заметка.
      "
    `);
  });

  it('serializes detail URLs through the package Markdown AST API', () => {
    const markdown = buildEstimateDetailMarkdown(fixtureDataset);

    expect(markdown).toContain(
      '- JSON-набор данных: <https://kpshelkovo.online/815/regulation/data/estimate-details-2026.json>',
    );
    expect(markdown).toContain(
      '- [Материалы](https://kpshelkovo.online/815/regulation/details/materials.md): ресурсы с `kind=material`: количество, цена и итог',
    );
  });

  it('filters resource topical files from the dataset', () => {
    const materials = buildEstimateDetailMaterialsMarkdown(fixtureDataset);
    const machines = buildEstimateDetailMachinesMarkdown(fixtureDataset);
    const labor = buildEstimateDetailLaborMarkdown(fixtureDataset);

    expect({ labor, machines, materials }).toMatchSnapshot();
  });

  it('renders structured source quote items in Russian when present', () => {
    const materials = buildEstimateDetailMaterialsMarkdown(fixtureDataset);

    expect(materials).toContain(
      'позиции цитаты: 1) Песок; ресурсы: `material-sand`; кол-во: 12,5 т; цена: 1 000 ₽; итог: 12 500 ₽',
    );
  });

  it('lists control totals, deltas and needs_check items', () => {
    const checks = buildEstimateDetailChecksMarkdown(fixtureDataset);

    expect(checks).toMatchSnapshot();
  });

  it('mentions the improvement road/fence mismatch in real checks markdown', () => {
    const checks = buildEstimateDetailChecksMarkdown();

    expect(checks).toContain('Текущий ремонт покрытия дорог и площадок');
    expect(checks).toContain('ремонт периметрального ограждения');
    expect(checks).toContain('Профнастил оцинкованный');
  });

  it('keeps summer road watering frequency answerable in real markdown', () => {
    const markdown = [
      buildEstimateDetailMaterialsMarkdown(),
      buildEstimateDetailMachinesMarkdown(),
      buildEstimateDetailLaborMarkdown(),
    ].join('\n');

    expect(markdown).toContain(
      'Дороги (асфальт). Полив водой (обеспыливание) - 3 раза в день без дождя',
    );
    expect(markdown).toContain(
      'почему расчетный полив чаще и почему эти частоты отличаются, в cleaning.pdf не поясняется',
    );
    expect(markdown).toContain('cleaning-summer-mechanized-water');
  });

  it('exposes cleaning resource statement reconciliation in real checks markdown', () => {
    const checks = buildEstimateDetailChecksMarkdown();

    expect(checks).toContain('cleaning-resource-statement-materials');
    expect(checks).toContain(
      'ресурсная ведомость по локальному ресурсному сметному расчету',
    );
    expect(checks).toContain('Песок для посыпки дорог');
  });

  it('exposes final PDF controls in real checks markdown', () => {
    const checks = buildEstimateDetailChecksMarkdown();

    expect(checks).toContain('`final-estimate-gross`: `gross`');
    expect(checks).toContain('источник контроля: итоговый PDF');
    expect(checks).toContain('final-cleaning-gross');
    expect(checks).toContain('Сумма дочерних строк отличается');
  });
});
