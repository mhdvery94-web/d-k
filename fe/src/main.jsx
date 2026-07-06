import { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { initialMenus, getMenuImage, FALLBACK_IMG, money, formatDate, validatePhoneInput, formatPhoneDisplay } from './data.js';
import './styles.css';

function getDiscountedPrice(item) {
  if (!item.discountPercent) return item.price;
  return Math.round(item.price - (item.price * item.discountPercent / 100));
}

function transformApiMenus(list) {
  if (!Array.isArray(list)) return initialMenus;
  const grouped = new Map();
  list.forEach((menu) => {
    const categoryName = menu.category?.name || 'Menu';
    if (!grouped.has(categoryName)) grouped.set(categoryName, { name: categoryName, icon: menu.category?.icon || '', items: [] });
    grouped.get(categoryName).items.push({
      id: menu.id,
      name: menu.name,
      price: Number(menu.price),
      discountPercent: menu.discountPercent || null,
      image: menu.imageUrl || 'default',
      description: menu.description || '',
      stock: menu.stock ?? 0,
    });
  });
  return Array.from(grouped.values());
}

function formatPhoneInput(value) {
  return formatPhoneDisplay(value).slice(0, 14);
}

/* ── Customer Header ── */
function Header({ onTracking }) {
  return (
    <header className="dk-header">
      <div className="dk-header-top">
        <div className="dk-brand">
          <span className="dk-brand-icon"><img src="/icon.png" alt="Dapur Kemas" /></span>
          <div>
            <h1>DAPUR - KEMAS</h1>
            <p>Aplikasi Pemesanan Makanan</p>
          </div>
        </div>
        <button className="dk-btn-nav" onClick={onTracking}>Cek Pesanan</button>
      </div>
    </header>
  );
}

/* ── Menu Item ── */
function MenuItem({ item, qty, note, stock, onAdd, onIncrease, onDecrease }) {
  const [imgErr, setImgErr] = useState(false);
  const outOfStock = stock <= 0;
  const discounted = getDiscountedPrice(item);

  return (
    <div className="dk-menu-item">
      <div className="dk-menu-thumb">
        <img src={imgErr ? FALLBACK_IMG : getMenuImage(item.image)} alt={item.name} onError={() => setImgErr(true)} loading="lazy" />
        {item.discountPercent && <span className="dk-menu-badge">Promo {item.discountPercent}%</span>}
      </div>
      <div className="dk-menu-info">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="dk-menu-price">
          <strong>{money(discounted)}</strong>
          {item.discountPercent && <del>{money(item.price)}</del>}
        </div>
        {note && <span className="dk-menu-note-tag">Catatan: {note}</span>}
      </div>
      <div className="dk-menu-actions">
        {outOfStock ? (
          <span className="dk-stock-empty">Habis</span>
        ) : qty > 0 ? (
          <div className="dk-stepper">
            <button onClick={() => onDecrease(item.id)} aria-label="Kurangi">−</button>
            <span>{qty}</span>
            <button onClick={() => onIncrease(item.id)} aria-label="Tambah" disabled={qty >= stock}>+</button>
          </div>
        ) : (
          <button className="dk-btn-add" onClick={() => onAdd(item)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Tambah
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Category Section ── */
function CategorySection({ category, cart, menus, onAdd, onIncrease, onDecrease }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="dk-category">
      <button className="dk-category-header" onClick={() => setOpen((p) => !p)} aria-expanded={open}>
        <span className="dk-category-icon">{category.icon}</span>
        <span className="dk-category-label">{category.name}</span>
        <span className="dk-category-count">{category.items.length} menu</span>
        <svg className={`dk-chevron ${open ? 'dk-chevron-open' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="dk-category-items">
          {category.items.map((item) => {
            const cartItem = cart.find((c) => c.id === item.id);
            return <MenuItem key={item.id} item={item} qty={cartItem?.qty ?? 0} note={cartItem?.note ?? ''} stock={item.stock ?? 0} onAdd={onAdd} onIncrease={onIncrease} onDecrease={onDecrease} />;
          })}
        </div>
      )}
    </div>
  );
}

/* ── Cart Review ── */
function CartReview({ cart, onClose, onCheckout, onUpdateNote, onIncrease, onDecrease }) {
  const subtotal = cart.reduce((s, c) => s + getDiscountedPrice(c) * c.qty, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  // step: 'cart' → review keranjang, 'info' → data pelanggan, 'confirm' → pembayaran
  const [step, setStep] = useState('cart');

  // Customer info (selaras dengan schema DB)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPostalCode, setCustomerPostalCode] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [gpsStatus, setGpsStatus] = useState(''); // '', 'loading', 'success', 'error'
  const [formError, setFormError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (customerPostalCode.length !== 5) { setLocations([]); setSelectedLocation(null); return; }
    fetch(`/api/postal-code/${customerPostalCode}`)
      .then((res) => res.json())
      .then((result) => setLocations(result.success ? result.data : []))
      .catch(() => setLocations([]));
  }, [customerPostalCode]);

  const useGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setFormError('Browser tidak mendukung GPS. Silakan input alamat manual.');
      return;
    }
    setGpsStatus('loading');
    setFormError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsStatus('success');
        if (!customerAddress) {
          setCustomerAddress(`Lokasi GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        }
      },
      () => {
        setGpsStatus('error');
        setFormError('Gagal mendapat lokasi. Izinkan akses GPS atau input alamat manual.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const proceedToConfirm = () => {
    if (!customerName.trim()) { setFormError('Nama harus diisi'); return; }
    if (!customerPhone.trim()) { setFormError('Nomor HP harus diisi'); return; }
    const phone = validatePhoneInput(customerPhone);
    if (!phone.isValid) {
      setFormError(phone.error); return;
    }
    if (customerPostalCode.length !== 5) { setFormError('Kode pos harus 5 digit'); return; }
    if (!selectedLocation) { setFormError('Pilih kelurahan dari kode pos'); return; }
    if (!customerAddress.trim()) { setFormError('Alamat detail harus diisi'); return; }
    setFormError('');
    setStep('confirm');
  };

  const phonePreview = validatePhoneInput(customerPhone);
  const fullAddress = selectedLocation ? `${customerAddress}, ${selectedLocation.kelurahan}, ${selectedLocation.kecamatan}, ${selectedLocation.kota}, ${selectedLocation.provinsi} ${customerPostalCode}` : customerAddress;
  const customerInfo = { customerName, customerPhone: phonePreview.e164 || customerPhone, customerAddress: fullAddress, customerPostalCode, customerKelurahan: selectedLocation?.kelurahan || '', customerKecamatan: selectedLocation?.kecamatan || '', customerKota: selectedLocation?.kota || '', customerProvinsi: selectedLocation?.provinsi || '', latitude, longitude, orderNotes };

  // ── STEP: CONFIRM PAYMENT ──
  if (step === 'confirm') {
    return (
      <div className="dk-overlay" onClick={() => setStep('info')}>
        <div className="dk-review-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="dk-review-header"><h2>Konfirmasi Pembayaran</h2><button className="dk-btn-close" onClick={onClose}>✕</button></div>
          <div className="dk-review-summary">
            <div className="dk-review-row"><span>Nama</span><strong>{customerName}</strong></div>
            <div className="dk-review-row"><span>No. HP</span><strong>+62 {phonePreview.formatted || customerPhone}</strong></div>
            <div className="dk-review-row"><span>Total Pembayaran</span><strong>{money(total)}</strong></div>
            <div className="dk-review-row"><span>Metode</span><strong>QRIS</strong></div>
          </div>
          <div className="dk-payment-note">QRIS sandbox Midtrans akan terbuka setelah tombol bayar ditekan.</div>
          <button className="dk-btn-pay dk-btn-pay-full" disabled={paymentLoading} onClick={async () => {
            setPaymentLoading(true);
            setFormError('');
            try {
              await onCheckout(cart, total, customerInfo);
              onClose();
            } catch (error) {
              setFormError(error.message || 'Gagal membuat pembayaran');
            } finally {
              setPaymentLoading(false);
            }
          }}>{paymentLoading ? 'Memproses...' : 'Konfirmasi & Bayar'}</button>
          {formError && <div className="dk-form-error">{formError}</div>}
          <button className="dk-btn-back" onClick={() => setStep('info')}>← Kembali</button>
        </div>
      </div>
    );
  }

  // ── STEP: CUSTOMER INFO ──
  if (step === 'info') {
    return (
      <div className="dk-overlay" onClick={onClose}>
        <div className="dk-review-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="dk-review-header"><h2>Data Pengiriman</h2><button className="dk-btn-close" onClick={onClose}>✕</button></div>

          <div className="dk-form-group">
            <label>Nama Pemesan</label>
            <input className="dk-form-input" placeholder="Nama lengkap" value={customerName} onChange={(e) => { setCustomerName(e.target.value); setFormError(''); }} />
          </div>

          <div className="dk-form-group">
            <label>Nomor HP / WhatsApp</label>
            <div className="dk-phone-row">
              <span className="dk-phone-prefix">+62</span>
              <input className="dk-form-input" type="tel" placeholder="812-3456-7890" value={customerPhone} onChange={(e) => { setCustomerPhone(formatPhoneInput(e.target.value)); setFormError(''); }} />
            </div>
            {customerPhone && <div className="dk-address-preview">Format tersimpan: +62 {validatePhoneInput(customerPhone).formatted || '-'}</div>}
          </div>

          <div className="dk-form-group">
            <label>Kode Pos</label>
            <input className="dk-form-input" inputMode="numeric" maxLength="5" placeholder="15560" value={customerPostalCode} onChange={(e) => { setCustomerPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5)); setFormError(''); }} />
            <label>Kelurahan</label>
            <select className="dk-form-input" value={selectedLocation?.kelurahan || ''} onChange={(e) => setSelectedLocation(locations.find((loc) => loc.kelurahan === e.target.value) || null)}>
              <option value="">Pilih kelurahan</option>
              {locations.map((loc) => <option key={`${loc.postalCode}-${loc.kelurahan}`} value={loc.kelurahan}>{loc.kelurahan}</option>)}
            </select>
            {customerPostalCode.length === 5 && !locations.length && <div className="dk-address-preview dk-address-warning">Kode pos tidak ditemukan. Cek lagi kode pos.</div>}
            <div className="dk-address-grid">
              <div>
                <label>Kecamatan</label>
                <input className="dk-form-input" readOnly value={selectedLocation?.kecamatan || ''} placeholder="Otomatis dari kode pos" />
              </div>
              <div>
                <label>Kota/Kabupaten</label>
                <input className="dk-form-input" readOnly value={selectedLocation?.kota || ''} placeholder="Otomatis dari kode pos" />
              </div>
              <div>
                <label>Provinsi</label>
                <input className="dk-form-input" readOnly value={selectedLocation?.provinsi || ''} placeholder="Otomatis dari kode pos" />
              </div>
            </div>
            <label>Alamat Detail</label>
            <textarea className="dk-form-input dk-form-textarea" placeholder="Jalan, no rumah, patokan..." value={customerAddress} onChange={(e) => { setCustomerAddress(e.target.value); setFormError(''); }} rows={3} />
          </div>

          <div className="dk-form-group">
            <label>Catatan Pesanan (opsional)</label>
            <input className="dk-form-input" placeholder="Misal: titip ke satpam, jangan pakai bel..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
          </div>

          {formError && <div className="dk-form-error">{formError}</div>}

          <button className="dk-btn-pay dk-btn-pay-full" onClick={proceedToConfirm}>Lanjut ke Pembayaran</button>
          <button className="dk-btn-back" onClick={() => setStep('cart')}>← Kembali ke Keranjang</button>
        </div>
      </div>
    );
  }

  // ── STEP: CART ──
  return (
    <div className="dk-overlay" onClick={onClose}>
      <div className="dk-review-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dk-review-header"><h2>Pesanan Kamu</h2><button className="dk-btn-close" onClick={onClose}>✕</button></div>
        <div className="dk-review-items">
          {cart.map((c) => {
            const discounted = getDiscountedPrice(c);
            return (
              <div key={c.id} className="dk-review-item">
                <span className="dk-review-emoji">{String(c.name || '').slice(0, 1).toUpperCase()}</span>
                <div className="dk-review-info">
                  <strong>{c.name}</strong>
                  <span className="dk-review-meta">{money(discounted)} × {c.qty}</span>
                  <input className="dk-note-input" placeholder="Tambah catatan (misal: tidak pedas, extra sambal)..." value={c.note || ''} onChange={(e) => onUpdateNote(c.id, e.target.value)} />
                </div>
                <div className="dk-review-stepper">
                  <div className="dk-stepper">
                    <button onClick={() => onDecrease(c.id)}>−</button><span>{c.qty}</span><button onClick={() => onIncrease(c.id)}>+</button>
                  </div>
                  <span className="dk-review-item-total">{money(discounted * c.qty)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="dk-review-bill">
          <div className="dk-bill-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="dk-bill-row"><span>Biaya Layanan (10%)</span><strong>{money(tax)}</strong></div>
          <div className="dk-bill-row dk-bill-total"><span>Total</span><strong>{money(total)}</strong></div>
        </div>
        <button className="dk-btn-pay dk-btn-pay-full" onClick={() => setStep('info')}>Isi Data Pengiriman</button>
      </div>
    </div>
  );
}

/* ── Cart Bar ── */
function CartBar({ itemCount, total, onReview }) {
  if (itemCount === 0) {
    return (
      <div className="dk-cartbar dk-cartbar-empty">
        <div className="dk-cartbar-info">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M2 3H4.5L5.5 7.5M5.5 7.5L7.2 15.2C7.35 15.82 7.9 16.25 8.54 16.25H17.5C18.14 16.25 18.69 15.82 18.84 15.2L20.5 7.5H5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="19.25" r="1.25" fill="currentColor"/><circle cx="17" cy="19.25" r="1.25" fill="currentColor"/></svg>
          <span>Pilih menu untuk memulai pesanan</span>
        </div>
      </div>
    );
  }
  return (
    <div className="dk-cartbar dk-cartbar-filled">
      <div className="dk-cartbar-info"><div className="dk-cartbar-count">{itemCount} item</div><div className="dk-cartbar-total">{money(total)}</div></div>
      <button className="dk-btn-pay" onClick={onReview}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/><rect x="6" y="6" width="3" height="3" rx="1" fill="currentColor"/><rect x="11" y="6" width="3" height="3" rx="1" fill="currentColor"/><rect x="6" y="11" width="3" height="3" rx="1" fill="currentColor"/><rect x="11" y="11" width="3" height="3" rx="1" fill="currentColor"/></svg>
        Bayar
      </button>
    </div>
  );
}

function ReceiptPage({ data, onMenu, onTracking }) {
  const order = data?.order || data;
  if (!order) return null;
  const items = order.items || [];
  const orderNumber = order.orderNumber || order.id;
  const shareText = `Resi Pesanan Dapur Kemas\n\nNo. Pesanan: ${orderNumber}\nNama: ${order.customerName || '-'}\nTotal: ${money(Number(order.total || 0))}\n\nTerima kasih atas pesanan Anda.`;
  const receiptText = [
    'DAPUR - KEMAS',
    'STRUK PEMBELI',
    `No. Pesanan: ${orderNumber}`,
    `Status: LUNAS`,
    `Nama: ${order.customerName || '-'}`,
    `Telepon: ${order.customerPhone || '-'}`,
    `Alamat: ${order.customerAddress || '-'}`,
    '',
    'ITEM',
    ...items.map((item) => {
      const qty = item.quantity || item.qty || 1;
      const name = item.menuName || item.name;
      const sub = Number(item.subtotal || item.price * qty || 0);
      return `${qty}x ${name} - ${money(sub)}`;
    }),
    '',
    `Subtotal: ${money(Number(order.subtotal || 0))}`,
    `Biaya Layanan: ${money(Number(order.serviceFee || 0))}`,
    `Total: ${money(Number(order.total || 0))}`,
  ].join('\n');

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Resi #${orderNumber}`, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Resi disalin ke clipboard!');
      }
    } catch {}
  };

  const handleSave = () => {
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `struk-${orderNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="dk-main dk-simple-page">
      <section className="dk-receipt">
        <div className="dk-receipt-header">
          <span className="dk-receipt-logo">DK</span>
          <h2>DAPUR - KEMAS</h2>
          <p>Aplikasi Pemesanan Makanan</p>
        </div>

        <div className="dk-receipt-order-number">{orderNumber}</div>
        <div className="dk-receipt-status"><span>LUNAS</span></div>

        <div className="dk-receipt-section">
          <h4>Info Pelanggan</h4>
          <div className="dk-receipt-customer">
            <p><strong>{order.customerName || '-'}</strong></p>
            <p>{order.customerPhone || '-'}</p>
            <p>{order.customerAddress || '-'}</p>
            {order.customerKelurahan && <p>{order.customerKelurahan}, {order.customerKecamatan}</p>}
            {order.customerKota && <p>{order.customerKota}, {order.customerProvinsi} {order.customerPostalCode}</p>}
          </div>
        </div>

        <div className="dk-receipt-items">
          {items.map((item, i) => {
            const qty = item.quantity || item.qty || 1;
            const name = item.menuName || item.name;
            const sub = Number(item.subtotal || item.price * qty || 0);
            return (
              <div key={i} className="dk-receipt-item">
                <div>
                  <div>{name}</div>
                  <div className="dk-receipt-item-detail">{qty} × {money(Math.round(sub / qty))}</div>
                </div>
                <strong>{money(sub)}</strong>
              </div>
            );
          })}
        </div>

        <div className="dk-receipt-summary">
          {order.subtotal && <div className="dk-receipt-summary-row"><span>Subtotal</span><span>{money(Number(order.subtotal))}</span></div>}
          {order.serviceFee && <div className="dk-receipt-summary-row"><span>Biaya Layanan (10%)</span><span>{money(Number(order.serviceFee))}</span></div>}
          <div className="dk-receipt-summary-row dk-receipt-summary-total"><span>TOTAL</span><strong>{money(Number(order.total || 0))}</strong></div>
        </div>

        <div className="dk-receipt-footer">
          <p>Terima kasih atas pesanan Anda.</p>
          <p>Pesanan Anda sedang diproses oleh Dapur Kemas</p>
        </div>

        <div className="dk-receipt-actions">
          <button className="dk-btn-pay" onClick={handleShare}>Bagikan Resi</button>
          <button className="dk-btn-outline-sm" onClick={handleSave}>Simpan Struk</button>
          <button className="dk-btn-outline-sm" onClick={onTracking}>Cek Status</button>
          <button className="dk-btn-outline-sm" onClick={onMenu}>Pesan Lagi</button>
        </div>
      </section>
    </main>
  );
}

function OrderTrackingPage({ onMenu }) {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const statuses = ['confirmed', 'preparing', 'packaging', 'delivering', 'completed'];

  async function submit(e) {
    e.preventDefault();
    const validation = validatePhoneInput(phone);
    if (!validation.isValid) { setError(validation.error); return; }
    setLoading(true); setError('');
    try {
      const result = await fetch(`/api/orders/track-by-phone/${encodeURIComponent(phone)}`).then((res) => res.json());
      if (!result.success) throw new Error(result.message);
      setOrders(result.data || []);
    } catch (err) {
      setError(err.message || 'Gagal cek pesanan');
    } finally {
      setLoading(false);
    }
  }

  const stepConfig = [
    { key: 'confirmed', label: 'Dikonfirmasi', icon: '1' },
    { key: 'preparing', label: 'Diproses', icon: '2' },
    { key: 'packaging', label: 'Dikemas', icon: '3' },
    { key: 'delivering', label: 'Dikirim', icon: '4' },
    { key: 'completed', label: 'Selesai', icon: '5' },
  ];

  const statusLabels = { confirmed: 'Baru', preparing: 'Diproses', packaging: 'Dikemas', delivering: 'Dikirim', completed: 'Selesai', cancelled: 'Dibatalkan' };
  const [expanded, setExpanded] = useState(null);

  return (
    <main className="dk-main dk-simple-page">
      <section className="dk-tracking">
        <div className="dk-tracking-header">
          <h2>Cek Pesanan</h2>
          <p>Masukkan nomor HP untuk melihat status pesanan</p>
        </div>

        <form onSubmit={submit} className="dk-tracking-input-group">
          <div className="dk-phone-row dk-phone-row-track">
            <span className="dk-phone-prefix">+62</span>
            <input className="dk-form-input" type="tel" placeholder="812-3456-7890" value={phone} onChange={(e) => { setPhone(formatPhoneInput(e.target.value)); setError(''); }} />
          </div>
          <button className="dk-btn-pay" disabled={loading}>{loading ? '...' : 'Cek'}</button>
        </form>
        {phone && <div className="dk-phone-preview valid">Format pencarian: +62 {validatePhoneInput(phone).formatted || '-'}</div>}

        {error && <div className="dk-form-error">{error}</div>}

        <div className="dk-tracking-results">
          {orders.length === 0 && !loading && (
              <div className="dk-empty-state">
              <div className="dk-empty-state-icon">ORD</div>
              <p>Masukkan nomor HP untuk mencari pesanan</p>
            </div>
          )}

          {orders.map((order) => {
            const isCancelled = order.orderStatus === 'cancelled';
            const currentIdx = stepConfig.findIndex((s) => s.key === order.orderStatus);
            const isOpen = expanded === order.id;

            return (
              <article key={order.id} className="dk-tracking-card">
                <div className="dk-tracking-card-header" onClick={() => setExpanded(isOpen ? null : order.id)}>
                  <div>
                    <strong style={{ fontFamily: 'monospace' }}>{order.orderNumber}</strong>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{formatDate(order.createdAt)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(Number(order.total))}</strong>
                    <div><span className={`dk-status-badge dk-status-${order.orderStatus}`}>{statusLabels[order.orderStatus] || order.orderStatus}</span></div>
                  </div>
                </div>

                {isOpen && (
                  <div className="dk-tracking-card-body">
                    {/* Status Stepper */}
                    {isCancelled ? (
                      <div className="dk-tracking-stepper" style={{ justifyContent: 'center' }}>
                        <div className="dk-tracking-step dk-tracking-step-cancelled">
                          <div className="dk-tracking-step-icon">X</div>
                          <div className="dk-tracking-step-label">Dibatalkan</div>
                        </div>
                      </div>
                    ) : (
                      <div className="dk-tracking-stepper">
                        {stepConfig.map((step, i) => {
                          let cls = 'dk-tracking-step';
                          if (i < currentIdx) cls += ' dk-tracking-step-completed';
                          else if (i === currentIdx) cls += ' dk-tracking-step-active';
                          return (
                            <div key={step.key} className={cls}>
                              <div className="dk-tracking-step-icon">{step.icon}</div>
                              <div className="dk-tracking-step-label">{step.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Items */}
                    <div style={{ margin: '12px 0', borderTop: '1px dashed #E2E8F0', paddingTop: '12px' }}>
                      {order.items?.map((item) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '14px' }}>
                          <span>{item.quantity}× {item.menuName}</span>
                          <strong>{money(Number(item.subtotal))}</strong>
                        </div>
                      ))}
                    </div>

                    {/* Address */}
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>
                      <p>Alamat: {order.customerAddress}</p>
                      {order.customerKelurahan && <p style={{ marginTop: '2px' }}>{order.customerKelurahan}, {order.customerKecamatan}, {order.customerKota}, {order.customerProvinsi} {order.customerPostalCode}</p>}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <button className="dk-btn-back" onClick={onMenu} style={{ marginTop: '16px' }}>← Kembali ke Menu</button>
      </section>
    </main>
  );
}

/* ── Pending Payment Page ── */
function PendingPaymentPage({ sessionToken, onMenu, onReceipt }) {
  const [status, setStatus] = useState('pending');
  const [countdown, setCountdown] = useState(900); // 15 menit
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await fetch(`/api/payments/status/${sessionToken}`).then((res) => res.json());
        if (result.success) {
          setStatus(result.data.status);
          if (result.data.status === 'paid' && result.data.order) {
            setOrder(result.data.order);
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000); // Polling setiap 3 detik

    return () => clearInterval(interval);
  }, [sessionToken]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    } else {
      setStatus('expired');
    }
  }, [countdown]);

  useEffect(() => {
    if (status === 'paid' && order) {
      setTimeout(() => onReceipt(order), 1000);
    }
  }, [status, order, onReceipt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'paid') {
    return (
      <main className="dk-main dk-simple-page">
        <section className="dk-pending">
          <div className="dk-pending-success">
            <div className="dk-pending-icon">✓</div>
            <h2>Pembayaran Berhasil!</h2>
            <p>Mengalihkan ke struk...</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === 'expired' || status === 'failed') {
    return (
      <main className="dk-main dk-simple-page">
        <section className="dk-pending">
          <div className="dk-pending-failed">
            <div className="dk-pending-icon">✕</div>
            <h2>Pembayaran {status === 'expired' ? 'Kadaluarsa' : 'Gagal'}</h2>
            <p>Silakan lakukan pemesanan ulang</p>
            <button className="dk-btn-pay" onClick={onMenu}>Kembali ke Menu</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dk-main dk-simple-page">
      <section className="dk-pending">
        <div className="dk-pending-header">
          <h2>Menunggu Pembayaran</h2>
          <p>Selesaikan pembayaran dalam {formatTime(countdown)}</p>
        </div>

        <div className="dk-pending-timer">
          <div className="dk-timer-circle">
            <span>{formatTime(countdown)}</span>
          </div>
        </div>

        <div className="dk-pending-info">
          <p>Scan QR code di aplikasi e-wallet atau mobile banking Anda</p>
          <p className="dk-pending-note">
            Pembayaran akan terverifikasi otomatis setelah berhasil
          </p>
        </div>

        <div className="dk-pending-actions">
          <button className="dk-btn-outline" onClick={onMenu}>Batalkan</button>
        </div>
      </section>
    </main>
  );
}

/* ── App ── */
function App() {
  const [menus, setMenus] = useState(initialMenus);

  const [cart, setCart] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [page, setPage] = useState('menu');
  const [receiptData, setReceiptData] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    fetch('/api/menus')
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) setMenus(transformApiMenus(result.data));
      })
      .catch(() => {});

    return undefined;
  }, []);

  const getStock = useCallback((id) => {
    for (const cat of menus) {
      const item = cat.items.find((i) => i.id === id);
      if (item) return item.stock ?? 0;
    }
    return 0;
  }, [menus]);

  const addToCart = useCallback((item) => {
    const stock = getStock(item.id);
    if (stock <= 0) return;
    setCart((c) => {
      const ex = c.find((x) => x.id === item.id);
      if (ex && ex.qty >= stock) return c;
      return ex ? c.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...item, qty: 1, note: '' }];
    });
  }, [getStock]);

  const increase = useCallback((id) => {
    const stock = getStock(id);
    setCart((c) => c.map((x) => {
      if (x.id !== id) return x;
      if (x.qty >= stock) return x;
      return { ...x, qty: x.qty + 1 };
    }));
  }, [getStock]);

  const decrease = useCallback((id) => setCart((c) => c.map((x) => x.id === id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0)), []);
  const updateNote = useCallback((id, note) => setCart((c) => c.map((x) => x.id === id ? { ...x, note } : x)), []);

  const itemCount = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => s + getDiscountedPrice(c) * c.qty, 0);

  const handleCheckout = useCallback(async (cartItems, orderTotal, customerInfo = {}) => {
    const payload = {
      customerName: customerInfo.customerName || '',
      customerPhone: customerInfo.customerPhone || '',
      customerAddress: customerInfo.customerAddress || '',
      customerLatitude: customerInfo.latitude || null,
      customerLongitude: customerInfo.longitude || null,
      notes: customerInfo.orderNotes || '',
      customerPostalCode: customerInfo.customerPostalCode || '',
      customerKelurahan: customerInfo.customerKelurahan || '',
      customerKecamatan: customerInfo.customerKecamatan || '',
      customerKota: customerInfo.customerKota || '',
      customerProvinsi: customerInfo.customerProvinsi || '',
      items: cartItems.map((item) => ({ menuId: item.id, quantity: item.qty, notes: item.note || null })),
    };

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Gagal membuat pembayaran');

      if (result.data?.sessionToken) {
        setPendingPayment(result.data.sessionToken);
        setPage('pending');
      } else {
        throw new Error('Token pembayaran tidak diterima dari backend.');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  return (
    <div className="dk-app">
      <Header onTracking={() => setPage('tracking')} />
      {page === 'menu' && <main className="dk-main">
        {menus.map((cat) => <CategorySection key={cat.name} category={cat} cart={cart} menus={menus} onAdd={addToCart} onIncrease={increase} onDecrease={decrease} />)}
      </main>}
      {page === 'tracking' && <OrderTrackingPage onMenu={() => setPage('menu')} />}
      {page === 'pending' && pendingPayment && (
        <PendingPaymentPage 
          sessionToken={pendingPayment} 
          onMenu={() => { setPendingPayment(null); setPage('menu'); }}
          onReceipt={(order) => { setReceiptData(order); setPendingPayment(null); setPage('receipt'); }}
        />
      )}
      {page === 'receipt' && <ReceiptPage data={receiptData} onMenu={() => setPage('menu')} onTracking={() => setPage('tracking')} />}
      {page === 'menu' && <CartBar itemCount={itemCount} total={total} onReview={() => setReviewOpen(true)} />}
      {reviewOpen && (
        <CartReview cart={cart} onClose={() => setReviewOpen(false)} onCheckout={handleCheckout} onUpdateNote={updateNote} onIncrease={increase} onDecrease={decrease} />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
