import { calculateDistance } from '@shelkovo/geo';
import type {
  AvailabilityStatus,
  CommonSpaces,
  DrainageType,
  Infrastructure,
  RoadType,
  ServiceModel,
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
  orderedScores: {
    roads: {
      asphalt: 1,
      partlyAsphalt: 0.75,
      gravel: 0.35,
      dirt: 0,
    } satisfies Record<RoadType, number>,
    drainage: {
      closed: 1,
      open: 0.6,
      none: 0,
    } satisfies Record<DrainageType, number>,
    videoSurveillance: {
      full: 1,
      checkpointOnly: 0.55,
      none: 0,
    } satisfies Record<VideoSurveillance, number>,
    undergroundElectricity: {
      full: 1,
      partial: 0.5,
      none: 0,
    } satisfies Record<UndergroundElectricity, number>,
  },
  fieldWeights: {
    infrastructure: {
      roads: 1,
      sidewalks: 0.35,
      lighting: 0.5,
      gas: 0.9,
      water: 1,
      sewage: 0.95,
      drainage: 0.45,
      checkpoints: 0.6,
      security: 0.95,
      fencing: 0.35,
      videoSurveillance: 0.75,
      undergroundElectricity: 0.35,
      adminBuilding: 0.25,
      retailOrServices: 0.55,
    } satisfies Record<keyof Infrastructure, number>,
    commonSpaces: {
      clubInfrastructure: 0.6,
      playgrounds: 0.9,
      sports: 0.8,
      walkingRoutes: 0.8,
      waterAccess: 0.6,
      beachZones: 0.35,
      bbqZones: 0.25,
      pool: 0.45,
      fitnessClub: 0.4,
      restaurant: 0.35,
      spaCenter: 0.2,
      kidsClub: 0.3,
      sportsCamp: 0.15,
      primarySchool: 0.15,
    } satisfies Record<keyof CommonSpaces, number>,
    serviceModel: {
      garbageCollection: 1,
      snowRemoval: 0.9,
      roadCleaning: 0.8,
      landscaping: 0.6,
      emergencyService: 0.6,
      dispatcher: 0.4,
    } satisfies Record<keyof ServiceModel, number>,
  },
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
  return RATING_METHODOLOGY.availabilityScores[value];
}

function road(value?: RoadType): number | undefined {
  if (!value) return;
  return RATING_METHODOLOGY.orderedScores.roads[value];
}

function drain(value?: DrainageType): number | undefined {
  if (!value) return;
  return RATING_METHODOLOGY.orderedScores.drainage[value];
}

function video(value?: VideoSurveillance): number | undefined {
  if (!value) return;
  return RATING_METHODOLOGY.orderedScores.videoSurveillance[value];
}

function wire(value?: UndergroundElectricity): number | undefined {
  if (!value) return;
  return RATING_METHODOLOGY.orderedScores.undergroundElectricity[value];
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
  const weights = RATING_METHODOLOGY.fieldWeights.infrastructure;

  return mean([
    { value: road(info.roads), weight: weights.roads },
    { value: avail(info.sidewalks), weight: weights.sidewalks },
    { value: avail(info.lighting), weight: weights.lighting },
    { value: avail(info.gas), weight: weights.gas },
    { value: avail(info.water), weight: weights.water },
    { value: avail(info.sewage), weight: weights.sewage },
    { value: drain(info.drainage), weight: weights.drainage },
    { value: avail(info.checkpoints), weight: weights.checkpoints },
    { value: avail(info.security), weight: weights.security },
    { value: avail(info.fencing), weight: weights.fencing },
    {
      value: video(info.videoSurveillance),
      weight: weights.videoSurveillance,
    },
    {
      value: wire(info.undergroundElectricity),
      weight: weights.undergroundElectricity,
    },
    { value: avail(info.adminBuilding), weight: weights.adminBuilding },
    {
      value: avail(info.retailOrServices),
      weight: weights.retailOrServices,
    },
  ]);
}

function spaces(item: Settlement): Group {
  const info = item.commonSpaces;
  const weights = RATING_METHODOLOGY.fieldWeights.commonSpaces;

  return mean([
    {
      value: avail(info.clubInfrastructure),
      weight: weights.clubInfrastructure,
    },
    { value: avail(info.playgrounds), weight: weights.playgrounds },
    { value: avail(info.sports), weight: weights.sports },
    { value: avail(info.walkingRoutes), weight: weights.walkingRoutes },
    { value: avail(info.waterAccess), weight: weights.waterAccess },
    { value: avail(info.beachZones), weight: weights.beachZones },
    { value: avail(info.bbqZones), weight: weights.bbqZones },
    { value: avail(info.pool), weight: weights.pool },
    { value: avail(info.fitnessClub), weight: weights.fitnessClub },
    { value: avail(info.restaurant), weight: weights.restaurant },
    { value: avail(info.spaCenter), weight: weights.spaCenter },
    { value: avail(info.kidsClub), weight: weights.kidsClub },
    { value: avail(info.sportsCamp), weight: weights.sportsCamp },
    { value: avail(info.primarySchool), weight: weights.primarySchool },
  ]);
}

function service(item: Settlement): Group {
  const info = item.serviceModel;
  const weights = RATING_METHODOLOGY.fieldWeights.serviceModel;

  return mean([
    {
      value: avail(info.garbageCollection),
      weight: weights.garbageCollection,
    },
    { value: avail(info.snowRemoval), weight: weights.snowRemoval },
    { value: avail(info.roadCleaning), weight: weights.roadCleaning },
    { value: avail(info.landscaping), weight: weights.landscaping },
    {
      value: avail(info.emergencyService),
      weight: weights.emergencyService,
    },
    { value: avail(info.dispatcher), weight: weights.dispatcher },
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
