import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { FALLBACK_IMG, money, formatDate, todayStr } from './data.js';
import { buildStrukPembayaran, buildFormCeklistOps, buildTiketProduksi, buildSlipAlamat, buildNotaRetur, buildLaporanRekap, strukTextToPdf } from './strukTemplates.js';
import jsPDF from 'jspdf';
import './styles.css';

const CATEGORY_ICONS = [
  { code: 'FD', label: 'Makanan', symbol: 'restaurant' },
  { code: 'MN', label: 'Menu', symbol: 'menu_book' },
  { code: 'RB', label: 'Rice Bowl', symbol: 'rice_bowl' },
  { code: 'NS', label: 'Nasi', symbol: 'ramen_dining' },
  { code: 'CK', label: 'Ayam', symbol: 'set_meal' },
  { code: 'ND', label: 'Mie', symbol: 'dinner_dining' },
  { code: 'LM', label: 'Lemon', symbol: 'local_drink' },
  { code: 'OR', label: 'Jeruk', symbol: 'nutrition' },
  { code: 'CF', label: 'Kopi', symbol: 'local_cafe' },
  { code: 'DR', label: 'Minuman', symbol: 'local_bar' },
  { code: 'SN', label: 'Snack', symbol: 'bakery_dining' },
  { code: 'FR', label: 'Gorengan', symbol: 'takeout_dining' },
  { code: 'AP', label: 'Appetizer', symbol: 'tapas' },
  { code: 'BN', label: 'Bakery', symbol: 'cake' },
  { code: 'BG', label: 'Burger', symbol: 'lunch_dining' },
  { code: 'HT', label: 'Hot', symbol: 'local_fire_department' },
  { code: 'PZ', label: 'Pizza', symbol: 'local_pizza' },
  { code: 'PA', label: 'Pasta', symbol: 'restaurant_menu' },
  { code: 'SL', label: 'Salad', symbol: 'eco' },
  { code: 'DS', label: 'Dessert', symbol: 'icecream' },
];

const API_BASE_URL = '/api';
const SELLER_CHECKLIST_STORAGE_KEY = 'dk_seller_checklist_states';

function loadSellerChecklistStates() {
  try {
    return JSON.parse(localStorage.getItem(SELLER_CHECKLIST_STORAGE_KEY) || '{}');
  } catch (err) {
    return {};
  }
}

function ScrollView({ className, children, ...props }) {
  return <div className={`dk-scrollview ${className || ''}`.trim()} {...props}>{children}</div>;
}

function getCategoryIconMeta(code) {
  return CATEGORY_ICONS.find((icon) => icon.code === code) || CATEGORY_ICONS[1];
}

function CategoryVisualIcon({ code, className = '' }) {
  const icon = getCategoryIconMeta(code);
  return <span className={`material-symbols-outlined dk-category-visual-icon ${className}`.trim()}>{icon.symbol}</span>;
}

function getUploadedImageSrc(image) {
  if (!image) return FALLBACK_IMG;
  const value = String(image);
  if (value.startsWith('/api/uploads/')) return value;
  if (value.startsWith('/uploads/')) return `${API_BASE_URL}${value}`;
  if (value.startsWith('uploads/')) return `${API_BASE_URL}/${value}`;
  return FALLBACK_IMG;
}

async function parseApiResponse(response, fallbackMessage) {
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !data.success) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

// Helper function for API calls with JWT
async function apiCall(endpoint, options = {}) {
  const token = sessionStorage.getItem('dk_admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return parseApiResponse(response, 'Terjadi kesalahan pada server');
}

async function uploadMenuImage(file) {
  const token = sessionStorage.getItem('dk_admin_token');
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/menus/upload`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  const data = await parseApiResponse(response, 'Gagal mengupload gambar');

  return data.data.imageUrl;
}

function safeFilePart(value) {
  return String(value || 'dokumen').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function printPdfDoc(doc) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.focus();
      win.print();
    };
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  URL.revokeObjectURL(url);
  doc.save('dokumen.pdf');
}

function ensurePdfSpace(doc, y, needed = 12) {
  if (y + needed <= 282) return y;
  doc.addPage();
  return 18;
}

function drawPdfHeader(doc, title, periodLabel) {
  doc.setDrawColor(0, 103, 105);
  doc.setFillColor(228, 241, 240);
  doc.rect(14, 12, 182, 26, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(36, 49, 47);
  doc.text('DAPUR - KEMAS', 20, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(94, 107, 103);
  doc.text('Aplikasi Pemesanan Makanan', 20, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(36, 49, 47);
  doc.text(title, 190, 23, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(94, 107, 103);
  doc.text(periodLabel, 190, 30, { align: 'right' });
  doc.setTextColor(36, 49, 47);
  return 48;
}

function drawPdfFooter(doc) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(218, 216, 190);
    doc.line(14, 286, 196, 286);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(94, 107, 103);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 291);
    doc.text(`Halaman ${page}/${pages}`, 196, 291, { align: 'right' });
  }
  doc.setTextColor(36, 49, 47);
}

function buildReportPdf({ title, periodLabel, orders, topItems, total }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawPdfHeader(doc, `LAPORAN ${title.toUpperCase()}`, periodLabel);
  const itemCount = orders.reduce((sum, order) => sum + order.items.reduce((sub, item) => sub + item.qty, 0), 0);
  const avg = orders.length ? Math.round(total / orders.length) : 0;

  doc.setFillColor(251, 250, 236);
  doc.setDrawColor(218, 216, 190);
  doc.rect(14, y, 182, 24, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(94, 107, 103);
  doc.text('Jumlah Pesanan', 20, y + 7);
  doc.text('Total Pendapatan', 66, y + 7);
  doc.text('Rata-rata / Pesanan', 116, y + 7);
  doc.text('Item Terjual', 166, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(36, 49, 47);
  doc.text(String(orders.length), 20, y + 16);
  doc.text(money(total), 66, y + 16);
  doc.text(avg ? money(avg) : '-', 116, y + 16);
  doc.text(String(itemCount), 166, y + 16);
  y += 36;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Item Terlaris', 14, y);
  y += 7;
  if (topItems.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    topItems.forEach(([name, qty], index) => {
      y = ensurePdfSpace(doc, y, 7);
      doc.text(`${index + 1}. ${name}`, 16, y);
      doc.text(`${qty} pcs`, 190, y, { align: 'right' });
      y += 6;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Tidak ada data pada periode ini.', 16, y);
    y += 6;
  }

  y += 8;
  y = ensurePdfSpace(doc, y, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Detail Pesanan', 14, y);
  y += 6;
  doc.setFillColor(251, 250, 236);
  doc.setDrawColor(218, 216, 190);
  doc.rect(14, y, 182, 8, 'FD');
  doc.setFontSize(9);
  doc.text('No. Order', 18, y + 5.5);
  doc.text('Tanggal', 70, y + 5.5);
  doc.text('Item', 120, y + 5.5);
  doc.text('Total', 190, y + 5.5, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  orders.forEach((order) => {
    y = ensurePdfSpace(doc, y, 8);
    doc.text(String(order.id), 18, y + 5);
    doc.text(formatDate(order.date), 70, y + 5);
    doc.text(`${order.items.reduce((sum, item) => sum + item.qty, 0)} item`, 120, y + 5);
    doc.text(money(order.total), 190, y + 5, { align: 'right' });
    doc.setDrawColor(218, 216, 190);
    doc.line(14, y + 8, 196, y + 8);
    y += 8;
  });

  if (!orders.length) {
    doc.text('Tidak ada pesanan pada periode ini.', 18, y + 5);
    y += 8;
  }

  y = ensurePdfSpace(doc, y + 4, 10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PENDAPATAN', 120, y + 5);
  doc.text(money(total), 190, y + 5, { align: 'right' });
  drawPdfFooter(doc);
  return doc;
}

/* ── Login Page ── */
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('dk_admin_token', data.token);
        sessionStorage.setItem('dk_admin_user', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(data.message || 'Username atau password salah.');
      }
    } catch (err) {
      setError('Gagal terhubung ke server. Pastikan backend sudah berjalan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dk-login">
      <div className="dk-login-card">
        <div className="dk-login-brand">
          <img src="/icon.png" alt="Dapur Kemas" className="dk-login-logo" />
          <h1>PANEL ADMIN</h1>
        </div>
        <form onSubmit={handleSubmit} className="dk-login-form">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            placeholder="Masukkan username"
            required
            disabled={loading}
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Masukkan password"
            required
            disabled={loading}
          />
          {error && <div className="dk-login-error">{error}</div>}
          <button type="submit" className="dk-btn-pay dk-btn-pay-full" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <div className="dk-login-links">
          <button className="dk-login-link" onClick={() => setShowForgotPassword(true)}>
            Lupa password?
          </button>
          <span className="dk-login-divider">|</span>
          <button className="dk-login-link" onClick={() => setShowForgotUsername(true)}>
            Lupa username?
          </button>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
      {showForgotUsername && (
        <ForgotUsernameModal onClose={() => setShowForgotUsername(false)} />
      )}
    </div>
  );
}

/* ── Forgot Password Modal ── */
function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Kode OTP telah dikirim ke email Anda');
        setStep(2);
      } else {
        setError(data.message || 'Gagal mengirim OTP');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password berhasil direset. Silakan login dengan password baru.');
        setStep(3);
      } else {
        setError(data.message || 'OTP tidak valid');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dk-overlay" onClick={onClose}>
      <div className="dk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dk-modal-header">
          <h2>Lupa Password</h2>
          <button className="dk-modal-close" onClick={onClose}>Tutup</button>
        </div>
        <div className="dk-modal-body">
          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <p>Masukkan email Anda untuk menerima kode OTP</p>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@example.com"
                required
                disabled={loading}
              />
              {error && <div className="dk-login-error">{error}</div>}
              {success && <div className="dk-login-success">{success}</div>}
              <button type="submit" className="dk-btn-pay dk-btn-pay-full" disabled={loading}>
                {loading ? 'Mengirim...' : 'Kirim OTP'}
              </button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <p>Masukkan kode OTP yang dikirim ke email Anda</p>
              <label>Kode OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(''); }}
                placeholder="123456"
                maxLength={6}
                required
                disabled={loading}
              />
              <label>Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
                disabled={loading}
              />
              {error && <div className="dk-login-error">{error}</div>}
              {success && <div className="dk-login-success">{success}</div>}
              <button type="submit" className="dk-btn-pay dk-btn-pay-full" disabled={loading}>
                {loading ? 'Memproses...' : 'Reset Password'}
              </button>
            </form>
          )}
          {step === 3 && (
            <div className="dk-success-message">
              <div className="dk-success-icon">✓</div>
              <p>{success}</p>
              <button className="dk-btn-pay dk-btn-pay-full" onClick={onClose}>
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Forgot Username Modal ── */
function ForgotUsernameModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: result
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Kode OTP telah dikirim ke email Anda');
        setStep(2);
      } else {
        setError(data.message || 'Gagal mengirim OTP');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/get-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.success) {
        setUsername(data.username);
        setStep(3);
      } else {
        setError(data.message || 'OTP tidak valid');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dk-overlay" onClick={onClose}>
      <div className="dk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dk-modal-header">
          <h2>Lupa Username</h2>
          <button className="dk-modal-close" onClick={onClose}>Tutup</button>
        </div>
        <div className="dk-modal-body">
          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <p>Masukkan email Anda untuk menerima kode OTP</p>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@example.com"
                required
                disabled={loading}
              />
              {error && <div className="dk-login-error">{error}</div>}
              {success && <div className="dk-login-success">{success}</div>}
              <button type="submit" className="dk-btn-pay dk-btn-pay-full" disabled={loading}>
                {loading ? 'Mengirim...' : 'Kirim OTP'}
              </button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <p>Masukkan kode OTP yang dikirim ke email Anda</p>
              <label>Kode OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(''); }}
                placeholder="123456"
                maxLength={6}
                required
                disabled={loading}
              />
              {error && <div className="dk-login-error">{error}</div>}
              {success && <div className="dk-login-success">{success}</div>}
              <button type="submit" className="dk-btn-pay dk-btn-pay-full" disabled={loading}>
                {loading ? 'Memproses...' : 'Verifikasi OTP'}
              </button>
            </form>
          )}
          {step === 3 && (
            <div className="dk-success-message">
              <div className="dk-success-icon">✓</div>
              <p>Username Anda adalah:</p>
              <div className="dk-username-display">{username}</div>
              <button className="dk-btn-pay dk-btn-pay-full" onClick={onClose}>
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Header ── */
function Header({ onLogout, onSettings, onHome }) {
  const handleLogout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      sessionStorage.removeItem('dk_admin_token');
      sessionStorage.removeItem('dk_admin_user');
      onLogout();
    }
  };

  return (
    <header className="dk-header admin-header">
      <div className="dk-header-top">
        <button type="button" className="dk-brand-icon dk-brand-home" onClick={onHome} aria-label="Ke dashboard admin"><img src="/icon.png" alt="Dapur Kemas" /></button>
        <div className="dk-brand-title">
          <h1>PANEL ADMIN</h1>
        </div>

        <div className="dk-header-actions">
          <button className="dk-btn-nav dk-btn-nav-icon" onClick={onSettings} title="Pengaturan akun">
            <span className="material-symbols-outlined">settings</span>
          </button>
          
          <button className="dk-btn-nav dk-btn-nav-icon" onClick={handleLogout} title="Keluar">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>

      </div>
    </header>
  );
}

/* ── Settings Modal ── */
function SettingsModal({ onClose, onPasswordChange }) {
  return (
    <div className="dk-overlay" onClick={onClose}>
      <div className="dk-settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Ubah Password Admin</h3>
        <p>Fitur dalam pengembangan.</p>
        <div className="dk-form-actions">
          <button type="button" className="dk-btn-cancel" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value, sub }) {
  return <div className="dk-stat-card"><span className="dk-stat-label">{label}</span><strong className="dk-stat-value">{value}</strong>{sub && <small className="dk-stat-sub">{sub}</small>}</div>;
}

function StatusBadge({ status }) {
  const labels = { confirmed: 'Baru', preparing: 'Diproses', packaging: 'Dikemas', delivering: 'Dikirim', completed: 'Selesai', cancelled: 'Dibatalkan' };
  return <span className={`dk-status-badge ${status}`}>{labels[status] || status}</span>;
}

function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checklistStates, setChecklistStates] = useState(loadSellerChecklistStates);

  useEffect(() => {
    localStorage.setItem(SELLER_CHECKLIST_STORAGE_KEY, JSON.stringify(checklistStates));
  }, [checklistStates]);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (search) params.set('search', search);
      const result = await apiCall(`/orders?${params.toString()}`);
      let list = result.data || [];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const phoneDigits = q.replace(/\D/g, '').replace(/^62/, '').replace(/^0/, '');
        list = list.filter((o) =>
          String(o.orderNumber).toLowerCase().includes(q) ||
          String(o.customerName).toLowerCase().includes(q) ||
          String(o.customerPhone).toLowerCase().includes(q) ||
          (phoneDigits && String(o.customerPhone).replace(/\D/g, '').includes(phoneDigits))
        );
      }
      setOrders(list);
    } catch (err) {
      setError(err.message || 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  const reloadOrdersPage = () => {
    setFilter('');
    setSearch('');
    setExpanded(null);
    loadOrders();
  };

  useEffect(() => {
    loadOrders();
    const id = setInterval(loadOrders, 30000);
    return () => clearInterval(id);
  }, [filter]);

  async function updateStatus(order, status) {
    if (!confirm(`Ubah status ${order.orderNumber} menjadi ${status}?`)) return;
    setLoading(true);
    setError('');
    try {
      await apiCall(`/orders/${order.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Gagal mengubah status pesanan');
    } finally {
      setLoading(false);
    }
  }

  function updateSellerChecklist(orderId, key, checked) {
    setChecklistStates((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [key]: checked,
      },
    }));
  }

  function printStruk(order, type) {
    let text;
    const state = checklistStates[order.id] || {};
    switch (type) {
      case 'pembayaran': text = buildStrukPembayaran(order); break;
      case 'ceklist': text = buildFormCeklistOps(order, state); break;
      case 'tiket': text = buildTiketProduksi(order); break;
      case 'slip': text = buildSlipAlamat(order); break;
      case 'retur': text = buildNotaRetur(order, { reason: prompt('Alasan pembatalan:') || '' }); break;
      default: return;
    }
    const doc = strukTextToPdf(text, type);
    printPdfDoc(doc);
  }

  function saveStruk(order, type) {
    let text;
    const state = checklistStates[order.id] || {};
    switch (type) {
      case 'pembayaran': text = buildStrukPembayaran(order); break;
      case 'ceklist': text = buildFormCeklistOps(order, state); break;
      case 'tiket': text = buildTiketProduksi(order); break;
      case 'slip': text = buildSlipAlamat(order); break;
      case 'retur': text = buildNotaRetur(order, { reason: prompt('Alasan pembatalan:') || '' }); break;
      default: return;
    }
    const doc = strukTextToPdf(text, type);
    doc.save(`struk-${type}-${safeFilePart(order.orderNumber)}.pdf`);
  }

  const nextActions = {
    confirmed: [['preparing', 'Proses Pesanan']],
    preparing: [['packaging', 'Kemas'], ['delivering', 'Kirim Langsung']],
    packaging: [['delivering', 'Kirim']],
    delivering: [['completed', 'Selesai']],
  };

  return (
      <div className="dk-admin-content dk-orders-page">
        <div className="dk-admin-toolbar dk-orders-toolbar">
        <button className="dk-btn-back" onClick={reloadOrdersPage} title="Muat ulang pesanan">← Reload</button>
        <div className="dk-orders-search-row">
          <input
            className="dk-search-input"
            placeholder="Nomor pesanan / nama / no. HP"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadOrders(); }}
          />
          <button className="dk-btn-outline" onClick={loadOrders}>
            <span className="material-symbols-outlined" style={{fontSize:18}}>search</span>
          </button>
        </div>
        <select className="dk-order-filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="confirmed">Baru</option>
          <option value="packaging">Dikemas</option>
          <option value="delivering">Dikirim</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {error && <div className="dk-login-error">{error}</div>}
      {loading && <p className="dk-admin-loading">Memuat pesanan...</p>}

      <ScrollView className="dk-admin-order-list">
        {orders.map((order) => {
          const isOpen = expanded === order.id;
          const checklistState = checklistStates[order.id] || {};
          return (
            <article key={order.id} className="dk-order-card dk-admin-order-card">
              <button className="dk-order-head dk-admin-order-head" onClick={() => setExpanded(isOpen ? null : order.id)}>
                <div className="dk-admin-order-title">
                  <strong>{order.orderNumber}</strong>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="dk-admin-order-summary">
                  <StatusBadge status={order.orderStatus} />
                  <strong>{money(Number(order.total))}</strong>
                </div>
              </button>

              <div className="dk-order-foot dk-admin-order-customer">
                <span>{order.customerName}</span>
                <span>{order.customerPhone}</span>
              </div>

              {isOpen && (
                <div className="dk-order-detail dk-admin-order-detail">
                  <div className="dk-admin-order-address">
                    <strong>Alamat</strong>
                    <p>{order.customerAddress}</p>
                    {order.customerKelurahan && <small>{order.customerKelurahan}, {order.customerKecamatan}, {order.customerKota}, {order.customerProvinsi} {order.customerPostalCode}</small>}
                  </div>

                  <div className="dk-order-items dk-admin-order-items">
                    {order.items?.map((item) => <span key={item.id}>{item.quantity}x {item.menuName} - {money(Number(item.subtotal))}</span>)}
                  </div>

                  <div className="dk-seller-checklist">
                    <strong>Checklist Penjual</strong>
                    <div className="dk-seller-checkline" role="group" aria-label={`Checklist item ${order.orderNumber}`}>
                      {order.items?.map((item) => (
                        <label key={item.id} className="dk-seller-checkbox">
                          <input
                            type="checkbox"
                            checked={!!checklistState[`item-${item.id}`]}
                            onChange={(e) => updateSellerChecklist(order.id, `item-${item.id}`, e.target.checked)}
                          />
                          <span>{item.quantity}x {item.menuName}</span>
                        </label>
                      ))}
                    </div>
                    <div className="dk-seller-checks">
                      <label className="dk-seller-checkbox">
                        <input
                          type="checkbox"
                          checked={!!checklistState.check1}
                          onChange={(e) => updateSellerChecklist(order.id, 'check1', e.target.checked)}
                        />
                        <span>Cek 1 lengkap</span>
                      </label>
                      <label className="dk-seller-checkbox">
                        <input
                          type="checkbox"
                          checked={!!checklistState.check2}
                          onChange={(e) => updateSellerChecklist(order.id, 'check2', e.target.checked)}
                        />
                        <span>Cek 2 packing lengkap</span>
                      </label>
                    </div>
                    <div className="dk-seller-extra-fields">
                      <div className="dk-seller-field">
                        <span className="material-symbols-outlined" style={{fontSize:16}}>badge</span>
                        <input
                          type="text"
                          placeholder="Nama Petugas 1"
                          value={checklistState.officer1 || ''}
                          onChange={(e) => updateSellerChecklist(order.id, 'officer1', e.target.value)}
                        />
                      </div>
                      <div className="dk-seller-field">
                        <span className="material-symbols-outlined" style={{fontSize:16}}>badge</span>
                        <input
                          type="text"
                          placeholder="Nama Petugas 2"
                          value={checklistState.officer2 || ''}
                          onChange={(e) => updateSellerChecklist(order.id, 'officer2', e.target.value)}
                        />
                      </div>
                      <div className="dk-seller-field dk-seller-field-full">
                        <span className="material-symbols-outlined" style={{fontSize:16}}>notes</span>
                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={checklistState.notes || ''}
                          onChange={(e) => updateSellerChecklist(order.id, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="dk-admin-actions dk-admin-order-actions">
                    <select className="dk-struk-select" defaultValue="" onChange={(e) => { if (e.target.value) { printStruk(order, e.target.value); e.target.value = ''; } }}>
                      <option value="" disabled>Cetak Struk...</option>
                      <option value="pembayaran">Struk Pembayaran</option>
                      <option value="ceklist">Ceklist Pesanan</option>
                      <option value="tiket">Tiket Produksi</option>
                      <option value="slip">Slip Alamat</option>
                      {order.orderStatus === 'cancelled' && <option value="retur">Nota Retur</option>}
                    </select>
                    <select className="dk-struk-select" defaultValue="" onChange={(e) => { if (e.target.value) { saveStruk(order, e.target.value); e.target.value = ''; } }}>
                      <option value="" disabled>Simpan PDF...</option>
                      <option value="pembayaran">Struk Pembayaran</option>
                      <option value="ceklist">Ceklist Pesanan</option>
                      <option value="tiket">Tiket Produksi</option>
                      <option value="slip">Slip Alamat</option>
                      {order.orderStatus === 'cancelled' && <option value="retur">Nota Retur</option>}
                    </select>
                    {(nextActions[order.orderStatus] || []).map(([status, label]) => (
                      <button key={status} className="dk-btn-order-action dk-btn-order-success" onClick={() => updateStatus(order, status)}>{label}</button>
                    ))}
                    {!['completed', 'cancelled'].includes(order.orderStatus) && <button className="dk-btn-order-action dk-btn-order-danger" onClick={() => updateStatus(order, 'cancelled')}>Batalkan</button>}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </ScrollView>
    </div>
  );
}

/* ── Menu Form ── */
function MenuForm({ initial, categories, onSave, onCancel, onUploadImage }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    price: initial?.price || '',
    discountPercent: initial?.discountPercent || '',
    stock: initial?.stock || '',
    description: initial?.description || '',
    image: initial?.image || '',
    category: initial?.categoryName || categories[0]?.name || '',
  });
  const [discountEnabled, setDiscountEnabled] = useState(!!(initial?.discountPercent));
  const isEdit = !!initial;

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const discount = discountEnabled ? Number(form.discountPercent) || 0 : null;
      const menuData = {
        name: form.name,
        price: Number(form.price) || 0,
        discountPercent: discount,
  stock: Number(form.stock) || 0,
        description: form.description,
        image: form.image,
 };
      // Only include id for edit (backend generates ID for new menu)
    if (initial?.id) {
        menuData.id = initial.id;
      }
 await onSave(menuData, form.category);
} catch (err) {
      setError(err.message || 'Gagal menyimpan menu');
      setSaving(false);
    }
  };

  return (
    <div className="dk-overlay" onClick={onCancel}>
      <form className="dk-admin-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{isEdit ? 'Edit Menu' : 'Tambah Menu'}</h3>
        <div className="dk-form-icon-row">
          <span className="material-symbols-outlined">category</span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="dk-form-icon-row">
          <span className="material-symbols-outlined">restaurant</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama Menu" required />
        </div>
        <div className="dk-form-icon-row">
          <span className="material-symbols-outlined">payments</span>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Harga (Rp)" required />
        </div>
        <div className="dk-form-icon-row">
          <span className="material-symbols-outlined">inventory_2</span>
          <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stock" required />
        </div>
        <div className="dk-toggle-row">
          <span className="dk-form-icon-label"><span className="material-symbols-outlined">percent</span> Diskon</span>
          <label className="dk-toggle">
            <input type="checkbox" checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)} />
            <span className="dk-toggle-slider"></span>
          </label>
        </div>
        {discountEnabled && (
          <div className="dk-discount-input-row">
            <div className="dk-form-icon-row">
              <span className="material-symbols-outlined">percent</span>
              <input type="number" min="1" max="100" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="Persentase" required />
            </div>
          </div>
        )}
        <div className="dk-form-icon-row dk-form-icon-row-top">
          <span className="material-symbols-outlined">description</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat..." required />
        </div>
        <div className="dk-upload-row" onClick={(e) => e.stopPropagation()}>
          <label className="dk-upload-btn" onClick={(e) => e.stopPropagation()}>
            <span className="material-symbols-outlined" style={{fontSize:18}}>cloud_upload</span>
            {uploading ? 'Mengupload...' : 'Upload Foto'}
            <input type="file" accept="image/*" onClick={(e) => e.stopPropagation()} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploading(true);
                setError('');
                try {
                  const imageUrl = await onUploadImage(file);
                  setForm((prev) => ({ ...prev, image: imageUrl }));
                } catch (err) {
                  setError(err.message || 'Gagal mengupload gambar');
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }
            }} disabled={uploading} hidden />
          </label>
          {form.image && (
            <div className="dk-upload-preview">
              <img src={getUploadedImageSrc(form.image)} alt="Preview menu" onError={(e) => { e.target.src = FALLBACK_IMG; }} />
            </div>
          )}
        </div>
        {error && <div className="dk-form-error">{error}</div>}
        <div className="dk-form-actions">
          <button type="button" className="dk-btn-cancel" onClick={onCancel}>Batal</button>
          <button type="submit" className="dk-btn-save" disabled={saving || uploading}>{saving ? 'Menyimpan...' : (isEdit ? 'Simpan' : 'Tambah')}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Category Form ── */
function CategoryForm({ initial, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(initial || { name: '', icon: 'FD' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ name: form.name.trim(), icon: form.icon });
    } catch (err) {
      setError(err.message || 'Gagal menyimpan kategori');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial || !onDelete || !confirm(`Hapus kategori "${initial.name}"?`)) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(initial.name);
    } catch (err) {
      setError(err.message || 'Gagal menghapus kategori');
      setSaving(false);
    }
  };

  return (
    <div className="dk-overlay" onClick={onCancel}>
      <form className="dk-admin-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{initial ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
        <div className="dk-form-icon-row">
          <span className="material-symbols-outlined">label</span>
          <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }} placeholder="Nama kategori" required disabled={saving} />
        </div>
        <div className="dk-icon-picker">
          {CATEGORY_ICONS.map((icon) => (
            <button
              key={icon.code}
              type="button"
              className={`dk-icon-option ${form.icon === icon.code ? 'dk-icon-selected' : ''}`}
              onClick={() => setForm({ ...form, icon: icon.code })}
              disabled={saving}
              title={icon.label}
            >
              <CategoryVisualIcon code={icon.code} />
              <span>{icon.label}</span>
            </button>
          ))}
        </div>
        {error && <div className="dk-form-error">{error}</div>}
        <div className="dk-form-actions">
          <button type="button" className="dk-btn-cancel" onClick={onCancel} disabled={saving}>Batal</button>
          <button type="submit" className="dk-btn-save" disabled={saving}>{saving ? 'Menyimpan...' : (initial ? 'Simpan' : 'Tambah')}</button>
          {initial && onDelete && (
            <button type="button" className="dk-btn-delete-min" onClick={handleDelete} title="Hapus kategori" disabled={saving}>
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ── Dashboard Stats ── */
function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk mengontrol seksi mana yang terbuka/tertutup
  const [openSection, setOpenSection] = useState({
    status: true,  // Default terbuka
    recent: false, // Default tertutup
    popular: false,
    stock: false
  });

  const toggleSection = (section) => {
    setOpenSection((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const loadStats = async () => {
    try {
      const result = await apiCall('/dashboard/stats');
      setStats(result.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Auto-refresh setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="dk-dashboard-loading">Memuat statistik...</div>;
  }

  if (!stats) {
    return <div className="dk-dashboard-error">Gagal memuat statistik</div>;
  }

  return (
    <div className="dk-dashboard">
      <div className="dk-dashboard-header">
        <h2>Dashboard</h2>
        <button className="dk-btn-refresh" onClick={loadStats}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 2.5V5.5H10.5M2.5 13.5V10.5H5.5M3.5 5.5C4.3 3.9 6 2.8 8 2.8C10.5 2.8 12.5 4.8 12.5 7.3M12.5 10.5C11.7 12.1 10 13.2 8 13.2C5.5 13.2 3.5 11.2 3.5 8.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary Cards - (CSS akan membuatnya jadi 2 baris x 2 kolom) */}
      <div className="dk-dashboard-summary">
        <div className="dk-summary-card">
          <div className="dk-summary-icon">📦</div>
          <div className="dk-summary-content">
            <div className="dk-summary-label">Hari Ini</div>
            <div className="dk-summary-value">{stats.today.orders} pesanan</div>
            <div className="dk-summary-sub">{money(stats.today.revenue)}</div>
          </div>
        </div>

        <div className="dk-summary-card">
          <div className="dk-summary-icon">📊</div>
          <div className="dk-summary-content">
            <div className="dk-summary-label">Minggu Ini</div>
            <div className="dk-summary-value">{stats.week.orders} pesanan</div>
            <div className="dk-summary-sub">{money(stats.week.revenue)}</div>
          </div>
        </div>

        <div className="dk-summary-card">
          <div className="dk-summary-icon">📈</div>
          <div className="dk-summary-content">
            <div className="dk-summary-label">Bulan Ini</div>
            <div className="dk-summary-value">{stats.month.orders} pesanan</div>
            <div className="dk-summary-sub">{money(stats.month.revenue)}</div>
          </div>
        </div>

        <div className="dk-summary-card">
          <div className="dk-summary-icon">💰</div>
          <div className="dk-summary-content">
            <div className="dk-summary-label">Total Pendapatan</div>
            <div className="dk-summary-value">{money(stats.total.revenue)}</div>
            <div className="dk-summary-sub">{stats.total.orders} pesanan</div>
          </div>
        </div>
      </div>

      {/* Accordion / Listing Sections */}
      <div className="dk-dashboard-accordion">
        
        {/* 1. Status Pesanan */}
        <div className="dk-accordion-item">
          <span className="dk-accordion-header" onClick={() => toggleSection('status')}>
            <span>1. Status Pesanan</span>
            <span className="dk-accordion-icon">{openSection.status ? '▼' : '▶'}</span>
          </span>
          {openSection.status && (
            <div className="dk-accordion-content">
              <div className="dk-status-grid">
                <div className="dk-status-item">
                  <div className="dk-status-badge dk-status-pending">{stats.status.pending}</div>
                  <div className="dk-status-label">Menunggu</div>
                </div>
                <div className="dk-status-item">
                  <div className="dk-status-badge dk-status-preparing">{stats.status.preparing}</div>
                  <div className="dk-status-label">Diproses</div>
                </div>
                <div className="dk-status-item">
                  <div className="dk-status-badge dk-status-delivering">{stats.status.delivering}</div>
                  <div className="dk-status-label">Dikirim</div>
                </div>
                <div className="dk-status-item">
                  <div className="dk-status-badge dk-status-completed">{stats.status.completedToday}</div>
                  <div className="dk-status-label">Selesai Hari Ini</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Pesanan Terbaru */}
        <div className="dk-accordion-item">
          <span className="dk-accordion-header" onClick={() => toggleSection('recent')}>
            <span>2. Pesanan Terbaru</span>
            <span className="dk-accordion-icon">{openSection.recent ? '▼' : '▶'}</span>
          </span>
          {openSection.recent && (
            <div className="dk-accordion-content">
              <div className="dk-recent-orders">
                {stats.recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="dk-recent-order-item">
                    <div className="dk-recent-order-info">
                      <div className="dk-recent-order-number">{order.orderNumber}</div>
                      <div className="dk-recent-order-customer">{order.customerName}</div>
                    </div>
                    <div className="dk-recent-order-details">
                      <div className="dk-recent-order-total">{money(order.total)}</div>
                      <div className={`dk-recent-order-status dk-status-${order.status}`}>{order.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Menu Terlaris */}
        <div className="dk-accordion-item">
          <span className="dk-accordion-header" onClick={() => toggleSection('popular')}>
            <span>3. Menu Terlaris</span>
            <span className="dk-accordion-icon">{openSection.popular ? '▼' : '▶'}</span>
          </span>
          {openSection.popular && (
            <div className="dk-accordion-content">
              <div className="dk-popular-menus">
                {stats.popularMenus.map((menu, index) => (
                  <div key={menu.id} className="dk-popular-menu-item">
                    <div className="dk-popular-rank">#{index + 1}</div>
                    <div className="dk-popular-name">{menu.name}</div>
                    <div className="dk-popular-qty">{menu.quantity} terjual</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Stok Menipis */}
        {stats.lowStockMenus.length > 0 && (
          <div className="dk-accordion-item dk-warning-item">
            <span className="dk-accordion-header" onClick={() => toggleSection('stock')}>
              <span>4. ⚠️ Stok Menipis</span>
              <span className="dk-accordion-icon">{openSection.stock ? '▼' : '▶'}</span>
            </span>
            {openSection.stock && (
              <div className="dk-accordion-content">
                <div className="dk-low-stock-list">
                  {stats.lowStockMenus.map((menu) => (
                    <div key={menu.id} className="dk-low-stock-item">
                      <div className="dk-low-stock-name">{menu.name}</div>
                      <div className="dk-low-stock-qty">{menu.stock} tersisa</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Admin Dashboard ── */
/* ── Settings Panel (Zona Ongkir + Pengaturan Toko) ── */
function SettingsPanel() {
  const [zones, setZones] = useState([]);
  const [settings, setSettings] = useState({ packingFee: 0, waAdmin: '', storeAddress: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editZone, setEditZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({ kodeZona: '', jarakMin: '', jarakMax: '', tarif: '' });

  const loadZones = async () => {
    try {
      const res = await apiCall('/shipping-zones');
      setZones(res.data || []);
    } catch (err) { setError(err.message); }
  };

  const loadSettings = async () => {
    try {
      const res = await apiCall('/settings');
      if (res.data) setSettings(res.data);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => {
    Promise.all([loadZones(), loadSettings()]).finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setError(''); setNotice('');
    try {
      await apiCall('/settings', { method: 'PUT', body: JSON.stringify({ packingFee: Number(settings.packingFee), waAdmin: settings.waAdmin, storeAddress: settings.storeAddress }) });
      setNotice('Pengaturan disimpan');
      await loadSettings();
    } catch (err) { setError(err.message); }
  };

  const openZoneForm = (zone) => {
    if (zone) {
      setEditZone(zone);
      setZoneForm({ kodeZona: zone.kodeZona, jarakMin: String(zone.jarakMin), jarakMax: zone.jarakMax != null ? String(zone.jarakMax) : '', tarif: String(zone.tarif) });
    } else {
      setEditZone(null);
      setZoneForm({ kodeZona: '', jarakMin: '', jarakMax: '', tarif: '' });
    }
  };

  const saveZone = async () => {
    setError(''); setNotice('');
    const payload = {
      kodeZona: zoneForm.kodeZona,
      jarakMin: parseFloat(zoneForm.jarakMin),
      jarakMax: zoneForm.jarakMax ? parseFloat(zoneForm.jarakMax) : null,
      tarif: parseInt(zoneForm.tarif, 10),
    };
    try {
      if (editZone) {
        await apiCall(`/shipping-zones/${editZone.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiCall('/shipping-zones', { method: 'POST', body: JSON.stringify(payload) });
      }
      setNotice(editZone ? 'Zona diperbarui' : 'Zona ditambahkan');
      setEditZone(null);
      setZoneForm({ kodeZona: '', jarakMin: '', jarakMax: '', tarif: '' });
      await loadZones();
    } catch (err) { setError(err.message); }
  };

  const deleteZone = async (id) => {
    if (!confirm('Hapus zona ini?')) return;
    try {
      await apiCall(`/shipping-zones/${id}`, { method: 'DELETE' });
      setNotice('Zona dihapus');
      await loadZones();
    } catch (err) { setError(err.message); }
  };

  const toggleZone = async (id) => {
    try {
      await apiCall(`/shipping-zones/${id}/toggle`, { method: 'PATCH' });
      await loadZones();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="dk-admin-content"><p className="dk-admin-loading">Memuat pengaturan...</p></div>;

  return (
    <div className="dk-admin-content">
      {error && <div className="dk-login-error dk-admin-feedback">{error}</div>}
      {notice && <div className="dk-login-success dk-admin-feedback">{notice}</div>}

      <h3 style={{ margin: '0 0 12px' }}>Zona Ongkir</h3>
      <table className="dk-admin-table">
        <thead><tr><th>Kode</th><th>Jarak Min</th><th>Jarak Max</th><th>Tarif</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {zones.map(z => (
            <tr key={z.id}>
              <td><strong>{z.kodeZona}</strong></td>
              <td>{z.jarakMin} km</td>
              <td>{z.jarakMax != null ? `${z.jarakMax} km` : '∞'}</td>
              <td>{money(z.tarif)}</td>
              <td><span className={z.isActive ? 'dk-status-badge dk-status-completed' : 'dk-status-badge dk-status-cancelled'}>{z.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
              <td>
                <div className="dk-admin-actions">
                  <button className="dk-btn-edit" title="Edit" onClick={() => openZoneForm(z)}><span className="material-symbols-outlined" style={{fontSize:18}}>edit</span></button>
                  <button className="dk-btn-outline" title="Toggle" onClick={() => toggleZone(z.id)}>{z.isActive ? 'Off' : 'On'}</button>
                  <button className="dk-btn-delete-min" title="Hapus" onClick={() => deleteZone(z.id)}><span className="material-symbols-outlined" style={{fontSize:18}}>delete</span></button>
                </div>
              </td>
            </tr>
          ))}
          {zones.length === 0 && <tr><td colSpan={6} className="dk-admin-empty">Belum ada zona ongkir</td></tr>}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div><label style={{ fontSize: 12 }}>Kode</label><input className="dk-form-input" style={{ width: 60 }} value={zoneForm.kodeZona} onChange={e => setZoneForm(f => ({ ...f, kodeZona: e.target.value }))} placeholder="Z5" /></div>
        <div><label style={{ fontSize: 12 }}>Min (km)</label><input className="dk-form-input" style={{ width: 70 }} type="number" value={zoneForm.jarakMin} onChange={e => setZoneForm(f => ({ ...f, jarakMin: e.target.value }))} /></div>
        <div><label style={{ fontSize: 12 }}>Max (km)</label><input className="dk-form-input" style={{ width: 70 }} type="number" value={zoneForm.jarakMax} onChange={e => setZoneForm(f => ({ ...f, jarakMax: e.target.value }))} placeholder="∞" /></div>
        <div><label style={{ fontSize: 12 }}>Tarif (Rp)</label><input className="dk-form-input" style={{ width: 90 }} type="number" value={zoneForm.tarif} onChange={e => setZoneForm(f => ({ ...f, tarif: e.target.value }))} /></div>
        <button className="dk-btn-primary" onClick={saveZone}>{editZone ? 'Update' : 'Tambah'} Zona</button>
        {editZone && <button className="dk-btn-outline" onClick={() => { setEditZone(null); setZoneForm({ kodeZona: '', jarakMin: '', jarakMax: '', tarif: '' }); }}>Batal</button>}
      </div>

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #BDC9C8' }} />

      <h3 style={{ margin: '0 0 12px' }}>Pengaturan Toko</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
        <div><label style={{ fontSize: 12 }}>Biaya Packing (Rp)</label><input className="dk-form-input" type="number" value={settings.packingFee} onChange={e => setSettings(s => ({ ...s, packingFee: e.target.value }))} /></div>
        <div><label style={{ fontSize: 12 }}>No. WA Admin</label><input className="dk-form-input" value={settings.waAdmin} onChange={e => setSettings(s => ({ ...s, waAdmin: e.target.value }))} /></div>
        <div><label style={{ fontSize: 12 }}>Alamat Toko</label><input className="dk-form-input" value={settings.storeAddress} onChange={e => setSettings(s => ({ ...s, storeAddress: e.target.value }))} /></div>
        <div style={{ fontSize: 12, color: '#6E7979' }}>Koordinat toko (lat/lng) diatur via .env di server, bukan di sini.</div>
        <button className="dk-btn-primary" onClick={saveSettings} style={{ alignSelf: 'flex-start' }}>Simpan Pengaturan</button>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout, onSettings }) {
  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reportOrders, setReportOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  const [tab, setTab] = useState('dashboard');
  const [activeCat, setActiveCat] = useState('');
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [reportDate, setReportDate] = useState(todayStr());
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [orderSearch, setOrderSearch] = useState('');
  const [menuError, setMenuError] = useState('');
  const [menuNotice, setMenuNotice] = useState('');
  const [menuBusy, setMenuBusy] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [reportError, setReportError] = useState('');

  const mapMenusFromApi = (list, categoryList = categories) => {
    const grouped = new Map();
    categoryList.forEach((cat) => grouped.set(cat.name, { ...cat, items: [] }));
    list.forEach((menu) => {
      const cat = menu.category || categoryList.find((item) => item.id === menu.categoryId) || { id: menu.categoryId, name: 'Menu', icon: 'MN' };
      if (!grouped.has(cat.name)) grouped.set(cat.name, { id: cat.id, name: cat.name, icon: cat.icon || 'MN', items: [] });
      grouped.get(cat.name).items.push({
        id: menu.id,
        categoryId: menu.categoryId,
        name: menu.name,
        price: Number(menu.price),
        discountPercent: menu.discountPercent || null,
        stock: menu.stock ?? 0,
        description: menu.description || '',
        image: menu.imageUrl || '',
        categoryName: cat.name,
      });
    });
    return Array.from(grouped.values());
  };

  const loadCategories = async () => {
    const result = await apiCall('/categories');
    const next = (result.data || []).map((cat) => ({ id: cat.id, name: cat.name, icon: cat.icon || 'CT' }));
    setCategories(next);
    if (!activeCat && next[0]) setActiveCat(next[0].name);
    return next;
  };

  const loadMenus = async (categoryList = categories) => {
    const result = await apiCall('/menus');
    setMenus(mapMenusFromApi(result.data || [], categoryList));
  };

  useEffect(() => {
    setMenuLoading(true);
    setMenuError('');
    loadCategories()
      .then((next) => loadMenus(next))
      .catch((err) => setMenuError(err.message || 'Gagal memuat data menu'))
      .finally(() => setMenuLoading(false));
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    loadMenus().catch((err) => setMenuError(err.message || 'Gagal memuat menu'));
  }, [categories.length]);

  useEffect(() => {
    apiCall('/orders')
      .then((result) => {
        const mapped = (result.data || []).map((order) => ({
          id: order.orderNumber,
          date: String(order.createdAt || '').slice(0, 10),
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          status: order.orderStatus,
          items: (order.items || []).map((item) => ({ name: item.menuName, qty: item.quantity })),
          total: Number(order.total),
        }));
        setOrders(mapped);
      })
      .catch(() => {});
  }, []);

  // SSE connection for real-time notifications
  useEffect(() => {
    const token = sessionStorage.getItem('dk_admin_token');
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/notifications/stream?token=${token}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_order') {
          // Refresh orders when new order arrives
          apiCall('/orders')
            .then((result) => {
              const mapped = (result.data || []).map((order) => ({
                id: order.orderNumber,
                date: String(order.createdAt || '').slice(0, 10),
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                status: order.orderStatus,
                items: (order.items || []).map((item) => ({ name: item.menuName, qty: item.quantity })),
                total: Number(order.total),
              }));
              setOrders(mapped);
            })
            .catch(() => {});
          
          // Show notification (you can enhance this with a toast notification)
          console.log('New order received:', data.data);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      if (eventSource.readyState === EventSource.CLOSED) {
        console.warn('SSE connection closed:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const category = menus.find((c) => c.name === activeCat);

  useEffect(() => {
    if (!activeCat && menus[0]) setActiveCat(menus[0].name);
    if (activeCat && menus.length && !menus.some((cat) => cat.name === activeCat)) setActiveCat(menus[0].name);
  }, [menus, activeCat]);

  function getWeekRange(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
  }

  function getMonthRange(dateStr) {
    const d = new Date(dateStr);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`;
    return { start, end };
  }

  function getYearRange(dateStr) {
    const year = new Date(dateStr).getFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }

  function getReportRange() {
    if (reportPeriod === 'daily') return { start: reportDate, end: reportDate };
    if (reportPeriod === 'weekly') return getWeekRange(reportDate);
    if (reportPeriod === 'monthly') return getMonthRange(reportDate);
    return getYearRange(reportDate);
  }

  function getReportPeriodLabel() {
    if (reportPeriod === 'daily') return formatDate(reportDate);
    if (reportPeriod === 'weekly') {
      const { start, end } = getWeekRange(reportDate);
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    if (reportPeriod === 'monthly') {
      return new Date(reportDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
    }
    return String(new Date(reportDate).getFullYear());
  }

  useEffect(() => {
    setReportError('');
    const { start, end } = getReportRange();
    apiCall(`/reports/sales?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`)
      .then((result) => {
        const mapped = (result.data?.orders || []).map((order) => ({
          id: order.orderNumber,
          date: String(order.createdAt || '').slice(0, 10),
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          status: order.orderStatus,
          items: (order.items || []).map((item) => ({ name: item.menuName, qty: item.quantity })),
          total: Number(order.total),
        }));
        setReportOrders(mapped);
      })
      .catch((err) => {
        setReportOrders([]);
        setReportError(err.message || 'Gagal memuat laporan');
      });
  }, [reportPeriod, reportDate]);

  let filteredOrders;
  let reportTitle;

  if (reportPeriod === 'daily') {
    filteredOrders = reportOrders;
    reportTitle = 'Harian';
  } else if (reportPeriod === 'weekly') {
    const { start, end } = getWeekRange(reportDate);
    filteredOrders = reportOrders;
    reportTitle = 'Mingguan';
  } else if (reportPeriod === 'monthly') {
    const { start, end } = getMonthRange(reportDate);
    filteredOrders = reportOrders;
    reportTitle = 'Bulanan';
  } else {
    filteredOrders = reportOrders;
    reportTitle = 'Tahunan';
  }

  if (orderSearch.trim()) {
    filteredOrders = filteredOrders.filter((o) => String(o.id).includes(orderSearch.trim()));
  }
  const reportTotal = filteredOrders.reduce((s, o) => s + o.total, 0);
  const reportItems = {};
  filteredOrders.forEach((o) => o.items.forEach((item) => { reportItems[item.name] = (reportItems[item.name] || 0) + item.qty; }));
  const sortedReportItems = Object.entries(reportItems).sort((a, b) => b[1] - a[1]);

  const totalOrdersAll = orders.length;
  const totalRevenueAll = orders.reduce((s, o) => s + o.total, 0);
  const totalItemsAll = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.qty, 0), 0);

  const toMenuPayload = (data, catName) => {
    const category = categories.find((cat) => cat.name === catName);
    const imageUrl = data.image && String(data.image).length <= 500 ? data.image : null;
    return {
      categoryId: category?.id,
      name: data.name,
      price: data.price,
      discountPercent: data.discountPercent || 0,
      stock: data.stock,
      description: data.description || '',
      imageUrl,
    };
  };

  const addMenu = async (data, catName) => {
    setMenuBusy(true);
    setMenuError('');
    setMenuNotice('');
    try {
      await apiCall('/menus', { method: 'POST', body: JSON.stringify(toMenuPayload(data, catName)) });
      await loadMenus();
      setMenuNotice('Menu berhasil ditambahkan.');
    } catch (err) {
      setMenuError(err.message || 'Gagal menambahkan menu');
      throw err;
    } finally {
      setMenuBusy(false);
    }
  };

  const editMenu = async (id, data, catName) => {
    setMenuBusy(true);
    setMenuError('');
    setMenuNotice('');
    try {
      await apiCall(`/menus/${id}`, { method: 'PUT', body: JSON.stringify(toMenuPayload(data, catName)) });
      await loadMenus();
      setMenuNotice('Menu berhasil diperbarui.');
    } catch (err) {
      setMenuError(err.message || 'Gagal memperbarui menu');
      throw err;
    } finally {
      setMenuBusy(false);
    }
  };

  const deleteMenu = async (id) => {
    setMenuBusy(true);
    setMenuError('');
    setMenuNotice('');
    try {
      await apiCall(`/menus/${id}`, { method: 'DELETE' });
      await loadMenus();
      setMenuNotice('Menu berhasil dihapus.');
    } catch (err) {
      setMenuError(err.message || 'Gagal menghapus menu');
    } finally {
      setMenuBusy(false);
    }
  };

  const addCategory = async (data) => {
    setMenuBusy(true);
    setMenuError('');
    setMenuNotice('');
    try {
      await apiCall('/categories', { method: 'POST', body: JSON.stringify(data) });
      const next = await loadCategories();
      setActiveCat(data.name);
      await loadMenus(next);
      setMenuNotice('Kategori berhasil ditambahkan.');
    } catch (err) {
      setMenuError(err.message || 'Gagal menambahkan kategori');
      throw err;
    } finally {
      setMenuBusy(false);
    }
  };

  const editCategory = async (oldName, data) => {
    const category = categories.find((cat) => cat.name === oldName);
    if (!category) throw new Error('Kategori tidak ditemukan');
    setMenuBusy(true);
    setMenuError('');
    setMenuNotice('');
    try {
      await apiCall(`/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(data) });
      const next = await loadCategories();
      setActiveCat(data.name);
      await loadMenus(next);
      setMenuNotice('Kategori berhasil diperbarui.');
    } catch (err) {
      setMenuError(err.message || 'Gagal memperbarui kategori');
      throw err;
    } finally {
      setMenuBusy(false);
    }
  };

  const deleteCategory = async (catName) => {
    const category = categories.find((cat) => cat.name === catName);
    if (!category) throw new Error('Kategori tidak ditemukan');
    setMenuBusy(true);
    setMenuError('');
    setMenuNotice('');
    try {
      await apiCall(`/categories/${category.id}`, { method: 'DELETE' });
      const next = await loadCategories();
      if (next.length > 0) {
        setActiveCat(next[0].name);
      }
      await loadMenus(next);
      setMenuNotice('Kategori berhasil dihapus.');
    } catch (err) {
      setMenuError(err.message || 'Gagal menghapus kategori');
      throw err;
    } finally {
      setMenuBusy(false);
    }
  };

  const createCurrentReportPdf = () => buildReportPdf({
    title: reportTitle,
    periodLabel: getReportPeriodLabel(),
    orders: filteredOrders,
    topItems: sortedReportItems,
    total: reportTotal,
  });

  const handleDownloadPDF = () => {
    const { start, end } = getReportRange();
    createCurrentReportPdf().save(`laporan-${reportPeriod}-${start}-sampai-${end}.pdf`);
  };

  const handlePrint = () => {
    printPdfDoc(createCurrentReportPdf());
  };

  return (
    <div className="dk-app dk-app-admin">
      <Header onLogout={onLogout} onSettings={onSettings} onHome={() => setTab('dashboard')} />

      <div className="dk-admin">
        <div className="dk-admin-nav">
          <button className={`dk-admin-nav-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
            Dashboard
          </button>
          <button className={`dk-admin-nav-btn ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
            Pesanan
          </button>
          <button className={`dk-admin-nav-btn ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4H16M2 9H16M2 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Kelola Menu
          </button>
          <button className={`dk-admin-nav-btn ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 13L7 9L10 11L13 6M13 6H10M13 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="1" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/></svg>
            Laporan
          </button>
          <button className={`dk-admin-nav-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Pengaturan
          </button>
        </div>

        {tab === 'dashboard' && (
          <div className="dk-admin-content">
            <DashboardStats />
          </div>
        )}

        {tab === 'orders' && <OrderManager />}

        {tab === 'menu' && (
          <div className="dk-admin-content">
            {menuError && <div className="dk-login-error dk-admin-feedback">{menuError}</div>}
            {menuNotice && <div className="dk-login-success dk-admin-feedback">{menuNotice}</div>}
            {menuLoading && <p className="dk-admin-loading">Memuat menu dan kategori...</p>}
            <div className="dk-admin-toolbar dk-menu-toolbar">
              <button className="dk-btn-outline dk-menu-toolbar-btn" onClick={() => { setMenuError(''); setMenuNotice(''); setEditingCat(null); setShowCatForm(true); }} disabled={menuBusy}>
                <span className="material-symbols-outlined" style={{fontSize:16}}>add</span> Kategori
              </button>
              <ScrollView className="dk-category-span-list" aria-label="Kategori menu">
                {menus.map((cat) => (
                  <span
                    role="button"
                    tabIndex={menuBusy ? -1 : 0}
                    key={cat.name}
                    className={`dk-category-span ${activeCat === cat.name ? 'dk-category-span-active' : ''}`}
                    onClick={() => { if (!menuBusy) setActiveCat(cat.name); }}
                    onKeyDown={(e) => { if (!menuBusy && (e.key === 'Enter' || e.key === ' ')) setActiveCat(cat.name); }}
                    aria-disabled={menuBusy}
                  >
                    <span className="dk-category-span-main"><CategoryVisualIcon code={cat.icon} /> {cat.name}</span>
                    <small>{cat.items.length}</small>
                    <span className="dk-category-span-edit" onClick={(e) => { e.stopPropagation(); setMenuError(''); setMenuNotice(''); setEditingCat(cat); setShowCatForm(true); }} title="Edit">
                      <span className="material-symbols-outlined" style={{fontSize:14}}>edit</span>
                    </span>
                  </span>
                ))}
              </ScrollView>
              <button className="dk-btn-primary dk-menu-toolbar-btn" onClick={() => { setMenuError(''); setMenuNotice(''); setEditingMenu(null); setShowMenuForm(true); }} disabled={menuBusy || !categories.length}>
                <span className="material-symbols-outlined" style={{fontSize:16}}>add</span> Tambah Menu
              </button>
            </div>
            {category && (
              <ScrollView className="dk-menu-table-scroll">
                <table className="dk-admin-table">
                  <thead>
                    <tr>
                      <th>Gambar</th>
                      <th>Nama</th>
                      <th>Harga</th>
                      <th>Diskon</th>
                      <th>Stock</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.items.length === 0 ? (
                      <tr><td colSpan={6} className="dk-admin-empty">Belum ada menu di kategori ini</td></tr>
                    ) : (
                      category.items.map((item) => (
                        <tr key={item.id}>
                          <td><img className="dk-admin-thumb" src={getUploadedImageSrc(item.image)} alt="" onError={(e) => { e.target.src = FALLBACK_IMG; }} /></td>
                          <td><strong>{item.name}</strong></td>
                          <td>{money(item.price)}</td>
                          <td>{item.discountPercent ? <span className="dk-discount-badge">{item.discountPercent}%</span> : '-'}</td>
                          <td>{item.stock <= 0 ? <span className="dk-stock-badge">Habis</span> : item.stock}</td>
                          <td>
                            <div className="dk-admin-actions">
                              <button className="dk-btn-edit" title="Edit" onClick={() => { setEditingMenu(item); setShowMenuForm(true); }}>
                                <span className="material-symbols-outlined" style={{fontSize:18}}>edit</span>
                              </button>
                              <button className="dk-btn-delete-min" title="Hapus" onClick={() => { if (confirm(`Hapus "${item.name}"?`)) deleteMenu(item.id, activeCat); }}>
                                <span className="material-symbols-outlined" style={{fontSize:18}}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollView>
            )}
          </div>
        )}

        {tab === 'report' && (
          <div className="dk-admin-content">
            {/* Toolbar (tidak ikut cetak) */}
            {reportError && <div className="dk-login-error dk-admin-feedback">{reportError}</div>}
            <div className="dk-report-toolbar dk-report-control-panel no-print">
              <div className="dk-report-filter-group">
                <label className="dk-report-filter-label" htmlFor="report-period">Periode</label>
                <select
                  id="report-period"
                  className="dk-report-select"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                  <option value="yearly">Tahunan</option>
                </select>
              </div>
              <div className="dk-report-action-grid">
                <button className="dk-btn-order-action dk-btn-order-secondary" onClick={handlePrint}>
                  <span className="material-symbols-outlined" style={{fontSize:16}}>print</span> Cetak PDF
                </button>
                <button className="dk-btn-order-action dk-btn-order-primary" onClick={handleDownloadPDF}>
                  <span className="material-symbols-outlined" style={{fontSize:16}}>download</span> Simpan PDF
                </button>
                <button className="dk-btn-order-action dk-btn-order-secondary" onClick={async () => {
                  const { start, end } = getReportRange();
                  try {
                    const res = await apiCall(`/reports/daily-rekap?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
                    const text = buildLaporanRekap(res.data);
                    const doc = strukTextToPdf(text, 'rekap');
                    printPdfDoc(doc);
                  } catch (err) { alert(err.message || 'Gagal cetak rekap'); }
                }}>Cetak Rekap Struk</button>
              </div>
            </div>
            <div className="dk-search-row dk-report-search no-print">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="dk-search-icon"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input
                type="text"
                placeholder="Cari nomor pesanan..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="dk-search-input"
              />
              {orderSearch && (
                <button className="dk-search-clear" onClick={() => setOrderSearch('')}>Clear</button>
              )}
            </div>

            {/* Area yang dicetak */}
            <ScrollView className="dk-report-scroll">
            <div className="dk-report" id="printable-report">
              <div className="dk-report-doc-header">
                <div className="dk-report-doc-brand">
                  <h1>DAPUR - KEMAS</h1>
                  <span>Aplikasi Pemesanan Makanan</span>
                </div>
                <div className="dk-report-doc-title">
                  <strong>LAPORAN {reportTitle.toUpperCase()}</strong>
                  <span>{getReportPeriodLabel()}</span>
                </div>
              </div>

              <div className="dk-report-summary-grid">
                <div className="dk-report-summary-item">
                  <span className="dk-report-summary-label">Jumlah Pesanan</span>
                  <strong className="dk-report-summary-value">{filteredOrders.length}</strong>
                </div>
                <div className="dk-report-summary-item">
                  <span className="dk-report-summary-label">Total Pendapatan</span>
                  <strong className="dk-report-summary-value">{money(reportTotal)}</strong>
                </div>
                <div className="dk-report-summary-item">
                  <span className="dk-report-summary-label">Rata-rata / Pesanan</span>
                  <strong className="dk-report-summary-value">{filteredOrders.length ? money(Math.round(reportTotal / filteredOrders.length)) : '-'}</strong>
                </div>
                <div className="dk-report-summary-item">
                  <span className="dk-report-summary-label">Item Terjual</span>
                  <strong className="dk-report-summary-value">{filteredOrders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.qty, 0), 0)}</strong>
                </div>
              </div>

              <div className="dk-report-section">
                <h3 className="dk-report-section-title">Item Terlaris</h3>
                {sortedReportItems.length > 0 ? (
                  <table className="dk-report-table">
                    <thead><tr><th>No</th><th>Nama Menu</th><th className="dk-text-right">Terjual</th></tr></thead>
                    <tbody>{sortedReportItems.map(([name, qty], i) => <tr key={name}><td>{i + 1}</td><td>{name}</td><td className="dk-text-right">{qty} pcs</td></tr>)}</tbody>
                  </table>
                ) : <p className="dk-report-empty">Tidak ada data pada periode ini.</p>}
              </div>

              <div className="dk-report-section">
                <h3 className="dk-report-section-title">Detail Pesanan</h3>
                {filteredOrders.length > 0 ? (
                  <table className="dk-report-table">
                    <thead><tr><th>No. Order</th><th>Tanggal</th><th>Item</th><th className="dk-text-right">Total</th></tr></thead>
                    <tbody>
                      {filteredOrders.map((o, i) => (
                        <tr key={i}>
                          <td className="dk-report-order-num">{o.id}</td>
                          <td>{formatDate(o.date)}</td>
                          <td>{o.items.reduce((s, it) => s + it.qty, 0)} item</td>
                          <td className="dk-text-right">{money(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="dk-report-total-label">TOTAL PENDAPATAN</td>
                        <td className="dk-text-right dk-report-total-value">{money(reportTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : <p className="dk-report-empty">Tidak ada pesanan pada periode ini.</p>}
              </div>

              <div className="dk-report-doc-footer">
                <span>Dicetak: {new Date().toLocaleString('id-ID')}</span>
                <span>Dapur Kemas - Laporan dibuat otomatis oleh sistem</span>
              </div>
            </div>
            </ScrollView>
          </div>
        )}

        {tab === 'settings' && <SettingsPanel />}
      </div>

      {showMenuForm && (
        <MenuForm
          initial={editingMenu}
          categories={menus}
          onUploadImage={uploadMenuImage}
          onSave={async (data, catName) => { if (editingMenu) await editMenu(editingMenu.id, data, catName); else await addMenu(data, catName); setShowMenuForm(false); setEditingMenu(null); }}
          onCancel={() => { setShowMenuForm(false); setEditingMenu(null); }}
        />
      )}
      {showCatForm && (
        <CategoryForm
    initial={editingCat}
   onSave={async (data) => { if (editingCat) await editCategory(editingCat.name, data); else await addCategory(data); setShowCatForm(false); setEditingCat(null); }}
    onCancel={() => { setShowCatForm(false); setEditingCat(null); }}
      onDelete={async (catName) => { await deleteCategory(catName); setShowCatForm(false); setEditingCat(null); }}
  />
      )}
    </div>
  );
}

/* ── App ── */
function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(sessionStorage.getItem('dk_admin_token')));
  const [showSettings, setShowSettings] = useState(false);

  const handleLogin = () => setAuthenticated(true);

  const handleLogout = () => {
    sessionStorage.removeItem('dk_admin_token');
    sessionStorage.removeItem('dk_admin_user');
    setAuthenticated(false);
    setShowSettings(false);
  };

  const handlePasswordChange = () => {
    setShowSettings(false);
  };

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <AdminDashboard onLogout={handleLogout} onSettings={() => setShowSettings(true)} />
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onPasswordChange={handlePasswordChange} />
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
