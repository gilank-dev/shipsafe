import { describe, it, expect } from 'vitest';
import { runStaticSecurityAudit } from './rules-scanner';
import { FilteredProjectFiles } from '../security/file-filter';

describe('runStaticSecurityAudit - Static Rule Engine', () => {
  function makeMockFiles(securityFiles: Array<{ relativePath: string; content: string }>): FilteredProjectFiles {
    return {
      securityFiles: securityFiles.map((f) => ({ ...f, size: f.content.length })),
      skippedFiles: [],
      manifests: [],
      envFiles: [],
      configs: [],
      serverHardeningFiles: [],
      codeFiles: []
    };
  }

  it('detects JavaScript SQL injection via template literals', () => {
    const files = makeMockFiles([
      {
        relativePath: 'src/routes/users.ts',
        content: `
          app.get('/user', async (req, res) => {
            const query = \`SELECT * FROM users WHERE id = \${req.query.id}\`;
            const result = await db.query(query);
            res.json(result);
          });
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const sqli = result.findings.find((f) => f.threatCategory === 'sqli');
    expect(sqli).toBeDefined();
    expect(sqli?.severity).toBe('Critical');
    expect(sqli?.location.file).toBe('src/routes/users.ts');
  });

  it('detects Python raw SQL execution via f-strings and raw()', () => {
    const files = makeMockFiles([
      {
        relativePath: 'backend/views.py',
        content: `
          def get_user(request):
              user_id = request.GET.get('id')
              cursor.execute(f"SELECT * FROM accounts WHERE id = {user_id}")
              return JsonResponse(cursor.fetchall())
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const sqli = result.findings.find((f) => f.threatCategory === 'sqli');
    expect(sqli).toBeDefined();
    expect(sqli?.severity).toBe('Critical');
    expect(sqli?.location.file).toBe('backend/views.py');
  });

  it('detects Python insecure deserialization via pickle.loads', () => {
    const files = makeMockFiles([
      {
        relativePath: 'app/api/session.py',
        content: `
          import pickle
          def restore_session(payload):
              data = pickle.loads(payload)
              return data
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const deserialization = result.findings.find(
      (f) => f.threatCategory === 'zero_day' && f.title.includes('pickle')
    );
    expect(deserialization).toBeDefined();
    expect(deserialization?.severity).toBe('Critical');
  });

  it('detects Python command injection via subprocess shell=True', () => {
    const files = makeMockFiles([
      {
        relativePath: 'scripts/worker.py',
        content: `
          import subprocess
          def run_job(cmd):
              subprocess.run(cmd, shell=True)
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const cmdInj = result.findings.find((f) => f.threatCategory === 'malware_shell');
    expect(cmdInj).toBeDefined();
    expect(cmdInj?.severity).toBe('Critical');
  });

  it('detects hardcoded secret in Dockerfile ENV layer', () => {
    const files = makeMockFiles([
      {
        relativePath: 'Dockerfile',
        content: `
          FROM node:20-alpine
          WORKDIR /app
          ENV DB_PASSWORD=SuperSecretPass123!
          COPY . .
          CMD ["npm", "start"]
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const dockerSecret = result.findings.find(
      (f) => f.location.file === 'Dockerfile' && f.title.includes('Dockerfile')
    );
    expect(dockerSecret).toBeDefined();
    expect(dockerSecret?.severity).toBe('Critical');
  });

  it('detects dangerous React dangerouslySetInnerHTML without DOMPurify', () => {
    const files = makeMockFiles([
      {
        relativePath: 'src/components/UserProfile.tsx',
        content: `
          export function UserBio({ bio }) {
            return <div dangerouslySetInnerHTML={{ __html: bio }} />;
          }
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const xss = result.findings.find((f) => f.threatCategory === 'xss');
    expect(xss).toBeDefined();
    expect(xss?.severity).toBe('High');
  });

  it('flags missing lockfile when package.json is present without lockfiles', () => {
    const files: FilteredProjectFiles = {
      securityFiles: [
        { relativePath: 'package.json', content: '{"name": "test"}', size: 20 }
      ],
      skippedFiles: [],
      manifests: [
        { type: 'manifest', path: 'package.json', content: '{"name": "test"}' }
      ],
      envFiles: [],
      configs: [],
      serverHardeningFiles: [],
      codeFiles: []
    };

    const result = runStaticSecurityAudit(files, 'Generic');
    const lockfileFinding = result.findings.find((f) => f.title.includes('Lockfile'));
    expect(lockfileFinding).toBeDefined();
  });

  it('does NOT falsely flag React Router frontend routes as a missing backend rate limiter', () => {
    const files = makeMockFiles([
      {
        relativePath: 'src/routes/Home.tsx',
        content: `
          import { Link } from 'react-router-dom';
          export default function Home() {
            return <div><h1>Welcome Home</h1><Link to="/about">About</Link></div>;
          }
        `
      },
      {
        relativePath: 'src/routes/About.tsx',
        content: `
          export default function About() {
            return <div><h1>About Us</h1></div>;
          }
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const rateLimitFinding = result.findings.find((f) => f.title.includes('Rate Limiting'));
    expect(rateLimitFinding).toBeUndefined();
  });

  it('does NOT falsely flag standard body-parser property logging or localhost API calls', () => {
    const files = makeMockFiles([
      {
        relativePath: 'src/controllers/order.ts',
        content: `
          app.post('/api/order', (req, res) => {
            console.log('Received order with item ID:', req.body.itemId);
            console.info('Order status is now:', req.body.status);
            const clientEndpoint = 'http://localhost:3000/api/v1/health';
            res.json({ ok: true });
          });
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const sensitiveLog = result.findings.find((f) => f.title.includes('Sensitive Data Printed'));
    expect(sensitiveLog).toBeUndefined();

    const plaintextHttp = result.findings.find((f) => f.title.includes('Plaintext HTTP'));
    expect(plaintextHttp).toBeUndefined();
  });

  it('does NOT falsely flag Python static URL requests as SSRF, but DOES flag user-controlled URLs', () => {
    const files = makeMockFiles([
      {
        relativePath: 'backend/services.py',
        content: `
          import requests
          def fetch_static_metadata():
              return requests.get("https://api.github.com/meta").json()

          def fetch_user_proxy(request):
              user_url = request.GET.get('url')
              return requests.get(user_url).text
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const ssrfFindings = result.findings.filter((f) => f.title.includes('SSRF'));
    // Should flag the dynamic user_url call, but not the static https://api.github.com/meta call
    expect(ssrfFindings.length).toBe(1);
    expect(ssrfFindings[0].threatCategory).toBe('lfi_rfi');
    expect(ssrfFindings[0].location.line).toBe(8);
  });

  it('flags FastAPI wildcard CORS only on the declaration line without duplicates', () => {
    const files = makeMockFiles([
      {
        relativePath: 'backend/main.py',
        content: `
          from fastapi import FastAPI
          from fastapi.middleware.cors import CORSMiddleware
          app = FastAPI()
          app.add_middleware(
              CORSMiddleware,
              allow_origins=["*"],
              allow_credentials=True
          )
          # Line 10
          # Line 11
          # Line 12
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    const corsFindings = result.findings.filter((f) => f.title.includes('FastAPI'));
    expect(corsFindings.length).toBe(1);
    expect(corsFindings[0].location.line).toBe(7);
  });

  it('audits and detects remaining threat vectors: Brute Force, Open Redirect, Defacement, LFI, and Prototype Pollution', () => {
    const files = makeMockFiles([
      {
        relativePath: 'src/server.ts',
        content: `
          import express from 'express';
          const app = express();

          // Threat 4: Brute force timing flaw
          function verifyLoginPassword(req, storedPass) {
            return req.body.password === storedPass;
          }

          // Threat 7: Open redirect
          app.get('/login', (req, res) => {
            res.redirect(req.query.returnTo);
          });

          // Threat 8: Webroot defacement risk
          app.post('/api/save-page', (req, res) => {
            fs.writeFileSync('public/index.html', req.body.content);
          });

          // Threat 9: LFI
          app.get('/view-doc', (req, res) => {
            const data = fs.readFileSync(req.query.path);
            res.send(data);
          });

          // Threat 10: Prototype pollution
          app.post('/api/update-profile', (req, res) => {
            const profile = Object.assign({}, req.body);
            res.json(profile);
          });
        `
      }
    ]);

    const result = runStaticSecurityAudit(files, 'Generic');
    expect(result.findings.some((f) => f.threatCategory === 'brute_force')).toBe(true);
    expect(result.findings.some((f) => f.threatCategory === 'phishing')).toBe(true);
    expect(result.findings.some((f) => f.threatCategory === 'deface')).toBe(true);
    expect(result.findings.some((f) => f.threatCategory === 'lfi_rfi')).toBe(true);
    expect(result.findings.some((f) => f.threatCategory === 'zero_day')).toBe(true);

    // Verify all 10 threat matrix items are computed
    expect(result.threatMatrix.length).toBe(10);
    const threatKeys = result.threatMatrix.map((t) => t.key);
    expect(threatKeys).toContain('sqli');
    expect(threatKeys).toContain('xss');
    expect(threatKeys).toContain('ddos');
    expect(threatKeys).toContain('brute_force');
    expect(threatKeys).toContain('malware_shell');
    expect(threatKeys).toContain('mitm');
    expect(threatKeys).toContain('phishing');
    expect(threatKeys).toContain('deface');
    expect(threatKeys).toContain('lfi_rfi');
    expect(threatKeys).toContain('zero_day');
  });
});
