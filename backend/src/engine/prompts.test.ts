import { describe, it, expect } from 'vitest';
import { generateRemediationPrompt, estimateTokenCount, TOKEN_BUDGET_BY_TARGET } from './prompts';
import type { Finding, AgentTarget } from '../types';

describe('AI Prompt Token Budgeting Suite', () => {
  const sampleFinding: Finding = {
    id: 'F-001',
    title: 'Hardcoded Supabase Service Role Key Detected',
    severity: 'Critical',
    area: 'Secrets',
    threatCategory: 'mitm',
    location: {
      file: 'src/lib/supabase-client.ts',
      line: 42,
      snippet: 'const client = createClient(URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");',
    },
    what: 'A raw administrative service role secret key is embedded directly into source code.',
    why: 'Attackers can bypass Row Level Security (RLS) and exfiltrate or delete all database records.',
    recommendedFix: 'Move the key into environment variables (process.env.SUPABASE_SERVICE_ROLE_KEY) and access server-side only.',
    verifyWith: 'grep -r "eyJhbG" src/',
    confidence: 'Certain',
  };

  const targets: AgentTarget[] = ['Cursor', 'ClaudeCode', 'Copilot', 'Windsurf', 'Generic'];

  it.each(targets)('generates valid prompt within token budget for %s', (target) => {
    const prompt = generateRemediationPrompt(sampleFinding, target);
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('F-001');
    expect(prompt).toContain('src/lib/supabase-client.ts');
    expect(prompt).toContain('grep -r');

    const tokenCount = estimateTokenCount(prompt);
    const maxBudget = TOKEN_BUDGET_BY_TARGET[target];

    expect(tokenCount).toBeLessThanOrEqual(maxBudget);
  });

  it('bounds large code snippets to prevent blowing prompt context', () => {
    // Generate a huge 100-line snippet
    const hugeSnippet = Array.from({ length: 100 }, (_, i) => `const variable_${i} = doSomethingHuge(${i});`).join('\n');

    const findingWithHugeSnippet: Finding = {
      ...sampleFinding,
      location: {
        file: 'src/large-bundle.ts',
        line: 10,
        snippet: hugeSnippet,
      },
    };

    for (const target of targets) {
      const prompt = generateRemediationPrompt(findingWithHugeSnippet, target);
      const tokenCount = estimateTokenCount(prompt);

      expect(prompt).toContain('truncated for token budget');
      expect(tokenCount).toBeLessThanOrEqual(TOKEN_BUDGET_BY_TARGET[target] + 50);
    }
  });

  it('ensures Copilot prompt contains only valid comment lines without unescaped code blocks', () => {
    const prompt = generateRemediationPrompt(sampleFinding, 'Copilot');
    const lines = prompt.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      expect(line.startsWith('//')).toBe(true);
    }
    // Copilot should be compact (<= 180 tokens)
    expect(estimateTokenCount(prompt)).toBeLessThanOrEqual(180);
  });

  it('handles findings without location or snippet gracefully', () => {
    const findingNoLoc: Finding = {
      id: 'F-002',
      title: 'Missing Content Security Policy Header',
      severity: 'Medium',
      area: 'HTTP',
      what: 'CSP header not set in response.',
      why: 'Permits XSS and clickjacking.',
      recommendedFix: 'Configure helmet or CSP middleware.',
      confidence: 'Likely',
    };

    for (const target of targets) {
      const prompt = generateRemediationPrompt(findingNoLoc, target);
      expect(prompt).toContain('Location not determined');
      expect(estimateTokenCount(prompt)).toBeLessThan(TOKEN_BUDGET_BY_TARGET[target]);
    }
  });
});
