#!/bin/sh
# Ainova Cloud Core — Docker entrypoint
# 1. Megvárja a DB-t és lefuttatja a migrációkat
# 2. Elindítja a Next.js szervert

set -e

echo "[entrypoint] Ainova Cloud Core indul..."
echo "[entrypoint] DB migrációk futtatása..."

node scripts/migrate-all.js

echo "[entrypoint] Szerver indítása..."
exec node server.js
