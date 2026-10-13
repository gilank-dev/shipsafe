/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'http'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MOCK_LATENCY?: 'normal' | 'none'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
