/**
 * Helper untuk generate nomor order: YYMMDD + letter sequence
 * Contoh: 250705A, 250705B, 250705AA
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

// Format: YYYYMMDD-NNN-X (tahun-bulan-tanggal-increment-huruf acak)
function formatOrderNumber(datePrefix, sequenceNumber) {
  const num = String(sequenceNumber).padStart(3, '0');
  return `${datePrefix}-${num}-${randomLetter()}`;
}

module.exports = { numberToLetters, getDatePrefix, randomLetter, formatOrderNumber };
