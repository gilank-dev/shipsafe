import { ALLOWED_ZIP_MIME, MAX_ZIP_BYTES, ZIP_MAGIC } from '../config/limits'
import { formatBytes } from './format'
import { readBytes } from './read-bytes'

export type ZipValidation =
  | { ok: true }
  | { ok: false; code: 'too_large' | 'not_zip' | 'empty' | 'multiple'; message: string }

const LIMIT_LABEL = `${MAX_ZIP_BYTES / (1024 * 1024)} MB`

/**
 * Client-side gate (spec Req 3.2). The server repeats every check.
 * The size check runs before any byte is read. Only 4 magic bytes are ever read; the ZIP is never extracted here.
 */
export async function validateZipFile(file: File | File[] | FileList): Promise<ZipValidation> {
  const files = 'length' in file ? Array.from(file) : [file]
  if (files.length > 1) {
    return { ok: false, code: 'multiple', message: 'Choose one ZIP file. Put everything you want reviewed into a single archive.' }
  }
  const single = files[0]
  if (!single) {
    return { ok: false, code: 'empty', message: 'No file was received. Choose a ZIP file and try again.' }
  }
  if (single.size === 0) {
    return { ok: false, code: 'empty', message: 'This file is empty. Create the ZIP again and make sure it contains your project.' }
  }
  if (single.size > MAX_ZIP_BYTES) {
    return {
      ok: false,
      code: 'too_large',
      message: `This file is ${formatBytes(single.size)}. The limit is ${LIMIT_LABEL}. Remove build output and node_modules, then zip again.`,
    }
  }
  const mimeOk = (ALLOWED_ZIP_MIME as readonly string[]).includes(single.type)
  if (!single.name.toLowerCase().endsWith('.zip') || !mimeOk) {
    return { ok: false, code: 'not_zip', message: 'ShipSafe accepts .zip files only. Compress your project folder into a ZIP and choose it again.' }
  }
  const head = await readBytes(single.slice(0, 4))
  const matches = ZIP_MAGIC.every((byte, i) => head[i] === byte)
  if (!matches) {
    return { ok: false, code: 'not_zip', message: 'This file is named .zip but does not look like a ZIP archive. Create a new ZIP and choose it again.' }
  }
  return { ok: true }
}
