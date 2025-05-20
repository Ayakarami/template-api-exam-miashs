import Fastify from 'fastify';
import 'dotenv/config';
import { submitForReview } from './submission.js';
import route from './route.js';

const fastify = Fastify({ logger: true });

fastify.register(route); // <- très important

fastify.listen(
  {
    port: process.env.PORT || 3000,
    host: process.env.RENDER_EXTERNAL_URL ? '0.0.0.0' : process.env.HOST || 'localhost',
  },
  (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }

    submitForReview(fastify);
  }
);
