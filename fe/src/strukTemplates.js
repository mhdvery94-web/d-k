import jsPDF from 'jspdf';
import { money, formatDate } from './data.js';

const W = 35;
const SEP = '='.repeat(W);
const DASH = '-'.repeat(W);

function pad(l, r, w = W) {
  const gap = w - l.length - r.length;
  return l + (gap > 0 ? ' '.repeat(gap) : ' ') + r;
}

function wrapLine(text, maxW = W) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  words.forEach(word => {
    if ((cur + ' ' + word).trim().length > maxW) { lines.push(cur); cur = word; }
    else cur = cur ? cur + ' ' + word : word;
  });
  if (cur) lines.push(cur);
  return lines;
}

function centerText(text, w = W) {
  const gap = Math.max(0, Math.floor((w - text.length) / 2));
  return ' '.repeat(gap) + text;
}

// ── STRUK #1: Pembayaran ──
export function buildStrukPembayaran(order, settings = {}) {
  const lines = [];
  lines.push(centerText('DAPUR KEMAS'));
  if (settings.storeAddress) wrapLine(settings.storeAddress).forEach(l => lines.push(centerText(l)));
  if (settings.waAdmin) lines.push(centerText(`WA: ${settings.waAdmin}`));
  lines.push(SEP);
  lines.push(pad('No. Nota:', order.orderNumber || '-'));
  lines.push(pad('Tanggal:', formatDate(order.createdAt || new Date())));
  lines.push(pad('Bayar:', 'QRIS'));
  lines.push(pad('Status:', 'LUNAS'));
  lines.push(DASH);
  lines.push('Penerima:');
  lines.push(`  ${order.customerName || '-'}`);
  lines.push(`  ${order.customerPhone || '-'}`);
  const addr = order.customerAddress || '-';
  wrapLine(addr, W - 2).forEach(l => lines.push(`  ${l}`));
  lines.push(DASH);
  lines.push('Rincian Pesanan:');
  (order.items || []).forEach(item => {
    const qty = item.quantity || item.qty || 1;
    const name = (item.menuName || item.name || '').substring(0, 20);
    const price = Number(item.subtotal || 0);
    lines.push(`${qty}x ${name.padEnd(20)} ${money(price)}`);
  });
  lines.push(DASH);
  lines.push(pad('Subtotal:', money(Number(order.subtotal || 0))));
  if (Number(order.discountAmount || 0) > 0) {
    lines.push(pad(`Diskon (${order.discountPercent || 0}%):`, `-${money(Number(order.discountAmount))}`));
  }
  const zoneLabel = order.shippingZoneCode ? ` ${order.shippingZoneCode} ${order.shippingDistanceKm || '?'}km` : '';
  lines.push(pad(`Biaya Ongkir${zoneLabel}:`, money(Number(order.deliveryFee || 0))));
  if (Number(order.packingFee || 0) > 0) {
    lines.push(pad('Biaya Packing:', money(Number(order.packingFee))));
  }
  // backward compat: show serviceFee for old orders
  if (Number(order.serviceFee || 0) > 0 && !Number(order.packingFee || 0)) {
    lines.push(pad('Biaya Layanan:', money(Number(order.serviceFee))));
  }
  lines.push(SEP);
  lines.push(pad('TOTAL BAYAR:', money(Number(order.total || 0))));
  lines.push(SEP);
  lines.push(centerText('-- PEMBAYARAN VALID --'));
  lines.push(centerText('Terima kasih atas pesanan Anda'));
  return lines.join('\n');
}

// ── STRUK #2: Form Ceklist Operasional ──
export function buildFormCeklistOps(order, checklistState = {}) {
  const lines = [];
  lines.push(centerText('DAPUR KEMAS'));
  lines.push(centerText('CEKLIST PESANAN'));
  lines.push(SEP);
  lines.push(pad('No. Order:', order.orderNumber || '-'));
  lines.push(pad('Tanggal:', formatDate(order.createdAt || new Date())));
  lines.push(pad('Pelanggan:', (order.customerName || '-').substring(0, 18)));
  lines.push(DASH);
  lines.push('Item:');
  (order.items || []).forEach(item => {
    const qty = item.quantity || item.qty || 1;
    const name = (item.menuName || item.name || '').substring(0, 22);
    const chk = checklistState[`item-${item.id}`] ? '[v]' : '[ ]';
    lines.push(`${chk} ${qty}x ${name}`);
  });
  lines.push(DASH);
  lines.push('Validasi:');
  lines.push(`${checklistState.check1 ? '[v]' : '[ ]'} Picking lengkap`);
  lines.push(`${checklistState.check2 ? '[v]' : '[ ]'} Packing lengkap`);
  lines.push(DASH);
  lines.push(`Petugas 1: ${checklistState.officer1 || '________'}`);
  lines.push(`Petugas 2: ${checklistState.officer2 || '________'}`);
  lines.push(`Catatan: ${checklistState.notes || '________'}`);
  lines.push(SEP);
  return lines.join('\n');
}

// ── STRUK #3: Tiket Produksi ──
export function buildTiketProduksi(order) {
  const lines = [];
  lines.push(centerText('TIKET PRODUKSI'));
  lines.push(SEP);
  lines.push(pad('Order:', order.orderNumber || '-'));
  lines.push(pad('Tanggal:', formatDate(order.createdAt || new Date())));
  lines.push(DASH);
  (order.items || []).forEach(item => {
    const qty = item.quantity || item.qty || 1;
    const name = (item.menuName || item.name || '').substring(0, 28);
    lines.push(`${String(qty).padStart(3)}x ${name}`);
    if (item.notes) lines.push(`     Catatan: ${item.notes.substring(0, 20)}`);
  });
  lines.push(DASH);
  if (order.notes) {
    lines.push(`Catatan order:`);
    wrapLine(order.notes).forEach(l => lines.push(`  ${l}`));
  }
  lines.push(SEP);
  return lines.join('\n');
}

// ── STRUK #4: Slip Alamat Kurir ──
export function buildSlipAlamat(order) {
  const lines = [];
  lines.push(centerText('SLIP PENGIRIMAN'));
  lines.push(SEP);
  lines.push(pad('Order:', order.orderNumber || '-'));
  lines.push(DASH);
  lines.push('PENERIMA:');
  lines.push(`  ${order.customerName || '-'}`);
  lines.push(`  ${order.customerPhone || '-'}`);
  lines.push('ALAMAT:');
  wrapLine(order.customerAddress || '-', W - 2).forEach(l => lines.push(`  ${l}`));
  if (order.customerKelurahan) {
    lines.push(`  ${order.customerKelurahan}, ${order.customerKecamatan}`);
    lines.push(`  ${order.customerKota}, ${order.customerProvinsi}`);
    if (order.customerPostalCode) lines.push(`  ${order.customerPostalCode}`);
  }
  if (order.shippingZoneCode) {
    lines.push(DASH);
    lines.push(pad('Zona:', order.shippingZoneCode));
    lines.push(pad('Jarak:', `${order.shippingDistanceKm || '?'} km`));
  }
  lines.push(SEP);
  return lines.join('\n');
}

// ── STRUK #5: Nota Retur ──
export function buildNotaRetur(order, returData = {}) {
  const lines = [];
  lines.push(centerText('DAPUR KEMAS'));
  lines.push(centerText('NOTA RETUR / PEMBATALAN'));
  lines.push(SEP);
  lines.push(pad('No. Order:', order.orderNumber || '-'));
  lines.push(pad('Tanggal:', formatDate(order.createdAt || new Date())));
  lines.push(pad('Pelanggan:', (order.customerName || '-').substring(0, 18)));
  lines.push(DASH);
  lines.push('Item yang dibatalkan:');
  (order.items || []).forEach(item => {
    const qty = item.quantity || item.qty || 1;
    const name = (item.menuName || item.name || '').substring(0, 20);
    const sub = Number(item.subtotal || 0);
    lines.push(`${qty}x ${name.padEnd(20)} ${money(sub)}`);
  });
  lines.push(DASH);
  lines.push(pad('Total Retur:', money(Number(order.total || 0))));
  lines.push(DASH);
  lines.push(`Alasan: ${returData.reason || '________________'}`);
  lines.push(`Diproses: ${returData.processedBy || '________'}`);
  lines.push(`Tgl Retur: ${formatDate(returData.date || new Date())}`);
  lines.push(SEP);
  return lines.join('\n');
}

// ── STRUK #6: Laporan Rekap Harian ──
export function buildLaporanRekap(rekapData = {}) {
  const lines = [];
  lines.push(centerText('DAPUR KEMAS'));
  lines.push(centerText('LAPORAN REKAP HARIAN'));
  lines.push(SEP);
  lines.push(pad('Periode:', `${rekapData.startDate || '-'} s/d ${rekapData.endDate || '-'}`));
  lines.push(DASH);
  lines.push(pad('Total Pesanan:', String(rekapData.totalOrders || 0)));
  lines.push(pad('Subtotal:', money(Number(rekapData.totalSubtotal || 0))));
  lines.push(pad('Total Diskon:', money(Number(rekapData.totalDiscount || 0))));
  lines.push(pad('Total Ongkir:', money(Number(rekapData.totalDelivery || 0))));
  lines.push(pad('Total Packing:', money(Number(rekapData.totalPacking || 0))));
  lines.push(SEP);
  lines.push(pad('TOTAL PENDAPATAN:', money(Number(rekapData.totalRevenue || 0))));
  lines.push(SEP);
  if (rekapData.zoneBreakdown?.length) {
    lines.push('');
    lines.push('Distribusi Zona:');
    rekapData.zoneBreakdown.forEach(z => {
      lines.push(pad(`  ${z.zoneCode} (${z.count} order)`, money(z.totalDelivery)));
    });
  }
  if (rekapData.itemBreakdown?.length) {
    lines.push('');
    lines.push('Stok Keluar:');
    rekapData.itemBreakdown.forEach(item => {
      lines.push(pad(`  ${item.menuName.substring(0, 22)}`, `${item.qty} pcs`));
    });
  }
  lines.push(DASH);
  lines.push(centerText(`Dicetak: ${new Date().toLocaleString('id-ID')}`));
  lines.push(SEP);
  return lines.join('\n');
}

// ── PDF generator from text (35-char monospace) ──
export function strukTextToPdf(text, title = 'Struk') {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  const lines = text.split('\n');
  let y = 5;
  lines.forEach(line => {
    if (y > 195) { doc.addPage(); y = 5; }
    doc.text(line, 3, y);
    y += 3;
  });
  // trim page height
  return doc;
}
