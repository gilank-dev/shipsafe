import { URL } from 'url';

export interface ParsedRepo {
  owner: string;
  repo: string;
  ref?: string;
}

export interface FetchedRepoZip {
  buffer: Buffer;
  fileName: string;
  owner: string;
  repo: string;
  size: number;
}

export interface FetchRepoOptions {
  ref?: string;
  maxBytes?: number;
  token?: string;
  timeoutMs?: number;
}

export const MAX_REPO_BYTES = 10 * 1024 * 1024; // 10 MB cap

/**
 * Validates GitHub owner or repository slug component.
 * Allows alphanumeric, hyphens, underscores, and dots. Rejects path traversal and empty.
 */
function isValidSlugComponent(component: string): boolean {
  if (!component || component === '.' || component === '..') return false;
  return /^[a-zA-Z0-9_.-]+$/.test(component) && !component.includes('..');
}

/**
 * Normalizes and parses various GitHub repository URL formats:
 * - https://github.com/owner/repo
 * - http://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 * - git@github.com:owner/repo.git
 * - https://github.com/owner/repo/tree/branch-name
 * 
 * Returns { owner, repo, ref } or null if invalid or not a GitHub URL.
 */
export function parseGitHubRepo(rawInput: string): ParsedRepo | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const input = rawInput.trim();
  if (!input) return null;

  // 1. SSH format: git@github.com:owner/repo(.git)
  const sshMatch = input.match(/^git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/);
  if (sshMatch) {
    const owner = sshMatch[1];
    const repo = sshMatch[2].replace(/\.git$/i, '');
    if (isValidSlugComponent(owner) && isValidSlugComponent(repo)) {
      return { owner, repo };
    }
    return null;
  }

  // 2. HTTP/HTTPS or raw github.com
  let pathOnly = input;
  if (/^https?:\/\//i.test(pathOnly)) {
    try {
      const parsedUrl = new URL(pathOnly);
      const host = parsedUrl.hostname.toLowerCase();
      if (host !== 'github.com' && host !== 'www.github.com') {
        return null; // Not GitHub
      }
      pathOnly = parsedUrl.pathname;
    } catch {
      return null;
    }
  } else if (/^(?:www\.)?github\.com\//i.test(pathOnly)) {
    pathOnly = pathOnly.replace(/^(?:www\.)?github\.com\//i, '');
  }

  // Strip leading and trailing slashes
  pathOnly = pathOnly.replace(/^\/+|\/+$/g, '');

  const segments = pathOnly.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');
  let ref: string | undefined = undefined;

  if (segments.length >= 4 && segments[2] === 'tree') {
    ref = segments.slice(3).join('/');
  } else if (segments.length > 2) {
    return null; // Unexpected nested path
  }

  if (!isValidSlugComponent(owner) || !isValidSlugComponent(repo)) {
    return null;
  }

  return { owner, repo, ...(ref ? { ref } : {}) };
}

/**
 * Fetches a GitHub repository zipball with size limit and redirect handling.
 */
export async function fetchGitHubRepoZip(
  owner: string,
  repo: string,
  options: FetchRepoOptions = {}
): Promise<FetchedRepoZip> {
  const maxBytes = options.maxBytes ?? MAX_REPO_BYTES;
  const token = options.token || process.env.GITHUB_TOKEN;
  const timeoutMs = options.timeoutMs ?? 30000;

  if (!isValidSlugComponent(owner) || !isValidSlugComponent(repo)) {
    const err: any = new Error(`Invalid repository name: ${owner}/${repo}`);
    err.code = 'invalid_repo_url';
    err.statusCode = 400;
    throw err;
  }

  // Determine zip URL
  let targetUrl: string;
  if (options.ref) {
    targetUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${options.ref}.zip`;
  } else {
    // Primary URL: api.github.com redirecting to codeload.github.com
    targetUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
  }

  const headers: Record<string, string> = {
    'User-Agent': 'ShipSafe-Auditor/1.1',
    'Accept': 'application/vnd.github.v3+json, application/zip, */*',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      const err: any = new Error('Fetching repository archive timed out.');
      err.code = 'timeout';
      err.statusCode = 504;
      throw err;
    }
    const err: any = new Error(netErr.message || 'Failed to connect to GitHub.');
    err.code = 'network_error';
    err.statusCode = 502;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle 403 API rate limit fallback to HEAD.zip if unauthenticated
  if (res.status === 403 && !options.ref && !token) {
    const fallbackUrl = `https://github.com/${owner}/${repo}/archive/HEAD.zip`;
    try {
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'ShipSafe-Auditor/1.1' },
        redirect: 'follow',
      });
      if (fallbackRes.ok) {
        res = fallbackRes;
      }
    } catch {
      // ignore fallback error and let primary status handle
    }
  }

  if (res.status === 404) {
    const err: any = new Error(
      `Repository "${owner}/${repo}" was not found or is private. Please ensure the repository is public.`
    );
    err.code = 'repo_not_found';
    err.statusCode = 404;
    throw err;
  }

  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const isRateLimit = remaining === '0';
    const err: any = new Error(
      isRateLimit
        ? 'GitHub API rate limit exceeded. Please try again later or upload a ZIP file.'
        : `Access to repository "${owner}/${repo}" is forbidden.`
    );
    err.code = isRateLimit ? 'rate_limited' : 'repo_forbidden';
    err.statusCode = isRateLimit ? 429 : 403;
    throw err;
  }

  if (!res.ok) {
    const err: any = new Error(`GitHub returned HTTP ${res.status}: ${res.statusText}`);
    err.code = 'github_error';
    err.statusCode = res.status;
    throw err;
  }

  // 1. Content-Length check
  const contentLength = res.headers.get('content-length');
  if (contentLength) {
    const len = parseInt(contentLength, 10);
    if (!isNaN(len) && len > maxBytes) {
      const err: any = new Error(`The repository archive exceeds the 10 MB limit (${(len / (1024 * 1024)).toFixed(1)} MB).`);
      err.code = 'too_large';
      err.statusCode = 413;
      throw err;
    }
  }

  // 2. Read stream with cumulative byte count
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            await reader.cancel();
            const err: any = new Error('The repository archive exceeds the 10 MB limit.');
            err.code = 'too_large';
            err.statusCode = 413;
            throw err;
          }
          chunks.push(value);
        }
      }
    } catch (readErr: any) {
      if (readErr.code === 'too_large') throw readErr;
      const err: any = new Error('Failed to read repository archive stream from GitHub.');
      err.code = 'stream_error';
      err.statusCode = 502;
      throw err;
    }
  } else {
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      const err: any = new Error('The repository archive exceeds the 10 MB limit.');
      err.code = 'too_large';
      err.statusCode = 413;
      throw err;
    }
    chunks.push(new Uint8Array(arrayBuffer));
    totalBytes = arrayBuffer.byteLength;
  }

  const buffer = Buffer.concat(chunks);

  // 3. Verify ZIP magic bytes (PK\x03\x04 or PK\x05\x06 or PK\x07\x08)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    const err: any = new Error('The downloaded file is not a valid ZIP archive.');
    err.code = 'not_zip';
    err.statusCode = 415;
    throw err;
  }

  const cleanRepoName = repo.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${owner}-${cleanRepoName}.zip`;

  return {
    buffer,
    fileName,
    owner,
    repo,
    size: buffer.length,
  };
}
