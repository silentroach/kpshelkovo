import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import type { LngLat, LngLatBounds } from '@yandex/ymaps3-types';
import { defineConfig } from 'vite';
import { z } from 'zod';

import type { DemoData, DemoParcel } from './types.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(new URL('../../../../apps/www/package.json', import.meta.url));
const displayOffset = z
  .object({
    offset_east_m: z.number(),
    offset_north_m: z.number()
  })
  .strict()
  .parse(
    require('yaml').parse(
      readFileSync(
        new URL('../../../../apps/www/src/config/parcel-map.yaml', import.meta.url),
        'utf8'
      )
    )
  );
const read = (name: string): string => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const readRows = (name: string): unknown[] =>
  read(name)
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
const cadastralNumber = z.string().regex(/^\d+:\d+:\d+:\d+$/);
const code = z.string().regex(/^SH[VFRP]-[A-Z]\d+$/);
const position = z.tuple([z.number(), z.number()]);
const ring = z
  .array(position)
  .min(4)
  .refine((points) => {
    const first = points[0];
    const last = points.at(-1);
    return first && last && first[0] === last[0] && first[1] === last[1];
  }, 'Кольцо должно быть замкнуто');
const polygon = z.array(ring).min(1);
const crs = z.object({
  type: z.literal('name'),
  properties: z.object({ name: z.literal('EPSG:3857') })
});
const parcels = z
  .array(
    z.object({
      id: z.number().int(),
      geometry: z.discriminatedUnion('type', [
        z.object({ type: z.literal('Polygon'), coordinates: polygon, crs }),
        z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1), crs })
      ]),
      properties: z.object({ cadastralNumber, area: z.number().positive().optional() })
    })
  )
  .refine(
    (rows) => new Set(rows.map((row) => row.properties.cadastralNumber)).size === rows.length,
    'Кадастровые номера должны быть уникальны'
  )
  .parse(readRows('nspd-parcels.ndjson'));
const plots = z
  .array(
    z.object({
      code,
      part: z.enum(['shv', 'shf', 'shr', 'shp']),
      cadastralReference: z.string().optional()
    })
  )
  .refine(
    (rows) => new Set(rows.map((row) => row.code)).size === rows.length,
    'Коды должны быть уникальны'
  )
  .parse(readRows('genplan-plots.ndjson'));
const capture = z
  .object({
    confirmedCorrespondences: z.array(z.object({ codes: z.array(code).min(1), cadastralNumber }))
  })
  .parse(JSON.parse(read('capture.json')));

const byNumber = new Map(parcels.map((parcel) => [parcel.properties.cadastralNumber, parcel]));
const confirmed = new Map<string, string>();
for (const match of capture.confirmedCorrespondences) {
  if (!byNumber.has(match.cadastralNumber))
    throw new Error(`Нет подтверждённого контура ${match.cadastralNumber}`);
  for (const plotCode of match.codes) {
    if (confirmed.has(plotCode) || !plots.some((plot) => plot.code === plotCode)) {
      throw new Error(`Проверьте подтверждение ${plotCode}`);
    }
    confirmed.set(plotCode, match.cadastralNumber);
  }
}

// EPSG:3857 → WGS84; the source vertices are neither aligned nor simplified.
const toLngLat = ([x, y]: readonly [number, number]): LngLat => [
  ((x / 6378137) * 180) / Math.PI,
  (Math.atan(Math.sinh(y / 6378137)) * 180) / Math.PI
];
const bounds = (points: readonly LngLat[]): LngLatBounds => {
  if (!points.length) throw new Error('Нет координат для карты');
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)]
  ];
};
const matched = plots.flatMap((plot) => {
  const number = confirmed.get(plot.code) ?? plot.cadastralReference;
  return number && byNumber.has(number) ? [{ plot, number }] : [];
});
const demoParcels: DemoParcel[] = [...Map.groupBy(matched, (match) => match.number)].map(
  ([number, matches]) => {
    const source = byNumber.get(number);
    const first = matches[0];
    if (!source || !first) throw new Error(`Нет данных для ${number}`);
    if (matches.some((match) => match.plot.part !== first.plot.part)) {
      throw new Error(`Контур ${number} связан с разными частями посёлка`);
    }
    const geometry =
      source.geometry.type === 'Polygon'
        ? {
            type: 'Polygon' as const,
            coordinates: source.geometry.coordinates.map((r) => r.map(toLngLat))
          }
        : {
            type: 'MultiPolygon' as const,
            coordinates: source.geometry.coordinates.map((p) => p.map((r) => r.map(toLngLat)))
          };
    const points =
      geometry.type === 'Polygon' ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
    const [min, max] = bounds(points);
    return {
      cadastralNumber: number,
      codes: matches.map((match) => match.plot.code),
      part: first.plot.part,
      geometry,
      // A display label only; its position is not evidence of a correspondence.
      center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2],
      area: source.properties.area
    };
  }
);
const vertices = (items: readonly DemoParcel[]): LngLat[] =>
  items.flatMap((item) =>
    item.geometry.type === 'Polygon'
      ? item.geometry.coordinates.flat()
      : item.geometry.coordinates.flat(2)
  );

export const demoData: DemoData = {
  displayOffset: {
    eastMeters: displayOffset.offset_east_m,
    northMeters: displayOffset.offset_north_m
  },
  parcels: demoParcels,
  parts: Object.entries({ shr: 'Ривер', shf: 'Форест', shp: 'Парк', shv: 'Вилладж' }).map(
    ([id, name]) => ({
      id,
      name,
      matched: matched.filter((match) => match.plot.part === id).length,
      total: plots.filter((plot) => plot.part === id).length,
      bounds: bounds(vertices(demoParcels.filter((parcel) => parcel.part === id)))
    })
  ),
  bounds: bounds(vertices(demoParcels)),
  matched: matched.length,
  total: plots.length
};

export default defineConfig({
  root,
  envDir: fileURLToPath(new URL('../../../../', import.meta.url)),
  envPrefix: 'PUBLIC_',
  define: { __PARCEL_DEMO__: JSON.stringify(demoData) },
  server: { host: '127.0.0.1', port: 4336, strictPort: true },
  preview: { host: '127.0.0.1', port: 4336, strictPort: true },
  build: { outDir: 'dist' }
});
