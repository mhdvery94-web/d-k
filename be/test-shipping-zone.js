// Test script untuk debug zona ongkir
require('dotenv').config();
const appSettings = require('./services/appSettingsService');
const shippingZoneService = require('./services/shippingZoneService');

async function testShipping() {
  console.log('='.repeat(60));
  console.log('TEST ZONA ONGKIR');
  console.log('='.repeat(60));

  // Koordinat toko dari env
  const store = appSettings.getStoreCoords();
  console.log('\n📍 KOORDINAT TOKO (dari .env):');
  console.log('  Latitude:', store.lat);
  console.log('  Longitude:', store.lng);
  console.log('  URL:', `https://maps.google.com/maps?q=${store.lat},${store.lng}`);

  // Koordinat pelanggan (dari bug report)
  const customerLat = -6.377440;
  const customerLng = 106.749768;
  console.log('\n📍 KOORDINAT PELANGGAN:');
  console.log('  Latitude:', customerLat);
  console.log('  Longitude:', customerLng);
  console.log('  URL:', `https://maps.google.com/maps?q=${customerLat},${customerLng}`);

  // Hitung jarak
  console.log('\n🔍 MENGHITUNG JARAK...');
  const distanceKm = await shippingZoneService.getDistanceKm(
    store.lat, 
    store.lng, 
    customerLat, 
    customerLng
  );
  console.log('  Jarak:', distanceKm, 'km');
  console.log('  Jarak (meter):', Math.round(distanceKm * 1000), 'm');

  // Ambil zona aktif
  console.log('\n📋 ZONA AKTIF:');
  const zones = await shippingZoneService.getActiveZones();
  if (zones.length === 0) {
    console.log('  ⚠️  TIDAK ADA ZONA AKTIF! Run seeder: npm run seed');
  } else {
    zones.forEach(z => {
      const maxStr = z.jarakMax === null ? '∞' : z.jarakMax;
      const inRange = distanceKm >= z.jarakMin && (z.jarakMax === null || distanceKm <= z.jarakMax);
      const mark = inRange ? '✅' : '  ';
      console.log(`  ${mark} ${z.kodeZona}: ${z.jarakMin} - ${maxStr} km, Rp ${z.tarif}`);
    });
  }

  // Resolve zona
  console.log('\n🎯 RESOLVE ZONA:');
  const result = await shippingZoneService.calculateShipping(customerLat, customerLng);
  console.log('  Zona:', result.zoneCode || '❌ NULL');
  console.log('  Tarif:', result.tariff);
  console.log('  Out of Range:', result.outOfRange ? '❌ YA (BUG!)' : '✅ Tidak');

  if (result.outOfRange) {
    console.log('\n⚠️  DIAGNOSA BUG:');
    if (zones.length === 0) {
      console.log('  1. ❌ ZONA KOSONG - Run seeder: npm run seed');
    }
    if (store.lat === -6.3933 && store.lng === 106.7817) {
      console.log('  2. ❌ KOORDINAT TOKO DEFAULT - Update .env dengan koordinat yang benar');
    }
    if (distanceKm < 0.1 && zones.length > 0) {
      console.log('  3. ❌ LOGIC ERROR - Zona ada, jarak dekat, tapi tidak ter-resolve');
      console.log('     Kemungkinan: jarakMin zona pertama > 0');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST SELESAI');
  console.log('='.repeat(60));
  process.exit(0);
}

testShipping().catch(err => {
  console.error('❌ ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
