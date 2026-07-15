const prisma = require('../utils/prisma');
const axios = require('axios');
const appSettings = require('./appSettingsService');

const cache = new Map();
const DISTANCE_CACHE_TTL = 30 * 60 * 1000;

function cacheKey(lat, lng) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function getCachedDistance(lat, lng) {
  const key = cacheKey(lat, lng);
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.value;
  cache.delete(key);
  return null;
}

function setCachedDistance(lat, lng, value) {
  cache.set(cacheKey(lat, lng), { value, expiresAt: Date.now() + DISTANCE_CACHE_TTL });
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getDistanceKm(originLat, originLng, destLat, destLng) {
  const cached = getCachedDistance(destLat, destLng);
  if (cached !== null) return cached;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&key=${apiKey}`;
      const { data } = await axios.get(url, { timeout: 8000 });
      if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const km = data.rows[0].elements[0].distance.value / 1000;
        setCachedDistance(destLat, destLng, km);
        return km;
      }
    } catch (err) {
      console.warn('[shippingZone] Google Distance Matrix failed, falling back to Haversine:', err.message);
    }
  }

  const straight = haversineKm(originLat, originLng, destLat, destLng);
  const estimated = straight * 1.3;
  setCachedDistance(destLat, destLng, estimated);
  if (!apiKey) console.warn('[shippingZone] GOOGLE_MAPS_API_KEY not set, using Haversine×1.3 fallback');
  return estimated;
}

async function getActiveZones() {
  return prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { jarakMin: 'asc' },
  });
}

async function resolveShippingZone(distanceKm) {
  const zones = await getActiveZones();
  for (const zone of zones) {
    if (distanceKm >= zone.jarakMin && (zone.jarakMax === null || distanceKm <= zone.jarakMax)) {
      return zone;
    }
  }
  return null;
}

async function calculateShipping(customerLat, customerLng) {
  const store = appSettings.getStoreCoords();
  const distanceKm = await getDistanceKm(store.lat, store.lng, customerLat, customerLng);
  const zone = await resolveShippingZone(distanceKm);

  if (!zone) {
    return { distanceKm: Math.round(distanceKm * 100) / 100, zoneCode: null, tariff: 0, outOfRange: true };
  }

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    zoneCode: zone.kodeZona,
    tariff: zone.tarif,
    outOfRange: false,
  };
}

async function getAllZones() {
  return prisma.shippingZone.findMany({ orderBy: { jarakMin: 'asc' } });
}

async function createZone(data) {
  return prisma.shippingZone.create({
    data: {
      kodeZona: data.kodeZona,
      jarakMin: data.jarakMin,
      jarakMax: data.jarakMax ?? null,
      tarif: data.tarif,
      isActive: data.isActive !== false,
    },
  });
}

async function updateZone(id, data) {
  return prisma.shippingZone.update({
    where: { id: parseInt(id) },
    data: {
      kodeZona: data.kodeZona,
      jarakMin: data.jarakMin,
      jarakMax: data.jarakMax ?? null,
      tarif: data.tarif,
      isActive: data.isActive,
    },
  });
}

async function toggleZone(id) {
  const zone = await prisma.shippingZone.findUnique({ where: { id: parseInt(id) } });
  if (!zone) return null;
  return prisma.shippingZone.update({
    where: { id: parseInt(id) },
    data: { isActive: !zone.isActive },
  });
}

async function deleteZone(id) {
  return prisma.shippingZone.delete({ where: { id: parseInt(id) } });
}

module.exports = {
  getActiveZones,
  resolveShippingZone,
  getDistanceKm,
  calculateShipping,
  getAllZones,
  createZone,
  updateZone,
  toggleZone,
  deleteZone,
};
