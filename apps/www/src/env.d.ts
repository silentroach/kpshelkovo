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
