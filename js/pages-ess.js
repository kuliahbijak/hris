/* ============================================================================
 * SIM HRD — pages-ess.js  (Employee Self-Service)
 * Beranda · Absensi QR + Geofence · Cuti & Izin · Slip Gaji · Dokumen · Profil · Persetujuan Dokumen
 * ========================================================================== */
'use strict';
function haversine(a, b, c, d) { var R = 6371000, t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t, h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) * Math.sin(y / 2); return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))); }
function toMin(hm) { var p = String(hm || '0:0').split(':'); return +p[0] * 60 + +(p[1] || 0); }
function riwayatRows(rows, cfg) {
  return rows.map(function (h) {
    var st = h.telat ? pill('Terlambat', 'Terlambat (+' + h.telat + 'm)') : pill('Valid', 'Hadir Valid');
    return '<tr><td><b>' + tglHari(h.tanggal) + '</b>' + (h.tanggal === ymd() ? '<span class="t2 blue-t strong">HARI INI</span>' : '') + '</td><td class="n mono ' + (h.telat ? 'warn-t' : 'ok-t') + '">' + esc(h.masuk || '-') + '</td><td class="n mono">' + esc(h.keluar || '—') + '</td>' +
      '<td><span class="row small">' + ic(/Finger/.test(h.sumber) ? 'fingerprint' : 'scan-line', 'ic-sm') + esc(h.sumber || '-') + (h.jarak !== '' && h.jarak != null ? ' · ' + h.jarak + ' m' : '') + '</span></td><td>' + st + '</td></tr>';
  }).join('');
}

/* ---------------------------------------------------------------- BERANDA ESS */
registerPage('beranda', {
  title: 'Beranda', menu: 'beranda',
  template: function () { return '<div id="bHead"></div><div class="grid g-4" id="bStats"></div><div class="grid g-main mt-16"><div class="stack" id="bKiri"></div><div class="stack" id="bKanan"></div></div>'; },
  show: function (el) {
    var b = App.boot, me = b.me, e = b.ess || {}, cfg = b.cfg;
    renderBeranda(el, b);
    refreshBoot().then(function (r) { if (r.success && App.cur === 'beranda') renderBeranda(el, App.boot); });
  }
});
function renderBeranda(el, b) {
  var me = b.me, e = b.ess || {}, cfg = b.cfg, hi = e.hariIni, kpi = (e.kpi || [])[0], c = e.cuti || { sisa: 0, kuota: 12 };
  $('#bHead', el).innerHTML = pageHead({ crumbs: ['Beranda', 'Dashboard Karyawan'], title: esc(sapa()) + ', ' + esc(me.nama),
    sub: '<span class="chip blue">' + ic('briefcase', 'ic-sm') + esc(me.jabatan || '-') + ' • ' + esc(me.divisi || '-') + ' <b class="mono" style="margin-left:6px">NIK: ' + esc(me.nik) + '</b></span>',
    actions: '<div class="card tint hide-m" style="padding:8px 14px"><div class="row">' + ic('calendar', 'blue-t') + '<div><div class="small muted">Hari & Tanggal</div><b>' + tglHari(ymd()) + '</b></div></div></div>' +
      (cfg.modulQR || cfg.modulSelfie ? '<a class="btn btn-primary" style="height:48px" href="#/absensi">' + ic('scan-line') + (hi && hi.masuk && !hi.keluar ? 'Presensi Pulang' : hi && hi.keluar ? 'Lihat Absensi' : 'Presensi Masuk') + '</a>' : '') });
  $('#bStats', el).innerHTML =
    stat({ acc: 'navy', label: 'Status Kehadiran Hari Ini', icon: 'shield-check', val: hi ? esc(hi.masuk) : '—', unit: hi ? 'WIB' : '', meta: hi ? (hi.telat ? pill('Terlambat', 'Terlambat ' + hi.telat + 'm') : pill('Valid', 'Valid' + (hi.jarak !== '' ? ' (Geofence)' : ''))) + '<span>Pulang ' + esc(hi.keluar || cfg.jamPulang) + '</span>' : '<span>Belum presensi</span><span class="mono">Masuk ' + esc(cfg.jamMasuk) + '</span>' }) +
    stat({ acc: 'navy', label: 'Sisa Cuti Tahunan', icon: 'calendar-days', val: c.sisa, unit: '/ ' + c.kuota + ' Hari', bar: c.kuota ? c.sisa / c.kuota * 100 : 0, meta: '<span>Tersedia ' + Math.round(c.kuota ? c.sisa / c.kuota * 100 : 0) + '%</span><span>s/d 31 Des ' + new Date().getFullYear() + '</span>', go: 'cuti' }) +
    stat({ acc: 'amber', label: 'Pengajuan Cuti Berjalan', icon: 'calendar-clock', val: (e.cutiBerjalan || []).length, badge: (e.cutiBerjalan || []).length ? pill('Menunggu', 'Menunggu HRD') : '', meta: (e.cutiBerjalan || [])[0] ? '<span>' + esc(e.cutiBerjalan[0].Jenis) + ' (' + tgl(e.cutiBerjalan[0].TglMulai) + ')</span><a href="#/cuti">Cek Detail →</a>' : '<span>Tidak ada pengajuan aktif</span><a href="#/cuti">Ajukan →</a>' }) +
    stat({ acc: 'blue', label: 'Skor KPI Terakhir', icon: 'award', val: kpi ? kpi.skor : '—', unit: kpi ? (kpi.skor >= 90 ? 'Grade A+' : kpi.skor >= 80 ? 'Grade A' : kpi.skor >= 70 ? 'Grade B' : 'Grade C') : '', meta: kpi ? '<span>Evaluasi ' + esc(kpi.periode) + '</span><span class="muted">' + esc(kpi.reviewer || '') + '</span>' : '<span>Belum ada penilaian</span>' });
  goClick($('#bStats', el));
  $('#bKiri', el).innerHTML = '<div class="card"><div class="card-h"><div><h3>' + ic('history') + 'Riwayat Kehadiran 7 Hari Terakhir</h3><p class="sub">Log validasi jam kedatangan, kepulangan, dan metode presensi</p></div><a href="#/absensi" class="small strong">Lihat Semua →</a></div>' +
    '<div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th class="n">Jam Masuk</th><th class="n">Jam Pulang</th><th>Lokasi / Metode</th><th>Status</th></tr></thead><tbody>' +
    ((e.riwayat || []).length ? riwayatRows(e.riwayat, cfg) : '<tr><td colspan="5">' + empty('Belum ada riwayat presensi.', 'calendar-x') + '</td></tr>') + '</tbody></table></div></div></div>' +
    (e.kpi && e.kpi.length ? '<div class="card"><div class="card-h"><div><h3>' + ic('trending-up') + 'Performa & KPI ' + esc(kpi.periode) + '</h3><p class="sub">Pencapaian indikator kinerja berdasarkan penilaian HRD</p></div><span class="pill ok">Status: ' + (kpi.skor >= 80 ? 'On-Track' : 'Perlu Perhatian') + '</span></div><div class="card-b">' +
      '<div class="grid g-3">' + (kpi.indikator || []).slice(0, 3).map(function (i) { return '<div class="card tint"><div class="card-b tight"><div class="row between"><b class="small">' + esc(i.nama) + '</b><b class="blue-t">' + i.skor + '%</b></div><div class="small muted" style="min-height:32px">' + esc(i.target ? 'Target: ' + i.target : '') + '</div><div class="progress mt-8"><i style="width:' + Math.min(100, i.skor) + '%"></i></div></div></div>'; }).join('') + '</div>' +
      '<div class="grid g-2 mt-16"><div class="card tint"><div class="card-b tight"><div class="ov mb-8">Tren Performa</div>' + chartBars(e.kpi.slice().reverse().map(function (k, i, a) { return { label: k.periode.replace(/^\d{2}/, ''), values: { s: k.skor }, hl: i === a.length - 1 }; }), { keys: [{ k: 's', color: '#2563EB', label: 'Skor' }], h: 150, max: 100 }) + '</div></div>' +
      '<div class="card tint"><div class="card-b tight"><div class="ov mb-8">Catatan Reviewer</div><p style="margin:0;font-style:italic">"' + esc(kpi.catatan || 'Belum ada catatan.') + '"</p><div class="small blue-t mt-8">— ' + esc(kpi.reviewer || '') + '</div></div></div></div></div></div>' : '');
  $('#bKanan', el).innerHTML = '<div class="card"><div class="card-h"><div class="ov">Profil Ringkas Karyawan</div>' + pill(me.statusKerja || 'Aktif', me.statusKerja === 'Tetap' ? 'Karyawan Tetap' : 'Kontrak Aktif') + '</div><div class="card-b">' +
    '<div class="row gap-12">' + avatar(me.nama, 'lg') + '<div><div class="strong" style="font-size:16px">' + esc(me.nama) + '</div><div class="small muted">' + esc(me.jabatan || '') + '</div><div class="small blue-t mono">NIK: ' + esc(me.nik) + '</div></div></div>' +
    '<div class="mt-16"><div class="kvbox">' + ic('mail', 'ic-sm') + '<span class="muted">Akun Google</span><span class="grow right ellip">' + esc(me.email) + '</span></div><div class="kvbox">' + ic('phone', 'ic-sm') + '<span class="muted">Telepon</span><span class="grow right mono">' + esc(me.wa || '-') + '</span></div>' +
    '<div class="kvbox">' + ic('landmark', 'ic-sm') + '<span class="muted">Rekening</span><span class="grow right mono">' + esc((me.bank || '') + ' ' + (me.rekening || '-')) + '</span></div>' + (me.kontrakBerakhir ? '<div class="kvbox">' + ic('hourglass', 'ic-sm') + '<span class="muted">Masa Kontrak</span><span class="grow right">' + tgl(me.kontrakBerakhir) + '</span></div>' : '') + '</div></div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic('receipt') + 'Slip Gaji Terbaru</h3>' + (e.slip ? '<span class="chip mono">' + esc(e.slip.periode) + '</span>' : '') + '</div><div class="card-b">' +
    (e.slip ? '<div class="card tint"><div class="card-b tight"><div class="ov">Gaji Bersih Diterima (THP)</div><div style="font-size:28px;font-weight:700;margin:6px 0" class="num">' + rp(e.slip.bersih) + '</div>' + pill('Terbit', 'Slip Terbit') + '</div></div><a class="btn btn-primary btn-block mt-12" href="#/gaji">' + ic('download') + 'Lihat & Unduh Slip PDF</a>' : empty('Belum ada slip gaji terbit.', 'receipt')) + '</div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic('zap', 'blue-t') + 'Akses Cepat Karyawan</h3></div><div class="card-b col">' +
    [['cuti', 'calendar-plus', 'Ajukan Cuti & Izin Baru', 'Cuti tahunan, sakit, atau izin'], ['absensi', 'scan-line', 'Presensi QR', 'Absen masuk / pulang hari ini'], ['dokumen', 'file-up', 'Perbarui Dokumen', 'Upload KTP, NPWP, atau sertifikat']].map(function (a) { return '<a class="linkcard" href="#/' + a[0] + '"><span class="avatar" style="border-radius:6px;background:#fff">' + ic(a[1]) + '</span><div class="grow"><b>' + a[2] + '</b><div class="small muted">' + a[3] + '</div></div>' + ic('arrow-right', 'muted') + '</a>'; }).join('') + '</div></div>';
}

/* ---------------------------------------------------------------- ABSENSI (QR + Geofence) */
var Absen = { pos: null, watch: null, scanner: null, offset: 0, info: null, clock: null, riwayat: [] };
registerPage('absensi', {
  title: 'Absensi', menu: 'absensi',
  template: function () {
    return '<div id="aHead"></div><div id="aBanner"></div><div class="grid g-main mt-16"><div class="stack">' +
      '<div class="card" style="border-left:3px solid var(--blue)"><div class="card-b row between wrap"><div><div class="small muted row">' + ic('calendar', 'ic-sm') + '<span id="aTgl"></span></div><div class="row" style="align-items:baseline"><span class="clock" id="aJam">--:--:--</span><b>WIB</b></div></div><div class="right"><span class="pill info dot">Waktu Server Tersinkron</span><div class="small muted mt-8">Jam mengikuti server Google Apps Script</div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('satellite-dish') + 'Validasi Radius Geofence</h3><span id="aGeoPill"></span></div><div class="card-b"><div id="aLok" class="mb-12"></div><div class="grid g-2"><div class="card tint"><div class="card-b tight"><div class="small muted" id="aJarakT">Jarak ke Titik Kantor</div><div class="row" style="align-items:baseline"><span style="font-size:30px;font-weight:700" class="num" id="aJarak">—</span><span>Meter</span></div><div class="small muted" id="aAmbang"></div></div></div>' +
      '<div class="card tint"><div class="card-b tight"><div class="small muted">Koordinat Terdeteksi (GPS)</div><div class="strong mono mt-8" id="aKoord">Menunggu izin lokasi…</div><div class="small blue-t mt-8" id="aAkurasi"></div></div></div></div><div class="radar mt-12" id="aRadar"></div></div></div>' +
      '<div class="card" id="aScanCard"><div class="card-h"><h3>' + ic('scan-qr-code') + 'Kamera Pemindai QR Presensi</h3><span class="pill info" id="aCamPill">Kamera siap</span></div><div class="card-b">' +
      '<div class="scanner" id="aScanner"><div class="center col" style="align-items:center">' + ic('qr-code', 'ic-lg') + '<span class="small">Tekan tombol di bawah untuk membuka kamera</span></div><div class="frame"><i></i><i></i><i></i><i></i></div><div class="cap">Arahkan kamera ke QR Code di kantor</div></div>' +
      '<div class="grid g-2 mt-12"><button class="btn btn-primary" style="height:52px;font-size:15px" id="aMasuk">' + ic('camera') + 'Scan QR Absensi Masuk</button><button class="btn btn-sec" style="height:52px" id="aPulang" disabled>' + ic('log-out') + '<span>Absen Pulang</span></button></div>' +
      '<div class="row between mt-8 wrap"><button class="btn btn-ghost btn-sm" id="aManual">' + ic('keyboard', 'ic-sm') + 'Masukkan kode QR manual</button><button class="btn btn-ghost btn-sm" id="aStop" hidden>' + ic('circle-stop', 'ic-sm') + 'Tutup kamera</button>' + (DEMO ? '<button class="btn btn-soft btn-sm" id="aSim">' + ic('flask-conical', 'ic-sm') + 'Simulasi scan (demo)</button>' : '') + '</div></div></div>' +
      '<div class="card" id="aSelfieCard" hidden><div class="card-h"><h3>' + ic('camera') + 'Absen dengan Selfie + GPS</h3><span class="pill info" id="aSfPill">Kamera depan</span></div><div class="card-b">' +
      '<p class="small muted" style="margin:0 0 12px">Ambil foto wajah Anda di lokasi kerja. Foto disimpan privat untuk verifikasi HRD; lokasi GPS tetap divalidasi radius geofence.</p>' +
      '<div class="grid g-2"><button class="btn btn-primary" style="height:52px;font-size:15px" id="aSfMasuk">' + ic('camera') + 'Selfie Absen Masuk</button><button class="btn btn-sec" style="height:52px" id="aSfPulang" disabled>' + ic('log-out') + '<span>Selfie Absen Pulang</span></button></div></div></div></div>' +
      '<div class="stack"><div class="card"><div class="card-h"><div class="ov">Diagnostik Keamanan & Sensor</div></div><div class="card-b grid g-3" style="gap:8px" id="aDiag"></div></div>' +
      '<div class="card"><div class="card-h"><div class="ov" id="aBlnT">Ringkasan Bulan Ini</div></div><div class="card-b grid g-2" style="gap:8px" id="aBulan">' + skel(2, 60) + '</div></div>' +
      '<div><div class="ov mb-8">Pratinjau Status Validasi</div><div id="aLast">' + '<div class="valid-item warn">' + ic('info', 'warn-t') + '<div class="small">Belum ada percobaan presensi di sesi ini.</div></div>' + '</div></div>' +
      '<div class="card tint"><div class="card-b"><div class="strong row">' + ic('headset', 'blue-t') + 'Kendala Perangkat / Kamera?</div><p class="small muted" style="margin:6px 0 0">Jika pemindai bermasalah, gunakan "Masukkan kode QR manual" (kode tercetak di bawah QR) atau hubungi Staff HRD untuk penyesuaian presensi.</p></div></div></div></div>' +
      '<div class="card mt-16"><div class="card-h"><h3>' + ic('history') + 'Log Riwayat Presensi</h3><span class="chip" id="aBlnChip"></span></div><div class="card-b flush" id="aLog"></div></div>';
  },
  init: function (el) {
    $('#aMasuk', el).onclick = function () { mulaiScan(el, 'masuk'); };
    $('#aPulang', el).onclick = function () { mulaiScan(el, 'pulang'); };
    $('#aStop', el).onclick = function () { stopScan(el); };
    $('#aSfMasuk', el).onclick = function () { absenSelfie(el); };
    $('#aSfPulang', el).onclick = function () { absenSelfie(el); };
    $('#aLok', el).addEventListener('click', function (e) {
      var b = e.target.closest('[data-lok]'); if (!b) return;
      if (b.dataset.lok === 'sinkron') sinkronLokasi(el, b);
      else if (b.dataset.lok === 'peta') petaLokasiSaya();
      else if (b.dataset.lok === 'usul') usulLokasiKerja(el);
    });
    $('#aManual', el).onclick = async function () { var k = await promptBox('Kode QR Manual', 'Ketik kode yang tercetak di bawah QR (mis. D-20260930-xxxxxxxxxx)', { ok: 'Kirim Presensi', hint: 'Lokasi GPS tetap divalidasi.' }); if (k) kirimAbsen(el, k.trim()); };
    var sim = $('#aSim', el); if (sim) sim.onclick = function () { kirimAbsen(el, window.DemoAPI ? DemoAPI.tokenHariIni() : ''); };
    Absen.tbl = Table($('#aLog', el), { key: 'tanggal', per: 10, unit: 'catatan presensi', cols: [
      { k: 'tanggal', label: 'Tanggal', render: function (r) { return '<b>' + tgl(r.tanggal) + '</b>' + (r.tanggal === ymd() ? '<span class="t2 blue-t strong">HARI INI</span>' : ''); } },
      { k: 'masuk', label: 'Jam Masuk', cls: 'n', render: function (r) { return '<span class="mono ' + (r.telat ? 'bad-t' : 'ok-t') + ' strong">' + esc(r.masuk || '-') + ' WIB</span>'; } },
      { k: 'keluar', label: 'Jam Pulang', cls: 'n', render: function (r) { return r.keluar ? '<span class="mono">' + esc(r.keluar) + ' WIB</span>' : '<i class="muted">Belum Absen</i>'; } },
      { k: 'jarak', label: 'Jarak GPS', cls: 'n', render: function (r) { return r.jarak !== '' && r.jarak != null ? '<b class="mono">' + r.jarak + '</b> m' : '-'; } },
      { k: 'sumber', label: 'Metode', render: function (r) { return '<span class="row small">' + ic(/Finger/.test(r.sumber) ? 'fingerprint' : /Selfie/.test(r.sumber) ? 'camera' : 'scan-qr-code', 'ic-sm blue-t') + esc(r.sumber) + '</span>'; } },
      { k: 'telat', label: 'Status', render: function (r) { return r.telat ? pill('Terlambat', 'Terlambat (+' + r.telat + 'm)', false) : pill('Valid', 'Tepat Waktu', false); } }] });
  },
  show: function (el) {
    var cfg = Absen.cfg = (Absen.info && Absen.info.cfg) || App.boot.cfg;
    $('#aHead', el).innerHTML = pageHead({ crumbs: ['Beranda', 'Absensi', 'Presensi Harian & Validasi Lokasi'], title: 'Presensi Karyawan & Validasi Geolokasi',
      sub: 'Validasi kehadiran harian menggunakan pemindai QR Code dan lokasi satelit GPS kantor.',
      actions: '<button class="btn btn-sec" id="aPanduan">' + ic('circle-help', 'ic-sm') + 'Panduan Absensi</button><button class="btn btn-primary" id="aUnduh">' + ic('download', 'ic-sm') + 'Unduh Riwayat (.xlsx)</button>' });
    $('#aPanduan', el).onclick = function () { modal({ title: 'Panduan Absensi QR + GPS', body: '<ol style="margin:0;padding-left:18px;display:grid;gap:8px"><li>Izinkan akses <b>lokasi</b> dan <b>kamera</b> saat browser meminta.</li><li>Pastikan Anda berada dalam radius <b>' + cfg.radius + ' m</b> dari ' + esc(cfg.kantor.nama) + '. Aktifkan GPS/mode akurasi tinggi.</li><li>Tekan <b>Scan QR Absensi Masuk</b>, arahkan kamera ke QR yang terpasang di kantor (QR berganti otomatis setiap hari/20 detik di layar kios).</li>' + (cfg.modulSelfie ? '<li>Bisa juga <b>Absen dengan Selfie</b>: tekan tombol selfie, izinkan kamera depan, ambil foto wajah, lalu kirim.' + (cfg.selfieWajib ? ' <b>Selfie wajib</b> untuk setiap presensi.' : '') + '</li>' : '') + '<li>Lokasi kerja tidak sesuai? Tekan <b>Sinkronkan</b> untuk memperbarui GPS' + (cfg.sinkronLokasi !== 'TIDAK' ? ', atau <b>Atur dari Posisi Saya</b> untuk mengusulkan lokasi kerja baru' : '') + '.</li><li>Absen pulang tersedia mulai pukul <b>' + esc(cfg.jamPulang) + '</b>.</li><li>Toleransi keterlambatan <b>' + cfg.toleransi + ' menit</b> dari jam masuk ' + esc(cfg.jamMasuk) + '.</li></ol>' }); };
    $('#aUnduh', el).onclick = function () { exportXlsx('Riwayat_Absensi_' + App.boot.me.nik, { Absensi: Absen.riwayat.map(function (r) { return { Tanggal: r.tanggal, Masuk: r.masuk, Pulang: r.keluar, 'Terlambat (menit)': r.telat, Metode: r.sumber, 'Jarak (m)': r.jarak }; }) }); };
    $('#aBanner', el).innerHTML = '<div class="card dark"><div class="card-b row between wrap"><div class="row gap-12"><span class="avatar" style="border-radius:6px;background:#26314A;color:#fff">' + ic('calendar-clock') + '</span><div><div class="strong row">Jadwal Penugasan: Shift Reguler <span class="pill solid-blue">' + ([cfg.modulQR ? 'QR' : '', cfg.modulSelfie ? 'SELFIE' : ''].filter(Boolean).join(' + ') || 'FINGERPRINT') + (cfg.modulQR || cfg.modulSelfie ? ' AKTIF' : '') + '</span></div><div class="small muted row">' + ic('clock', 'ic-sm') + esc(cfg.jamMasuk) + ' - ' + esc(cfg.jamPulang) + ' WIB · ' + ic('building', 'ic-sm') + esc(cfg.kantor.nama) + '</div></div></div>' +
      '<div class="right"><div class="ov" style="color:#AEB6C8">Toleransi Kedatangan</div><b>Maks. ' + esc(tambahMenit(cfg.jamMasuk, cfg.toleransi)) + ' WIB</b></div></div></div>' + (cfg.modulQR || cfg.modulSelfie ? '' : '<div class="note warn mt-12">' + ic('info') + '<div>Absensi QR sedang dinonaktifkan HRD. Presensi Anda dicatat melalui mesin fingerprint kantor; riwayat tetap tampil di bawah.</div></div>');
    $('#aScanCard', el).hidden = !cfg.modulQR;
    $('#aSelfieCard', el).hidden = !cfg.modulSelfie;
    renderLokasiBar(el);
    mulaiLokasi(el);
    Absen.clock = setInterval(function () { var d = new Date(Date.now() + Absen.offset); $('#aJam', el).textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (x) { return String(x).padStart(2, '0'); }).join(':'); $('#aTgl', el).textContent = tglHari(d); cekTombol(el); }, 1000);
    muatAbsen(el);
  },
  hide: function () { stopScan(); if (Absen.watch != null) navigator.geolocation.clearWatch(Absen.watch); Absen.watch = null; clearInterval(Absen.clock); }
});
function tambahMenit(hm, m) { var t = toMin(hm) + (+m || 0); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
function muatAbsen(el, force) {
  return swr('absenInfo', 'absenInfo', {}, function (d) {
    Absen.info = d; Absen.offset = (d.serverTime || Date.now()) - Date.now(); Absen.riwayat = d.riwayat || [];
    if (d.cfg) { Absen.cfg = d.cfg; $('#aScanCard', el).hidden = !d.cfg.modulQR; $('#aSelfieCard', el).hidden = !d.cfg.modulSelfie; renderLokasiBar(el); perbaruiGeo(el); }
    Absen.tbl.set(d.riwayat || []);
    var b = d.bulan, bl = BULAN[new Date().getMonth()] + ' ' + new Date().getFullYear();
    $('#aBlnT', el).textContent = 'Ringkasan Bulan Ini (' + bl + ')'; $('#aBlnChip', el).textContent = 'Bulan: ' + bl;
    $('#aBulan', el).innerHTML = [['Hadir Tepat', b.tepat, 'Hari', b.hadir ? Math.round(b.tepat / b.hadir * 100) + '% kepatuhan' : '-', 'ok-t'], ['Terlambat', b.terlambat, 'Hari', 'Akumulasi +' + b.menitTelat + ' mnt', 'warn-t'], ['Cuti / Izin', b.cuti, 'Hari', 'Sisa cuti: ' + App.boot.ess.cuti.sisa + ' hari', ''], ['Rata-rata Masuk', b.rataMasuk, 'WIB', b.hadir + ' / ' + b.hariKerja + ' hari kerja', 'blue-t']]
      .map(function (x) { return '<div class="card tint"><div class="card-b tight"><div class="small muted">' + x[0] + '</div><div class="row" style="align-items:baseline"><b style="font-size:22px" class="num ' + x[4] + '">' + x[1] + '</b><span class="small">' + x[2] + '</span></div><div class="small ' + x[4] + '">' + x[3] + '</div></div></div>'; }).join('');
    cekTombol(el);
  }, { fresh: 30000, force: force });
}
function cekTombol(el) {
  var d = Absen.info; if (!d || !App.boot) return;
  var hi = d.hariIni, now = new Date(Date.now() + Absen.offset), menit = now.getHours() * 60 + now.getMinutes(), pul = toMin(d.cfg.jamPulang);
  var m = $('#aMasuk', el), p = $('#aPulang', el); if (!m) return;
  m.disabled = !!(hi && hi.masuk); m.innerHTML = hi && hi.masuk ? ic('circle-check') + 'Sudah Masuk ' + esc(hi.masuk) + ' WIB' : ic('camera') + 'Scan QR Absensi Masuk';
  p.disabled = !(hi && hi.masuk && !hi.keluar && menit >= pul);
  p.innerHTML = ic('log-out') + '<span>' + (hi && hi.keluar ? 'Pulang ' + esc(hi.keluar) + ' WIB' : 'Absen Pulang' + (menit < pul ? ' (Aktif ' + esc(d.cfg.jamPulang) + ')' : '')) + '</span>';
  p.className = 'btn ' + (p.disabled ? 'btn-sec' : 'btn-accent'); p.style.height = '52px';
  var sm = $('#aSfMasuk', el), sp = $('#aSfPulang', el); if (!sm) return;
  sm.disabled = !!(hi && hi.masuk); sm.innerHTML = hi && hi.masuk ? ic('circle-check') + 'Sudah Masuk ' + esc(hi.masuk) + ' WIB' : ic('camera') + 'Selfie Absen Masuk';
  sp.disabled = !(hi && hi.masuk && !hi.keluar);
  sp.innerHTML = ic('log-out') + '<span>' + (hi && hi.keluar ? 'Pulang ' + esc(hi.keluar) + ' WIB' : 'Selfie Absen Pulang' + (hi && hi.masuk && menit < pul ? ' (mulai ' + esc(d.cfg.jamPulang) + ')' : '')) + '</span>';
  sp.className = 'btn ' + (sp.disabled || menit < pul ? 'btn-sec' : 'btn-accent'); sp.style.height = '52px';
}
function cfgAbsenKini() { return Absen.cfg || (Absen.info && Absen.info.cfg) || App.boot.cfg; }
/** Hitung ulang jarak & status geofence dari posisi GPS terakhir terhadap lokasi kerja TERKINI. */
function perbaruiGeo(el) {
  var cfg = cfgAbsenKini(); if (!el || !$('#aAmbang', el)) return;
  $('#aAmbang', el).textContent = 'Ambang batas toleransi lokasi: ' + cfg.radius + ' m';
  $('#aJarakT', el).textContent = 'Jarak ke ' + (cfg.kantor.sumber === 'pegawai' ? 'Lokasi Kerja Anda' : 'Titik Kantor');
  if (!Absen.pos) return;
  var j = haversine(Absen.pos.lat, Absen.pos.lng, cfg.kantor.lat, cfg.kantor.lng), dalam = j - Math.min(Absen.pos.akurasi, 20) <= cfg.radius;
  $('#aJarak', el).textContent = j.toLocaleString('id-ID');
  $('#aKoord', el).textContent = Absen.pos.lat.toFixed(6) + ', ' + Absen.pos.lng.toFixed(6);
  $('#aAkurasi', el).innerHTML = ic('crosshair', 'ic-sm') + ' Akurasi satelit: ±' + Absen.pos.akurasi + ' m' + (Absen.pos.akurasi > 50 ? ' <span class="warn-t">(lemah — pindah ke area terbuka)</span>' : '');
  $('#aGeoPill', el).innerHTML = pill(dalam ? 'Valid' : 'Ditolak', dalam ? 'Di Dalam Radius (Maks ' + cfg.radius + 'm)' : 'Di Luar Radius');
  $('#aRadar', el).innerHTML = radarSvg(j, cfg.radius, dalam);
}
function renderLokasiBar(el) {
  var cfg = cfgAbsenKini(), k = cfg.kantor || {}, box = $('#aLok', el); if (!box) return;
  var usul = cfg.lokasiUsul, khusus = k.sumber === 'pegawai';
  box.innerHTML = '<div class="lok-bar"><span class="avatar" style="border-radius:8px;background:var(--blue-1);color:var(--blue)">' + ic(khusus ? 'map-pin' : 'building') + '</span><div class="grow"><div class="strong row" style="flex-wrap:wrap;gap:6px">' + esc(k.nama || 'Lokasi kantor') +
    '<span class="chip ' + (khusus ? 'blue' : '') + '">' + (khusus ? 'Lokasi kerja khusus Anda' : 'Lokasi kantor') + '</span></div><div class="small muted mono">' + (+k.lat || 0).toFixed(6) + ', ' + (+k.lng || 0).toFixed(6) + ' · radius ' + cfg.radius + ' m</div>' +
    (usul ? '<div class="small warn-t mt-8 row">' + ic('hourglass', 'ic-sm') + 'Usulan lokasi "' + esc(usul.nama) + '" menunggu persetujuan HRD</div>' : '') + '</div>' +
    '<div class="acts"><button class="btn btn-sec btn-sm" data-lok="sinkron" title="Ambil ulang GPS & konfigurasi lokasi terbaru">' + ic('refresh-cw', 'ic-sm') + 'Sinkronkan</button><button class="btn btn-ghost btn-sm" data-lok="peta">' + ic('map-pin', 'ic-sm') + 'Peta</button>' +
    (cfg.sinkronLokasi && cfg.sinkronLokasi !== 'TIDAK' ? '<button class="btn btn-soft btn-sm" data-lok="usul" title="Jadikan posisi perangkat saat ini sebagai lokasi kerja Anda">' + ic('locate-fixed', 'ic-sm') + 'Atur dari Posisi Saya</button>' : '') + '</div></div>';
}
/** Ambil GPS segar + konfigurasi lokasi terbaru dari server (memperbaiki geofence yang tidak sinkron). */
/** Hentikan sementara pemantau GPS halaman (mulai ulang dengan mulaiLokasi) agar pembacaan GPS baru benar-benar segar. */
function jedaLokasi() { if (Absen.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(Absen.watch); Absen.watch = null; }
async function sinkronLokasi(el, btn) {
  await withBusy(btn, async function () {
    var gps = null;
    jedaLokasi();
    try { gps = await gpsTerbaik(9000); Absen.pos = { lat: gps.lat, lng: gps.lng, akurasi: gps.acc }; diag(el, { lokasi: 'diizinkan' }); } catch (e) { toast(e.message, 'warn'); }
    mulaiLokasi(el);
    await muatAbsen(el, true);
    refreshBoot();
    perbaruiGeo(el);
    if (gps) toast('Lokasi tersinkron (akurasi ±' + gps.acc + ' m) terhadap ' + cfgAbsenKini().kantor.nama + '.', 'ok');
  });
}
async function petaLokasiSaya() {
  var cfg = cfgAbsenKini();
  modal({ title: 'Peta Lokasi Kerja', sub: cfg.kantor.nama + ' · radius ' + cfg.radius + ' m', noFocus: true, body: '<div id="pmPeta"></div><div class="small muted mt-8">Pin biru = lokasi kerja, lingkaran = batas geofence. Titik hijau = posisi perangkat Anda.</div>',
    onOpen: async function (m) { var p = await petaLokasi($('#pmPeta', m), { lat: cfg.kantor.lat, lng: cfg.kantor.lng, radius: cfg.radius, tinggi: 320, saya: Absen.pos ? { lat: Absen.pos.lat, lng: Absen.pos.lng, acc: Absen.pos.akurasi } : null }); if (p && !Absen.pos) gpsTerbaik(6000).then(function (g) { p.saya(g.lat, g.lng, g.acc); }).catch(function () { }); } });
}
/** Pegawai mengusulkan / menyinkronkan lokasi kerja berdasarkan GPS perangkat (peta). */
function usulLokasiKerja(el) {
  var cfg = cfgAbsenKini(), gps = null, peta = null, otomatis = cfg.sinkronLokasi === 'OTOMATIS';
  jedaLokasi();
  var m = modal({ title: 'Atur Lokasi Kerja dari Posisi Saya', sub: otomatis ? 'Geofence langsung mengikuti posisi ini' : 'Usulan akan ditinjau HRD sebelum berlaku', noFocus: true,
    body: '<div class="note small mb-12">' + ic('info') + '<div>Berdiri di lokasi kerja Anda (mis. kantor cabang / site proyek), aktifkan GPS akurasi tinggi, tunggu sampai akurasi ≤ 100 m.</div></div>' +
      '<div id="ulPeta"></div><div class="row between mt-8 wrap"><div class="small" id="ulInfo">' + ic('crosshair', 'ic-sm') + ' Mencari posisi GPS…</div><button class="btn btn-ghost btn-sm" id="ulUlang">' + ic('refresh-cw', 'ic-sm') + 'Ambil ulang GPS</button></div>' +
      '<div class="field mt-12"><label>Nama lokasi kerja</label><input class="input" id="ulNama" maxlength="80" placeholder="mis. Kantor Cabang Bekasi" value="' + esc(cfg.kantor.sumber === 'pegawai' ? cfg.kantor.nama : '') + '"></div>' +
      '<div class="field"><label>Catatan untuk HRD (opsional)</label><input class="input" id="ulCat" maxlength="200" placeholder="mis. Dipindah tugaskan ke site proyek mulai Senin"></div>',
    foot: [{ label: 'Batal', close: true }, { label: otomatis ? 'Simpan Lokasi Kerja' : 'Kirim Usulan', cls: 'btn-primary', act: async function (mm) {
      if (!gps) { toast('Posisi GPS belum didapat.', 'warn'); return false; }
      var r = await api('lokasiSinkron', { lat: gps.lat, lng: gps.lng, akurasi: gps.acc, nama: $('#ulNama', mm.el).value.trim(), catatan: $('#ulCat', mm.el).value.trim() });
      if (!r.success) { toast(r.message, 'bad'); return false; }
      toast(r.message, 'ok'); await muatAbsen(el, true); refreshBoot();
    } }],
    onOpen: async function (mel) {
      async function ambil() {
        var info = $('#ulInfo', mel); info.innerHTML = '<span class="spin"></span> Mencari posisi GPS…';
        try {
          gps = await gpsTerbaik(10000);
          info.innerHTML = ic('crosshair', 'ic-sm ' + (gps.acc <= 100 ? 'ok-t' : 'warn-t')) + ' <span class="mono">' + gps.lat.toFixed(6) + ', ' + gps.lng.toFixed(6) + '</span> · akurasi ±' + gps.acc + ' m' + (gps.acc > 100 ? ' <span class="warn-t">(terlalu lemah)</span>' : '');
          if (peta) { peta.set(gps.lat, gps.lng, cfg.radius); peta.saya(gps.lat, gps.lng, gps.acc); }
        } catch (e) { info.innerHTML = '<span class="bad-t">' + esc(e.message) + '</span>'; }
      }
      $('#ulUlang', mel).onclick = ambil;
      var gpsJalan = ambil();
      peta = await petaLokasi($('#ulPeta', mel), { lat: cfg.kantor.lat, lng: cfg.kantor.lng, radius: cfg.radius, tinggi: 260 });
      await gpsJalan; if (peta && gps) { peta.set(gps.lat, gps.lng, cfg.radius); peta.saya(gps.lat, gps.lng, gps.acc); }
    } });
  m.onClose = function () { if (el.isConnected && !$('.page[data-page="absensi"]').hidden) mulaiLokasi(el); };
  return m;
}
/** Absen menggunakan selfie + GPS (tanpa QR). */
async function absenSelfie(el) {
  if (!Absen.pos) {
    jedaLokasi();
    try { var g = await gpsTerbaik(8000); Absen.pos = { lat: g.lat, lng: g.lng, akurasi: g.acc }; perbaruiGeo(el); diag(el, { lokasi: 'diizinkan' }); }
    catch (e) { mulaiLokasi(el); return toast(e.message, 'warn'); }
    mulaiLokasi(el);
  }
  var hi = Absen.info && Absen.info.hariIni;
  var foto = await kameraSelfie(hi && hi.masuk ? 'Selfie Absen Pulang' : 'Selfie Absen Masuk');
  if (!foto) return;
  await kirimAbsen(el, '', hi && hi.masuk ? 'pulang' : 'masuk', { mode: 'selfie', selfie: foto });
}
function mulaiLokasi(el) {
  perbaruiGeo(el);
  diag(el, { lokasi: 'menunggu', kamera: 'siap' });
  if (!navigator.geolocation) { $('#aKoord', el).textContent = 'Perangkat tidak mendukung GPS'; diag(el, { lokasi: 'tidak didukung' }); return; }
  if (Absen.watch != null) return;
  Absen.watch = navigator.geolocation.watchPosition(function (p) {
    Absen.pos = { lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy) };
    gpsCatat(Absen.pos.lat, Absen.pos.lng, Absen.pos.akurasi);
    perbaruiGeo(el);
    diag(el, { lokasi: 'diizinkan' });
  }, function (err) {
    $('#aKoord', el).textContent = err.code === 1 ? 'Izin lokasi ditolak' : 'Lokasi tidak terbaca';
    $('#aGeoPill', el).innerHTML = pill('Ditolak', 'Lokasi belum aktif');
    diag(el, { lokasi: err.code === 1 ? 'ditolak' : 'gagal' });
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}
function radarSvg(jarak, radius, dalam) {
  var skala = Math.max(radius * 2.2, jarak * 1.25), r = 60 * radius / skala * 2, dx = Math.min(140, 60 * jarak / skala * 2);
  return '<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid meet"><circle cx="200" cy="75" r="' + Math.max(16, r).toFixed(1) + '" fill="rgba(37,99,235,.12)" stroke="#2563EB" stroke-dasharray="4 3"/><rect x="190" y="65" width="20" height="20" rx="4" fill="#141B2B"/><path d="M195 80v-8h10v8" stroke="#fff" stroke-width="1.5" fill="none"/>' +
    '<circle cx="' + (200 + dx).toFixed(1) + '" cy="68" r="7" fill="' + (dalam ? '#2563EB' : '#BA1A1A') + '" stroke="#fff" stroke-width="3"/><text x="' + (200 + dx).toFixed(1) + '" y="100" text-anchor="middle" style="font:600 11px Inter;fill:' + (dalam ? '#2563EB' : '#BA1A1A') + '">Anda (' + jarak + 'm)</text>' +
    '<text x="8" y="16" style="font:600 10.5px Inter;fill:#495057">Status Radar: ' + (dalam ? 'Dalam Geofence' : 'Luar Geofence') + '</text><text x="392" y="142" text-anchor="end" style="font:10.5px Inter;fill:#495057">Radius ' + radius + ' m</text></svg>';
}
function diag(el, o) {
  Absen.diag = Object.assign(Absen.diag || { lokasi: 'menunggu', kamera: 'siap' }, o);
  var d = Absen.diag, box = function (i, l, v, ok) { return '<div class="card tint center"><div class="card-b tight">' + ic(i, ok ? 'ok-t' : 'warn-t') + '<div class="small strong mt-8" style="justify-content:center">' + l + '</div><div class="small ' + (ok ? 'ok-t' : 'warn-t') + '">' + v + '</div></div></div>'; };
  $('#aDiag', el).innerHTML = box('map-pin', 'Izin Lokasi', d.lokasi, d.lokasi === 'diizinkan') + box('camera', 'Izin Kamera', d.kamera, d.kamera !== 'ditolak') + box('shield-check', 'Sesi Aman', 'Token HMAC', true);
}
async function mulaiScan(el, jenis) {
  if (!Absen.pos) { toast('Menunggu lokasi GPS… pastikan izin lokasi aktif.', 'warn'); mulaiLokasi(el); return; }
  var box = $('#aScanner', el);
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js');
    box.innerHTML = '<div id="qr-reader"></div><div class="frame"><i></i><i></i><i></i><i></i></div><div class="laser"></div><div class="tl">Kamera belakang</div><div class="cap">Arahkan kamera ke QR Code ' + (jenis === 'pulang' ? 'untuk absen PULANG' : 'di kantor') + '</div>';
    Absen.scanner = new Html5Qrcode('qr-reader', { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], experimentalFeatures: { useBarCodeDetectorIfSupported: true }, verbose: false });
    $('#aStop', el).hidden = false; $('#aCamPill', el).textContent = 'Memindai…';
    await Absen.scanner.start({ facingMode: 'environment' }, { fps: 12, qrbox: function (w, h) { var s = Math.floor(Math.min(w, h) * .68); return { width: s, height: s }; } },
      function (text) { if (Absen.sibuk) return; Absen.sibuk = true; stopScan(el); kirimAbsen(el, text, jenis).finally(function () { Absen.sibuk = false; }); }, function () { });
    diag(el, { kamera: 'diizinkan' });
  } catch (e) {
    diag(el, { kamera: /Permission|NotAllowed/i.test(String(e)) ? 'ditolak' : 'gagal' });
    stopScan(el);
    toast('Kamera tidak dapat dibuka: ' + (e.message || e) + '. Gunakan "Masukkan kode QR manual".', 'bad');
  }
}
function stopScan(el) {
  if (Absen.scanner) { try { Absen.scanner.stop().then(function () { Absen.scanner.clear(); }).catch(function () { }); } catch (e) { } Absen.scanner = null; }
  el = el || $('.page[data-page="absensi"]'); if (!el) return;
  var s = $('#aStop', el); if (s) s.hidden = true;
  var p = $('#aCamPill', el); if (p) p.textContent = 'Kamera siap';
}
async function kirimAbsen(el, token, jenis, extra) {
  extra = extra || {};
  if (!token && extra.mode !== 'selfie') return toast('Kode QR kosong.', 'warn');
  var pos = Absen.pos || {}, cfg = cfgAbsenKini();
  var data = Object.assign({ token: token, lat: pos.lat, lng: pos.lng, akurasi: pos.akurasi }, extra);
  if (extra.mode !== 'selfie' && cfg.selfieWajib && !data.selfie) {
    toast('Selfie wajib: ambil foto wajah untuk melengkapi presensi.', 'warn');
    var f = await kameraSelfie('Selfie Presensi (Wajib)'); if (!f) return; data.selfie = f;
  }
  var r = await api('absenScan', data);
  if (!r.success && r.data && r.data.code === 'SELFIE') {
    var f2 = await kameraSelfie('Selfie Presensi (Wajib)'); if (!f2) return; data.selfie = f2; r = await api('absenScan', data);
  }
  if (!r.success && r.data && r.data.code === 'BELUM_PULANG') {
    var alasan = await promptBox('Pulang Lebih Awal?', r.message + ' Bila ada keperluan mendesak, isi alasan untuk dicatat HRD.', { ok: 'Catat Pulang Lebih Awal', min: 5, area: true });
    if (!alasan) return;
    data.pulangCepat = true; data.alasan = alasan; r = await api('absenScan', data);
  }
  var last = $('#aLast', el);
  if (r.success) {
    toast(r.message, 'ok');
    last.innerHTML = '<div class="valid-item">' + ic('circle-check', 'ok-t') + '<div class="grow"><div class="row between"><b>Presensi ' + (r.data.jenis === 'pulang' ? 'Pulang' : 'Masuk') + ' Tercatat</b>' + pill(r.data.status === 'Terlambat' ? 'Terlambat' : 'Valid', r.data.status || 'Valid') + '</div><div class="small muted">' + esc(r.data.jam) + ' WIB • Jarak: ' + r.data.jarak + 'm • ' + esc(r.data.metode || 'Token QR valid') + (r.data.foto ? ' • Foto tersimpan' : '') + '</div></div></div>' + last.innerHTML;
    App.boot.ess.hariIni = r.data.jenis === 'masuk' ? { masuk: r.data.jam, keluar: '', telat: r.data.telat, jarak: r.data.jarak, sumber: r.data.metode || 'QR + GPS' } : Object.assign({}, App.boot.ess.hariIni, { keluar: r.data.jam });
    if (Absen.info) Absen.info.hariIni = r.data.jenis === 'masuk' ? Object.assign({}, Absen.info.hariIni, { masuk: r.data.jam, keluar: '' }) : Object.assign({}, Absen.info.hariIni, { keluar: r.data.jam });
    if (navigator.vibrate) navigator.vibrate(80);
    muatAbsen(el, true); refreshBoot();
  } else {
    var code = r.data && r.data.code;
    last.innerHTML = '<div class="valid-item bad">' + ic(code === 'LOKASI' ? 'map-pin-off' : 'shield-x', 'bad-t') + '<div class="grow"><div class="row between"><b>Gagal: ' + (code === 'LOKASI' ? 'Di Luar Jangkauan Lokasi Kerja' : code === 'TOKEN' ? 'Token QR Tidak Valid' : code === 'SELFIE' ? 'Foto Selfie Diperlukan' : 'Presensi Ditolak') + '</b>' + (code === 'LOKASI' ? '<span class="pill warn">' + r.data.jarak + ' Meter</span>' : '<span class="pill bad">Ditolak</span>') + '</div><div class="small muted">' + esc(r.message) + '</div></div></div>' + last.innerHTML;
    toast(r.message + (code === 'LOKASI' ? '\nTekan "Sinkronkan" untuk memperbarui lokasi.' : ''), 'bad');
  }
}

/* ---------------------------------------------------------------- CUTI & IZIN (ESS) */
registerPage('cuti', {
  title: 'Cuti & Izin', menu: 'cuti',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Cuti & Izin'], title: 'Cuti & Izin', sub: 'Ajukan cuti atau izin dan pantau sisa cuti tahunan Anda secara real-time.' }) +
      '<div class="grid g-4" id="cStat"></div><div class="grid g-main-l mt-16"><div class="card"><div class="card-h"><div><h3>' + ic('calendar-plus') + 'Ajukan Cuti / Izin Baru</h3><p class="sub">Persetujuan final oleh Super Admin HRD</p></div></div><div class="card-b"><form id="cForm" class="col gap-12" novalidate>' +
      '<div class="field"><label>Jenis Cuti <span class="req">*</span></label><select class="select" name="jenis"></select></div><div class="grid g-2" style="gap:12px"><div class="field"><label>Tanggal Mulai <span class="req">*</span></label><input class="input" type="date" name="mulai"></div><div class="field"><label>Tanggal Selesai <span class="req">*</span></label><input class="input" type="date" name="selesai"></div></div>' +
      '<div class="kvbox"><span class="muted">Durasi hari kerja</span><b id="cHari">0 hari</b></div><div class="field"><label>Alasan <span class="req">*</span></label><textarea class="textarea" name="alasan" rows="3" maxlength="500" placeholder="Jelaskan keperluan cuti/izin"></textarea></div>' +
      '<div class="field"><label>Lampiran (opsional, mis. surat dokter)</label><input type="file" id="cLamp" accept=".pdf,.jpg,.jpeg,.png" class="small"></div><button class="btn btn-primary" type="submit">' + ic('send', 'ic-sm') + 'Kirim Pengajuan</button></form></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('history') + 'Riwayat Pengajuan</h3></div><div class="card-b flush" id="cRiw"></div></div></div>';
  },
  init: function (el) {
    var f = $('#cForm', el);
    var hitung = function () { var v = formVals(f); if (!v.mulai || !v.selesai || v.selesai < v.mulai) { $('#cHari', el).textContent = '0 hari'; return; } var n = 0, d = toDate(v.mulai), s = toDate(v.selesai); while (d <= s) { var w = d.getDay(); if (w > 0 && w < 6) n++; d.setDate(d.getDate() + 1); } $('#cHari', el).textContent = n + ' hari kerja'; };
    f.addEventListener('change', hitung);
    f.onsubmit = async function (e) {
      e.preventDefault(); var v = formVals(f), fl = $('#cLamp', el).files[0];
      try { if (fl) v.lampiran = await fileToB64(fl, 5); } catch (er) { return toast(er.message, 'bad'); }
      var r = await aksi(f.querySelector('[type=submit]'), 'cutiAjukan', v);
      if (r.success) { f.reset(); $('#cHari', el).textContent = '0 hari'; muatCuti(el, true); refreshBoot(); }
    };
    App.tables.cuti = Table($('#cRiw', el), { key: 'ID', per: 8, unit: 'pengajuan', sort: 'DiajukanPada', dir: -1, cols: [
      { k: 'Jenis', label: 'Jenis', render: function (c) { return '<b>' + esc(c.Jenis) + '</b><span class="t2">' + esc(String(c.Alasan || '').slice(0, 60)) + '</span>'; } },
      { k: 'TglMulai', label: 'Tanggal', render: function (c) { return tgl(c.TglMulai) + ' – ' + tgl(c.TglSelesai); } },
      { k: 'JumlahHari', label: 'Hari', cls: 'n' },
      { k: 'Status', label: 'Status', render: function (c) { return pill(c.Status) + (c.CatatanHRD ? '<span class="t2">' + esc(c.CatatanHRD) + '</span>' : ''); } },
      { label: '', render: function (c) { return c.Status === 'Menunggu' ? '<button class="btn btn-ghost btn-xs" data-batal="' + c.ID + '">Batalkan</button>' : ''; } }],
      after: function (tb) { $$('[data-batal]', tb).forEach(function (b) { b.onclick = async function () { if (await confirmBox('Batalkan pengajuan?', 'Pengajuan akan dibatalkan dan tidak diproses HRD.', 'Batalkan', true)) { var r = await aksi(b, 'cutiBatal', { id: b.dataset.batal }); if (r.success) { muatCuti(el, true); refreshBoot(); } } }; }); } });
  },
  show: function (el) { muatCuti(el); }
});
function muatCuti(el, force) {
  return swr('cutiMine', 'cutiMine', {}, function (d) {
    $('[name=jenis]', el).innerHTML = selectOpts(d.jenis, $('[name=jenis]', el).value || 'Cuti Tahunan');
    var s = d.saldo;
    $('#cStat', el).innerHTML = stat({ acc: 'navy', label: 'Kuota Cuti Tahunan', val: s.kuota, unit: 'hari', icon: 'calendar-days' }) + stat({ acc: 'blue', label: 'Sisa Cuti', val: s.sisa, unit: 'hari', bar: s.kuota ? s.sisa / s.kuota * 100 : 0, icon: 'calendar-check' }) +
      stat({ acc: 'green', label: 'Sudah Dipakai', val: s.dipakai, unit: 'hari', icon: 'circle-check' }) + stat({ acc: 'amber', label: 'Menunggu Persetujuan', val: s.menunggu, unit: 'hari', icon: 'hourglass' });
    App.tables.cuti.set(d.riwayat);
  }, { fresh: 30000, force: force });
}

/* ---------------------------------------------------------------- SLIP GAJI (ESS) */
registerPage('gaji', {
  title: 'Slip Gaji', menu: 'gaji',
  template: function () { return pageHead({ crumbs: ['Beranda', 'Slip Gaji'], title: 'Slip Gaji Saya', sub: 'Slip gaji resmi (PDF ber-QR verifikasi) yang telah diterbitkan HRD.' }) + '<div class="grid g-3" id="gList">' + skel(3, 150) + '</div>'; },
  show: function (el) {
    swr('slipMine', 'slipMine', {}, function (rows) {
      $('#gList', el).innerHTML = rows.length ? rows.map(function (p) {
        return '<div class="card"><div class="card-h"><div><div class="ov">Periode</div><h3>' + esc(BULAN[+p.Periode.slice(5, 7) - 1] + ' ' + p.Periode.slice(0, 4)) + '</h3></div>' + pill(p.StatusSlip) + '</div><div class="card-b"><div class="ov">Gaji Bersih (THP)</div><div class="num" style="font-size:26px;font-weight:700;margin:4px 0 12px">' + rp(p.GajiBersih) + '</div>' +
          '<dl class="kv small"><dt>Gaji Pokok</dt><dd class="num">' + rp(p.GajiPokok) + '</dd><dt>Tunjangan + Lembur</dt><dd class="num">' + rp(num(p.Tunjangan) + num(p.Lembur)) + '</dd><dt>Total Potongan</dt><dd class="num bad-t">−' + rp(p.Potongan) + '</dd><dt>Kehadiran</dt><dd>' + p.HariHadir + ' hadir · ' + p.HariTerlambat + ' telat · ' + p.HariAlpa + ' alpa</dd></dl></div>' +
          '<div class="card-f"><button class="btn btn-sec btn-sm" data-rinci="' + p.ID + '">Rincian</button><button class="btn btn-primary btn-sm" data-pdf="' + p.ID + '">' + ic('download', 'ic-sm') + 'Unduh PDF</button></div></div>';
      }).join('') : '<div class="card" style="grid-column:1/-1"><div class="card-b">' + empty('Belum ada slip gaji yang diterbitkan.', 'receipt') + '</div></div>';
      $$('[data-pdf]', el).forEach(function (b) { b.onclick = async function () { var r = await withBusy(b, function () { return api('slipUnduh', { id: b.dataset.pdf }); }); if (r.success) unduhB64(r.data); else toast(r.message, 'bad'); }; });
      $$('[data-rinci]', el).forEach(function (b) { b.onclick = function () { var p = rows.filter(function (x) { return x.ID === b.dataset.rinci; })[0]; rincianSlip(p); }; });
    }, { fresh: 120000 });
  }
});
function rincianSlip(p) {
  var baris = function (l, v, cls) { return '<tr><td>' + l + '</td><td class="n ' + (cls || '') + '">' + v + '</td></tr>'; };
  modal({ title: 'Rincian Slip ' + p.Periode, sub: p.Nama + ' · NIK ' + p.NIK, body: '<div class="grid g-2"><table class="tbl compact"><thead><tr><th>Pendapatan</th><th class="n">Jumlah</th></tr></thead><tbody>' + baris('Gaji Pokok', rp(p.GajiPokok)) + baris('Tunjangan', rp(p.Tunjangan)) + baris('Lembur', rp(p.Lembur)) + '</tbody></table>' +
    '<table class="tbl compact"><thead><tr><th>Potongan</th><th class="n">Jumlah</th></tr></thead><tbody>' + baris('BPJS', rp(p.BPJS), 'bad-t') + baris('PPh 21', rp(p.PPh21), 'bad-t') + baris('Terlambat (' + p.MenitTerlambat + ' mnt)', rp(p.PotTerlambat), 'bad-t') + baris('Alpa (' + p.HariAlpa + ' hari)', rp(p.PotAlpa), 'bad-t') + '</tbody></table></div>' +
    '<div class="kvbox mt-16" style="font-size:16px"><b>Gaji Bersih Diterima</b><b class="num">' + rp(p.GajiBersih) + '</b></div>' });
}

/* ---------------------------------------------------------------- DOKUMEN (ESS) */
registerPage('dokumen', {
  title: 'Dokumen Arsip', menu: 'dokumen',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Dokumen Arsip'], title: 'Dokumen Pribadi', sub: 'Unggah KTP, NPWP, ijazah, sertifikat, dan dokumen lain. Tersimpan privat di folder Google Drive sesuai NIK Anda.' }) +
      '<div class="grid g-main-l"><div class="card"><div class="card-h"><h3>' + ic('upload') + 'Unggah Dokumen</h3></div><div class="card-b"><div class="field mb-16"><label>Jenis Dokumen</label><select class="select" id="dJenis"></select></div><div class="dropzone" id="dDz"><div class="ico">' + ic('file-up') + '</div><div>Tarik & lepas berkas, atau <a href="javascript:void 0">pilih dari perangkat</a></div><div class="small muted mt-8">PDF, JPG, PNG · maks 10 MB · hingga 5 berkas</div></div><div id="dAntri" class="mt-12"></div><button class="btn btn-primary btn-block mt-12" id="dKirim" hidden>' + ic('cloud-upload', 'ic-sm') + 'Unggah ke Arsip</button></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('folder-open') + 'Arsip Dokumen Saya</h3></div><div class="card-b flush" id="dTbl"></div></div></div>';
  },
  init: function (el) {
    var antre = [];
    function draw() {
      $('#dAntri', el).innerHTML = antre.map(function (f, i) { return '<div class="filerow"><div class="fileico">' + ic(/pdf/.test(f.mime) ? 'file-text' : 'image') + '</div><div class="grow"><div class="small strong ellip">' + esc(f.nama) + '</div><div class="small muted">' + esc(f.jenis) + ' · ' + (f.size / 1048576).toFixed(1) + ' MB</div></div><button class="iconbtn" data-rm="' + i + '">' + ic('x', 'ic-sm') + '</button></div>'; }).join('');
      $('#dKirim', el).hidden = !antre.length;
      $$('[data-rm]', el).forEach(function (b) { b.onclick = function () { antre.splice(+b.dataset.rm, 1); draw(); }; });
    }
    dropzone($('#dDz', el), async function (files) {
      for (var i = 0; i < files.length && antre.length < 5; i++) {
        if (!/pdf|jpe?g|png/i.test(files[i].type + files[i].name)) { toast(files[i].name + ': tipe tidak didukung', 'bad'); continue; }
        try { var f = await fileToB64(files[i], 10); f.jenis = $('#dJenis', el).value; antre.push(f); } catch (e) { toast(e.message, 'bad'); }
      }
      draw();
    }, '.pdf,.jpg,.jpeg,.png');
    $('#dKirim', el).onclick = async function () { var r = await aksi(this, 'dokUpload', { files: antre }); if (r.success) { antre = []; draw(); muatDok(el, true); } };
    App.tables.dok = Table($('#dTbl', el), { key: 'ID', per: 10, unit: 'dokumen', cols: [
      { k: 'NamaFile', label: 'Berkas', render: function (d) { return '<div class="row">' + '<div class="fileico">' + ic(/pdf/.test(d.Mime) ? 'file-text' : 'image') + '</div><div><b class="small">' + esc(d.NamaFile) + '</b><span class="t2">' + (num(d.Ukuran) / 1048576).toFixed(2) + ' MB</span></div></div>'; } },
      { k: 'JenisDokumen', label: 'Jenis' }, { k: 'TglUpload', label: 'Diunggah', render: function (d) { return tgl(d.TglUpload); } },
      { k: 'Status', label: 'Status', render: function (d) { return pill(d.Status); } },
      { label: '', render: function (d) { return '<button class="btn btn-ghost btn-xs" data-dl="' + d.ID + '">' + ic('download', 'ic-sm') + '</button>'; } }],
      after: function (tb) { $$('[data-dl]', tb).forEach(function (b) { b.onclick = async function () { var r = await withBusy(b, function () { return api('dokUnduh', { id: b.dataset.dl }); }); if (r.success) lihatB64(r.data); else toast(r.message, 'bad'); }; }); } });
  },
  show: function (el) { muatDok(el); }
});
function muatDok(el, force) {
  return swr('dokMine', 'dokMine', {}, function (d) { var j = $('#dJenis', el); if (!j.options.length) j.innerHTML = selectOpts(d.jenis, 'KTP'); App.tables.dok.set(d.rows); }, { fresh: 60000, force: force });
}

/* ---------------------------------------------------------------- PROFIL & GAJI (mobile) */
registerPage('profil', {
  title: 'Profil & Gaji', menu: 'profil',
  template: function () { return '<div id="pHead"></div><div class="grid g-main"><div class="stack" id="pKiri"></div><div class="stack" id="pKanan"></div></div>'; },
  show: function (el) {
    var me = App.boot.me, e = App.boot.ess;
    $('#pHead', el).innerHTML = pageHead({ crumbs: ['Beranda', 'Profil'], title: 'Profil Saya', sub: 'Data diri sesuai Master Data Karyawan. Perubahan data dilakukan oleh tim HRD.' });
    $('#pKiri', el).innerHTML = '<div class="card"><div class="card-b"><div class="row gap-16">' + avatar(me.nama, 'lg') + '<div class="grow"><div class="strong" style="font-size:18px">' + esc(me.nama) + '</div><div class="muted">' + esc(me.jabatan) + ' · ' + esc(me.divisi) + '</div><div class="row mt-8 wrap">' + pill('Aktif', roleLabel(me.role)) + '<span class="chip mono">NIK ' + esc(me.nik) + '</span></div></div></div>' +
      '<dl class="kv mt-24"><dt>Email Google (login)</dt><dd>' + esc(me.email) + '</dd><dt>WhatsApp</dt><dd class="mono">' + esc(me.wa || '-') + '</dd><dt>Status Kerja</dt><dd>' + esc(me.statusKerja || '-') + '</dd><dt>Tanggal Bergabung</dt><dd>' + tgl(me.tglBergabung, true) + ' (' + masaKerja(me.tglBergabung) + ')</dd>' +
      (me.kontrakBerakhir ? '<dt>Kontrak Berakhir</dt><dd>' + tgl(me.kontrakBerakhir, true) + '</dd>' : '') + '<dt>Status PTKP</dt><dd>' + esc(me.ptkp || '-') + '</dd><dt>Rekening Payroll</dt><dd class="mono">' + esc((me.bank || '') + ' ' + (me.rekening || '-')) + '</dd><dt>Kuota Cuti</dt><dd>' + me.kuotaCuti + ' hari/tahun</dd></dl></div></div>' +
      (App.boot.pejabat ? '<div class="card"><div class="card-h"><h3>' + ic('key-round') + 'PIN Tanda Tangan Elektronik</h3></div><div class="card-b"><p class="small muted" style="margin-top:0">Anda terdaftar sebagai pejabat penanda tangan. PIN 6 angka dipakai saat menyetujui dokumen (Google login + PIN).</p><a class="btn btn-sec" href="#/persetujuan">' + ic('file-signature', 'ic-sm') + 'Buka Persetujuan Dokumen</a></div></div>' : '');
    $('#pKanan', el).innerHTML = '<div class="card"><div class="card-h"><h3>' + ic('receipt') + 'Slip Gaji Terbaru</h3></div><div class="card-b">' + (e.slip ? '<div class="ov">' + esc(e.slip.periode) + '</div><div class="num" style="font-size:26px;font-weight:700;margin:6px 0 12px">' + rp(e.slip.bersih) + '</div><a class="btn btn-primary btn-block" href="#/gaji">Semua Slip Gaji</a>' : empty('Belum ada slip terbit.', 'receipt')) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('calendar-days') + 'Cuti Tahunan</h3></div><div class="card-b"><div class="row" style="align-items:baseline"><b style="font-size:26px" class="num">' + e.cuti.sisa + '</b><span class="muted">/ ' + e.cuti.kuota + ' hari tersisa</span></div><div class="progress mt-8"><i style="width:' + (e.cuti.kuota ? e.cuti.sisa / e.cuti.kuota * 100 : 0) + '%"></i></div><a class="btn btn-sec btn-block mt-12" href="#/cuti">Ajukan Cuti</a></div></div>' +
      '<button class="btn btn-danger-o btn-block show-m" id="pOut">' + ic('log-out', 'ic-sm') + 'Keluar dari Akun</button>';
    var o = $('#pOut', el); if (o) o.onclick = logout;
  }
});

/* ---------------------------------------------------------------- PERSETUJUAN DOKUMEN (pejabat) */
registerPage('persetujuan', {
  title: 'Persetujuan Dokumen', menu: 'persetujuan',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Persetujuan Dokumen'], title: 'Persetujuan & Tanda Tangan Dokumen', sub: 'Dokumen yang menunggu persetujuan Anda. Setujui dengan akun Google + PIN 6 angka; QR verifikasi otomatis tercetak di dokumen terbit.', actions: '<button class="btn btn-sec" id="psPin">' + ic('key-round', 'ic-sm') + 'Atur / Ganti PIN</button>' }) +
      '<div id="psInfo"></div><div class="card"><div class="card-b flush" id="psTbl"></div></div>';
  },
  init: function (el) {
    $('#psPin', el).onclick = function () {
      modal({ title: 'Atur PIN Tanda Tangan', sub: 'PIN 6 angka — jangan bagikan ke siapa pun.', size: 'sm', body: '<div class="col gap-12"><div class="field"><label>PIN lama (kosongkan bila baru)</label><input class="input mono" name="pinLama" type="password" inputmode="numeric" maxlength="6"></div><div class="field"><label>PIN baru</label><input class="input mono" name="pin" type="password" inputmode="numeric" maxlength="6"></div><div class="field"><label>Ulangi PIN baru</label><input class="input mono" name="pin2" type="password" inputmode="numeric" maxlength="6"></div></div>',
        foot: [{ label: 'Batal', close: true }, { label: 'Simpan PIN', cls: 'btn-primary', act: async function (m) { var v = formVals(m.el); if (v.pin !== v.pin2) { toast('PIN baru tidak sama.', 'warn'); return false; } var r = await api('deAturPin', v); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatPs(el, true); return r.success; } }] });
    };
    App.tables.ps = Table($('#psTbl', el), { key: 'id', unit: 'dokumen', cols: [
      { k: 'judul', label: 'Dokumen', render: function (d) { return '<b>' + esc(d.judul) + '</b><span class="t2">' + esc(d.template) + ' · diajukan ' + esc(d.oleh) + '</span>'; } },
      { k: 'dibuat', label: 'Tanggal', render: function (d) { return tglJam(d.dibuat); } },
      { label: 'Penanda Tangan', render: function (d) { return d.penandatangan.map(function (s) { return '<div class="small">' + pill(s.status === 'SETUJU' ? 'Disetujui' : s.status === 'OTOMATIS' ? 'Valid' : 'Menunggu', s.label) + ' ' + esc(s.nama) + '</div>'; }).join(''); } },
      { label: '', render: function (d) { return '<button class="btn btn-primary btn-sm" data-ttd="' + d.id + '">' + ic('pen-line', 'ic-sm') + 'Tinjau & Setujui</button>'; } }],
      after: function (tb) { $$('[data-ttd]', tb).forEach(function (b) { b.onclick = function () { tinjauTtd(el, App.tables.ps.rows().filter(function (x) { return x.id === b.dataset.ttd; })[0]); }; }); } });
  },
  show: function (el) { muatPs(el); }
});
function muatPs(el, force) {
  return swr('deAntreanSaya', 'deAntreanSaya', {}, function (d) {
    $('#psInfo', el).innerHTML = d.pejabat ? (d.pejabat.punyaPin ? '' : '<div class="note warn mb-16">' + ic('key-round') + '<div>Anda belum mengatur PIN tanda tangan. Tekan <b>Atur / Ganti PIN</b> sebelum menyetujui dokumen.</div></div>') : (isSA() ? '<div class="note mb-16">' + ic('info') + '<div>Sebagai Super Admin Anda dapat melakukan <b>bypass</b> persetujuan (wajib alasan, tercatat di audit & halaman verifikasi).</div></div>' : '');
    App.tables.ps.set(d.rows);
  }, { fresh: 20000, force: force });
}
function tinjauTtd(el, d) {
  var slot = d.penandatangan.filter(function (s) { return s.status === 'MENUNGGU'; }).sort(function (a, b) { return a.urutan - b.urutan; })[0] || {};
  var milik = slot.email && slot.email.toLowerCase() === App.boot.me.email.toLowerCase();
  modal({ title: d.judul, sub: 'Slot: ' + (slot.label || '-') + ' — ' + (slot.nama || ''), size: 'lg',
    body: '<div class="grid g-2"><div><div class="ov mb-8">Isian Dokumen</div><dl class="kv small">' + Object.keys(d.isian).filter(function (k) { return k[0] !== '_'; }).slice(0, 18).map(function (k) { var v = d.isian[k]; return '<dt>' + esc(k.replace(/_/g, ' ')) + '</dt><dd>' + esc(typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v).replace(/<[^>]+>/g, ' ').slice(0, 80)) + '</dd>'; }).join('') + '</dl>' +
      '<button class="btn btn-sec btn-sm mt-12" id="ttdPrev">' + ic('eye', 'ic-sm') + 'Pratinjau PDF</button></div><div class="col gap-12">' +
      (milik ? '<div class="field"><label>PIN Tanda Tangan (6 angka)</label><input class="input mono" id="ttdPin" type="password" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>' : '<div class="note warn">' + ic('shield-alert') + '<div>Slot ini milik ' + esc(slot.nama || '-') + '. ' + (isSA() ? 'Anda dapat melakukan bypass Super Admin dengan alasan.' : '') + '</div></div>') +
      '<div class="field"><label>Catatan ' + (milik ? '(opsional)' : '/ alasan bypass') + '</label><textarea class="textarea" id="ttdCat" rows="3"></textarea></div></div></div>',
    foot: [{ label: 'Tutup', close: true }, { label: 'Kembalikan ke Draf', cls: 'btn-danger-o', act: async function (m) { var r = await api('deSetujui', { dokumenId: d.id, slot: slot.slot, pin: ($('#ttdPin', m.el) || {}).value, catatan: $('#ttdCat', m.el).value, tolak: true, bypass: !milik }); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatPs(el, true); return r.success; } },
      { label: milik ? 'Setujui & Tanda Tangani' : 'Bypass Super Admin', cls: 'btn-primary', icon: 'pen-line', act: async function (m) { var r = await api('deSetujui', { dokumenId: d.id, slot: slot.slot, pin: ($('#ttdPin', m.el) || {}).value, catatan: $('#ttdCat', m.el).value, bypass: !milik }); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatPs(el, true); return r.success; } }],
    onOpen: function (mel) { $('#ttdPrev', mel).onclick = async function () { if (!isHRD()) return toast('Pratinjau tersedia untuk tim HRD.', 'warn'); var r = await withBusy(this, function () { return api('de.pratinjau', { templateId: d.templateId, isian: d.isian, penandatangan: d.penandatangan }); }); if (r.success) lihatB64(r.data); else toast(r.message, 'bad'); }; } });
}
