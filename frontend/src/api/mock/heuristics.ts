import type { ZipEntry } from './zip-entries'
import type { BaseFinding } from './prompts'
import type { Scenario } from './scenarios/types'

const ENV_FILE = /(^|\/)\.env(\.[^/]+)?$/
const ENV_TEMPLATE = /\.(example|sample|template|dist)$/
const LOCKFILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']

const dirOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '')

/**
 * Structure-only analysis for ZIPs that are not one of the three samples.
 * It reads entry names only, so it never claims anything about file contents:
 * no CVE ids, no line numbers, no code findings.
 */
export function analyzeStructure(projectName: string, kept: readonly ZipEntry[], skipped: readonly string[]): Scenario {
  const names = new Set(kept.map((e) => e.name))
  const findings: BaseFinding[] = []
  const next = () => `F-${String(findings.length + 1).padStart(3, '0')}`

  for (const entry of kept) {
    if (ENV_FILE.test(entry.name) && !ENV_TEMPLATE.test(entry.name)) {
      findings.push({
        id: next(),
        title: `Environment file ${entry.name} is inside the ZIP`,
        severity: 'Medium',
        area: 'Secrets',
        location: { file: entry.name },
        what: 'The archive contains a real environment file rather than a template. Such files usually hold API keys and database passwords.',
        why: 'Anything in this file that was committed or shared in a ZIP should be treated as exposed to everyone who received it.',
        recommendedFix:
          'Remove the file from the ZIP and from git history, add it to .gitignore, keep a .env.example with empty values, and rotate any real credential it held.',
        verifyWith: 'gitleaks detect --source . --redact',
        confidence: 'Likely, verify',
      })
    }
  }

  for (const entry of kept) {
    if (entry.name === 'package.json' || entry.name.endsWith('/package.json')) {
      const dir = dirOf(entry.name)
      if (!LOCKFILES.some((lock) => names.has(dir + lock))) {
        findings.push({
          id: next(),
          title: `No lockfile next to ${entry.name}`,
          severity: 'Medium',
          area: 'Dependencies',
          location: { file: entry.name },
          what: 'No package-lock.json, yarn.lock, pnpm-lock.yaml or bun.lockb was found beside this manifest in the archive.',
          why: 'Without a lockfile, every install can pull different dependency versions, including a newly compromised release.',
          recommendedFix: 'Commit the lockfile for your package manager and install with npm ci (or the equivalent) in CI and Docker builds.',
          verifyWith: 'npm ci --dry-run',
          confidence: 'Likely, verify',
        })
      }
    }
  }

  for (const entry of kept) {
    if (entry.name === 'Dockerfile' || entry.name.endsWith('/Dockerfile')) {
      const dir = dirOf(entry.name)
      if (!names.has(`${dir}.dockerignore`)) {
        findings.push({
          id: next(),
          title: `No .dockerignore next to ${entry.name}`,
          severity: 'Low',
          area: 'Secrets',
          location: { file: entry.name },
          what: 'The Dockerfile has no .dockerignore beside it in the archive.',
          why: 'A COPY . . step without an ignore file can copy .env files and the .git folder into the image layers.',
          recommendedFix: 'Add a .dockerignore that excludes .env*, .git and node_modules.',
          verifyWith: 'docker build, then docker run --rm IMAGE ls -a /app',
          confidence: 'Likely, verify',
        })
      }
    }
  }

  const summary =
    findings.length === 0
      ? `The file list of ${projectName} shows no structural problems such as committed environment files or missing lockfiles. This review looked at file names only, so it says nothing about code, dependency versions or headers.`
      : `The file list of ${projectName} shows ${findings.length} structural issue${findings.length === 1 ? '' : 's'} worth fixing. This review looked at file names only, so it says nothing about code, dependency versions or headers. Use the findings as a starting point and run the real audit for a content review.`

  return {
    projectName,
    summary,
    findings,
    secretsToRotate: [],
    notAssessed: [
      'File contents were not read in mock mode, so code, dependency versions and header configuration were not assessed.',
      'Run the audit against the real ShipSafe service to review file contents.',
    ],
    skippedFiles: [...skipped],
  }
}
