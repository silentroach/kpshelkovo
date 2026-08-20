import type { SearchClient, SearchResult } from '@/lib/search/client.types';

export interface SearchDialogProps {
  readonly client?: SearchClient;
}

export interface SearchExcerptSegment {
  readonly breakBefore?: boolean;
  readonly highlighted: boolean;
  readonly text: string;
}

export interface SearchDialogResultRow {
  readonly contextTitle?: string;
  readonly excerptHtml?: string;
  readonly result: SearchResult;
  readonly url: string;
}

export type SearchDialogRequestMode = 'initial' | 'more';

export type SearchDialogState =
  'initial' | 'loading' | 'results' | 'empty' | 'error' | 'dev-unavailable';
