import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getMenuImage, FALLBACK_IMG, money, formatDate, todayStr, IMAGE_KEYS, resizeImage } from './data.js';
import './styles.css';

const ICONS = ['FD','MN','RB','NS','CK','ND','LM','OR','CF','DR','SN','FR','AP','BN','BG','HT','PZ','PA','SL','DS'];

const API_BASE_URL = 'http://localhost:3000/api';

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

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Terjadi kesalahan');
  }

  return data;
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
      const response = await fetch('http://localhost:3000/api/auth/login', {
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
          <img src="/src/assets/icon.png" alt="Dapur Kemas" className="dk-login-logo" />
          <h1>DAPUR - KEMAS</h1>
          <p>Panel Admin</p>
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
      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
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
      const response = await fetch('http://localhost:3000/api/auth/reset-password', {
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
      const response = await fetch('http://localhost:3000/api/auth/forgot-username', {
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
      const response = await fetch('http://localhost:3000/api/auth/get-username', {
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
function Header({ onLogout, onSettings }) {
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
        <div className="dk-brand">
          <span className="dk-brand-icon"><img src="/src/assets/icon.png" alt="Dapur Kemas" /></span>
          <div>
            <h1>DAPUR - KEMAS</h1>
            <p>Panel Admin</p>
          </div>
        </div>
        <div className="dk-header-actions">
          <button className="dk-btn-nav" onClick={onSettings} title="Pengaturan akun">Akun</button>
          <button className="dk-btn-nav" onClick={handleLogout}>Keluar</button>
          <a href="/" className="dk-btn-nav">Menu Pembeli</a>
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

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (search) params.set('search', search);
      const result = await apiCall(`/orders?${params.toString()}`);
      setOrders(result.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const id = setInterval(loadOrders, 30000);
    return () => clearInterval(id);
  }, [filter]);

  async function updateStatus(order, status) {
    if (!confirm(`Ubah status ${order.orderNumber} menjadi ${status}?`)) return;
    await apiCall(`/orders/${order.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    loadOrders();
  }

  function buildSellerChecklist(order) {
    return [
      'DAPUR - KEMAS',
      'CHECKLIST PESANAN PENJUAL',
      `No. Pesanan: ${order.orderNumber}`,
      `Tanggal: ${formatDate(order.createdAt)}`,
      `Pelanggan: ${order.customerName}`,
      `Telepon: ${order.customerPhone}`,
      `Alamat: ${order.customerAddress}`,
      '',
      'CEK ITEM',
      ...(order.items || []).map((item) => `[ ] ${item.quantity}x ${item.menuName}${item.notes ? ` - Catatan: ${item.notes}` : ''}`),
      '',
      'CEK 1 - Picking: [ ] Lengkap [ ] Kurang',
      'Petugas 1: ____________________',
      '',
      'CEK 2 - Packing: [ ] Lengkap [ ] Kurang',
      'Petugas 2: ____________________',
      '',
      'Catatan: _______________________',
    ].join('\n');
  }

  function saveSellerChecklist(order) {
    const blob = new Blob([buildSellerChecklist(order)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checklist-${order.orderNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printSellerChecklist(order) {
    const lines = buildSellerChecklist(order).split('\n');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Checklist ${order.orderNumber}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111827}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:0 0 18px;color:#475569}.line{padding:4px 0;font-size:13px;white-space:pre-wrap}.item{font-size:15px;padding:8px 0;border-bottom:1px dashed #CBD5E1}.sign{margin-top:14px;padding-top:8px}</style></head><body><h1>DAPUR - KEMAS</h1><h2>Checklist Pesanan Penjual</h2>${lines.slice(2).map((line) => `<div class="${line.startsWith('[ ]') ? 'item' : line.startsWith('Petugas') || line.startsWith('CEK') ? 'line sign' : 'line'}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`).join('')}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`);
    win.document.close();
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
        <input
          className="dk-search-input"
          placeholder="Cari order, nama, atau nomor HP"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadOrders(); }}
        />
        <button className="dk-btn-outline" onClick={loadOrders}>Cari</button>
      </div>

      <div className="dk-admin-tabs dk-order-status-tabs">
        {[['', 'Semua'], ['confirmed', 'Baru'], ['preparing', 'Diproses'], ['packaging', 'Dikemas'], ['delivering', 'Dikirim'], ['completed', 'Selesai'], ['cancelled', 'Dibatalkan']].map(([value, label]) => (
          <button key={value} className={`dk-admin-tab ${filter === value ? 'dk-admin-tab-active' : ''}`} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {error && <div className="dk-login-error">{error}</div>}
      {loading && <p className="dk-admin-loading">Memuat pesanan...</p>}

      <div className="dk-admin-order-list">
        {orders.map((order) => {
          const isOpen = expanded === order.id;
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
                    <div className="dk-seller-checklist-items">
                      {order.items?.map((item) => (
                        <label key={item.id} className="dk-seller-checkline">
                          <input type="checkbox" />
                          <span>{item.quantity}x {item.menuName}</span>
                        </label>
                      ))}
                    </div>
                    <div className="dk-seller-checks">
                      <label><input type="checkbox" /> Cek 1 lengkap</label>
                      <label><input type="checkbox" /> Cek 2 packing lengkap</label>
                    </div>
                  </div>

                  <div className="dk-admin-actions dk-admin-order-actions">
                    <button className="dk-btn-outline" onClick={() => printSellerChecklist(order)}>Cetak Checklist</button>
                    <button className="dk-btn-outline" onClick={() => saveSellerChecklist(order)}>Simpan Checklist</button>
                    {(nextActions[order.orderStatus] || []).map(([status, label]) => (
                      <button key={status} className="dk-btn-edit" onClick={() => updateStatus(order, status)}>{label}</button>
                    ))}
                    {!['completed', 'cancelled'].includes(order.orderStatus) && <button className="dk-btn-delete" onClick={() => updateStatus(order, 'cancelled')}>Batalkan</button>}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ── Menu Form ── */
function MenuForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    price: initial?.price || '',
    discountPercent: initial?.discountPercent || '',
    stock: initial?.stock || '',
    description: initial?.description || '',
    image: initial?.image || IMAGE_KEYS[0],
    category: initial?.categoryName || categories[0]?.name || '',
  });
  const [discountEnabled, setDiscountEnabled] = useState(!!(initial?.discountPercent));
  const isEdit = !!initial;

  const submit = (e) => {
    e.preventDefault();
    const discount = discountEnabled ? Number(form.discountPercent) || 0 : null;
    onSave({
      id: initial?.id || newId(),
      name: form.name,
      price: Number(form.price) || 0,
      discountPercent: discount,
      stock: Number(form.stock) || 0,
      description: form.description,
      image: form.image,
    }, form.category);
  };

  return (
    <div className="dk-overlay" onClick={onCancel}>
      <form className="dk-admin-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{isEdit ? 'Edit Menu' : 'Tambah Menu'}</h3>
        <label>Kategori</label>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <label>Nama Menu</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nasi Goreng Spesial" required />
        <label>Harga (Rp)</label>
        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" required />
        <label>Stock</label>
        <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="20" required />
        <div className="dk-toggle-row">
          <label>Diskon</label>
          <label className="dk-toggle">
            <input type="checkbox" checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)} />
            <span className="dk-toggle-slider"></span>
          </label>
        </div>
        {discountEnabled && (
          <div className="dk-discount-input-row">
            <label>Persentase Diskon (%)</label>
            <input type="number" min="1" max="100" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="5" required />
          </div>
        )}
        <label>Deskripsi</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat..." required />
        <label>Gambar</label>
        <div className="dk-upload-row">
          <label className="dk-upload-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V10M4 7L8 3L12 7M2 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Upload Foto
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const dataUrl = await resizeImage(file);
                setForm({ ...form, image: dataUrl });
              }
            }} hidden />
          </label>
          {form.image && (form.image.startsWith('data:') || form.image.startsWith('http')) && (
            <div className="dk-upload-preview">
              <img src={form.image} alt="" onError={(e) => { e.target.src = FALLBACK_IMG; }} />
            </div>
          )}
        </div>
        <label>atau pilih dari galeri:</label>
        <div className="dk-image-picker">
          {IMAGE_KEYS.map((key) => (
            <button key={key} type="button" className={`dk-image-option ${form.image === key ? 'dk-image-selected' : ''}`} onClick={() => setForm({ ...form, image: key })}>
              <img src={getMenuImage(key)} alt="" onError={(e) => { e.target.src = FALLBACK_IMG; }} />
            </button>
          ))}
        </div>
        <div className="dk-form-actions">
          <button type="button" className="dk-btn-cancel" onClick={onCancel}>Batal</button>
          <button type="submit" className="dk-btn-save">{isEdit ? 'Simpan' : 'Tambah'}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Category Form ── */
function CategoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', icon: 'FD' });
  const submit = (e) => { e.preventDefault(); if (!form.name.trim()) return; onSave({ name: form.name, icon: form.icon }); };
  return (
    <div className="dk-overlay" onClick={onCancel}>
      <form className="dk-admin-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{initial ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
        <label>Nama Kategori</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama kategori" required />
        <label>Icon</label>
        <div className="dk-icon-picker">
          {ICONS.map((icon) => (
            <button key={icon} type="button" className={`dk-icon-option ${form.icon === icon ? 'dk-icon-selected' : ''}`} onClick={() => setForm({ ...form, icon })}>{icon}</button>
          ))}
        </div>
        <div className="dk-form-actions">
          <button type="button" className="dk-btn-cancel" onClick={onCancel}>Batal</button>
          <button type="submit" className="dk-btn-save">{initial ? 'Simpan' : 'Tambah'}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Dashboard Stats ── */
function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

      {/* Summary Cards */}
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

      {/* Status Orders */}
      <div className="dk-dashboard-section">
        <h3>Status Pesanan</h3>
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

      {/* Popular Menus */}
      <div className="dk-dashboard-section">
        <h3>Menu Terlaris</h3>
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

      {/* Recent Orders */}
      <div className="dk-dashboard-section">
        <h3>Pesanan Terbaru</h3>
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

      {/* Low Stock Warning */}
      {stats.lowStockMenus.length > 0 && (
        <div className="dk-dashboard-section dk-warning-section">
          <h3>⚠️ Stok Menipis</h3>
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
  );
}

/* ── Admin Dashboard ── */
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
  const [reportStartDate, setReportStartDate] = useState(todayStr());
  const [reportEndDate, setReportEndDate] = useState(todayStr());
  const [orderSearch, setOrderSearch] = useState('');

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
        image: menu.imageUrl || IMAGE_KEYS[0],
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
    loadCategories().then((next) => loadMenus(next)).catch(() => {});
  }, []);

  useEffect(() => {
    if (categories.length) loadMenus().catch(() => {});
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
      console.error('SSE connection error:', error);
      eventSource.close();
      // Reconnect after 5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);
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

  function getReportRange() {
    if (reportPeriod === 'daily') return { start: reportDate, end: reportDate };
    if (reportPeriod === 'weekly') return getWeekRange(reportDate);
    if (reportPeriod === 'monthly') return getMonthRange(reportDate);
    return { start: reportStartDate, end: reportEndDate };
  }

  useEffect(() => {
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
      .catch(() => setReportOrders([]));
  }, [reportPeriod, reportDate, reportStartDate, reportEndDate]);

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
    reportTitle = 'Rentang Tanggal';
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
    await apiCall('/menus', { method: 'POST', body: JSON.stringify(toMenuPayload(data, catName)) });
    await loadMenus();
  };

  const editMenu = async (id, data, catName) => {
    await apiCall(`/menus/${id}`, { method: 'PUT', body: JSON.stringify(toMenuPayload(data, catName)) });
    await loadMenus();
  };

  const deleteMenu = async (id) => {
    await apiCall(`/menus/${id}`, { method: 'DELETE' });
    await loadMenus();
  };

  const addCategory = async (data) => {
    await apiCall('/categories', { method: 'POST', body: JSON.stringify(data) });
    const next = await loadCategories();
    setActiveCat(data.name);
    await loadMenus(next);
  };

  const editCategory = async (oldName, data) => {
    const category = categories.find((cat) => cat.name === oldName);
    if (!category) return;
    await apiCall(`/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(data) });
    const next = await loadCategories();
    setActiveCat(data.name);
    await loadMenus(next);
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    const reportContent = document.getElementById('printable-report');
    if (!reportContent) return;

    const printWindow = window.open('', '_blank');
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan ${reportTitle} - Dapur Kemas</title>
          ${styles}
          <style>
            body { padding: 20px; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${reportContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="dk-app dk-app-admin">
      <Header onLogout={onLogout} onSettings={onSettings} />

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
        </div>

        {tab === 'dashboard' && (
          <div className="dk-admin-content">
            <DashboardStats />
          </div>
        )}

        {tab === 'orders' && <OrderManager />}

        {tab === 'menu' && (
          <div className="dk-admin-content">
            <div className="dk-admin-toolbar">
              <button className="dk-btn-outline" onClick={() => { setEditingCat(null); setShowCatForm(true); }}>+ Kategori</button>
              <button className="dk-btn-primary" onClick={() => { setEditingMenu(null); setShowMenuForm(true); }}>+ Tambah Menu</button>
            </div>
            <div className="dk-admin-tabs">
              {menus.map((cat) => (
                <button key={cat.name} className={`dk-admin-tab ${activeCat === cat.name ? 'dk-admin-tab-active' : ''}`} onClick={() => setActiveCat(cat.name)}>
                  <span className="dk-category-code">{cat.icon}</span> {cat.name}
                  <span className="dk-admin-tab-count">{cat.items.length}</span>
                  <span className="dk-admin-tab-actions" onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setShowCatForm(true); }} title="Edit">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                  </span>
                </button>
              ))}
            </div>
            {category && (
              <div className="dk-admin-table-wrap dk-admin-table-scroll">
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
                          <td><img className="dk-admin-thumb" src={getMenuImage(item.image)} alt="" onError={(e) => { e.target.src = FALLBACK_IMG; }} /></td>
                          <td><strong>{item.name}</strong></td>
                          <td>{money(item.price)}</td>
                          <td>{item.discountPercent ? <span className="dk-discount-badge">{item.discountPercent}%</span> : '-'}</td>
                          <td>{item.stock <= 0 ? <span className="dk-stock-badge">Habis</span> : item.stock}</td>
                          <td>
                            <div className="dk-admin-actions">
                              <button className="dk-btn-edit" title="Edit" onClick={() => { setEditingMenu(item); setShowMenuForm(true); }}>Edit</button>
                              <button className="dk-btn-delete" title="Hapus" onClick={() => { if (confirm(`Hapus "${item.name}"?`)) deleteMenu(item.id, activeCat); }}>Hapus</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'report' && (
          <div className="dk-admin-content">
            {/* Toolbar (tidak ikut cetak) */}
            <div className="dk-report-toolbar dk-report-control-panel no-print">
              <div className="dk-period-selector dk-report-periods">
                <button className={`dk-period-btn ${reportPeriod === 'daily' ? 'active' : ''}`} onClick={() => setReportPeriod('daily')}>Harian</button>
                <button className={`dk-period-btn ${reportPeriod === 'weekly' ? 'active' : ''}`} onClick={() => setReportPeriod('weekly')}>Mingguan</button>
                <button className={`dk-period-btn ${reportPeriod === 'monthly' ? 'active' : ''}`} onClick={() => setReportPeriod('monthly')}>Bulanan</button>
                <button className={`dk-period-btn ${reportPeriod === 'range' ? 'active' : ''}`} onClick={() => setReportPeriod('range')}>Rentang Tanggal</button>
              </div>
              <div className="dk-report-toolbar-actions">
                {reportPeriod === 'range' ? (
                  <div className="dk-report-date-range">
                    <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="dk-date-input" />
                    <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="dk-date-input" />
                  </div>
                ) : (
                  <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="dk-date-input" />
                )}
                <div className="dk-report-action-buttons">
                  <button className="dk-btn-outline" onClick={handlePrint}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6V2H12V6M4 12H3C2.45 12 2 11.55 2 11V8C2 7.45 2.45 7 3 7H13C13.55 7 14 7.45 14 8V11C14 11.55 13.55 12 13 12H12M4 12H12V14H4V12Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                    Cetak
                  </button>
                  <button className="dk-btn-primary" onClick={handleDownloadPDF}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V10M4 7L8 11L12 7M2 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    PDF
                  </button>
                </div>
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
            <div className="dk-report" id="printable-report">
              <div className="dk-report-doc-header">
                <div className="dk-report-doc-brand">
                  <h1>DAPUR - KEMAS</h1>
                  <span>Aplikasi Pemesanan Makanan</span>
                </div>
                <div className="dk-report-doc-title">
                  <strong>LAPORAN {reportTitle.toUpperCase()}</strong>
                  <span>{reportPeriod === 'daily' ? formatDate(reportDate) : reportPeriod === 'weekly' ? `Minggu ${formatDate(reportDate)}` : reportPeriod === 'monthly' ? new Date(reportDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : `${formatDate(reportStartDate)} - ${formatDate(reportEndDate)}`}</span>
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
          </div>
        )}
      </div>

      {showMenuForm && (
        <MenuForm
          initial={editingMenu}
          categories={menus}
          onSave={async (data, catName) => { if (editingMenu) await editMenu(editingMenu.id, data, catName); else await addMenu(data, catName); setShowMenuForm(false); setEditingMenu(null); }}
          onCancel={() => { setShowMenuForm(false); setEditingMenu(null); }}
        />
      )}
      {showCatForm && (
        <CategoryForm
          initial={editingCat}
          onSave={async (data) => { if (editingCat) await editCategory(editingCat.name, data); else await addCategory(data); setShowCatForm(false); setEditingCat(null); }}
          onCancel={() => { setShowCatForm(false); setEditingCat(null); }}
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
