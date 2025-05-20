import Fastify from 'fastify';
import 'dotenv/config';
import fetch from 'node-fetch';
import { submitForReview } from './submission.js';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

const fastify = Fastify({ logger: true });
const API_KEY = process.env.API_KEY;
let recipesDB = [];

/* ----------------------------- Swagger ----------------------------- */
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'API Examen MIASHS 2025',
      description: 'Documentation de l’API pour l\'évaluation',
      version: '1.0.0',
    },
  },
});

await fastify.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
  },
});

/* ----------------------------- GET ----------------------------- */
fastify.get("/cities/:cityId/infos", {
  schema: {
    description: "Récupère les infos d'une ville + météo + recettes",
    params: {
      cityId: { type: 'string', description: "Nom ou ID de la ville" }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          coordinates: { type: 'array', items: { type: 'number' } },
          population: { type: 'number' },
          knownFor: { type: 'array', items: { type: 'string' } },
          weatherPredictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                when: { type: 'string' },
                min: { type: 'number' },
                max: { type: 'number' }
              }
            }
          },
          recipes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                content: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const { cityId } = request.params;

  try {
    const searchRes = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities?search=${cityId}&apiKey=${API_KEY}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!searchRes.ok) return reply.code(404).send({ error: "City not found" });

    const searchData = await searchRes.json();
    if (searchData.length === 0) return reply.code(404).send({ error: "City not found" });

    const city = searchData[0];
    const cityUniqueId = city.id;

    const cityRes = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities/${cityUniqueId}/insights?apiKey=${API_KEY}`
    );
    const cityData = await cityRes.json();

    const weatherRes = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/weather-predictions?cityId=${cityUniqueId}&apiKey=${API_KEY}`
    );
    const weatherData = await weatherRes.json();

    const weatherPredictions = weatherData[0]?.predictions?.slice(0, 2).map(p => ({
      when: p.when,
      min: p.min,
      max: p.max
    })) || [];

    const cityRecipes = recipesDB.filter(r => r.cityId === cityId);

    return reply.send({
      coordinates: cityData.coordinates
        ? [cityData.coordinates.latitude, cityData.coordinates.longitude]
        : [],
      population: cityData.population || 0,
      knownFor: cityData.knownFor || [],
      weatherPredictions,
      recipes: cityRecipes.map(r => ({
        id: r.id,
        content: r.content
      }))
    });

  } catch (error) {
    console.error("GET error:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

/* ----------------------------- POST ----------------------------- */
fastify.post("/cities/:cityId/recipes", {
  schema: {
    body: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          content: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  const { cityId } = request.params;
  const { content } = request.body;

  try {
    const cityRes = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}?apiKey=${API_KEY}`
    );
    if (!cityRes.ok) return reply.status(404).send({ error: "City not found" });

    if (!content || content.trim() === "") {
      return reply.status(400).send({ error: "Content cannot be empty." });
    }
    if (content.length < 10) {
      return reply.status(400).send({ error: "Content must be at least 10 characters." });
    }
    if (content.length > 2000) {
      return reply.status(400).send({ error: "Content must be less than 2000 characters." });
    }

    const newRecipe = {
      id: recipesDB.length + 1,
      cityId,
      content
    };
    recipesDB.push(newRecipe);

    return reply.status(201).send({
      id: newRecipe.id,
      content: newRecipe.content
    });

  } catch (error) {
    console.error("POST error:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

/* ----------------------------- DELETE ----------------------------- */
fastify.delete("/cities/:cityId/recipes/:recipeId", {
  schema: {
    params: {
      type: 'object',
      properties: {
        cityId: { type: 'string' },
        recipeId: { type: 'integer' }
      }
    },
    response: {
      204: {
        description: 'Recette supprimée avec succès',
        type: 'null'
      }
    }
  }
}, async (request, reply) => {
  const { cityId, recipeId } = request.params;
  const recipeIdNum = parseInt(recipeId, 10);

  try {
    const cityRes = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}?apiKey=${API_KEY}`
    );
    if (!cityRes.ok) return reply.status(404).send({ error: "City not found" });

    const recipeIndex = recipesDB.findIndex(
      (r) => r.id === recipeIdNum && r.cityId === cityId
    );
    if (recipeIndex === -1) {
      return reply.status(404).send({ error: "Recipe not found" });
    }

    recipesDB.splice(recipeIndex, 1);
    return reply.status(204).send();

  } catch (error) {
    console.error("DELETE error:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

/* --------------------------- START SERVER --------------------------- */
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
