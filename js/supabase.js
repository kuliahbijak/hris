/* ============================================================================
 * SIM HRD v2 — supabase.js
 *
 * Jembatan antara tampilan (core.js + pages-*.js) dan backend:
 *   • LOGIN      → Supabase Auth (tombol Google → ID token → signInWithIdToken)
 *   • BACA DATA  → langsung dari Supabase (cepat, dilindungi Row Level Security)
 *   • TULIS DATA → Apps Script (GAS_URL) yang memvalidasi, menyimpan ke Supabase,
 *                  mengelola berkas Google Drive, PDF, email & WhatsApp.
 *
 * Semua aksi tetap memakai nama & format balikan lama:
 *   SB.route(action, data, reqId) → { success, data, message }
 * Aksi yang tidak ada di daftar BACA otomatis diteruskan ke Apps Script.
 *
 * Dimuat SETELAH supabase-js (CDN) & config.js, SEBELUM core.js.
 * ========================================================================== */
'use strict';

(function (window) {
  var CFG = window.SIMHRD_CONFIG || {};
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { console.warn('[SB] SUPABASE_URL/ANON_KEY kosong → Mode Demo.'); return; }
  if (!window.supabase || !window.supabase.createClient) { console.error('[SB] Pustaka supabase-js gagal dimuat (cek koneksi / CDN).'); return; }

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'simhrd-auth' }
  });

  /* ==========================================================================
   * 1. UTILITAS
   * ======================================================================== */
  var ROLES = { SA: 'SUPER_ADMIN', STAFF: 'STAFF_HRD', EMP: 'KARYAWAN' };
  var JENIS_CUTI = ['Cuti Tahunan', 'Cuti Sakit', 'Izin', 'Cuti Khusus', 'Cuti Melahirkan'];
  var JENIS_DOKUMEN = ['KTP', 'NPWP', 'Kartu Keluarga', 'Ijazah', 'Transkrip', 'Sertifikat', 'BPJS', 'Kontrak Kerja', 'Surat Dokter', 'Lainnya'];
  var SEED = { NAMA_PERUSAHAAN: 'PT Solusi Enterprise Nusantara', INSTITUSI_ALAMAT: '', MODUL_ABSENSI_QR: 'YA', RADIUS_GEOFENCE: '50',
    KANTOR_NAMA: 'Kantor Pusat', KANTOR_LAT: '-6.229746', KANTOR_LNG: '106.829518', JAM_MASUK: '08:30', JAM_PULANG: '17:00',
    TOLERANSI_MENIT: '15', HARI_KERJA: '1,2,3,4,5', KUOTA_CUTI_DEFAULT: '12', HARI_KERJA_BULAN: '22', POT_TERLAMBAT_PER_MENIT: '2000',
    BPJS_PERSEN: '4', PAYROLL_CUTOFF: '25', MODUL_ABSENSI_SELFIE: 'YA', SELFIE_WAJIB: 'TIDAK', LOKASI_PER_PEGAWAI: 'YA', LOKASI_SINKRON_PEGAWAI: 'PERSETUJUAN' };
  /* Daftar pengaturan — SAMA PERSIS dengan SETTING_SEED di Apps Script (Kode.gs) */
  var SETTING_SEED = [
  ['NAMA_PERUSAHAAN', 'PT Solusi Enterprise Nusantara', 'Nama perusahaan (muncul di app, email, dokumen)'],
  ['INSTITUSI_ALAMAT', 'Wisma Enterprise Lt. 8, Jakarta Selatan', 'Alamat perusahaan untuk kop dokumen'],
  ['HRD_EMAIL', '', 'Email tim HRD (bantuan & tujuan alert)'],
  ['HRD_WA', '', 'Nomor WA helpdesk HRD'],
  ['APP_URL', '', 'URL frontend (GitHub Pages) — dipakai di {link} notifikasi'],
  ['GOOGLE_CLIENT_ID', '', 'OAuth Client ID Google Identity Services (wajib untuk login)'],
  ['MODUL_ABSENSI_QR', 'YA', 'YA/TIDAK — aktifkan absensi QR + geofencing (US-03)'],
  ['RADIUS_GEOFENCE', '50', 'Radius toleransi lokasi dalam meter (10–100)'],
  ['KANTOR_NAMA', 'Kantor Pusat', 'Nama lokasi kantor'],
  ['KANTOR_LAT', '-6.229746', 'Latitude kantor'],
  ['KANTOR_LNG', '106.829518', 'Longitude kantor'],
  ['JAM_MASUK', '08:30', 'Jam masuk (HH:mm)'],
  ['JAM_PULANG', '17:00', 'Jam pulang (HH:mm)'],
  ['TOLERANSI_MENIT', '15', 'Toleransi keterlambatan (menit)'],
  ['HARI_KERJA', '1,2,3,4,5', 'Hari kerja (1=Senin … 7=Minggu)'],
  ['KUOTA_CUTI_DEFAULT', '12', 'Kuota cuti tahunan bawaan (hari)'],
  ['HARI_KERJA_BULAN', '22', 'Pembagi potongan alpa (hari kerja per bulan)'],
  ['POT_TERLAMBAT_PER_MENIT', '2000', 'Potongan keterlambatan per menit (Rp)'],
  ['BPJS_PERSEN', '4', 'Potongan BPJS porsi karyawan (% dari gaji pokok; Kes 1% + JHT 2% + JP 1%)'],
  ['PPH21_METODE', 'TER', 'TER = estimasi tarif efektif bulanan / NONE = tidak dipotong'],
  ['PAYROLL_CUTOFF', '25', 'Tanggal cut-off periode payroll'],
  ['NOTIF_EMAIL_AKTIF', 'TIDAK', 'YA/TIDAK — saklar utama Email'],
  ['NOTIF_WA_AKTIF', 'TIDAK', 'YA/TIDAK — saklar utama WhatsApp (Fonnte)'],
  ['NOTIF_MATRIKS', '', 'JSON matriks event × kanal (diatur dari menu Notifikasi)'],
  ['WA_BATCH_DEFAULT', '20', 'Ukuran batch blast (10/20/50)'],
  ['WA_JEDA_DETIK', '5', 'Jeda antarpesan, boleh acak "3-8"'],
  ['WA_DETEKSI_OTOMATIS', 'YA', 'Cek otomatis nomor kontak baru terdaftar WA'],
  ['EMAIL_NAMA_PENGIRIM', 'SIM HRD', 'Nama pengirim email'],
  ['CRM_SYNC_MENIT', '30', 'Interval sinkron otomatis CRM (menit)'],
  ['BACKUP_OTOMATIS', 'YA', 'YA/TIDAK — backup tahunan otomatis (US-16)'],
  ['BACKUP_TANGGAL', '12-31', 'Tanggal backup tahunan (MM-dd), dijalankan pukul 23:00'],
  ['RESET_ABSENSI', 'YA', 'Setelah backup: kosongkan Absensi_QR & Absensi_Fingerprint tahun lalu'],
  ['RESET_CUTI', 'YA', 'Setelah backup: arsipkan pengajuan cuti tahun lalu'],
  ['HAPUS_LEADS_LAMA', 'TIDAK', 'Setelah backup: anonimkan leads > 12 bulan (UU PDP)'],
  ['VERIFIKASI_URL', '', 'URL halaman verifikasi dokumen (bawaan: APP_URL + #/verifikasi/)'],
  ['MODUL_ABSENSI_SELFIE', 'YA', 'YA/TIDAK — izinkan presensi dengan foto Selfie + GPS (tanpa QR)'],
  ['SELFIE_WAJIB', 'TIDAK', 'YA/TIDAK — wajib foto selfie di setiap presensi, termasuk scan QR'],
  ['LOKASI_PER_PEGAWAI', 'YA', 'YA/TIDAK — pakai lokasi kerja khusus per pegawai bila sudah diatur'],
  ['LOKASI_SINKRON_PEGAWAI', 'PERSETUJUAN', 'TIDAK / PERSETUJUAN / OTOMATIS — pegawai menyinkronkan lokasi kerja dari GPS perangkatnya']
];
  var AKUN_ADMIN = 'Akun Admin';

  function ok(d, m) { return { success: true, data: d === undefined ? null : d, message: m || '' }; }
  function fail(m, d) { return { success: false, message: m || 'Terjadi kesalahan.', data: d || null }; }
  function sesiHabis() { return fail('Sesi berakhir. Silakan masuk kembali.', { code: 'AUTH' }); }
  function errDb(e) {
    var m = (e && (e.message || e.msg)) || String(e);
    console.error('[SB]', e);
    if (/failed to fetch|network|load failed|fetch/i.test(m)) return { success: false, network: true, retryable: true, message: 'Koneksi ke database terputus. Periksa internet Anda.' };
    if (/jwt|token|permission denied|42501|PGRST301/i.test(m + (e && e.code))) return sesiHabis();
    return fail('Database: ' + m);
  }
  function lower(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function num(v) { var n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; }
  function toMin(hm) { var p = String(hm || '0:0').split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); }
  function jsonOr(s, d) { try { return s ? (typeof s === 'string' ? JSON.parse(s) : s) : d; } catch (e) { return d; } }
  function hp08(v) {
    var s = String(v == null ? '' : v).trim().replace(/\.0+$/, '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
    if (!s) return '';
    if (s.indexOf('62') === 0) s = '0' + s.substring(2); else if (s.indexOf('8') === 0) s = '0' + s;
    return s;
  }
  function normRole(r) {
    r = String(r || '').toUpperCase().replace(/\s+/g, '_');
    if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN' || r === 'ADMIN') return ROLES.SA;
    if (r === 'STAFF_HRD' || r === 'STAFF' || r === 'HRD') return ROLES.STAFF;
    return ROLES.EMP;
  }
  function isHrdRole(r) { return r === ROLES.SA || r === ROLES.STAFF; }
  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; }
  function copy(o) { return Object.assign({}, o); }
  function natKey(v) { return String(v == null ? '' : v).replace(/\d+/g, function (d) { return ('000000000000000' + d).slice(-15); }); }
  function byNat(col) { return function (a, b) { var x = natKey(a[col]), y = natKey(b[col]); return x < y ? -1 : x > y ? 1 : 0; }; }
  function desc(col) { return function (a, b) { return a[col] < b[col] ? 1 : a[col] > b[col] ? -1 : 0; }; }
  function asc(col) { return function (a, b) { return a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0; }; }
  /** Baris database → bentuk sama seperti dulu dari Sheets (null → ''). */
  function clean(r) {
    var o = {};
    Object.keys(r).forEach(function (k) { var v = r[k]; o[k] = v === null || v === undefined ? '' : (k === 'NoWA' ? hp08(v) : v); });
    return o;
  }

  /* --- tanggal (zona Asia/Jakarta, aritmetika tanpa jam) --- */
  var fmtJkt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
  function today() { return fmtJkt.format(new Date()); }
  function ymdUTC(y, m0, d) { return new Date(Date.UTC(y, m0, d)).toISOString().slice(0, 10); }
  function addDays(t, n) { var p = t.split('-'); return ymdUTC(+p[0], +p[1] - 1, +p[2] + n); }
  function dow(t) { var p = t.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function daftarTanggal(dari, sampai) { var out = [], t = dari; for (var i = 0; t <= sampai && i < 400; i++) { out.push(t); t = addDays(t, 1); } return out; }
  function hariKerjaSet(S) { var set = {}; String(set_(S, 'HARI_KERJA')).split(',').forEach(function (x) { set[Number(x) % 7] = true; }); return set; }
  function hariKerjaAntara(S, dari, sampai) { var hk = hariKerjaSet(S); return daftarTanggal(dari, sampai).filter(function (t) { return hk[dow(t)]; }); }
  function rentangPeriode(S, periode) {
    var p = String(periode).split('-'), y = Number(p[0]), m = Number(p[1]), c = Number(set_(S, 'PAYROLL_CUTOFF')) || 25;
    return { dari: ymdUTC(y, m - 2, c), sampai: ymdUTC(y, m - 1, c - 1) };
  }
  function periodeSekarang(S) {
    var t = today(), c = Number(set_(S, 'PAYROLL_CUTOFF')) || 25, y = +t.slice(0, 4), m = +t.slice(5, 7);
    return Number(t.slice(8)) >= c ? ymdUTC(y, m, 1).slice(0, 7) : t.slice(0, 7);
  }

  /* ==========================================================================
   * 2. AKSES DATA
   * ======================================================================== */
  /** Ambil semua baris (paging otomatis melewati batas 1000 baris Supabase). */
  async function all(table, cols, apply, orderCol) {
    var q0 = sb.from(table).select(cols || '*', { count: 'exact' });
    if (apply) q0 = apply(q0);
    var first = await q0.order(orderCol || 'ID', { ascending: true }).range(0, 999);
    if (first.error) throw first.error;
    var rows = first.data || [], total = first.count || rows.length;
    if (total > rows.length && rows.length) {
      var page = rows.length, jobs = [];
      for (var off = page; off < total; off += page) {
        var q = sb.from(table).select(cols || '*');
        if (apply) q = apply(q);
        jobs.push(q.order(orderCol || 'ID', { ascending: true }).range(off, off + page - 1));
      }
      var res = await Promise.all(jobs);
      res.forEach(function (r) { if (r.error) throw r.error; rows = rows.concat(r.data || []); });
    }
    return rows.map(clean);
  }
  async function one(q) { var r = await q; if (r.error) throw r.error; return (r.data || []).map(clean); }

  var _set = { t: 0, v: null };
  async function settings(force) {
    if (!force && _set.v && Date.now() - _set.t < 60000) return _set.v;
    var rows = await one(sb.from('Pengaturan_Sistem').select('Kunci,Nilai'));
    var o = {}; rows.forEach(function (r) { o[r.Kunci] = String(r.Nilai); });
    _set = { t: Date.now(), v: o };
    return o;
  }
  function set_(S, k, def) {
    var v = S[k];
    if (v === undefined || v === '') return def !== undefined ? def : (SEED[k] !== undefined ? SEED[k] : '');
    return v;
  }
  /* --- v2.1: lokasi kerja per pegawai & konfigurasi absensi (sama dengan FiturV21.gs) --- */
  function ikutAbsen(k) { return k.Status === 'Aktif' && k.StatusKerja !== AKUN_ADMIN; }
  function lokasiKerja(S, u) {
    var dasar = { nama: set_(S, 'KANTOR_NAMA'), lat: num(set_(S, 'KANTOR_LAT')), lng: num(set_(S, 'KANTOR_LNG')), radius: num(set_(S, 'RADIUS_GEOFENCE')) || 50, sumber: 'kantor' };
    if (!u || set_(S, 'LOKASI_PER_PEGAWAI') === 'TIDAK' || u.LokasiStatus !== 'Aktif' || u.LokasiLat === '' || u.LokasiLng === '') return dasar;
    var lat = Number(u.LokasiLat), lng = Number(u.LokasiLng);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return dasar;
    return { nama: u.LokasiNama || 'Lokasi kerja ' + u.Nama, lat: lat, lng: lng, radius: num(u.LokasiRadius) || dasar.radius, sumber: 'pegawai' };
  }
  function modeSinkron(S) { if (set_(S, 'LOKASI_PER_PEGAWAI') === 'TIDAK') return 'TIDAK'; var m = set_(S, 'LOKASI_SINKRON_PEGAWAI', 'PERSETUJUAN'); return ['TIDAK', 'PERSETUJUAN', 'OTOMATIS'].indexOf(m) > -1 ? m : 'PERSETUJUAN'; }
  function cfgAbsen(S, u) {
    var lok = lokasiKerja(S, u), usul = u ? jsonOr(u.LokasiUsul, null) : null;
    return { modulQR: set_(S, 'MODUL_ABSENSI_QR') === 'YA', modulSelfie: set_(S, 'MODUL_ABSENSI_SELFIE') === 'YA', selfieWajib: set_(S, 'SELFIE_WAJIB') === 'YA',
      jamMasuk: set_(S, 'JAM_MASUK'), jamPulang: set_(S, 'JAM_PULANG'), radius: lok.radius, toleransi: num(set_(S, 'TOLERANSI_MENIT')),
      kantor: { nama: lok.nama, lat: lok.lat, lng: lok.lng, sumber: lok.sumber },
      sinkronLokasi: modeSinkron(S), lokasiUsul: usul && usul.status === 'Menunggu' ? usul : null };
  }
  function lokasiBaris(S, k) {
    var usul = jsonOr(k.LokasiUsul, null);
    return { id: k.ID, nik: k.NIK, nama: k.Nama, email: k.Email, divisi: k.Divisi, jabatan: k.Jabatan, lokasi: lokasiKerja(S, k),
      khusus: k.LokasiStatus === 'Aktif' ? { nama: k.LokasiNama, lat: num(k.LokasiLat), lng: num(k.LokasiLng), radius: num(k.LokasiRadius) } : null,
      usul: usul && usul.status === 'Menunggu' ? usul : null, riwayatUsul: usul && usul.status !== 'Menunggu' ? usul : null };
  }
  function hpValid(v) { return /^08\d{8,12}$/.test(hp08(v)); }
  function emailValid(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim()); }
  /* Token QR harian: rahasianya di Apps Script → diambil 1× per hari lalu disimpan di perangkat HRD */
  var _qr = null;
  async function qrHariIni() {
    var tgl = today(), e = await myEmail(), key = 'simhrd:qr:' + e + ':' + tgl;
    if (_qr && _qr.tanggal === tgl && _qr.e === e) return _qr.v;
    try { var c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && c.qrHarian) { _qr = { tanggal: tgl, e: e, v: c }; return c; } } catch (x) { }
    var r = await apiGas('absensiQr', {});
    if (!r || !r.success) return null;
    var v = { qrHarian: r.data.qrHarian, kioskSeed: r.data.kioskSeed, ymd: r.data.ymd };
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('simhrd:qr:') === 0) localStorage.removeItem(k); }); localStorage.setItem(key, JSON.stringify(v)); } catch (x) { }
    _qr = { tanggal: tgl, e: e, v: v };
    return v;
  }
  function lupakanQr() { _qr = null; try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('simhrd:qr:') === 0) localStorage.removeItem(k); }); } catch (x) { } }

  async function getSession() { var r = await sb.auth.getSession(); return r.data ? r.data.session : null; }
  async function myEmail() { var s = await getSession(); return s && s.user ? lower(s.user.email) : ''; }

  var _me = { e: '', t: 0, v: null };
  /** Baris Karyawan milik user login (null bila tidak terdaftar). */
  async function meRow(force) {
    var e = await myEmail(); if (!e) return null;
    if (!force && _me.v && _me.e === e && Date.now() - _me.t < 60000) return _me.v;
    var rows = await one(sb.from('Karyawan').select('*').ilike('Email', e).limit(20));
    var u = rows.filter(function (r) { return lower(r.Email) === e; })[0] || null;
    _me = { e: e, t: Date.now(), v: u };
    return u;
  }
  async function meAktif() { var u = await meRow(); return u && u.Status === 'Aktif' ? u : null; }

  /* --- kehadiran gabungan QR + fingerprint: { 'NIK|yyyy-MM-dd': {...} } --- */
  async function kehadiranMap(S, dari, sampai, nik) {
    var jm = toMin(set_(S, 'JAM_MASUK')), tol = Number(set_(S, 'TOLERANSI_MENIT')) || 0;
    var f = function (q) { q = q.gte('Tanggal', dari).lte('Tanggal', sampai); return nik ? q.eq('NIK', String(nik)) : q; };
    var hasil = await Promise.all([
      all('Absensi_Fingerprint', 'ID,NIK,Tanggal,JamMasuk,JamKeluar', f),
      all('Absensi_QR', 'ID,NIK,Tanggal,JamMasuk,JamKeluar,MenitTerlambat,Metode,Jarak,Status', f)
    ]);
    var map = {};
    hasil[0].sort(byNat('ID')).forEach(function (r) {
      var telat = r.JamMasuk ? Math.max(0, toMin(r.JamMasuk) - jm) : 0;
      map[r.NIK + '|' + r.Tanggal] = { masuk: r.JamMasuk, keluar: r.JamKeluar, telat: telat > tol ? telat : 0, sumber: 'Fingerprint', jarak: '' };
    });
    hasil[1].sort(byNat('ID')).forEach(function (r) {
      if (r.Status === 'Ditolak') return;
      map[r.NIK + '|' + r.Tanggal] = { masuk: r.JamMasuk, keluar: r.JamKeluar, telat: num(r.MenitTerlambat), sumber: r.Metode || 'QR + GPS', jarak: r.Jarak, status: r.Status };
    });
    return map;
  }
  /** Tanggal cuti disetujui per NIK: { NIK: { tgl: jenis } } */
  async function cutiMap(S, dari, sampai, nik) {
    var rows = await all('Cuti_Izin', 'ID,NIK,Jenis,TglMulai,TglSelesai,Status', function (q) {
      q = q.eq('Status', 'Disetujui').gte('TglSelesai', dari).lte('TglMulai', sampai); return nik ? q.eq('NIK', String(nik)) : q;
    });
    var out = {};
    rows.forEach(function (c) {
      hariKerjaAntara(S, c.TglMulai > dari ? c.TglMulai : dari, c.TglSelesai < sampai ? c.TglSelesai : sampai).forEach(function (t) {
        (out[c.NIK] = out[c.NIK] || {})[t] = c.Jenis;
      });
    });
    return out;
  }
  function sisaCuti(S, u, cutiRows, tahun) {
    tahun = String(tahun || today().slice(0, 4));
    var kuota = Number(u.KuotaCuti) || Number(set_(S, 'KUOTA_CUTI_DEFAULT')) || 12, dipakai = 0, menunggu = 0;
    cutiRows.forEach(function (c) {
      if (c.ID_Karyawan !== u.ID || c.Jenis !== 'Cuti Tahunan' || String(c.TglMulai).slice(0, 4) !== tahun) return;
      if (c.Status === 'Disetujui') dipakai += num(c.JumlahHari);
      else if (c.Status === 'Menunggu' || c.Status === 'Diproses') menunggu += num(c.JumlahHari);
    });
    return { kuota: kuota, dipakai: dipakai, menunggu: menunggu, sisa: kuota - dipakai };
  }
  function kpiOut(k) { var o = copy(k); o.Indikator = jsonOr(k.Indikator, []); return o; }
  function lowonganPublik(l) {
    return { id: l.ID, judul: l.Judul, divisi: l.Divisi, tipe: l.Tipe, model: l.Model, lokasi: l.Lokasi, level: l.Level,
      deskripsi: l.Deskripsi, kualifikasi: l.Kualifikasi, kuota: num(l.Kuota), batas: l.BatasLamaran, populer: l.Populer === 'YA',
      form: jsonOr(l.FormFields, []) };
  }
  function kandidatRingkas(k) {
    return { id: k.ID, nama: k.Nama, email: k.Email, wa: hp08(k.NoWA), posisi: k.Posisi, lowonganId: k.LowonganID, sumber: k.Sumber,
      skor: num(k.SkorATS), tahap: k.Tahap, status: k.Status, dibuat: k.DibuatPada, domisili: k.Domisili, portofolio: k.Portofolio,
      cv: !!k.CVFileID, statusWA: k.StatusWA };
  }
  function petaKaryawan(rows) { var m = {}; rows.forEach(function (k) { m[k.ID] = k; }); return m; }

  /* ==========================================================================
   * 3. AUTH (Supabase Auth + Google)
   * ======================================================================== */
  var _loginBerjalan = false;

  /** Login dengan ID token dari tombol Google (GIS). */
  async function loginWithIdToken(idToken) {
    var r = await sb.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (r.error) return fail(pesanLogin(r.error.message));
    return ok(r.data, 'Login berhasil.');
  }
  function pesanLogin(m) {
    if (/provider is not enabled|unsupported provider/i.test(m)) return 'Login Google belum diaktifkan di Supabase (Authentication → Sign In / Providers → Google).';
    if (/audience|client id|aud/i.test(m)) return 'Google Client ID belum didaftarkan di Supabase (Providers → Google → Client IDs).';
    return 'Login gagal: ' + m;
  }
  /** Alternatif: login lewat halaman Google (redirect). */
  async function loginGoogle() {
    var r = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
    return r.error ? fail(r.error.message) : ok(null, 'Mengalihkan ke Google…');
  }
  async function signOut() { _me = { e: '', t: 0, v: null }; _set = { t: 0, v: null }; try { await sb.auth.signOut(); } catch (e) { } }
  function onAuthChange(cb) {
    return sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_IN' && _loginBerjalan) return;        // ditangani langsung oleh route 'login'
      setTimeout(function () { cb(event, session); }, 0);
    });
  }

  /** Data layar pertama: { me, cfg, ess, pejabat, badge } — sama persis dengan versi Apps Script. */
  async function buildBootstrap() {
    try {
      var s = await getSession(); if (!s) return sesiHabis();
      var email = lower(s.user.email), u = await meRow(true);
      if (!u || u.Status !== 'Aktif') return fail('Email belum terdaftar di Master Data Karyawan aktif.', { code: 'NOT_REGISTERED', email: email, nonaktif: !!u });
      var role = normRole(u.Role), S = await settings(true), tgl = today(), dari = addDays(tgl, -13);
      var hasil = await Promise.all([
        kehadiranMap(S, dari, tgl, u.NIK),
        all('Cuti_Izin', '*', function (q) { return q.eq('ID_Karyawan', u.ID); }),
        all('KPI_Performa', '*', function (q) { return q.eq('ID_Karyawan', u.ID); }),
        one(sb.from('Payroll').select('ID,Periode,GajiBersih,StatusSlip').eq('ID_Karyawan', u.ID).in('StatusSlip', ['Terbit', 'Terkirim']).order('Periode', { ascending: false }).limit(1)),
        one(sb.from('DE_Pejabat').select('id,email,aktif').ilike('email', email)),
        isHrdRole(role) ? sb.from('Cuti_Izin').select('ID', { count: 'exact', head: true }).in('Status', ['Menunggu', 'Diproses']) : null,
        isHrdRole(role) ? sb.from('Kandidat_Rekrutmen').select('ID', { count: 'exact', head: true }).eq('Status', 'Proses') : null
      ]);
      var km = hasil[0], cuti = hasil[1], kpi = hasil[2], slip = hasil[3][0];
      var riwayat = [];
      daftarTanggal(dari, tgl).reverse().forEach(function (t) {
        var h = km[u.NIK + '|' + t]; if (h) riwayat.push({ tanggal: t, masuk: h.masuk, keluar: h.keluar, telat: h.telat, sumber: h.sumber, jarak: h.jarak });
      });
      var out = {
        me: { id: u.ID, nik: u.NIK, nama: u.Nama, email: u.Email, wa: hp08(u.NoWA), divisi: u.Divisi, jabatan: u.Jabatan, role: role,
          statusKerja: u.StatusKerja, tglBergabung: u.TglBergabung, kontrakBerakhir: u.TglKontrakBerakhir, bank: u.Bank,
          rekening: (function (r) { r = String(r || ''); return r.length > 4 ? r.slice(0, 4) + '•••' + r.slice(-3) : r; })(u.NoRekening),
          ptkp: u.StatusPTKP, kuotaCuti: Number(u.KuotaCuti) || Number(set_(S, 'KUOTA_CUTI_DEFAULT')) },
        cfg: Object.assign({ perusahaan: set_(S, 'NAMA_PERUSAHAAN') }, cfgAbsen(S, u), { hrdEmail: set_(S, 'HRD_EMAIL', ''), hrdWa: set_(S, 'HRD_WA', '') }),
        ess: {
          hariIni: km[u.NIK + '|' + tgl] || null, riwayat: riwayat.slice(0, 7), cuti: sisaCuti(S, u, cuti),
          cutiBerjalan: cuti.sort(byNat('ID')).filter(function (c) { return c.Status === 'Menunggu' || c.Status === 'Diproses'; })
            .map(function (c) { return pick(c, ['ID', 'Jenis', 'TglMulai', 'TglSelesai', 'JumlahHari', 'Status']); }),
          kpi: kpi.sort(desc('Periode')).slice(0, 4).map(function (k) { return { periode: k.Periode, skor: num(k.SkorKPI), indikator: jsonOr(k.Indikator, []), catatan: k.Catatan, reviewer: k.Reviewer }; }),
          slip: slip ? { id: slip.ID, periode: slip.Periode, bersih: num(slip.GajiBersih), status: slip.StatusSlip } : null
        },
        pejabat: hasil[4].some(function (p) { return lower(p.email) === email && p.aktif === 'YA'; })
      };
      if (isHrdRole(role)) out.badge = { cutiMenunggu: (hasil[5] && hasil[5].count) || 0, kandidatBaru: (hasil[6] && hasil[6].count) || 0 };
      return ok(out);
    } catch (e) { return errDb(e); }
  }

  /* ==========================================================================
   * 4. AKSI BACA LANGSUNG KE SUPABASE
   *    (fungsi menerima data & profil user; hak akses dijaga RLS di database)
   * ======================================================================== */
  var PUBLIC = { login: 1, publicConfig: 1, karirList: 1, karirStatus: 1, karirApply: 1, verifikasiDok: 1 };
  var HRD_ONLY = /^(adminDashboard|karyawanList|karyawanDetail|absensiRekap|absensiAdmin|lokasiList|cutiList|payrollList|dokList|kpiList|lowonganList|kandidatList|kandidatDetail|leadsList|logList|laporan|fpRiwayat|notif\.queue|wa\.blastList|crm\.(list|stats)|de\.(templateList|pejabatList|dokumenList|massalStatus))$/;
  var SA_ONLY = /^(settingsGet|aksesList|resetInfo)$/;

  var READ = {
    /* ── publik ─────────────────────────────────────────────── */
    publicConfig: async function () {
      var r = await sb.rpc('public_config'); if (r.error) throw r.error; return ok(r.data);
    },
    karirList: async function () {
      var r = await sb.rpc('karir_list'); if (r.error) throw r.error; return ok(r.data);
    },
    karirStatus: async function (d) {
      var r = await sb.rpc('karir_status', { p_email: d.email || '', p_kode: d.kode || '' }); if (r.error) throw r.error;
      return r.data ? ok(r.data) : fail('Lamaran tidak ditemukan. Periksa email & kode lamaran.');
    },

    /* ── karyawan (ESS) ─────────────────────────────────────── */
    absenInfo: async function (d, u, S) {
      var tgl = today(), bulan = tgl.slice(0, 7), dari = bulan + '-01';
      var hasil = await Promise.all([
        kehadiranMap(S, addDays(tgl, -45), tgl, u.NIK), cutiMap(S, dari, tgl, u.NIK),
        one(sb.from('Absensi_QR').select('*').eq('ID_Karyawan', u.ID).eq('Tanggal', tgl).order('ID').limit(1))
      ]);
      var km = hasil[0], log = [];
      Object.keys(km).forEach(function (k) {
        var p = k.split('|'); if (p[0] !== String(u.NIK)) return;
        var h = km[k]; log.push({ tanggal: p[1], masuk: h.masuk, keluar: h.keluar, telat: h.telat, sumber: h.sumber, jarak: h.jarak });
      });
      log.sort(desc('tanggal'));
      var bln = log.filter(function (x) { return x.tanggal >= dari; }), cm = hasil[1][u.NIK] || {}, hk = hariKerjaAntara(S, dari, tgl).length;
      var rata = bln.length ? Math.round(bln.reduce(function (s, x) { return s + toMin(x.masuk); }, 0) / bln.length) : 0, qr = hasil[2][0];
      return ok({
        hariIni: qr ? { masuk: qr.JamMasuk, keluar: qr.JamKeluar, jarak: num(qr.Jarak), status: qr.Status, telat: num(qr.MenitTerlambat), foto: !!qr.FotoMasuk } : (km[u.NIK + '|' + tgl] || null),
        riwayat: log.slice(0, 30),
        bulan: { hariKerja: hk, hadir: bln.length, tepat: bln.filter(function (x) { return !x.telat; }).length,
          terlambat: bln.filter(function (x) { return x.telat; }).length, menitTelat: bln.reduce(function (s, x) { return s + num(x.telat); }, 0),
          cuti: Object.keys(cm).length, rataMasuk: rata ? String(Math.floor(rata / 60)).padStart(2, '0') + ':' + String(rata % 60).padStart(2, '0') : '-' },
        cfg: cfgAbsen(S, u), serverTime: Date.now()
      });
    },
    cutiMine: async function (d, u, S) {
      var rows = await all('Cuti_Izin', '*', function (q) { return q.eq('ID_Karyawan', u.ID); });
      return ok({ saldo: sisaCuti(S, u, rows), jenis: JENIS_CUTI, riwayat: rows.sort(byNat('ID')).sort(desc('DiajukanPada')) });
    },
    slipMine: async function (d, u) {
      var rows = await one(sb.from('Payroll').select('*').eq('ID_Karyawan', u.ID).in('StatusSlip', ['Terbit', 'Terkirim']).order('Periode', { ascending: false }).limit(24));
      return ok(rows.map(function (p) { delete p.SlipFileID; return p; }));
    },
    dokMine: async function (d, u) {
      var rows = await all('Dokumen_Arsip', '*', function (q) { return q.eq('ID_Karyawan', u.ID); });
      return ok({ jenis: JENIS_DOKUMEN, rows: rows.sort(desc('TglUpload')) });
    },
    kpiMine: async function (d, u) {
      var rows = await all('KPI_Performa', '*', function (q) { return q.eq('ID_Karyawan', u.ID); });
      return ok(rows.sort(desc('Periode')).map(kpiOut));
    },

    /* ── HRD ────────────────────────────────────────────────── */
    karyawanList: async function () {
      var hasil = await Promise.all([all('Karyawan'), all('Dokumen_Arsip', 'ID,ID_Karyawan')]), dok = {};
      hasil[1].forEach(function (x) { dok[x.ID_Karyawan] = (dok[x.ID_Karyawan] || 0) + 1; });
      return ok(hasil[0].sort(byNat('ID')).map(function (k) { var o = copy(k); o.Role = normRole(k.Role); o.JumlahDokumen = dok[k.ID] || 0; delete o.FolderID; return o; }));
    },
    karyawanDetail: async function (d, u, S) {
      var k = (await one(sb.from('Karyawan').select('*').eq('ID', d.id || '')))[0];
      if (!k) return fail('Karyawan tidak ditemukan.');
      var f = function (q) { return q.eq('ID_Karyawan', k.ID); };
      var h = await Promise.all([all('Cuti_Izin', '*', f), all('Dokumen_Arsip', '*', f), all('Payroll', '*', f), all('KPI_Performa', '*', f)]);
      var o = copy(k); o.Role = normRole(k.Role);
      return ok({ karyawan: o, cuti: sisaCuti(S, k, h[0]), dokumen: h[1].sort(byNat('ID')),
        payroll: h[2].sort(desc('Periode')).slice(0, 6), kpi: h[3].sort(byNat('ID')).map(kpiOut), riwayatCuti: h[0].sort(byNat('ID')).slice(-10) });
    },
    cutiList: async function (d, u, S) {
      var h = await Promise.all([all('Karyawan', 'ID,Divisi,Jabatan,KuotaCuti'), all('Cuti_Izin')]), kar = petaKaryawan(h[0]), semua = h[1];
      var rows = semua.filter(function (c) { return !d.status || c.Status === d.status; }).sort(byNat('ID')).sort(desc('DiajukanPada')).slice(0, 500)
        .map(function (c) {
          var k = kar[c.ID_Karyawan] || {}, s = k.ID ? sisaCuti(S, k, semua, String(c.TglMulai).slice(0, 4)) : {};
          var o = copy(c); o.Divisi = k.Divisi || ''; o.Jabatan = k.Jabatan || ''; o.SisaKini = s.sisa; o.Kuota = s.kuota; return o;
        });
      return ok(rows);
    },
    payrollList: async function (d, u, S) {
      var periode = d.periode || periodeSekarang(S), r = rentangPeriode(S, periode);
      var h = await Promise.all([
        all('Payroll', '*', function (q) { return q.eq('Periode', periode); }),
        all('Karyawan', 'ID,Divisi,Jabatan,Email,Status'),
        all('DE_Antrean', 'jobId,jenis,sumber,status', function (q) { return q.eq('jenis', 'slip').like('sumber', '%"periode":"' + periode + '"%'); }, 'jobId'),
        one(sb.from('DE_Template').select('nama').eq('kode', 'SLIP_GAJI').limit(1))
      ]);
      var kar = petaKaryawan(h[1]), rows = h[0].sort(byNat('ID'));
      rows.forEach(function (p) { var k = kar[p.ID_Karyawan] || {}; p.Divisi = k.Divisi; p.Jabatan = k.Jabatan; p.Email = k.Email; });
      var tot = rows.reduce(function (s, p) {
        s.bersih += num(p.GajiBersih); s.tunj += num(p.Tunjangan) + num(p.Lembur); s.pot += num(p.Potongan);
        s.bpjs += num(p.BPJS); s.pph += num(p.PPh21); s.alpa += num(p.PotAlpa) + num(p.PotTerlambat); s[p.StatusSlip] = (s[p.StatusSlip] || 0) + 1; return s;
      }, { bersih: 0, tunj: 0, pot: 0, bpjs: 0, pph: 0, alpa: 0 });
      var q = h[2].filter(function (j) { return jsonOr(j.sumber, {}).periode === periode; });
      return ok({ periode: periode, rentang: r, rows: rows, total: tot, aktif: h[1].filter(function (k) { return k.Status === 'Aktif'; }).length,
        antrean: { total: q.length, selesai: q.filter(function (j) { return j.status === 'SELESAI'; }).length, gagal: q.filter(function (j) { return j.status === 'GAGAL'; }).length },
        template: (h[3][0] || {}).nama || '' });
    },
    dokList: async function (d) {
      var h = await Promise.all([all('Karyawan', 'ID,Nama,Divisi'), all('Dokumen_Arsip', '*', function (q) {
        if (d.idKaryawan) q = q.eq('ID_Karyawan', d.idKaryawan); if (d.status) q = q.eq('Status', d.status); return q;
      })]), kar = petaKaryawan(h[0]);
      return ok(h[1].sort(byNat('ID')).sort(desc('TglUpload')).slice(0, 800).map(function (x) {
        var o = copy(x); o.Nama = (kar[x.ID_Karyawan] || {}).Nama || ''; o.Divisi = (kar[x.ID_Karyawan] || {}).Divisi || ''; return o;
      }));
    },
    kpiList: async function (d) {
      var h = await Promise.all([all('Karyawan', 'ID,Divisi,Jabatan'), all('KPI_Performa', '*', function (q) { return d.periode ? q.eq('Periode', d.periode) : q; })]), kar = petaKaryawan(h[0]);
      return ok(h[1].sort(byNat('ID')).map(function (k) { var o = kpiOut(k); o.Divisi = (kar[k.ID_Karyawan] || {}).Divisi; o.Jabatan = (kar[k.ID_Karyawan] || {}).Jabatan; return o; }));
    },
    lowonganList: async function () {
      var h = await Promise.all([all('Lowongan'), all('Kandidat_Rekrutmen', 'ID,LowonganID')]), kd = {};
      h[1].forEach(function (k) { kd[k.LowonganID] = (kd[k.LowonganID] || 0) + 1; });
      return ok(h[0].sort(byNat('ID')).map(function (l) { var o = lowonganPublik(l); o.status = l.Status; o.pelamar = kd[l.ID] || 0; o.dibuat = l.DibuatPada; return o; }));
    },
    kandidatList: async function (d) {
      var rows = await all('Kandidat_Rekrutmen', 'ID,Nama,Email,NoWA,Posisi,LowonganID,Sumber,SkorATS,Tahap,Status,DibuatPada,Domisili,Portofolio,CVFileID,StatusWA',
        function (q) { return d.lowonganId ? q.eq('LowonganID', d.lowonganId) : q; });
      return ok(rows.sort(byNat('ID')).sort(desc('DibuatPada')).map(kandidatRingkas));
    },
    leadsList: async function () {
      var rows = await all('Leads_Database');
      return ok(rows.sort(byNat('ID')).map(function (l) { var o = copy(l); o.cv = !!l.CVFileID; delete o.CVFileID; return o; }));
    },
    logList: async function (d) {
      var rows = await one(sb.from('Log_Aktivitas').select('*').order('Waktu', { ascending: false }).limit(400));
      if (d.aksi) rows = rows.filter(function (r) { return String(r.Aksi).indexOf(d.aksi) > -1; });
      return ok(rows.slice(0, 300));
    },
    fpRiwayat: async function () {
      var rows = await one(sb.from('Log_Aktivitas').select('Waktu,User,Detail').eq('Aksi', 'IMPORT_FINGERPRINT').order('Waktu', { ascending: false }).limit(10));
      return ok(rows.map(function (l) { return { waktu: l.Waktu, oleh: l.User, detail: l.Detail }; }));
    },
    adminDashboard: async function (d, u, S) {
      var tgl = today(), dari = addDays(tgl, -29), per = periodeSekarang(S);
      var h = await Promise.all([
        all('Karyawan', 'ID,NIK,Nama,Jabatan,Divisi,Status,StatusKerja,TglBergabung,TglKontrakBerakhir'),
        kehadiranMap(S, dari, tgl), cutiMap(S, dari, tgl),
        all('Cuti_Izin', '*', function (q) { return q.in('Status', ['Menunggu', 'Diproses']); }),
        all('Kandidat_Rekrutmen', 'ID,Nama,Email,NoWA,Posisi,LowonganID,Sumber,SkorATS,Tahap,Status,DibuatPada,Domisili,Portofolio,CVFileID,StatusWA', function (q) { return q.eq('Status', 'Proses'); }),
        all('Payroll', 'ID,GajiBersih,StatusSlip', function (q) { return q.eq('Periode', per); }),
        sb.from('Dokumen_Arsip').select('ID', { count: 'exact', head: true }).eq('Status', 'Menunggu Verifikasi')
      ]);
      var kar = h[0].filter(ikutAbsen).sort(byNat('ID')), km = h[1], cm = h[2], hk = hariKerjaSet(S);
      var tren = daftarTanggal(dari, tgl).map(function (t) {
        var kerja = !!hk[dow(t)], r = { t: t, kerja: kerja, tepat: 0, telat: 0, cuti: 0 };
        if (!kerja) return r;
        kar.forEach(function (k) { var x = km[k.NIK + '|' + t]; if (x) { if (x.telat) r.telat++; else r.tepat++; } else if (cm[k.NIK] && cm[k.NIK][t]) r.cuti++; });
        return r;
      });
      var hariIni = tren[tren.length - 1], divisi = {}, status = {};
      kar.forEach(function (k) { var dv = k.Divisi || 'Lainnya'; divisi[dv] = (divisi[dv] || 0) + 1; status[k.StatusKerja || '-'] = (status[k.StatusKerja || '-'] || 0) + 1; });
      var batas = addDays(tgl, 30);
      var kontrak = kar.filter(function (k) { return k.TglKontrakBerakhir && k.TglKontrakBerakhir >= tgl && k.TglKontrakBerakhir <= batas; })
        .map(function (k) { return { nama: k.Nama, jabatan: k.Jabatan, tgl: k.TglKontrakBerakhir }; });
      var cuti = h[3].sort(byNat('ID')).sort(asc('TglMulai')), kd = h[4].sort(byNat('ID')).sort(desc('DibuatPada')), pay = h[5];
      var hkData = tren.filter(function (x) { return x.kerja; });
      var sumTepat = hkData.reduce(function (s, x) { return s + x.tepat; }, 0), sumTelat = hkData.reduce(function (s, x) { return s + x.telat; }, 0);
      var kap = hkData.length * kar.length || 1;
      return ok({
        total: kar.length, baru30: kar.filter(function (k) { return k.TglBergabung >= dari; }).length, status: status,
        hariIni: { hadir: hariIni.tepat + hariIni.telat, tepat: hariIni.tepat, telat: hariIni.telat, cuti: hariIni.cuti, alpa: Math.max(0, kar.length - hariIni.tepat - hariIni.telat - hariIni.cuti), kerja: hariIni.kerja },
        tren: tren, rata: { hadirTepat: Math.round(sumTepat / kap * 1000) / 10, telat: Math.round(sumTelat / Math.max(1, sumTepat + sumTelat) * 1000) / 10, efektif: Math.round((sumTepat + sumTelat) / kap * 1000) / 10 },
        divisi: divisi, kontrak: kontrak, dokMenunggu: (h[6] && h[6].count) || 0,
        cuti: { total: cuti.length, rows: cuti.slice(0, 5) },
        kandidat: { total: kd.length, rows: kd.slice(0, 5).map(kandidatRingkas) },
        payroll: { periode: per, total: pay.reduce(function (s, p) { return s + num(p.GajiBersih); }, 0), jumlah: pay.length,
          status: pay.length ? (pay.every(function (p) { return p.StatusSlip === 'Terbit' || p.StatusSlip === 'Terkirim'; }) ? 'TERBIT' : 'DRAFT') : 'BELUM' },
        modulQR: set_(S, 'MODUL_ABSENSI_QR') === 'YA', radius: num(set_(S, 'RADIUS_GEOFENCE')), _k: kar.length
      });
    },
    absensiRekap: async function (d, u, S) {
      var tg = today(), bulan = d.bulan || tg.slice(0, 7), dari = bulan + '-01';
      var akhir = ymdUTC(Number(bulan.slice(0, 4)), Number(bulan.slice(5, 7)), 0), sampai = akhir > tg ? tg : akhir, hk = hariKerjaAntara(S, dari, sampai);
      var h = await Promise.all([kehadiranMap(S, dari, sampai), cutiMap(S, dari, sampai), all('Karyawan', 'ID,NIK,Nama,Divisi,Status,StatusKerja,TglBergabung')]), km = h[0], cm = h[1];
      var rows = h[2].sort(byNat('ID')).filter(ikutAbsen).map(function (k) {
        var r = { nik: k.NIK, nama: k.Nama, divisi: k.Divisi, H: 0, T: 0, I: 0, S: 0, A: 0, menit: 0, hari: {} };
        hk.forEach(function (t) {
          if (k.TglBergabung && t < k.TglBergabung) return;
          var x = km[k.NIK + '|' + t], c = cm[k.NIK] && cm[k.NIK][t];
          var kode = x ? (x.telat ? 'T' : 'H') : c ? (/Sakit/.test(c) ? 'S' : 'I') : 'A';
          r[kode]++; r.hari[t.slice(8)] = kode; if (x) r.menit += x.telat;
        });
        return r;
      });
      return ok({ bulan: bulan, hariKerja: hk.map(function (t) { return t.slice(8); }), rows: rows });
    },
    laporan: async function (d, u, S) {
      var tg = today(), tahun = Number(String(d.periode || '').slice(0, 4)) || Number(tg.slice(0, 4));
      var qm = String(d.periode || '').match(/Q([1-4])/), kuartal = qm ? Number(qm[1]) : Math.floor((Number(tg.slice(5, 7)) - 1) / 3) + 1;
      var bulan = [0, 1, 2].map(function (i) { return tahun + '-' + String((kuartal - 1) * 3 + i + 1).padStart(2, '0'); });
      var periodeKpi = tahun + '-Q' + kuartal, dari = bulan[0] + '-01', akhir = ymdUTC(tahun, kuartal * 3, 0), sampai = akhir > tg ? tg : akhir;
      var h = await Promise.all([
        all('Karyawan', 'ID,NIK,Nama,Email,Divisi,Jabatan,Status,StatusKerja,DiperbaruiPada'),
        all('KPI_Performa', 'ID,ID_Karyawan,Periode,SkorKPI,Catatan', function (q) { return q.in('Periode', [periodeKpi].concat(bulan)); }),
        all('Payroll', 'ID,ID_Karyawan,Periode,GajiBersih', function (q) { return q.in('Periode', bulan); }),
        kehadiranMap(S, dari, sampai)
      ]);
      var semua = h[0].sort(byNat('ID')), kpiAll = h[1].sort(byNat('ID')), payAll = h[2], km = h[3], hk = hariKerjaAntara(S, dari, sampai);
      var kar = semua.filter(function (k) { return ikutAbsen(k) && (!d.divisi || k.Divisi === d.divisi); }), kmap = petaKaryawan(kar);
      var kpi = kpiAll.filter(function (x) { return x.Periode === periodeKpi && kmap[x.ID_Karyawan]; });
      var perDiv = {}, predikat = { 'A+': 0, A: 0, B: 0, C: 0 };
      kpi.forEach(function (x) { var dv = kmap[x.ID_Karyawan].Divisi || 'Lainnya'; perDiv[dv] = perDiv[dv] || { n: 0, s: 0 }; perDiv[dv].n++; perDiv[dv].s += num(x.SkorKPI); });
      kpi.forEach(function (x) { var s = num(x.SkorKPI); predikat[s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B' : 'C']++; });
      var perBulan = bulan.map(function (b) {
        var hari = hk.filter(function (x) { return x.slice(0, 7) === b; }), tepat = 0, hadir = 0;
        hari.forEach(function (x) { kar.forEach(function (k) { var y = km[k.NIK + '|' + x]; if (y) { hadir++; if (!y.telat) tepat++; } }); });
        var kk = kpiAll.filter(function (x) { return x.Periode === b && kmap[x.ID_Karyawan]; });
        var pay = payAll.filter(function (p) { return p.Periode === b && kmap[p.ID_Karyawan]; });
        return { bulan: b, punctuality: hadir ? Math.round(tepat / hadir * 1000) / 10 : 0,
          kehadiran: hari.length && kar.length ? Math.round(hadir / (hari.length * kar.length) * 1000) / 10 : 0,
          payroll: pay.reduce(function (s, p) { return s + num(p.GajiBersih); }, 0),
          kpi: kk.length ? Math.round(kk.reduce(function (s, x) { return s + num(x.SkorKPI); }, 0) / kk.length * 10) / 10 : null };
      });
      var tepatPerNik = {}, totPerNik = {};
      Object.keys(km).forEach(function (key) { var nik = key.split('|')[0]; totPerNik[nik] = (totPerNik[nik] || 0) + 1; if (!km[key].telat) tepatPerNik[nik] = (tepatPerNik[nik] || 0) + 1; });
      var matriks = kar.map(function (k) {
        var x = kpi.filter(function (z) { return z.ID_Karyawan === k.ID; })[0];
        return { id: k.ID, nik: k.NIK, nama: k.Nama, email: k.Email, divisi: k.Divisi, jabatan: k.Jabatan, skor: x ? num(x.SkorKPI) : null,
          tepat: tepatPerNik[k.NIK] || 0, sesi: totPerNik[k.NIK] || 0, catatan: x ? x.Catatan : '' };
      });
      var skorAll = kpi.map(function (x) { return num(x.SkorKPI); });
      var totPay = perBulan.reduce(function (s, b) { return s + b.payroll; }, 0), sesi = Object.keys(km).length;
      var tepatAll = Object.keys(km).filter(function (k) { return !km[k].telat; }).length;
      var keluar = semua.filter(function (k) { return k.Status !== 'Aktif' && String(k.DiperbaruiPada).slice(0, 4) === String(tahun); }).length;
      return ok({ periode: periodeKpi, bulan: perBulan,
        divisi: Object.keys(perDiv).map(function (dv) { return { divisi: dv, skor: Math.round(perDiv[dv].s / perDiv[dv].n * 10) / 10, n: perDiv[dv].n }; }),
        predikat: predikat, matriks: matriks,
        ringkas: { kpi: skorAll.length ? Math.round(skorAll.reduce(function (a, b) { return a + b; }, 0) / skorAll.length * 10) / 10 : 0,
          punctuality: sesi ? Math.round(tepatAll / sesi * 1000) / 10 : 0, sesi: sesi, payroll: totPay,
          retensi: kar.length ? Math.round(kar.length / (kar.length + keluar) * 1000) / 10 : 100, keluar: keluar, karyawan: kar.length },
        divisiList: Object.keys(semua.reduce(function (o, k) { if (k.Divisi) o[k.Divisi] = 1; return o; }, {})) });
    },

    /* ── v2.1: bacaan yang dulu lewat Apps Script (penyebab delay pindah menu) ── */
    absensiAdmin: async function (d, u, S) {
      var tgl = d.tanggal || today();
      var h = await Promise.all([
        all('Karyawan', 'ID,NIK,Nama,Divisi,Status,StatusKerja'), kehadiranMap(S, tgl, tgl), cutiMap(S, tgl, tgl),
        all('Absensi_QR', '*', function (q) { return q.eq('Tanggal', tgl); }),
        all('Absensi_Fingerprint', 'ID,NIK,Tanggal,JamMasuk,JamKeluar', function (q) { return q.eq('Tanggal', tgl); }),
        one(sb.from('Log_Aktivitas').select('Waktu,User,Aksi,Tabel,Detail').order('Waktu', { ascending: false }).limit(400)),
        tgl === today() ? qrHariIni() : null
      ]);
      var kar = h[0].filter(ikutAbsen).sort(byNat('ID')), km = h[1], cm = h[2], byNik = {}, log = [];
      kar.forEach(function (k) { byNik[k.NIK] = k; });
      h[3].sort(byNat('ID')).forEach(function (r) {
        var k = byNik[r.NIK] || {};
        log.push({ id: r.ID, jam: r.JamMasuk, keluar: r.JamKeluar, nama: r.Nama, nik: r.NIK, divisi: k.Divisi || '', jarak: num(r.Jarak),
          akurasi: num(r.Akurasi), metode: r.Metode, status: r.Status, telat: num(r.MenitTerlambat), foto: !!r.FotoMasuk, fotoPulang: !!r.FotoPulang });
      });
      h[4].sort(byNat('ID')).forEach(function (r) {
        if (log.some(function (x) { return x.nik === r.NIK; })) return;
        var k = byNik[r.NIK] || {}, x = km[r.NIK + '|' + tgl] || {};
        log.push({ id: r.ID, jam: r.JamMasuk, keluar: r.JamKeluar, nama: k.Nama || r.NIK, nik: r.NIK, divisi: k.Divisi || '', jarak: '', akurasi: '',
          metode: 'Fingerprint', status: x.telat ? 'Terlambat' : 'Valid', telat: x.telat || 0 });
      });
      log.sort(function (a, b) { return a.jam < b.jam ? 1 : -1; });
      var hadir = log.length, telat = log.filter(function (x) { return x.telat; }).length;
      var anomali = h[5].slice().reverse().filter(function (l) { return l.Aksi === 'ABSEN_DITOLAK' && String(l.Waktu).slice(0, 10) === tgl; })
        .map(function (l) { return { waktu: l.Waktu, email: l.User, nik: l.Tabel, detail: l.Detail }; });
      var out = { tanggal: tgl, total: kar.length, hadir: hadir, tepat: hadir - telat, terlambat: telat,
        cuti: kar.filter(function (k) { return cm[k.NIK] && cm[k.NIK][tgl]; }).length,
        belum: kar.filter(function (k) { return !km[k.NIK + '|' + tgl] && !(cm[k.NIK] && cm[k.NIK][tgl]); }).map(function (k) { return { nama: k.Nama, nik: k.NIK, divisi: k.Divisi }; }),
        anomali: anomali, log: log, menitTelat: log.reduce(function (s, x) { return s + x.telat; }, 0), cfg: cfgAbsen(S, null) };
      if (h[6]) { out.qrHarian = h[6].qrHarian; out.kioskSeed = h[6].kioskSeed; out.ymd = h[6].ymd; }
      return ok(out);
    },
    lokasiList: async function (d, u, S) {
      var rows = await all('Karyawan');
      return ok({ kantor: lokasiKerja(S, null), aktif: set_(S, 'LOKASI_PER_PEGAWAI') !== 'TIDAK', mode: modeSinkron(S),
        rows: rows.sort(byNat('ID')).filter(ikutAbsen).map(function (k) { return lokasiBaris(S, k); }) });
    },
    settingsGet: async function () {
      var rows = await one(sb.from('Pengaturan_Sistem').select('Kunci,Nilai')), m = {};
      rows.forEach(function (r) { m[r.Kunci] = String(r.Nilai); });
      return ok({ nilai: SETTING_SEED.filter(function (x) { return x[0] !== 'NOTIF_MATRIKS'; })
        .map(function (x) { return { kunci: x[0], nilai: m[x[0]] !== undefined ? m[x[0]] : x[1], ket: x[2] }; }), triggers: [] });
    },
    resetInfo: async function () {
      var G = { absensi: ['Absensi_QR', 'Absensi_Fingerprint'], cuti: ['Cuti_Izin'], payroll: ['Payroll'], kpi: ['KPI_Performa'], dokumen: ['Dokumen_Arsip'], rekrutmen: ['Kandidat_Rekrutmen', 'Leads_Database', 'Lowongan'],
        komunikasi: ['AntrianNotif', 'BlastWA', 'CRM_Interaksi', 'CRM_Kontak'], surat: ['DE_Dokumen', 'DE_Persetujuan', 'DE_Antrean', 'DE_Nomor'], log: ['Log_Aktivitas', 'Log_Backup'] };
      var tabel = [].concat.apply([], Object.keys(G).map(function (g) { return G[g]; }));
      var hit = await Promise.all(tabel.map(function (t) { return sb.from(t).select('*', { count: 'exact', head: true }).then(function (r) { return r.error ? 0 : (r.count || 0); }); }));
      var n = {}; tabel.forEach(function (t, i) { n[t] = hit[i]; });
      var grup = {}; Object.keys(G).forEach(function (g) { grup[g] = G[g].reduce(function (s, t) { return s + n[t]; }, 0); });
      var kar = await all('Karyawan', 'ID,Role'), adm = kar.filter(function (k) { return normRole(k.Role) !== ROLES.EMP; }).length;
      return ok({ grup: grup, karyawan: { total: kar.length, admin: adm, pegawai: kar.length - adm } });
    },
    aksesList: async function () {
      var rows = await all('Karyawan', 'ID,NIK,Nama,Email,Role,Status,Jabatan,StatusKerja');
      return ok(rows.sort(byNat('ID')).filter(function (k) { return normRole(k.Role) !== ROLES.EMP; }).map(function (k) {
        return { ID: k.ID, NIK: k.NIK, Nama: k.Nama, Email: k.Email, Role: normRole(k.Role), Status: k.Status, Jabatan: k.Jabatan, akunAdmin: k.StatusKerja === AKUN_ADMIN };
      }));
    },
    kandidatDetail: async function (d) {
      if (d.berkas) return await apiGas('kandidatDetail', d);                 // unduh CV/lampiran → Google Drive
      var k = (await one(sb.from('Kandidat_Rekrutmen').select('*').eq('ID', d.id || '')))[0];
      if (!k) return fail('Kandidat tidak ditemukan.');
      var o = kandidatRingkas(k); o.linkedin = k.LinkedIn; o.jawaban = jsonOr(k.Jawaban, {}); o.catatan = k.Catatan; o.kode = k.KodeLamaran; o.lampiran = !!k.LampiranID;
      return ok(o);
    },
    'notif.queue': async function (d) {
      var rows = (await one(sb.from('AntrianNotif').select('*').order('DibuatPada', { ascending: false }).limit(1000))).reverse(), ring = { Antri: 0, Terkirim: 0, Gagal: 0, Batal: 0 };
      rows.forEach(function (r) { ring[r.Status] = (ring[r.Status] || 0) + 1; });
      rows = rows.filter(function (r) { return (!d.status || r.Status === d.status) && (!d.kanal || r.Kanal === d.kanal) && (!d.blastId || r.BlastID === d.blastId); });
      return ok({ ringkas: ring, rows: rows.reverse().slice(0, 300).map(function (r) { r.Pesan = String(r.Pesan).slice(0, 160); return r; }) });
    },
    'wa.blastList': async function () {
      var rows = await all('BlastWA', '*', null, 'BlastID');
      return ok(rows.sort(byNat('BlastID')).slice(-100).reverse().map(function (b) {
        var t = num(b.Total) || 1, o = copy(b);
        o.persen = Math.round((num(b.Terkirim) + num(b.Gagal)) / t * 100); o.sisa = Math.max(0, num(b.Total) - num(b.Terkirim) - num(b.Gagal)); return o;
      }));
    },
    'crm.list': async function (d, u, S) {
      var semua = await kontakAktif(), dup = petaDuplikat(semua), q = lower(d.cari);
      var rows = semua.filter(function (k) {
        if (d.segmen && k.Segmen !== d.segmen) return false;
        if (d.sumber && k.Sumber !== d.sumber) return false;
        if (d.tag && String(k.Tag).split(',').map(function (x) { return x.trim(); }).indexOf(d.tag) < 0) return false;
        if (d.statusWA === 'belum' ? !!k.StatusWA : (d.statusWA && k.StatusWA !== d.statusWA)) return false;
        if (d.emailValid && k.EmailValid !== d.emailValid) return false;
        if (d.optOut && (k.OptOut === 'YA') !== (d.optOut === 'YA')) return false;
        if (d.duplikat && !dup[k.KontakID]) return false;
        if (d.masalah && hpValid(k.NoWA) && k.EmailValid === 'YA') return false;
        if (q && (lower(k.Nama) + ' ' + lower(k.Email) + ' ' + hp08(k.NoWA)).indexOf(q) < 0) return false;
        return true;
      });
      var facet = { segmen: {}, statusWA: {} };
      semua.forEach(function (k) { facet.segmen[k.Segmen] = (facet.segmen[k.Segmen] || 0) + 1; var s = k.StatusWA || 'Belum dicek'; facet.statusWA[s] = (facet.statusWA[s] || 0) + 1; });
      var per = Math.min(200, num(d.per) || 50), hal = Math.max(1, num(d.halaman) || 1);
      return ok({ rows: rows.slice((hal - 1) * per, hal * per).map(function (k) { return kontakRingkas(k, dup[k.KontakID]); }), total: rows.length, halaman: hal, per: per,
        facet: facet, tags: Object.keys(semua.reduce(function (o, k) { String(k.Tag).split(',').forEach(function (t) { t = t.trim(); if (t) o[t] = 1; }); return o; }, {})),
        sinkron: Number(S.CRM_SYNC_TERAKHIR || 0) });
    },
    'crm.stats': async function () {
      var semua = await kontakAktif(), dup = petaDuplikat(semua), minggu = addDays(today(), -7), bulan = new Date(Date.now() - 30 * 864e5).toISOString();
      var s = { total: semua.length, waValid: 0, terdaftarWA: 0, emailValid: 0, belumCek: 0, optOut: 0, duplikat: Object.keys(dup).length, tidakBisa: 0, baru7: 0, dihubungi30: 0, segmen: {} };
      semua.forEach(function (k) {
        var wv = hpValid(k.NoWA), ev = k.EmailValid === 'YA';
        if (wv) s.waValid++; if (k.StatusWA === 'Terdaftar') s.terdaftarWA++; if (ev) s.emailValid++;
        if (wv && !k.StatusWA) s.belumCek++; if (k.OptOut === 'YA') s.optOut++; if (!wv && !ev) s.tidakBisa++;
        if (String(k.DibuatPada).slice(0, 10) >= minggu) s.baru7++; if (k.TerakhirDihubungi && k.TerakhirDihubungi >= bulan) s.dihubungi30++;
        s.segmen[k.Segmen] = (s.segmen[k.Segmen] || 0) + 1;
      });
      return ok(s);
    },
    'de.pejabatList': async function () {
      var r = await sb.rpc('de_pejabat_publik'); if (r.error) throw r.error; return ok(r.data || []);
    },
    'de.templateList': async function () {
      var h = await Promise.all([all('DE_Template', '*', null, 'id'), sb.rpc('de_pejabat_publik')]);
      if (h[1].error) throw h[1].error;
      return ok({ templates: h[0].sort(byNat('id')).map(templatePublik), pejabat: (h[1].data || []).filter(function (p) { return p.aktif; }) });
    },
    'de.dokumenList': async function (d) {
      var h = await Promise.all([all('DE_Template', '*', null, 'id'), all('DE_Dokumen', '*', function (q) {
        if (d.status) q = q.eq('status', d.status); if (d.templateId) q = q.eq('templateId', d.templateId); return q;
      }, 'id')]), tpl = {};
      h[0].forEach(function (t) { tpl[t.id] = t; });
      return ok(h[1].sort(byNat('id')).filter(function (x) { return d.termasukSlip || !/^PAY-/.test(x.refId || ''); })
        .sort(desc('dibuat')).slice(0, 300).map(function (x) { return dokPublik(x, tpl[x.templateId]); }));
    },
    'de.massalStatus': async function (d) {
      var q = (await all('DE_Antrean', 'jobId,jenis,sumber,status', function (qq) { return qq.eq('jenis', 'massal'); }, 'jobId')).sort(byNat('jobId'))
        .filter(function (j) { return !d.batch || jsonOr(j.sumber, {}).batch === d.batch; }), per = {};
      q.forEach(function (j) { var b = jsonOr(j.sumber, {}).batch; per[b] = per[b] || { batch: b, total: 0, selesai: 0, gagal: 0 }; per[b].total++; if (j.status === 'SELESAI') per[b].selesai++; if (j.status === 'GAGAL') per[b].gagal++; });
      return ok(Object.keys(per).map(function (k) { return per[k]; }).reverse().slice(0, 20));
    }
  };

  /* --- helper CRM & Doc Engine (port dari CRM.gs / DocEngine.gs) --- */
  async function kontakAktif() { return (await all('CRM_Kontak', '*', null, 'KontakID')).sort(byNat('KontakID')).filter(function (k) { return String(k.Tag).indexOf('merged→') < 0; }); }
  function petaDuplikat(rows) {
    var byWa = {}, byEm = {}, dup = {};
    rows.forEach(function (k) {
      if (hpValid(k.NoWA)) (byWa[hp08(k.NoWA)] = byWa[hp08(k.NoWA)] || []).push(k.KontakID);
      if (emailValid(k.Email)) (byEm[lower(k.Email)] = byEm[lower(k.Email)] || []).push(k.KontakID);
    });
    [byWa, byEm].forEach(function (m) { Object.keys(m).forEach(function (x) { if (m[x].length > 1) m[x].forEach(function (id) { dup[id] = x; }); }); });
    return dup;
  }
  function kontakRingkas(k, dup) {
    return { id: k.KontakID, nama: k.Nama, email: k.Email, wa: hp08(k.NoWA), segmen: k.Segmen, sumber: k.Sumber, refId: k.RefID, tag: k.Tag, statusWA: k.StatusWA,
      emailValid: k.EmailValid, optOut: k.OptOut === 'YA', jumlahPesan: num(k.JumlahPesan), terakhir: k.TerakhirDihubungi, info: jsonOr(k.Info, {}), duplikat: !!dup };
  }
  function templatePublik(t) {
    return { id: t.id, kode: t.kode, nama: t.nama, modul: t.modul, engine: t.engine, fileId: t.fileId, url: t.fileId ? 'https://drive.google.com/open?id=' + t.fileId : '',
      bidang: jsonOr(t.bidang, []), slot: jsonOr(t.slotTtd, []), keluaran: String(t.keluaran || 'pdf').split(',').filter(String), qrPerPenandatangan: t.qrPerPenandatangan === 'YA',
      versi: num(t.versi), aktif: t.aktif === 'YA', diperbarui: t.diperbarui };
  }
  function dokPublik(x, tpl) {
    return { id: x.id, templateId: x.templateId, template: tpl ? tpl.nama : '', judul: x.judul, nomor: x.nomor, status: x.status, isian: jsonOr(x.dataIsian, {}),
      penandatangan: jsonOr(x.penandatangan, []), kode: x.kodeVerifikasi, berkas: jsonOr(x.berkas, {}), dibuat: x.dibuat, terbit: x.terbit, oleh: x.oleh, refId: x.refId };
  }

  /* ==========================================================================
   * 5. APPS SCRIPT (semua aksi tulis + berkas Drive + PDF + notifikasi)
   * ======================================================================== */
  async function apiGas(action, data, reqId) {
    if (!CFG.GAS_URL) return fail('GAS_URL belum diisi di js/config.js. Menyimpan data & berkas memerlukan Apps Script.');
    var token = '';
    if (!PUBLIC[action]) { var s = await getSession(); if (!s) return sesiHabis(); token = s.access_token; }
    try {
      var res = await fetch(CFG.GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: token, reqId: reqId || '', data: data || {} }) });
      var text = await res.text();
      try { return JSON.parse(text); }
      catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429, message: 'Apps Script membalas HTTP ' + res.status + ' (bukan JSON). Pastikan URL /exec benar & akses deployment "Anyone".' }; }
    } catch (err) {
      return { success: false, network: true, retryable: true, message: 'Koneksi ke Apps Script terputus. Periksa internet Anda.' };
    }
  }

  /* ==========================================================================
   * 6. ROUTER — dipanggil core.js
   * ======================================================================== */
  async function route(action, data, reqId) {
    data = data || {};
    try {
      if (action === 'login') {
        _loginBerjalan = true;
        try {
          var lg = await loginWithIdToken(data.credential);
          if (!lg.success) return lg;
          var boot = await buildBootstrap();
          if (!boot.success) { if (boot.data && boot.data.code === 'NOT_REGISTERED') await signOut(); return boot; }
          var meta = (lg.data && lg.data.user && lg.data.user.user_metadata) || {};
          return ok({ token: 'supabase-session', foto: meta.avatar_url || meta.picture || '', boot: boot.data });
        } finally { setTimeout(function () { _loginBerjalan = false; }, 1500); }
      }
      if (action === 'logout') { await signOut(); return ok(null, 'Sampai jumpa.'); }
      if (action === 'bootstrap') return await buildBootstrap();
      if (action === 'batch') {
        var calls = (data.calls || []).slice(0, 10), outs = await Promise.all(calls.map(function (c) { return route(c.action, c.data || {}); })), o = {};
        calls.forEach(function (c, i) { o[c.action] = outs[i]; });
        return ok(o);
      }
      var fn = READ[action];
      if (fn) {
        if (PUBLIC[action]) return await fn(data);
        var s = await getSession(); if (!s) return sesiHabis();
        var u = await meAktif();
        if (!u) return fail('Akun Anda tidak aktif lagi. Hubungi HRD.', { code: 'AUTH' });
        if (HRD_ONLY.test(action) && !isHrdRole(normRole(u.Role))) return fail('Anda tidak memiliki izin untuk aksi ini.', { code: 'FORBIDDEN' });
        if (SA_ONLY.test(action) && normRole(u.Role) !== ROLES.SA) return fail('Anda tidak memiliki izin untuk aksi ini.', { code: 'FORBIDDEN' });
        return await fn(data, u, await settings());
      }
      var r = await apiGas(action, data, reqId);
      if (r && r.success) { _set.t = 0; if (/^(karyawan|settings|notif\.config|akses|lokasi|resetData)/.test(action)) _me.t = 0; if ((action === 'settingsSave' && data.rotasiQR) || action === 'resetData') lupakanQr(); }
      return r;
    } catch (e) { return errDb(e); }
  }

  window.SB = {
    client: sb,
    loginGoogle: loginGoogle, loginWithIdToken: loginWithIdToken, getSession: getSession, signOut: signOut,
    onAuthChange: onAuthChange, buildBootstrap: buildBootstrap,
    route: route, apiGas: apiGas, apiDrive: apiGas,
    isDirect: function (a) { return !!READ[a]; },
    myEmail: myEmail, today: today
  };
})(typeof window !== 'undefined' ? window : globalThis);
