export interface BreadcrumbLink {
  readonly name: string;
  readonly url: string;
}

export interface ListEntry {
  readonly name: string;
  readonly url?: string;
}

export interface CollectionPageInput {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly items?: readonly ListEntry[];
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}
