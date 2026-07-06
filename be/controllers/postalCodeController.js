const prisma = require('../utils/prisma');

function serializeBigInt(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? item.toString() : item)));
}

async function lookup(req, res, next) {
  try {
    const code = String(req.params.code || '').replace(/\D/g, '');
    if (code.length !== 5) return res.status(400).json({ success: false, message: 'Kode pos harus 5 digit' });

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        p.postal_code AS postalCode,
        p.urban AS kelurahan,
        p.sub_district AS kecamatan,
        p.city AS kota,
        pr.province_name AS provinsi
      FROM postal_code_data p
      LEFT JOIN province_data pr ON pr.province_code = p.province_code
      WHERE p.postal_code = ?
      ORDER BY p.urban ASC
    `, code);

    res.json({ success: true, message: 'Data kode pos ditemukan', data: serializeBigInt(rows) });
  } catch (error) {
    if (String(error.message || '').includes('postal_code_data')) {
      return res.json({ success: true, message: 'Data kode pos belum tersedia', data: [] });
    }
    next(error);
  }
}

module.exports = { lookup };
