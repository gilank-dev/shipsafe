import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import { validateAndExtractZip, checkZipMagicBytes, cleanupTempDir } from './zip-guard';
import fs from 'fs';

describe('Zip Guard Security Validation', () => {
  it('correctly verifies magic bytes PK\\x03\\x04', () => {
    const validMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(checkZipMagicBytes(validMagic)).toBe(true);

    const invalidMagic = Buffer.from([0x50, 0x4b, 0x00, 0x00]);
    expect(checkZipMagicBytes(invalidMagic)).toBe(false);

    const shortBuffer = Buffer.from([0x50, 0x4b]);
    expect(checkZipMagicBytes(shortBuffer)).toBe(false);
  });

  it('safely extracts a valid in-memory zip archive', () => {
    const zip = new AdmZip();
    zip.addFile('src/index.js', Buffer.from('console.log("hello");'));
    zip.addFile('package.json', Buffer.from('{"name":"test"}'));
    const buffer = zip.toBuffer();

    const res = validateAndExtractZip(buffer);
    expect(res.valid).toBe(true);
    expect(res.tempDir).toBeDefined();
    expect(res.entryCount).toBe(2);

    if (res.tempDir) {
      expect(fs.existsSync(res.tempDir)).toBe(true);
      cleanupTempDir(res.tempDir);
      expect(fs.existsSync(res.tempDir)).toBe(false);
    }
  });

  it('blocks and rejects zip-slip path traversal entry', () => {
    const zip = new AdmZip();
    zip.addFile('evil.sh', Buffer.from('rm -rf /'));
    // AdmZip normalizes file paths in addFile; mutate entryName directly to simulate malicious raw zip entry
    const entry = zip.getEntries()[0];
    entry.entryName = '../../evil.sh';
    const buffer = zip.toBuffer();

    const res = validateAndExtractZip(buffer);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Path traversal detected/);
  });

  it('blocks non-zip files', () => {
    const fakeFile = Buffer.from('This is a plain text file, not a zip');
    const res = validateAndExtractZip(fakeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/magic bytes mismatch/);
  });
});
