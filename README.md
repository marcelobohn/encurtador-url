# URL Shortener

Fastify-based URL shortener powered by Prisma and SQLite. It offers endpoints to create short URLs (with optional custom slugs), redirect visitors, and fetch click statistics.

## Requirements

- Node.js 20+
- npm 10+
- Prisma CLI (`npx prisma …` works after `npm install`)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `.env` (an example file is provided):

   ```
   DATABASE_URL="file:./dev.db"
   PORT=3000
   BASE_URL=http://localhost:3000
   ```

3. Generate the Prisma client and apply migrations:

   ```bash
   npx prisma migrate dev --name init
   ```

## Development

Run the dev server with hot reload:

```bash
npm run dev
```

Key endpoints:

- `POST /links` – creates a short link (accepts `{ url, slug? }`)
- `GET /:slug` – redirects to the original URL
- `GET /links/:slug` – returns stats (click count, creation date)

## Tests

Route tests rely on Node’s native test runner:

```bash
npm test
```

## Docker

The repo ships with a Docker Compose stack that runs two app instances behind Nginx for basic load balancing:

```bash
docker compose up --build
```

The service will be reachable at `http://localhost:8080`.

## Gatling (load testing)

The `gatling/` directory hosts a Maven project with load-testing simulations:

```bash
cd gatling
mvn gatling:test -DbaseUrl=http://localhost:8080
```

Reports land in `gatling/target/gatling/…/index.html`.

## Useful scripts

- `npm run build` – compiles TypeScript to `dist/`
- `npm run start` – runs the compiled build (`dist/server.js`)
- `npm run prisma:dev` – runs `prisma migrate dev --name init && prisma generate`

## License

Licensed under the ISC license (see `package.json`).
