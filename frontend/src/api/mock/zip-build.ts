// Tiny store-only ZIP writer. Used to build in-memory sample projects and hostile test archives.
export interface BuildEntry {
  name: string
  content?: string
  /** Mark the entry as a Unix symlink (made-by Unix, mode 0120777). */
  symlink?: boolean
}

let crcTable: Uint32Array | null = null
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of bytes) crc = (crcTable[(crc ^ b) & 0xff] as number) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function buildZip(entries: readonly BuildEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const data = encoder.encode(entry.content ?? '')
    const crc = crc32(data)

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)

    const cen = new Uint8Array(46 + name.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, entry.symlink ? (3 << 8) | 20 : 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    if (entry.symlink) cv.setUint32(38, (0o120777 << 16) >>> 0, true)
    cv.setUint32(42, offset, true)
    cen.set(name, 46)

    chunks.push(local, data)
    central.push(cen)
    offset += local.length + data.length
  }

  const cdSize = central.reduce((n, c) => n + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)

  const all = [...chunks, ...central, eocd]
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0))
  let pos = 0
  for (const c of all) {
    out.set(c, pos)
    pos += c.length
  }
  return out
}

export function buildZipFile(fileName: string, entries: readonly BuildEntry[]): File {
  const bytes = buildZip(entries)
  return new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], fileName, {
    type: 'application/zip',
    lastModified: 1_700_000_000_000,
  })
}
