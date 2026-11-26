import { parse } from 'yaml';

import { AsphaltAreasSchema } from './asphalt-areas-schema';
import type { AsphaltAreas } from './road-surfaces-types';

export const readAsphaltAreas = (yaml: string): AsphaltAreas =>
  AsphaltAreasSchema.parse(parse(yaml));
