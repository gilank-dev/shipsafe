import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseGitHubRepo, fetchGitHubRepoZip, MAX_REPO_BYTES } from './repo-importer';

describe('repo-importer', () => {
  describe('parseGitHubRepo', () => {
    it('parses owner/repo shorthand format', () => {
      const parsed = parseGitHubRepo('octocat/Hello-World');
      expect(parsed).toEqual({ owner: 'octocat', repo: 'Hello-World' });
    });

    it('parses standard https://github.com/owner/repo URL', () => {
      const parsed = parseGitHubRepo('https://github.com/facebook/react');
      expect(parsed).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('parses www.github.com URL', () => {
      const parsed = parseGitHubRepo('https://www.github.com/vercel/next.js');
      expect(parsed).toEqual({ owner: 'vercel', repo: 'next.js' });
    });

    it('parses github.com without protocol', () => {
      const parsed = parseGitHubRepo('github.com/tailwindlabs/tailwindcss');
      expect(parsed).toEqual({ owner: 'tailwindlabs', repo: 'tailwindcss' });
    });

    it('strips trailing .git extension', () => {
      const parsed = parseGitHubRepo('https://github.com/torvalds/linux.git');
      expect(parsed).toEqual({ owner: 'torvalds', repo: 'linux' });
    });

    it('handles trailing slash', () => {
      const parsed = parseGitHubRepo('https://github.com/microsoft/vscode/');
      expect(parsed).toEqual({ owner: 'microsoft', repo: 'vscode' });
    });

    it('parses SSH clone format', () => {
      const parsed = parseGitHubRepo('git@github.com:shadcn-ui/ui.git');
      expect(parsed).toEqual({ owner: 'shadcn-ui', repo: 'ui' });
    });

    it('extracts branch/ref from /tree/ URL', () => {
      const parsed = parseGitHubRepo('https://github.com/expressjs/express/tree/develop');
      expect(parsed).toEqual({ owner: 'expressjs', repo: 'express', ref: 'develop' });
    });

    it('extracts nested branch ref from /tree/ URL', () => {
      const parsed = parseGitHubRepo('https://github.com/expressjs/express/tree/feature/v5.0');
      expect(parsed).toEqual({ owner: 'expressjs', repo: 'express', ref: 'feature/v5.0' });
    });

    it('rejects empty or whitespace input', () => {
      expect(parseGitHubRepo('')).toBeNull();
      expect(parseGitHubRepo('   ')).toBeNull();
    });

    it('rejects non-GitHub domains', () => {
      expect(parseGitHubRepo('https://gitlab.com/owner/repo')).toBeNull();
      expect(parseGitHubRepo('https://bitbucket.org/owner/repo')).toBeNull();
      expect(parseGitHubRepo('https://attacker.com/github.com/owner/repo')).toBeNull();
    });

    it('rejects path traversal attempts', () => {
      expect(parseGitHubRepo('../etc/passwd')).toBeNull();
      expect(parseGitHubRepo('octocat/../../etc/passwd')).toBeNull();
      expect(parseGitHubRepo('octocat/..')).toBeNull();
      expect(parseGitHubRepo('../octocat')).toBeNull();
    });

    it('rejects single segment or malformed inputs', () => {
      expect(parseGitHubRepo('just-a-name')).toBeNull();
      expect(parseGitHubRepo('octocat/')).toBeNull();
      expect(parseGitHubRepo('/repo')).toBeNull();
    });
  });

  describe('fetchGitHubRepoZip', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('successfully downloads and verifies a valid ZIP buffer', async () => {
      const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03]);
      const mockZip = Buffer.from(bytes);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/zip',
          'content-length': mockZip.length.toString(),
        }),
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        body: null,
      } as any);

      const result = await fetchGitHubRepoZip('octocat', 'Hello-World');
      expect(result.fileName).toBe('octocat-Hello-World.zip');
      expect(result.owner).toBe('octocat');
      expect(result.repo).toBe('Hello-World');
      expect(result.size).toBe(mockZip.length);
      expect(result.buffer[0]).toBe(0x50);
      expect(result.buffer[1]).toBe(0x4b);
    });

    it('throws repo_not_found with status 404 when repository does not exist', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      } as any);

      await expect(fetchGitHubRepoZip('octocat', 'non-existent-repo')).rejects.toMatchObject({
        code: 'repo_not_found',
        statusCode: 404,
      });
    });

    it('throws rate_limited with status 429 when GitHub rate limit is exceeded', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({
          'x-ratelimit-remaining': '0',
        }),
      } as any);

      await expect(fetchGitHubRepoZip('octocat', 'Hello-World')).rejects.toMatchObject({
        code: 'rate_limited',
        statusCode: 429,
      });
    });

    it('throws too_large with status 413 when Content-Length exceeds 10MB', async () => {
      const oversized = MAX_REPO_BYTES + 1024;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-length': oversized.toString(),
        }),
      } as any);

      await expect(fetchGitHubRepoZip('octocat', 'huge-repo')).rejects.toMatchObject({
        code: 'too_large',
        statusCode: 413,
      });
    });

    it('throws not_zip with status 415 when downloaded content lacks ZIP magic bytes', async () => {
      const textBuffer = Buffer.from('<!DOCTYPE html><html><body>Error</body></html>');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-length': textBuffer.length.toString(),
        }),
        arrayBuffer: async () => textBuffer.buffer,
        body: null,
      } as any);

      await expect(fetchGitHubRepoZip('octocat', 'html-error')).rejects.toMatchObject({
        code: 'not_zip',
        statusCode: 415,
      });
    });
  });
});
