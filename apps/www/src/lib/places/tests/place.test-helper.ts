import { mapRawPlace } from '../mapper';
import { RawPlaceSchema } from '../raw-schema';
import type { Place } from '../types';

export const testPlace = (overrides?: Partial<Place>): Place => ({
  ...mapRawPlace({
    id: 'club',
    body: '',
    data: RawPlaceSchema.parse({
      title: 'КП Шелково, эко-клуб',
      category: 'infrastructure',
      status: 'existing',
      summary: 'Место встречи',
      location: { coordinates: overrides?.coordinates ?? { lat: 55, lng: 38 } }
    })
  }),
  ...overrides
});
