#!/bin/sh
set -e

echo "Running database migrations..."
bun run src/db/migrate.ts

echo "Seeding admin user..."
bun run src/db/seed-admin.ts

echo "Seeding achievements..."
bun run src/db/seed-achievements.ts

echo "Starting server on port ${PORT:-3000}..."
exec bun run .output/server/index.mjs
