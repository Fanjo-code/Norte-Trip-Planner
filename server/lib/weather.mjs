import { cached, fetchJson } from './http.mjs';
export async function getWeather(lat, lng, startDate, endDate) {
  return cached(`weather:${lat},${lng}:${startDate}:${endDate}`, 3600000, async () => {
    const data = await fetchJson(
      'https://api.open-meteo.com/v1/forecast?' +
        new URLSearchParams({
          latitude: String(lat),
          longitude: String(lng),
          start_date: startDate,
          end_date: endDate,
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
          timezone: 'auto',
        }),
    );
    return (data.daily?.time ?? []).map((date, i) => ({
      date,
      weatherCode: data.daily.weather_code[i],
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipProb: data.daily.precipitation_probability_max[i],
    }));
  });
}
