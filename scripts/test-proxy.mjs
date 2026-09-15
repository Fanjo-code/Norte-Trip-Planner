#!/usr/bin/env node
/**
 * Test script for the travel-data proxy endpoints
 * Run with: node scripts/test-proxy.mjs
 */

const BASE = 'http://localhost:8787';

async function test(endpoint, params = {}) {
  const url = `${BASE}${endpoint}?${new URLSearchParams(params)}`;
  console.log(`\n🔍 Testing: ${url}`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    if (res.ok) {
      console.log(`   ✅ Success`);
      if (data.places) console.log(`   Places: ${data.places.length}`);
      if (data.restaurants) console.log(`   Restaurants: ${data.restaurants.length}`);
      if (data.weather) console.log(`   Weather days: ${data.weather.length}`);
      if (data.places?.[0]) console.log(`   Sample place: ${data.places[0].name}`);
      if (data.restaurants?.[0]) console.log(`   Sample restaurant: ${data.restaurants[0].name}`);
      if (data.weather?.[0]) console.log(`   Sample weather: ${data.weather[0].description}, ${data.weather[0].tempMin}°-${data.weather[0].tempMax}°C`);
    } else {
      console.log(`   ❌ Error:`, data);
    }
    return data;
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing Norte Travel Proxy Endpoints\n');
  console.log('Make sure the proxy is running: npm run proxy');
  console.log('(node server/index.mjs)\n');

  // Test geocode
  const geo = await test('/api/geocode', { q: 'Porto, Portugal' });
  if (!geo || !geo.lat) {
    console.log('\n❌ Geocoding failed, cannot test other endpoints');
    return;
  }

  const { lat, lng } = geo;

  // Test places
  await test('/api/places', { lat, lng, radius: '3000' });

  // Test restaurants
  await test('/api/restaurants', { lat, lng, radius: '2000' });

  // Test transport
  await test('/api/transport', { lat, lng, radius: '5000' });

  // Test weather
  await test('/api/weather', {
    lat, lng,
    startDate: '2026-09-15',
    endDate: '2026-09-20',
  });

  console.log('\n✨ All tests complete!');
  console.log('\n📝 Notes:');
  console.log('   - Overpass API may be slow on first request (caches after)');
  console.log('   - Nominatim rate-limits to 1 req/sec');
}

main().catch(console.error);