import { z } from 'astro/zod';

import { PARCEL_CADASTRAL_NUMBER, PARCEL_CODE, PARCEL_PARTS } from './schema.ts';

const nonBlank = z.string().trim().min(1);
const cadastralNumber = z.string().regex(PARCEL_CADASTRAL_NUMBER);
const code = z.string().regex(PARCEL_CODE);

export const GENPLAN_STATUSES = [
  'Свободен',
  'Забронирован',
  'Продан',
  'Снят с продажи',
  'Без документов',
  'Неразобранное',
  'Закрыто и не реализовано'
] as const;

export const GENPLAN_LOCATIONS = [
  'луговой',
  'деревья на участке',
  'с лесными деревьями',
  'лесной участок',
  'примыкает к лесу',
  'с видом на лес',
  'с выходом в лес',
  'с выходом к реке',
  'с видом на лес у реки',
  'с выходом в лес и к реке',
  'у леса и реки',
  'с пляжем',
  'с прудом',
  'рядом с парком',
  'в лесном парке'
] as const;
const projectedPosition = z.tuple([
  z.number().min(-20_037_509).max(20_037_509),
  z.number().min(-20_037_509).max(20_037_509)
]);
const ring = z
  .array(projectedPosition)
  .min(4)
  .refine(
    (coordinates) => {
      const first = coordinates[0];
      const last = coordinates.at(-1);
      return Boolean(first && last && first[0] === last[0] && first[1] === last[1]);
    },
    { message: 'projected polygon rings must be closed' }
  );
const polygon = z.array(ring).min(1);
const crs = z
  .object({
    type: z.literal('name'),
    properties: z.object({ name: z.literal('EPSG:3857') }).strict()
  })
  .strict();

export const RawNspdFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    id: z.number().int().positive(),
    geometry: z.discriminatedUnion('type', [
      z.object({ type: z.literal('Polygon'), coordinates: polygon, crs }).strict(),
      z
        .object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1), crs })
        .strict()
    ]),
    properties: z
      .object({
        cadastralNumber,
        area: z.number().positive().optional(),
        status: nonBlank
      })
      .strict()
  })
  .strict();

export const NspdMetadataSchema = z
  .object({
    source: z.url(),
    endpoint: z.url(),
    method: z.literal('POST'),
    capturedOn: z.iso.date(),
    savedAt: z.iso.datetime(),
    geometryCrs: z.literal('EPSG:3857'),
    queryCrs: z.literal('EPSG:4326'),
    queryRing4326: z.array(z.tuple([z.number(), z.number()])).min(4),
    viewportBounds3857: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    response: z
      .object({ featureCount: z.number().int().positive(), coverageVerified: z.boolean() })
      .strict()
  })
  .strict();

export const GenplanSnapshotSchema = z
  .object({
    part: z.enum(PARCEL_PARTS),
    page: z.url(),
    capturedAt: z.iso.datetime({ offset: true }),
    plots: z
      .array(
        z
          .object({
            id: z.string().min(1),
            cadastralReference: z.string().optional(),
            status: z.string().trim().pipe(z.enum(GENPLAN_STATUSES)),
            location: z.string().trim().pipe(z.enum(GENPLAN_LOCATIONS)),
            objectprice: z.number().int().nonnegative().optional()
          })
          .strict()
      )
      .min(1)
  })
  .strict()
  .superRefine(({ plots }, ctx) => {
    const ids = new Set<string>();
    plots.forEach(({ id }, index) => {
      if (ids.has(id))
        ctx.addIssue({
          code: 'custom',
          path: ['plots', index, 'id'],
          message: `duplicate plot id ${id}`
        });
      ids.add(id);
    });
  })
  .transform((snapshot) => ({
    ...snapshot,
    plots: snapshot.plots.toSorted(
      (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }) || a.id.localeCompare(b.id)
    )
  }));

export const ParcelMatchesSchema = z
  .object({
    matches: z.array(
      z
        .object({
          codes: z.array(code).min(1),
          cadastral_number: cadastralNumber.optional(),
          cadastral_numbers: z.array(cadastralNumber).min(2).optional(),
          source_cadastral_references: z.record(
            code,
            z.union([z.string(), z.object({ absent: z.literal(true) }).strict()])
          ),
          primary_code: code.optional(),
          evidence: nonBlank,
          price_source_code: code.optional(),
          price_evidence: nonBlank.optional()
        })
        .strict()
        .superRefine((match, ctx) => {
          if (Boolean(match.cadastral_number) === Boolean(match.cadastral_numbers)) {
            ctx.addIssue({ code: 'custom', message: 'specify exactly one cadastral form' });
          }
          if (
            match.cadastral_numbers &&
            new Set(match.cadastral_numbers).size !== match.cadastral_numbers.length
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['cadastral_numbers'],
              message: 'duplicate cadastral numbers in group'
            });
          }
          const codes = new Set(match.codes);
          if (codes.size !== match.codes.length) {
            ctx.addIssue({ code: 'custom', path: ['codes'], message: 'duplicate match codes' });
          }
          for (const code of Object.keys(match.source_cadastral_references)) {
            if (!codes.has(code)) {
              ctx.addIssue({
                code: 'custom',
                path: ['source_cadastral_references'],
                message: `unexpected source code ${code}`
              });
            }
          }
          const sourceCodes = Object.keys(match.source_cadastral_references);
          for (const code of match.codes) {
            if (!sourceCodes.includes(code)) {
              ctx.addIssue({
                code: 'custom',
                path: ['source_cadastral_references'],
                message: `missing source reference for ${code}`
              });
            }
          }
          if (match.primary_code && !codes.has(match.primary_code)) {
            ctx.addIssue({
              code: 'custom',
              path: ['primary_code'],
              message: 'primary code must belong to this match'
            });
          }
          if (
            match.price_source_code &&
            (!codes.has(match.price_source_code) || !match.price_evidence)
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['price_source_code'],
              message: 'whole-parcel price requires a matching code and evidence'
            });
          }
          if (match.price_evidence && !match.price_source_code) {
            ctx.addIssue({
              code: 'custom',
              path: ['price_evidence'],
              message: 'price evidence requires a source code'
            });
          }
        })
    )
  })
  .strict();

export type RawNspdFeature = z.output<typeof RawNspdFeatureSchema>;
export type NspdMetadata = z.output<typeof NspdMetadataSchema>;
export type GenplanSnapshot = z.output<typeof GenplanSnapshotSchema>;
export type ParcelMatches = z.output<typeof ParcelMatchesSchema>;

/** Only the source fields we retain; other fields may contain private details. */
export const GenplanPagePlotSchema = z
  .object({
    id: z.string().min(1),
    cadastral_number: z.string().nullable(),
    status: z.string().trim().pipe(z.enum(GENPLAN_STATUSES)),
    location: z.string().trim().pipe(z.enum(GENPLAN_LOCATIONS)),
    objectprice: z.number().int().nonnegative().nullable()
  })
  .passthrough();
