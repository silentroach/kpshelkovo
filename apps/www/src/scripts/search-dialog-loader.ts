let shouldUseRetryModule = false;

export const loadSearchDialog = async (): Promise<
  typeof import('@/components/search/lazy')
> => {
  try {
    // Browsers cache failed module URLs, so retry must use a distinct Vite module ID.
    return await (shouldUseRetryModule
      ? import('@/components/search/lazy?search-load=retry')
      : import('@/components/search/lazy?search-load=initial'));
  } catch (error) {
    shouldUseRetryModule = true;
    throw error;
  }
};
