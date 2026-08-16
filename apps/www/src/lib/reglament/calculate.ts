import type {
  CostBreakdown,
  Estimate,
  EstimateCoefficients,
  EstimateRow,
  EstimateSection,
} from './schema';

export interface EstimateRowChange {
  readonly enabled?: boolean;
  readonly volume?: number;
  readonly frequency?: number;
  readonly rate?: number;
  readonly fixed_price?: number;
  readonly primary_salary?: number;
  readonly machinist_salary?: number;
  readonly machines?: number;
  readonly materials?: number;
  readonly contractors?: number;
  readonly insurance_rate?: number;
  readonly overhead_rate?: number;
  readonly profit_rate?: number;
  readonly usn_rate?: number;
  readonly vat_rate?: number;
}

export interface EstimateCalculationChanges {
  readonly rows?: Readonly<Record<string, EstimateRowChange>>;
}

export interface CalculatedEstimateRow {
  readonly id: string;
  readonly title: string;
  readonly is_enabled: boolean;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly delta_annual_gross: number;
  readonly delta_tariff_per_sotka_month: number;
  readonly breakdown: CostBreakdown;
  readonly children?: readonly CalculatedEstimateRow[];
}

export interface CalculatedEstimateSection {
  readonly id: string;
  readonly title: string;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly delta_annual_gross: number;
  readonly delta_tariff_per_sotka_month: number;
  readonly rows: readonly CalculatedEstimateRow[];
}

export interface CalculatedEstimate {
  readonly id: string;
  readonly year: number;
  readonly title: string;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly delta_annual_gross: number;
  readonly delta_tariff_per_sotka_month: number;
  readonly sections: readonly CalculatedEstimateSection[];
}

type CostFieldKey =
  | 'primary_salary'
  | 'machinist_salary'
  | 'machines'
  | 'materials'
  | 'contractors';

type RateFieldKey =
  'insurance_rate' | 'overhead_rate' | 'profit_rate' | 'usn_rate' | 'vat_rate';

const COST_FIELD_KEYS = [
  'primary_salary',
  'machinist_salary',
  'machines',
  'materials',
  'contractors',
] as const satisfies readonly CostFieldKey[];

const RATE_FIELD_KEYS = [
  'insurance_rate',
  'overhead_rate',
  'profit_rate',
  'usn_rate',
  'vat_rate',
] as const satisfies readonly RateFieldKey[];

const round2 = (value: number): number => Math.round(value * 100) / 100;

const grossToTariff = (annualGross: number, areaSotki: number): number =>
  annualGross / areaSotki / 12;

const tariffFromBaseline = (
  baselineTariff: number,
  annualGrossDelta: number,
  areaSotki: number,
): number =>
  round2(baselineTariff + grossToTariff(annualGrossDelta, areaSotki));

const rowChangeValue = <Key extends keyof EstimateRowChange>(
  change: EstimateRowChange | undefined,
  key: Key,
): EstimateRowChange[Key] | undefined => {
  const value = change?.[key];

  return typeof value === 'number' && (!Number.isFinite(value) || value < 0)
    ? undefined
    : value;
};

const hasNumberChange = <Key extends keyof EstimateRowChange>(
  change: EstimateRowChange | undefined,
  key: Key,
): boolean => typeof rowChangeValue(change, key) === 'number';

const hasAnyNumberChange = <Key extends keyof EstimateRowChange>(
  change: EstimateRowChange | undefined,
  keys: readonly Key[],
): boolean => keys.some((key) => hasNumberChange(change, key));

const scaleMoney = (value: number, multiplier: number): number =>
  round2(value * multiplier);

const zeroBreakdown = (): CostBreakdown => ({
  primary_salary: 0,
  machinist_salary: 0,
  fot: 0,
  machines: 0,
  materials: 0,
  contractors: 0,
  insurance: 0,
  overhead: 0,
  profit: 0,
  usn: 0,
  income: 0,
  vat: 0,
  gross: 0,
});

const cloneBreakdown = (breakdown: CostBreakdown): CostBreakdown => ({
  ...breakdown,
});

const scaleBreakdown = (
  breakdown: CostBreakdown,
  multiplier: number,
  grossOverride?: number,
  vatRate?: number,
): CostBreakdown => {
  if (breakdown.gross === 0 && grossOverride !== undefined) {
    const gross = round2(grossOverride);
    const income = round2(gross / (1 + (vatRate ?? 0)));

    return {
      ...zeroBreakdown(),
      income,
      vat: round2(gross - income),
      gross,
    };
  }

  const primarySalary = scaleMoney(breakdown.primary_salary, multiplier);
  const machinistSalary = scaleMoney(breakdown.machinist_salary, multiplier);
  const gross = round2(grossOverride ?? breakdown.gross * multiplier);
  const income = scaleMoney(breakdown.income, multiplier);

  return {
    primary_salary: primarySalary,
    machinist_salary: machinistSalary,
    fot: round2(primarySalary + machinistSalary),
    machines: scaleMoney(breakdown.machines, multiplier),
    materials: scaleMoney(breakdown.materials, multiplier),
    contractors: scaleMoney(breakdown.contractors, multiplier),
    insurance: scaleMoney(breakdown.insurance, multiplier),
    overhead: scaleMoney(breakdown.overhead, multiplier),
    profit: scaleMoney(breakdown.profit, multiplier),
    usn: scaleMoney(breakdown.usn, multiplier),
    income,
    vat: round2(gross - income),
    gross,
  };
};

const changedOrScaled = (
  change: EstimateRowChange | undefined,
  key: CostFieldKey,
  baselineValue: number,
  multiplier: number,
): number => round2(rowChangeValue(change, key) ?? baselineValue * multiplier);

const coefficient = (
  change: EstimateRowChange | undefined,
  key: RateFieldKey,
  coefficients: EstimateCoefficients,
): number => rowChangeValue(change, key) ?? coefficients[key];

const calculateFormulaBreakdown = (
  row: EstimateRow,
  change: EstimateRowChange | undefined,
  multiplier: number,
  coefficients: EstimateCoefficients,
): CostBreakdown => {
  const baseline = row.baseline.breakdown;
  const primarySalary = changedOrScaled(
    change,
    'primary_salary',
    baseline.primary_salary,
    multiplier,
  );
  const machinistSalary = changedOrScaled(
    change,
    'machinist_salary',
    baseline.machinist_salary,
    multiplier,
  );
  const fot = round2(primarySalary + machinistSalary);
  const machines = changedOrScaled(
    change,
    'machines',
    baseline.machines,
    multiplier,
  );
  const materials = changedOrScaled(
    change,
    'materials',
    baseline.materials,
    multiplier,
  );
  const contractors = changedOrScaled(
    change,
    'contractors',
    baseline.contractors,
    multiplier,
  );
  const usesFotCoefficients = row.coefficient_policy === 'fot';
  const insurance = usesFotCoefficients
    ? round2(fot * coefficient(change, 'insurance_rate', coefficients))
    : 0;
  const overhead = usesFotCoefficients
    ? round2(fot * coefficient(change, 'overhead_rate', coefficients))
    : 0;
  const profit = usesFotCoefficients
    ? round2(fot * coefficient(change, 'profit_rate', coefficients))
    : 0;
  const usn = usesFotCoefficients
    ? round2(profit * coefficient(change, 'usn_rate', coefficients))
    : 0;
  const income = round2(
    fot +
      machines +
      materials +
      contractors +
      insurance +
      overhead +
      profit +
      usn,
  );
  const vat = round2(income * coefficient(change, 'vat_rate', coefficients));

  return {
    primary_salary: primarySalary,
    machinist_salary: machinistSalary,
    fot,
    machines,
    materials,
    contractors,
    insurance,
    overhead,
    profit,
    usn,
    income,
    vat,
    gross: round2(income + vat),
  };
};

const ratioForChange = (
  row: EstimateRow,
  key: 'volume' | 'frequency' | 'rate',
  changeValue: number | undefined,
): number => {
  if (changeValue === undefined) {
    return 1;
  }

  const baselineValue =
    key === 'volume'
      ? row.baseline.base?.value
      : key === 'frequency'
        ? row.baseline.frequency?.value
        : row.baseline.price?.value;

  if (baselineValue === undefined || baselineValue === 0) {
    throw new Error(`Cannot apply ${key} change to estimate row ${row.id}`);
  }

  return changeValue / baselineValue;
};

const quantityMultiplier = (
  row: EstimateRow,
  change: EstimateRowChange | undefined,
): number =>
  ratioForChange(row, 'volume', rowChangeValue(change, 'volume')) *
  ratioForChange(row, 'frequency', rowChangeValue(change, 'frequency')) *
  ratioForChange(row, 'rate', rowChangeValue(change, 'rate'));

const rowBreakdown = (
  row: EstimateRow,
  change: EstimateRowChange | undefined,
  coefficients: EstimateCoefficients,
): { readonly isEnabled: boolean; readonly breakdown: CostBreakdown } => {
  const isEnabled = change?.enabled ?? row.baseline.is_enabled;

  if (!isEnabled) {
    return { isEnabled, breakdown: zeroBreakdown() };
  }

  const multiplier = quantityMultiplier(row, change);
  const hasQuantityChange = hasAnyNumberChange(change, [
    'volume',
    'frequency',
    'rate',
  ]);
  const hasFixedPriceChange = hasNumberChange(change, 'fixed_price');
  const hasExpertChange =
    hasAnyNumberChange(change, COST_FIELD_KEYS) ||
    hasAnyNumberChange(change, RATE_FIELD_KEYS);

  if (!hasQuantityChange && !hasFixedPriceChange && !hasExpertChange) {
    return { isEnabled, breakdown: cloneBreakdown(row.baseline.breakdown) };
  }

  if (hasFixedPriceChange) {
    const fixedPrice = rowChangeValue(change, 'fixed_price') as number;
    const fixedPriceMultiplier =
      row.baseline.breakdown.gross === 0
        ? 1
        : fixedPrice / row.baseline.breakdown.gross;

    return {
      isEnabled,
      breakdown: scaleBreakdown(
        row.baseline.breakdown,
        fixedPriceMultiplier,
        fixedPrice,
        coefficient(change, 'vat_rate', coefficients),
      ),
    };
  }

  if (hasExpertChange) {
    return {
      isEnabled,
      breakdown: calculateFormulaBreakdown(
        row,
        change,
        multiplier,
        coefficients,
      ),
    };
  }

  return {
    isEnabled,
    breakdown: scaleBreakdown(row.baseline.breakdown, multiplier),
  };
};

const calculateRow = (
  row: EstimateRow,
  changes: EstimateCalculationChanges,
  coefficients: EstimateCoefficients,
  areaSotki: number,
  remainingRowChangeIds: Set<string>,
): CalculatedEstimateRow => {
  const change = changes.rows?.[row.id];
  remainingRowChangeIds.delete(row.id);

  const calculated = rowBreakdown(row, change, coefficients);
  const children = row.children?.map((child) =>
    calculateRow(
      child,
      changes,
      coefficients,
      areaSotki,
      remainingRowChangeIds,
    ),
  );
  const childrenDelta =
    children?.reduce((total, child) => total + child.delta_annual_gross, 0) ??
    0;
  const deltaAnnualGross = round2(
    calculated.breakdown.gross - row.baseline.annual_gross + childrenDelta,
  );
  const annualGross = round2(row.baseline.annual_gross + deltaAnnualGross);
  const tariffPerSotkaMonth = calculated.isEnabled
    ? tariffFromBaseline(
        row.baseline.tariff_per_sotka_month,
        deltaAnnualGross,
        areaSotki,
      )
    : 0;

  return {
    id: row.id,
    title: row.title,
    is_enabled: calculated.isEnabled,
    annual_gross: annualGross,
    tariff_per_sotka_month: tariffPerSotkaMonth,
    delta_annual_gross: deltaAnnualGross,
    delta_tariff_per_sotka_month: round2(
      tariffPerSotkaMonth - row.baseline.tariff_per_sotka_month,
    ),
    breakdown: calculated.breakdown,
    children: children && children.length > 0 ? children : undefined,
  };
};

const calculateSection = (
  section: EstimateSection,
  changes: EstimateCalculationChanges,
  coefficients: EstimateCoefficients,
  areaSotki: number,
  remainingRowChangeIds: Set<string>,
): CalculatedEstimateSection => {
  const rows = section.rows.map((row) =>
    calculateRow(row, changes, coefficients, areaSotki, remainingRowChangeIds),
  );
  const deltaAnnualGross = round2(
    rows.reduce((total, row) => total + row.delta_annual_gross, 0),
  );
  const annualGross = round2(section.baseline.annual_gross + deltaAnnualGross);
  const tariffPerSotkaMonth = tariffFromBaseline(
    section.baseline.tariff_per_sotka_month,
    deltaAnnualGross,
    areaSotki,
  );

  return {
    id: section.id,
    title: section.title,
    annual_gross: annualGross,
    tariff_per_sotka_month: tariffPerSotkaMonth,
    delta_annual_gross: deltaAnnualGross,
    delta_tariff_per_sotka_month: round2(
      tariffPerSotkaMonth - section.baseline.tariff_per_sotka_month,
    ),
    rows,
  };
};

export const calculateEstimate = (
  estimate: Estimate,
  changes: EstimateCalculationChanges = {},
): CalculatedEstimate => {
  const remainingRowChangeIds = new Set(Object.keys(changes.rows ?? {}));
  const sections = estimate.sections.map((section) =>
    calculateSection(
      section,
      changes,
      estimate.coefficients,
      estimate.tariff_area_sotki,
      remainingRowChangeIds,
    ),
  );

  if (remainingRowChangeIds.size > 0) {
    throw new Error(
      `Unknown estimate row changes: ${[...remainingRowChangeIds].join(', ')}`,
    );
  }

  const deltaAnnualGross = round2(
    sections.reduce((total, section) => total + section.delta_annual_gross, 0),
  );
  const tariffPerSotkaMonth = tariffFromBaseline(
    estimate.baseline.tariff_per_sotka_month,
    deltaAnnualGross,
    estimate.tariff_area_sotki,
  );

  return {
    id: estimate.id,
    year: estimate.year,
    title: estimate.title,
    annual_gross: round2(estimate.baseline.annual_gross + deltaAnnualGross),
    tariff_per_sotka_month: tariffPerSotkaMonth,
    delta_annual_gross: deltaAnnualGross,
    delta_tariff_per_sotka_month: round2(
      tariffPerSotkaMonth - estimate.baseline.tariff_per_sotka_month,
    ),
    sections,
  };
};
