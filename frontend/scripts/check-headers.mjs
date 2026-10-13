// Fails when a running ShipSafe build is missing a required security header.
// Usage: node scripts/check-headers.mjs http://localhost:4173
const url = process.argv[2] ?? 'http://localhost:4173'
const res = await fetch(url)
const required = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
]
const missing = required.filter((name) => !res.headers.get(name))
const csp = res.headers.get('content-security-policy') ?? ''
const unsafe = /(script-src|style-src)[^;]*'unsafe-inline'/.test(csp)
if (missing.length > 0 || unsafe) {
  if (missing.length > 0) console.error('Missing headers: ' + missing.join(', '))
  if (unsafe) console.error("CSP allows 'unsafe-inline' in script-src or style-src")
  process.exit(1)
}
console.log('All required security headers present at ' + url)
