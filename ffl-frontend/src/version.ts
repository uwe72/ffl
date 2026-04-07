import packageJson from '../package.json'

const version = packageJson.version
const gitHash = import.meta.env.VITE_GIT_HASH as string | undefined

export function getVersionString(): string {
  if (gitHash && gitHash !== 'unknown') {
    return `v${version} (${gitHash})`
  }
  return `v${version}`
}
