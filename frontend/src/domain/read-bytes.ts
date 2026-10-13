/** Reads a Blob into bytes. Uses Blob.arrayBuffer when available, FileReader otherwise (older jsdom). */
export function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer().then((buf) => new Uint8Array(buf))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsArrayBuffer(blob)
  })
}
