import {
  toPublicComparisons,
  toPublicStats,
  type PublicComparison,
  type PublicComparisons,
  type PublicStats,
} from './public-dto';
import type { Rating } from './rating';
import type { Settlement } from './settlement/types';

export type ExplorerLocation = Pick<
  Settlement['location'],
  'lat' | 'lng' | 'district'
>;

export interface ExplorerTariff {
  normalizedPerSotkaMonth: Settlement['tariff']['normalizedPerSotkaMonth'];
  normalizedIsEstimate: Settlement['tariff']['normalizedIsEstimate'];
}

export type ExplorerCompany = string | { title: string };

export interface ExplorerSettlement {
  name: Settlement['name'];
  shortName: Settlement['shortName'];
  slug: Settlement['slug'];
  rating: number;
  rabstvo?: Settlement['rabstvo'];
  managementCompany?: ExplorerCompany;
  isBaseline: Settlement['isBaseline'];
  location: ExplorerLocation;
  tariff: ExplorerTariff;
}

export interface ExplorerPayload {
  settlements: ExplorerSettlement[];
  comparisons: PublicComparisons;
  stats: PublicStats;
}

export interface ExplorerPayloadInput {
  readonly settlements: readonly Settlement[];
  readonly baseline: Settlement;
  readonly stats: PublicStats;
  readonly comparisons: ReadonlyMap<string, PublicComparison>;
  readonly ratings: ReadonlyMap<string, Rating>;
}

export function toExplorer(
  settlements: readonly Settlement[],
  ratings: ReadonlyMap<string, Rating>,
  baseline: Settlement,
): ExplorerSettlement[] {
  return settlements.map((item) => {
    const company = item.managementCompany;

    return {
      name: item.name,
      shortName: item.shortName,
      slug: item.slug,
      rating: ratings.get(item.slug)?.score ?? 0,
      ...(item.rabstvo ? { rabstvo: true } : {}),
      ...(company
        ? {
            managementCompany: company.url
              ? { title: company.title }
              : company.title,
          }
        : {}),
      isBaseline: item.slug === baseline.slug,
      location: {
        lat: item.location.lat,
        lng: item.location.lng,
        district: item.location.district,
      },
      tariff: {
        normalizedPerSotkaMonth: item.tariff.normalizedPerSotkaMonth,
        normalizedIsEstimate: item.tariff.normalizedIsEstimate,
      },
    };
  });
}

export const toExplorerPayload = ({
  settlements,
  baseline,
  stats,
  comparisons,
  ratings,
}: ExplorerPayloadInput): ExplorerPayload => ({
  settlements: toExplorer(settlements, ratings, baseline),
  stats: toPublicStats(stats),
  comparisons: toPublicComparisons(comparisons),
});
