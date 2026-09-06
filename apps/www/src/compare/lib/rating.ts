import { calculateDistance } from '@shelkovo/geo';
import type {
  AvailabilityStatus,
  DrainageType,
  RoadType,
  Settlement,
  UndergroundElectricity,
  VideoSurveillance,
} from './settlement/types';

export interface Rating {
  readonly score: number;
  readonly km: number;
  readonly ring: number;
}

interface Group {
  raw?: number;
  fill: number;
}

const MOSCOW = {
  lat: 55.7558,
  lng: 37.6176,
};

// Приближенные точки МКАД для внутренней оценки радиуса.
const MKAD = [
  { lat: 55.9111, lng: 37.5424 },
  { lat: 55.8794, lng: 37.3911 },
  { lat: 55.8258, lng: 37.8428 },
  { lat: 55.6927, lng: 37.8424 },
  { lat: 55.5737, lng: 37.6789 },
  { lat: 55.6041, lng: 37.4572 },
  { lat: 55.7062, lng: 37.3718 },
  { lat: 55.8808, lng: 37.7531 },
];

export const MKAD_RADIUS = round(
  MKAD.reduce(
    (sum, item) =>
      sum + calculateDistance(MOSCOW.lat, MOSCOW.lng, item.lat, item.lng),
    0,
  ) / MKAD.length,
);

export const RATING_METHODOLOGY = {
  scoreRange: { min: 0, max: 100 },
  neutralBlockScore: 0.5,
  groupWeights: {
    infrastructure: 0.5,
    commonSpaces: 0.25,
    serviceModel: 0.1,
    distance: 0.15,
  },
  availabilityScores: {
    yes: 1,
    partial: 0.5,
    no: 0,
  } satisfies Record<AvailabilityStatus, number>,
  distancePoints: [
    { ringKm: 20, score: 1 },
    { ringKm: 40, score: 0.82 },
    { ringKm: 60, score: 0.58 },
    { ringKm: 80, score: 0.32 },
    { ringKm: 100, score: 0.12 },
  ],
  adjustments: {
    waterInTariffBonus: 4,
    rabstvoPenalty: 15,
  },
} as const;

const AVAIL = RATING_METHODOLOGY.availabilityScores;

const ROAD = {
  asphalt: 1,
  partlyAsphalt: 0.75,
  gravel: 0.35,
  dirt: 0,
} as const satisfies Record<RoadType, number>;

const DRAIN = {
  closed: 1,
  open: 0.6,
  none: 0,
} as const satisfies Record<DrainageType, number>;

const VIDEO = {
  full: 1,
  checkpointOnly: 0.55,
  none: 0,
} as const satisfies Record<VideoSurveillance, number>;

const WIRE = {
  full: 1,
  partial: 0.5,
  none: 0,
} as const satisfies Record<UndergroundElectricity, number>;

export function getKm(lat: number, lng: number): number {
  return calculateDistance(MOSCOW.lat, MOSCOW.lng, lat, lng);
}

export function getRing(lat: number, lng: number): number {
  return Math.max(getKm(lat, lng) - MKAD_RADIUS, 0);
}

function tune(item: Settlement): number {
  const { waterInTariffBonus, rabstvoPenalty } = RATING_METHODOLOGY.adjustments;

  return (
    (item.waterInTariff ? waterInTariffBonus : 0) -
    (item.rabstvo ? rabstvoPenalty : 0)
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function lerp(
  value: number,
  start: number,
  end: number,
  first: number,
  last: number,
): number {
  if (start === end) return last;
  const share = (value - start) / (end - start);
  return first + (last - first) * share;
}

function avail(value?: AvailabilityStatus): number | undefined {
  if (!value) return;
  return AVAIL[value];
}

function road(value?: RoadType): number | undefined {
  if (!value) return;
  return ROAD[value];
}

function drain(value?: DrainageType): number | undefined {
  if (!value) return;
  return DRAIN[value];
}

function video(value?: VideoSurveillance): number | undefined {
  if (!value) return;
  return VIDEO[value];
}

function wire(value?: UndergroundElectricity): number | undefined {
  if (!value) return;
  return WIRE[value];
}

function mean(list: Array<{ value?: number; weight: number }>): Group {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  const known = list.reduce(
    (sum, item) => sum + (item.value === undefined ? 0 : item.weight),
    0,
  );

  if (known === 0 || total === 0) {
    return { fill: 0 };
  }

  const sum = list.reduce(
    (acc, item) =>
      acc + (item.value === undefined ? 0 : item.value * item.weight),
    0,
  );

  return {
    raw: sum / known,
    fill: known / total,
  };
}

function infra(item: Settlement): Group {
  const info = item.infrastructure;

  return mean([
    { value: road(info.roads), weight: 1 },
    { value: avail(info.sidewalks), weight: 0.35 },
    { value: avail(info.lighting), weight: 0.5 },
    { value: avail(info.gas), weight: 0.9 },
    { value: avail(info.water), weight: 1 },
    { value: avail(info.sewage), weight: 0.95 },
    { value: drain(info.drainage), weight: 0.45 },
    { value: avail(info.checkpoints), weight: 0.6 },
    { value: avail(info.security), weight: 0.95 },
    { value: avail(info.fencing), weight: 0.35 },
    { value: video(info.videoSurveillance), weight: 0.75 },
    { value: wire(info.undergroundElectricity), weight: 0.35 },
    { value: avail(info.adminBuilding), weight: 0.25 },
    { value: avail(info.retailOrServices), weight: 0.55 },
  ]);
}

function spaces(item: Settlement): Group {
  const info = item.commonSpaces;

  return mean([
    { value: avail(info.clubInfrastructure), weight: 0.6 },
    { value: avail(info.playgrounds), weight: 0.9 },
    { value: avail(info.sports), weight: 0.8 },
    { value: avail(info.walkingRoutes), weight: 0.8 },
    { value: avail(info.waterAccess), weight: 0.6 },
    { value: avail(info.beachZones), weight: 0.35 },
    { value: avail(info.bbqZones), weight: 0.25 },
    { value: avail(info.pool), weight: 0.45 },
    { value: avail(info.fitnessClub), weight: 0.4 },
    { value: avail(info.restaurant), weight: 0.35 },
    { value: avail(info.spaCenter), weight: 0.2 },
    { value: avail(info.kidsClub), weight: 0.3 },
    { value: avail(info.sportsCamp), weight: 0.15 },
    { value: avail(info.primarySchool), weight: 0.15 },
  ]);
}

function service(item: Settlement): Group {
  const info = item.serviceModel;

  return mean([
    { value: avail(info.garbageCollection), weight: 1 },
    { value: avail(info.snowRemoval), weight: 0.9 },
    { value: avail(info.roadCleaning), weight: 0.8 },
    { value: avail(info.landscaping), weight: 0.6 },
    { value: avail(info.emergencyService), weight: 0.6 },
    { value: avail(info.dispatcher), weight: 0.4 },
  ]);
}

function mix(item: Group): number {
  const neutral = RATING_METHODOLOGY.neutralBlockScore;
  if (item.raw === undefined) return neutral;
  return item.raw * item.fill + neutral * (1 - item.fill);
}

function near(ring: number): number {
  const points = RATING_METHODOLOGY.distancePoints;
  let previous: (typeof points)[number] = points[0];

  if (ring <= previous.ringKm) return previous.score;

  for (const point of points.slice(1)) {
    if (ring <= point.ringKm) {
      return lerp(
        ring,
        previous.ringKm,
        point.ringKm,
        previous.score,
        point.score,
      );
    }
    previous = point;
  }

  return previous.score;
}

/**
 * Build a stable quality rating for each settlement.
 * Tariff is intentionally excluded from the score.
 */
export function buildRatings(
  settlements: readonly Settlement[],
): ReadonlyMap<string, Rating> {
  return new Map(
    settlements.map((item) => {
      const km = getKm(item.location.lat, item.location.lng);
      const ring = Math.max(km - MKAD_RADIUS, 0);
      const { groupWeights, scoreRange } = RATING_METHODOLOGY;
      const base =
        scoreRange.max *
        (mix(infra(item)) * groupWeights.infrastructure +
          mix(spaces(item)) * groupWeights.commonSpaces +
          mix(service(item)) * groupWeights.serviceModel +
          near(ring) * groupWeights.distance);
      const score = Math.max(
        scoreRange.min,
        Math.min(base + tune(item), scoreRange.max),
      );

      return [
        item.slug,
        {
          score: round(score),
          km: round(km),
          ring: round(ring),
        },
      ];
    }),
  );
}
