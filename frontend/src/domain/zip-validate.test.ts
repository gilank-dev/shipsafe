import { describe, expect, it, vi } from 'vitest'
import { validateZipFile } from './zip-validate'

function zipFile(name = 'project.zip', bytes: number[] = [0x50, 0x4b, 0x03, 0x04, 1, 2, 3], type = 'application/zip') {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('validateZipFile', () => {
  it('accepts a file with ZIP magic bytes', async () => {
    expect(await validateZipFile(zipFile())).toEqual({ ok: true })
  })

  it('accepts the Windows MIME type and an empty MIME type', async () => {
    expect((await validateZipFile(zipFile('a.zip', undefined, 'application/x-zip-compressed'))).ok).toBe(true)
    expect((await validateZipFile(zipFile('a.zip', undefined, ''))).ok).toBe(true)
  })

  it('rejects oversize files without reading any bytes', async () => {
    const big = zipFile()
    Object.defineProperty(big, 'size', { value: 12.4 * 1024 * 1024 })
    const slice = vi.spyOn(big, 'slice')
    const result = await validateZipFile(big)
    expect(result).toMatchObject({ ok: false, code: 'too_large' })
    expect(result.ok === false && result.message).toContain('The limit is 10 MB')
    expect(slice).not.toHaveBeenCalled()
  })

  it('rejects a wrong extension', async () => {
    expect(await validateZipFile(zipFile('project.tar'))).toMatchObject({ ok: false, code: 'not_zip' })
  })

  it('rejects a .zip name with the wrong magic bytes', async () => {
    expect(await validateZipFile(zipFile('project.zip', [0x4d, 0x5a, 0x90, 0x00]))).toMatchObject({
      ok: false,
      code: 'not_zip',
    })
  })

  it('rejects an empty file', async () => {
    expect(await validateZipFile(new File([], 'empty.zip', { type: 'application/zip' }))).toMatchObject({
      ok: false,
      code: 'empty',
    })
  })

  it('rejects more than one file', async () => {
    expect(await validateZipFile([zipFile(), zipFile('b.zip')])).toMatchObject({ ok: false, code: 'multiple' })
  })
})
