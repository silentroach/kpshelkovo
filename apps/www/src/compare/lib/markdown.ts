import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
  type MarkdownListItemInput,
  type MarkdownPhrasingInput,
} from '@shelkovo/markdown';

import {
  compareRuText,
  formatCurrency,
  formatDate,
  formatDistance,
  formatNumberRu,
  formatPercentage,
  formatTariff,
} from '@shelkovo/format';
import { calculateDistance } from '@shelkovo/geo';

import { loadAllData } from './data';
import {
  formatTariffAuto,
  formatTariffOriginal,
  hasNonSotkaUnit,
} from './format';
import type { Rating } from './rating';
import type {
  AvailabilityStatus,
  ComparisonResult,
  DrainageType,
  RoadType,
  Settlement,
  SourceType,
  UndergroundElectricity,
  VideoSurveillance,
} from './settlement/types';
import { getLotAverage } from './settlement/lots';
import { canon } from './site';
import { telegram } from './url';

const src = {
  official: 'официальный источник',
  community: 'сообщество',
  media: 'медиа',
  personal: 'личная коммуникация',
} as const satisfies Record<SourceType, string>;

const road = {
  asphalt: 'асфальт',
  partlyAsphalt: 'частично асфальт',
  gravel: 'гравий',
  dirt: 'грунт',
} as const satisfies Record<RoadType, string>;

const drain = {
  closed: 'закрытый',
  open: 'открытый',
  none: 'нет',
} as const satisfies Record<DrainageType, string>;

const video = {
  full: 'полное',
  checkpointOnly: 'только на КПП',
  none: 'нет',
} as const satisfies Record<VideoSurveillance, string>;

const wire = {
  full: 'полностью подземное',
  partial: 'частично подземное',
  none: 'нет',
} as const satisfies Record<UndergroundElectricity, string>;

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
type MarkdownListItem = ReturnType<typeof md.listItem>;
type MarkdownPhrasingNodes = Exclude<MarkdownPhrasingInput, string>;

const abs = (path: string): string => canon(path);

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const pick = <T>(items: readonly (T | undefined)[]): readonly T[] =>
  items.filter((item): item is T => item !== undefined);

const phrase = (value: MarkdownPhrasingInput): MarkdownPhrasingNodes =>
  typeof value === 'string' ? [md.text(value)] : value;

const linkTo = (url: string): ReturnType<typeof md.link> => md.link(url, url);

function row(
  label: string,
  value?: MarkdownPhrasingInput,
): MarkdownListItem | undefined {
  if (!value) return;
  return md.listItem([md.paragraph([md.text(`${label}: `), ...phrase(value)])]);
}

function part(
  title: string,
  rows: readonly MarkdownListItem[],
): readonly MarkdownNode[] {
  return [
    md.heading(2, title),
    md.list(rows.length ? rows : [md.listItem('Нет подтвержденных данных.')]),
  ];
}

const num = (value: number): string =>
  formatNumberRu(value, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  });

function lots(item: Settlement): readonly MarkdownListItem[] {
  if (!item.lots) return [];

  const avg = getLotAverage(item.lots, item.infrastructure, item.commonSpaces);

  return [
    ...(item.lots.count
      ? [
          md.listItem(
            `Количество участков/домовладений: ${num(item.lots.count)}`,
          ),
        ]
      : []),
    ...(item.lots.areaHa
      ? [md.listItem(`Площадь поселка: ${num(item.lots.areaHa)} га`)]
      : []),
    ...(avg
      ? [
          md.listItem(
            `Средняя площадь участка: ${num(avg)} сот.${item.lots.averageSotka ? '' : ' (оценка с вычетом дорог, тротуаров, ливневок и общих зон)'}`,
          ),
        ]
      : []),
    ...(item.lots.averageNote
      ? [md.listItem(`Основание для средней площади: ${item.lots.averageNote}`)]
      : []),
  ];
}

function avail(value?: AvailabilityStatus): string | undefined {
  if (!value) return;
  if (value === 'yes') return 'есть';
  if (value === 'partial') return 'частично';
  return 'нет';
}

function infoRows(item: Settlement): readonly MarkdownListItem[] {
  return [
    row('Дороги', item.infrastructure.roads && road[item.infrastructure.roads]),
    row('Тротуары', avail(item.infrastructure.sidewalks)),
    row('Освещение', avail(item.infrastructure.lighting)),
    row('Газ', avail(item.infrastructure.gas)),
    row('Центральная вода', avail(item.infrastructure.water)),
    row('Центральная канализация', avail(item.infrastructure.sewage)),
    row(
      'Ливневка',
      item.infrastructure.drainage && drain[item.infrastructure.drainage],
    ),
    row('КПП', avail(item.infrastructure.checkpoints)),
    row('Охрана', avail(item.infrastructure.security)),
    row('Ограждение', avail(item.infrastructure.fencing)),
    row(
      'Видеонаблюдение',
      item.infrastructure.videoSurveillance &&
        video[item.infrastructure.videoSurveillance],
    ),
    row(
      'Подземное электричество',
      item.infrastructure.undergroundElectricity &&
        wire[item.infrastructure.undergroundElectricity],
    ),
    row('Административное здание', avail(item.infrastructure.adminBuilding)),
    row('Магазины и сервисы', avail(item.infrastructure.retailOrServices)),
  ].filter((item): item is MarkdownListItem => Boolean(item));
}

function spaceRows(item: Settlement): readonly MarkdownListItem[] {
  return [
    row('Клубная инфраструктура', avail(item.commonSpaces.clubInfrastructure)),
    row('Детские площадки', avail(item.commonSpaces.playgrounds)),
    row('Спорт', avail(item.commonSpaces.sports)),
    row('Пешие маршруты', avail(item.commonSpaces.walkingRoutes)),
    row('Доступ к воде', avail(item.commonSpaces.waterAccess)),
    row('Пляжные зоны', avail(item.commonSpaces.beachZones)),
    row('BBQ-зоны', avail(item.commonSpaces.bbqZones)),
    row('Бассейн', avail(item.commonSpaces.pool)),
    row('Фитнес-клуб', avail(item.commonSpaces.fitnessClub)),
    row('Ресторан', avail(item.commonSpaces.restaurant)),
    row('SPA-центр', avail(item.commonSpaces.spaCenter)),
    row('Детский клуб', avail(item.commonSpaces.kidsClub)),
    row('Спортивный лагерь', avail(item.commonSpaces.sportsCamp)),
    row('Начальная школа', avail(item.commonSpaces.primarySchool)),
  ].filter((item): item is MarkdownListItem => Boolean(item));
}

function serviceRows(item: Settlement): readonly MarkdownListItem[] {
  return [
    row('Вывоз мусора', avail(item.serviceModel.garbageCollection)),
    row('Уборка снега', avail(item.serviceModel.snowRemoval)),
    row('Уборка дорог', avail(item.serviceModel.roadCleaning)),
    row('Благоустройство', avail(item.serviceModel.landscaping)),
    row('Аварийная служба', avail(item.serviceModel.emergencyService)),
    row('Диспетчер', avail(item.serviceModel.dispatcher)),
  ].filter((item): item is MarkdownListItem => Boolean(item));
}

function delta(isBaseline: boolean, cmp?: ComparisonResult): string {
  if (isBaseline) {
    return 'Базовый поселок для сравнения.';
  }

  if (!cmp) {
    return 'Сравнение с Шелково недоступно.';
  }

  if (cmp.tariffDelta === 0) {
    return 'Тариф совпадает с Шелково.';
  }

  return `${cmp.isCheaper ? 'Дешевле' : 'Дороже'} Шелково на ${formatCurrency(Math.abs(cmp.tariffDelta))} (${formatPercentage(Math.abs(cmp.tariffDeltaPercent) / 100, { signed: false })}).`;
}

function map(item: Settlement): string {
  return (
    item.location.mapUrl ??
    `https://yandex.ru/maps/?pt=${item.location.lng},${item.location.lat}&z=15&l=map`
  );
}

function nav(page: 'home' | 'rating'): readonly MarkdownNode[] {
  return [
    md.heading(2, 'Навигация'),
    md.list(
      [
        page === 'home'
          ? row('Методика рейтинга', [linkTo(abs('/rating/index.md'))])
          : row('Главная в Markdown', [linkTo(abs('/index.md'))]),
        row('Полный JSON-файл', [linkTo(abs('/data/settlements.json'))]),
        row('JSON для списка и карты', [linkTo(abs('/data/explorer.json'))]),
      ].filter((item): item is MarkdownListItem => item !== undefined),
    ),
  ];
}

const linkRow = (label: string, url: string): MarkdownListItem =>
  row(label, [linkTo(url)]) ?? md.listItem(`${label}: ${url}`);

const settlementLine = (item: {
  readonly name: string;
  readonly slug: string;
  readonly tariff: Pick<
    Settlement['tariff'],
    'normalizedPerSotkaMonth' | 'normalizedIsEstimate'
  >;
  readonly rating: number;
  readonly location: Pick<Settlement['location'], 'district'>;
}): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.link(abs(`/settlements/${item.slug}/index.md`), item.name),
      md.text(
        ` — тариф ${formatTariffAuto(item.tariff)}; рейтинг ${num(item.rating)}/100; ${item.location.district}`,
      ),
    ]),
  ]);

function baselineRow(
  base: Pick<Settlement, 'name' | 'slug'>,
): MarkdownListItem {
  const url = abs(`/settlements/${base.slug}/`);
  return md.listItem([
    md.paragraph([
      md.text(`Базовый поселок: ${base.name} (`),
      linkTo(url),
      md.text(')'),
    ]),
  ]);
}

const codeListItem = (value: string): MarkdownListItem =>
  md.listItem(parseMarkdownFragment(value) as MarkdownListItemInput);

export async function buildHomeMd(): Promise<string> {
  const { settlements, baseline, stats, ratings } = await loadAllData();
  const list = settlements
    .map((item) => ({
      name: item.name,
      slug: item.slug,
      shortName: item.shortName,
      tariff: item.tariff,
      rating: ratings.get(item.slug)?.score ?? 0,
      location: { district: item.location.district },
    }))
    .sort((a, b) => {
      const d = b.rating - a.rating;
      if (d !== 0) return d;
      return compareRuText(a.shortName, b.shortName);
    });
  const picks = [
    ...list.filter((item) => item.slug === baseline.slug),
    ...list.filter((item) => item.slug !== baseline.slug).slice(0, 5),
  ];

  return serialize([
    md.heading(1, 'Сравни тариф КП Шелково с другими поселками'),
    md.paragraph(
      'Структурированное сравнение тарифа КП Шелково с другими коттеджными поселками по тарифам, инфраструктуре, общественным пространствам, сервисной модели и условному рейтингу качества среды.',
    ),
    ...nav('home'),
    md.heading(2, 'Что здесь сравнивается'),
    md.list([
      md.listItem(`Поселков в базе: ${stats.totalSettlements}`),
      baselineRow(baseline),
      md.listItem(`Поселков дешевле Шелково: ${stats.cheaperCount}`),
      md.listItem(`Поселков дороже Шелково: ${stats.moreExpensiveCount}`),
    ]),
    md.heading(2, 'Подборка поселков'),
    md.list(picks.map(settlementLine)),
    md.heading(2, 'Markdown-доступ'),
    md.list([
      md.listItem(
        'HTML-маршруты /, /rating/ и страницы поселков /settlements/SLUG/ поддерживают заголовок Accept: text/markdown.',
      ),
      md.listItem(
        'Прямые Markdown-адреса: /index.md, /rating/index.md, /settlements/SLUG/index.md.',
      ),
    ]),
    md.heading(2, 'Ограничения данных'),
    md.list([
      md.listItem('Если факт не подтвержден источником, поле опускается.'),
      md.listItem('Отсутствие поля означает «неизвестно», а не «точно нет».'),
      codeListItem(
        '`data/settlements.json` является основным полным JSON-файлом поселков.',
      ),
      codeListItem(
        '`data/explorer.json` сокращен для списка, карты и массового сравнения.',
      ),
      md.listItem('Тариф намеренно не входит в формулу условного рейтинга.'),
    ]),
  ]);
}

export async function buildRatingMd(): Promise<string> {
  return serialize([
    md.heading(1, 'Методика расчета условного рейтинга поселков'),
    md.paragraph(
      'Текстовая версия страницы с публичным объяснением того, как считается условный уровень поселка.',
    ),
    ...nav('rating'),
    md.heading(2, 'Базовая формула'),
    md.list([
      codeListItem(
        '`rating = 100 * (infra * 0.50 + spaces * 0.25 + service * 0.10 + distance * 0.15)`',
      ),
      md.listItem(
        'Тариф не влияет на рейтинг и исключен из формулы специально.',
      ),
    ]),
    md.heading(2, 'Блоки и веса'),
    md.list([
      md.listItem('Инфраструктура: 50%'),
      md.listItem('Общественные пространства: 25%'),
      md.listItem('Сервисная модель: 10%'),
      md.listItem('Близость к Москве: 15%'),
    ]),
    md.heading(2, 'Как считаются признаки'),
    md.list([
      codeListItem(
        'Для бинарных статусов используется шкала `yes = 1`, `partial = 0.5`, `no = 0`.',
      ),
      md.listItem(
        'Для упорядоченных признаков применяются отдельные шкалы: дороги, ливневка, видеонаблюдение и подземное электричество.',
      ),
      codeListItem('Неизвестные поля не трактуются как `no`.'),
      codeListItem(
        'Если данных мало, оценка блока тянется к нейтральной середине `0.5`, а не к верхней или нижней границе.',
      ),
    ]),
    md.heading(2, 'Дистанция'),
    md.list([
      md.listItem(
        'Используется расстояние не от центра Москвы напрямую, а приблизительное расстояние за пределами МКАД.',
      ),
      md.listItem('До 20 км за МКАД блок получает максимум.'),
      codeListItem(
        'Дальше оценка плавно снижается по диапазонам `20..40`, `40..60`, `60..80`, `80..100`, затем фиксируется на минимуме.',
      ),
    ]),
    md.heading(2, 'Дополнительные корректировки'),
    md.list([
      codeListItem(
        'Если центральная вода подтверждена и уже входит в тариф (`water_in_tariff = true`), поселок получает `+4` к рейтингу.',
      ),
      codeListItem(
        'Если поселок есть в канале «Коттеджное рабство» (`rabstvo = true`), рейтинг уменьшается на `15` пунктов.',
      ),
    ]),
    md.heading(2, 'Как читать результат'),
    md.list([
      md.listItem(
        'Рейтинг — приблизительная сводная оценка подтвержденных признаков поселка, а не рыночная оценка недвижимости.',
      ),
      md.listItem(
        'Сначала смотрите на инфраструктуру, общественные пространства и сервисную модель, затем отдельно сравнивайте тариф.',
      ),
      md.listItem(
        'Полная визуальная версия с пояснениями и разделами доступна по HTML-ссылке выше.',
      ),
    ]),
  ]);
}

interface Page {
  settlement: Settlement;
  comparison?: ComparisonResult;
  baseline: Settlement;
  rating?: Rating;
}

export function buildSettlementMd({
  settlement,
  comparison,
  baseline,
  rating,
}: Page): string {
  const html = abs(`/settlements/${settlement.slug}/`);
  const markdownUrl = abs(`/settlements/${settlement.slug}/index.md`);
  const tg = settlement.telegram ? telegram(settlement.telegram) : undefined;
  const isBaseline = settlement.slug === baseline.slug;
  const dist = !isBaseline
    ? formatDistance(
        calculateDistance(
          baseline.location.lat,
          baseline.location.lng,
          settlement.location.lat,
          settlement.location.lng,
        ),
      )
    : undefined;
  const company = settlement.managementCompany;
  const companyLine: MarkdownPhrasingInput | undefined =
    company && company.url
      ? [md.text(`${company.title} — `), linkTo(company.url)]
      : company?.title;
  const score = rating ? `${num(rating.score)}/100` : undefined;

  return serialize([
    md.heading(1, settlement.name),
    md.list(
      pick([
        linkRow('HTML', html),
        linkRow('Markdown', markdownUrl),
        md.listItem(`Район: ${settlement.location.district}`),
        md.listItem(`Адрес: ${settlement.location.addressText}`),
        md.listItem(`Тариф: ${formatTariffOriginal(settlement.tariff)}`),
        ...(hasNonSotkaUnit(settlement.tariff)
          ? [
              md.listItem(
                `Средняя за сотку: ${settlement.tariff.normalizedIsEstimate ? '~' : ''}${formatTariff(settlement.tariff.normalizedPerSotkaMonth)} в месяц`,
              ),
            ]
          : []),
        ...(settlement.tariff.note
          ? [md.listItem(`Примечание к тарифу: ${settlement.tariff.note}`)]
          : []),
        ...lots(settlement),
        ...(score ? [md.listItem(`Условный рейтинг: ${score}`)] : []),
        ...(rating
          ? [
              md.listItem(
                `Примерное расстояние от Москвы: ${formatDistance(rating.km)}`,
              ),
            ]
          : []),
        ...(rating
          ? [
              md.listItem(
                `Примерное расстояние за МКАД: ${formatDistance(rating.ring)}`,
              ),
            ]
          : []),
        ...(dist ? [md.listItem(`Расстояние от Шелково: ${dist}`)] : []),
        md.listItem(`Сравнение с Шелково: ${delta(isBaseline, comparison)}`),
        ...(isBaseline ? [md.listItem('Базовый поселок: да')] : []),
        ...(settlement.waterInTariff
          ? [md.listItem('Вода уже включена в тариф: да')]
          : []),
        ...(settlement.rabstvo
          ? [
              md.listItem(
                'Есть подтвержденное упоминание в «Коттеджном рабстве»: да',
              ),
            ]
          : []),
        ...(companyLine ? [row('Управляющая компания', companyLine)] : []),
        linkRow('Сайт', settlement.website),
        ...(tg ? [linkRow('Telegram', tg)] : []),
        linkRow('Карта', map(settlement)),
      ]),
    ),
    md.paragraph(
      'Отсутствующие признаки в разделах ниже означают, что данные не подтверждены источниками.',
    ),
    ...part('Инфраструктура', infoRows(settlement)),
    ...part('Общественные пространства', spaceRows(settlement)),
    ...part('Сервисная модель', serviceRows(settlement)),
    md.heading(2, 'Источники'),
    md.list(
      settlement.sources.map((item) => {
        const info = [
          formatDate(item.dateChecked),
          src[item.type],
          item.title,
        ].join(' — ');
        if (item.comment) {
          return md.listItem([
            md.paragraph([
              md.text(`${info}: `),
              linkTo(item.url),
              md.text(` (${item.comment})`),
            ]),
          ]);
        }
        return md.listItem([
          md.paragraph([md.text(`${info}: `), linkTo(item.url)]),
        ]);
      }),
    ),
  ]);
}
