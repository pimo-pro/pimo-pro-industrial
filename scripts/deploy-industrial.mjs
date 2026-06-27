/**
 * Deploy SPA industrial → Hostinger (industrial.pimo.pro) via FTP.
 *
 * Variáveis de ambiente:
 *   HOSTING_FTP_HOST, HOSTING_FTP_USER, HOSTING_FTP_PASS
 *   HOSTING_FTP_ROOT (opcional, default: public_html/industrial)
 */
import { Client } from 'basic-ftp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_DIR = path.join(pkgRoot, 'publish', 'industrial', 'spa');
const FTP_ROOT = (process.env.HOSTING_FTP_ROOT ?? 'public_html/industrial').replace(/\\/g, '/');

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`ERRO: defina ${name} no ambiente.`);
    process.exit(1);
  }
  return value;
}

async function uploadDirectory(client, localDir, remoteDir) {
  await client.ensureDir(remoteDir);

  for (const entry of fs.readdirSync(localDir, { withFileTypes: true })) {
    const localPath = path.join(localDir, entry.name);
    const remotePath = `${remoteDir}/${entry.name}`.replace(/\\/g, '/');

    if (entry.isDirectory()) {
      await uploadDirectory(client, localPath, remotePath);
      continue;
    }

    console.log(`↑ ${remotePath}`);
    await client.uploadFrom(localPath, remotePath);
  }
}

async function main() {
  const host = requireEnv('HOSTING_FTP_HOST');
  const user = requireEnv('HOSTING_FTP_USER');
  const password = requireEnv('HOSTING_FTP_PASS');

  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`ERRO: build ausente em ${BUILD_DIR}`);
    console.error('Execute primeiro: npm run build-industrial');
    process.exit(1);
  }

  console.log('=== Deploy SPA Industrial → Hostinger ===');
  console.log(`Origem: ${BUILD_DIR}`);
  console.log(`Destino FTP: ${FTP_ROOT}`);

  const client = new Client(60_000);
  client.ftp.verbose = process.env.FTP_VERBOSE === '1';

  try {
    await client.access({
      host,
      user,
      password,
      secure: true,
    });
    await uploadDirectory(client, BUILD_DIR, FTP_ROOT);
    console.log('Deploy concluído: https://industrial.pimo.pro');
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error('ERRO no deploy FTP:', err.message ?? err);
  process.exit(1);
});
