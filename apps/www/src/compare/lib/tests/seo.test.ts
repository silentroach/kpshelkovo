import { expect, it } from 'vitest';

import { settlementSearchDescription } from '@/compare/lib/seo';
import type { Settlement } from '@/compare/lib/settlement/types';

it('describes the normalized monthly tariff without repeating the settlement name', () => {
  const settlement: Settlement = {
    name: 'КП Тестовый',
    shortName: 'Тестовый',
    slug: 'test',
    website: 'https://example.com',
    isBaseline: false,
    location: { addressText: 'Тестовый адрес', lat: 55, lng: 37, district: 'Тестовый район' },
    tariff: {
      value: 2400,
      unit: 'perSotka',
      period: 'year',
      normalizedPerSotkaMonth: 200,
      normalizedIsEstimate: false
    },
    infrastructure: {},
    commonSpaces: {},
    serviceModel: {},
    sources: []
  };
  const description = settlementSearchDescription(settlement, undefined).replaceAll('\u00a0', ' ');

  expect(description).toContain('200 ₽/сотка в месяц');
  expect(description).not.toContain(settlement.shortName);
});
