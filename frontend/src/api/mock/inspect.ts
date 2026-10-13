import type { ZipEntry } from './zip-entries'

// Mirrors the server rules in spec 4.1 to 4.3 on the entry list only.
export const LIMITS = {
  maxEntries: 5000,
  maxUncompressedBytes: 100 * 1024 * 1024,
  maxRatio: 100,
  maxDepth: 20,
} as const

const SKIP_SEGMENTS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '__pycache__'])
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|otf|mp4|mov|mp3|wav|pdf|exe|dll|so|dylib|bin|class|jar)$/i

export interface Inspection {
  /** Present when the archive must be rejected. */
  unsafeReason?: string
  /** Regular files the audit would read. */
  kept: ZipEntry[]
  /** Paths ignored: symlinks, noise folders, binaries. Listed in "Not assessed". */
  skipped: string[]
}

function isTraversal(name: string): string | null {
  const normalized = name.replace(/\\/g, '/')
  if (normalized.startsWith('/')) return `absolute path in entry "${name}"`
  if (/^[A-Za-z]:/.test(normalized)) return `drive letter in entry "${name}"`
  if (normalized.split('/').includes('..')) return `path traversal in entry "${name}"`
  return null
}

export function inspectEntries(entries: readonly ZipEntry[]): Inspection {
  if (entries.length > LIMITS.maxEntries) {
    return { unsafeReason: `more than ${LIMITS.maxEntries.toLocaleString('en-US')} entries`, kept: [], skipped: [] }
  }
  let compressed = 0
  let uncompressed = 0
  for (const entry of entries) {
    const traversal = isTraversal(entry.name)
    if (traversal) return { unsafeReason: traversal, kept: [], skipped: [] }
    const depth = entry.name.split('/').filter(Boolean).length - 1
    if (depth > LIMITS.maxDepth) {
      return { unsafeReason: `directories nested deeper than ${LIMITS.maxDepth} levels`, kept: [], skipped: [] }
    }
    compressed += entry.compressedSize
    uncompressed += entry.uncompressedSize
  }
  if (uncompressed > LIMITS.maxUncompressedBytes) {
    return { unsafeReason: 'it declares more than 100 MB of data once extracted', kept: [], skipped: [] }
  }
  if (compressed > 0 && uncompressed / compressed > LIMITS.maxRatio) {
    return { unsafeReason: 'the compression ratio is above 100:1', kept: [], skipped: [] }
  }

  const kept: ZipEntry[] = []
  const skipped: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory) continue
    if (entry.isSymlink) {
      skipped.push(`${entry.name} (symlink, ignored)`)
      continue
    }
    const segments = entry.name.split('/')
    if (segments.some((s) => SKIP_SEGMENTS.has(s)) || BINARY_EXT.test(entry.name)) {
      skipped.push(entry.name)
      continue
    }
    kept.push(entry)
  }
  return { kept, skipped }
}
