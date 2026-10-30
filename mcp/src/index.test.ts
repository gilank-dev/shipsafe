const STRIPE_FIXTURE = 'sk_live_' + '1'.repeat(24);
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  handleRequest,
  scanDirectory,
  generateRemediationPrompt,
  readStoredCredentials,
  getCredentialsPath
} from './index'

describe('ShipSafe MCP Server - Tools & Protocol Handlers', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipsafe-mcp-test-'))
  })

  const originalFetch = globalThis.fetch

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
    globalThis.fetch = originalFetch
    delete process.env.SHIPSAFE_TOKEN
    delete process.env.SHIPSAFE_API_URL
    delete process.env.SHIPSAFE_CONFIG_DIR
    vi.restoreAllMocks()
  })

  it('handles "initialize" handshake properly', () => {
    const res = handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    })

    expect(res).toBeDefined()
    expect(res?.result.serverInfo.name).toBe('shipsafe-mcp-server')
    expect(res?.result.capabilities.tools).toBeDefined()
  })

  it('lists 4 registered MCP security tools via "tools/list"', () => {
    const res = handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    })

    expect(res?.result.tools).toHaveLength(4)
    const toolNames = res?.result.tools.map((t: any) => t.name)
    expect(toolNames).toContain('audit_codebase')
    expect(toolNames).toContain('get_threat_matrix')
    expect(toolNames).toContain('get_remediation_prompt')
    expect(toolNames).toContain('verify_fix')
  })

  it('executes "get_threat_matrix" tool successfully', () => {
    const res = handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_threat_matrix',
        arguments: {},
      },
    })

    expect(res?.result.content).toBeDefined()
    const parsed = JSON.parse(res?.result.content[0].text)
    expect(parsed.threatMatrix).toHaveLength(10)
    expect(parsed.threatMatrix[0]).toHaveProperty('key')
    expect(parsed.threatMatrix[0]).toHaveProperty('name')
  })

  it('generates agent remediation prompt via "get_remediation_prompt"', () => {
    const res = handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_remediation_prompt',
        arguments: {
          findingId: 'F-SEC-001',
          filePath: 'src/config.ts',
          agent: 'Cursor',
        },
      },
    })

    expect(res?.result.content[0].text).toContain('ShipSafe Remediation Prompt for Cursor')
    expect(res?.result.content[0].text).toContain('src/config.ts')
  })

  it('audits directory and identifies vulnerabilities via "audit_codebase"', () => {
    fs.writeFileSync(
      path.join(tempDir, 'db.ts'),
      'const query = `SELECT * FROM users WHERE id = ${req.body.id}`;'
    )

    const res = handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'audit_codebase',
        arguments: {
          path: tempDir,
        },
      },
    })

    expect(res?.result.content).toBeDefined()
    const report = JSON.parse(res?.result.content[0].text)
    expect(report.findingsCount).toBeGreaterThanOrEqual(1)
    expect(report.verdict).toContain('WARNING')
  })

  it('verifies resolved fixes via "verify_fix"', () => {
    const filePath = path.join(tempDir, 'clean.ts')
    fs.writeFileSync(filePath, 'const a = 1 + 2;')

    const res = handleRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'verify_fix',
        arguments: {
          filePath,
        },
      },
    })

    const verification = JSON.parse(res?.result.content[0].text)
    expect(verification.status).toBe('RESOLVED')
  })

  it('detects unresolved vulnerabilities via "verify_fix"', () => {
    const filePath = path.join(tempDir, 'still_vuln.ts')
    fs.writeFileSync(filePath, 'eval("alert(1)");')

    const res = handleRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'verify_fix',
        arguments: {
          filePath,
        },
      },
    })

    const verification = JSON.parse(res?.result.content[0].text)
    expect(verification.status).toBe('STILL_VULNERABLE')
  })

  it('verifies directory fix diffs via "verify_fix" baseDir vs fixedDir', () => {
    const baseDir = path.join(tempDir, 'base')
    const fixedDir = path.join(tempDir, 'fixed')
    fs.mkdirSync(baseDir, { recursive: true })
    fs.mkdirSync(fixedDir, { recursive: true })

    fs.writeFileSync(path.join(baseDir, 'app.ts'), 'const key = "' + STRIPE_FIXTURE + '";')
    fs.writeFileSync(path.join(fixedDir, 'app.ts'), 'const key = process.env.STRIPE_KEY;')

    const res = handleRequest({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'verify_fix',
        arguments: {
          baseDir,
          fixedDir,
        },
      },
    })

    expect(res?.result.content).toBeDefined()
    const diff = JSON.parse(res?.result.content[0].text)
    expect(diff.mode).toBe('directory_diff')
    expect(diff.status).toBe('ALL_RESOLVED')
    expect(diff.resolvedCount).toBeGreaterThanOrEqual(1)
  })

  it('generates agent-tailored remediation prompts for Claude Code, Copilot, and Windsurf', () => {
    // Claude Code
    const resClaude = handleRequest({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'get_remediation_prompt',
        arguments: {
          findingId: 'F-SEC-001',
          filePath: 'src/api.ts',
          targetAgent: 'ClaudeCode',
        },
      },
    })
    expect(resClaude?.result.content[0].text).toContain('/audit-fix')
    expect(resClaude?.result.content[0].text).toContain('Claude Code')

    // GitHub Copilot
    const resCopilot = handleRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'get_remediation_prompt',
        arguments: {
          findingId: 'F-CODE-002',
          filePath: 'src/db.ts',
          targetAgent: 'Copilot',
        },
      },
    })
    expect(resCopilot?.result.content[0].text).toContain('Copilot')

    // Windsurf
    const resWindsurf = handleRequest({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'get_remediation_prompt',
        arguments: {
          findingId: 'F-CODE-005',
          filePath: 'src/eval.ts',
          targetAgent: 'Windsurf',
        },
      },
    })
    expect(resWindsurf?.result.content[0].text).toContain('Windsurf')
    expect(resWindsurf?.result.content[0].text).toContain('[Cascade]')
  })

  describe('Error handling & parameter validation', () => {
    it('returns error code -32601 for unknown tool name', () => {
      const res = handleRequest({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'non_existent_tool',
          arguments: {},
        },
      })

      expect(res?.error).toBeDefined()
      expect(res?.error?.code).toBe(-32601)
      expect(res?.error?.message).toContain("Method 'non_existent_tool' not found")
    })

    it('returns error code -32602 for missing findingId in "get_remediation_prompt"', () => {
      const res = handleRequest({
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'get_remediation_prompt',
          arguments: {
            filePath: 'src/test.ts',
          },
        },
      })

      expect(res?.error).toBeDefined()
      expect(res?.error?.code).toBe(-32602)
      expect(res?.error?.message).toContain("'findingId' is required")
    })

    it('returns error code -32602 for missing filePath in "verify_fix"', () => {
      const res = handleRequest({
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'verify_fix',
          arguments: {},
        },
      })

      expect(res?.error).toBeDefined()
      expect(res?.error?.code).toBe(-32602)
      expect(res?.error?.message).toContain("'filePath'")
    })

    it('returns error code -32602 for invalid directory path in "audit_codebase"', () => {
      const res = handleRequest({
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: path.join(tempDir, 'does-not-exist'),
          },
        },
      })

      expect(res?.error).toBeDefined()
      expect(res?.error?.code).toBe(-32602)
      expect(res?.error?.message).toContain('Invalid path')
    })

    it('returns error code -32602 for invalid file path in "verify_fix"', () => {
      const res = handleRequest({
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/call',
        params: {
          name: 'verify_fix',
          arguments: {
            filePath: path.join(tempDir, 'missing.ts'),
          },
        },
      })

      expect(res?.error).toBeDefined()
      expect(res?.error?.code).toBe(-32602)
      expect(res?.error?.message).toContain('Invalid path')
    })
  })

  describe('Account Quota & AI Remediation Prompt Integration', () => {
    it('generates rich 1-Click AI remediation prompts directly in audit_codebase findings', () => {
      fs.writeFileSync(
        path.join(tempDir, 'vuln.ts'),
        'const token = "' + STRIPE_FIXTURE + '";\neval("foo");'
      )

      // Test with Cursor format
      const resCursor = handleRequest({
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir,
            targetAgent: 'Cursor'
          }
        }
      }) as any

      expect(resCursor?.result?.content).toBeDefined()
      const dataCursor = JSON.parse(resCursor.result.content[0].text)
      expect(dataCursor.findings.length).toBeGreaterThanOrEqual(1)
      const fCursor = dataCursor.findings[0]
      expect(fCursor.remediationPrompt).toContain('@security-fix:')
      expect(fCursor.remediationPrompt).toContain('TARGET: @')
      expect(fCursor.remediationPrompt).toContain('REMEDIATION DIRECTIVE:')

      // Test with Claude Code format
      const resClaude = handleRequest({
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir,
            targetAgent: 'ClaudeCode'
          }
        }
      }) as any

      const dataClaude = JSON.parse(resClaude.result.content[0].text)
      const fClaude = dataClaude.findings[0]
      expect(fClaude.remediationPrompt).toContain('Task: Fix security vulnerability')
      expect(fClaude.remediationPrompt).toContain('Execution Protocol:')

      // Test with Copilot format
      const resCopilot = handleRequest({
        jsonrpc: '2.0',
        id: 22,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir,
            targetAgent: 'Copilot'
          }
        }
      }) as any

      const dataCopilot = JSON.parse(resCopilot.result.content[0].text)
      const fCopilot = dataCopilot.findings[0]
      expect(fCopilot.remediationPrompt).toContain('// SECURITY FIX:')

      // Test with Windsurf format
      const resWindsurf = handleRequest({
        jsonrpc: '2.0',
        id: 23,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir,
            targetAgent: 'Windsurf'
          }
        }
      }) as any

      const dataWindsurf = JSON.parse(resWindsurf.result.content[0].text)
      const fWindsurf = dataWindsurf.findings[0]
      expect(fWindsurf.remediationPrompt).toContain('[ShipSafe Cascade Task]')
    })

    it('returns unauthenticated account status when no token is configured', () => {
      const res = handleRequest({
        jsonrpc: '2.0',
        id: 24,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir
          }
        }
      }) as any

      expect(res?.result?.content).toBeDefined()
      const data = JSON.parse(res.result.content[0].text)
      expect(data.account).toBeDefined()
      expect(data.account.status).toBe('unauthenticated')
      expect(data.account.note).toContain('Unauthenticated local scan')
    })

    it('syncs scan usage and quota with backend when token is present', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'recorded',
          user: { id: 'usr-123', email: 'mcp-tester@shipsafe.dev', tier: 'PRO' },
          quota: { tier: 'PRO', used: 14, limit: 100, remaining: 86 }
        })
      } as any)

      const res = (await handleRequest({
        jsonrpc: '2.0',
        id: 25,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir,
            token: 'sk_shipsafe_pro_token_123'
          }
        }
      })) as any

      expect(res?.result?.content).toBeDefined()
      const data = JSON.parse(res.result.content[0].text)
      expect(data.account.status).toBe('authenticated')
      expect(data.account.email).toBe('mcp-tester@shipsafe.dev')
      expect(data.account.tier).toBe('PRO')
      expect(data.account.quota.remaining).toBe(86)
      expect(data.account.quota.limit).toBe(100)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cli/record-scan'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk_shipsafe_pro_token_123'
          })
        })
      )
    })

    it('returns JSON-RPC error code -32000 when quota is exhausted (HTTP 429)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 'quota_exhausted',
            message: 'Monthly scan quota limit reached for FREE tier (10 audits). Upgrade your plan.',
            used: 10,
            limit: 10
          }
        })
      } as any)

      const res = (await handleRequest({
        jsonrpc: '2.0',
        id: 26,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir,
            token: 'sk_shipsafe_free_exhausted'
          }
        }
      })) as any

      expect(res?.error).toBeDefined()
      expect(res.error.code).toBe(-32000)
      expect(res.error.message).toContain('ShipSafe Quota Exceeded:')
      expect(res.error.message).toContain('Monthly scan quota limit reached')
      expect(res.error.data.code).toBe('quota_exhausted')
    })

    it('handles offline backend network failures gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:23010'))

      const res = (await handleRequest({
        jsonrpc: '2.0',
        id: 27,
        method: 'tools/call',
        params: {
          name: 'audit_codebase',
          arguments: {
            path: tempDir,
            token: 'sk_shipsafe_valid_token'
          }
        }
      })) as any

      expect(res?.result?.content).toBeDefined()
      const data = JSON.parse(res.result.content[0].text)
      expect(data.account.status).toBe('offline_authenticated')
      expect(data.account.note).toContain('offline')
    })

    it('reads credentials from custom SHIPSAFE_CONFIG_DIR', () => {
      const configDir = path.join(tempDir, 'custom_config')
      fs.mkdirSync(configDir, { recursive: true })
      const credsFile = path.join(configDir, 'credentials.json')
      fs.writeFileSync(
        credsFile,
        JSON.stringify({
          token: 'sk_shipsafe_stored_disk_token',
          email: 'stored-disk@shipsafe.dev',
          apiUrl: 'http://localhost:23010'
        })
      )

      process.env.SHIPSAFE_CONFIG_DIR = configDir

      expect(getCredentialsPath()).toBe(credsFile)
      const creds = readStoredCredentials()
      expect(creds).toBeDefined()
      expect(creds?.token).toBe('sk_shipsafe_stored_disk_token')
      expect(creds?.email).toBe('stored-disk@shipsafe.dev')
    })
  })
})
