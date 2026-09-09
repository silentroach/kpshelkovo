import { describe, expect, it } from 'vitest';

import { estimateSourcePdfLabel, formatEstimateSourceRefLabel } from './source-labels';

describe('reglament source labels', () => {
  it('uses human-readable labels for PDF source refs', () => {
    expect(estimateSourcePdfLabel('final')).toBe('Итоговая смета');
    expect(estimateSourcePdfLabel('cleaning')).toBe('Детализация уборки');
    expect(estimateSourcePdfLabel('security')).toBe('Детализация охраны');
  });

  it('formats source refs without exposing the PDF filename as the link text', () => {
    expect(
      formatEstimateSourceRefLabel({
        pdf: 'lighting',
        page: 3,
        fragment: 'таблица освещения'
      })
    ).toMatchInlineSnapshot(`"Детализация освещения, стр. 3, таблица освещения"`);
  });
});
