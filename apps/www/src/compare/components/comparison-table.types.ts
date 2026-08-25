export interface ComparisonStatus {
  readonly icon: string;
  readonly text: string;
  readonly tone: string;
}

export interface ComparisonTableRow {
  readonly key: string;
  readonly label: string;
  readonly value?: string;
  readonly shelkovoValue?: string;
  readonly status: ComparisonStatus;
  readonly shelkovoStatus: ComparisonStatus;
}

export interface ComparisonTableProps {
  readonly title?: string;
  readonly itemHeading: string;
  readonly rows: readonly ComparisonTableRow[];
  readonly showShelkovo: boolean;
}
