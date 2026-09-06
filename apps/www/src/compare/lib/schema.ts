import { z } from 'zod';

// Перечисления.
export const AvailabilityStatusEnum = z.enum(['yes', 'no', 'partial']);

export const TariffUnitEnum = z.enum([
  'rub_per_sotka',
  'rub_per_lot',
  'rub_fixed',
]);

export const TariffPeriodEnum = z.enum(['month', 'quarter', 'year']);

export const SourceTypeEnum = z.enum([
  'official',
  'community',
  'media',
  'personal',
]);

// Типы дорог от лучшего к худшему.
export const RoadTypeEnum = z.enum([
  'asphalt',
  'partial_asphalt',
  'gravel',
  'dirt',
]);

// Типы ливневки от лучшего к худшему.
export const DrainageTypeEnum = z.enum(['closed', 'open', 'none']);

// Типы видеонаблюдения от лучшего к худшему.
export const VideoSurveillanceEnum = z.enum([
  'full',
  'checkpoint_only',
  'none',
]);

// Типы подземной электросети от лучшего к худшему.
export const UndergroundElectricityEnum = z.enum(['full', 'partial', 'none']);

// Схема локации с проверкой координат.
export const LocationSchema = z.object({
  address_text: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  map_url: z.string().url().optional(),
  district: z.string().min(1),
});

const TariffPartSchema = z.object({
  value: z.number().nonnegative(),
  unit: TariffUnitEnum,
  period: TariffPeriodEnum,
  note: z
    .string()
    .min(1)
    .refine((note) => note.trim().length > 0, 'note must not be blank')
    .optional(),
});

export const TariffSchema = z
  .union([TariffPartSchema, z.array(TariffPartSchema).min(1)])
  .transform((raw) => {
    const list = Array.isArray(raw) ? raw : [raw];
    const first = list[0];
    const notes = list.flatMap((item) => (item.note ? [item.note] : []));
    const note = notes.length ? [...new Set(notes)].join('; ') : undefined;

    const base = {
      value: first.value,
      unit: first.unit,
      period: first.period,
      ...(note ? { note } : {}),
    };

    if (list.length === 1) return base;
    return { ...base, parts: list };
  });

export const LotsSchema = z
  .object({
    count: z.number().int().positive().optional(),
    area_ha: z.number().positive().optional(),
    average_sotka: z.number().positive().optional(),
    average_note: z.string().min(1).optional(),
  })
  .refine((item) => !item.average_note || item.average_sotka !== undefined, {
    message: 'average_note requires average_sotka',
    path: ['average_note'],
  });

// Схема инфраструктуры: все поля необязательные.
export const InfrastructureSchema = z.object({
  // Тип дороги для сравнения: asphalt > partial_asphalt > gravel > dirt.
  roads: RoadTypeEnum.optional(),
  sidewalks: AvailabilityStatusEnum.optional(),
  lighting: AvailabilityStatusEnum.optional(),
  gas: AvailabilityStatusEnum.optional(),
  // Центральное водоснабжение.
  water: AvailabilityStatusEnum.optional(),
  // Центральная канализация.
  sewage: AvailabilityStatusEnum.optional(),
  // Ливневка для сравнения: closed > open > none.
  drainage: DrainageTypeEnum.optional(),
  checkpoints: AvailabilityStatusEnum.optional(),
  security: AvailabilityStatusEnum.optional(),
  // Закрытая территория с ограждением.
  fencing: AvailabilityStatusEnum.optional(),
  // Видеонаблюдение для сравнения: full > checkpoint_only > none.
  video_surveillance: VideoSurveillanceEnum.optional(),
  // Подземная электросеть для сравнения: full > partial > none.
  underground_electricity: UndergroundElectricityEnum.optional(),
  admin_building: AvailabilityStatusEnum.optional(),
  // Магазины и сервисы.
  retail_or_services: AvailabilityStatusEnum.optional(),
});
// Схема общих пространств: все поля необязательные.
export const CommonSpacesSchema = z.object({
  playgrounds: AvailabilityStatusEnum.optional(),
  sports: AvailabilityStatusEnum.optional(),
  pool: AvailabilityStatusEnum.optional(),
  fitness_club: AvailabilityStatusEnum.optional(),
  restaurant: AvailabilityStatusEnum.optional(),
  spa_center: AvailabilityStatusEnum.optional(),
  walking_routes: AvailabilityStatusEnum.optional(),
  water_access: AvailabilityStatusEnum.optional(),
  beach_zones: AvailabilityStatusEnum.optional(),
  kids_club: AvailabilityStatusEnum.optional(),
  sports_camp: AvailabilityStatusEnum.optional(),
  primary_school: AvailabilityStatusEnum.optional(),
  club_infrastructure: AvailabilityStatusEnum.optional(),
  bbq_zones: AvailabilityStatusEnum.optional(),
});

// Схема сервисной модели.
export const ServiceModelSchema = z.object({
  garbage_collection: AvailabilityStatusEnum.optional(),
  snow_removal: AvailabilityStatusEnum.optional(),
  road_cleaning: AvailabilityStatusEnum.optional(),
  landscaping: AvailabilityStatusEnum.optional(),
  emergency_service: AvailabilityStatusEnum.optional(),
  dispatcher: AvailabilityStatusEnum.optional(),
});

// Схема источника.
export const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  type: SourceTypeEnum,
  date_checked: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.date().transform((item) => item.toISOString().slice(0, 10)),
  ]),
  comment: z.string().default(''),
});

export const ManagementCompanySchema = z.union([
  z.string().min(1),
  z.object({
    title: z.string().min(1),
    url: z.string().url(),
  }),
]);

export const TelegramSchema = z
  .string()
  .trim()
  .regex(/^@?[A-Za-z0-9_]{5,32}$/)
  .transform((item) => item.replace(/^@/, ''));

// Основная схема поселка.
export const SettlementSchema = z
  .object({
    name: z.string().min(1),
    short_name: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/),
    website: z.string().url(),
    telegram: TelegramSchema.optional(),
    management_company: ManagementCompanySchema.optional(),
    is_baseline: z.boolean().default(false),
    location: LocationSchema,
    tariff: TariffSchema,
    lots: LotsSchema.optional(),
    water_in_tariff: z.boolean().optional(),
    rabstvo: z.boolean().optional(),
    infrastructure: InfrastructureSchema.default({}),
    common_spaces: CommonSpacesSchema.default({}),
    service_model: ServiceModelSchema.default({}),
    sources: z.array(SourceSchema).min(1),
  })
  .superRefine((item, ctx) => {
    if (item.water_in_tariff && item.infrastructure.water !== 'yes') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['water_in_tariff'],
        message:
          'water_in_tariff can only be used when central water supply is confirmed',
      });
    }
  });
