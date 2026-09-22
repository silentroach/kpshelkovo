import { PARCEL_CADASTRAL_NUMBER } from './schema.ts';
import type { NspdSnapshot, MappedGenplanSnapshot, ConfirmedMatches } from './source-types.ts';
import type { ParcelResolution, ParcelCandidate } from './update-types.ts';

export const resolveParcels = (
  genplans: readonly MappedGenplanSnapshot[],
  nspd: NspdSnapshot,
  matches: ConfirmedMatches
): ParcelResolution => {
  const features = new Map(
    nspd.features.map((feature) => [feature.properties.cadastralNumber, feature])
  );
  const plots = genplans.flatMap((snapshot) => snapshot.plots);
  const byCode = new Map(plots.map((plot) => [plot.code, plot]));
  if (byCode.size !== plots.length) throw new Error('duplicate genplan code across sources');
  const confirmed = new Map(
    matches.flatMap((match) => match.codes.map((code) => [code, match] as const))
  );
  const grouped = new Map<string, { plots: typeof plots; match?: ConfirmedMatches[number] }>();
  const unresolved: string[] = [];
  const conflicts: string[] = [];

  for (const plot of plots) {
    const match = confirmed.get(plot.code);
    if (match) {
      // Missing former aliases are fine, but a changed source reference voids the confirmation.
      const active = match.codes.filter((code) => byCode.has(code));
      const stale = active.find(
        (code) => byCode.get(code)?.cadastralReference !== match.source_cadastral_references[code]
      );
      if (stale) {
        conflicts.push(
          `${plot.code}: confirmed reference changed for ${stale}: ${String(byCode.get(stale)?.cadastralReference)} (was ${match.source_cadastral_references[stale]})`
        );
        continue;
      }
    }
    const number =
      match?.cadastral_number ??
      (PARCEL_CADASTRAL_NUMBER.test(plot.cadastralReference ?? '')
        ? plot.cadastralReference
        : undefined);
    if (!number || !features.has(number)) {
      unresolved.push(
        `${plot.code}: ${number ? `no cadastral contour ${number}` : `unmatched reference ${String(plot.cadastralReference)}`}`
      );
      continue;
    }
    const group = grouped.get(number) ?? { plots: [], match };
    if (group.match && match && group.match !== match) {
      conflicts.push(`${plot.code}: multiple confirmations for ${number}`);
      continue;
    }
    if (group.match && !match) {
      conflicts.push(`${plot.code}: direct reference collides with confirmed group ${number}`);
      continue;
    }
    group.match = match;
    group.plots.push(plot);
    grouped.set(number, group);
  }

  const candidates: ParcelCandidate[] = [];
  for (const [cadastralNumber, group] of grouped) {
    const feature = features.get(cadastralNumber);
    if (!feature) throw new Error(`missing validated feature ${cadastralNumber}`);
    const sorted = group.plots.sort((a, b) => a.code.localeCompare(b.code));
    if (
      sorted.length > 1 &&
      (!group.match || sorted.some((plot) => !group.match?.codes.includes(plot.code)))
    ) {
      conflicts.push(
        `${cadastralNumber}: multiple codes without a complete confirmation: ${sorted.map((plot) => plot.code).join(', ')}`
      );
      continue;
    }
    candidates.push({ cadastralNumber, feature, plots: sorted, match: group.match });
  }
  return {
    candidates: candidates.sort((a, b) => a.cadastralNumber.localeCompare(b.cadastralNumber)),
    unresolved: unresolved.sort(),
    conflicts: conflicts.sort()
  };
};
