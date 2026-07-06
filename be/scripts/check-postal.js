const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Get sample rows - convert BigInt
  const samples = await p.$queryRawUnsafe('SELECT * FROM postal_code_data LIMIT 5');
  console.log('=== Sample rows ===');
  console.log(JSON.stringify(samples, (k, v) => typeof v === 'bigint' ? Number(v) : v, 2));

  // Get count
  const count = await p.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM postal_code_data');
  console.log('\n=== Total rows ===');
  console.log(JSON.stringify(count, (k, v) => typeof v === 'bigint' ? Number(v) : v, 2));

  // Sample with province join
  const joined = await p.$queryRawUnsafe(
    'SELECT p.postal_code, p.urban, p.sub_district, p.city, pr.province_name FROM postal_code_data p LEFT JOIN province_data pr ON p.province_code = pr.province_code LIMIT 10'
  );
  console.log('\n=== Joined samples ===');
  console.log(JSON.stringify(joined, (k, v) => typeof v === 'bigint' ? Number(v) : v, 2));

  // Test lookup by postal code
  const lookup = await p.$queryRawUnsafe(
    "SELECT p.postal_code, p.urban, p.sub_district, p.city, pr.province_name FROM postal_code_data p LEFT JOIN province_data pr ON p.province_code = pr.province_code WHERE p.postal_code = '15560'"
  );
  console.log('\n=== Lookup 15560 ===');
  console.log(JSON.stringify(lookup, (k, v) => typeof v === 'bigint' ? Number(v) : v, 2));

  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
