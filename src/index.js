import 'dotenv/config'
import Fastify from 'fastify'
import { submitForReview } from './submission.js'

const fastify = Fastify({
  logger: true,
})

fastify.listen(
  {
    port: process.env.PORT || 3000,
    host: process.env.RENDER_EXTERNAL_URL ? '0.0.0.0' : process.env.HOST || 'localhost',
  },
  function (err) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }

    //////////////////////////////////////////////////////////////////////
    // Don't delete this line, it is used to submit your API for review //
    // everytime your start your server.                                //
    //////////////////////////////////////////////////////////////////////
    submitForReview(fastify)
    fastify.get('/cities/:cityId/infos', async (req, reply) => {
      const cityId = req.params.cityId;
    
      try {
        const cityRes = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}`);
        if (!cityRes.ok) {
          return reply.code(404).send({ error: 'City not found' });
        }
        const city = await cityRes.json();
    
        const weatherRes = await fetch(`https://api-ugi2pflmha-ew.a.run.app/weather/${cityId}`);
        const weather = await weatherRes.json();
    
        reply.send({
          coordinates: city.coordinates,
          population: city.population,
          knownFor: city.knownFor,
          weatherPredictions: [
            { when: 'today', min: weather.today.min, max: weather.today.max },
            { when: 'tomorrow', min: weather.tomorrow.min, max: weather.tomorrow.max }
          ],
          recipes: [] // on implémente POST plus tard
        });
      } catch (err) {
        reply.code(500).send({ error: 'Server error' });
      }
    });
    
  }
)
