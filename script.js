const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const locationBtn = document.getElementById("locationBtn");
const unitBtn = document.getElementById("unitBtn");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const weatherInfo = document.getElementById("weatherInfo");
const cityName = document.getElementById("cityName");
const description = document.getElementById("description");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const feelsLike = document.getElementById("feelsLike");
const unitSymbolBtn = document.getElementById("unitBtn");

let currentUnit = "metric"; // metric = Celsius, imperial = Fahrenheit-style
let lastSearchCity = "";
let lastCoords = null;
let lastLocationLabel = "";

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  lastSearchCity = city;
  lastCoords = null;
  await fetchWeatherByCity(city);
});

locationBtn.addEventListener("click", async () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported in this browser.");
    return;
  }

  setLoading(true);
  hideError();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        lastCoords = { latitude, longitude };
        lastSearchCity = "";
        lastLocationLabel = "Your Location";
        const weatherData = await fetchWeatherByCoords(latitude, longitude);
        renderWeather(weatherData, lastLocationLabel);
      } catch (error) {
        showError(error.message);
      } finally {
        setLoading(false);
      }
    },
    () => {
      setLoading(false);
      showError("Unable to access your location.");
    }
  );
});

unitBtn.addEventListener("click", async () => {
  currentUnit = currentUnit === "metric" ? "imperial" : "metric";
  unitSymbolBtn.textContent = currentUnit === "metric" ? "Switch to °F" : "Switch to °C";

  if (lastCoords) {
    const weatherData = await fetchWeatherByCoords(lastCoords.latitude, lastCoords.longitude);
    renderWeather(weatherData, lastLocationLabel || "Your Location");
  } else if (lastSearchCity) {
    await fetchWeatherByCity(lastSearchCity);
  }
});

async function fetchWeatherByCity(city) {
  try {
    setLoading(true);
    hideError();

    const location = await fetchLocationByCity(city);
    if (!location) throw new Error("City not found. Please try another city.");
    lastLocationLabel = `${location.name}, ${location.country}`;
    const weatherData = await fetchWeatherByCoords(location.latitude, location.longitude);
    renderWeather(weatherData, lastLocationLabel);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code",
    timezone: "auto"
  });

  if (currentUnit === "imperial") {
    params.set("temperature_unit", "fahrenheit");
    params.set("wind_speed_unit", "mph");
  }

  const url = `${FORECAST_URL}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch weather by location.");
  return response.json();
}

async function fetchLocationByCity(city) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to find location.");
  const data = await response.json();
  return data.results?.[0] ?? null;
}

function renderWeather(data, locationLabel) {
  const current = data.current;
  const weatherCode = current.weather_code;
  const weatherText = mapWeatherCodeToText(weatherCode);
  const tempUnit = currentUnit === "metric" ? "°C" : "°F";
  const windUnit = currentUnit === "metric" ? "km/h" : "mph";

  cityName.textContent = locationLabel;
  description.textContent = weatherText;
  weatherIcon.src = weatherCodeToIcon(weatherCode);
  weatherIcon.alt = weatherText;
  temperature.textContent = `${Math.round(current.temperature_2m)}${tempUnit}`;
  feelsLike.textContent = `${Math.round(current.apparent_temperature)}${tempUnit}`;
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit}`;

  updateWeatherBackground(mapWeatherCodeToTheme(weatherCode));

  weatherInfo.classList.remove("hidden");
  weatherInfo.classList.remove("weather-fade");
  // Re-trigger fade-in animation whenever data changes.
  void weatherInfo.offsetWidth;
  weatherInfo.classList.add("weather-fade");
}

function updateWeatherBackground(condition) {
  document.body.classList.remove("weather-clear", "weather-rain", "weather-clouds", "weather-default");

  if (condition === "clear") {
    document.body.classList.add("weather-clear");
  } else if (condition === "rain") {
    document.body.classList.add("weather-rain");
  } else if (condition === "clouds") {
    document.body.classList.add("weather-clouds");
  } else {
    document.body.classList.add("weather-default");
  }
}

function setLoading(isLoading) {
  loading.classList.toggle("hidden", !isLoading);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}

function mapWeatherCodeToTheme(code) {
  if (code === 0) return "clear";
  if ([1, 2, 3, 45, 48].includes(code)) return "clouds";
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)
  ) {
    return "rain";
  }
  return "default";
}

function mapWeatherCodeToText(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Mixed conditions";
}

function weatherCodeToIcon(code) {
  if (code === 0) return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24'><text x='2' y='18' font-size='18'>☀️</text></svg>";
  if ([1, 2, 3].includes(code)) return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24'><text x='2' y='18' font-size='18'>⛅</text></svg>";
  if ([45, 48].includes(code)) return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24'><text x='2' y='18' font-size='18'>🌫️</text></svg>";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24'><text x='2' y='18' font-size='18'>❄️</text></svg>";
  if ([95, 96, 99].includes(code)) return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24'><text x='2' y='18' font-size='18'>⛈️</text></svg>";
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 24 24'><text x='2' y='18' font-size='18'>🌧️</text></svg>";
}
