import type { Scenario } from './types'

export const harborlog: Scenario = {
  projectName: 'Harborlog',
  summary:
    'Harborlog is a static site with no accounts and no personal data, and the review found nothing that blocks a launch. One browser feature policy header is missing. Two notes record controls that are working and should stay that way.',
  secretsToRotate: [],
  notAssessed: [
    'The Cloudflare Pages project settings (preview deployments, access rules) are configured outside the repository.',
    'Third-party scripts loaded at runtime were not assessed because none appear in the source files.',
  ],
  skippedFiles: [],
  findings: [
    {
      id: 'F-001',
      title: 'Permissions-Policy header is not set',
      severity: 'Low',
      area: 'HTTP',
      location: { file: 'public/_headers' },
      what: 'The _headers file sets X-Content-Type-Options and a CSP, but no Permissions-Policy.',
      why: 'The site uses no camera, microphone or location features. Declaring that blocks them if a future script or embed ever asks for them.',
      recommendedFix: 'Add Permissions-Policy: camera=(), microphone=(), geolocation=() to the global header block.',
      verifyWith: 'curl -I https://your-site.example and look for the Permissions-Policy line.',
      confidence: 'Confirmed',
    },
    {
      id: 'F-002',
      title: 'Strict Content-Security-Policy is in place',
      severity: 'Info',
      area: 'HTTP',
      location: { file: 'public/_headers' },
      what: 'The CSP limits scripts, styles and fonts to the site\'s own origin and does not use unsafe-inline.',
      why: 'This is working well. The risk is regression: someone adds an inline snippet later and loosens the policy to make it work.',
      recommendedFix: 'Keep the policy. Add a CI check that fails when the deployed CSP contains unsafe-inline.',
      verifyWith: 'curl -sI https://your-site.example | grep -i content-security-policy',
      confidence: 'Confirmed',
    },
    {
      id: 'F-003',
      title: 'Lockfile is committed and dependency versions are pinned',
      severity: 'Info',
      area: 'Dependencies',
      location: { file: 'package-lock.json' },
      what: 'package.json uses an exact Astro version and package-lock.json is present.',
      why: 'This keeps builds reproducible. It stays true only if the build installs from the lockfile.',
      recommendedFix: 'Keep it. Use npm ci in the Cloudflare build command so the lockfile is enforced.',
      verifyWith: 'npm ci --dry-run',
      confidence: 'Likely, verify',
    },
  ],
}
