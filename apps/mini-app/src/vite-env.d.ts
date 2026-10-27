/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Development-only signed initData, written by `npm run dev:init-data`. */
  readonly VITE_DEV_INIT_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
