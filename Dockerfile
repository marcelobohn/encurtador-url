FROM node:20-slim AS base

WORKDIR /app

COPY package*.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma

RUN npm install

COPY src ./src

ENV DATABASE_URL="file:./dev.db"

RUN npm run build \
  && npx prisma generate

COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
