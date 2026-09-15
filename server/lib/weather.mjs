/**
 * Open-Meteo Weather API — free, no key required.
 * https://open-meteo.com/
 * Returns daily forecast for date range.
 */

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

const cache = new Map();

async function loadCache() {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile('.cache/weather.json', 'utf-8');
    const parsed = JSON.parse(data);
    for (const [k, v] of Object.entries(parsed)) cache.set(k, v);
  } catch { /* ignore */ }
}

async function saveCache() {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('.cache', { recursive: true });
    const obj = Object.fromEntries(cache);
    await fs.writeFile('.cache/weather.json', JSON.stringify(obj));
  } catch { /* ignore */ }
}

export async function getWeather(lat, lng, startDate, endDate) {
  await loadCache();

  const key = `weather:${lat},${lng}:${startDate}:${endDate}`;
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: startDate,
    end_date: endDate,
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
  });

  const url = `${BASE_URL}?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

  const data = await res.json();

  const result = (data.daily?.time || []).map((date, i) => ({
    date,
    weatherCode: data.daily.weathercode[i],
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    precipProb: data.daily.precipitation_probability_max[i],
    description: weatherCodeToDescription(data.daily.weathercode[i]),
  }));

  cache.set(key, result);
  await saveCache();
  return result;
}

function weatherCodeToDescription(code) {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  };
  return codes[code] || 'Unknown';
}