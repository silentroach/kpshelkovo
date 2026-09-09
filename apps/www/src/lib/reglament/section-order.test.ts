import { describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';

import { buildReglamentPayload } from './discovery';
import { reglamentSectionsByOfficialTariff } from './section-order';

describe('reglamentSectionsByOfficialTariff', () => {
  it('sorts HTML sections by official tariff contribution without mutating payload order', () => {
    const payload = buildReglamentPayload(estimate2026);
    const sortedSections = reglamentSectionsByOfficialTariff(payload.sections);

    expect(sortedSections.map((section) => section.id)).toMatchInlineSnapshot(`
      [
        "cleaning",
        "security",
        "waste-transfer",
        "lighting-power",
        "landscaping",
        "waste-operator",
        "improvement",
      ]
    `);
    expect(payload.sections.map((section) => section.id)).toMatchInlineSnapshot(`
      [
        "waste-transfer",
        "cleaning",
        "landscaping",
        "improvement",
        "security",
        "waste-operator",
        "lighting-power",
      ]
    `);
  });
});
