import type { NspdSnapshot } from './source-types.ts';
import type { ParcelUpdate } from './update-types.ts';

export const formatParcelUpdate = (update: ParcelUpdate, nspd: NspdSnapshot): string => {
  const sections: readonly [string, readonly string[]][] = [
    ['Добавлены', update.added],
    ['Удалены', update.deleted],
    ['Переименованы', update.renamed],
    ['Изменена геометрия', update.geometryChanged],
    ['Изменены сведения', update.detailsChanged],
    ['Не сопоставлены', update.unresolved],
    ['Конфликты', update.conflicts]
  ];
  return [
    `Кадастр: ${nspd.metadata.capturedOn} — ${nspd.metadata.source} (охват проверен: ${nspd.metadata.response.coverageVerified ? 'да' : 'нет'})`,
    ...update.genplans.map(
      (source) => `${source.part.toUpperCase()}: ${source.capturedAt} — ${source.page}`
    ),
    ...sections.flatMap(([title, items]) => [
      `${title}: ${items.length}`,
      ...items.map((item) => `  - ${item}`)
    ])
  ].join('\n');
};
