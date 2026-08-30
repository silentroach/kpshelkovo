import { describe, expect, it, vi } from 'vitest';

import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import { mapRawSettlement } from './settlement/mapper';
import type { RawSettlement } from './settlement/schema';

const toDomain = (item: RawSettlement) => mapRawSettlement(item);

vi.mock('./data', () => ({
  loadAllData: async () => {
    const settlements = [
      {
        name: 'КП Шелково',
        short_name: 'Шелково',
        slug: 'shelkovo',
        is_baseline: true,
        location: {
          lat: 55.7,
          lng: 37,
          district: 'Истринский район',
        },
        tariff: {
          value: 100,
          unit: 'rub_per_sotka',
          period: 'month',
        },
        website: 'https://example.com/shelkovo',
        infrastructure: {},
        common_spaces: {},
        service_model: {},
        sources: [
          {
            title: 'Источник',
            url: 'https://example.com/shelkovo/source',
            type: 'official',
            date_checked: '2026-05-01',
            comment: '',
          },
        ],
      },
      {
        name: 'КП Тестовый',
        short_name: 'Тестовый',
        slug: 'test',
        is_baseline: false,
        location: {
          lat: 55.8,
          lng: 37.1,
          district: 'Истринский район',
        },
        tariff: {
          value: 90,
          unit: 'rub_per_sotka',
          period: 'month',
        },
        website: 'https://example.com/test',
        infrastructure: {},
        common_spaces: {},
        service_model: {},
        sources: [
          {
            title: 'Источник',
            url: 'https://example.com/test/source',
            type: 'official',
            date_checked: '2026-05-01',
            comment: '',
          },
        ],
      },
    ].map((item) => toDomain(item as RawSettlement));

    return {
      settlements,
      baseline: settlements[0],
      stats: {
        totalSettlements: 2,
        cheaperCount: 1,
        moreExpensiveCount: 0,
      },
      ratings: new Map([
        ['shelkovo', { score: 81.2 }],
        ['test', { score: 74.3 }],
      ]),
    };
  },
}));

vi.mock('./site', () => ({
  canon: (path: string) =>
    new URL(
      path.replace(/^\//, ''),
      'https://kpshelkovo.online/815/compare/',
    ).toString(),
}));

const loadMarkdown = () => import('./markdown');

const settlement = toDomain({
  name: 'КП Тестовый',
  short_name: 'Тестовый',
  slug: 'test',
  website: 'https://example.com',
  telegram: 'test_village',
  is_baseline: false,
  location: {
    address_text: 'Истринский район, деревня Тестовая',
    lat: 55.8,
    lng: 37.1,
    map_url: 'https://maps.example.com/test',
    district: 'Истринский район',
  },
  tariff: {
    value: 900,
    unit: 'rub_per_sotka',
    period: 'month',
    note: 'по данным УК',
  },
  lots: {
    count: 120,
    area_ha: 18,
    average_sotka: 12,
    average_note: 'публичная презентация',
  },
  infrastructure: {
    roads: 'asphalt',
    sidewalks: 'partial',
    lighting: 'yes',
    water: 'yes',
    checkpoints: 'yes',
  },
  common_spaces: {
    playgrounds: 'yes',
    sports: 'partial',
  },
  service_model: {
    garbage_collection: 'yes',
    snow_removal: 'partial',
  },
  management_company: {
    title: 'УК Тест',
    url: 'https://example.com/uk',
  },
  sources: [
    {
      title: 'Публичная презентация',
      url: 'https://example.com/source',
      type: 'official',
      date_checked: '2026-05-01',
      comment: 'тариф и инфраструктура',
    },
  ],
} satisfies RawSettlement);

describe('compare markdown navigation', () => {
  it('keeps discovery links on the markdown home page', async () => {
    const { buildHomeMd } = await loadMarkdown();

    expect(visibleWhitespace(await buildHomeMd())).toMatchInlineSnapshot(`
      "# Сравнение тарифов поселков

      Структурированное сравнение тарифа КП Шелково с другими коттеджными поселками по тарифам, инфраструктуре, общественным пространствам, сервисной модели и условному рейтингу качества среды.

      ## Навигация

      - Методика рейтинга: <https://kpshelkovo.online/815/compare/rating/index.md>
      - Полный JSON-файл: <https://kpshelkovo.online/815/compare/data/settlements.json>
      - JSON для списка и карты: <https://kpshelkovo.online/815/compare/data/explorer.json>

      ## Что здесь сравнивается

      - Поселков в базе: 2
      - Базовый поселок: КП Шелково (<https://kpshelkovo.online/815/compare/settlements/shelkovo/>)
      - Поселков дешевле Шелково: 1
      - Поселков дороже Шелково: 0

      ## Подборка поселков

      - [КП Шелково](https://kpshelkovo.online/815/compare/settlements/shelkovo/index.md) — тариф 100·₽/сотка; рейтинг 81,2/100; Истринский район
      - [КП Тестовый](https://kpshelkovo.online/815/compare/settlements/test/index.md) — тариф 90·₽/сотка; рейтинг 74,3/100; Истринский район

      ## Markdown-доступ

      - HTML-маршруты /815/compare/, /815/compare/rating/ и страницы поселков /815/compare/settlements/SLUG/ поддерживают заголовок Accept: text/markdown.
      - Прямые Markdown-адреса: /815/compare/index.md, /815/compare/rating/index.md, /815/compare/settlements/SLUG/index.md.

      ## Ограничения данных

      - Если факт не подтвержден источником, поле опускается.
      - Отсутствие поля означает «неизвестно», а не «точно нет».
      - \`/815/compare/data/settlements.json\` является основным полным JSON-файлом поселков.
      - \`/815/compare/data/explorer.json\` сокращен для списка, карты и массового сравнения.
      - Тариф намеренно не входит в формулу условного рейтинга.
      "
    `);
  });

  it('keeps discovery links on the markdown rating page', async () => {
    const { buildRatingMd } = await loadMarkdown();

    await expect(buildRatingMd()).resolves.toMatchInlineSnapshot(`
      "# Методика расчета условного рейтинга поселков

      Текстовая версия страницы с публичным объяснением того, как считается условный уровень поселка.

      ## Навигация

      - Главная в Markdown: <https://kpshelkovo.online/815/compare/index.md>
      - Полный JSON-файл: <https://kpshelkovo.online/815/compare/data/settlements.json>
      - JSON для списка и карты: <https://kpshelkovo.online/815/compare/data/explorer.json>

      ## Базовая формула

      - \`rating = 100 * (infra * 0.50 + spaces * 0.25 + service * 0.10 + distance * 0.15)\`
      - Тариф не влияет на рейтинг и исключен из формулы специально.

      ## Блоки и веса

      - Инфраструктура: 50%
      - Общественные пространства: 25%
      - Сервисная модель: 10%
      - Близость к Москве: 15%

      ## Как считаются признаки

      - Для бинарных статусов используется шкала \`yes = 1\`, \`partial = 0.5\`, \`no = 0\`.
      - Для упорядоченных признаков применяются отдельные шкалы: дороги, ливневка, видеонаблюдение и подземное электричество.
      - Неизвестные поля не трактуются как \`no\`.
      - Если данных мало, оценка блока тянется к нейтральной середине \`0.5\`, а не к верхней или нижней границе.

      ## Дистанция

      - Используется расстояние не от центра Москвы напрямую, а приблизительное расстояние за пределами МКАД.
      - До 20 км за МКАД блок получает максимум.
      - Дальше оценка плавно снижается по диапазонам \`20..40\`, \`40..60\`, \`60..80\`, \`80..100\`, затем фиксируется на минимуме.

      ## Дополнительные корректировки

      - Если центральная вода подтверждена и уже входит в тариф (\`water_in_tariff = true\`), поселок получает \`+4\` к рейтингу.
      - Если поселок есть в канале «Коттеджное рабство» (\`rabstvo = true\`), рейтинг уменьшается на \`15\` пунктов.

      ## Как читать результат

      - Рейтинг — приблизительная сводная оценка подтвержденных признаков поселка, а не рыночная оценка недвижимости.
      - Сначала смотрите на инфраструктуру, общественные пространства и сервисную модель, затем отдельно сравнивайте тариф.
      - Полная визуальная версия с пояснениями и разделами доступна по HTML-ссылке выше.
      "
    `);
  });

  it('keeps settlement facts and sources readable', async () => {
    const { buildSettlementMd } = await loadMarkdown();

    expect(
      visibleWhitespace(
        buildSettlementMd({
          settlement,
          comparison: {
            tariffDelta: -100,
            tariffDeltaPercent: -10,
            isCheaper: true,
          },
          baseline: {
            ...settlement,
            name: 'КП Шелково',
            shortName: 'Шелково',
            slug: 'shelkovo',
            isBaseline: true,
            location: {
              ...settlement.location,
              lat: 55.7,
              lng: 37,
            },
          },
          rating: {
            score: 74.3,
            km: 25.4,
            ring: 12.1,
          },
        }),
      ),
    ).toMatchInlineSnapshot(`
      "# КП Тестовый

      - HTML: <https://kpshelkovo.online/815/compare/settlements/test/>
      - Markdown: <https://kpshelkovo.online/815/compare/settlements/test/index.md>
      - Район: Истринский район
      - Адрес: Истринский район, деревня Тестовая
      - Тариф: 900·₽/сотка в месяц
      - Примечание к тарифу: по данным УК
      - Количество участков/домовладений: 120
      - Площадь поселка: 18 га
      - Средняя площадь участка: 12 сот.
      - Основание для средней площади: публичная презентация
      - Условный рейтинг: 74,3/100
      - Примерное расстояние от Москвы: \\~30 км
      - Примерное расстояние за МКАД: \\~10 км
      - Расстояние от Шелково: \\~10 км
      - Сравнение с Шелково: Дешевле Шелково на 100·₽ (10%).
      - Управляющая компания: УК Тест — <https://example.com/uk>
      - Сайт: <https://example.com>
      - Telegram: <https://t.me/test_village>
      - Карта: <https://maps.example.com/test>

      Отсутствующие признаки в разделах ниже означают, что данные не подтверждены источниками.

      ## Инфраструктура

      - Дороги: асфальт
      - Тротуары: частично
      - Освещение: есть
      - Центральная вода: есть
      - КПП: есть

      ## Общественные пространства

      - Детские площадки: есть
      - Спорт: частично

      ## Сервисная модель

      - Вывоз мусора: есть
      - Уборка снега: частично

      ## Источники

      - 1 мая 2026 — официальный источник — Публичная презентация: <https://example.com/source> (тариф и инфраструктура)
      "
    `);
  });
});
