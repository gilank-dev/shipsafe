import { AuditReport, Finding, AgentTarget, AuditContext } from '../types';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export function getAiConfig(): AiConfig {
  return {
    baseUrl: process.env.AI_BASE_URL || 'https://vps-9router.tail98895b.ts.net/v1',
    apiKey: process.env.AI_API_KEY || 'sk-013ff93e8c768285-81m105-781f0714',
    model: process.env.AI_MODEL || 'hermes-agent',
    timeoutMs: process.env.AI_TIMEOUT_MS ? parseInt(process.env.AI_TIMEOUT_MS, 10) : 4000
  };
}

/**
 * Call the AI Chat Completion API gateway with graceful error handling and timeout.
 * Returns null if the AI service is unreachable, times out, or fails.
 */
export async function callAiCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: { max_tokens?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const config = getAiConfig();
  if (!config.apiKey || !config.baseUrl) {
    return null;
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      model: config.model,
      messages,
      max_tokens: options.max_tokens ?? 250,
      temperature: 0.2
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      console.warn(`[ShipSafe AI Gateway] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const rawText = await response.text();

    // Parse JSON, robustly handling leading whitespace or trailing "data: [DONE]" SSE markers
    const startIdx = rawText.indexOf('{');
    const endIdx = rawText.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      console.warn('[ShipSafe AI Gateway] Invalid JSON payload received');
      return null;
    }

    const jsonStr = rawText.slice(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr);

    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content.trim();
    }

    return null;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
      console.warn(`[ShipSafe AI Gateway] Request timed out after ${timeoutMs}ms (graceful fallback active)`);
    } else {
      console.warn(`[ShipSafe AI Gateway] Request failed: ${err.message || String(err)} (graceful fallback active)`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Enhances an audit report using AI synthesis.
 * Explicitly evaluates the 10 critical web threat vectors:
 * SQLi, XSS, DDoS, Brute Force, Shell/Malware, MitM, Phishing, Deface, LFI/RFI, Zero-Day.
 * If AI is unreachable or fails, cleanly returns the original report without any regression.
 */
export async function enrichReportWithAi(
  report: AuditReport,
  agentTarget: AgentTarget = 'Generic',
  context?: AuditContext
): Promise<AuditReport> {
  // If no findings, AI enhancement is unnecessary
  if (report.findings.length === 0) {
    report.aiEnhanced = false;
    return report;
  }

  try {
    const findingsSummary = report.findings.slice(0, 6).map(f =>
      `- [${f.severity}] ${f.title} (${f.threatCategory || f.area}): ${f.what}`
    ).join('\n');

    const threatSummary = (report.threatMatrix || []).map(t =>
      `• ${t.name}: ${t.status} (${t.findingsCount} findings)`
    ).join('\n');

    const prompt = [
      `Context: Pre-deployment security audit for project ZIP archive.`,
      `Target Agent IDE: ${agentTarget}.`,
      context?.deployTarget ? `Deploy Target: ${context.deployTarget}` : '',
      `Total Findings: ${report.findings.length} (Critical: ${report.countsBySeverity.Critical}, High: ${report.countsBySeverity.High}, Medium: ${report.countsBySeverity.Medium}).`,
      `10-Threat Evaluation Matrix:`,
      threatSummary,
      ``,
      `Top Detected Gaps:`,
      findingsSummary,
      ``,
      `Provide a 2-sentence executive risk assessment and immediate remediation priority for the developer, highlighting any critical vectors among SQLi, XSS, DDoS, Shells, MitM, or LFI.`
    ].filter(Boolean).join('\n');

    const aiResponse = await callAiCompletion([
      {
        role: 'system',
        content: 'You are an elite application security engineer. Provide direct, concise executive security insights covering web threat defense posture. Do not use filler words.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], { max_tokens: 160, timeoutMs: 3500 });

    if (aiResponse) {
      report.aiEnhanced = true;
      report.aiInsights = aiResponse;
      report.summary = `${aiResponse}\n\n[Static Security Engine]: ${report.summary}`;
      console.log('[ShipSafe AI] Successfully enriched audit report with 10-threat AI insights.');
    } else {
      report.aiEnhanced = false;
    }
  } catch (err) {
    console.warn('[ShipSafe AI] Failed to enrich report with AI, falling back to static scanner:', err);
    report.aiEnhanced = false;
  }

  return report;
}
