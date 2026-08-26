import type {
  AvailabilityStatus,
  CommonSpaces,
  DrainageType,
  Infrastructure,
  Lots,
  RoadType,
} from './types';

const SOTKA = 100;
export const DEFAULT_LOT_SOTKA = 10;

export interface LotPart {
  readonly title: string;
  readonly value: number;
  readonly note?: string;
}

export interface LotExact {
  readonly size: number;
  readonly exact: true;
  readonly count?: number;
  readonly areaHa?: number;
  readonly note?: string;
}

export interface LotEstimate {
  readonly size: number;
  readonly exact: false;
  readonly count: number;
  readonly areaHa: number;
  readonly gross: number;
  readonly shared: number;
  readonly cap: boolean;
  readonly rows: readonly LotPart[];
}

export type LotBreakdown = LotExact | LotEstimate;

const share = (
  value: AvailabilityStatus | undefined,
  yes: number,
  part = yes / 2,
): number => {
  if (value === 'yes') return yes;
  if (value === 'partial') return part;
  return 0;
};

const road = (value?: RoadType): number => {
  if (value === 'asphalt') return 0.9;
  if (value === 'partlyAsphalt') return 0.8;
  if (value === 'gravel') return 0.7;
  if (value === 'dirt') return 0.6;
  return 0;
};

const drain = (value?: DrainageType): number => {
  if (value === 'closed') return 0.25;
  if (value === 'open') return 0.15;
  return 0;
};

const note = (value?: AvailabilityStatus): string | undefined => {
  if (value === 'yes') return 'подтверждено';
  if (value === 'partial') return 'частично подтверждено';
  return;
};

const roadNote = (value?: RoadType): string | undefined => {
  if (value === 'asphalt') return 'асфальт';
  if (value === 'partlyAsphalt') return 'частично асфальт';
  if (value === 'gravel') return 'гравий';
  if (value === 'dirt') return 'грунт';
  return;
};

const drainNote = (value?: DrainageType): string | undefined => {
  if (value === 'closed') return 'закрытая';
  if (value === 'open') return 'открытая';
  return;
};

const add = (
  rows: LotPart[],
  title: string,
  value: number,
  item?: string,
): void => {
  if (!value) return;
  rows.push({ title, value, note: item });
};

export function getLotBreakdown(
  lots?: Lots,
  infra?: Infrastructure,
  common?: CommonSpaces,
): LotBreakdown | undefined {
  if (lots?.averageSotka) {
    return {
      size: lots.averageSotka,
      exact: true,
      count: lots.count,
      areaHa: lots.areaHa,
      note: lots.averageNote,
    };
  }

  if (!lots?.count || !lots.areaHa) return;

  const rows: LotPart[] = [];
  add(rows, 'Дороги', road(infra?.roads), roadNote(infra?.roads));
  add(
    rows,
    'Тротуары',
    share(infra?.sidewalks, 0.2, 0.1),
    note(infra?.sidewalks),
  );
  add(rows, 'Ливневки', drain(infra?.drainage), drainNote(infra?.drainage));
  add(
    rows,
    'КПП',
    share(infra?.checkpoints, 0.1, 0.05),
    note(infra?.checkpoints),
  );
  add(
    rows,
    'Админка',
    share(infra?.adminBuilding, 0.1, 0.05),
    note(infra?.adminBuilding),
  );
  add(
    rows,
    'Сервисы на территории',
    share(infra?.retailOrServices, 0.15, 0.08),
    note(infra?.retailOrServices),
  );
  add(
    rows,
    'Детские площадки',
    share(common?.playgrounds, 0.15, 0.08),
    note(common?.playgrounds),
  );
  add(rows, 'Спорт', share(common?.sports, 0.15, 0.08), note(common?.sports));
  add(
    rows,
    'Маршруты для прогулок',
    share(common?.walkingRoutes, 0.15, 0.08),
    note(common?.walkingRoutes),
  );
  add(
    rows,
    'Доступ к воде',
    share(common?.waterAccess, 0.1, 0.05),
    note(common?.waterAccess),
  );
  add(
    rows,
    'Пляжные зоны',
    share(common?.beachZones, 0.15, 0.08),
    note(common?.beachZones),
  );
  add(
    rows,
    'Детский клуб',
    share(common?.kidsClub, 0.15, 0.08),
    note(common?.kidsClub),
  );
  add(
    rows,
    'BBQ-зоны',
    share(common?.bbqZones, 0.1, 0.05),
    note(common?.bbqZones),
  );
  add(rows, 'Бассейн', share(common?.pool, 0.2, 0.1), note(common?.pool));
  add(
    rows,
    'Фитнес',
    share(common?.fitnessClub, 0.2, 0.1),
    note(common?.fitnessClub),
  );
  add(
    rows,
    'Ресторан',
    share(common?.restaurant, 0.2, 0.1),
    note(common?.restaurant),
  );
  add(
    rows,
    'SPA',
    share(common?.spaCenter, 0.25, 0.12),
    note(common?.spaCenter),
  );
  add(
    rows,
    'Спортивный лагерь',
    share(common?.sportsCamp, 0.25, 0.12),
    note(common?.sportsCamp),
  );
  add(
    rows,
    'Школа',
    share(common?.primarySchool, 0.3, 0.15),
    note(common?.primarySchool),
  );

  const gross = (lots.areaHa * SOTKA) / lots.count;
  const raw = rows.reduce((sum, item) => sum + item.value, 0);
  const cap = raw > 2.5;
  const shared = Math.min(raw, 2.5);

  return {
    size: Math.max(gross - shared, 1),
    exact: false,
    count: lots.count,
    areaHa: lots.areaHa,
    gross,
    shared,
    cap,
    rows,
  };
}

export const getLotAverage = (
  lots?: Lots,
  infra?: Infrastructure,
  common?: CommonSpaces,
): number | undefined => getLotBreakdown(lots, infra, common)?.size;
