// Simple in-memory geocoder with caching and a request queue to enforce provider rate limits.
// Configurable via env vars:
// - GEOCODER_PROVIDER_URL (default: Nominatim)
// - GEOCODER_USER_AGENT
// - GEOCODER_CACHE_TTL_SECONDS (default: 86400 = 24h)
// - GEOCODER_RATE_LIMIT_INTERVAL_MS (default: 1000 = 1 request/sec)

const CACHE_TTL = Number(process.env.GEOCODER_CACHE_TTL_SECONDS) || 24 * 3600;
const RATE_LIMIT_INTERVAL_MS = Number(process.env.GEOCODER_RATE_LIMIT_INTERVAL_MS) || 1000;
const PROVIDER = process.env.GEOCODER_PROVIDER_URL || 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = process.env.GEOCODER_USER_AGENT || 'rental-platform/1.0 (+https://example.com)';

const cache = new Map(); // key -> { value, expiresAt }
const queue = [];
let timerStarted = false;

function addressKey(address) {
  return String(address || '').trim().toLowerCase();
}

async function doGeocode(address) {
  const url = `${PROVIDER}?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await resp.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  return { lat: Number(first.lat), lon: Number(first.lon), display_name: first.display_name };
}

function processQueue() {
  if (queue.length === 0) return;
  const job = queue.shift();
  const { address, key, resolve, reject } = job;
  doGeocode(address).then((result) => {
    // cache positive results for TTL; cache negative results for a short time
    const expiresAt = Date.now() + ((result ? CACHE_TTL : 60) * 1000);
    cache.set(key, { value: result, expiresAt });
    resolve(result);
  }).catch((err) => {
    reject(err);
  });
}

function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  setInterval(processQueue, RATE_LIMIT_INTERVAL_MS);
}

export async function geocodeAddress(address) {
  if (!address) return null;
  const key = addressKey(address);
  const cached = cache.get(key);
  if (cached) {
    if (cached.expiresAt > Date.now()) return cached.value;
    cache.delete(key);
  }

  // enqueue request and ensure queue processor is running
  return new Promise((resolve, reject) => {
    queue.push({ address, key, resolve, reject });
    startTimer();
  });
}

export function clearGeocodeCache() {
  cache.clear();
}
