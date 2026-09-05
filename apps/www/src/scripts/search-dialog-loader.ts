export const loadSearchDialog = (): Promise<
  typeof import('@/components/search/lazy')
> => import('@/components/search/lazy');
