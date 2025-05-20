import dotenv from "dotenv";
dotenv.config();

const CITY_API_KEY = process.env.API_KEY;
const WEATHER_API_KEY = process.env.API_KEY; // tu peux garder 'm_ddynptj' en dur mais mieux vaut utiliser .env

export const getApiCity = async (request, reply) => {
  try {
    const { cityId } = request.params;

    // 1. Rechercher la ville par ID (et pas par nom !)
    const cityResponse = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}?apiKey=${CITY_API_KEY}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!cityResponse.ok) return reply.status(404).send({ error: "City not found" });

    const cityData = await cityResponse.json();

    // 2. Prévisions météo pour aujourd'hui et demain
    const weatherResponse = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/weather-predictions?cityId=${cityId}&apiKey=${WEATHER_API_KEY}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!weatherResponse.ok) {
      return reply.status(500).send({ error: "Weather data not available" });
    }

    const weatherData = await weatherResponse.json();
    const weatherPredictions = weatherData[0]?.predictions?.slice(0, 2).map((day) => ({
      when: day.when,
      min: day.min,
      max: day.max,
    })) || [];

    return reply.send({
      coordinates: [
        cityData.coordinates.latitude,
        cityData.coordinates.longitude
      ],
      population: cityData.population,
      knownFor: cityData.knownFor,
      weatherPredictions,
      recipes: [] // tu ajouteras les recettes plus tard
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
