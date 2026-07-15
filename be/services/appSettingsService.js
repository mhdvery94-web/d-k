const prisma = require('../utils/prisma');

const cache = new Map();
const CACHE_TTL = 60_000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.value;
  cache.delete(key);
  return null;
}

function setCache(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

async function get(key) {
  const cached = getCached(key);
  if (cached !== null) return cached;

  const row = await prisma.appSetting.findUnique({ where: { key } });
  const value = row ? row.value : null;
  setCache(key, value);
  return value;
}

async function set(key, value) {
  const result = await prisma.appSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
  cache.delete(key);
  return result;
}

async function getPackingFee() {
  const raw = await get('packing_fee');
  return raw !== null ? parseInt(raw, 10) || 0 : 0;
}

async function getWaAdmin() {
  const raw = await get('wa_admin');
  return raw || '0812-XXXX-XXXX';
}

async function getStoreAddress() {
  const raw = await get('store_address');
  return raw || 'Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok';
}

function getStoreCoords() {
  return {
    lat: parseFloat(process.env.STORE_LAT) || -6.3933,
    lng: parseFloat(process.env.STORE_LNG) || 106.7817,
  };
}

async function getAll() {
  const [packingFee, waAdmin, storeAddress, storeCoords] = await Promise.all([
    getPackingFee(),
    getWaAdmin(),
    getStoreAddress(),
    Promise.resolve(getStoreCoords()),
  ]);
  return { packingFee, waAdmin, storeAddress, storeLat: storeCoords.lat, storeLng: storeCoords.lng };
}

function invalidateCache() {
  cache.clear();
}

module.exports = { get, set, getPackingFee, getWaAdmin, getStoreAddress, getStoreCoords, getAll, invalidateCache };
