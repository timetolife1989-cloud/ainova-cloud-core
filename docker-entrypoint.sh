#!/bin/sh
# Ainova Cloud Intelligence (ACI) — Docker entrypoint
# 1. Megvárja a DB-t és lefuttatja a migrációkat
# 2. Elindítja a Next.js szervert

set -e

echo "[ACI] Ainova Cloud Intelligence indul..."
echo "[ACI] DB migrációk futtatása..."

node scripts/migrate-all.js

echo "[ACI] Szerver indítása..."
exec node server.js
