import { readBytes } from '../../domain/read-bytes'
import { ApiError } from '../errors'

export interface ZipEntry {
  name: string
  compressedSize: number
  uncompressedSize: number
  isDirectory: boolean
  isSymlink: boolean
}

const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50
const MAX_CENTRAL_DIRECTORY_BYTES = 4 * 1024 * 1024

/**
 * Reads entry names, sizes and attributes from the ZIP central directory.
 * Nothing is decompressed and no entry data is read, so a hostile archive cannot hurt the browser.
 */
export async function readZipEntries(file: Blob): Promise<ZipEntry[]> {
  const tailLength = Math.min(file.size, 22 + 0xffff)
  const tail = await readBytes(file.slice(file.size - tailLength))
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength)

  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === EOCD_SIG) {
      eocd = i
      break
    }
  }
  if (eocd === -1) throw new ApiError('not_zip', 'The end of the ZIP directory was not found.')

  const total = tailView.getUint16(eocd + 10, true)
  const cdSize = tailView.getUint32(eocd + 12, true)
  const cdOffset = tailView.getUint32(eocd + 16, true)
  if (cdSize > MAX_CENTRAL_DIRECTORY_BYTES) {
    throw new ApiError('unsafe_archive', 'the archive directory is unusually large')
  }
  if (cdOffset + cdSize > file.size) throw new ApiError('not_zip', 'The ZIP directory points outside the file.')

  const cd = await readBytes(file.slice(cdOffset, cdOffset + cdSize))
  const view = new DataView(cd.buffer, cd.byteOffset, cd.byteLength)
  const decoder = new TextDecoder('utf-8')
  const entries: ZipEntry[] = []
  let pos = 0
  while (pos + 46 <= cd.length && entries.length < Math.max(total, 1) + 10_000) {
    if (view.getUint32(pos, true) !== CEN_SIG) break
    const versionMadeBy = view.getUint16(pos + 4, true)
    const compressedSize = view.getUint32(pos + 20, true)
    const uncompressedSize = view.getUint32(pos + 24, true)
    const nameLength = view.getUint16(pos + 28, true)
    const extraLength = view.getUint16(pos + 30, true)
    const commentLength = view.getUint16(pos + 32, true)
    const externalAttrs = view.getUint32(pos + 38, true)
    const name = decoder.decode(cd.subarray(pos + 46, pos + 46 + nameLength))
    const unixMode = (externalAttrs >>> 16) & 0xf000
    const madeOnUnix = versionMadeBy >>> 8 === 3
    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      isDirectory: name.endsWith('/'),
      isSymlink: madeOnUnix && unixMode === 0xa000,
    })
    pos += 46 + nameLength + extraLength + commentLength
  }
  return entries
}
