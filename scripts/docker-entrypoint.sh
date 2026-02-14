#!/bin/sh
set -e

echo "=== Running database migrations ==="
npx prisma db push --skip-generate 2>&1 || echo "WARNING: prisma db push failed (DB may not be ready yet)"

echo "=== Running seed ==="
node prisma/seed-prod.js 2>&1 || echo "WARNING: seed failed"

echo "=== Syncing templates ==="
node prisma/sync-templates.js 2>&1 || echo "WARNING: template sync failed"

echo "=== Syncing ICD-10 codes ==="
node prisma/sync-icd10.js 2>&1 || echo "WARNING: ICD-10 sync failed"

echo "=== Starting app ==="
exec node server.js
