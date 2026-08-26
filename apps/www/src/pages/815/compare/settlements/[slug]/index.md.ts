import type { APIRoute } from 'astro';

import { loadAllData } from '@/compare/lib/data';
import { buildSettlementMd } from '@/compare/lib/markdown';
import type { Settlement } from '@/compare/lib/settlement/types';

export const prerender = true;

export async function getStaticPaths() {
  const { settlements, baseline, comparisons, ratings } = await loadAllData();

  return settlements.map((settlement) => ({
    params: { slug: settlement.slug },
    props: {
      settlement,
      comparison: comparisons.get(settlement.slug),
      baseline,
      rating: ratings.get(settlement.slug),
    },
  }));
}

interface Props {
  settlement: Settlement;
  comparison?: {
    tariffDelta: number;
    tariffDeltaPercent: number;
    isCheaper: boolean;
  };
  baseline: Settlement;
  rating?: {
    score: number;
    km: number;
    ring: number;
  };
}

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(buildSettlementMd(props), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
