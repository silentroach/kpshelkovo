import type { ComparePublicPayload } from './public-dto.types';

const verifyDeepReadonly = (payload: ComparePublicPayload): void => {
  // @ts-expect-error Public payload root properties are readonly.
  payload.stats = payload.stats;
  // @ts-expect-error Public payload arrays are readonly.
  payload.settlements.push(payload.settlements[0]!);
  // @ts-expect-error Public payload nested objects are readonly.
  payload.settlements[0]!.location.lat = 0;
  // @ts-expect-error Public payload record values are readonly.
  payload.comparisons['test-settlement']!.isCheaper = false;
};

void verifyDeepReadonly;
