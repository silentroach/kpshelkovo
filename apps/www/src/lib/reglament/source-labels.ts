import type { EstimateSourcePdf, EstimateSourceRef } from './schema';

const SOURCE_PDF_LABELS = {
  final: 'Итоговая смета',
  cleaning: 'Детализация уборки',
  landscaping: 'Детализация озеленения',
  improvement: 'Детализация благоустройства',
  lighting: 'Детализация освещения',
  security: 'Детализация охраны',
  waste: 'Детализация вывоза мусора'
} as const satisfies Record<EstimateSourcePdf, string>;

export const estimateSourcePdfLabel = (pdf: EstimateSourcePdf): string => SOURCE_PDF_LABELS[pdf];

export const formatEstimateSourceRefLabel = (ref: EstimateSourceRef): string =>
  `${estimateSourcePdfLabel(ref.pdf)}, стр. ${ref.page}${ref.fragment ? `, ${ref.fragment}` : ''}`;
