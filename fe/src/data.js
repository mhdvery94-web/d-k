const FOOD_IMAGES = {
  'ayam-geprek': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop&auto=format',
  'rice-bowl': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&auto=format',
  'nasi-bakar': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=300&fit=crop&auto=format',
  'ayam-bakar': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=300&h=300&fit=crop&auto=format',
  'mie-goreng': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop&auto=format',
  'es-teh': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop&auto=format',
  'es-jeruk': 'https://images.unsplash.com/photo-1621506289937-a8e192dfd7f0?w=300&h=300&fit=crop&auto=format',
  'kopi': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=300&fit=crop&auto=format',
  'milkshake': 'https://images.unsplash.com/photo-1572490122747-3968b75bfb32?w=300&h=300&fit=crop&auto=format',
  'dimsum': 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=300&h=300&fit=crop&auto=format',
  'snack-mix': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&h=300&fit=crop&auto=format',
  'pisang-goreng': 'https://images.unsplash.com/photo-1605197583012-e770a4ab933d?w=300&h=300&fit=crop&auto=format',
  'risol': 'https://images.unsplash.com/photo-1603073163308-9654c3fb70b5?w=300&h=300&fit=crop&auto=format',
  'default': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop&auto=format',
};

export function getMenuImage(key) {
  if (!key) return FOOD_IMAGES.default;
  if (key.startsWith('data:') || key.startsWith('http') || key.startsWith('/')) return key;
  return FOOD_IMAGES[key] || FOOD_IMAGES.default;
}

export function resizeImage(file, maxW = 300, maxH = 300, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#F1F5F9" width="200" height="200"/><text x="100" y="108" text-anchor="middle" fill="#64748B" font-size="32" font-family="Arial, sans-serif" font-weight="700">DK</text></svg>'
);

export function money(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatPhoneDisplay(phone) {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^(62|0)/, '');
  if (!digits) return '';
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11), digits.slice(11)].filter(Boolean).join('-');
}

export function validatePhoneInput(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const normalized = digits.replace(/^62/, '').replace(/^0/, '');
  const isValid = /^8\d{8,11}$/.test(normalized);
  return {
    isValid,
    formatted: isValid ? formatPhoneDisplay(normalized) : '',
    e164: isValid ? `+62${normalized}` : '',
    error: isValid ? '' : 'Nomor HP tidak valid (contoh: +62 812-3456-7890)',
  };
}

export function newId() {
  return Date.now();
}

export const IMAGE_KEYS = Object.keys(FOOD_IMAGES).filter((k) => k !== 'default');
