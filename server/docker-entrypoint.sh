#!/bin/sh
set -e

echo "[rota-saude] aplicando schema no banco..."
pnpm exec prisma db push --skip-generate

if [ "${SEED_ON_START:-false}" = "true" ] && [ ! -f /data/.seeded ]; then
  echo "[rota-saude] populando base de demonstracao..."
  pnpm exec tsx src/seed.ts
  touch /data/.seeded
fi

echo "[rota-saude] iniciando API na porta ${PORT:-4000}..."
exec pnpm exec tsx src/index.ts
