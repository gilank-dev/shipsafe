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
});
