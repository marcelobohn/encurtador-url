/// <reference types="node" />

import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const DEFAULT_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/encurtador?schema=linkstest';
const originalDatabaseUrl = process.env.DATABASE_URL;

let prisma: PrismaClient;
let linkRoutes: (app: FastifyInstance) => Promise<void>;

async function createApp() {
  const app = Fastify();
  await app.register(linkRoutes);
  await app.ready();
  return app;
}

async function ensureTestSchema(connectionString: string) {
  const url = new URL(connectionString);
  const dbName = url.pathname.replace(/^\//, '');
  if (!dbName) {
    throw new Error('DATABASE_URL must include a database name');
  }
  const schema = url.searchParams.get('schema') ?? 'public';

  const adminUrl = new URL(connectionString);
  adminUrl.searchParams.delete('schema');

  const adminClient = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    await adminClient.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  } catch (err) {
    throw new Error(
      `Não foi possível preparar o schema de testes "${schema}" no banco "${dbName}". ` +
        `Crie o banco manualmente (por exemplo: CREATE DATABASE "${dbName}";) e rode novamente.\n` +
        `Erro original: ${(err as Error).message}`
    );
  } finally {
    await adminClient.$disconnect();
  }
}

test.describe('linkRoutes', () => {
  test.before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
    await ensureTestSchema(process.env.DATABASE_URL);

    const prismaModule = await import('../src/lib/prisma.js');
    prisma = prismaModule.prisma;

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Link" CASCADE;');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Link" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "clicks" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "Link_slug_key" ON "Link"("slug");'
    );

    const routesModule = await import('../src/routes/links.js');
    linkRoutes = routesModule.linkRoutes;
  });

  test.beforeEach(async () => {
    await prisma.link.deleteMany();
  });

  test.after(async () => {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Link" CASCADE;');
    await prisma.$disconnect();
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  test.it('creates a short link with a generated slug', async () => {
    const app = await createApp();
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/links',
        payload: { url: 'https://example.com/article' },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = response.json();
      assert.strictEqual(typeof body.slug, 'string');
      assert.strictEqual(body.slug.length, 7);
      assert.strictEqual(body.shortUrl, `${process.env.BASE_URL}/${body.slug}`);
      assert.strictEqual(body.url, 'https://example.com/article');
    } finally {
      await app.close();
    }
  });

  test.it('returns 409 when attempting to reuse an existing slug', async () => {
    const app = await createApp();
    try {
      const first = await app.inject({
        method: 'POST',
        url: '/links',
        payload: { url: 'https://example.com/one', slug: 'custom123' },
      });
      assert.strictEqual(first.statusCode, 201);

      const duplicate = await app.inject({
        method: 'POST',
        url: '/links',
        payload: { url: 'https://example.com/two', slug: 'custom123' },
      });
      assert.strictEqual(duplicate.statusCode, 409);
      assert.deepStrictEqual(duplicate.json(), { error: 'slug já em uso' });
    } finally {
      await app.close();
    }
  });

  test.it('redirects to the original URL and increments click count', async () => {
    await prisma.link.create({
      data: {
        slug: 'abc123',
        url: 'https://example.com/redirect-here',
      },
    });

    const app = await createApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/abc123',
      });

      assert.strictEqual(response.statusCode, 302);
      assert.strictEqual(response.headers.location, 'https://example.com/redirect-here');

      await new Promise((resolve) => setTimeout(resolve, 20));

      const updated = await prisma.link.findUnique({ where: { slug: 'abc123' } });
      assert.ok(updated);
      assert.strictEqual(updated.clicks, 1);
    } finally {
      await app.close();
    }
  });

  test.it('returns link stats for a given slug', async () => {
    const created = await prisma.link.create({
      data: {
        slug: 'stats123',
        url: 'https://example.com/stats',
        clicks: 5,
      },
    });

    const app = await createApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/links/stats123',
      });

      assert.strictEqual(response.statusCode, 200);
      const payload = response.json() as {
        slug: string;
        url: string;
        clicks: number;
        createdAt: string;
      };

      assert.deepStrictEqual(
        { slug: payload.slug, url: payload.url, clicks: payload.clicks },
        { slug: 'stats123', url: 'https://example.com/stats', clicks: 5 }
      );
      assert.ok(new Date(payload.createdAt).getTime() >= created.createdAt.getTime());
    } finally {
      await app.close();
    }
  });
});
