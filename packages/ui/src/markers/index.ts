import constructionMarkerUrl from './Construction.png?url';
import foodtruckMarkerUrl from './Foodtruck.png?url';
import titanicMarkerUrl from './Titanic.png?url';

export const CONSTRUCTION_MARKER = {
  src: constructionMarkerUrl,
  width: 144,
  height: 141,
} as const;

export const FOODTRUCK_MARKER = {
  src: foodtruckMarkerUrl,
  width: 144,
  height: 128,
} as const;

export const TITANIC_MARKER = {
  src: titanicMarkerUrl,
  width: 144,
  height: 128,
} as const;
