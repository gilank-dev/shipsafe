import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

export interface ZipValidationResult {
  valid: boolean;
  error?: string;
  tempDir?: string;
  entryCount?: number;
  totalDecompressedBytes?: number;
}

const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10 MB compressed
const MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024; // 100 MB decompressed
const MAX_COMPRESSION_RATIO = 100; // 100:1
const MAX_ENTRIES = 5000;
const MAX_DEPTH = 32;

export function checkZipMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
  return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

export interface ZipValidationOptions {
  maxBytes?: number;
  maxDecompressedBytes?: number;
}

export function validateAndExtractZip(fileBuffer: Buffer, options?: ZipValidationOptions): ZipValidationResult {
  const allowedMaxBytes = options?.maxBytes ?? MAX_ZIP_BYTES;
  const allowedMaxDecompressed = options?.maxDecompressedBytes ?? MAX_DECOMPRESSED_BYTES;

  // 1. File size check
  if (fileBuffer.length > allowedMaxBytes) {
    const limitMb = (allowedMaxBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Archive exceeds maximum allowed size of ${limitMb} MB (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB).`
    };
  }

  // 2. Magic bytes check
  if (!checkZipMagicBytes(fileBuffer)) {
    return {
      valid: false,
      error: 'Invalid file format: Not a valid ZIP archive (magic bytes mismatch).'
    };
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(fileBuffer);
  } catch (err) {
    return {
      valid: false,
      error: `Failed to parse ZIP archive: ${err instanceof Error ? err.message : String(err)}`
    };
  }

  const entries = zip.getEntries();

  // 3. Max entries check
  if (entries.length > MAX_ENTRIES) {
    return {
      valid: false,
      error: `Archive contains too many entries (${entries.length} > ${MAX_ENTRIES}). Potential zip-bomb.`
    };
  }

  let totalDecompressed = 0;

  // 4. Inspect entries for zip-slip, depth, and zip-bomb ratio
  for (const entry of entries) {
    const entryName = entry.entryName;

    // Zip-slip: prevent path traversal (..), absolute paths, Windows drive letters (C:)
    if (
      entryName.includes('..') ||
      entryName.startsWith('/') ||
      entryName.startsWith('\\') ||
      /^[a-zA-Z]:/.test(entryName)
    ) {
      return {
        valid: false,
        error: `Security violation: Path traversal detected in entry "${entryName}".`
      };
    }

    // Depth check
    const normalized = path.normalize(entryName).replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length > MAX_DEPTH) {
      return {
        valid: false,
        error: `Security violation: Directory depth exceeds maximum of ${MAX_DEPTH} levels in "${entryName}".`
      };
    }

    // Accumulate decompressed size
    totalDecompressed += entry.header.size;
    if (totalDecompressed > allowedMaxDecompressed) {
      const decompressedLimitMb = (allowedMaxDecompressed / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `Decompressed size exceeds ${decompressedLimitMb} MB limit. Potential zip-bomb.`
      };
    }

    // Check individual entry compression ratio
    if (entry.header.compressedSize > 0) {
      const ratio = entry.header.size / entry.header.compressedSize;
      if (ratio > MAX_COMPRESSION_RATIO && entry.header.size > 1024 * 1024) {
        return {
          valid: false,
          error: `Abnormal compression ratio detected (${ratio.toFixed(0)}:1) in "${entryName}". Potential zip-bomb.`
        };
      }
    }
  }

  // 5. Extract to isolated temp sandbox
  const sandboxId = `shipsafe-${crypto.randomBytes(8).toString('hex')}`;
  const tempDir = path.join(os.tmpdir(), sandboxId);

  try {
    fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const targetPath = path.join(tempDir, entry.entryName);
      const safeDir = path.dirname(targetPath);

      // Verify resolved path stays strictly within tempDir
      const resolvedTarget = path.resolve(targetPath);
      const resolvedTemp = path.resolve(tempDir);
      const relative = path.relative(resolvedTemp, resolvedTarget);
      if (
        relative.startsWith('..') ||
        path.isAbsolute(relative) ||
        (!resolvedTarget.startsWith(resolvedTemp + path.sep) && resolvedTarget !== resolvedTemp)
      ) {
        throw new Error(`Zip-slip guard prevented extraction to ${resolvedTarget}`);
      }

      fs.mkdirSync(safeDir, { recursive: true });
      fs.writeFileSync(targetPath, entry.getData());
    }

    return {
      valid: true,
      tempDir,
      entryCount: entries.length,
      totalDecompressedBytes: totalDecompressed
    };
  } catch (err) {
    cleanupTempDir(tempDir);
    return {
      valid: false,
      error: `Extraction failed: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

export function cleanupTempDir(dir?: string): void {
  if (!dir) return;
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Failed to cleanup temp dir ${dir}:`, err);
  }
}
