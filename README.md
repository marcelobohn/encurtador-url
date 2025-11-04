# URL Shortener

Fastify-based URL shortener powered by Prisma and SQLite. It offers endpoints to create short URLs (with optional custom slugs), redirect visitors, and fetch click statistics.

## Requirements

- Node.js 20+
- npm 10+
- Prisma CLI (`npx prisma …` works after `npm install`)
- PostgreSQL 15+ (or compatible managed service)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `.env` (an example file is provided):

   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/encurtador?schema=public"
   PORT=3000
   BASE_URL=http://localhost:3000
   ```

   The example assumes a local PostgreSQL instance with database `encurtador` and user/password `postgres`.

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

### Curl examples

Create a link with a custom slug:

```bash
curl -X POST http://localhost:3000/links \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/article","slug":"my-article"}'
```

Follow the redirect (use `-I` to inspect headers without following):

```bash
curl -I http://localhost:3000/my-article
```

Fetch statistics for an existing slug:

```bash
curl http://localhost:3000/links/my-article
```

## Tests

Route tests rely on Node’s native test runner:

```bash
npm test
```

Make sure a PostgreSQL instance is running and that the database referenced by `DATABASE_URL`
(default: `encurtador`) exists. You can point tests to a different database or schema by setting
`TEST_DATABASE_URL`.

## Docker

The repo ships with a Docker Compose stack that runs two app instances behind Nginx for basic load balancing:

```bash
docker compose up --build
```

The stack now includes PostgreSQL; the service will be reachable at `http://localhost:8080`.

To start only the database for local development:

```bash
docker compose up -d postgres
```

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
