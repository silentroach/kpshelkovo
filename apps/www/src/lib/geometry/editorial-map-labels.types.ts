import type { EditorialPosition } from './editorial-types';

export interface EditorialParcelLabel {
  readonly text: string;
  readonly coordinates: EditorialPosition;
}
