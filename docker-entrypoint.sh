#!/bin/sh
set -e

# Ensure the database schema is up to date before starting the server.
until npx prisma migrate deploy; do
  echo "Waiting for database to become available..."
  sleep 3
done

exec node dist/server.js
