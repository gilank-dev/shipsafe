/** Spec 4.1: the compressed ZIP limit is 10 MB. We read "MB" as MiB (10 * 1024 * 1024 bytes). */
export const MAX_ZIP_BYTES = 10 * 1024 * 1024
export const MAX_DESCRIPTION_CHARS = 1000
export const MAX_RESPONSE_CHARS = 500_000
export const AUDIT_TIMEOUT_MS = 120_000
export const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const
export const ALLOWED_ZIP_MIME = ['application/zip', 'application/x-zip-compressed', ''] as const
