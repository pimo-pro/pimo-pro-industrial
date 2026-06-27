#!/bin/sh
# Deploy SPA industrial → Hostinger (industrial.pimo.pro)
# Requer: lftp, variáveis HOSTING_FTP_* definidas no ambiente.

set -eu

: "${HOSTING_FTP_HOST:?Defina HOSTING_FTP_HOST}"
: "${HOSTING_FTP_USER:?Defina HOSTING_FTP_USER}"
: "${HOSTING_FTP_PASS:?Defina HOSTING_FTP_PASS}"

FTP_ROOT="${HOSTING_FTP_ROOT:-public_html/industrial}"
BUILD_DIR="publish/industrial/spa"

echo "=== Deploy SPA Industrial → Hostinger ==="
echo "Destino FTP: ${FTP_ROOT}"

npm run build-industrial || npm run build

if [ ! -d "${BUILD_DIR}" ]; then
  echo "ERRO: diretório de build ausente: ${BUILD_DIR}"
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "ERRO: lftp não encontrado. Use: npm run deploy1"
  exit 1
fi

echo "Enviando ${BUILD_DIR} → ${FTP_ROOT} (mirror --reverse --delete)..."

lftp -u "${HOSTING_FTP_USER}","${HOSTING_FTP_PASS}" "${HOSTING_FTP_HOST}" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
mirror --reverse --delete --verbose "${BUILD_DIR}" "${FTP_ROOT}"
bye
EOF

echo "Deploy SPA industrial concluído: https://industrial.pimo.pro"
