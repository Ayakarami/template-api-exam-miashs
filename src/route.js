import dotenv from "dotenv";
dotenv.config();
const CITY_API_KEY = 'm_ddynptj';
const WEATHER_API_KEY = 'm_ddynptj'

export const getApiCity = async (request, reply) => {
  try {
    const { cityId } = request.params;
    const citySearchResponse = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities?search=${cityId}&apiKey=${CITY_API_KEY}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!citySearchResponse.ok) return reply.status(404).send({ error: "City not found" });

    const citySearchData = await citySearchResponse.json();
    if (citySearchData.length === 0) return reply.status(404).send({ error: "City not found" });

    const city = citySearchData[0];
    const cityUniqueId = city.id;

    const cityResponse = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/cities/${cityUniqueId}/insights?apiKey=${CITY_API_KEY}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!cityResponse.ok) return reply.status(404).send({ error: "City insights not found" });
    const cityData = await cityResponse.json();

    const weatherResponse = await fetch(
      `https://api-ugi2pflmha-ew.a.run.app/weather-predictions?cityId=${cityUniqueId}&apiKey=${WEATHER_API_KEY}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!weatherResponse.ok) return reply.status(500).send({ error: "Weather data not available" });

    const weatherData = await weatherResponse.json();
    const weatherPredictions = weatherData[0]?.predictions?.map((day) => ({
      when: day.when,
      min: day.min,
      max: day.max,
    })) || [];

    return reply.send({
      coordinates: cityData.coordinates ? [cityData.coordinates.latitude, cityData.coordinates.longitude] : [],
      population: cityData.population || 0,
      knownFor: cityData.knownFor || [],
      weatherPredictions,
      recipes: []
    });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};