import type {
  RawCommonSpaces,
  RawInfrastructure,
  RawLots,
  RawManagementCompany,
  RawRoadType,
  RawSettlement,
  RawTariff,
  RawTariffUnit,
  RawVideoSurveillance,
} from './schema';
import type {
  CommonSpaces,
  Infrastructure,
  Lots,
  ManagementCompany,
  RoadType,
  Settlement,
  Tariff,
  TariffPart,
  TariffUnit,
  VideoSurveillance,
} from './types';
import { DEFAULT_LOT_SOTKA, getLotAverage } from './lots';

const mapTariffUnit = (unit: RawTariffUnit): TariffUnit => {
  if (unit === 'rub_per_sotka') return 'perSotka';
  if (unit === 'rub_per_lot') return 'perLot';
  if (unit === 'rub_fixed') return 'fixed';
  throw new Error(`Unsupported raw tariff unit: ${unit}`);
};

const mapRoadType = (road: RawRoadType): RoadType => {
  if (road === 'partial_asphalt') return 'partlyAsphalt';
  return road;
};

const mapVideoSurveillance = (
  value: RawVideoSurveillance,
): VideoSurveillance => {
  if (value === 'checkpoint_only') return 'checkpointOnly';
  return value;
};

const mapTariffPart = (tariff: {
  readonly value: number;
  readonly unit: RawTariffUnit;
  readonly period: TariffPart['period'];
  readonly note?: string;
}): TariffPart => ({
  value: tariff.value,
  unit: mapTariffUnit(tariff.unit),
  period: tariff.period,
  note: tariff.note,
});

const months = (period: TariffPart['period']): number => {
  if (period === 'month') return 1;
  if (period === 'quarter') return 3;
  return 12;
};

const normalizeTariffPart = (part: TariffPart, lot: number): number => {
  const monthly = part.value / months(part.period);
  return part.unit === 'perSotka' ? monthly : monthly / lot;
};

const mapTariff = (tariff: RawTariff, averageLot?: number): Tariff => {
  const first = mapTariffPart(tariff);
  const parts = 'parts' in tariff ? tariff.parts.map(mapTariffPart) : undefined;
  const list = parts ?? [first];
  const lot = averageLot ?? DEFAULT_LOT_SOTKA;

  return {
    value: first.value,
    unit: first.unit,
    period: first.period,
    note: first.note,
    normalizedPerSotkaMonth: list.reduce(
      (sum, part) => sum + normalizeTariffPart(part, lot),
      0,
    ),
    normalizedIsEstimate: list.some((part) => part.unit !== 'perSotka'),
    parts,
  };
};

const mapManagementCompany = (
  company?: RawManagementCompany,
): ManagementCompany | undefined => {
  if (!company) return;
  if (typeof company === 'string') return { title: company };
  return company;
};

const mapInfrastructure = (item: RawInfrastructure): Infrastructure => ({
  roads: item.roads ? mapRoadType(item.roads) : undefined,
  sidewalks: item.sidewalks,
  lighting: item.lighting,
  gas: item.gas,
  water: item.water,
  sewage: item.sewage,
  drainage: item.drainage,
  checkpoints: item.checkpoints,
  security: item.security,
  fencing: item.fencing,
  videoSurveillance: item.video_surveillance
    ? mapVideoSurveillance(item.video_surveillance)
    : undefined,
  undergroundElectricity: item.underground_electricity,
  adminBuilding: item.admin_building,
  retailOrServices: item.retail_or_services,
});

const mapCommonSpaces = (item: RawCommonSpaces): CommonSpaces => ({
  playgrounds: item.playgrounds,
  sports: item.sports,
  pool: item.pool,
  fitnessClub: item.fitness_club,
  restaurant: item.restaurant,
  spaCenter: item.spa_center,
  walkingRoutes: item.walking_routes,
  waterAccess: item.water_access,
  beachZones: item.beach_zones,
  kidsClub: item.kids_club,
  sportsCamp: item.sports_camp,
  primarySchool: item.primary_school,
  clubInfrastructure: item.club_infrastructure,
  bbqZones: item.bbq_zones,
});

const mapLots = (lots?: RawLots): Lots | undefined => {
  if (!lots) return;
  return {
    count: lots.count,
    areaHa: lots.area_ha,
    averageSotka: lots.average_sotka,
    averageNote: lots.average_note,
  };
};

export const mapRawSettlement = (raw: RawSettlement): Settlement => {
  const lots = mapLots(raw.lots);
  const infrastructure = mapInfrastructure(raw.infrastructure);
  const commonSpaces = mapCommonSpaces(raw.common_spaces);
  const averageLot = getLotAverage(lots, infrastructure, commonSpaces);

  return {
    name: raw.name,
    shortName: raw.short_name,
    slug: raw.slug,
    website: raw.website,
    telegram: raw.telegram,
    managementCompany: mapManagementCompany(raw.management_company),
    isBaseline: raw.is_baseline,
    location: {
      addressText: raw.location.address_text,
      lat: raw.location.lat,
      lng: raw.location.lng,
      mapUrl: raw.location.map_url,
      district: raw.location.district,
    },
    tariff: mapTariff(raw.tariff, averageLot),
    lots,
    waterInTariff: raw.water_in_tariff,
    rabstvo: raw.rabstvo,
    infrastructure,
    commonSpaces,
    serviceModel: {
      garbageCollection: raw.service_model.garbage_collection,
      snowRemoval: raw.service_model.snow_removal,
      roadCleaning: raw.service_model.road_cleaning,
      landscaping: raw.service_model.landscaping,
      emergencyService: raw.service_model.emergency_service,
      dispatcher: raw.service_model.dispatcher,
    },
    sources: raw.sources.map((source) => ({
      title: source.title,
      url: source.url,
      type: source.type,
      dateChecked: source.date_checked,
      comment: source.comment,
    })),
  };
};
