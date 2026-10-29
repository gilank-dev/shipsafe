// OWASP Top 10 (2021) + CWE mapping for ShipSafe findings
// Mirrors backend/src/engine/owasp-map.ts for frontend usage

import type { Finding, ThreatKey } from './types';

export interface OwaspMapping {
  owaspId: string;          // e.g., "A01:2021"
  owaspName: string;        // e.g., "Broken Access Control"
  cweIds: string[];         // e.g., ["CWE-862"]
  description: string;
}

export interface FindingOwaspInfo {
  findingId: string;
  owaspMappings: OwaspMapping[];
  primaryOwaspId: string;   // Most relevant OWASP category
}

// Official OWASP Top 10 (2021) categories with CWE mappings
export const OWASP_TOP_10_2021: OwaspMapping[] = [
  {
    owaspId: 'A01:2021',
    owaspName: 'Broken Access Control',
    cweIds: ['CWE-284', 'CWE-862', 'CWE-863', 'CWE-285', 'CWE-638'],
    description: 'Users can act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of data.'
  },
  {
    owaspId: 'A02:2021',
    owaspName: 'Cryptographic Failures',
    cweIds: ['CWE-327', 'CWE-326', 'CWE-331', 'CWE-338', 'CWE-798', 'CWE-328'],
    description: 'Failures related to cryptography often lead to sensitive data exposure or system compromise. Previously known as "Sensitive Data Exposure".'
  },
  {
    owaspId: 'A03:2021',
    owaspName: 'Injection',
    cweIds: ['CWE-89', 'CWE-79', 'CWE-74', 'CWE-99', 'CWE-943'],
    description: 'Injection flaws (SQL, NoSQL, OS command, LDAP, etc.) occur when untrusted data is sent to an interpreter as part of a command or query.'
  },
  {
    owaspId: 'A04:2021',
    owaspName: 'Insecure Design',
    cweIds: ['CWE-209', 'CWE-657', 'CWE-799', 'CWE-840'],
    description: 'Missing or ineffective control design. Focuses on design flaws rather than implementation bugs.'
  },
  {
    owaspId: 'A05:2021',
    owaspName: 'Security Misconfiguration',
    cweIds: ['CWE-16', 'CWE-209', 'CWE-1188', 'CWE-611', 'CWE-200'],
    description: 'Missing appropriate security hardening, unnecessary features enabled, default accounts/passwords, verbose error messages.'
  },
  {
    owaspId: 'A06:2021',
    owaspName: 'Vulnerable and Outdated Components',
    cweIds: ['CWE-1104', 'CWE-937', 'CWE-1035'],
    description: 'Using components with known vulnerabilities. Lack of inventory, unsupported software, missing patches.'
  },
  {
    owaspId: 'A07:2021',
    owaspName: 'Identification and Authentication Failures',
    cweIds: ['CWE-287', 'CWE-288', 'CWE-289', 'CWE-304', 'CWE-307'],
    description: 'Authentication failures allowing attackers to compromise passwords, keys, session tokens, or exploit implementation flaws.'
  },
  {
    owaspId: 'A08:2021',
    owaspName: 'Software and Data Integrity Failures',
    cweIds: ['CWE-502', 'CWE-494', 'CWE-829', 'CWE-915'],
    description: 'Code and infrastructure not protected against integrity violations. CI/CD pipeline, auto-update mechanisms, unsigned software.'
  },
  {
    owaspId: 'A09:2021',
    owaspName: 'Security Logging and Monitoring Failures',
    cweIds: ['CWE-778', 'CWE-117', 'CWE-223', 'CWE-532', 'CWE-778'],
    description: 'Insufficient logging, detection, monitoring, and active response. Allows attackers to persist, pivot, tamper, extract, or destroy data.'
  },
  {
    owaspId: 'A10:2021',
    owaspName: 'Server-Side Request Forgery (SSRF)',
    cweIds: ['CWE-918'],
    description: 'Fetching remote resources without validating user-supplied URLs. Allows attackers to coerce the application to send crafted requests to unexpected destinations.'
  }
];

// Map ShipSafe ThreatKey to primary OWASP category
export const THREAT_TO_OWASP: Record<ThreatKey, string[]> = {
  sqli: ['A03:2021'],                    // Injection
  xss: ['A03:2021'],                     // Injection (XSS is client-side injection)
  ddos: ['A05:2021'],                    // Security Misconfiguration (missing rate limiting)
  brute_force: ['A07:2021'],             // Identification and Authentication Failures
  malware_shell: ['A08:2021', 'A03:2021'], // Software Integrity Failures + Injection (RCE)
  mitm: ['A02:2021'],                    // Cryptographic Failures (TLS/config)
  phishing: ['A05:2021', 'A01:2021'],    // Security Misconfiguration + Broken Access Control
  deface: ['A05:2021', 'A01:2021'],      // Security Misconfiguration + Broken Access Control
  lfi_rfi: ['A10:2021', 'A01:2021'],     // SSRF + Broken Access Control
  zero_day: ['A08:2021', 'A03:2021'],    // Software Integrity Failures + Injection (dynamic execution)
};

// Map ShipSafe Finding (by area, severity, threatCategory) to OWASP
export function mapFindingToOwasp(finding: Finding): FindingOwaspInfo {
  const threatCategory = finding.threatCategory;
  const primaryOwaspIds = threatCategory ? THREAT_TO_OWASP[threatCategory] : [];
  
  // Additional mapping based on Area and content
  const additionalIds = getAdditionalOwaspIds(finding);
  const allOwaspIds = [...new Set([...primaryOwaspIds, ...additionalIds])];
  
  const owaspMappings = allOwaspIds
    .map(id => OWASP_TOP_10_2021.find(o => o.owaspId === id))
    .filter((o): o is OwaspMapping => o !== undefined);
  
  const primaryOwaspId = owaspMappings.length > 0 && owaspMappings[0] ? owaspMappings[0].owaspId : 'A05:2021';
  
  return {
    findingId: finding.id,
    owaspMappings,
    primaryOwaspId
  };
}

function getAdditionalOwaspIds(finding: Finding): string[] {
  const ids: string[] = [];
  
  // Area-based mapping
  switch (finding.area) {
    case 'Secrets':
      ids.push('A02:2021'); // Cryptographic Failures (exposed secrets)
      break;
    case 'Dependencies':
      ids.push('A06:2021'); // Vulnerable and Outdated Components
      break;
    case 'HTTP':
      if (finding.threatCategory === 'mitm') {
        ids.push('A02:2021'); // Cryptographic Failures
      } else if (finding.threatCategory === 'phishing' || finding.threatCategory === 'deface') {
        ids.push('A05:2021'); // Security Misconfiguration
      } else {
        ids.push('A05:2021'); // Security Misconfiguration
      }
      break;
    case 'Code':
      if (finding.threatCategory === 'zero_day') {
        ids.push('A08:2021'); // Software and Data Integrity Failures
      }
      break;
  }
  
  // Severity-based: Critical findings often indicate fundamental design issues
  if (finding.severity === 'Critical' && finding.area === 'Code') {
    ids.push('A04:2021'); // Insecure Design
  }
  
  return ids;
}

// Map ThreatKey to OWASP categories
export function mapThreatToOwasp(threatKey: ThreatKey): OwaspMapping[] {
  const owaspIds = THREAT_TO_OWASP[threatKey] || ['A05:2021'];
  return owaspIds
    .map(id => OWASP_TOP_10_2021.find(o => o.owaspId === id))
    .filter((o): o is OwaspMapping => o !== undefined);
}

// Calculate OWASP compliance summary
export function calculateOwaspCompliance(findings: Finding[]) {
  const categoryMap = new Map<string, {
    mapping: OwaspMapping;
    findings: Finding[];
    status: 'Pass' | 'Warning' | 'Fail';
  }>();

  // Initialize with all 10 OWASP categories
  OWASP_TOP_10_2021.forEach(cat => {
    categoryMap.set(cat.owaspId, {
      mapping: cat,
      findings: [],
      status: 'Pass'
    });
  });

  // Assign findings to categories
  findings.forEach(finding => {
    const info = mapFindingToOwasp(finding);
    info.owaspMappings.forEach(m => {
      const entry = categoryMap.get(m.owaspId);
      if (entry) {
        entry.findings.push(finding);
      }
    });
  });

  // Evaluate status
  categoryMap.forEach(entry => {
    if (entry.findings.length === 0) {
      entry.status = 'Pass';
    } else {
      const hasCriticalOrHigh = entry.findings.some(f => f.severity === 'Critical' || f.severity === 'High');
      entry.status = hasCriticalOrHigh ? 'Fail' : 'Warning';
    }
  });

  const categories = Array.from(categoryMap.values());
  const passCount = categories.filter(c => c.status === 'Pass').length;
  const warnCount = categories.filter(c => c.status === 'Warning').length;
  const failCount = categories.filter(c => c.status === 'Fail').length;
  const complianceScore = Math.round((passCount / 10) * 100);

  return {
    categories,
    passCount,
    warnCount,
    failCount,
    complianceScore
  };
}
