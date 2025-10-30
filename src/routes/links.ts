import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';

export async function linkRoutes(app: FastifyInstance) {
  const CreateLink = z.object({
    url: z.string().url(),
    slug: z.string().regex(/^[a-zA-Z0-9_-]{3,30}$/).optional()
  });

  // criar link curto
  app.post('/links', async (req, reply) => {
    const { url, slug } = CreateLink.parse(req.body);
    const finalSlug = slug ?? nanoid(7);

    const exists = await prisma.link.findUnique({ where: { slug: finalSlug } });
    if (exists) return reply.code(409).send({ error: 'slug já em uso' });

    const created = await prisma.link.create({ data: { url, slug: finalSlug } });
    return reply.code(201).send({
      slug: created.slug,
      shortUrl: `${process.env.BASE_URL}/${created.slug}`,
      url: created.url
    });
  });

  // redirecionar
  app.get('/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const link = await prisma.link.findUnique({ where: { slug } });
    if (!link) return reply.code(404).send({ error: 'não encontrado' });

    // contagem de clique (assíncrono, sem bloquear o redirect)
    prisma.link.update({ where: { slug }, data: { clicks: { increment: 1 } } }).catch(() => {});
    return reply.redirect(link.url);
  });

  // opcional: stats
  app.get('/links/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const link = await prisma.link.findUnique({ where: { slug } });
    if (!link) return reply.code(404).send({ error: 'não encontrado' });
    return { slug: link.slug, url: link.url, clicks: link.clicks, createdAt: link.createdAt };
  });
}
