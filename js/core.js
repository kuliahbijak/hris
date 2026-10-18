/* ============================================================================
 * SIM HRD — core.js
 * State · API (SB.route: baca → Supabase, tulis → Apps Script) · cache SWR · router SPA · layout · UI toolkit
 * Prinsip gas-instant-ux-pro: render dari cache dulu, 1 panggilan per layar,
 * timeout + retry, reqId untuk aksi tulis, halaman tidak dibuang saat pindah menu.
 * ========================================================================== */
'use strict';
var CFG = window.SIMHRD_CONFIG || {};
var DEMO = CFG.DEMO === true || /[?&]demo=1/.test(location.search) || (CFG.DEMO === 'auto' && !CFG.SUPABASE_URL);
var GAS_URL = CFG.GAS_URL;
var ROLE = { SA: 'SUPER_ADMIN', STAFF: 'STAFF_HRD', EMP: 'KARYAWAN' };
var App = { token: '', boot: null, pages: {}, alive: {}, layout: '', cur: '', pub: null, tables: {}, timers: {}, adminLoaded: false };

/* ---------------------------------------------------------------- util */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ic(n, c) { var b = window.ICONS && ICONS[n]; if (!b && window.ICONS && !(ic.miss = ic.miss || {})[n]) { ic.miss[n] = 1; console.warn('Ikon hilang:', n); } return '<svg class="ic ' + (c || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (b || '') + '</svg>'; }
function num(v) { var n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; }
function rp(n) { return 'Rp ' + Math.round(num(n)).toLocaleString('id-ID'); }
function rpShort(n) { n = num(n); if (Math.abs(n) >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M'; if (Math.abs(n) >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' Jt'; return rp(n); }
function ribu(n) { return Math.round(num(n)).toLocaleString('id-ID'); }
var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function toDate(s) { if (!s) return null; if (s instanceof Date) return s; var t = String(s); return new Date(t.length === 10 ? t + 'T00:00:00' : t); }
function tgl(s, panjang) { var d = toDate(s); if (!d || isNaN(d)) return s ? String(s) : '-'; return d.getDate() + ' ' + (panjang ? BULAN : BLN)[d.getMonth()] + ' ' + d.getFullYear(); }
function tglHari(s) { var d = toDate(s); return d && !isNaN(d) ? HARI[d.getDay()] + ', ' + tgl(d) : '-'; }
function jam(s) { var d = toDate(s); return d && !isNaN(d) ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '-'; }
function tglJam(s) { return s ? tgl(s) + ', ' + jam(s) : '-'; }
function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function periodeAktif() { var d = new Date(); if (d.getDate() >= 25) d = new Date(d.getFullYear(), d.getMonth() + 1, 1); return ymd(d).slice(0, 7); }
function relatif(s) { var d = toDate(s); if (!d || isNaN(d)) return '-'; var m = Math.round((Date.now() - d) / 60000); if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; if (m < 1440) return Math.floor(m / 60) + ' jam lalu'; return Math.floor(m / 1440) + ' hari lalu'; }
function masaKerja(s) { var d = toDate(s); if (!d || isNaN(d)) return '-'; var b = Math.max(0, (new Date().getFullYear() - d.getFullYear()) * 12 + new Date().getMonth() - d.getMonth()); return b >= 12 ? Math.floor(b / 12) + ' thn ' + (b % 12) + ' bln' : b + ' bln berjalan'; }
function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
function hp08(v) { var s = String(v == null ? '' : v).replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (s.indexOf('62') === 0) s = '0' + s.slice(2); else if (s.indexOf('8') === 0) s = '0' + s; return s; }
function hp62(v) { var s = hp08(v); return s ? '62' + s.slice(1) : ''; }
function sapa() { var h = new Date().getHours(); return h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam'; }
function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 280); }; }
function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); }
function isHRD() { return App.boot && (App.boot.me.role === ROLE.SA || App.boot.me.role === ROLE.STAFF); }
function isSA() { return App.boot && App.boot.me.role === ROLE.SA; }
function roleLabel(r) { return r === ROLE.SA ? 'Super Admin' : r === ROLE.STAFF ? 'Admin (Staff HRD)' : 'Karyawan'; }
function perusahaan() { return (App.boot && App.boot.cfg.perusahaan) || (App.pub && App.pub.perusahaan) || CFG.NAMA_PERUSAHAAN || 'Perusahaan'; }

/* ---------------------------------------------------------------- storage (namespace + versi) */
var LS = 'simhrd:v1:';
var Store = {
  get: function (k, d) { try { var v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { var s = JSON.stringify(v); try { localStorage.setItem(LS + k, s); } catch (e) { Object.keys(localStorage).filter(function (x) { return x.indexOf(LS + 'u:') === 0 && x.indexOf(userKey('')) !== 0; }).forEach(function (x) { localStorage.removeItem(x); }); try { localStorage.setItem(LS + k, s); } catch (e2) { } } },
  del: function (k) { try { localStorage.removeItem(LS + k); } catch (e) { } },
  clearUser: function () { try { Object.keys(localStorage).filter(function (x) { return x.indexOf(LS + 'u:') === 0; }).forEach(function (x) { localStorage.removeItem(x); }); } catch (e) { } }
};
function userKey(k) { return 'u:' + ((App.boot && App.boot.me.email) || 'anon') + ':' + k; }

/* ---------------------------------------------------------------- API (P8: timeout, retry, reqId) */
var WRITE = /^(karirApply|absenScan|cutiAjukan|cutiBatal|dokUpload|deSetujui|deAturPin|karyawanSave|karyawanStatus|absenManual|fpImport|cutiProses|payrollHitung|payrollTerbitkan|dokVerifikasi|dokHapus|kpiSave|lowonganSave|kandidatUpdate|kandidatPutus|leadsSave|leadsHapus|settingsSave|backupRun|notif\.configSave|notif\.retry|wa\.blastCreate|wa\.blastStop|crm\.(sync|save|bulk|interaksi|import|merge)|de\.(templatePindai|templateSave|pejabatSave|dokumenSimpan|dokumenAjukan|dokumenTarik|massal)|lokasiSinkron|lokasiAtur|lokasiPutus|aksesSimpan|aksesCabut|resetData)$/;
var Perf = { rows: [], add: function (a, t, s) { this.rows.push({ action: a, total: t, server: s == null ? null : s, net: s == null ? null : t - s }); if (this.rows.length > 200) this.rows.shift(); }, table: function () { console.table(this.rows.slice(-30)); } };
window.Perf = Perf;
var busyN = 0;
function busy(on) { busyN = Math.max(0, busyN + (on ? 1 : -1)); var l = $('#loader'); if (l) l.classList.toggle('on', busyN > 0); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function waitOnline(ms) { return new Promise(function (r) { if (navigator.onLine !== false) return r(); var t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); }); }

async function apiOnce(action, data, timeout, reqId) {
  var t0 = performance.now();
  if (DEMO) { await loadDemo(); await sleep(80 + Math.random() * 160); var dr = window.DemoAPI(action, data || {}, App.token); dr = JSON.parse(JSON.stringify(dr)); Perf.add(action, Math.round(performance.now() - t0), 0); return dr; }

  /* ── Supabase route (via SB.route di supabase.js) ── */
  if (window.SB) {
    try {
      var res = await Promise.race([
        SB.route(action, data || {}, reqId),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, timeout); })
      ]);
      Perf.add(action, Math.round(performance.now() - t0), null);
      return res;
    } catch (err) {
      return { success: false, network: true, retryable: true,
        message: err.message === 'timeout' ? 'Server terlalu lama merespons.' : 'Kesalahan: ' + err.message };
    }
  }

  /* ── Fallback: GAS (hanya jika SB tidak tersedia) ── */
  var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, timeout);
  try {
    var fres = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: App.token || '', reqId: reqId, data: data || {} }) });
    var text = await fres.text();
    try { var j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: fres.status >= 500 || fres.status === 429, message: 'Server membalas HTTP ' + fres.status + ' (bukan JSON). Pastikan URL /exec benar & deployment "Anyone".' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus. Periksa internet Anda.' };
  } finally { clearTimeout(timer); }
}
async function api(action, data, opt) {
  opt = opt || {};
  if (!DEMO && !window.SB && !GAS_URL) return { success: false, message: 'SUPABASE_URL atau GAS_URL belum diisi di js/config.js' };
  var isRead = !WRITE.test(action), reqId = isRead ? '' : (opt.reqId || uuid()), tries = isRead ? 3 : 2, res;
  if (!opt.silent) busy(true);
  try {
    for (var i = 0; i < tries; i++) {
      if (i) { await sleep(1200 * i); if (navigator.onLine === false) await waitOnline(15000); }
      res = await apiOnce(action, data, isRead ? (i ? 40000 : 25000) : 90000, reqId);
      if (res.success || !res.retryable) break;
    }
  } finally { if (!opt.silent) busy(false); }
  if (!res.success && res.data && res.data.code === 'AUTH' && action !== 'login') onSessionExpired(res.message);
  return res;
}
/** Stale-while-revalidate: render dari cache seketika, segarkan bila lewat batas kesegaran. */
async function swr(key, action, data, render, opt) {
  opt = opt || {};
  var fresh = opt.fresh == null ? 60000 : opt.fresh, c = Store.get(userKey(key), null);
  if (c) { try { render(c.data, true); } catch (e) { console.error(e); } }
  if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
  var res = await api(action, data, { silent: !!c });
  if (res.success) {
    var h = hashStr(JSON.stringify(res.data));
    Store.set(userKey(key), { t: Date.now(), h: h, data: res.data });
    if (!c || c.h !== h) { try { render(res.data, false); } catch (e) { console.error(e); } }
  } else if (!c) { if (opt.onError) opt.onError(res); else toast(res.message, 'bad'); }
  return res;
}
function cacheSet(key, data) { Store.set(userKey(key), { t: Date.now(), h: hashStr(JSON.stringify(data)), data: data }); }
function cacheGet(key) { var c = Store.get(userKey(key), null); return c ? c.data : null; }
function cacheBust(keys) { [].concat(keys).forEach(function (k) { var c = Store.get(userKey(k), null); if (c) { c.t = 0; Store.set(userKey(k), c); } }); }
function warmUp() {
  /* Supabase: tidak perlu cold-start warm-up seperti GAS */
  if (!DEMO && !window.SB && GAS_URL) fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(function () { });
}
function loadDemo() { return window.DemoAPI ? Promise.resolve() : loadScript('js/demo.js'); }

/* ---------------------------------------------------------------- lazy loaders */
var _scripts = {};
function loadScript(src) {
  if (_scripts[src]) return _scripts[src];
  return (_scripts[src] = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { delete _scripts[src]; no(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }));
}
function loadXLSX() { return window.XLSX ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }
function loadQR() { return window.qrcode ? Promise.resolve() : loadScript('js/vendor/qrcode.js'); }
function loadAdmin() {
  if (App.adminLoaded) return Promise.resolve();
  return Promise.all([loadScript('js/pages-admin.js'), loadScript('js/pages-modul.js')]).then(function () {
    App.adminLoaded = true;
    /* v2.1: isi cache semua menu admin di latar belakang agar pindah menu terasa instan */
    if (window.prefetchAdmin) setTimeout(function () { try { prefetchAdmin(); } catch (e) { } }, 300);
  });
}
/* ---------------------------------------------------------------- v2.1: Peta (Leaflet), GPS akurat, kamera selfie */
function loadLeaflet() {
  if (window.L && L.map) return Promise.resolve();
  if (!document.querySelector('link[data-leaflet]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; l.setAttribute('data-leaflet', '1'); document.head.appendChild(l); }
  return loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
}
/** Peta lokasi: petaLokasi(host, {lat,lng,radius,edit,onChange,tinggi,saya}) → {set(lat,lng,r), radius(r), saya(lat,lng,acc), pos()} */
async function petaLokasi(host, o) {
  o = o || {};
  host.innerHTML = '<div class="peta-lok" style="height:' + (o.tinggi || 280) + 'px"><div class="peta-load">' + ic('map-pin') + ' Memuat peta…</div></div>';
  try { await loadLeaflet(); } catch (e) { host.innerHTML = '<div class="note warn">' + ic('triangle-alert') + '<div>Peta tidak dapat dimuat (periksa internet). Koordinat tetap bisa diisi manual.</div></div>'; return null; }
  var box = $('.peta-lok', host); box.innerHTML = '';
  var lat = num(o.lat) || -6.2, lng = num(o.lng) || 106.816666, ada = !!(num(o.lat) || num(o.lng));
  var map = L.map(box, { zoomControl: true, attributionControl: true }).setView([lat, lng], ada ? 17 : 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  var pinIc = L.divIcon({ className: 'pin-lok', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 26] });
  var mk = L.marker([lat, lng], { draggable: !!o.edit, icon: pinIc }).addTo(map);
  var lingkar = L.circle([lat, lng], { radius: num(o.radius) || 100, color: '#2563EB', weight: 2, fillOpacity: .12 }).addTo(map);
  var saya = null, sayaAcc = null;
  function ubah() { var p = mk.getLatLng(); lingkar.setLatLng(p); if (o.onChange) o.onChange(+p.lat.toFixed(7), +p.lng.toFixed(7)); }
  if (o.edit) { mk.on('dragend', ubah); map.on('click', function (e) { mk.setLatLng(e.latlng); ubah(); }); }
  setTimeout(function () { map.invalidateSize(); }, 120);
  var api = {
    map: map,
    set: function (a, b, r) { if (!(isFinite(a) && isFinite(b))) return; mk.setLatLng([a, b]); lingkar.setLatLng([a, b]); if (r) lingkar.setRadius(r); map.setView([a, b], Math.max(map.getZoom(), 17)); },
    radius: function (r) { if (num(r) > 0) lingkar.setRadius(num(r)); },
    saya: function (a, b, acc) {
      if (!saya) { saya = L.circleMarker([a, b], { radius: 7, color: '#fff', weight: 2, fillColor: '#16A34A', fillOpacity: 1 }).addTo(map).bindTooltip('Posisi Anda'); sayaAcc = L.circle([a, b], { radius: acc || 20, color: '#16A34A', weight: 1, fillOpacity: .08 }).addTo(map); }
      else { saya.setLatLng([a, b]); sayaAcc.setLatLng([a, b]).setRadius(acc || 20); }
      map.fitBounds(L.latLngBounds([[a, b], mk.getLatLng()]).pad(.35), { maxZoom: 18 });
    },
    pos: function () { var p = mk.getLatLng(); return { lat: +p.lat.toFixed(7), lng: +p.lng.toFixed(7) }; }
  };
  if (o.saya) api.saya(o.saya.lat, o.saya.lng, o.saya.acc);
  return api;
}
/** Posisi GPS terakhir yang diterima (dipakai cadangan bila GPS lambat merespons). */
var GPS_TERAKHIR = null;
function gpsCatat(lat, lng, acc) { GPS_TERAKHIR = { lat: +(+lat).toFixed(7), lng: +(+lng).toFixed(7), acc: Math.round(acc), t: Date.now() }; return GPS_TERAKHIR; }
/** Ambil GPS paling akurat dalam `ms` milidetik (bukan posisi cache). */
function gpsTerbaik(ms) {
  return new Promise(function (ok, no) {
    if (!navigator.geolocation) return no(new Error('Perangkat tidak mendukung GPS.'));
    var best = null, id = null, selesai = false;
    function akhir() {
      if (selesai) return; selesai = true; if (id != null) navigator.geolocation.clearWatch(id); clearTimeout(t);
      if (!best && GPS_TERAKHIR && Date.now() - GPS_TERAKHIR.t < 60000) best = { lat: GPS_TERAKHIR.lat, lng: GPS_TERAKHIR.lng, acc: GPS_TERAKHIR.acc };
      best ? ok(best) : no(new Error('Lokasi belum didapat. Aktifkan GPS/Lokasi lalu coba lagi di tempat terbuka.'));
    }
    var t = setTimeout(akhir, ms || 8000);
    id = navigator.geolocation.watchPosition(function (p) {
      var c = gpsCatat(p.coords.latitude, p.coords.longitude, p.coords.accuracy); c = { lat: c.lat, lng: c.lng, acc: c.acc };
      if (!best || c.acc < best.acc) best = c;
      if (best.acc <= 15) akhir();
    }, function (e) { if (e.code === 1) { selesai = true; clearTimeout(t); if (id != null) navigator.geolocation.clearWatch(id); no(new Error('Izin lokasi ditolak. Izinkan akses Lokasi untuk situs ini di pengaturan browser.')); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: ms || 8000 });
  });
}
/** Ambil koordinat dari teks: "-6.2, 106.8" atau tautan Google Maps (…@-6.2,106.8… / ?q=-6.2,106.8). */
function koordinatDariTeks(t) {
  t = String(t || ''); var m = t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || t.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if (!m) return null; var a = +m[1], b = +m[2]; return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lng: b } : null;
}
/** Kamera depan untuk selfie absensi → Promise<{b64, mime}|null>. Fallback: input file capture. */
function kameraSelfie(judul) {
  return new Promise(function (res) {
    var stream = null, done = false, foto = null;
    var m = modal({ title: judul || 'Ambil Selfie', sub: 'Pastikan wajah terlihat jelas & cukup cahaya', size: 'sm', noFocus: true, foot: [],
      body: '<div class="selfie-box"><video playsinline autoplay muted></video><img alt="Pratinjau selfie" hidden><div class="selfie-guide"></div><div class="selfie-msg">' + ic('camera') + ' Menyalakan kamera…</div></div>' +
        '<div class="row" style="gap:8px;margin-top:12px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-sf="jepret" disabled>' + ic('camera') + 'Ambil Foto</button>' +
        '<button class="btn btn-sec" data-sf="ulang" hidden>' + ic('refresh-cw') + 'Ulangi</button>' +
        '<button class="btn btn-primary" data-sf="pakai" hidden>' + ic('circle-check') + 'Gunakan Foto</button>' +
        '<label class="btn btn-ghost" data-sf="berkas">' + ic('image') + 'Dari Kamera HP<input type="file" accept="image/*" capture="user" hidden></label></div>' });
    var el = m.el, vid = $('video', el), img = $('img', el), msg = $('.selfie-msg', el);
    function stop() { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    m.onClose = function () { stop(); if (!done) res(null); };
    function kecilkan(src, w0, h0, mirror) {
      var max = 640, sk = Math.min(1, max / Math.max(w0, h0)), c = document.createElement('canvas'); c.width = Math.round(w0 * sk); c.height = Math.round(h0 * sk);
      var g = c.getContext('2d'); if (mirror) { g.translate(c.width, 0); g.scale(-1, 1); } g.drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', .72);
    }
    function tampil(url) { foto = url; img.src = url; img.hidden = false; vid.hidden = true; msg.hidden = true; $('[data-sf=jepret]', el).hidden = true; $('[data-sf=ulang]', el).hidden = !stream; $('[data-sf=pakai]', el).hidden = false; }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 960 } }, audio: false }).then(function (s) {
        if (!el.isConnected) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; vid.srcObject = s; msg.hidden = true; $('[data-sf=jepret]', el).disabled = false;
      }).catch(function () { msg.innerHTML = ic('triangle-alert') + ' Kamera tidak dapat diakses. Izinkan Kamera, atau pakai tombol "Dari Kamera HP".'; });
    } else msg.innerHTML = ic('triangle-alert') + ' Browser tidak mendukung kamera langsung. Pakai tombol "Dari Kamera HP".';
    $('[data-sf=jepret]', el).onclick = function () { if (!vid.videoWidth) return toast('Kamera belum siap.', 'warn'); tampil(kecilkan(vid, vid.videoWidth, vid.videoHeight, true)); };
    $('[data-sf=ulang]', el).onclick = function () { foto = null; img.hidden = true; vid.hidden = false; $('[data-sf=jepret]', el).hidden = false; $('[data-sf=ulang]', el).hidden = true; $('[data-sf=pakai]', el).hidden = true; };
    $('[data-sf=pakai]', el).onclick = function () { if (!foto) return; done = true; stop(); res({ b64: foto.split(',')[1], mime: 'image/jpeg' }); m.close(); };
    $('[data-sf=berkas] input', el).onchange = function (e) {
      var f = e.target.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('Pilih berkas gambar.', 'warn');
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () { tampil(kecilkan(im, im.naturalWidth, im.naturalHeight, false)); URL.revokeObjectURL(u); };
      im.onerror = function () { toast('Gambar tidak dapat dibaca.', 'bad'); }; im.src = u;
    };
  });
}
function lihatFoto(f, judul) {
  if (!f || !f.b64) return toast('Foto tidak tersedia.', 'warn');
  modal({ title: judul || 'Foto Selfie', sub: f.info || '', size: 'sm', body: '<img src="data:' + esc(f.mime || 'image/jpeg') + ';base64,' + f.b64 + '" alt="Foto selfie" style="width:100%;border-radius:12px;display:block">' });
}
async function qrSvg(text, cell) { await loadQR(); var q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell || 6, margin: 2, scalable: true }); }
async function exportXlsx(nama, sheets) {
  try { await loadXLSX(); } catch (e) { return toast('Pustaka Excel gagal dimuat. Periksa koneksi.', 'bad'); }
  var wb = XLSX.utils.book_new();
  Object.keys(sheets).forEach(function (s) { XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets[s].length ? sheets[s] : [{ Info: 'Tidak ada data' }]), s.slice(0, 31)); });
  XLSX.writeFile(wb, nama.replace(/\.xlsx$/, '') + '.xlsx');
}
function fileToB64(file, maxMB) {
  return new Promise(function (ok, no) {
    if (maxMB && file.size > maxMB * 1048576) return no(new Error(file.name + ' melebihi ' + maxMB + ' MB'));
    var r = new FileReader(); r.onload = function () { ok({ nama: file.name, mime: file.type || 'application/octet-stream', size: file.size, b64: String(r.result).split(',')[1] }); };
    r.onerror = function () { no(new Error('Gagal membaca berkas')); }; r.readAsDataURL(file);
  });
}
function b64Blob(b64, mime) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }
function unduhB64(f) {
  if (!f) return;
  if (f.url && !f.b64) { window.open(f.url, '_blank', 'noopener'); return; }
  var url = URL.createObjectURL(b64Blob(f.b64, f.mime || 'application/octet-stream')), a = document.createElement('a');
  a.href = url; a.download = f.nama || 'berkas'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}
function lihatB64(f) {
  if (!f) return;
  if (f.url && !f.b64) { window.open(f.url, '_blank', 'noopener'); return; }
  window.open(URL.createObjectURL(b64Blob(f.b64, f.mime || 'application/pdf')), '_blank', 'noopener');
}

/* ---------------------------------------------------------------- UI: toast, modal, drawer */
function toast(msg, type, ms) {
  if (!msg) return;
  var t = document.createElement('div'); t.className = 'toast ' + (type || 'ok');
  t.innerHTML = ic(type === 'bad' ? 'circle-alert' : type === 'warn' ? 'triangle-alert' : 'circle-check') + '<div style="white-space:pre-line">' + esc(msg) + '</div><button class="x" aria-label="Tutup">' + ic('x', 'ic-sm') + '</button>';
  $('#toasts').appendChild(t);
  var rm = function () { t.remove(); }; t.querySelector('.x').onclick = rm; setTimeout(rm, ms || (type === 'bad' ? 7000 : 4000));
}
function openOverlay(inner, cls) {
  var o = document.createElement('div'); o.className = 'overlay ' + (cls || '');
  o.innerHTML = inner; document.body.appendChild(o); document.body.style.overflow = 'hidden';
  var closed = false, api = { el: o, close: function () { if (closed) return; closed = true; o.remove(); if (!$('.overlay')) document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); if (api.onClose) api.onClose(); } };
  function onKey(e) { if (e.key === 'Escape' && $$('.overlay').pop() === o) api.close(); }
  document.addEventListener('keydown', onKey);
  o.addEventListener('mousedown', function (e) { if (e.target === o) api.close(); });
  $$('[data-close]', o).forEach(function (b) { b.onclick = api.close; });
  return api;
}
/** modal({title, sub, body, size, foot:[{label,cls,act}], onOpen}) */
function modal(o) {
  var foot = (o.foot || [{ label: 'Tutup', cls: 'btn-sec', close: true }]).map(function (b, i) { return '<button class="btn ' + (b.cls || 'btn-sec') + '" data-f="' + i + '">' + (b.icon ? ic(b.icon) : '') + esc(b.label) + '</button>'; }).join('');
  var m = openOverlay('<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true"><div class="modal-h"><div><h3>' + esc(o.title) + '</h3>' + (o.sub ? '<div class="sub">' + esc(o.sub) + '</div>' : '') +
    '</div><button class="iconbtn" data-close aria-label="Tutup">' + ic('x') + '</button></div><div class="modal-b">' + (o.body || '') + '</div>' + (foot ? '<div class="modal-f">' + foot + '</div>' : '') + '</div>');
  (o.foot || [{ close: true }]).forEach(function (b, i) {
    var el = $('[data-f="' + i + '"]', m.el); if (!el) return;
    el.onclick = async function () {
      if (b.close) return m.close();
      if (!b.act) return;
      var lbl = el.innerHTML; el.disabled = true; el.innerHTML = '<span class="spin"></span>' + esc(b.label);
      try { var r = await b.act(m); if (r !== false) m.close(); } catch (e) { toast(e.message, 'bad'); } finally { if (el.isConnected) { el.disabled = false; el.innerHTML = lbl; } }
    };
  });
  var f = $('input:not([type=hidden]),select,textarea', $('.modal-b', m.el)); if (f && !o.noFocus && matchMedia('(min-width:768px)').matches) setTimeout(function () { f.focus(); }, 40);
  if (o.onOpen) o.onOpen(m.el, m);
  return m;
}
function confirmBox(title, msg, ok, danger) {
  return new Promise(function (res) {
    var done = false;
    var m = modal({ title: title, size: 'sm', body: '<p style="margin:0;color:var(--ink-2)">' + esc(msg) + '</p>',
      foot: [{ label: 'Batal', close: true }, { label: ok || 'Ya, lanjutkan', cls: danger ? 'btn-danger' : 'btn-primary', act: function () { done = true; res(true); } }] });
    m.onClose = function () { if (!done) res(false); };
  });
}
function promptBox(title, label, opt) {
  opt = opt || {};
  return new Promise(function (res) {
    var done = false;
    var m = modal({ title: title, size: 'sm', body: '<div class="field"><label>' + esc(label) + '</label>' + (opt.area ? '<textarea class="textarea" id="pb-v"></textarea>' : '<input class="input" id="pb-v" type="' + (opt.type || 'text') + '" inputmode="' + (opt.inputmode || 'text') + '" maxlength="' + (opt.max || 300) + '">') + (opt.hint ? '<div class="hint">' + esc(opt.hint) + '</div>' : '') + '</div>',
      foot: [{ label: 'Batal', close: true }, { label: opt.ok || 'Simpan', cls: opt.danger ? 'btn-danger' : 'btn-primary', act: function (mm) { var v = $('#pb-v', mm.el).value.trim(); if (opt.min && v.length < opt.min) { toast('Isi minimal ' + opt.min + ' karakter.', 'warn'); return false; } done = true; res(v); } }] });
    m.onClose = function () { if (!done) res(null); };
  });
}
function drawer(o) {
  var d = openOverlay('<aside class="drawer" role="dialog" aria-modal="true"><div class="drawer-h">' + (o.head || '<h3 style="margin:0">' + esc(o.title) + '</h3>') +
    '<button class="iconbtn" style="margin-left:auto" data-close aria-label="Tutup">' + ic('x') + '</button></div><div class="drawer-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="drawer-f">' + o.foot + '</div>' : '') + '</aside>', 'side');
  if (o.onOpen) o.onOpen(d.el, d);
  return d;
}
async function withBusy(btn, fn) {
  if (!btn) return fn();
  var html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + (btn.textContent.trim() ? esc(btn.textContent.trim()) : '');
  try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = html; } }
}
/** Panggil aksi tulis dengan tombol sibuk + toast hasil. */
async function aksi(btn, action, data, opt) {
  opt = opt || {};
  var r = await withBusy(btn, function () { return api(action, data); });
  if (r.success) { if (!opt.diam) toast(r.message || 'Berhasil disimpan.', 'ok'); if (opt.bust) cacheBust(opt.bust); }
  else toast(r.message || 'Gagal.', 'bad');
  return r;
}

/* ---------------------------------------------------------------- UI helpers */
var PILL = { Valid: 'ok', 'Hadir Valid': 'ok', 'Tepat Waktu': 'ok', Disetujui: 'ok', Aktif: 'ok', Terbit: 'ok', Terkirim: 'ok', Diterima: 'ok', SAH: 'ok', TERBIT: 'ok', Selesai: 'ok', SELESAI: 'ok', Terverifikasi: 'ok', 'Sudah Dihubungi': 'ok', Tetap: 'info',
  Menunggu: 'warn', Terlambat: 'warn', Diproses: 'warn', 'Perlu Review': 'warn', Antri: 'warn', Antre: 'warn', Proses: 'warn', Berjalan: 'info', MENUNGGU_TTD: 'warn', 'Menunggu Verifikasi': 'warn', Kontrak: 'warn', Probasi: 'info', Screening: 'info', Wawancara: 'info', 'Tes Teknis': 'info', Offering: 'info',
  Ditolak: 'bad', Alpa: 'bad', Gagal: 'bad', Nonaktif: 'bad', DITARIK: 'bad', GAGAL: 'bad', Dihentikan: 'bad', 'Belum Dihubungi': 'neutral', Siap: 'info', DRAF: '', Draft: '', Batal: '', Dibatalkan: '' };
function pill(s, label, dot) { return '<span class="pill ' + (PILL[s] || '') + (dot === false ? '' : ' dot') + '">' + esc(label || s || '-') + '</span>'; }
function avatar(nama, cls) { return '<span class="avatar ' + (cls || '') + '">' + esc(initials(nama)) + '</span>'; }
function userCell(nama, sub, extra) { return '<div class="cell-user">' + avatar(nama) + '<div class="grow"><div class="strong">' + esc(nama) + (extra || '') + '</div>' + (sub ? '<span class="t2 ellip">' + esc(sub) + '</span>' : '') + '</div></div>'; }
function empty(msg, icon) { return '<div class="empty">' + ic(icon || 'inbox') + '<div>' + esc(msg || 'Belum ada data.') + '</div></div>'; }
function skel(n, h) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="skel" style="height:' + (h || 44) + 'px;margin-bottom:8px"></div>'; return s; }
function stat(o) {
  return '<div class="stat ' + (o.acc || '') + (o.go ? ' clickable" data-go="' + o.go : '') + '"><div class="top"><div class="ov">' + esc(o.label) + '</div>' + (o.icon ? '<div class="ico">' + ic(o.icon) + '</div>' : '') + (o.badge || '') + '</div>' +
    '<div class="val" style="' + (o.color ? 'color:' + o.color + ';' : '') + (String(o.val).replace(/<[^>]+>/g, '').length > 8 ? 'font-size:clamp(20px,1.9vw,26px);white-space:nowrap' : '') + '">' + o.val + (o.unit ? '<small>' + o.unit + '</small>' : '') + '</div>' + (o.bar != null ? '<div class="progress ' + (o.barCls || '') + '"><i style="width:' + Math.max(0, Math.min(100, o.bar)) + '%"></i></div>' : '') +
    (o.meta ? '<div class="meta">' + o.meta + '</div>' : '') + '</div>';
}
function pageHead(o) {
  return '<div class="page-head"><div class="grow">' + (o.crumbs ? '<div class="crumbs">' + o.crumbs.map(function (c, i) { return (i ? ic('chevron-right', 'ic-sm') : '') + '<span class="' + (i === o.crumbs.length - 1 ? 'cur' : '') + '">' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
    '<h1>' + o.title + '</h1>' + (o.sub ? '<p class="sub">' + o.sub + '</p>' : '') + '</div>' + (o.actions ? '<div class="actions">' + o.actions + '</div>' : '') + '</div>';
}
function selectOpts(list, val, placeholder) {
  return (placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '') + list.map(function (o) { var v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');
}
function formVals(root) {
  var o = {}; $$('[name]', root).forEach(function (el) { if (el.type === 'checkbox') o[el.name] = el.checked; else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value.trim(); }); return o;
}
function waLink(no, pesan) { return 'https://wa.me/' + hp62(no) + (pesan ? '?text=' + encodeURIComponent(pesan) : ''); }
function bindTabs(root, onChange) {
  $$('.tabs [data-tab]', root).forEach(function (t) { t.onclick = function () { $$('.tabs [data-tab]', root).forEach(function (x) { x.classList.toggle('on', x === t); }); $$('[data-pane]', root).forEach(function (p) { p.hidden = p.dataset.pane !== t.dataset.tab; }); if (onChange) onChange(t.dataset.tab); }; });
}
function goClick(root) { $$('[data-go]', root).forEach(function (el) { el.onclick = function (e) { e.preventDefault(); go(el.dataset.go); }; }); }
function dropzone(el, onFiles, accept) {
  var inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; if (accept) inp.accept = accept; inp.hidden = true; el.appendChild(inp);
  el.addEventListener('click', function (e) { if (e.target.closest('button,a')) return; inp.click(); });
  inp.onchange = function () { if (inp.files.length) onFiles(Array.prototype.slice.call(inp.files)); inp.value = ''; };
  ['dragenter', 'dragover'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove('over'); }); });
  el.addEventListener('drop', function (e) { var f = Array.prototype.slice.call(e.dataTransfer.files || []); if (f.length) onFiles(f); });
}

/* ---------------------------------------------------------------- Tabel lokal (cari, urut, halaman, pilih) */
function Table(host, o) {
  var st = { rows: [], q: '', sort: o.sort || null, dir: o.dir || 1, page: 1, per: o.per || 10, sel: {}, filter: null };
  host.innerHTML = '<div class="tbl-wrap"><table class="tbl ' + (o.cls || '') + '"><thead><tr>' + (o.select ? '<th style="width:36px"><input type="checkbox" data-all aria-label="Pilih semua"></th>' : '') +
    o.cols.map(function (c, i) { return '<th class="' + (c.cls || '') + (c.sort !== false && c.k ? ' sortable' : '') + '" data-i="' + i + '">' + esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody></tbody></table></div>' +
    (o.foot === false ? '' : '<div class="tbl-foot"><span data-info></span><div class="row gap-12"><label class="row small hide-m">Baris <select class="select" data-per style="height:32px;width:70px;padding:0 24px 0 8px">' + selectOpts([5, 10, 25, 50, 100].concat([5, 10, 25, 50, 100].indexOf(st.per) < 0 ? [st.per] : []).sort(function (a, b) { return a - b; }), st.per) + '</select></label><div class="pager" data-pager></div></div></div>');
  var tbody = $('tbody', host);
  function data() {
    var q = st.q.toLowerCase(), r = st.rows;
    if (st.filter) r = r.filter(st.filter);
    if (q) r = r.filter(function (x) { return (o.search ? o.search(x) : JSON.stringify(x)).toLowerCase().indexOf(q) > -1; });
    if (st.sort) { var k = st.sort; r = r.slice().sort(function (a, b) { var va = a[k], vb = b[k]; if (typeof va === 'number' || typeof vb === 'number') return (num(va) - num(vb)) * st.dir; return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'id') * st.dir; }); }
    return r;
  }
  function render() {
    var all = data(), pages = Math.max(1, Math.ceil(all.length / st.per)); if (st.page > pages) st.page = pages;
    var rows = o.foot === false ? all : all.slice((st.page - 1) * st.per, st.page * st.per);
    tbody.innerHTML = rows.length ? rows.map(function (r) {
      var id = o.key ? r[o.key] : '', sel = st.sel[id];
      return '<tr data-id="' + esc(id) + '" class="' + (sel ? 'sel ' : '') + (o.rowClass ? o.rowClass(r) : '') + '"' + (o.onRow ? ' style="cursor:pointer"' : '') + '>' + (o.select ? '<td><input type="checkbox" data-sel ' + (sel ? 'checked' : '') + '></td>' : '') +
        o.cols.map(function (c) { return '<td class="' + (c.cls || '') + '">' + (c.render ? c.render(r) : esc(r[c.k] == null || r[c.k] === '' ? '-' : r[c.k])) + '</td>'; }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + (o.cols.length + (o.select ? 1 : 0)) + '">' + empty(o.empty || 'Tidak ada data yang cocok.') + '</td></tr>';
    var info = $('[data-info]', host), pager = $('[data-pager]', host);
    if (info) info.innerHTML = 'Menampilkan <b>' + (all.length ? (st.page - 1) * st.per + 1 : 0) + '–' + Math.min(all.length, st.page * st.per) + '</b> dari <b>' + all.length + '</b> ' + esc(o.unit || 'data');
    if (pager) {
      var b = '<button data-p="' + (st.page - 1) + '" ' + (st.page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">‹</button>', s = Math.max(1, Math.min(st.page - 2, pages - 4));
      for (var p = s; p <= Math.min(pages, s + 4); p++) b += '<button data-p="' + p + '" class="' + (p === st.page ? 'on' : '') + '">' + p + '</button>';
      if (s + 4 < pages) b += '<button disabled>…</button><button data-p="' + pages + '">' + pages + '</button>';
      pager.innerHTML = b + '<button data-p="' + (st.page + 1) + '" ' + (st.page >= pages ? 'disabled' : '') + ' aria-label="Berikutnya">›</button>';
      $$('button[data-p]', pager).forEach(function (x) { x.onclick = function () { st.page = +x.dataset.p; render(); }; });
    }
    var all2 = $('[data-all]', host); if (all2) { var ids = rows.map(function (r) { return r[o.key]; }); all2.checked = ids.length > 0 && ids.every(function (i) { return st.sel[i]; }); }
    if (o.after) o.after(tbody);
  }
  $$('th.sortable', host).forEach(function (th) { th.onclick = function () { var c = o.cols[+th.dataset.i]; if (st.sort === c.k) st.dir *= -1; else { st.sort = c.k; st.dir = c.desc ? -1 : 1; } render(); }; });
  var per = $('[data-per]', host); if (per) per.onchange = function () { st.per = +per.value; st.page = 1; render(); };
  tbody.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-id]'); if (!tr) return;
    if (e.target.matches('[data-sel]')) { st.sel[tr.dataset.id] = e.target.checked; if (!e.target.checked) delete st.sel[tr.dataset.id]; tr.classList.toggle('sel', e.target.checked); if (o.onSelect) o.onSelect(api.selected()); return; }
    if (e.target.closest('a,button,input,select,label')) return;
    if (o.onRow) o.onRow(st.rows.filter(function (r) { return String(r[o.key]) === tr.dataset.id; })[0], tr);
  });
  var allCb = $('[data-all]', host);
  if (allCb) allCb.onchange = function () { $$('tr[data-id]', tbody).forEach(function (tr) { if (allCb.checked) st.sel[tr.dataset.id] = true; else delete st.sel[tr.dataset.id]; }); render(); if (o.onSelect) o.onSelect(api.selected()); };
  var api = {
    set: function (rows) { st.rows = rows || []; var ada = {}; st.rows.forEach(function (r) { ada[r[o.key]] = 1; }); Object.keys(st.sel).forEach(function (k) { if (!ada[k]) delete st.sel[k]; }); render(); return api; },
    search: function (q) { st.q = q || ''; st.page = 1; render(); },
    filter: function (fn) { st.filter = fn; st.page = 1; render(); },
    selected: function () { return st.rows.filter(function (r) { return st.sel[r[o.key]]; }); },
    clearSel: function () { st.sel = {}; render(); if (o.onSelect) o.onSelect([]); },
    rows: function () { return st.rows; }, view: data, render: render
  };
  return api;
}

/* ---------------------------------------------------------------- Chart SVG ringan */
function chartBars(data, o) {
  // data: [{label, values:{k:v}, hl}], o: {keys:[{k,color,label}], h, max, target, pct}
  var W = 720, H = o.h || 220, pl = 34, pb = 26, pt = o.target != null ? 26 : 10, n = data.length || 1, bw = (W - pl - 8) / n, inner = H - pb - pt;
  var max = o.max || Math.max.apply(null, data.map(function (d) { return o.keys.reduce(function (s, k) { return s + num(d.values[k.k]); }, 0); }).concat([1]));
  var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik') + '">';
  [0, .25, .5, .75, 1].forEach(function (f) { var y = pt + inner - inner * f; s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="#E8EDF4"/><text x="' + (pl - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + (o.pct ? Math.round(max * f) + '%' : Math.round(max * f)) + '</text>'; });
  data.forEach(function (d, i) {
    var x = pl + i * bw + bw * .18, w = Math.max(2, bw * .64), y = pt + inner, tot = 0;
    o.keys.forEach(function (k) { var v = Math.min(num(d.values[k.k]), max - tot); if (!(v > 0)) return; var hh = inner * v / max; y -= hh; tot += v; s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hh.toFixed(1) + '" fill="' + k.color + '" data-tip="' + esc(d.label + ' · ' + k.label + ': ' + v) + '"/>'; });
    if (!tot && d.off) s += '<rect x="' + x.toFixed(1) + '" y="' + (pt + inner - 14) + '" width="' + w.toFixed(1) + '" height="14" fill="#EEF1F6" data-tip="' + esc(d.label + ' · libur') + '"/>';
    if (d.hl) s += '<rect x="' + (x - 2).toFixed(1) + '" y="' + pt + '" width="' + (w + 4).toFixed(1) + '" height="' + inner + '" fill="none" stroke="#2563EB" stroke-dasharray="3 2"/>';
    var tampil = o.every ? (i === n - 1 || (i % o.every === 0 && (n - 1 - i) >= Math.ceil(o.every * .6))) : true;
    if (tampil) s +='<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.label) + '</text>';
  });
  if (o.target != null) {
    // Garis target di plot; keterangannya di pita atas (tidak menutupi batang)
    var ty = pt + inner - inner * o.target / max, tl = o.targetLabel || 'Target', tw = tl.length * 6.2 + 8;
    s += '<line x1="' + pl + '" x2="' + W + '" y1="' + ty + '" y2="' + ty + '" stroke="#2563EB" stroke-dasharray="5 4"/>' +
      '<line x1="' + (W - tw - 30) + '" x2="' + (W - tw - 8) + '" y1="9" y2="9" stroke="#2563EB" stroke-dasharray="5 4" stroke-width="1.5"/>' +
      '<text x="' + (W - 2) + '" y="13" text-anchor="end" style="fill:#2563EB;font-weight:600">' + esc(tl) + '</text>';
  }
  return s + '</svg>';
}
function chartDonut(items, center, sub) {
  var tot = items.reduce(function (s, x) { return s + num(x.v); }, 0) || 1, R = 70, r = 48, a0 = -Math.PI / 2, s = '<svg class="chart" viewBox="0 0 180 180" style="max-width:200px;margin:auto" role="img" aria-label="Komposisi">';
  items.forEach(function (x) {
    var a1 = a0 + 2 * Math.PI * num(x.v) / tot, large = a1 - a0 > Math.PI ? 1 : 0;
    if (items.length === 1) { s += '<circle cx="90" cy="90" r="' + ((R + r) / 2) + '" fill="none" stroke="' + x.c + '" stroke-width="' + (R - r) + '"/>'; return; }
    var p = function (a, rr) { return (90 + rr * Math.cos(a)).toFixed(2) + ' ' + (90 + rr * Math.sin(a)).toFixed(2); };
    s += '<path d="M' + p(a0, R) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p(a1, R) + ' L' + p(a1, r) + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p(a0, r) + 'Z" fill="' + x.c + '" stroke="#fff" stroke-width="2" data-tip="' + esc(x.l + ': ' + x.v) + '"/>';
    a0 = a1;
  });
  return s + '<text x="90" y="92" text-anchor="middle" style="font-size:30px;font-weight:700;fill:#141B2B">' + esc(center) + '</text><text x="90" y="112" text-anchor="middle" style="font-size:10px;letter-spacing:.06em">' + esc(sub || '') + '</text></svg>';
}
var PALET = ['#141B2B', '#2563EB', '#4C86CD', '#7DB4FF', '#A9C8F5', '#D4E3FF', '#495057', '#B4C5FF'];
(function () {
  var tip = null;
  document.addEventListener('mousemove', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
    tip.hidden = false; tip.textContent = t.getAttribute('data-tip'); tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 34) + 'px';
  });
})();

/* ---------------------------------------------------------------- Router SPA (P1) */
/** registerPage(name, {layout:'public'|'auth'|'app', auth:'public'|'all'|'hrd'|'sa', title, template(), show(el,param), hide()}) */
function registerPage(name, def) { App.pages[name] = Object.assign({ layout: 'app', auth: 'all' }, def); }
var ADMIN_PAGES = ['admin', 'karyawan', 'absensi-admin', 'cuti-admin', 'payroll', 'rekrutmen', 'kandidat', 'leads', 'arsip', 'laporan', 'notifikasi', 'crm', 'template', 'pengaturan'];
function go(name, param) { var h = '#/' + name + (param ? '/' + encodeURIComponent(param) : ''); if (location.hash === h) route(); else location.hash = h; }
function defaultPage() { return !App.token ? 'karir' : isHRD() ? 'admin' : 'beranda'; }
async function route() {
  var parts = location.hash.replace(/^#\/?/, '').split('/'), name = parts[0] || '', param = parts.slice(1).join('/');
  try { param = decodeURIComponent(param); } catch (e) { }
  if (!name) return go(defaultPage());
  if (ADMIN_PAGES.indexOf(name) > -1 && !App.pages[name]) {
    if (!App.token || !isHRD()) return go(App.token ? 'beranda' : 'login');
    try { busy(true); await loadAdmin(); } catch (e) { toast('Gagal memuat modul admin: ' + e.message, 'bad'); return; } finally { busy(false); }
  }
  var def = App.pages[name];
  if (!def) return go(defaultPage());
  if (def.auth !== 'public') {
    if (!App.token) { Store.set('next', location.hash); return go('login'); }
    if ((def.auth === 'hrd' && !isHRD()) || (def.auth === 'sa' && !isSA())) { toast('Halaman ini khusus ' + (def.auth === 'sa' ? 'Super Admin' : 'tim HRD') + '.', 'warn'); return go(defaultPage()); }
  }
  if (def.auth === 'public' && name === 'login' && App.token) return go(defaultPage());
  var layout = def.layout;
  if (App.layout !== layout) buildLayout(layout);
  var host = layout === 'app' ? $('#content') : $('#pubhost');
  var prev = App.cur && App.pages[App.cur];
  if (prev && App.cur !== name && prev.hide) try { prev.hide(); } catch (e) { }
  var el = $('.page[data-page="' + name + '"]', host);
  if (!el) { el = document.createElement('section'); el.className = 'page'; el.dataset.page = name; el.innerHTML = def.template ? def.template() : ''; host.appendChild(el); if (def.init) def.init(el); }
  $$('.page', host).forEach(function (p) { p.hidden = p !== el; });
  App.cur = name;
  document.title = (def.title ? def.title + ' · ' : '') + 'SIM HRD';
  if (layout === 'app') markMenu(def.menu || name);
  if (def.show) { try { await def.show(el, param); } catch (e) { console.error(e); toast('Terjadi kesalahan tampilan: ' + e.message, 'bad'); } }
  if (layout === 'app' && App.navOpen) toggleNav(false);
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);

/* ---------------------------------------------------------------- Layout */
var MENU = {
  hrd: [
    { sec: 'Modul Utama' },
    { p: 'admin', l: 'Dashboard', i: 'layout-dashboard' }, { p: 'karyawan', l: 'Karyawan', i: 'users' },
    { p: 'absensi-admin', l: 'Absensi', i: 'clock', end: '<span class="tag live">LIVE</span>' }, { p: 'cuti-admin', l: 'Cuti & Izin', i: 'calendar-days', badge: 'cutiMenunggu' },
    { p: 'payroll', l: 'Payroll & Gaji', i: 'banknote' }, { p: 'rekrutmen', l: 'Rekrutmen', i: 'user-plus', badge: 'kandidatBaru', blue: true },
    { p: 'leads', l: 'Database Leads', i: 'database', end: '<span class="count">DB</span>' }, { p: 'arsip', l: 'Dokumen Arsip', i: 'folder' }, { p: 'laporan', l: 'Laporan & KPI', i: 'chart-line' },
    { sec: 'Komunikasi & Dokumen' },
    { p: 'notifikasi', l: 'WhatsApp & Notifikasi', i: 'message-circle' }, { p: 'crm', l: 'CRM Kontak', i: 'contact' }, { p: 'template', l: 'Template Dokumen', i: 'file-text' },
    { p: 'persetujuan', l: 'Persetujuan Dokumen', i: 'file-signature', pejabat: true },
    { sec: 'Portal Saya' },
    { p: 'beranda', l: 'Beranda Saya', i: 'house' }, { p: 'absensi', l: 'Absensi Saya', i: 'scan-line' }, { p: 'cuti', l: 'Cuti Saya', i: 'calendar-check' },
    { p: 'gaji', l: 'Slip Gaji Saya', i: 'receipt' }, { p: 'dokumen', l: 'Dokumen Saya', i: 'folder-open' },
    { sec: 'Otoritas', sa: true },
    { p: 'pengaturan', l: 'Pengaturan', i: 'settings', sa: true, end: ic('lock', 'ic-sm') }
  ],
  emp: [
    { sec: 'Navigasi Karyawan', end: '<span class="count">ESS-v2</span>' },
    { p: 'beranda', l: 'Dashboard', i: 'layout-dashboard' }, { p: 'absensi', l: 'Absensi', i: 'scan-line' }, { p: 'cuti', l: 'Cuti & Izin', i: 'calendar-days' },
    { p: 'gaji', l: 'Slip Gaji', i: 'receipt' }, { p: 'dokumen', l: 'Dokumen Arsip', i: 'folder' }, { p: 'profil', l: 'Profil Saya', i: 'circle-user' },
    { p: 'persetujuan', l: 'Persetujuan Dokumen', i: 'file-signature', pejabat: true }
  ]
};
function menuItems() {
  var b = App.boot || {}, hrd = isHRD();
  return (hrd ? MENU.hrd : MENU.emp).filter(function (m) { return (!m.sa || isSA()) && (!m.pejabat || b.pejabat); });
}
function buildLayout(layout) {
  App.layout = layout;
  document.body.classList.toggle('ess-mobile', layout === 'app' && App.boot && !isHRD());
  var root = $('#app');
  if (layout !== 'app') { root.innerHTML = '<div id="pubhost"></div>'; return; }
  var b = App.boot, me = b.me;
  var items = menuItems().map(function (m) {
    if (m.sec) return '<div class="sb-sec"><span>' + esc(m.sec) + '</span>' + (m.end || '') + '</div>';
    return '<a class="sb-item" href="#/' + m.p + '" data-menu="' + m.p + '">' + ic(m.i) + '<span>' + esc(m.l) + '</span><span class="end" data-badge="' + (m.badge || '') + '">' + (m.end || '') + '</span></a>';
  }).join('');
  root.innerHTML =
    '<div class="shell" id="shell"><div class="sb-back" id="sbBack"></div>' +
    '<aside class="sidebar" aria-label="Menu utama"><div class="sb-brand"><div class="logo">' + ic('building-2') + '</div><div class="grow"><div class="brand-t">SIM HRD <span class="tag">' + (isHRD() ? 'v2.1' : 'ESS') + '</span></div><div class="brand-s ellip">' + esc(isHRD() ? perusahaan() : 'Self-Service Portal') + '</div></div></div>' +
    '<nav class="sb-scroll">' + items + '</nav>' +
    '<div class="sb-foot">' + avatar(me.nama) + '<div class="grow"><div class="strong ellip">' + esc(me.nama) + '</div><div class="small blue-t">' + esc(roleLabel(me.role)) + '</div></div><button class="iconbtn" id="btnOut" title="Keluar" aria-label="Keluar">' + ic('log-out') + '</button></div></aside>' +
    '<div class="main"><header class="topbar"><button class="iconbtn menu-btn" id="btnMenu" aria-label="Buka menu">' + ic('menu') + '</button>' +
    '<div class="search"><span style="position:absolute;left:12px;top:10px;color:var(--muted)">' + ic('search') + '</span><input class="input" id="gsearch" readonly placeholder="' + (isHRD() ? 'Cari pegawai, NIK, dokumen, atau modul…' : 'Cari riwayat absensi, pengajuan cuti, atau slip gaji…') + '"><span class="kbd">Ctrl+K</span></div>' +
    (isHRD() ? '<div class="sync" id="syncInfo">Sinkronisasi: ' + jam(new Date()) + ' WIB</div>' : '') + '<div class="grow"></div>' +
    (DEMO ? '<span class="pill warn hide-m" title="Data contoh, tidak tersambung ke Google Sheets">MODE DEMO</span>' : '') +
    '<button class="iconbtn" id="btnBell" aria-label="Notifikasi">' + ic('bell') + '<span class="dotn" id="bellN" hidden></span></button>' +
    '<div class="userchip" id="userChip">' + avatar(me.nama) + '<div class="t"><b>' + esc(me.nama) + '</b><span>' + esc(isHRD() ? roleLabel(me.role) : 'NIK: ' + (me.nik || '-')) + '</span></div>' + ic('chevron-down', 'ic-sm') + '</div></header>' +
    '<div class="m-head"><div class="logo">' + ic('building-2') + '</div><div class="grow"><div class="ov" style="font-size:10.5px">Portal Karyawan</div><div class="strong" id="mTitle" style="font-size:16px">Beranda</div></div>' +
    '<button class="iconbtn" id="btnBell2" aria-label="Notifikasi">' + ic('bell') + '</button><span id="mAva">' + avatar(me.nama) + '</span></div>' +
    '<main class="content" id="content"></main></div>' +
    '<nav class="bnav" aria-label="Navigasi bawah"><a href="#/beranda" data-b="beranda">' + ic('layout-grid') + 'Beranda</a><a href="#/absensi" class="fab" data-b="absensi"><span class="ring">' + ic('fingerprint', 'ic-lg') + '</span>Absensi</a>' +
    '<a href="#/cuti" data-b="cuti">' + ic('calendar-check') + 'Cuti & Izin</a><a href="#/profil" data-b="profil">' + ic('id-card') + 'Profil & Gaji</a></nav></div>';
  $('#btnMenu').onclick = function () { toggleNav(); };
  $('#sbBack').onclick = function () { toggleNav(false); };
  $('#btnOut').onclick = logout;
  $('#gsearch').onclick = cmdPalette;
  $('#userChip').onclick = userMenu; $('#mAva').onclick = userMenu;
  $('#btnBell').onclick = $('#btnBell2').onclick = notifPanel;
  updateBadges();
}
function toggleNav(v) { App.navOpen = v === undefined ? !App.navOpen : v; var s = $('#shell'); if (s) s.classList.toggle('nav-open', App.navOpen); }
function markMenu(p) {
  $$('.sb-item').forEach(function (a) { a.classList.toggle('active', a.dataset.menu === p); });
  $$('.bnav a').forEach(function (a) { a.classList.toggle('on', a.dataset.b === p || (p === 'gaji' && a.dataset.b === 'profil')); });
  var d = App.pages[App.cur]; if ($('#mTitle')) $('#mTitle').textContent = (d && d.title) || '';
}
function updateBadges() {
  var bd = (App.boot && App.boot.badge) || {}, tot = 0;
  $$('[data-badge]').forEach(function (el) { var k = el.dataset.badge; if (!k) return; var n = bd[k] || 0; tot += n; el.innerHTML = n ? '<span class="count' + (k === 'kandidatBaru' ? ' blue' : '') + '">' + n + '</span>' : ''; });
  if (!isHRD() && App.boot) tot = (App.boot.ess.cutiBerjalan || []).length;
  var n = $('#bellN'); if (n) { n.hidden = !tot; n.textContent = tot; }
}
function cmdPalette() {
  var items = menuItems().filter(function (m) { return m.p; }).map(function (m) { return { l: m.l, p: m.p, i: m.i }; });
  if (isHRD()) (cacheGet('karyawanList') || []).forEach(function (k) { items.push({ l: k.Nama + ' · ' + k.NIK, sub: k.Jabatan, p: 'karyawan', param: k.ID, i: 'user' }); });
  var m = openOverlay('<div class="modal cmdk"><input class="input" id="cq" placeholder="Ketik menu, nama karyawan, atau NIK…" autocomplete="off"><div class="cmdk-list" id="cl"></div></div>');
  var q = $('#cq', m.el), list = $('#cl', m.el), idx = 0, cur = [];
  function draw() {
    var s = q.value.toLowerCase(); cur = items.filter(function (x) { return (x.l + ' ' + (x.sub || '')).toLowerCase().indexOf(s) > -1; }).slice(0, 30); idx = Math.min(idx, cur.length - 1);
    list.innerHTML = cur.map(function (x, i) { return '<div class="cmdk-item ' + (i === idx ? 'on' : '') + '" data-i="' + i + '">' + ic(x.i) + '<span class="grow">' + esc(x.l) + (x.sub ? ' <span class="muted small">' + esc(x.sub) + '</span>' : '') + '</span></div>'; }).join('') || '<div class="empty">Tidak ditemukan</div>';
    $$('.cmdk-item', list).forEach(function (el) { el.onclick = function () { pick(+el.dataset.i); }; });
  }
  function pick(i) { var x = cur[i]; if (!x) return; m.close(); go(x.p, x.param); }
  q.oninput = function () { idx = 0; draw(); };
  q.onkeydown = function (e) { if (e.key === 'ArrowDown') { idx = Math.min(cur.length - 1, idx + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(); e.preventDefault(); } else if (e.key === 'Enter') pick(idx); };
  draw(); setTimeout(function () { q.focus(); }, 30);
}
document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && App.layout === 'app') { e.preventDefault(); cmdPalette(); } });
function userMenu() {
  var me = App.boot.me;
  modal({ title: me.nama, sub: me.email + ' · ' + roleLabel(me.role), size: 'sm',
    body: '<div class="col"><a class="linkcard" href="#/profil" data-close>' + ic('circle-user') + '<div class="grow"><b>Profil Saya</b><div class="small muted">Data diri, KPI, PIN tanda tangan</div></div></a>' +
      '<a class="linkcard" href="#/karir" data-close>' + ic('briefcase') + '<div class="grow"><b>Portal Karir Publik</b><div class="small muted">Lihat halaman lowongan</div></div></a>' +
      (DEMO ? '<div class="note warn">' + ic('info') + '<div>Mode Demo aktif: data contoh di browser, tidak tersambung ke database. Isi SUPABASE_URL di js/config.js untuk produksi.</div></div>' : '') + '</div>',
    foot: [{ label: 'Tutup', close: true }, { label: 'Keluar', cls: 'btn-danger', icon: 'log-out', act: function () { logout(); } }],
    onOpen: function (el, m) { $$('a', el).forEach(function (a) { a.addEventListener('click', function () { m.close(); }); }); } });
}
function notifPanel() {
  var b = App.boot, rows = [];
  if (isHRD()) {
    if (b.badge.cutiMenunggu) rows.push({ i: 'calendar-days', t: b.badge.cutiMenunggu + ' pengajuan cuti menunggu tindakan', p: 'cuti-admin' });
    if (b.badge.kandidatBaru) rows.push({ i: 'user-plus', t: b.badge.kandidatBaru + ' pelamar dalam proses seleksi', p: 'rekrutmen' });
  }
  (b.ess.cutiBerjalan || []).forEach(function (c) { rows.push({ i: 'hourglass', t: c.Jenis + ' ' + tgl(c.TglMulai) + ' — ' + c.Status, p: 'cuti' }); });
  if (b.ess.slip) rows.push({ i: 'receipt', t: 'Slip gaji ' + b.ess.slip.periode + ' tersedia', p: 'gaji' });
  if (b.pejabat) rows.push({ i: 'file-signature', t: 'Periksa dokumen yang menunggu tanda tangan Anda', p: 'persetujuan' });
  var m = modal({ title: 'Notifikasi', size: 'sm', body: rows.length ? '<div class="col">' + rows.map(function (r, i) { return '<a class="linkcard" href="#/' + r.p + '" data-i="' + i + '">' + ic(r.i) + '<span class="grow">' + esc(r.t) + '</span>' + ic('arrow-right', 'ic-sm') + '</a>'; }).join('') + '</div>' : empty('Tidak ada notifikasi baru.', 'bell'),
    onOpen: function (el, mm) { $$('a', el).forEach(function (a) { a.addEventListener('click', function () { mm.close(); }); }); } });
}

/* ---------------------------------------------------------------- Sesi */
function setSession(token, boot) {
  App.token = token; App.boot = boot;
  Store.set('sess', { token: token, boot: boot, t: Date.now() });
}
async function refreshBoot() {
  var r;
  if (window.SB) {
    r = await SB.buildBootstrap();
  } else {
    r = await api('bootstrap', {}, { silent: true });
  }
  if (r.success) {
    var roleBerubah = App.boot && App.boot.me.role !== r.data.me.role;
    setSession(App.token, r.data); updateBadges();
    if (roleBerubah) { App.layout = ''; route(); }
    if ($('#syncInfo')) $('#syncInfo').textContent = 'Sinkronisasi: ' + jam(new Date()) + ' WIB';
  }
  return r;
}
async function loginDengan(credential) {
  busy(true);
  try {
    var r;
    if (window.SB) {
      /* ── Supabase Auth: login via Google ID Token ── */
      r = await SB.route('login', { credential: credential });
    } else {
      r = await api('login', { credential: credential, appUrl: location.origin + location.pathname });
    }
    if (!r.success) {
      if (r.data && r.data.code === 'NOT_REGISTERED') { Store.set('ditolak', { email: r.data.email, nonaktif: r.data.nonaktif }); go('ditolak'); }
      else toast(r.message, 'bad');
      return r;
    }
    Store.clearUser();
    setSession(r.data.token || 'supabase-session', r.data.boot);
    App.foto = r.data.foto;
    if (isHRD()) loadAdmin().catch(function () { });
    var next = Store.get('next', ''); Store.del('next');
    App.layout = '';
    if (next && next !== '#/login') location.hash = next; else go(defaultPage());
    toast(sapa() + ', ' + r.data.boot.me.nama.split(' ')[0] + '!', 'ok');
    return r;
  } finally { busy(false); }
}
async function logout() {
  if (window.SB) {
    await SB.signOut();
  } else if (App.token) {
    api('logout', {}, { silent: true });
  }
  App.token = ''; App.boot = null; App.layout = ''; Store.del('sess'); Store.clearUser();
  $('#app').innerHTML = '';
  Object.keys(App.timers).forEach(function (k) { clearInterval(App.timers[k]); });
  try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { }
  go('login');
}
function onSessionExpired(msg) {
  if (!App.token) return;
  toast(msg || 'Sesi berakhir. Silakan masuk kembali.', 'warn');
  App.token = ''; App.boot = null; App.layout = ''; Store.del('sess');
  Store.set('next', location.hash); go('login');
}

/* ---------------------------------------------------------------- Start */
async function start() {
  /* ── Cek sesi Supabase terlebih dahulu ── */
  if (window.SB) {
    var session = await SB.getSession();
    if (session) {
      // Ada sesi Supabase aktif. Render seketika dari cache (bila milik user yang sama),
      // lalu segarkan bootstrap dari database.
      var cached = Store.get('sess', null), emailSesi = String(session.user && session.user.email || '').toLowerCase();
      var adaCache = !!(cached && cached.boot && cached.boot.me && String(cached.boot.me.email).toLowerCase() === emailSesi);
      if (adaCache) { App.token = 'supabase-session'; App.boot = cached.boot; if (isHRD()) loadAdmin().catch(function () { }); route(); }
      var boot = await SB.buildBootstrap();
      if (boot.success) {
        if (!adaCache) Store.clearUser();
        App.token = 'supabase-session';
        setSession(App.token, boot.data);
        updateBadges();
        if (!adaCache) { App.layout = ''; route(); }
        if (isHRD()) loadAdmin().catch(function () { });
      } else if (boot.data && boot.data.code === 'NOT_REGISTERED') {
        // Login Google berhasil tetapi email tidak terdaftar / nonaktif di tabel Karyawan
        await SB.signOut();
        App.token = ''; App.boot = null; Store.del('sess');
        Store.set('ditolak', { email: boot.data.email, nonaktif: boot.data.nonaktif });
        go('ditolak');
      } else if (!adaCache) {
        // Gagal memuat (mis. offline) dan tidak ada cache → tampilkan halaman login
        App.token = ''; route(); toast(boot.message, 'bad');
      }
    } else {
      // Tidak ada sesi Supabase → data sesi lama di browser tidak berlaku lagi
      Store.del('sess');
      route();
    }

    // Listener auth state change (handle redirect callback dari Google OAuth)
    SB.onAuthChange(function (event, session) {
      if (event === 'SIGNED_IN' && session && !App.boot) {
        // Baru login (misalnya dari redirect Google OAuth)
        App.token = 'supabase-session';
        SB.buildBootstrap().then(function (boot) {
          if (boot.success) {
            Store.clearUser();
            setSession(App.token, boot.data);
            App.foto = session.user && session.user.user_metadata ? session.user.user_metadata.avatar_url : '';
            if (isHRD()) loadAdmin().catch(function () { });
            var next = Store.get('next', ''); Store.del('next');
            App.layout = '';
            if (next && next !== '#/login') location.hash = next; else go(defaultPage());
            toast(sapa() + ', ' + boot.data.me.nama.split(' ')[0] + '!', 'ok');
          } else if (boot.data && boot.data.code === 'NOT_REGISTERED') {
            Store.set('ditolak', { email: boot.data.email, nonaktif: boot.data.nonaktif });
            go('ditolak');
          }
        });
      } else if (event === 'SIGNED_OUT') {
        if (App.token) {
          App.token = ''; App.boot = null; App.layout = ''; Store.del('sess'); Store.clearUser();
          go('login');
        }
      } else if (event === 'TOKEN_REFRESHED' && App.token) {
        // Token di-refresh otomatis oleh Supabase, refresh bootstrap
        refreshBoot();
      }
    });
  } else {
    /* ── Fallback: mode lama (GAS) ── */
    var s2 = Store.get('sess', null);
    if (s2 && s2.token && Date.now() - s2.t < 11.5 * 3600e3) { App.token = s2.token; App.boot = s2.boot; if (isHRD()) loadAdmin().catch(function () { }); }
    warmUp();
    route();
    if (App.token) refreshBoot();
  }

  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (Date.now() - hiddenAt > 120000) { warmUp(); if (App.token) refreshBoot(); }
  });
}
document.addEventListener('DOMContentLoaded', start);
