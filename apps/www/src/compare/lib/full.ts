import { calculateDistance } from '@shelkovo/geo';
import { toPublicComparisons, toPublicStats } from './public-dto';
import type {
  ComparePublicPayload,
  ComparePublicSettlement,
} from './public-dto.types';
import { ComparePublicPayloadSchema } from './public-schema';
import { getKm, getRing, type Rating } from './rating';
import type { ComparisonResult, Settlement, Stats } from './settlement/types';

export interface FullPayloadInput {
  readonly settlements: readonly Settlement[];
  readonly baseline: Settlement;
  readonly stats: Stats;
  readonly comparisons: ReadonlyMap<string, ComparisonResult>;
  readonly ratings: ReadonlyMap<string, Rating>;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

const tariffUnit = (
  unit: Settlement['tariff']['unit'],
): ComparePublicSettlement['tariff']['unit'] => {
  if (unit === 'perSotka') return 'rub_per_sotka';
  if (unit === 'perLot') return 'rub_per_lot';
  return 'rub_fixed';
};

const road = (
  value: Settlement['infrastructure']['roads'],
): ComparePublicSettlement['infrastructure']['roads'] => {
  if (value === 'partlyAsphalt') return 'partial_asphalt';
  return value;
};

const video = (
  value: Settlement['infrastructure']['videoSurveillance'],
): ComparePublicSettlement['infrastructure']['video_surveillance'] => {
  if (value === 'checkpointOnly') return 'checkpoint_only';
  return value;
};

export function toFull(
  settlements: readonly Settlement[],
  ratings: ReadonlyMap<string, Rating>,
  baseline: Settlement,
): ComparePublicSettlement[] {
  return settlements.map((item) => {
    const company = item.managementCompany;
    const rating = ratings.get(item.slug);
    const isBaseline = item.slug === baseline.slug;

    return {
      name: item.name,
      short_name: item.shortName,
      slug: item.slug,
      website: item.website,
      telegram: item.telegram,
      management_company: company
        ? company.url
          ? {
              title: company.title,
              url: company.url,
            }
          : company.title
        : undefined,
      is_baseline: isBaseline,
      location: {
        address_text: item.location.addressText,
        lat: item.location.lat,
        lng: item.location.lng,
        map_url: item.location.mapUrl,
        district: item.location.district,
      },
      tariff: {
        value: item.tariff.value,
        unit: tariffUnit(item.tariff.unit),
        period: item.tariff.period,
        normalized_per_sotka_month: item.tariff.normalizedPerSotkaMonth,
        normalized_is_estimate: item.tariff.normalizedIsEstimate,
        note: item.tariff.note,
        parts: item.tariff.parts?.map((part) => ({
          value: part.value,
          unit: tariffUnit(part.unit),
          period: part.period,
          note: part.note,
        })),
      },
      lots: item.lots
        ? {
            count: item.lots.count,
            area_ha: item.lots.areaHa,
            average_sotka: item.lots.averageSotka,
            average_note: item.lots.averageNote,
          }
        : undefined,
      water_in_tariff: item.waterInTariff,
      rabstvo: item.rabstvo,
      infrastructure: {
        roads: road(item.infrastructure.roads),
        sidewalks: item.infrastructure.sidewalks,
        lighting: item.infrastructure.lighting,
        gas: item.infrastructure.gas,
        water: item.infrastructure.water,
        sewage: item.infrastructure.sewage,
        drainage: item.infrastructure.drainage,
        checkpoints: item.infrastructure.checkpoints,
        security: item.infrastructure.security,
        fencing: item.infrastructure.fencing,
        video_surveillance: video(item.infrastructure.videoSurveillance),
        underground_electricity: item.infrastructure.undergroundElectricity,
        admin_building: item.infrastructure.adminBuilding,
        retail_or_services: item.infrastructure.retailOrServices,
      },
      common_spaces: {
        playgrounds: item.commonSpaces.playgrounds,
        sports: item.commonSpaces.sports,
        pool: item.commonSpaces.pool,
        fitness_club: item.commonSpaces.fitnessClub,
        restaurant: item.commonSpaces.restaurant,
        spa_center: item.commonSpaces.spaCenter,
        walking_routes: item.commonSpaces.walkingRoutes,
        water_access: item.commonSpaces.waterAccess,
        beach_zones: item.commonSpaces.beachZones,
        kids_club: item.commonSpaces.kidsClub,
        sports_camp: item.commonSpaces.sportsCamp,
        primary_school: item.commonSpaces.primarySchool,
        club_infrastructure: item.commonSpaces.clubInfrastructure,
        bbq_zones: item.commonSpaces.bbqZones,
      },
      service_model: {
        garbage_collection: item.serviceModel.garbageCollection,
        snow_removal: item.serviceModel.snowRemoval,
        road_cleaning: item.serviceModel.roadCleaning,
        landscaping: item.serviceModel.landscaping,
        emergency_service: item.serviceModel.emergencyService,
        dispatcher: item.serviceModel.dispatcher,
      },
      rating: rating?.score ?? 0,
      distance: {
        moscow_km:
          rating?.km ?? round(getKm(item.location.lat, item.location.lng)),
        mkad_km:
          rating?.ring ?? round(getRing(item.location.lat, item.location.lng)),
        shelkovo_km: isBaseline
          ? 0
          : round(
              calculateDistance(
                baseline.location.lat,
                baseline.location.lng,
                item.location.lat,
                item.location.lng,
              ),
            ),
      },
    };
  });
}

export const toFullPayload = ({
  settlements,
  baseline,
  stats,
  comparisons,
  ratings,
}: FullPayloadInput): ComparePublicPayload =>
  ComparePublicPayloadSchema.parse({
    settlements: toFull(settlements, ratings, baseline),
    stats: toPublicStats(stats),
    comparisons: toPublicComparisons(comparisons),
  });
