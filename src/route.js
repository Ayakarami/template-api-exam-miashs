// src/route.js
export default async function (fastify, opts) {
    const recipesByCity = {};
  
    fastify.get('/cities/:cityId/infos', async (request, reply) => {
      const cityId = request.params.cityId;
  
      // Récupère les données ville
      const cityRes = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}`);
      if (!cityRes.ok) {
        return reply.code(404).send({ error: 'City not found' });
      }
      const city = await cityRes.json();
  
      // Récupère les données météo
      const weatherRes = await fetch(`https://api-ugi2pflmha-ew.a.run.app/weather/${cityId}`);
      const weather = await weatherRes.json();
  
      // Structure attendue par les tests
      const response = {
        coordinates: city.coordinates, // [lat, lon]
        population: city.population, // integer
        knownFor: city.knownFor, // array of strings
        weatherPredictions: [
          { when: 'today', min: weather.today.min, max: weather.today.max },
          { when: 'tomorrow', min: weather.tomorrow.min, max: weather.tomorrow.max }
        ],
        recipes: recipesByCity[cityId] || []
      };
  
      return reply.send(response);
    });
  }
  