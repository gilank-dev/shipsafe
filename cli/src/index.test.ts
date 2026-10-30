const STRIPE_FIXTURE = 'sk_live_' + '1'.repeat(24);
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { runCli } from './index.js'

// Mock process.exit to prevent test termination
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code: number) => {
  throw new Error(`process.exit: ${code}`)
})

// Mock console.log and console.error to capture output
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('ShipSafe CLI', () => {
  const testDir = path.join(__dirname, '..', 'test-fixture')

  const originalEnvToken = process.env.SHIPSAFE_TOKEN
  const originalEnvConfigDir = process.env.SHIPSAFE_CONFIG_DIR

  beforeEach(() => {
    vi.clearAllMocks()
    mockExit.mockClear()
    mockLog.mockClear()
    mockError.mockClear()

    // Default test session to authenticated via environment variable
    process.env.SHIPSAFE_TOKEN = 'valid-test-token'
    process.env.SHIPSAFE_CONFIG_DIR = path.join(testDir, '.shipsafe')

    // Create test fixture directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (originalEnvToken !== undefined) {
      process.env.SHIPSAFE_TOKEN = originalEnvToken
    } else {
      delete process.env.SHIPSAFE_TOKEN
    }

    if (originalEnvConfigDir !== undefined) {
      process.env.SHIPSAFE_CONFIG_DIR = originalEnvConfigDir
    } else {
      delete process.env.SHIPSAFE_CONFIG_DIR
    }

    // Cleanup test fixture
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  function writeTestFile(filename: string, content: string): void {
    fs.writeFileSync(path.join(testDir, filename), content)
  }

  async function runCliWithArgs(args: string[]): Promise<number> {
    const originalArgv = process.argv
    process.argv = ['node', 'shipsafe', ...args]
    try {
      await runCli()
      return 0
    } catch (e: unknown) {
      const error = e as Error
      const exitCode = error.message.includes('process.exit: ')
        ? parseInt(error.message.replace('process.exit: ', ''), 10)
        : 2
      return exitCode
    } finally {
      process.argv = originalArgv
    }
  }

  describe('Argument parsing', () => {
    it('should show help with -h flag', async () => {
      const code = await runCliWithArgs(['-h'])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('SHIPSAFE SECURITY GATEKEEPER CLI'))
    })

    it('should show help with --help flag', async () => {
      const code = await runCliWithArgs(['--help'])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('SHIPSAFE SECURITY GATEKEEPER CLI'))
    })

    it('should show version with -v flag', async () => {
      const code = await runCliWithArgs(['-v'])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith('@lankdev/shipsafe-cli v1.0.0')
    })

    it('should show version with --version flag', async () => {
      const code = await runCliWithArgs(['--version'])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith('@lankdev/shipsafe-cli v1.0.0')
    })

    it('should error on unknown command', async () => {
      const code = await runCliWithArgs(['unknown'])
      expect(code).toBe(2)
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Unknown command'))
    })

    it('should error on missing target directory', async () => {
      const code = await runCliWithArgs(['scan', '/nonexistent/dir'])
      expect(code).toBe(2)
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('does not exist'))
    })

    it('should error on remote-url without api-key', async () => {
      const code = await runCliWithArgs(['scan', '.', '--remote-url=https://api.example.com'])
      expect(code).toBe(2)
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Both --remote-url and --api-key'))
    })

    it('should error on api-key without remote-url', async () => {
      const code = await runCliWithArgs(['scan', '.', '--api-key=test-key'])
      expect(code).toBe(2)
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Both --remote-url and --api-key'))
    })
  })

  describe('Exit codes', () => {
    it('should exit 0 when no findings (clean code)', async () => {
      writeTestFile('clean.ts', `const x = 1 + 2;\nconsole.log(x);\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=high'])
      expect(code).toBe(0)
    })

    it('should exit 1 when CRITICAL finding detected with --fail-on=high', async () => {
      writeTestFile('vuln.ts', `const query = \`SELECT * FROM users WHERE id = \${userId}\`;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=high'])
      expect(code).toBe(1)
    })

    it('should exit 1 when HIGH finding detected with --fail-on=high', async () => {
      writeTestFile('vuln.tsx', `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=high'])
      expect(code).toBe(1)
    })

    it('should exit 0 when HIGH finding but --fail-on=critical', async () => {
      writeTestFile('vuln.tsx', `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=critical'])
      expect(code).toBe(0)
    })

    it('should exit 1 when MEDIUM finding with --fail-on=medium', async () => {
      writeTestFile('vuln.ts', `const query = \`SELECT * FROM users WHERE id = \${userId}\`;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=medium'])
      expect(code).toBe(1)
    })

    it('should exit 1 when LOW finding with --fail-on=low', async () => {
      writeTestFile('vuln.ts', `const query = \`SELECT * FROM users WHERE id = \${userId}\`;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=low'])
      expect(code).toBe(1)
    })
  })

  describe('Output formats', () => {
    it('should output text format by default', async () => {
      writeTestFile('clean.ts', `const x = 1;\n`)
      await runCliWithArgs(['scan', testDir, '--format=text'])
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('SHIPSAFE SECURITY DOCKET'))
    })

    it('should output json format with --format=json', async () => {
      writeTestFile('clean.ts', `const x = 1;\n`)
      await runCliWithArgs(['scan', testDir, '--format=json'])
      const jsonOutput = mockLog.mock.calls.find((call: unknown[]) => {
        const str = call[0]
        return typeof str === 'string' && str.startsWith('{')
      })
      expect(jsonOutput).toBeDefined()
      const parsed = JSON.parse(jsonOutput![0] as string)
      expect(parsed).toHaveProperty('targetDir')
      expect(parsed).toHaveProperty('scannedFiles')
      expect(parsed).toHaveProperty('findings')
      expect(parsed).toHaveProperty('verdict')
      expect(parsed).toHaveProperty('counts')
    })

    it('should output sarif format with --format=sarif', async () => {
      writeTestFile('clean.ts', `const x = 1;\n`)
      await runCliWithArgs(['scan', testDir, '--format=sarif'])
      const sarifOutput = mockLog.mock.calls.find((call: unknown[]) => {
        const str = call[0]
        return typeof str === 'string' && str.includes('"version": "2.1.0"')
      })
      expect(sarifOutput).toBeDefined()
      const parsed = JSON.parse(sarifOutput![0] as string)
      expect(parsed).toHaveProperty('version', '2.1.0')
      expect(parsed).toHaveProperty('$schema', 'https://schemastore.org/schemas/json/sarif-2.1.0.json')
      expect(parsed).toHaveProperty('runs')
      expect(Array.isArray(parsed.runs)).toBe(true)
      expect(parsed.runs[0]).toHaveProperty('tool')
      expect(parsed.runs[0].tool).toHaveProperty('driver')
      expect(parsed.runs[0].tool.driver).toHaveProperty('name', 'ShipSafe')
      expect(parsed.runs[0]).toHaveProperty('results')
      expect(Array.isArray(parsed.runs[0].results)).toBe(true)
    })

    it('should produce valid SARIF structure with findings', async () => {
      writeTestFile('vuln.ts', `eval("alert(1)");\n`)
      await runCliWithArgs(['scan', testDir, '--format=sarif'])
      const sarifOutput = mockLog.mock.calls.find((call: unknown[]) => {
        const str = call[0]
        return typeof str === 'string' && str.includes('"version": "2.1.0"')
      })
      expect(sarifOutput).toBeDefined()
      const parsed = JSON.parse(sarifOutput![0] as string)
      expect(parsed.runs[0].results.length).toBeGreaterThan(0)
      const result = parsed.runs[0].results[0]
      expect(result).toHaveProperty('ruleId', 'SEC-EVAL-01')
      expect(result).toHaveProperty('level', 'error')
      expect(result).toHaveProperty('message')
      expect(result.message).toHaveProperty('text')
      expect(result).toHaveProperty('locations')
      expect(result.locations[0]).toHaveProperty('physicalLocation')
      expect(result.locations[0].physicalLocation).toHaveProperty('artifactLocation')
      expect(result.locations[0].physicalLocation.artifactLocation).toHaveProperty('uri', 'vuln.ts')
    })

    it('should output markdown format with --format=markdown', async () => {
      writeTestFile('clean.ts', `const x = 1;\n`)
      await runCliWithArgs(['scan', testDir, '--format=markdown'])
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('# ShipSafe Security Docket'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('### Severity Breakdown'))
    })

    it('should output markdown format with findings included', async () => {
      writeTestFile('vuln.ts', `eval("alert(1)");\n`)
      await runCliWithArgs(['scan', testDir, '--format=markdown'])
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('# ShipSafe Security Docket'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('### Flagged Findings'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('SEC-EVAL-01'))
    })
  })

  describe('Ignore patterns', () => {
    it('should respect --ignore flag', async () => {
      fs.mkdirSync(path.join(testDir, 'ignored'), { recursive: true })
      writeTestFile('ignored/vuln.ts', `eval("bad");\n`)
      writeTestFile('clean.ts', `const x = 1;\n`)

      const code = await runCliWithArgs(['scan', testDir, '--ignore=ignored', '--fail-on=high'])
      expect(code).toBe(0)
    })

    it('should respect default ignored dirs (node_modules)', async () => {
      fs.mkdirSync(path.join(testDir, 'node_modules'), { recursive: true })
      writeTestFile('node_modules/vuln.ts', `eval("bad");\n`)
      writeTestFile('clean.ts', `const x = 1;\n`)

      const code = await runCliWithArgs(['scan', testDir, '--fail-on=high'])
      expect(code).toBe(0)
    })
  })

  describe('Severity thresholds', () => {
    it('should pass with --fail-on=critical when only HIGH findings', async () => {
      writeTestFile('vuln.tsx', `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=critical'])
      expect(code).toBe(0)
    })

    it('should fail with --fail-on=high when HIGH findings present', async () => {
      writeTestFile('vuln.tsx', `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=high'])
      expect(code).toBe(1)
    })

    it('should fail with --fail-on=critical when CRITICAL findings present', async () => {
      writeTestFile('vuln.ts', `eval("alert(1)");\n`)
      const code = await runCliWithArgs(['scan', testDir, '--fail-on=critical'])
      expect(code).toBe(1)
    })

    it('should respect --threshold critical flag and pass when only HIGH findings', async () => {
      writeTestFile('vuln.tsx', `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--threshold=critical'])
      expect(code).toBe(0)
    })

    it('should respect --threshold critical flag and fail when CRITICAL findings present', async () => {
      writeTestFile('vuln.ts', `eval("alert(1)");\n`)
      const code = await runCliWithArgs(['scan', testDir, '--threshold=critical'])
      expect(code).toBe(1)
    })

    it('should respect --strict flag and fail on any finding', async () => {
      writeTestFile('vuln.tsx', `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--strict'])
      expect(code).toBe(1)
    })

    it('should respect both --strict and --threshold critical flags', async () => {
      writeTestFile('vuln.ts', `eval("alert(1)");\n`)
      const code = await runCliWithArgs(['scan', testDir, '--strict', '--threshold=critical'])
      expect(code).toBe(1)
    })

    it('should pass with 0 exit code under --strict when codebase is clean', async () => {
      writeTestFile('clean.ts', `const x = 100;\n`)
      const code = await runCliWithArgs(['scan', testDir, '--strict', '--threshold=critical'])
      expect(code).toBe(0)
    })
  })

  describe('Multiple files', () => {
    it('should scan multiple files and aggregate findings', async () => {
      writeTestFile('file1.ts', `eval("1");\n`)
      writeTestFile('file2.ts', `eval("2");\n`)
      writeTestFile('file3.ts', `const x = 1;\n`)

      await runCliWithArgs(['scan', testDir, '--format=json'])
      const jsonOutput = mockLog.mock.calls.find((call: unknown[]) => {
        const str = call[0]
        return typeof str === 'string' && str.startsWith('{')
      })
      expect(jsonOutput).toBeDefined()
      const parsed = JSON.parse(jsonOutput![0] as string)
      expect(parsed.scannedFiles).toBe(3)
      expect(parsed.findings.length).toBe(2)
    })

    it('should report correct counts by severity', async () => {
      writeTestFile('critical.ts', `eval("1");\n`) // CRITICAL
      writeTestFile('high.tsx', `return <div dangerouslySetInnerHTML={{ __html: x }} />;\n`) // HIGH
      writeTestFile('secret.ts', `const key = "AKIA1234567890123456";\n`) // CRITICAL

      await runCliWithArgs(['scan', testDir, '--format=json'])
      const jsonOutput = mockLog.mock.calls.find((call: unknown[]) => {
        const str = call[0]
        return typeof str === 'string' && str.startsWith('{')
      })
      expect(jsonOutput).toBeDefined()
      const parsed = JSON.parse(jsonOutput![0] as string)
      expect(parsed.counts.critical).toBe(2)
      expect(parsed.counts.high).toBe(1)
      expect(parsed.counts.medium).toBe(0)
      expect(parsed.counts.low).toBe(0)
    })
  })

  describe('Authentication and Session Gateway', () => {
    it('should scan without login and without any token', async () => {
      delete process.env.SHIPSAFE_TOKEN
      const code = await runCliWithArgs(['scan', testDir])
      expect(code).not.toBe(2)
      expect(mockError).not.toHaveBeenCalledWith(expect.stringContaining('Authentication required'))
    })

    it('should still scan when a stored token is expired', async () => {
      const expiredPayload = Buffer.from(
        JSON.stringify({ v: 1, sub: 'user_1', email: 'expired@shipsafe.dev', exp: Math.floor(Date.now() / 1000) - 100 })
      ).toString('base64url')
      process.env.SHIPSAFE_TOKEN = `sk_shipsafe_${expiredPayload}.fakesig`

      const code = await runCliWithArgs(['scan', testDir])
      expect(code).not.toBe(2)
    })

    it('should save credentials and succeed on shipsafe login', async () => {
      const originalFetch = globalThis.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'usr_dev', email: 'verified@shipsafe.dev' }),
      } as unknown as Response)
      globalThis.fetch = mockFetch

      try {
        const payload = Buffer.from(
          JSON.stringify({ v: 1, sub: 'usr_dev', email: 'verified@shipsafe.dev', exp: Math.floor(Date.now() / 1000) + 3600 })
        ).toString('base64url')
        const token = `sk_shipsafe_${payload}.validsig`

        const code = await runCliWithArgs(['login', `--token=${token}`])
        expect(code).toBe(0)
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Successfully signed in'))

        const credsFile = path.join(process.env.SHIPSAFE_CONFIG_DIR!, 'credentials.json')
        expect(fs.existsSync(credsFile)).toBe(true)
        const saved = JSON.parse(fs.readFileSync(credsFile, 'utf8'))
        expect(saved.email).toBe('verified@shipsafe.dev')
        expect(saved.token).toBe(token)
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should display whoami identity from stored credentials or env token', async () => {
      process.env.SHIPSAFE_TOKEN = 'valid-test-token'
      const code = await runCliWithArgs(['whoami'])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('ShipSafe CLI Identity:'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('developer@shipsafe.dev'))
    })

    it('should remove credentials on shipsafe logout', async () => {
      // Create a dummy credentials file
      const credsDir = process.env.SHIPSAFE_CONFIG_DIR!
      fs.mkdirSync(credsDir, { recursive: true })
      fs.writeFileSync(path.join(credsDir, 'credentials.json'), '{"token":"xyz"}')

      const code = await runCliWithArgs(['logout'])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Successfully signed out'))
      expect(fs.existsSync(path.join(credsDir, 'credentials.json'))).toBe(false)
    })
  })

  describe('Re-Audit Diff Command', () => {
    it('should run diff verification between base and target directories', async () => {
      const baseDir = path.join(testDir, 'base')
      const targetDir = path.join(testDir, 'target')

      fs.mkdirSync(baseDir, { recursive: true })
      fs.mkdirSync(targetDir, { recursive: true })

      // Base has exposed API key (24+ characters)
      fs.writeFileSync(path.join(baseDir, 'config.js'), 'const apiKey = "' + STRIPE_FIXTURE + '"')
      fs.writeFileSync(path.join(targetDir, 'config.js'), 'const apiKey = process.env.API_KEY')

      const code = await runCliWithArgs(['diff', baseDir, targetDir])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('SHIPSAFE RE-AUDIT DIFF & FIX VERIFICATION DOCKET'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('RESOLVED FINDINGS'))
    })

    it('should fail with exit code 1 when target introduces new regressions', async () => {
      const baseDir = path.join(testDir, 'base')
      const targetDir = path.join(testDir, 'target')

      fs.mkdirSync(baseDir, { recursive: true })
      fs.mkdirSync(targetDir, { recursive: true })

      // Base is clean
      fs.writeFileSync(path.join(baseDir, 'app.js'), 'console.log("clean app")')
      // Target introduces eval()
      fs.writeFileSync(path.join(targetDir, 'app.js'), 'eval(req.query.code)')

      const code = await runCliWithArgs(['diff', baseDir, targetDir])
      expect(code).toBe(1)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('REGRESSION DETECTED'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('NEW REGRESSIONS INTRODUCED'))
    })

    it('should output markdown diff when --format=markdown is provided', async () => {
      const baseDir = path.join(testDir, 'base')
      const targetDir = path.join(testDir, 'target')

      fs.mkdirSync(baseDir, { recursive: true })
      fs.mkdirSync(targetDir, { recursive: true })

      fs.writeFileSync(path.join(baseDir, 'config.js'), 'const apiKey = "' + STRIPE_FIXTURE + '"')
      fs.writeFileSync(path.join(targetDir, 'config.js'), 'const apiKey = process.env.API_KEY')

      const code = await runCliWithArgs(['diff', baseDir, targetDir, '--format=markdown'])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('# ShipSafe Re-Audit Diff & Fix Verification'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('### ✅ Resolved Findings'))
    })
  })

  describe('AI Agent Remediation Prompt Generation (--agent)', () => {
    it('should generate agent remediation prompt in text docket when --agent=cursor is provided', async () => {
      fs.writeFileSync(path.join(testDir, 'vulnerable.js'), 'const token = "ghp_123456789012345678901234567890123456"')
      const code = await runCliWithArgs(['scan', testDir, '--agent=cursor'])
      expect(code).toBe(1)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Agent (cursor) :'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('[Cursor Prompt]'))
    })

    it('should format agent prompt for Claude Code in markdown output', async () => {
      fs.writeFileSync(path.join(testDir, 'vulnerable.js'), 'eval(input)')
      const code = await runCliWithArgs(['scan', testDir, '--agent=claude', '--format=markdown'])
      expect(code).toBe(1)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('> **CLAUDE REMEDIATION PROMPT**:'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('/audit-fix'))
    })

    it('should render 1-click remediation prompt box in text docket', async () => {
      fs.writeFileSync(path.join(testDir, 'vulnerable.js'), 'const key = "' + STRIPE_FIXTURE + '"')
      const code = await runCliWithArgs(['scan', testDir, '--agent=cursor'])
      expect(code).toBe(1)
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('[PROMPT // 1-CLICK REMEDIATION FOR CURSOR]'))
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('/* @security-fix:'))
    })

    it('should include remediationPrompt and account in JSON output', async () => {
      fs.writeFileSync(path.join(testDir, 'vulnerable.js'), 'const key = "' + STRIPE_FIXTURE + '"')
      await runCliWithArgs(['scan', testDir, '--format=json'])
      const jsonCall = mockLog.mock.calls.find((call: unknown[]) => {
        try {
          const parsed = JSON.parse(call[0] as string)
          return parsed && Array.isArray(parsed.findings)
        } catch {
          return false
        }
      })
      expect(jsonCall).toBeDefined()
      const parsed = JSON.parse(jsonCall![0] as string)
      expect(parsed.findings[0]).toHaveProperty('remediationPrompt')
      expect(parsed.findings[0].remediationPrompt).toContain('@security-fix:')
      expect(parsed).toHaveProperty('account')
    })
  })

  describe('Live Account Quota Synchronization & Exhaustion Barrier', () => {
    it('should display quota exceeded alert and exit 1 when backend returns 429', async () => {
      fs.writeFileSync(path.join(testDir, 'clean.js'), 'console.log("clean");')
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 429,
        ok: false,
        json: async () => ({
          error: {
            code: 'quota_exhausted',
            message: 'Monthly audit quota exhausted. Upgrade your tier at https://shipsafe.lankdev.my.id/console',
            used: 3,
            limit: 3,
          },
        }),
      } as any)

      try {
        const code = await runCliWithArgs(['scan', testDir])
        expect(code).toBe(1)
        expect(mockError).toHaveBeenCalledWith(
          expect.stringContaining('[SHIPSAFE QUOTA EXCEEDED] Monthly limit reached (3/3)')
        )
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should update docket with live tier and quota when backend responds 200', async () => {
      fs.writeFileSync(path.join(testDir, 'clean.js'), 'console.log("clean");')
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          success: true,
          user: { email: 'developer@shipsafe.dev', tier: 'pro' },
          quota: { tier: 'pro', used: 12, limit: 50, remaining: 38 },
        }),
      } as any)

      try {
        const code = await runCliWithArgs(['scan', testDir])
        expect(code).toBe(0)
        expect(mockLog).toHaveBeenCalledWith(
          expect.stringContaining('developer@shipsafe.dev [PRO TIER] | Quota: 12/50 (38 remaining)')
        )
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should display anonymous local scan notice when unauthenticated', async () => {
      delete process.env.SHIPSAFE_TOKEN
      fs.writeFileSync(path.join(testDir, 'clean.js'), 'console.log("clean");')
      const code = await runCliWithArgs(['scan', testDir])
      expect(code).toBe(0)
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining("Anonymous Local Scan (Run 'shipsafe login --token=<token>' to sync quota)")
      )
    })
  })
})