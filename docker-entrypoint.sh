#!/bin/sh
set -e

# Ensure the database schema is up to date before starting the server.
mkdir -p /app/data

npx prisma migrate deploy

exec node dist/server.js
