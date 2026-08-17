export type SearchScope = 'page' | 'manual';

export interface SearchSection {
  readonly id: string;
  readonly label: string;
}

export interface SearchDocument {
  readonly scope: SearchScope;
  readonly title: string;
  readonly description?: string;
  readonly section: SearchSection;
  readonly publishedAt?: string;
  readonly tags?: readonly string[];
  readonly aliases?: readonly string[];
}
