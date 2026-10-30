#!/usr/bin/env node
/**
 * ShipSafe Pre-Commit Hook Installer
 *
 * Usage:
 *   node scripts/install-hook.js           # Install hook (interactive)
 *   node scripts/install-hook.js --install # Install non-interactively
 *   node scripts/install-hook.js --uninstall # Remove hook
 *   node scripts/install-hook.js --dry-run  # Show what would be done
 *
 * This script installs a pre-commit hook that runs ShipSafe scan on staged files.
 * It respects .gitignore and uses --fail-on=high by default.
 */

const { readFileSync, writeFileSync, existsSync, chmodSync, mkdirSync } = require('node:fs');
const { join, resolve, dirname } = require('node:path');
const { execSync } = require('node:child_process');
const readline = require('node:readline');

const HOOK_NAME = 'shipsafe-pre-commit';
const HOOK_MARKER_START = `# >>> ${HOOK_NAME} >>>`;
const HOOK_MARKER_END = `# <<< ${HOOK_NAME} <<<`;

const HOOK_TEMPLATE = `#!/bin/sh
# >>> ${HOOK_NAME} >>>
# ShipSafe pre-commit hook - auto-generated
# Run: npx --prefix <repo-root>/cli shipsafe scan . --fail-on=high
# To uninstall: node <repo-root>/cli/scripts/install-hook.js --uninstall

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CLI_DIR="\${REPO_ROOT}/cli"

if [ ! -f "\${CLI_DIR}/dist/index.js" ]; then
  echo "[ShipSafe] Building CLI..."
  (cd "\${CLI_DIR}" && npm run build --silent) || {
    echo "[ShipSafe] Build failed, skipping scan"
    exit 0
  }
fi

echo "[ShipSafe] Scanning staged changes..."
node "\${CLI_DIR}/dist/index.js" scan "\${REPO_ROOT}" --fail-on=high --format=text
SCAN_EXIT=$?

if [ \${SCAN_EXIT} -eq 2 ]; then
  echo "[ShipSafe] Runtime error during scan"
  exit 1
elif [ \${SCAN_EXIT} -eq 1 ]; then
  echo "[ShipSafe] Commit blocked: vulnerabilities found at HIGH severity or above"
  echo "[ShipSafe] Run 'node \${CLI_DIR}/dist/index.js scan . --format=text' for details"
  exit 1
fi

echo "[ShipSafe] Scan passed"
# <<< ${HOOK_NAME} <<<
`;

function findGitRoot(startDir = process.cwd()) {
  try {
    const root = execSync('git rev-parse --show-toplevel', { cwd: startDir, encoding: 'utf8' }).trim();
    if (root && existsSync(root)) {
      return root;
    }
  } catch {
    // fallback traversal
  }

  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function getHookPath(gitRoot) {
  try {
    const gitHooksDir = execSync('git rev-parse --git-path hooks', { cwd: gitRoot, encoding: 'utf8' }).trim();
    if (gitHooksDir) {
      return resolve(gitRoot, gitHooksDir, 'pre-commit');
    }
  } catch {
    // fallback
  }
  return join(gitRoot, '.git', 'hooks', 'pre-commit');
}

function installHook(gitRoot, dryRun = false) {
  const hookPath = getHookPath(gitRoot);
  let currentContent = '';

  if (existsSync(hookPath)) {
    currentContent = readFileSync(hookPath, 'utf8');
  }

  if (currentContent.includes(HOOK_MARKER_START)) {
    console.log('[ShipSafe] Hook already installed at:', hookPath);
    return false;
  }

  const newContent = currentContent
    ? `${currentContent.trimEnd()}\n\n${HOOK_TEMPLATE}\n`
    : `${HOOK_TEMPLATE}\n`;

  if (dryRun) {
    console.log('[ShipSafe] DRY RUN - Would write to:', hookPath);
    console.log('---');
    console.log(newContent);
    console.log('---');
    return true;
  }

  const hookDir = dirname(hookPath);
  if (!existsSync(hookDir)) {
    mkdirSync(hookDir, { recursive: true });
  }

  writeFileSync(hookPath, newContent, { mode: 0o755 });
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    // Ignored on platforms like Windows without posix permissions
  }
  console.log('[ShipSafe] Pre-commit hook installed at:', hookPath);
  return true;
}

function uninstallHook(gitRoot, dryRun = false) {
  const hookPath = getHookPath(gitRoot);

  if (!existsSync(hookPath)) {
    console.log('[ShipSafe] No pre-commit hook found at:', hookPath);
    return false;
  }

  const content = readFileSync(hookPath, 'utf8');
  const startIdx = content.indexOf(HOOK_MARKER_START);
  const endIdx = content.indexOf(HOOK_MARKER_END);

  if (startIdx === -1 || endIdx === -1) {
    console.log('[ShipSafe] Hook marker not found, manual removal may be needed');
    return false;
  }

  const endMarkerEnd = content.indexOf('\n', endIdx) + 1;
  const newContent = content.slice(0, startIdx) + content.slice(endMarkerEnd);

  if (dryRun) {
    console.log('[ShipSafe] DRY RUN - Would remove hook from:', hookPath);
    return true;
  }

  writeFileSync(hookPath, newContent.trimEnd() + '\n', { mode: 0o755 });
  console.log('[ShipSafe] Pre-commit hook removed from:', hookPath);
  return true;
}

function showHelp() {
  console.log(`
ShipSafe Pre-Commit Hook Installer

Usage:
  node scripts/install-hook.js [options]

Options:
  --install      Install hook non-interactively
  --uninstall    Remove ShipSafe hook
  --dry-run      Show what would be done without making changes
  --help         Show this help

Examples:
  # Interactive install (prompts for confirmation)
  node scripts/install-hook.js

  # Non-interactive install (CI/CD friendly)
  node scripts/install-hook.js --install

  # Preview changes
  node scripts/install-hook.js --dry-run

  # Remove hook
  node scripts/install-hook.js --uninstall

The hook runs: shipsafe scan . --fail-on=high --format=text
Exit codes: 0=pass, 1=block commit, 2=error
`);
}

function main() {
  const args = process.argv.slice(2);
  const install = args.includes('--install');
  const uninstall = args.includes('--uninstall');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help');

  if (help) {
    showHelp();
    process.exit(0);
  }

  const gitRoot = findGitRoot();
  if (!gitRoot) {
    console.error('[ShipSafe] Error: Not inside a Git repository');
    process.exit(1);
  }

  const cliDir = join(gitRoot, 'cli');
  if (!existsSync(join(cliDir, 'package.json'))) {
    console.error('[ShipSafe] Error: cli/ directory not found at repo root');
    console.error('[ShipSafe] Run this script from the repository root or ensure cli/ exists');
    process.exit(1);
  }

  if (uninstall) {
    uninstallHook(gitRoot, dryRun);
    return;
  }

  if (dryRun) {
    installHook(gitRoot, true);
    return;
  }

  if (install) {
    installHook(gitRoot, false);
    return;
  }

  // Interactive mode
  console.log('[ShipSafe] Pre-commit hook installer');
  console.log(`[ShipSafe] Repository root: ${gitRoot}`);
  console.log(`[ShipSafe] CLI directory: ${cliDir}`);
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('Install ShipSafe pre-commit hook? [Y/n] ', (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('[ShipSafe] Installation cancelled');
      return;
    }
    installHook(gitRoot, false);
  });
}

main();
