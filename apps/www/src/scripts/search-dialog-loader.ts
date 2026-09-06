import { searchDialogGraphUrl } from 'virtual:search-dialog-assets';
import type {
  SearchDialogImporter,
  SearchDialogModule,
} from '@/scripts/search-dialog-loader.types';

let graphRetry = 0;

export const isSearchDialogLoadRetry = (): boolean => graphRetry > 0;

const importSearchDialogGraph = (url: string): Promise<SearchDialogModule> =>
  import(/* @vite-ignore */ url);

export const loadSearchDialog = async (
  importGraph: SearchDialogImporter = importSearchDialogGraph,
): Promise<SearchDialogModule> => {
  const graphUrl = new URL(searchDialogGraphUrl, location.origin);
  if (graphRetry > 0) {
    graphUrl.searchParams.set('search-retry', String(graphRetry));
  }

  try {
    return await importGraph(graphUrl.href);
  } catch (error) {
    graphRetry += 1;
    throw error;
  }
};
