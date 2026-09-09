export const BRAND_KEYWORDS = [
  'Шелково',
  'Ступино',
  'Семеновское',
  'Земля МО',
  'застройщик Земля МО',
  'ОК Комфорт',
  'обслуживающая компания ОК Комфорт',
  'Шелково Ривер',
  'Shelkovo River',
  'Шелково Форест',
  'Shelkovo Forest',
  'Шелково Парк',
  'Shelkovo Park',
  'Шелково Вилладж',
  'Shelkovo Village'
] as const;

export const SHELKOVO_SITE_ALTERNATE_NAMES = [
  'Шелково Онлайн',
  'КП Шелково',
  'Шелково Эко Клаб',
  'Shelkovo Eco Club'
] as const;

export type SchemaDoc = Record<string, unknown>;
export type SchemaInput = SchemaDoc | readonly SchemaDoc[] | undefined;

type KeywordInput = string | readonly string[] | undefined;

export function collectKeywords(...groups: KeywordInput[]): string[] {
  return Array.from(
    new Set(
      groups
        .flatMap((group) => {
          if (!group) return [];
          return Array.isArray(group) ? group : [group];
        })
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function imageMimeType(url: string): string | undefined {
  const clean = url.split('?')[0]?.toLowerCase();

  if (!clean) return undefined;
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';

  return undefined;
}

export function serializeSchema(schema: SchemaInput): readonly string[] {
  const docs = schema ? (Array.isArray(schema) ? schema : [schema]) : [];
  return docs.map((item) => JSON.stringify(item).replace(/</g, '\\u003c'));
}
