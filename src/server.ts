import Fastify from 'fastify';
import dotenv from 'dotenv';
import { linkRoutes } from './routes/links.js';

dotenv.config();

const app = Fastify({ logger: true });
app.register(linkRoutes);

const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
