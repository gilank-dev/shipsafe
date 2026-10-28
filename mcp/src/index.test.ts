import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { handleRequest } from './index'

describe('ShipSafe MCP Server - Tools & Protocol Handlers', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipsafe-mcp-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
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
})
