import { describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { ESTIMATE_SOURCE_PDFS, type EstimateRow } from '@/lib/reglament/schema';

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const round2 = (value: number): number => Math.round(value * 100) / 100;

const flattenRows = (rows: readonly EstimateRow[]): readonly EstimateRow[] =>
  rows.flatMap((row) => [row, ...flattenRows(row.children ?? [])]);

const findRow = (id: string): EstimateRow => {
  const row = flattenRows(estimate2026.sections.flatMap((section) => section.rows)).find(
    (item) => item.id === id
  );

  if (!row) {
    throw new Error(`Estimate row not found: ${id}`);
  }

  return row;
};

describe('estimate2026 baseline data', () => {
  it('keeps the official total and tariff from final.pdf', () => {
    expect(estimate2026.baseline).toEqual({
      annual_gross: 221_264_198,
      tariff_per_sotka_month: 902.07
    });
  });

  it('keeps section totals from final.pdf', () => {
    const sections = estimate2026.sections.map((section) => ({
      id: section.id,
      title: section.title,
      annual_gross: section.baseline.annual_gross,
      tariff_per_sotka_month: section.baseline.tariff_per_sotka_month
    }));

    expect(sections).toMatchSnapshot();

    expect(sum(sections.map((section) => section.annual_gross))).toBe(
      estimate2026.baseline.annual_gross
    );
    expect(round2(sum(sections.map((section) => section.tariff_per_sotka_month)))).toBe(
      estimate2026.baseline.tariff_per_sotka_month
    );
  });

  it('keeps all official row totals and source refs explicit', () => {
    const rows = estimate2026.sections.flatMap((section) =>
      flattenRows(section.rows).map((row) => ({
        section_id: section.id,
        id: row.id,
        title: row.title,
        annual_gross: row.baseline.annual_gross,
        tariff_per_sotka_month: row.baseline.tariff_per_sotka_month,
        source_refs: row.source_refs.map((ref) => ({
          pdf: ref.pdf,
          page: ref.page,
          fragment: ref.fragment,
          ...(ref.note ? { note: ref.note } : {})
        }))
      }))
    );

    expect(rows).toHaveLength(19);
    expect(rows).toMatchSnapshot();
  });

  it('keeps row sums aligned with section totals within final.pdf rounding', () => {
    const sectionSums = estimate2026.sections.map((section) => {
      const rowAnnualGross = sum(flattenRows(section.rows).map((row) => row.baseline.annual_gross));
      const rowTariff = round2(
        sum(flattenRows(section.rows).map((row) => row.baseline.tariff_per_sotka_month))
      );

      return {
        id: section.id,
        section_annual_gross: section.baseline.annual_gross,
        row_annual_gross: rowAnnualGross,
        annual_gross_diff: round2(rowAnnualGross - section.baseline.annual_gross),
        section_tariff_per_sotka_month: section.baseline.tariff_per_sotka_month,
        row_tariff_per_sotka_month: rowTariff,
        tariff_diff: round2(rowTariff - section.baseline.tariff_per_sotka_month)
      };
    });

    expect(sectionSums.every((section) => Math.abs(section.annual_gross_diff) <= 1)).toBe(true);
    expect(sectionSums).toMatchSnapshot();
  });

  it('keeps audited cost breakdown values from detailed PDFs', () => {
    const breakdowns = estimate2026.sections.flatMap((section) =>
      flattenRows(section.rows).map((row) => ({
        section_id: section.id,
        id: row.id,
        ...row.baseline.breakdown
      }))
    );

    expect(breakdowns).toHaveLength(19);
    expect(breakdowns).toMatchSnapshot();
  });

  it('keeps PDF source references on every section and row', () => {
    const sourcePdfs = new Set(ESTIMATE_SOURCE_PDFS);

    for (const section of estimate2026.sections) {
      expect(section.source_refs.length).toBeGreaterThan(0);

      for (const row of flattenRows(section.rows)) {
        expect(row.source_refs.length).toBeGreaterThan(0);
        expect(row.baseline.annual_gross).toBeGreaterThanOrEqual(0);
        expect(row.source_refs.every((source) => sourcePdfs.has(source.pdf))).toBe(true);
      }
    }
  });

  it('keeps standalone base values where the audit confirmed them', () => {
    expect(
      ['landscaping-forest-care', 'lighting-poles-repair'].map((id) => {
        const row = findRow(id);

        return {
          id,
          base: row.baseline.base
        };
      })
    ).toMatchSnapshot();
  });

  it('keeps fixed annual price outside basic main-table controls', () => {
    const rows = flattenRows(estimate2026.sections.flatMap((section) => section.rows));
    const fixedPriceFields = rows.flatMap((row) =>
      row.editable_fields.filter((field) => field.key === 'fixed_price')
    );

    expect(fixedPriceFields.length).toBeGreaterThan(0);
    expect(fixedPriceFields.every((field) => field.level === 'expert')).toBe(true);
  });

  it('keeps the disputed improvement repair source caveat explicit', () => {
    const row = findRow('improvement-road-surface-repair');

    expect({
      title: row.title,
      annual_gross: row.baseline.annual_gross,
      materials: row.baseline.breakdown.materials,
      description: row.description,
      tags: row.tags,
      source_refs: row.source_refs.map((ref) => ({
        pdf: ref.pdf,
        page: ref.page,
        fragment: ref.fragment,
        ...(ref.note ? { note: ref.note } : {})
      }))
    }).toMatchSnapshot();
  });
});
