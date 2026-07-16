import { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { getMenuImage, FALLBACK_IMG, money, formatDate, validatePhoneInput, formatPhoneDisplay } from './data.js';
import html2canvas from 'html2canvas';
import './styles.css';

const categoryIcons = {
  makanan: 'restaurant',
  snack: 'icecream',
  minuman: 'local_cafe',
};

function MaterialIcon({ children, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function getDiscountedPrice(item) {
  if (!item.discountPercent) return item.price;
  return Math.round(item.price - (item.price * item.discountPercent / 100));
}

function transformApiMenus(list) {
  if (!Array.isArray(list)) return [];
  const grouped = new Map();
  list.forEach((menu) => {
    const categoryName = menu.category?.name || 'Menu';
    if (!grouped.has(categoryName)) grouped.set(categoryName, { name: categoryName, icon: menu.category?.icon || '', items: [] });
    const imageUrl = menu.imageUrl || 'default';
    grouped.get(categoryName).items.push({
      id: menu.id,
      name: menu.name,
      price: Number(menu.price),
      discountPercent: menu.discountPercent || null,
      image: String(imageUrl).startsWith('/uploads/') ? `/api${imageUrl}` : imageUrl,
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
function Header({ onHome, onTracking }) {
  return (
    <header className="dk-header">
      <div className="dk-header-top">
        <button type="button" className="dk-brand-icon-text dk-brand-home" onClick={onHome} aria-label="Ke halaman utama Dapur Kemas">DK</button>
        <div className="dk-brand-title">
          <h1>DAPUR KEMAS</h1>
        </div>
        <button className="dk-btn-nav" onClick={onTracking}>
          <MaterialIcon>search</MaterialIcon>
          Cari
        </button>
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
            <button onClick={() => onDecrease(item.id)} aria-label="Kurangi"><MaterialIcon>remove</MaterialIcon></button>
            <span>{qty}</span>
            <button onClick={() => onIncrease(item.id)} aria-label="Tambah" disabled={qty >= stock}><MaterialIcon>add</MaterialIcon></button>
          </div>
        ) : (
          <button className="dk-btn-add" onClick={() => onAdd(item)}>
            <MaterialIcon>add</MaterialIcon>
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
  const iconName = categoryIcons[String(category.name || '').toLocaleLowerCase('id-ID')] || 'restaurant_menu';
  return (
    <div className="dk-category">
      <button className="dk-category-header" onClick={() => setOpen((p) => !p)} aria-expanded={open}>
        <span className="dk-category-icon"><MaterialIcon>{iconName}</MaterialIcon></span>
        <span className="dk-category-label">{category.name}</span>
        <span className="dk-category-count">{category.items.length} menu</span>
        <MaterialIcon className="dk-chevron">{open ? 'expand_less' : 'expand_more'}</MaterialIcon>
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
  const [shippingInfo, setShippingInfo] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [packingFee, setPackingFee] = useState(0);

  useEffect(() => {
    fetch('/api/settings/public').then(r => r.json()).then(r => {
      if (r.success) setPackingFee(r.data.packingFee || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!latitude || !longitude) { setShippingInfo(null); return; }
    setShippingLoading(true);
    fetch('/api/payments/checkout/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerLatitude: latitude, customerLongitude: longitude }),
    })
      .then(r => r.json())
      .then(r => { if (r.success) setShippingInfo(r.data); })
      .catch(() => setShippingInfo(null))
      .finally(() => setShippingLoading(false));
  }, [latitude, longitude]);

  const deliveryFee = Number(shippingInfo?.tariff || 0);
  const discountAmount = 0;
  const grandTotal = subtotal - discountAmount + deliveryFee + packingFee;

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
    if (!latitude || !longitude) { setFormError('Ambil lokasi GPS dulu agar ongkir bisa dihitung sesuai zona.'); return; }
    if (shippingLoading) { setFormError('Ongkir masih dihitung. Tunggu sebentar.'); return; }
    if (!shippingInfo) { setFormError('Ongkir belum berhasil dihitung. Coba ambil lokasi ulang.'); return; }
    if (shippingInfo.outOfRange) { setFormError('Alamat di luar jangkauan pengiriman. Hubungi admin.'); return; }
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
        <div className="dk-review-sheet dk-checkout-sheet" onClick={(e) => e.stopPropagation()}>
     <div className="dk-review-header"><h2>Konfirmasi Pembayaran</h2><button className="dk-btn-close" onClick={onClose}><MaterialIcon>close</MaterialIcon></button></div>

          <div className="dk-review-items">
  {cart.map((c) => {
            const discounted = getDiscountedPrice(c);
      return (
       <div key={c.id} className="dk-review-item">
       <div className="dk-menu-thumb" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
    <img src={getMenuImage(c.image)} alt={c.name} onError={(e) => { e.target.src = FALLBACK_IMG; }} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0' }} />
     </div>
      <div className="dk-review-info">
        <strong>{c.name}</strong>
      <span className="dk-review-meta">{money(discounted)} × {c.qty}</span>
    {c.note && <span className="dk-review-note">Catatan: {c.note}</span>}
            </div>
      <span className="dk-review-item-total">{money(discounted * c.qty)}</span>
                </div>
   );
            })}
          </div>

       <div className="dk-review-bill">
         <div className="dk-bill-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="dk-bill-row"><span>Ongkir{shippingInfo?.zoneCode ? ` (${shippingInfo.zoneCode}, ${shippingInfo.distanceKm} km)` : ''}</span><strong>{shippingLoading ? 'Menghitung...' : money(deliveryFee)}</strong></div>
         <div className="dk-bill-row"><span>Biaya Packing</span><strong>{money(packingFee)}</strong></div>
         <div className="dk-bill-row dk-bill-total"><span>Total</span><strong>{money(grandTotal)}</strong></div>
       </div>

 <div className="dk-review-summary">
            <div className="dk-review-row"><span>Nama</span><strong>{customerName}</strong></div>
         <div className="dk-review-row"><span>No. HP</span><strong>+62 {phonePreview.formatted || customerPhone}</strong></div>
            <div className="dk-review-row"><span>Metode</span><strong>QRIS</strong></div>
    </div>
          <div className="dk-payment-note">QRIS sandbox Midtrans akan terbuka setelah tombol bayar ditekan.</div>
          {shippingInfo?.outOfRange && <div className="dk-form-error">Alamat di luar jangkauan pengiriman. Hubungi admin.</div>}
          {!shippingInfo?.outOfRange && formError && <div className="dk-form-error">{formError}</div>}
          <div className="dk-sheet-footer">
            <button className="dk-btn-half dk-btn-half-back" onClick={() => setStep('info')}>
              <MaterialIcon>arrow_back</MaterialIcon>
              Kembali
            </button>
            <button className="dk-btn-pay" disabled={paymentLoading || shippingInfo?.outOfRange} onClick={async () => {
              setPaymentLoading(true);
              setFormError('');
              try {
                await onCheckout(cart, grandTotal, customerInfo);
                onClose();
              } catch (error) {
                setFormError(error.message || 'Gagal membuat pembayaran');
              } finally {
                setPaymentLoading(false);
              }
            }}>{paymentLoading ? 'Memproses...' : 'Konfirmasi & Bayar'}</button>
          </div>
  </div>
      </div>
    );
  }

  // ── STEP: CUSTOMER INFO ──
  if (step === 'info') {
    return (
      <div className="dk-overlay dk-overlay-full" onClick={onClose}>
        <div className="dk-review-sheet dk-shipping-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="dk-review-header">
            <div className="dk-review-header-inner">
              <h2>Data Pengiriman</h2>
              <button className="dk-btn-close" onClick={onClose}><MaterialIcon>close</MaterialIcon></button>
            </div>
          </div>

          <div className="dk-review-body">
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
              <div className="dk-address-grid">
                <div>
                  <label>Kode Pos</label>
                  <input className="dk-form-input" inputMode="numeric" maxLength="5" placeholder="Cth: 12345" value={customerPostalCode} onChange={(e) => { setCustomerPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5)); setFormError(''); }} />
                </div>
                <div>
                  <label>Kelurahan</label>
                  <select className="dk-form-input" value={selectedLocation?.kelurahan || ''} onChange={(e) => setSelectedLocation(locations.find((loc) => loc.kelurahan === e.target.value) || null)}>
                    <option value="">Pilih kelurahan</option>
                    {locations.map((loc) => <option key={`${loc.postalCode}-${loc.kelurahan}`} value={loc.kelurahan}>{loc.kelurahan}</option>)}
                  </select>
                </div>
              </div>
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
              <textarea className="dk-form-input dk-form-textarea" placeholder="Nama jalan, gedung, no. rumah/unit..." value={customerAddress} onChange={(e) => { setCustomerAddress(e.target.value); setFormError(''); }} rows={2} />
            </div>

            <div className="dk-form-group">
              <label>Lokasi untuk Ongkir</label>
              <button type="button" className={`dk-gps-btn ${gpsStatus === 'success' ? 'dk-gps-success' : ''}`} onClick={useGPS} disabled={gpsStatus === 'loading'}>
                {gpsStatus === 'loading' ? 'Mengambil lokasi...' : gpsStatus === 'success' ? 'Lokasi GPS tersimpan' : 'Ambil Lokasi GPS'}
              </button>
              {latitude && longitude && <div className="dk-gps-coords">Koordinat: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</div>}
              {shippingInfo && !shippingInfo.outOfRange && <div className="dk-address-preview">Ongkir: {money(deliveryFee)} ({shippingInfo.zoneCode}, {shippingInfo.distanceKm} km)</div>}
              {shippingInfo?.outOfRange && <div className="dk-address-preview dk-address-warning">Alamat di luar jangkauan pengiriman.</div>}
            </div>

            <div className="dk-form-group">
              <label>Catatan Pesanan (opsional)</label>
              <textarea className="dk-form-input dk-form-textarea" placeholder="Tinggalkan catatan untuk pengemudi atau restoran..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2} />
            </div>

            {formError && <div className="dk-form-error">{formError}</div>}
          </div>

          <div className="dk-sheet-footer">
            <div className="dk-sheet-footer-inner">
              <button className="dk-btn-half dk-btn-half-back" onClick={() => setStep('cart')}>
                <MaterialIcon>arrow_back</MaterialIcon>
                Kembali
              </button>
              <button className="dk-btn-pay" onClick={proceedToConfirm}>Lanjut ke Pembayaran</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: CART ──
  return (
    <div className="dk-overlay" onClick={onClose}>
        <div className="dk-review-sheet dk-checkout-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dk-review-header"><h2>Pesanan Anda</h2><button className="dk-btn-close" onClick={onClose}><MaterialIcon>close</MaterialIcon></button></div>
        <div className="dk-review-items">
          {cart.map((c) => {
            const discounted = getDiscountedPrice(c);
            return (
              <div key={c.id} className="dk-review-item">
                <div className="dk-menu-thumb" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                  <img src={getMenuImage(c.image)} alt={c.name} onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0' }} />
                </div>
                <div className="dk-review-info">
                  <strong>{c.name}</strong>
                  <span className="dk-review-meta">{money(discounted)} × {c.qty}</span>
                  <input className="dk-note-input" placeholder="Tambah catatan (misal: tidak pedas, extra sambal)..." value={c.note || ''} onChange={(e) => onUpdateNote(c.id, e.target.value)} />
                </div>
                <div className="dk-review-stepper">
                  <div className="dk-stepper">
                    <button onClick={() => onDecrease(c.id)}><MaterialIcon>remove</MaterialIcon></button><span>{c.qty}</span><button onClick={() => onIncrease(c.id)}><MaterialIcon>add</MaterialIcon></button>
                  </div>
                  <span className="dk-review-item-total">{money(discounted * c.qty)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="dk-review-bill">
          <div className="dk-bill-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="dk-bill-row"><span>Biaya Packing</span><strong>{money(packingFee)}</strong></div>
          <div className="dk-bill-row dk-bill-total"><span>Total (sebelum ongkir)</span><strong>{money(subtotal + packingFee)}</strong></div>
        </div>
        <div className="dk-sheet-footer">
          <button className="dk-btn-half dk-btn-half-back" onClick={onClose}>
            <MaterialIcon>home</MaterialIcon>
            Kembali
          </button>
          <button className="dk-btn-pay" onClick={() => setStep('info')}>Isi Data Pengiriman</button>
        </div>
      </div>
    </div>
  );
}

/* ── Cart Bar ── */
function CartBar({ itemCount, total, onReview }) {
  if (itemCount === 0) {
    return (
      <div className="dk-cartbar dk-cartbar-empty">
        <div className="dk-cartbar-inner">
          <div className="dk-cartbar-info">
            <MaterialIcon>shopping_cart</MaterialIcon>
            <span>Pilih menu untuk memulai pesanan</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="dk-cartbar dk-cartbar-filled">
      <div className="dk-cartbar-inner">
        <div className="dk-cartbar-info"><div className="dk-cartbar-count">{itemCount} item</div><div className="dk-cartbar-total">{money(total)}</div></div>
        <button className="dk-btn-pay" onClick={onReview}>
          <MaterialIcon>point_of_sale</MaterialIcon>
          Checkout
        </button>
      </div>
    </div>
  );
}

function ReceiptPage({ data, onMenu, onTracking }) {
  const order = data?.order || data;
  const printRef = useRef(null);
  const artifactsRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [artifactsReady, setArtifactsReady] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState({});
  const items = order?.items || [];
  const orderNumber = order?.orderNumber || order?.id;

  useEffect(() => {
    fetch('/api/settings/public').then(r => r.json()).then(r => {
      if (r.success) setStoreSettings(r.data);
    }).catch(() => {});
  }, []);

  // Hitung addressDetail DULU sebelum dipakai di shareText
  const locationParts = [
    order?.customerKelurahan,
    order?.customerKecamatan,
    order?.customerKota,
    order?.customerProvinsi,
  ].filter(Boolean);
  const addressDetail = locationParts.reduce((address, part) => {
    const separatorIndex = address.toLocaleLowerCase('id-ID').indexOf(`, ${String(part).toLocaleLowerCase('id-ID')}`);
    return separatorIndex >= 0 ? address.slice(0, separatorIndex).trim() : address;
  }, String(order?.customerAddress || '').trim());

  const pad35 = (l, r) => {
    const maxW = 35;
    const gap = maxW - l.length - r.length;
    return l + (gap > 0 ? ' '.repeat(gap) : ' ') + r;
  };
  const sep35 = '='.repeat(35);
  const dash35 = '-'.repeat(35);
  const shareLines = [
    '       DAPUR KEMAS',
    storeSettings.storeAddress || '',
    storeSettings.waAdmin ? `WA: ${storeSettings.waAdmin}` : '',
    sep35,
    pad35('No. Nota:', orderNumber),
    pad35('Tanggal:', formatDate(order?.createdAt || new Date())),
    pad35('Status:', 'LUNAS'),
    dash35,
    `Penerima: ${order?.customerName || '-'}`,
    `HP: ${order?.customerPhone || '-'}`,
    `Alamat: ${addressDetail || '-'}`,
    dash35,
    'Rincian Pesanan:',
    ...items.map(item => {
      const qty = item.quantity || item.qty || 1;
      const name = item.menuName || item.name;
      const sub = Number(item.subtotal || 0);
      return `${qty}x ${name.substring(0, 20).padEnd(20)} ${money(sub)}`;
    }),
    dash35,
    pad35('Subtotal:', money(Number(order?.subtotal || 0))),
    ...(Number(order?.discountAmount || 0) > 0 ? [pad35(`Diskon (${order.discountPercent}%):`, `-${money(Number(order.discountAmount))}`)] : []),
    pad35(`Ongkir${order.shippingZoneCode ? ` ${order.shippingZoneCode}` : ''}:`, money(Number(order?.deliveryFee || 0))),
    ...(Number(order?.packingFee || 0) > 0 ? [pad35('Biaya Packing:', money(Number(order.packingFee)))] : []),
    sep35,
    pad35('TOTAL BAYAR:', money(Number(order?.total || 0))),
    sep35,
    '   -- PEMBAYARAN VALID --',
    '  Terima kasih atas pesanan Anda',
  ].filter(Boolean);
  const shareText = shareLines.join('\n');

  const buildReceiptArtifacts = useCallback(async () => {
    const node = printRef.current;
    if (!node) throw new Error('Receipt node belum siap');

    // Pastikan logo sudah termuat sebelum capture supaya tidak kosong di JPEG.
    const imgs = Array.from(node.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            })
      )
    );

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const jpegBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Gagal membuat gambar struk')), 'image/jpeg', 0.82);
    });
    return { jpegBlob };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setArtifactsReady(false);
    artifactsRef.current = null;

    buildReceiptArtifacts()
      .then((artifacts) => {
        if (cancelled) return;
        artifactsRef.current = artifacts;
        setArtifactsReady(true);
      })
      .catch((err) => console.error('Gagal menyiapkan struk:', err));

    return () => { cancelled = true; };
  }, [buildReceiptArtifacts]);

  const getArtifacts = async () => {
    if (artifactsRef.current) return artifactsRef.current;
    const artifacts = await buildReceiptArtifacts();
    artifactsRef.current = artifacts;
    setArtifactsReady(true);
    return artifacts;
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { jpegBlob } = await getArtifacts();
      const url = URL.createObjectURL(jpegBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `struk-${orderNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Gagal membuat struk JPEG:', err);
      alert('Gagal membuat struk. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (busy || !artifactsRef.current) return;
    try {
      const { jpegBlob } = artifactsRef.current;
      const imageFile = new File([jpegBlob], `struk-${orderNumber}.jpg`, { type: 'image/jpeg' });

      if (window.isSecureContext && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [imageFile] })) {
        setBusy(true);
        await navigator.share({
          title: `Resi #${orderNumber}`,
          text: shareText,
          files: [imageFile],
        });
      } else if (window.isSecureContext && typeof navigator.share === 'function') {
        setBusy(true);
        await navigator.share({ title: `Resi #${orderNumber}`, text: shareText });
      } else {
        setShareMenuOpen(true);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Gagal membagikan struk:', err);
        setShareMenuOpen(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const openShareTarget = (target) => {
    const encodedText = encodeURIComponent(shareText);
    const targets = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodedText}`,
      email: `mailto:?subject=${encodeURIComponent(`Resi #${orderNumber}`)}&body=${encodedText}`,
    };
    window.open(targets[target], '_blank', 'noopener,noreferrer');
    setShareMenuOpen(false);
  };

  const copyReceiptText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const input = document.createElement('textarea');
      input.value = shareText;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setShareMenuOpen(false);
  };

  if (!order) {
    return (
      <main className="dk-main dk-simple-page">
        <section className="dk-receipt">
          <div className="dk-pending-failed">
            <div className="dk-pending-icon">⚠</div>
            <h2>Data Struk Tidak Tersedia</h2>
            <p>Terjadi kesalahan saat memuat data pesanan</p>
            <button className="dk-btn-pay" onClick={onMenu}>Kembali ke Menu</button>
          </div>
        </section>
      </main>
    );
  }

  if (!items || items.length === 0) {
    return (
      <main className="dk-main dk-simple-page">
        <section className="dk-receipt">
          <div className="dk-pending-failed">
            <div className="dk-pending-icon">⚠</div>
            <h2>Data Pesanan Tidak Lengkap</h2>
            <p>Items pesanan tidak ditemukan</p>
            <button className="dk-btn-pay" onClick={onMenu}>Kembali ke Menu</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dk-main dk-simple-page">
      <section className="dk-receipt">
        <div className="dk-receipt-document" ref={printRef}>
          <div className="dk-receipt-header">
          <img src="/icon.png" alt="Dapur Kemas" className="dk-receipt-logo-img" />
          <h2>DAPUR KEMAS</h2>
          <p>{storeSettings.storeAddress || 'Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok'}</p>
          {storeSettings.waAdmin && <p>WA: {storeSettings.waAdmin}</p>}
          </div>

          <div className="dk-receipt-meta">
            <div><span>No. Pesanan</span><strong>{orderNumber}</strong></div>
            <div><span>Tanggal</span><strong>{formatDate(order.createdAt || new Date())}</strong></div>
            <div><span>Status</span><strong className="dk-receipt-status">LUNAS</strong></div>
          </div>

          <div className="dk-receipt-section">
          <h4>Info Pelanggan</h4>
          <div className="dk-receipt-customer">
            <p><strong>{order.customerName || '-'}</strong></p>
            <p>{order.customerPhone || '-'}</p>
            <p>{addressDetail || '-'}</p>
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
          {Number(order.discountAmount || 0) > 0 && <div className="dk-receipt-summary-row"><span>Diskon ({order.discountPercent || 0}%)</span><span>-{money(Number(order.discountAmount))}</span></div>}
          <div className="dk-receipt-summary-row"><span>Biaya Ongkir{order.shippingZoneCode ? ` (${order.shippingZoneCode}, ${order.shippingDistanceKm || '?'} km)` : ''}</span><span>{money(Number(order.deliveryFee || 0))}</span></div>
          {Number(order.packingFee || 0) > 0 && <div className="dk-receipt-summary-row"><span>Biaya Packing</span><span>{money(Number(order.packingFee))}</span></div>}
          {Number(order.serviceFee || 0) > 0 && Number(order.packingFee || 0) === 0 && <div className="dk-receipt-summary-row"><span>Biaya Layanan</span><span>{money(Number(order.serviceFee))}</span></div>}
          <div className="dk-receipt-summary-row dk-receipt-summary-total"><span>TOTAL BAYAR</span><strong>{money(Number(order.total || 0))}</strong></div>
          </div>

          <div className="dk-receipt-footer">
          <p>-- PEMBAYARAN VALID --</p>
          <p>Terima kasih atas pesanan Anda.</p>
            <p className="dk-receipt-legal">Struk ini adalah bukti pembayaran yang sah.</p>
          </div>
        </div>

        <div className="dk-receipt-actions">
          <button className="dk-receipt-action" onClick={handleShare} disabled={busy || !artifactsReady} aria-label="Bagikan struk">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.6 6.8-4.1M8.6 13.4l6.8 4.1"/></svg><span>Bagikan</span>
          </button>
          <button className="dk-receipt-action" onClick={handleSave} disabled={busy} aria-label="Simpan struk JPEG">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></svg><span>Simpan</span>
          </button>
          <button className="dk-receipt-action" onClick={onTracking} aria-label="Cek status pesanan">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Status</span>
          </button>
          <button className="dk-receipt-action" onClick={onMenu} aria-label="Pesan lagi">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg><span>Ulangi</span>
          </button>
        </div>
      </section>

      {shareMenuOpen && (
        <div className="dk-share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-receipt-title">
          <button className="dk-share-sheet-backdrop" aria-label="Tutup pilihan bagikan" onClick={() => setShareMenuOpen(false)} />
          <div className="dk-share-sheet-panel">
            <div className="dk-share-sheet-header">
              <div><h3 id="share-receipt-title">Bagikan Struk</h3><p>Pilih aplikasi tujuan</p></div>
              <button onClick={() => setShareMenuOpen(false)} aria-label="Tutup">×</button>
            </div>
            <div className="dk-share-options">
              <button onClick={() => openShareTarget('whatsapp')}><strong>WA</strong><span>WhatsApp</span></button>
              <button onClick={() => openShareTarget('telegram')}><strong>TG</strong><span>Telegram</span></button>
              <button onClick={() => openShareTarget('email')}><strong>@</strong><span>Email</span></button>
              <button onClick={copyReceiptText}><strong>CP</strong><span>Salin</span></button>
            </div>
            <button className="dk-share-download" onClick={() => { handleSave(); setShareMenuOpen(false); }}>Unduh Struk JPEG</button>
          </div>
        </div>
      )}
    </main>
  );
}

function OrderTrackingPage({ onMenu }) {
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const statuses = ['confirmed', 'preparing', 'packaging', 'delivering', 'completed'];

  async function submit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) { setError('Masukkan nomor HP atau nomor pesanan'); return; }

    setLoading(true); setError('');
    try {
      const validation = validatePhoneInput(trimmed);
      const looksLikePhone = validation.isValid || /^[+\d][\d\s-]{7,}$/.test(trimmed);
      const endpoint = validation.isValid || looksLikePhone
        ? `/api/orders/track-by-phone/${encodeURIComponent(trimmed)}`
        : `/api/orders/track/${encodeURIComponent(trimmed.toUpperCase())}`;
      const result = await fetch(endpoint).then((res) => res.json());
      if (!result.success) throw new Error(result.message);
      setOrders(Array.isArray(result.data) ? result.data : [result.data].filter(Boolean));
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
          <p>Masukkan nomor HP atau nomor pesanan</p>
        </div>

        <form onSubmit={submit} className="dk-tracking-input-group">
          <input className="dk-form-input" type="text" placeholder="812-3456-7890 atau DK-20260714-0001" value={query} onChange={(e) => { setQuery(e.target.value); setError(''); }} />
          <button className="dk-btn-pay" disabled={loading}>{loading ? '...' : 'Cek'}</button>
        </form>
        {query && validatePhoneInput(query).isValid && <div className="dk-phone-preview valid">Format pencarian HP: +62 {validatePhoneInput(query).formatted}</div>}

        {error && <div className="dk-form-error">{error}</div>}

        <div className="dk-tracking-results">
          {orders.length === 0 && !loading && (
              <div className="dk-empty-state">
              <div className="dk-empty-state-icon">ORD</div>
              <p>Masukkan nomor HP atau nomor pesanan untuk mencari pesanan</p>
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
          <p>Lanjutkan pembayaran di popup Midtrans yang terbuka.</p>
          <p>Pilih metode QRIS, lalu ikuti instruksi sandbox Midtrans.</p>
          <p className="dk-pending-note">
            Status dicek otomatis. Jangan tutup halaman ini sebelum pembayaran selesai.
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
  const [menus, setMenus] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');

  const [cart, setCart] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [page, setPage] = useState('menu');
  const [receiptData, setReceiptData] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    if (page !== 'menu') return undefined;

    const loadMenus = () => {
      setMenuLoading(true);
      setMenuError('');
      fetch('/api/menus')
        .then((res) => res.json())
        .then((result) => {
          if (result.success && Array.isArray(result.data)) {
            setMenus(transformApiMenus(result.data));
          } else {
            setMenus([]);
            setMenuError(result?.message || 'Gagal memuat menu');
          }
        })
        .catch(() => {
          setMenus([]);
          setMenuError('Gagal terhubung ke server menu');
        })
        .finally(() => setMenuLoading(false));
    };

    loadMenus();

    return undefined;
  }, [page]);

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
return ex ? c.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { 
        id: item.id,
        name: item.name,
        price: item.price,
    discountPercent: item.discountPercent,
     image: item.image,
        description: item.description,
        stock: item.stock,
        qty: 1, 
     note: '' 
      }];
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

  const resetCustomerSession = useCallback(() => {
    setCart([]);
    setReviewOpen(false);
    setPendingPayment(null);
    setReceiptData(null);
    setPage('menu');
  }, []);

  const handleCheckout = useCallback(async (cartItems, orderTotal, customerInfo = {}) => {
    const payload = {
      customerName: customerInfo.customerName || '',
      customerPhone: customerInfo.customerPhone || '',
      customerAddress: customerInfo.customerAddress || '',
      customerPostalCode: customerInfo.customerPostalCode || '',
      customerKelurahan: customerInfo.customerKelurahan || '',
      customerKecamatan: customerInfo.customerKecamatan || '',
      customerKota: customerInfo.customerKota || '',
      customerProvinsi: customerInfo.customerProvinsi || '',
      customerLatitude: customerInfo.latitude || null,
      customerLongitude: customerInfo.longitude || null,
      items: cartItems.map((item) => ({ menuId: item.id, quantity: item.qty, note: item.note || '' })),
      notes: customerInfo.orderNotes || '',
      discountPercent: 0,
    };

    try {
      const result = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((res) => res.json());

      if (result.success) {
        setPendingPayment(result.data.sessionToken);
        setPage('pending');

        window.snap.pay(result.data.snapToken, {
          // Polling backend menentukan status final; callback ini mencegah Snap memakai finish redirect URL.
          onSuccess: () => {},
          onPending: () => {},
          onError: () => {},
          onClose: () => {},
        });
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const handleReceipt = useCallback((order) => {
    setCart([]);
    setReviewOpen(false);
    setReceiptData(order);
    setPendingPayment(null);
    setPage('receipt');
  }, []);

  return (
    <>
    <div className="dk-app">
      <Header onHome={resetCustomerSession} onTracking={() => { setReviewOpen(false); setPage('tracking'); }} />
      {page === 'menu' && <main className="dk-main">
        {menuLoading && <div className="dk-empty-state">Memuat menu...</div>}
        {!menuLoading && menuError && <div className="dk-empty-state">{menuError}</div>}
        {!menuLoading && !menuError && menus.length === 0 && <div className="dk-empty-state">Menu belum tersedia</div>}
        {!menuLoading && !menuError && menus.map((cat) => <CategorySection key={cat.name} category={cat} cart={cart} menus={menus} onAdd={addToCart} onIncrease={increase} onDecrease={decrease} />)}
      </main>}
      {page === 'tracking' && <OrderTrackingPage onMenu={resetCustomerSession} />}
      {page === 'pending' && pendingPayment && (
        <PendingPaymentPage 
          sessionToken={pendingPayment} 
          onMenu={resetCustomerSession}
          onReceipt={handleReceipt}
        />
      )}
      {page === 'receipt' && <ReceiptPage data={receiptData} onMenu={resetCustomerSession} onTracking={() => { setReviewOpen(false); setPage('tracking'); }} />}
    </div>
      {page === 'menu' && <CartBar itemCount={itemCount} total={total} onReview={() => setReviewOpen(true)} />}
      {reviewOpen && (
        <CartReview cart={cart} onClose={() => setReviewOpen(false)} onCheckout={handleCheckout} onUpdateNote={updateNote} onIncrease={increase} onDecrease={decrease} />
      )}
    </>
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
