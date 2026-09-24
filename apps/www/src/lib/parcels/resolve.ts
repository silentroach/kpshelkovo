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
  const candidates: ParcelCandidate[] = [];
  const claimed = new Map<string, string>();

  for (const match of matches) {
    const numbers = match.cadastral_numbers;
    if (!numbers) continue;
    const active = match.codes.flatMap((code) => {
      const plot = byCode.get(code);
      return plot ? [plot] : [];
    });
    if (!active.length) continue;
    const collision = numbers.find((number) => claimed.has(number));
    if (collision) {
      conflicts.push(`${active[0]?.code}: multiple confirmations for ${collision}`);
      continue;
    }
    for (const number of numbers) claimed.set(number, active[0]!.code);
    const stale = active.find((plot) => {
      const saved = match.source_cadastral_references[plot.code];
      return typeof saved === 'string'
        ? plot.cadastralReference !== saved
        : plot.cadastralReference !== undefined;
    });
    if (stale) {
      const saved = match.source_cadastral_references[stale.code];
      conflicts.push(
        `${stale.code}: confirmed reference changed: ${stale.cadastralReference ?? 'absent'} (was ${typeof saved === 'string' ? saved : 'absent'})`
      );
      continue;
    }
    const missing = numbers.filter((number) => !features.has(number));
    if (missing.length) {
      unresolved.push(
        `${active.map((plot) => plot.code).join(', ')}: incomplete confirmed group, no cadastral contour ${missing.join(', ')}`
      );
      continue;
    }
    const parts = numbers.map((number) => features.get(number)!);
    candidates.push({
      cadastralNumber: numbers[0]!,
      feature: parts[0]!,
      parts,
      plots: active.toSorted((a, b) => a.code.localeCompare(b.code)),
      match
    });
  }

  for (const plot of plots) {
    const match = confirmed.get(plot.code);
    if (match?.cadastral_numbers) continue;
    if (match) {
      // Missing former aliases are fine, but a changed source reference voids the confirmation.
      const active = match.codes.filter((code) => byCode.has(code));
      const stale = active.find((code) => {
        const saved = match.source_cadastral_references[code];
        const current = byCode.get(code)?.cadastralReference;
        return typeof saved === 'string' ? current !== saved : current !== undefined;
      });
      if (stale) {
        const saved = match.source_cadastral_references[stale];
        conflicts.push(
          `${plot.code}: confirmed reference changed for ${stale}: ${byCode.get(stale)?.cadastralReference ?? 'absent'} (was ${typeof saved === 'string' ? saved : 'absent'})`
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
    if (claimed.has(number)) {
      conflicts.push(`${plot.code}: direct reference collides with confirmed group ${number}`);
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
    if (match && !group.match) {
      for (const direct of group.plots)
        conflicts.push(`${direct.code}: direct reference collides with confirmed group ${number}`);
      group.plots.length = 0;
    }
    group.match = match;
    group.plots.push(plot);
    grouped.set(number, group);
  }

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
