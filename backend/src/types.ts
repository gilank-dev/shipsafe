export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type Area = "Secrets" | "Dependencies" | "HTTP" | "Code";
export type AgentTarget = "Generic" | "Cursor" | "ClaudeCode" | "Copilot" | "Windsurf";

export type ThreatKey =
  | 'sqli'
  | 'xss'
  | 'ddos'
  | 'brute_force'
  | 'malware_shell'
  | 'mitm'
  | 'phishing'
  | 'deface'
  | 'lfi_rfi'
  | 'zero_day';

export interface ThreatCheck {
  key: ThreatKey;
  name: string;
  category: string;
  status: 'Secure' | 'Warning' | 'Vulnerable' | 'Not Assessed';
  findingsCount: number;
  summary: string;
  mitigationTip: string;
}

export interface FindingLocation {
  file: string;
  line?: number;
  snippet?: string;
}

export interface Finding {
  id: string;                 // F-001, F-002...
  title: string;
  severity: Severity;
  area: Area;
  threatCategory?: ThreatKey; // 10 major threat vectors
  location?: FindingLocation; // Real path + line; never fabricated
  what: string;
  why: string;
  recommendedFix: string;
  verifyWith?: string;
  remediationPrompt: string;  // Self-contained tailored prompt
  confidence?: "Confirmed" | "Likely, verify" | "Not enough information";
}

export interface ScorecardRow {
  area: Area;
  score: number | null; // 0-10 or null if not assessed
  status: string;       // e.g. "Pass", "Partial", "Action Required", "Not Assessed"
  topConcern: string;
}

export interface AuditReport {
  id?: string;
  summary: string;
  countsBySeverity: Record<Severity, number>;
  scorecard: ScorecardRow[];
  threatMatrix: ThreatCheck[]; // The 10 explicit threat evaluations
  findings: Finding[];
  secretsToRotate: string[]; // Always masked: first 4 chars + ****
  notAssessed: string[];
  skippedFiles: string[];
  createdAt?: string;
  aiEnhanced?: boolean;
  aiInsights?: string;
}

export interface AuditContext {
  description?: string;
  deployTarget?: string;
  handlesPII?: boolean;
  handlesPayments?: boolean;
}
