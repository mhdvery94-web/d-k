/**
 * Helper untuk generate nomor order produksi.
 * Format baru: DK-YYYYMMDD-NNNN
 * Contoh: DK-20260714-0001
 */

function numberToLetters(num) {
  let result = '';
  let n = num;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

function getDatePrefix(date = new Date()) {
  const now = new Date(date);
  return String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
}

function randomLetter() {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

// Format: DK-YYYYMMDD-NNNN (brand-tahunbulanTanggal-urutan harian)
function formatOrderNumber(datePrefix, sequenceNumber) {
  const num = String(sequenceNumber).padStart(4, '0');
  return `DK-${datePrefix}-${num}`;
}

module.exports = { numberToLetters, getDatePrefix, randomLetter, formatOrderNumber };
