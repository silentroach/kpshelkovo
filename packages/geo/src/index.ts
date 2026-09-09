import dist from '@turf/distance';
import * as SunCalc from 'suncalc';

import type { CivilTwilight, Coordinates } from './types';

export type { CivilTwilight, Coordinates } from './types';

const CIVIL_TWILIGHT_ALTITUDE_DEGREES = -6;
const SUNRISE_SUNSET_ALTITUDE_DEGREES = -0.833;

/**
 * Calculates distance between two coordinates in kilometers.
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return dist([lng1, lat1], [lng2, lat2], { units: 'kilometers' });
}

export const getCivilTwilight = (date: Date, coordinates: Coordinates): CivilTwilight => {
  const { lat, lng } = coordinates;
  const { dawn, dusk } = SunCalc.getTimes(date, lat, lng);
  if (!dawn || !dusk) {
    throw new Error('Civil twilight is unavailable for this date and coordinates.');
  }

  return {
    dawn,
    dusk
  };
};

export const isCivilDaylight = (date: Date, coordinates: Coordinates): boolean => {
  const { lat, lng } = coordinates;
  const { dawn, dusk } = SunCalc.getTimes(date, lat, lng);
  if (!dawn || !dusk) {
    return SunCalc.getPosition(date, lat, lng).altitude >= CIVIL_TWILIGHT_ALTITUDE_DEGREES;
  }

  const time = date.getTime();

  return time >= dawn.getTime() && time <= dusk.getTime();
};

export const isSunlight = (date: Date, coordinates: Coordinates): boolean => {
  const { lat, lng } = coordinates;
  const { sunrise, sunset } = SunCalc.getTimes(date, lat, lng);
  if (!sunrise || !sunset) {
    return SunCalc.getPosition(date, lat, lng).altitude >= SUNRISE_SUNSET_ALTITUDE_DEGREES;
  }

  const time = date.getTime();

  return time >= sunrise.getTime() && time <= sunset.getTime();
};
