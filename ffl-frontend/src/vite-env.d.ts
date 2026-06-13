/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GIT_HASH: string
  readonly VITE_BUILD_DATE: string
  readonly VITE_APP_ENV: 'PROD' | 'TEST'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*/package.json' {
  interface PackageJson {
    version: string
  }
  const value: PackageJson
  export default value
}