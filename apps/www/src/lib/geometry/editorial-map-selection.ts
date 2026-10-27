import { unionPolygonGeometries } from '@shelkovo/geo';

import { formatParcelLabel } from '@/components/places/parcel-label';
import { fromPublicEditorialGeometry } from '@/components/places/place-map-geometry';
import type {
  EditorialMapResolvedSelection,
  EditorialMapSelectionResolver
} from '@/lib/markdown/editorial-maps.types';

import { roundGeometry, roundPosition } from './coordinate-precision';
import { EditorialMapDataSchema } from './editorial-map-data-schema';
import { EditorialParcelLabelsSchema } from './editorial-map-labels-schema';
import type { EditorialMapSelectionSources } from './editorial-map-selection.types';
import type { EditorialFeature } from './editorial-types';

const SELECTION_COLOR = '#7c3aed';

/** Resolve only imported objects; the Markdown adapter retains authored features and metadata. */
export const createEditorialMapSelectionResolver = (
  sources: EditorialMapSelectionSources
): EditorialMapSelectionResolver => {
  const parcelsByCode = new Map(
    sources.parcels.flatMap((parcel) =>
      [parcel.code, ...(parcel.aliases ?? [])].map((code) => [code, parcel] as const)
    )
  );
  const placesBySlug = new Map(sources.places.map((place) => [place.slug, place]));
  const setsById = new Map(sources.sets.map((set) => [set.id, set]));

  return (selection, context): EditorialMapResolvedSelection => {
    const parcelCodes = new Set(selection.parcels);
    const placeSlugs = new Set(selection.places);
    const setFeatures: EditorialFeature[] = [];
    for (const id of new Set(selection.sets)) {
      const set = setsById.get(id);
      if (!set) throw new Error(`${context} references unknown map selection set "${id}"`);
      for (const code of set.parcels) parcelCodes.add(code);
      for (const slug of set.places) placeSlugs.add(slug);
      if (set.geometry) setFeatures.push(...fromPublicEditorialGeometry(set.geometry).features);
    }
    const parcels = new Map<string, EditorialMapSelectionSources['parcels'][number]>();
    for (const code of parcelCodes) {
      const parcel = parcelsByCode.get(code.toUpperCase());
      if (!parcel) throw new Error(`${context} references unknown parcel "${code}"`);
      parcels.set(parcel.code, parcel);
    }
    const features: EditorialFeature[] = [...parcels.values()].map((parcel) => ({
      type: 'Feature',
      geometry: parcel.geometry,
      stroke: SELECTION_COLOR,
      strokeWidth: 2,
      strokeOpacity: 0.9,
      fill: SELECTION_COLOR,
      fillOpacity: 0.22
    }));
    for (const slug of placeSlugs) {
      const place = placesBySlug.get(slug);
      if (!place) throw new Error(`${context} references unknown place "${slug}"`);
      if (!place.showOnMap) throw new Error(`${context} references hidden place "${slug}"`);
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: roundPosition([place.coordinates.lng, place.coordinates.lat])
        },
        iconCaption: place.name,
        markerColor: SELECTION_COLOR
      });
      for (const feature of place.geometry?.features ?? []) {
        features.push({
          ...feature,
          markerColor: SELECTION_COLOR,
          stroke: SELECTION_COLOR,
          strokeWidth: 3,
          strokeOpacity: 1,
          fill: SELECTION_COLOR,
          fillOpacity: 0.22
        });
      }
    }
    features.push(...setFeatures);
    if (selection.outline && parcels.size) {
      const geometry = roundGeometry(
        unionPolygonGeometries([...parcels.values()].map((parcel) => parcel.geometry))
      );
      // Two ordinary features keep the light casing portable in the GeoJSON companion.
      features.push(
        {
          type: 'Feature',
          geometry,
          fillOpacity: 0,
          stroke: '#ffffff',
          strokeWidth: 6,
          strokeOpacity: 0.85
        },
        {
          type: 'Feature',
          geometry,
          fillOpacity: 0,
          stroke: SELECTION_COLOR,
          strokeWidth: 3,
          strokeOpacity: 0.95
        }
      );
    }
    try {
      return {
        geometry: EditorialMapDataSchema.parse({ type: 'FeatureCollection', features }),
        parcelLabels: EditorialParcelLabelsSchema.parse(
          [...parcels.values()].map((parcel) => ({
            text: formatParcelLabel(parcel),
            coordinates: parcel.labelCoordinates
          }))
        )
      };
    } catch (cause) {
      throw new Error(`${context} has invalid resolved map data: ${String(cause)}`, { cause });
    }
  };
};
