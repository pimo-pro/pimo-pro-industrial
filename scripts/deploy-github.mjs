/**
 * Publica SPA industrial → github.com/pimo-pro/pimo-pro-industrial (Hostinger via Actions).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const spaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployDir = path.join(spaRoot, '.deploy-spa-push');
const remote = 'https://github.com/pimo-pro/pimo-pro-industrial.git';

const COPY_ITEMS = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.industrial.config.ts',
  'index.html',
  'public',
  'scripts',
  'server',
  'src',
  '.github',
];

function run(cmd, cwd = spaRoot) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (name === 'node_modules' || name === 'dist' || name === 'publish') continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

console.log('=== Deploy SPA → pimo-pro-industrial ===');

if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true, force: true });
fs.mkdirSync(deployDir, { recursive: true });
run('git clone --depth 1 --branch main ' + remote + ' .', deployDir);

for (const item of COPY_ITEMS) {
  const src = path.join(spaRoot, item);
  if (!fs.existsSync(src)) continue;
  copyRecursive(src, path.join(deployDir, item));
}

run('git add -A', deployDir);
try {
  run('git diff --cached --quiet', deployDir);
  console.log('SPA: nada a publicar.');
} catch {
  run('git commit -m "fix(spa): REST relativo /api + WS Render absoluto"', deployDir);
  run('git push origin main', deployDir);
  console.log('SPA push concluído.');
}

fs.rmSync(deployDir, { recursive: true, force: true });
