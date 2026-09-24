import { sortParcelFeatures } from './genplan-mapper.ts';
import { projectNspdGeometry } from './projection.ts';
import { RawParcelSchema } from './raw-schema.ts';
import { resolveParcels } from './resolve.ts';
import type { ConfirmedMatches, MappedGenplanSnapshot, NspdSnapshot } from './source-types.ts';
import { parcelRecordPath } from './source.ts';
import type { ParcelChange, ParcelUpdate, SavedParcel } from './update-types.ts';

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export const reconcileParcels = (
  genplans: readonly MappedGenplanSnapshot[],
  nspd: NspdSnapshot,
  matches: ConfirmedMatches,
  previous: readonly SavedParcel[]
): ParcelUpdate => {
  const resolution = resolveParcels(genplans, nspd, matches);
  const { candidates } = resolution;
  const unresolved = [...resolution.unresolved];
  const conflicts = [...resolution.conflicts];
  const byNumber = new Map(
    previous.flatMap((record) =>
      (
        record.data.cadastral_parts?.map((part) => part.cadastral_number) ?? [
          record.data.cadastral_number!
        ]
      ).map((number) => [number, record] as const)
    )
  );
  const byCode = new Map(
    previous.flatMap((record) =>
      [record.data.code, ...record.data.aliases].map((code) => [code, record] as const)
    )
  );
  const formerGroups = new Map<SavedParcel, Set<string>>();
  for (const candidate of candidates) {
    for (const plot of candidate.plots) {
      const old = byCode.get(plot.code);
      if (old) {
        const numbers = formerGroups.get(old) ?? new Set<string>();
        numbers.add(candidate.cadastralNumber);
        formerGroups.set(old, numbers);
      }
    }
  }

  const records: ParcelChange[] = [];
  const added: string[] = [];
  const renamed: string[] = [];
  const geometryChanged: string[] = [];
  const detailsChanged: string[] = [];
  const consumed = new Set<SavedParcel>();

  for (const candidate of candidates) {
    const codes = candidate.plots.map((plot) => plot.code);
    if (candidate.parts) {
      const numbers = candidate.parts.map((part) => part.properties.cadastralNumber);
      const oldRecords = new Set(
        [
          ...codes.map((code) => byCode.get(code)),
          ...numbers.map((number) => byNumber.get(number))
        ].filter((record) => record !== undefined)
      );
      const retained = [...oldRecords][0];
      if (
        oldRecords.size > 1 ||
        (retained &&
          (!same(
            (
              retained.data.cadastral_parts?.map((part) => part.cadastral_number) ?? [
                retained.data.cadastral_number!
              ]
            ).toSorted(),
            numbers.toSorted()
          ) ||
            !same([retained.data.code, ...retained.data.aliases].toSorted(), codes.toSorted())))
      ) {
        conflicts.push(
          `${codes.join(', ')}: cadastral group identity changed; confirm a new editorial record`
        );
        continue;
      }
    } else if (
      codes.some((code) => byCode.get(code)?.data.cadastral_parts) ||
      byNumber.get(candidate.cadastralNumber)?.data.cadastral_parts
    ) {
      conflicts.push(
        `${codes.join(', ')}: cadastral group identity changed; confirm a new editorial record`
      );
      continue;
    }
    const old = byNumber.get(candidate.cadastralNumber);
    const ancestors = new Set(
      codes.map((code) => byCode.get(code)).filter((record) => record !== undefined)
    );
    const split = [...ancestors].some((record) => (formerGroups.get(record)?.size ?? 0) > 1);
    let retained: SavedParcel | undefined = old && !split ? old : undefined;
    if (!retained && ancestors.size && !split) {
      const selected = candidate.match?.primary_code;
      retained = selected ? byCode.get(selected) : undefined;
      if (!retained || !ancestors.has(retained)) {
        unresolved.push(
          `${codes.join(', ')}: choose primary_code for new cadastral number ${candidate.cadastralNumber}`
        );
        continue;
      }
    }
    if (!retained && codes.length > 1 && !candidate.match?.primary_code) {
      unresolved.push(`${codes.join(', ')}: choose primary_code for ${candidate.cadastralNumber}`);
      continue;
    }
    if (retained && consumed.has(retained)) {
      conflicts.push(`${codes.join(', ')}: previous record ${retained.path} would be reused twice`);
      continue;
    }
    if (retained) consumed.add(retained);

    const code =
      retained && codes.includes(retained.data.code)
        ? retained.data.code
        : candidate.match?.primary_code && codes.includes(candidate.match.primary_code)
          ? candidate.match.primary_code
          : codes[0];
    if (!code) throw new Error(`empty candidate ${candidate.cadastralNumber}`);
    const aliases = codes.filter((item) => item !== code);
    const statuses = new Set(candidate.plots.map((plot) => plot.status));
    const status = statuses.size === 1 ? candidate.plots[0]?.status : retained?.data.status;
    if (statuses.size > 1) {
      conflicts.push(`${code}: statuses ${[...statuses].join(', ')}; kept ${status ?? 'unknown'}`);
    }
    const features = sortParcelFeatures(candidate.plots.flatMap((plot) => plot.features));
    const priceHistory = [...(retained?.data.price_history ?? [])];
    const selectedPriceCode =
      candidate.plots.length === 1 && (!candidate.match || candidate.match.codes.length === 1)
        ? candidate.plots[0]?.code
        : candidate.match?.price_source_code;
    const pricePlot = candidate.plots.find((plot) => plot.code === selectedPriceCode);
    const prices = candidate.plots.filter((plot) => plot.priceRub);
    if (
      !selectedPriceCode &&
      prices.length &&
      statuses.size === 1 &&
      (status === 'available' || status === 'reserved')
    ) {
      conflicts.push(
        `${code}: part prices ${prices.map((plot) => `${plot.code}=${plot.priceRub}`).join(', ')}; kept ${priceHistory.at(-1)?.price ?? 'unknown'} (whole-parcel price unconfirmed)`
      );
    }
    if (
      statuses.size === 1 &&
      (status === 'available' || status === 'reserved') &&
      pricePlot?.priceRub
    ) {
      const snapshot = genplans.find((item) => item.plots.includes(pricePlot));
      if (!snapshot) throw new Error(`missing date for ${pricePlot.code}`);
      const last = priceHistory.at(-1);
      if (last && last.on > snapshot.observedOn) {
        conflicts.push(
          `${code}: source date ${snapshot.observedOn} predates price history ${last.on}`
        );
      } else if (last?.price !== pricePlot.priceRub) {
        priceHistory.push({ on: snapshot.observedOn, price: pricePlot.priceRub });
      }
    }
    const parts = candidate.parts?.map((part) => ({
      cadastral_number: part.properties.cadastralNumber,
      geometry: projectNspdGeometry(part.geometry),
      area_m2: part.properties.area
    }));
    const data = RawParcelSchema.parse({
      code,
      aliases,
      cadastral_number: parts ? undefined : candidate.cadastralNumber,
      geometry: parts ? undefined : projectNspdGeometry(candidate.feature.geometry),
      area_m2: parts ? undefined : candidate.feature.properties.area,
      cadastral_parts: parts,
      status,
      features,
      price_history: priceHistory
    });
    const path = parcelRecordPath(code);
    records.push({ path, data, body: retained?.body ?? '' });
    if (!retained) added.push(path);
    else {
      if (retained.path !== path) renamed.push(`${retained.path} -> ${path}`);
      if (
        !same(retained.data.geometry, data.geometry) ||
        !same(
          retained.data.cadastral_parts?.map((part) => part.geometry),
          data.cadastral_parts?.map((part) => part.geometry)
        )
      )
        geometryChanged.push(path);
      if (
        !same(
          {
            ...retained.data,
            geometry: undefined,
            cadastral_parts: retained.data.cadastral_parts?.map((part) => ({
              ...part,
              geometry: undefined
            }))
          },
          {
            ...data,
            geometry: undefined,
            cadastral_parts: data.cadastral_parts?.map((part) => ({ ...part, geometry: undefined }))
          }
        )
      )
        detailsChanged.push(path);
    }
  }
  const currentPaths = new Set(records.map((record) => record.path));
  if (currentPaths.size !== records.length)
    throw new Error('duplicate parcel paths after reconciliation');
  const usedCodes = new Set<string>();
  for (const record of records) {
    for (const code of [record.data.code, ...record.data.aliases]) {
      if (usedCodes.has(code)) throw new Error(`duplicate current parcel code ${code}`);
      usedCodes.add(code);
    }
  }
  return {
    records: records.sort((a, b) => a.path.localeCompare(b.path)),
    added: added.sort(),
    deleted: previous
      .filter((record) => !currentPaths.has(record.path))
      .map((record) => record.path)
      .sort(),
    renamed: renamed.sort(),
    geometryChanged: geometryChanged.sort(),
    detailsChanged: detailsChanged.sort(),
    unresolved: unresolved.sort(),
    conflicts: conflicts.sort(),
    genplans
  };
};
