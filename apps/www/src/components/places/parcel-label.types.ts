export interface ParcelLabelItem {
  readonly code: string;
  readonly aliases?: readonly string[];
  readonly multipleCadastralParcels?: boolean;
}
