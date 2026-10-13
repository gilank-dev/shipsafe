// Copies the frozen Disclaimer (spec section 7) byte-for-byte into src/config/text/disclaimer.txt.
// Usage: node scripts/extract-spec-text.mjs ../shipsafe-spec.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const specPath = resolve(process.argv[2] ?? '../shipsafe-spec.md')
const spec = readFileSync(specPath, 'utf8').replace(/\r\n/g, '\n')

const headingIndex = spec.search(/^## 7\. Disclaimer/m)
if (headingIndex === -1) {
  console.error('extract-spec-text: heading "## 7. Disclaimer" not found in ' + specPath)
  process.exit(1)
}
const afterHeading = spec.slice(headingIndex)
const fence = afterHeading.match(/```[^\n]*\n([\s\S]*?)\n```/)
if (!fence || !fence[1]) {
  console.error('extract-spec-text: no fenced block under "## 7. Disclaimer"')
  process.exit(1)
}

const out = resolve('src/config/text/disclaimer.txt')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, fence[1] + '\n', 'utf8')
console.log('extract-spec-text: wrote ' + out)
