export type SearchDialogModule = typeof import('@/components/search/lazy');

export type SearchDialogImporter = (url: string) => Promise<SearchDialogModule>;
