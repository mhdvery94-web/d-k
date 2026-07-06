const p = require('../utils/prisma');
(async () => {
  try {
    const postal = await p.$queryRawUnsafe('SHOW COLUMNS FROM db_postal_code_data');
    console.log('=== db_postal_code_data columns ===');
    console.log(JSON.stringify(postal, null, 2));

    const prov = await p.$queryRawUnsafe('SHOW COLUMNS FROM db_province_data');
    console.log('=== db_province_data columns ===');
    console.log(JSON.stringify(prov, null, 2));

    const postalSample = await p.$queryRawUnsafe('SELECT * FROM db_postal_code_data LIMIT 3');
    console.log('=== postal sample ===');
    console.log(JSON.stringify(postalSample, null, 2));

    const provSample = await p.$queryRawUnsafe('SELECT * FROM db_province_data LIMIT 3');
    console.log('=== province sample ===');
    console.log(JSON.stringify(provSample, null, 2));

    const cnt = await p.$queryRawUnsafe('SELECT COUNT(*) AS n FROM db_postal_code_data');
    console.log('=== postal count ===', JSON.stringify(cnt, (k, v) => typeof v === 'bigint' ? Number(v) : v));
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
