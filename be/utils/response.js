/**
 * Response helpers untuk format API response yang konsisten
 */

function success(res, message, data = null, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

function error(res, message, status = 400) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function created(res, message, data = null) {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
}

function notFound(res, message = 'Data tidak ditemukan') {
  return res.status(404).json({
    success: false,
    message,
  });
}

function unauthorized(res, message = 'Tidak memiliki akses') {
  return res.status(401).json({
    success: false,
    message,
  });
}

function forbidden(res, message = 'Akses ditolak') {
  return res.status(403).json({
    success: false,
    message,
  });
}

module.exports = { success, error, created, notFound, unauthorized, forbidden };
