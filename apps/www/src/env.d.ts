interface ImportMetaEnv {
  readonly PAGEFIND_DEV_SNAPSHOT_AVAILABLE: boolean;
  readonly PUBLIC_YANDEX_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ymaps3?: typeof ymaps3;
}

declare module 'virtual:settlements-explorer-assets' {
  export const explorerGraphUrl: string;
}

declare module '@/components/search/lazy?search-load=initial' {
  export const openSearchDialog: typeof import('@/components/search/lazy').openSearchDialog;
}

declare module '@/components/search/lazy?search-load=retry' {
  export const openSearchDialog: typeof import('@/components/search/lazy').openSearchDialog;
}
