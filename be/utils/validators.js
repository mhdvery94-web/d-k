/**
 * Validasi helpers untuk input data
 */

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPhone(phone) {
  return Boolean(normalizePhone(phone));
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  let normalized = digits;

  if (normalized.startsWith('62')) normalized = normalized.slice(2);
  if (normalized.startsWith('0')) normalized = normalized.slice(1);

  if (!/^8\d{8,11}$/.test(normalized)) return null;

  return [normalized.slice(0, 3), normalized.slice(3, 7), normalized.slice(7, 11), normalized.slice(11)]
    .filter(Boolean)
    .join('-');
}

function isPositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

function isNonNegativeNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

function isPercentage(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0 && num <= 100;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

function validateMenuData(data) {
  const errors = [];

  if (!data.name || sanitizeString(data.name).length === 0) {
    errors.push('Nama menu harus diisi');
  }

  if (!isPositiveNumber(data.price)) {
    errors.push('Harga harus lebih dari 0');
  }

  if (!isNonNegativeNumber(data.stock)) {
    errors.push('Stock harus 0 atau lebih');
  }

  if (data.discountPercent !== undefined && !isPercentage(data.discountPercent)) {
    errors.push('Diskon harus antara 0-100%');
  }

  return errors;
}

function validateOrderData(data) {
  const errors = [];

  if (!data.customerName || sanitizeString(data.customerName).length === 0) {
    errors.push('Nama pelanggan harus diisi');
  }

  if (!data.customerPhone || !isValidPhone(data.customerPhone)) {
    errors.push('Nomor telepon tidak valid');
  }

  if (!data.customerAddress || sanitizeString(data.customerAddress).length === 0) {
    errors.push('Alamat harus diisi');
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Pesanan minimal 1 item');
  }

  return errors;
}

module.exports = {
  isValidEmail,
  isValidPhone,
  normalizePhone,
  isPositiveNumber,
  isNonNegativeNumber,
  isPercentage,
  sanitizeString,
  validateMenuData,
  validateOrderData,
};
