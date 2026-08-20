import appleMarkerUrl from './Apple.png?url';
import constructionMarkerUrl from './Construction.png?url';
import fishMarkerUrl from './Fish.png?url';
import foodtruckMarkerUrl from './Foodtruck.png?url';
import kppMarkerUrl from './Kpp.png?url';
import titanicMarkerUrl from './Titanic.png?url';

export const APPLE_MARKER = {
  src: appleMarkerUrl,
  width: 144,
  height: 144,
} as const;

export const CONSTRUCTION_MARKER = {
  src: constructionMarkerUrl,
  width: 144,
  height: 141,
} as const;

export const FISH_MARKER = {
  src: fishMarkerUrl,
  width: 144,
  height: 144,
} as const;

export const FOODTRUCK_MARKER = {
  src: foodtruckMarkerUrl,
  width: 144,
  height: 128,
} as const;

export const KPP_MARKER = {
  src: kppMarkerUrl,
  width: 144,
  height: 137,
} as const;

export const TITANIC_MARKER = {
  src: titanicMarkerUrl,
  width: 144,
  height: 137,
} as const;
