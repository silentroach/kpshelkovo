import { z } from 'zod';

const NonEmptyTextSchema = z.string().min(1).meta({ id: 'text' });
const UriSchema = z.url().meta({ id: 'uri' });

const AvailabilitySchema = z
  .enum(['yes', 'no', 'partial'])
  .meta({ id: 'availability' });
const RoadSchema = z
  .enum(['asphalt', 'partial_asphalt', 'gravel', 'dirt'])
  .meta({ id: 'road' });
const DrainageSchema = z
  .enum(['closed', 'open', 'none'])
  .meta({ id: 'drainage' });
const VideoSchema = z
  .enum(['full', 'checkpoint_only', 'none'])
  .meta({ id: 'video' });
const WireSchema = z.enum(['full', 'partial', 'none']).meta({ id: 'wire' });
const TariffUnitSchema = z
  .enum(['rub_per_sotka', 'rub_per_lot', 'rub_fixed'])
  .meta({ id: 'tariff_unit' });
const TariffPeriodSchema = z
  .enum(['month', 'quarter', 'year'])
  .meta({ id: 'tariff_period' });

const PositiveIntegerSchema = z
  .number()
  .multipleOf(1)
  .positive()
  .meta({ id: 'positive_integer' });
const NonnegativeIntegerSchema = z
  .number()
  .multipleOf(1)
  .nonnegative()
  .meta({ id: 'nonnegative_integer' });

const ManagementCompanySchema = z
  .union([
    NonEmptyTextSchema,
    z.strictObject({
      title: NonEmptyTextSchema,
      url: UriSchema,
    }),
  ])
  .meta({ id: 'company' });

const ComparisonSchema = z
  .strictObject({
    tariffDelta: z.number(),
    tariffDeltaPercent: z.number(),
    isCheaper: z.boolean(),
  })
  .meta({ id: 'comparison' });

const LocationSchema = z
  .strictObject({
    address_text: NonEmptyTextSchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    map_url: UriSchema.optional(),
    district: NonEmptyTextSchema,
  })
  .meta({ id: 'location' });

const TariffPartSchema = z
  .strictObject({
    value: z.number().nonnegative(),
    unit: TariffUnitSchema,
    period: TariffPeriodSchema,
    note: NonEmptyTextSchema.optional(),
  })
  .meta({ id: 'tariff_part' });

const TariffSchema = z
  .strictObject({
    value: z.number().nonnegative(),
    unit: TariffUnitSchema,
    period: TariffPeriodSchema,
    normalized_per_sotka_month: z.number().nonnegative(),
    normalized_is_estimate: z.boolean(),
    note: NonEmptyTextSchema.optional(),
    parts: z.array(TariffPartSchema).min(1).optional(),
  })
  .meta({ id: 'tariff' });

const LotsSchema = z
  .strictObject({
    count: PositiveIntegerSchema.optional(),
    area_ha: z.number().positive().optional(),
    average_sotka: z.number().positive().optional(),
    average_note: NonEmptyTextSchema.optional(),
  })
  .meta({ id: 'lots' });

const InfrastructureSchema = z
  .strictObject({
    roads: RoadSchema.optional(),
    sidewalks: AvailabilitySchema.optional(),
    lighting: AvailabilitySchema.optional(),
    gas: AvailabilitySchema.optional(),
    water: AvailabilitySchema.optional(),
    sewage: AvailabilitySchema.optional(),
    drainage: DrainageSchema.optional(),
    checkpoints: AvailabilitySchema.optional(),
    security: AvailabilitySchema.optional(),
    fencing: AvailabilitySchema.optional(),
    video_surveillance: VideoSchema.optional(),
    underground_electricity: WireSchema.optional(),
    admin_building: AvailabilitySchema.optional(),
    retail_or_services: AvailabilitySchema.optional(),
  })
  .meta({ id: 'infrastructure' });

const CommonSpacesSchema = z
  .strictObject({
    playgrounds: AvailabilitySchema.optional(),
    sports: AvailabilitySchema.optional(),
    pool: AvailabilitySchema.optional(),
    fitness_club: AvailabilitySchema.optional(),
    restaurant: AvailabilitySchema.optional(),
    spa_center: AvailabilitySchema.optional(),
    walking_routes: AvailabilitySchema.optional(),
    water_access: AvailabilitySchema.optional(),
    beach_zones: AvailabilitySchema.optional(),
    kids_club: AvailabilitySchema.optional(),
    sports_camp: AvailabilitySchema.optional(),
    primary_school: AvailabilitySchema.optional(),
    club_infrastructure: AvailabilitySchema.optional(),
    bbq_zones: AvailabilitySchema.optional(),
  })
  .meta({ id: 'common_spaces' });

const ServiceModelSchema = z
  .strictObject({
    garbage_collection: AvailabilitySchema.optional(),
    snow_removal: AvailabilitySchema.optional(),
    road_cleaning: AvailabilitySchema.optional(),
    landscaping: AvailabilitySchema.optional(),
    emergency_service: AvailabilitySchema.optional(),
    dispatcher: AvailabilitySchema.optional(),
  })
  .meta({ id: 'service_model' });

const DistanceSchema = z
  .strictObject({
    moscow_km: z.number().nonnegative(),
    mkad_km: z.number().nonnegative(),
    shelkovo_km: z.number().nonnegative(),
  })
  .meta({ id: 'distance' });

const SettlementSchema = z
  .strictObject({
    name: NonEmptyTextSchema,
    short_name: NonEmptyTextSchema,
    slug: z.string().regex(/^[a-z0-9-]+$/),
    website: UriSchema,
    telegram: z
      .string()
      .regex(/^[A-Za-z0-9_]{5,32}$/)
      .optional(),
    management_company: ManagementCompanySchema.optional(),
    is_baseline: z.boolean(),
    location: LocationSchema,
    tariff: TariffSchema,
    lots: LotsSchema.optional(),
    water_in_tariff: z.boolean().optional(),
    rabstvo: z.boolean().optional(),
    infrastructure: InfrastructureSchema,
    common_spaces: CommonSpacesSchema,
    service_model: ServiceModelSchema,
    rating: z.number().min(0).max(100),
    distance: DistanceSchema,
  })
  .meta({ id: 'settlement' });

const StatsSchema = z
  .strictObject({
    shelkovoTariff: z.number().nonnegative(),
    medianTariff: z.number().nonnegative(),
    peerMedianTariff: z.number().nonnegative(),
    meanTariff: z.number().nonnegative(),
    minTariff: z.number().nonnegative(),
    maxTariff: z.number().nonnegative(),
    shelkovoRank: PositiveIntegerSchema,
    totalSettlements: PositiveIntegerSchema,
    cheaperCount: NonnegativeIntegerSchema,
    moreExpensiveCount: NonnegativeIntegerSchema,
    shelkovoVsMedianPercent: z.number(),
    shelkovoVsPeerMedianPercent: z.number(),
    shelkovoVsMeanPercent: z.number(),
  })
  .meta({ id: 'stats' });

export const ComparePublicPayloadSchema = z
  .strictObject({
    settlements: z.array(SettlementSchema),
    stats: StatsSchema,
    comparisons: z.record(z.string().regex(/^[a-z0-9-]+$/), ComparisonSchema),
  })
  .meta({
    title: 'SettlementsPayload',
    description:
      'Полная лента поселков только для чтения с детальными полями, вычисленными расстояниями, рейтингом и агрегатами.',
  });

export type ComparePublicPayload = z.output<typeof ComparePublicPayloadSchema>;
export type ComparePublicSettlement =
  ComparePublicPayload['settlements'][number];
export type PublicComparison = ComparePublicPayload['comparisons'][string];
export type PublicComparisons = ComparePublicPayload['comparisons'];
export type PublicStats = ComparePublicPayload['stats'];
