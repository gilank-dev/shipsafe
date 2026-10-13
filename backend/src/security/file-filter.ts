import fs from 'fs';
import path from 'path';

export interface FilteredProjectFiles {
  securityFiles: { relativePath: string; content: string; size: number }[];
  skippedFiles: string[];
  manifests: { type: string; path: string; content: string }[];
  envFiles: { path: string; content: string }[];
  configs: { path: string; content: string }[];
  serverHardeningFiles: { path: string; content: string }[];
  codeFiles: { path: string; content: string }[];
}

const NOISE_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  'vendor',
  '__pycache__',
  '.cache',
  '.turbo',
  '.idea',
  '.vscode',
  'coverage',
  '.gradle'
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.bmp', '.tiff',
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.mp3', '.wav', '.ogg',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pyc', '.pyo', '.class', '.jar', '.war'
]);

const SECURITY_PRIORITY_PATTERNS = [
  /package\.json$/,
  /requirements\.txt$/,
  /pyproject\.toml$/,
  /go\.mod$/,
  /Cargo\.toml$/,
  /\.env(?:\..*)?$/,
  /docker-compose(?:\..*)?\.ya?ml$/,
  /Dockerfile(?:\..*)?$/,
  /next\.config\.(?:js|mjs|ts)$/,
  /vercel\.json$/,
  /nginx\.conf$/,
  /(?:routes?|api|auth|controllers?|middleware|db|database|models?|services?)\/.*\.(?:ts|js|jsx|tsx|py|go|php)$/i
];

const MAX_TOTAL_TEXT_BYTES = 500 * 1024; // 500 KB token budget

export function walkAndFilterDirectory(rootDir: string): FilteredProjectFiles {
  const result: FilteredProjectFiles = {
    securityFiles: [],
    skippedFiles: [],
    manifests: [],
    envFiles: [],
    configs: [],
    serverHardeningFiles: [],
    codeFiles: []
  };

  let totalBytesRead = 0;

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (NOISE_DIRECTORIES.has(entry.name)) {
          result.skippedFiles.push(`${relativePath}/ (noise directory)`);
          continue;
        }
        traverse(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (BINARY_EXTENSIONS.has(ext)) {
          result.skippedFiles.push(`${relativePath} (binary/media asset)`);
          continue;
        }

        const stat = fs.statSync(fullPath);
        if (stat.size > 200 * 1024) {
          result.skippedFiles.push(`${relativePath} (large file >200KB)`);
          continue;
        }

        // Check if file is priority
        const isPriority = SECURITY_PRIORITY_PATTERNS.some((pattern) => pattern.test(relativePath));

        if (totalBytesRead + stat.size > MAX_TOTAL_TEXT_BYTES && !isPriority) {
          result.skippedFiles.push(`${relativePath} (token budget exceeded)`);
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          totalBytesRead += stat.size;

          const item = { relativePath, content, size: stat.size };
          result.securityFiles.push(item);

          // Categorize
          if (/package\.json$|requirements\.txt$|go\.mod$|Cargo\.toml$/.test(relativePath)) {
            result.manifests.push({ type: 'manifest', path: relativePath, content });
          } else if (/\.env(?:\..*)?$/.test(relativePath)) {
            result.envFiles.push({ path: relativePath, content });
          } else if (/next\.config|vercel\.json|nginx\.conf|vite\.config/.test(relativePath)) {
            result.configs.push({ path: relativePath, content });
            result.serverHardeningFiles.push({ path: relativePath, content });
          } else if (/(?:api|auth|routes?|middleware|db)/i.test(relativePath)) {
            result.codeFiles.push({ path: relativePath, content });
          }
        } catch {
          result.skippedFiles.push(`${relativePath} (read error/binary)`);
        }
      }
    }
  }

  traverse(rootDir);
  return result;
}
