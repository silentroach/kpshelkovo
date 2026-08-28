import type { EstimateDetailDataset } from '@/lib/reglament/detail-schema';
import {
  cleaningControlTotals,
  cleaningResources,
  cleaningWorkItems,
} from '@/data/reglament/estimate-details-2026/cleaning';
import { finalControlTotals } from '@/data/reglament/estimate-details-2026/final';
import {
  improvementControlTotals,
  improvementResources,
  improvementWorkItems,
} from '@/data/reglament/estimate-details-2026/improvement';
import {
  landscapingControlTotals,
  landscapingResources,
  landscapingWorkItems,
} from '@/data/reglament/estimate-details-2026/landscaping';
import {
  lightingControlTotals,
  lightingResources,
  lightingWorkItems,
} from '@/data/reglament/estimate-details-2026/lighting';
import {
  securityControlTotals,
  securityResources,
  securityWorkItems,
} from '@/data/reglament/estimate-details-2026/security';
import {
  estimateDetailSourcePdfs,
  resolveSectionControlTotals,
} from '@/data/reglament/estimate-details-2026/shared';
import {
  wasteControlTotals,
  wasteResources,
  wasteWorkItems,
} from '@/data/reglament/estimate-details-2026/waste';

const resources = [
  ...cleaningResources,
  ...wasteResources,
  ...securityResources,
  ...lightingResources,
  ...landscapingResources,
  ...improvementResources,
];

const sectionControlTotals = resolveSectionControlTotals(
  [
    ...cleaningControlTotals,
    ...wasteControlTotals,
    ...securityControlTotals,
    ...lightingControlTotals,
    ...landscapingControlTotals,
    ...improvementControlTotals,
  ],
  resources,
);

export const estimateDetails2026 = {
  schema_version: '1',
  dataset_id: 'estimate-details-2026',
  title: 'Детальная смета 2026',
  year: 2026,
  source_pdfs: estimateDetailSourcePdfs,
  curation_notes: [
    'Детальные факты извлекаются только из секционных PDF по адресам https://media.kpshelkovo.online/815/regulation/*.pdf; full.pdf для detail-данных не используется.',
    'PDF не парсятся во время runtime или build страницы: этот файл является curated dataset для ручного пополнения.',
    'Каждый будущий work item, resource и control total должен иметь source_refs с PDF, страницей и фрагментом; неоднозначные строки помечаются needs_check.',
    'Итоги с control_source=final_pdf сверяют строки и разделы final.pdf с estimate-2026; control_source=section_pdf сверяет ресурсы и итоги секционных PDF.',
    'В секционных итогах detail_total_rub равен сумме ресурсов, aggregate_total_rub берется из estimate-2026; во всех итогах delta_rub равен разнице между детализацией и агрегированной сметой.',
  ],
  work_items: [
    ...cleaningWorkItems,
    ...wasteWorkItems,
    ...securityWorkItems,
    ...lightingWorkItems,
    ...landscapingWorkItems,
    ...improvementWorkItems,
  ],
  resources,
  control_totals: [...finalControlTotals, ...sectionControlTotals],
} satisfies EstimateDetailDataset;
