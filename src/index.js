import Fastify from 'fastify';
import 'dotenv/config';
import { submitForReview } from './submission.js';

const fastify = Fastify({ logger: true });

// Base de données en mémoire
let recipesDB = [];

/* ----------------------------- GET ----------------------------- */
fastify.get("/cities/:cityId/infos", async (request, reply) => {
  const { cityId } = request.params;
  const API_KEY = process.env.API_KEY;

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
fastify.post("/cities/:cityId/recipes", async (request, reply) => {
  const { cityId } = request.params;
  const { content } = request.body;
  const API_KEY = process.env.API_KEY;

  try {
    const cityRes = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}?apiKey=${API_KEY}`
    );
    if (!cityRes.ok) {
      return reply.status(404).send({ error: "City not found" });
    }

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
fastify.delete("/cities/:cityId/recipes/:recipeId", async (request, reply) => {
  const { cityId, recipeId } = request.params;
  const recipeIdNum = parseInt(recipeId, 10);
  const API_KEY = process.env.API_KEY;

  try {
    const cityRes = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}?apiKey=${API_KEY}`
    );
    if (!cityRes.ok) {
      return reply.status(404).send({ error: "City not found" });
    }

    const recipeIndex = recipesDB.findIndex(
      (recipe) => recipe.id === recipeIdNum && recipe.cityId === cityId
    );

    if (recipeIndex === -1) {
      return reply.status(404).send({ error: "Recipe not found" });
    }

    recipesDB.splice(recipeIndex, 1);
    return reply.status(204).send(); // No content

  } catch (error) {
    console.error("DELETE error:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

/* ----------------------------- START ----------------------------- */
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

    // Ne pas toucher à cette ligne :
    submitForReview(fastify);
  }
);
