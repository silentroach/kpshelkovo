import { PARCEL_CODE, PARCEL_FEATURES } from './schema';
import type { ParcelFeature, ParcelStatus } from './schema';
import { GENPLAN_LOCATIONS, GENPLAN_STATUSES } from './source-schemas';
import type { GenplanSnapshot } from './source-schemas';
import type { MappedGenplanSnapshot } from './source-types';

const statuses: Record<(typeof GENPLAN_STATUSES)[number], ParcelStatus> = {
  Свободен: 'available',
  Забронирован: 'reserved',
  Продан: 'sold',
  'Снят с продажи': 'unavailable',
  'Без документов': 'unavailable',
  Неразобранное: 'unavailable',
  'Закрыто и не реализовано': 'unavailable'
};

const locations: Record<(typeof GENPLAN_LOCATIONS)[number], readonly ParcelFeature[]> = {
  луговой: ['meadow'],
  'деревья на участке': ['trees'],
  'с лесными деревьями': ['trees'],
  'лесной участок': ['forest_plot'],
  'примыкает к лесу': ['forest_border'],
  'с видом на лес': ['forest_view'],
  'с выходом в лес': ['forest_access'],
  'с выходом к реке': ['river_access'],
  'с видом на лес у реки': ['forest_view', 'near_river'],
  'с выходом в лес и к реке': ['forest_access', 'river_access'],
  'у леса и реки': ['near_forest', 'near_river'],
  'с пляжем': ['beach'],
  'с прудом': ['pond'],
  'рядом с парком': ['near_park'],
  'в лесном парке': ['forest_park']
};

export const sortParcelFeatures = (
  features: readonly ParcelFeature[]
): readonly ParcelFeature[] => {
  const seen = new Set(features);
  return PARCEL_FEATURES.filter((feature) => seen.has(feature));
};

const canonicalCode = (part: string, id: string): string => {
  const code = `${part.toUpperCase()}-${id.replaceAll('А', 'A').replaceAll('К', 'K')}`;
  if (!PARCEL_CODE.test(code)) throw new Error(`unsupported plot designation "${part}/${id}"`);
  return code;
};

const moscowDate = (capturedAt: string): string =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(capturedAt));

export const mapGenplanSnapshot = (snapshot: GenplanSnapshot): MappedGenplanSnapshot => {
  const codes = new Set<string>();
  const plots = snapshot.plots.map((plot) => {
    const code = canonicalCode(snapshot.part, plot.id);
    if (codes.has(code)) throw new Error(`duplicate canonical plot code "${code}"`);
    codes.add(code);

    return {
      code,
      sourceId: plot.id,
      cadastralReference: plot.cadastralReference,
      status: statuses[plot.status],
      features: sortParcelFeatures(locations[plot.location]),
      priceRub: plot.objectprice || undefined
    };
  });

  return {
    part: snapshot.part,
    page: snapshot.page,
    capturedAt: snapshot.capturedAt,
    observedOn: moscowDate(snapshot.capturedAt),
    plots
  };
};
