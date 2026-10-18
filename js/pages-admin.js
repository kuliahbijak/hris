/* ============================================================================
 * SIM HRD — pages-admin.js  (dimuat lazy hanya untuk Super Admin & Staff HRD)
 * Dashboard · Karyawan · Absensi (QR, kios, rekap, import fingerprint, konfigurasi) · Cuti
 * Payroll · Rekrutmen · Review Kandidat · Leads · Arsip Dokumen · Laporan & KPI
 * ========================================================================== */
'use strict';
var DIVCOL = {};
function warnaDiv(d, i) { if (!DIVCOL[d]) DIVCOL[d] = PALET[Object.keys(DIVCOL).length % PALET.length]; return DIVCOL[d]; }
/** v2.1: Prefetch SEMUA menu admin (dibaca langsung dari Supabase, paralel) saat idle,
 *  sehingga pindah menu langsung tampil dari cache lalu disegarkan diam-diam (P3). */
function prefetchAdmin() {
  if (App._pref && Date.now() - App._pref < 120000) return; App._pref = Date.now();
  var daftar = [['adminDashboard', 'adminDashboard'], ['karyawanList', 'karyawanList'], ['cutiList', 'cutiList'], ['kandidatList', 'kandidatList'], ['leadsList', 'leadsList'],
    ['lowonganList', 'lowonganList'], ['dokList', 'dokList'], ['absensiAdmin', 'absensiAdmin'], ['payroll:' + periodeAktif(), 'payrollList', { periode: periodeAktif() }],
    ['laporan:' + kuartalIni() + ':', 'laporan', { periode: kuartalIni(), divisi: '' }], ['deTpl', 'de.templateList'], ['blastList', 'wa.blastList'],
    ['notifQueue:', 'notif.queue', { status: '', kanal: '' }], ['crmStats', 'crm.stats'], ['lokasiList', 'lokasiList']];
  if (isSA()) daftar.push(['settingsGet', 'settingsGet']);
  var run = function () {
    var segar = function (key) { var c = Store.get(userKey(key), null); return c && Date.now() - c.t < 60000; };
    var antre = daftar.filter(function (x) { return !segar(x[0]); }), jalan = 0, i = 0;
    function berikut() {
      while (jalan < 4 && i < antre.length) {
        (function (x) {
          jalan++;
          api(x[1], x[2] || {}, { silent: true }).then(function (r) { if (r && r.success) cacheSet(x[0], r.data); }).catch(function () { }).then(function () { jalan--; berikut(); });
        })(antre[i++]);
      }
    }
    berikut();
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2500 }); else setTimeout(run, 800);
}
function stopPoll(k) { if (App.timers[k]) { clearInterval(App.timers[k]); delete App.timers[k]; } }
/** Polling hemat: hanya saat tab terlihat, interval memanjang bila data tidak berubah (P10). */
function poll(k, fn, base) {
  stopPoll(k); var iv = base || 15000, last = '';
  var tick = async function () { if (document.hidden) return; var h = await fn(); if (h && h === last) { iv = Math.min(60000, iv * 2); stopPoll(k); App.timers[k] = setInterval(tick, iv); } else { last = h; } };
  App.timers[k] = setInterval(tick, iv);
}

/* ============================================================ DASHBOARD HRD */
registerPage('admin', {
  auth: 'hrd', title: 'Dashboard HRD', menu: 'admin',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Dashboard'], title: 'Ringkasan Operasional HRD', sub: '<span class="tag navy">' + (isSA() ? 'SUPER ADMIN' : 'STAFF HRD') + ' VIEW</span> Pantau kehadiran, persetujuan cuti, pipeline rekrutmen, dan eksekusi payroll ' + esc(perusahaan()) + '.',
      actions: '<button class="btn btn-sec" id="dRekap">' + ic('cloud-download', 'ic-sm') + 'Unduh Rekap Bulanan</button><button class="btn btn-primary" id="dSync">' + ic('refresh-cw', 'ic-sm') + 'Sinkronisasi Data <span class="mono small" id="dSyncT" style="opacity:.7"></span></button>' }) +
      '<div class="grid g-5" id="dStat">' + skel(1, 120) + '</div>' +
      '<div class="grid g-7-5 mt-16"><div class="card"><div class="card-h"><div><h3>Tren Kehadiran 30 Hari Terakhir</h3><p class="sub">Terintegrasi presensi QR + GPS dan impor mesin fingerprint</p></div><div class="legend"><span><i style="background:#141B2B"></i>Hadir Tepat Waktu</span><span><i style="background:#2563EB"></i>Terlambat</span><span><i style="background:#A9C8F5"></i>Izin / Cuti</span></div></div><div class="card-b" id="dTren">' + skel(1, 220) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Komposisi Divisi</h3><span class="chip mono" id="dDivN"></span></div><div class="card-b" id="dDiv"></div></div></div>' +
      '<div class="grid g-2 mt-16"><div class="card"><div class="card-h"><h3>Pengajuan Cuti Menunggu Persetujuan <span class="count" id="dCutiN" style="background:var(--bad);color:#fff"></span></h3><span class="small muted">SLA Respon: 24 Jam</span></div><div class="card-b flush" id="dCuti"></div><div class="card-f"><span id="dCutiF"></span><a href="#/cuti-admin" class="strong">Lihat Semua Pengajuan →</a></div></div>' +
      '<div class="card"><div class="card-h"><h3>Pelamar Rekrutmen Terbaru <span class="count blue" id="dKdN"></span></h3><span class="small muted">Skor kecocokan otomatis</span></div><div class="card-b flush" id="dKd"></div><div class="card-f"><span id="dKdF"></span><a href="#/rekrutmen" class="strong">Buka Pipeline Rekrutmen →</a></div></div></div>' +
      '<div class="grid g-2 mt-16" id="dAlert"></div>' +
      '<div class="card mt-16"><div class="card-h"><h3>' + ic('workflow') + 'Alur Operasional Terintegrasi SIM HRD</h3><span class="small muted mono">Sheets · Drive · Gmail · WhatsApp · Docs</span></div><div class="card-b row wrap small">' +
      ['scan-qr-code:QR Dinamis', 'map-pin:Geofence', 'calculator:Hitung Payroll', 'file-text:Slip PDF', 'briefcase:Portal Karir', 'list-filter:Skrining CV', 'user-check:Pegawai Baru', 'database:Pool Leads'].map(function (x, i) { var p = x.split(':'); return '<span class="chip">' + ic(p[0], 'ic-sm') + p[1] + '</span>' + (i === 3 ? '<span class="muted" style="margin:0 6px">|</span>' : i < 7 ? ic('arrow-right', 'ic-sm muted') : ''); }).join('') + '</div></div>';
  },
  init: function (el) {
    $('#dSync', el).onclick = function () { var b = this; withBusy(b, function () { return Promise.all([muatDash(el, true), refreshBoot()]); }); };
    $('#dRekap', el).onclick = async function () {
      var r = await withBusy(this, function () { return api('absensiRekap', { bulan: ymd().slice(0, 7) }); }); if (!r.success) return toast(r.message, 'bad');
      exportXlsx('Rekap_Absensi_' + r.data.bulan, { Rekap: r.data.rows.map(function (x) { var o = { NIK: x.nik, Nama: x.nama, Divisi: x.divisi, Hadir: x.H, Terlambat: x.T, Izin: x.I, Sakit: x.S, Alpa: x.A, 'Menit Telat': x.menit }; r.data.hariKerja.forEach(function (d) { o['Tgl ' + d] = x.hari[d] || ''; }); return o; }) });
    };
  },
  show: function (el) { muatDash(el); prefetchAdmin(); }
});
function muatDash(el, force) {
  return swr('adminDashboard', 'adminDashboard', {}, function (d) {
    $('#dSyncT', el).textContent = jam(new Date()) + ' WIB';
    var hi = d.hariIni, pct = d.total ? Math.round(hi.hadir / d.total * 1000) / 10 : 0;
    $('#dStat', el).innerHTML =
      stat({ label: 'Total Karyawan Aktif', icon: 'users', val: d.total, meta: '<span class="blue-t">' + ic('trending-up', 'ic-sm') + ' +' + d.baru30 + ' dari 30 hari terakhir</span>', go: 'karyawan' }) +
      stat({ label: 'Kehadiran Hari Ini', badge: '<span class="pill info">' + pct + '% Hadir</span>', val: hi.hadir, unit: '/ ' + d.total, meta: '<span>' + hi.telat + ' Terlambat, ' + hi.cuti + ' Cuti, ' + (hi.kerja ? hi.alpa : 0) + ' Belum/Alpa</span>', go: 'absensi-admin' }) +
      stat({ acc: d.cuti.total ? 'red' : '', label: 'Cuti Pending', badge: d.cuti.total ? '<span class="tag navy">Perlu Tindakan</span>' : '', val: d.cuti.total, unit: 'Pengajuan', meta: d.cuti.total ? '<span class="warn-t">' + ic('triangle-alert', 'ic-sm') + ' Terdekat ' + tgl(d.cuti.rows[0].TglMulai) + '</span>' : '<span>Semua tuntas</span>', go: 'cuti-admin' }) +
      stat({ label: 'Pelamar Aktif', icon: 'user-plus', val: d.kandidat.total, unit: 'Kandidat', meta: '<span class="ellip">' + esc((d.kandidat.rows || []).slice(0, 2).map(function (k) { return k.posisi; }).join(', ') || 'Belum ada pelamar') + '</span>', go: 'rekrutmen' }) +
      stat({ label: 'Payroll ' + d.payroll.periode, badge: pill(d.payroll.status === 'TERBIT' ? 'Terbit' : 'Draft', d.payroll.status, false), val: rpShort(d.payroll.total).replace('Rp ', 'Rp '), meta: '<span>' + d.payroll.jumlah + ' karyawan terhitung</span>', go: 'payroll' });
    goClick($('#dStat', el));
    var tren = d.tren.map(function (t, i) { var tot = d.total || 1; return { label: i === d.tren.length - 1 || (i % 7 === 0 && d.tren.length - 1 - i >= 4) ? tgl(t.t).replace(/ \d{4}$/, '') : '', values: t.kerja ? { a: t.tepat / tot * 100, b: t.telat / tot * 100, c: t.cuti / tot * 100 } : {}, off: !t.kerja, hl: i === d.tren.length - 1 }; });
    $('#dTren', el).innerHTML = chartBars(tren, { keys: [{ k: 'a', color: '#141B2B', label: 'Tepat (%)' }, { k: 'b', color: '#2563EB', label: 'Terlambat (%)' }, { k: 'c', color: '#A9C8F5', label: 'Cuti (%)' }], h: 230, max: 100, pct: true, target: 85, targetLabel: 'Ambang KPI 85%', aria: 'Tren kehadiran 30 hari' }) +
      '<div class="grid g-3 mt-12" style="gap:0;background:#F1F5FD;border-radius:6px">' + [['Rata-rata Hadir Tepat', d.rata.hadirTepat + '%', ''], ['Rasio Terlambat', d.rata.telat + '%', 'blue-t'], ['Efektivitas Shift', d.rata.efektif + '%', '']].map(function (x) { return '<div class="center" style="padding:10px"><div class="ov">' + x[0] + '</div><b class="num ' + x[2] + '" style="font-size:18px">' + x[1] + '</b></div>'; }).join('') + '</div>';
    var divs = Object.keys(d.divisi).sort(function (a, b) { return d.divisi[b] - d.divisi[a]; });
    $('#dDivN', el).textContent = divs.length + ' Divisi';
    $('#dDiv', el).innerHTML = chartDonut(divs.map(function (k, i) { return { l: k, v: d.divisi[k], c: PALET[i % PALET.length] }; }), d.total, 'KARYAWAN') +
      '<div class="mt-16 col gap-4">' + divs.map(function (k, i) { return '<div class="row small"><i style="width:9px;height:9px;border-radius:50%;background:' + PALET[i % PALET.length] + '"></i><span class="grow">' + esc(k) + '</span><b class="num">' + d.divisi[k] + '</b><span class="muted num" style="width:48px;text-align:right">' + (d.divisi[k] / d.total * 100).toFixed(1) + '%</span></div>'; }).join('') + '</div>';
    $('#dCutiN', el).textContent = d.cuti.total;
    $('#dCuti', el).innerHTML = d.cuti.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Karyawan</th><th>Jenis & Sisa</th><th>Tgl Mulai</th><th class="n">Aksi</th></tr></thead><tbody>' + d.cuti.rows.map(function (c) {
      return '<tr><td>' + userCell(c.Nama, c.NIK) + '</td><td><b class="small">' + esc(c.Jenis) + ' (' + c.JumlahHari + ' Hari)</b><span class="t2">' + (c.Jenis === 'Cuti Tahunan' ? 'Sisa: ' + c.Sisa_Cuti_Tahunan + ' hari' : esc(String(c.Alasan).slice(0, 30))) + '</span></td><td style="white-space:nowrap">' + tgl(c.TglMulai) + '</td><td class="n"><div class="row" style="justify-content:flex-end">' +
        (isSA() ? '<button class="btn btn-primary btn-xs" data-cs="' + c.ID + '">Setujui</button><button class="btn btn-sec btn-xs" data-ct="' + c.ID + '">Tolak</button>' : '<button class="btn btn-sec btn-xs" data-cp="' + c.ID + '">Proses</button>') + '</div></td></tr>'; }).join('') + '</tbody></table></div>' : empty('Tidak ada pengajuan menunggu.', 'calendar-check');
    $('#dCutiF', el).textContent = 'Menampilkan ' + d.cuti.rows.length + ' dari ' + d.cuti.total + ' permintaan';
    bindCutiAksi($('#dCuti', el), function () { muatDash(el, true); refreshBoot(); });
    $('#dKdN', el).textContent = d.kandidat.total;
    $('#dKd', el).innerHTML = d.kandidat.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kandidat</th><th>Posisi</th><th>Skor</th><th class="n">Aksi</th></tr></thead><tbody>' + d.kandidat.rows.map(function (k) {
      return '<tr><td><b>' + esc(k.nama) + '</b><span class="t2">' + tglJam(k.dibuat) + '</span></td><td class="small">' + esc(k.posisi) + '</td><td style="min-width:110px">' + skorBar(k.skor) + '</td><td class="n"><a class="btn btn-sec btn-xs" href="#/kandidat/' + k.id + '">Review CV</a></td></tr>'; }).join('') + '</tbody></table></div>' : empty('Belum ada pelamar baru.', 'user-plus');
    $('#dKdF', el).textContent = 'Menampilkan ' + d.kandidat.rows.length + ' dari ' + d.kandidat.total + ' kandidat pipeline';
    $('#dAlert', el).innerHTML = '<div class="card" style="background:#FFFBEB;border-color:#F5D98B"><div class="card-b row top gap-12">' + ic('clock-alert', 'warn-t') + '<div class="grow"><div class="row between"><b style="color:#7C3A06">' + d.kontrak.length + ' Kontrak Kerja PKWT Berakhir dalam 30 Hari</b><a class="btn btn-xs" style="background:#FDE68A;color:#7C3A06" href="#/karyawan">Tinjau Kontrak</a></div><div class="small" style="color:#92400E;margin-top:4px">' + (d.kontrak.length ? d.kontrak.map(function (k) { return esc(k.nama) + ' (' + esc(k.jabatan) + ', ' + tgl(k.tgl) + ')'; }).join(', ') + '. Tinjau evaluasi performa sebelum cut-off perpanjangan.' : 'Tidak ada kontrak yang segera berakhir.') + '</div></div></div></div>' +
      '<div class="card tint"><div class="card-b row top gap-12">' + ic('folder-check', 'blue-t') + '<div class="grow"><div class="row between"><b>' + d.dokMenunggu + ' Dokumen Karyawan Menunggu Verifikasi</b><a class="btn btn-accent btn-xs" href="#/arsip">Verifikasi</a></div><div class="small muted" style="margin-top:4px">Modul absensi QR: <b>' + (d.modulQR ? 'AKTIF' : 'NONAKTIF (mode fingerprint)') + '</b> · radius geofence ' + d.radius + ' m.</div></div></div></div>';
  }, { fresh: 60000, force: force });
}
function skorBar(s) { var c = s >= 80 ? 'var(--blue)' : s >= 60 ? '#495057' : 'var(--bad)'; return '<div class="row"><div class="progress thin grow" style="min-width:50px"><i style="width:' + s + '%;background:' + c + '"></i></div><b class="small num" style="color:' + c + '">' + s + '</b></div>'; }
function bindCutiAksi(root, after) {
  $$('[data-cs],[data-ct],[data-cp]', root).forEach(function (b) {
    b.onclick = async function () {
      var id = b.dataset.cs || b.dataset.ct || b.dataset.cp, aksiN = b.dataset.cs ? 'setujui' : b.dataset.ct ? 'tolak' : 'proses', cat = '';
      if (aksiN === 'tolak') { cat = await promptBox('Tolak Pengajuan Cuti', 'Alasan penolakan (dikirim ke karyawan)', { area: true, min: 3, ok: 'Tolak Pengajuan', danger: true }); if (cat == null) return; }
      if (aksiN === 'proses') { cat = await promptBox('Proses Awal', 'Catatan verifikasi untuk Super Admin (opsional)', { area: true, ok: 'Tandai Diproses' }); if (cat == null) return; }
      var r = await aksi(b, 'cutiProses', { id: id, aksi: aksiN, catatan: cat }, { bust: ['cutiList', 'adminDashboard'] });
      if (r.success && after) after();
    };
  });
}

/* ============================================================ MASTER KARYAWAN */
var KSt = { rows: [], filter: {} };
registerPage('karyawan', {
  auth: 'hrd', title: 'Master Data Karyawan', menu: 'karyawan',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Karyawan', 'Data Karyawan'], title: 'Master Data Karyawan <span class="pill info">Super Admin / Staff HRD</span>', sub: 'Kelola direktori seluruh karyawan, riwayat penugasan, dokumen identitas, dan email Google login (boleh email pribadi).',
      actions: '<button class="btn btn-sec" id="kExp">' + ic('download', 'ic-sm') + 'Export Excel (.xlsx)</button><a class="btn btn-sec" href="#/absensi-admin/import">' + ic('fingerprint', 'ic-sm') + 'Import Fingerprint</a><button class="btn btn-primary" id="kAdd">' + ic('plus', 'ic-sm') + 'Tambah Karyawan</button>' }) +
      '<div class="grid g-4" id="kStat"></div><div class="card mt-16"><div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="kQ" placeholder="Cari nama, NIK, email…"></div><select class="select soft" id="kDv"></select><select class="select soft" id="kJb"></select><select class="select soft" id="kSt">' + selectOpts(['Aktif', 'Nonaktif'], 'Aktif', 'Semua Status') + '</select><select class="select soft" id="kSk">' + selectOpts(['Tetap', 'Kontrak', 'Probasi'], '', 'Semua Status Kerja') + '</select><button class="btn btn-sec btn-sm" id="kRst">' + ic('rotate-ccw', 'ic-sm') + 'Reset</button></div><div class="row wrap mt-12 small" id="kChips"></div></div></div>' +
      '<div class="bulkbar mt-16" id="kBulk" hidden><b class="row">' + ic('circle-check') + '<span id="kSelN"></span></b><span class="grow"></span><button class="btn btn-sec btn-sm" id="kBlast">' + ic('message-circle', 'ic-sm') + 'Kirim Pengumuman WA</button><button class="btn btn-sec btn-sm" id="kExpSel">' + ic('download', 'ic-sm') + 'Export Terpilih</button>' + (isSA() ? '<button class="btn btn-danger btn-sm" id="kNon">' + ic('user-x', 'ic-sm') + 'Nonaktifkan Akun</button>' : '') + '</div>' +
      '<div class="card mt-16"><div class="card-b flush" id="kTbl"></div></div>';
  },
  init: function (el) {
    KSt.tbl = Table($('#kTbl', el), { key: 'ID', select: true, per: 10, unit: 'karyawan', sort: 'Nama', search: function (k) { return k.Nama + ' ' + k.NIK + ' ' + k.Email + ' ' + k.Jabatan; },
      cols: [{ k: 'NIK', label: 'NIK', render: function (k) { return '<b class="mono">' + esc(k.NIK) + '</b>'; } },
        { k: 'Nama', label: 'Nama Lengkap & Email', render: function (k) { return userCell(k.Nama, k.Email, k.Role !== 'KARYAWAN' ? ' <span class="tag ' + (k.Role === 'SUPER_ADMIN' ? 'navy' : '') + '">' + roleLabel(k.Role) + '</span>' : ''); } },
        { k: 'Divisi', label: 'Divisi & Jabatan', render: function (k) { return '<b class="small">' + esc(k.Divisi || '-') + '</b><span class="t2">' + esc(k.Jabatan || '-') + '</span>'; } },
        { k: 'StatusKerja', label: 'Status Kerja', render: function (k) { return k.Status !== 'Aktif' ? pill('Nonaktif') : pill(k.StatusKerja, k.StatusKerja + (k.TglKontrakBerakhir && k.StatusKerja === 'Kontrak' ? ' (s/d ' + tgl(k.TglKontrakBerakhir) + ')' : ''), false); } },
        { k: 'TglBergabung', label: 'Tgl Bergabung', render: function (k) { return tgl(k.TglBergabung) + '<span class="t2">' + masaKerja(k.TglBergabung) + '</span>'; } },
        { k: 'StatusWA', label: 'WA', render: function (k) { return k.NoWA ? '<span class="wa-badge ' + (k.StatusWA === 'Terdaftar' ? 'ya' : k.StatusWA ? 'tidak' : 'belum') + '">' + (k.StatusWA === 'Terdaftar' ? '✓ WA' : k.StatusWA ? '✕' : '?') + '</span>' : '<span class="muted">-</span>'; } }],
      rowClass: function (k) { return k.Status !== 'Aktif' ? 'dim' : ''; },
      onRow: function (k) { detailKaryawan(el, k); },
      onSelect: function (s) { $('#kBulk', el).hidden = !s.length; $('#kSelN', el).textContent = s.length + ' Karyawan Terpilih'; } });
    var ap = function () { terapFilterK(el); };
    $('#kQ', el).oninput = debounce(function () { KSt.tbl.search($('#kQ', el).value); }, 250);
    ['kDv', 'kJb', 'kSt', 'kSk'].forEach(function (i) { $('#' + i, el).onchange = ap; });
    $('#kRst', el).onclick = function () { $('#kQ', el).value = ''; KSt.tbl.search(''); ['kDv', 'kJb', 'kSk'].forEach(function (i) { $('#' + i, el).value = ''; }); $('#kSt', el).value = 'Aktif'; ap(); };
    $('#kAdd', el).onclick = function () { formKaryawan(el); };
    $('#kExp', el).onclick = function () { exportXlsx('Master_Karyawan_' + ymd(), { Karyawan: KSt.tbl.view().map(barisExportK) }); };
    $('#kExpSel', el).onclick = function () { exportXlsx('Karyawan_Terpilih_' + ymd(), { Karyawan: KSt.tbl.selected().map(barisExportK) }); };
    $('#kBlast', el).onclick = function () { App.blastPrefill = KSt.tbl.selected().filter(function (k) { return k.NoWA; }).map(function (k) { return { hp: k.NoWA, nama: k.Nama, divisi: k.Divisi, posisi: k.Jabatan }; }); go('notifikasi', 'blast'); };
    var non = $('#kNon', el); if (non) non.onclick = async function () { var s = KSt.tbl.selected(); if (!await confirmBox('Nonaktifkan ' + s.length + ' akun?', 'Karyawan tidak dapat login lagi dan sesi aktifnya dicabut. Data tetap tersimpan.', 'Nonaktifkan', true)) return; var r = await aksi(non, 'karyawanStatus', { ids: s.map(function (k) { return k.ID; }), status: 'Nonaktif' }, { bust: ['karyawanList'] }); if (r.success) { KSt.tbl.clearSel(); muatK(el, true); } };
  },
  show: function (el, param) { muatK(el).then(function () { if (param) { var k = KSt.rows.filter(function (x) { return x.ID === param; })[0]; if (k) detailKaryawan(el, k); } }); }
});
function barisExportK(k) { return { NIK: k.NIK, Nama: k.Nama, Email: k.Email, WhatsApp: k.NoWA, Divisi: k.Divisi, Jabatan: k.Jabatan, Peran: roleLabel(k.Role), 'Status Kerja': k.StatusKerja, Status: k.Status, 'Tgl Bergabung': k.TglBergabung, 'Kontrak Berakhir': k.TglKontrakBerakhir, 'Gaji Pokok': k.GajiPokok, Tunjangan: k.Tunjangan, PTKP: k.StatusPTKP, Bank: k.Bank, Rekening: k.NoRekening }; }
function terapFilterK(el) {
  var dv = $('#kDv', el).value, jb = $('#kJb', el).value, st = $('#kSt', el).value, sk = $('#kSk', el).value;
  KSt.tbl.filter(function (k) { return (!dv || k.Divisi === dv) && (!jb || k.Jabatan === jb) && (!st || k.Status === st) && (!sk || k.StatusKerja === sk); });
  $('#kChips', el).innerHTML = '<span class="muted">Filter Aktif:</span>' + [['Divisi', dv, 'kDv'], ['Jabatan', jb, 'kJb'], ['Status', st, 'kSt'], ['Status Kerja', sk, 'kSk']].filter(function (x) { return x[1]; }).map(function (x) { return '<span class="chip blue">' + x[0] + ': ' + esc(x[1]) + '<button data-x="' + x[2] + '" aria-label="Hapus filter">' + ic('x', 'ic-sm') + '</button></span>'; }).join('');
  $$('[data-x]', el).forEach(function (b) { b.onclick = function () { $('#' + b.dataset.x, el).value = ''; terapFilterK(el); }; });
}
function muatK(el, force) {
  return swr('karyawanList', 'karyawanList', {}, function (rows) {
    KSt.rows = rows;
    var uniq = function (k) { var o = {}; rows.forEach(function (r) { if (r[k]) o[r[k]] = 1; }); return Object.keys(o).sort(); };
    $('#kDv', el).innerHTML = selectOpts(uniq('Divisi'), $('#kDv', el).value, 'Semua Divisi'); $('#kJb', el).innerHTML = selectOpts(uniq('Jabatan'), $('#kJb', el).value, 'Semua Jabatan');
    var aktif = rows.filter(function (k) { return k.Status === 'Aktif'; }), c = function (s) { return aktif.filter(function (k) { return k.StatusKerja === s; }).length; };
    var lengkap = aktif.filter(function (k) { return k.JumlahDokumen >= 2; }).length, batas = ymd(new Date(Date.now() + 60 * 864e5));
    var habis = aktif.filter(function (k) { return k.TglKontrakBerakhir && k.TglKontrakBerakhir <= batas && k.TglKontrakBerakhir >= ymd(); });
    $('#kStat', el).innerHTML = stat({ acc: 'navy', label: 'Total Karyawan', icon: 'users', val: aktif.length, unit: 'Aktif', meta: '<span>Tetap: <b>' + c('Tetap') + '</b></span><span>Kontrak: <b>' + c('Kontrak') + '</b></span><span>Probasi: <b>' + c('Probasi') + '</b></span>' }) +
      stat({ acc: 'blue', label: 'Akun Google Aktif', icon: 'shield-check', val: aktif.filter(function (k) { return /@/.test(k.Email); }).length, unit: 'terdaftar', meta: '<span class="blue-t">' + ic('link', 'ic-sm') + ' Email pribadi & perusahaan diizinkan</span>' }) +
      stat({ acc: 'blue', label: 'Kelengkapan Dokumen', icon: 'folder-check', val: aktif.length ? Math.round(lengkap / aktif.length * 1000) / 10 + '%' : '0%', unit: 'Lengkap', bar: aktif.length ? lengkap / aktif.length * 100 : 0, meta: '<span>≥2 dokumen terarsip</span><span><b>' + lengkap + '/' + aktif.length + '</b></span>' }) +
      stat({ acc: 'red', label: 'Masa Kontrak Berakhir', icon: 'hourglass', val: '<span class="bad-t">' + habis.length + '</span>', unit: 'Karyawan', meta: '<span class="bad-t">&lt; 60 Hari masa kontrak</span>' });
    KSt.tbl.set(rows); terapFilterK(el);
  }, { fresh: 60000, force: force });
}
function detailKaryawan(el, k) {
  var d = drawer({ head: '<div class="row gap-12">' + avatar(k.Nama, 'lg') + '<div><div class="row"><b style="font-size:18px">' + esc(k.Nama) + '</b>' + (k.Role !== 'KARYAWAN' ? '<span class="tag navy">' + roleLabel(k.Role) + '</span>' : '') + '</div><div class="blue-t">' + esc(k.Jabatan || '-') + '</div><div class="small mono muted">NIK: ' + esc(k.NIK) + '</div></div></div>',
    body: '<div class="tabs"><button class="tab on" data-tab="diri">Data Diri</button><button class="tab" data-tab="dok">Dokumen <span class="count">' + (k.JumlahDokumen || 0) + '</span></button><button class="tab" data-tab="cuti">Cuti</button><button class="tab" data-tab="pay">Payroll</button><button class="tab" data-tab="kpi">KPI</button></div><div id="kdBody" class="mt-16">' + skel(5, 40) + '</div>',
    foot: '<button class="btn btn-sec" id="kdEdit">' + ic('pencil', 'ic-sm') + 'Edit Lengkap</button><button class="btn btn-primary" data-close>Tutup Panel</button>',
    onOpen: async function (dl, dd) {
      $('#kdEdit', dl).onclick = function () { dd.close(); formKaryawan(el, k); };
      var r = await api('karyawanDetail', { id: k.ID }, { silent: true });
      if (!r.success) { $('#kdBody', dl).innerHTML = empty(r.message); return; }
      var x = r.data, kk = x.karyawan, panes = {
        diri: '<div class="note">' + ic('badge-check', 'blue-t') + '<div><b>Akun Google Login</b><div class="small">' + esc(kk.Email) + ' — terhubung dengan Master Database Sheets.</div></div></div><div class="ov mt-16 mb-8">Identitas & Kontak</div><div class="card tint"><div class="card-b tight"><dl class="kv"><dt>WhatsApp</dt><dd class="mono">' + esc(kk.NoWA || '-') + '</dd><dt>Divisi</dt><dd>' + esc(kk.Divisi || '-') + '</dd><dt>Status Kerja</dt><dd>' + esc(kk.StatusKerja || '-') + '</dd><dt>Bergabung</dt><dd>' + tgl(kk.TglBergabung, true) + '</dd><dt>Kontrak s/d</dt><dd>' + (kk.TglKontrakBerakhir ? tgl(kk.TglKontrakBerakhir, true) : '-') + '</dd><dt>Alamat</dt><dd>' + esc(kk.Alamat || '-') + '</dd></dl></div></div>' +
          '<div class="ov mt-16 mb-8">Administrasi Pajak & Rekening</div><div class="grid g-2" style="gap:8px"><div class="card tint"><div class="card-b tight"><div class="small muted">Status PTKP</div><b>' + esc(kk.StatusPTKP || '-') + '</b></div></div><div class="card tint"><div class="card-b tight"><div class="small muted">NPWP</div><b class="mono small">' + esc(kk.NPWP || '-') + '</b></div></div></div>' +
          '<div class="card tint mt-8"><div class="card-b tight row">' + ic('landmark') + '<div class="grow"><div class="small muted">Rekening Payroll</div><b class="mono">' + esc((kk.Bank || '') + ' • ' + (kk.NoRekening || '-')) + '</b></div><div class="right"><div class="small muted">Gaji Pokok</div><b class="num">' + rp(kk.GajiPokok) + '</b></div></div></div>',
        dok: (x.dokumen.length ? x.dokumen.map(function (f) { return '<div class="filerow"><div class="fileico">' + ic('file-text') + '</div><div class="grow"><b class="small">' + esc(f.NamaFile) + '</b><div class="small muted">' + esc(f.JenisDokumen) + ' · ' + tgl(f.TglUpload) + '</div></div>' + pill(f.Status) + '<button class="iconbtn" data-dl="' + f.ID + '">' + ic('external-link', 'ic-sm') + '</button></div>'; }).join('') : empty('Belum ada dokumen.', 'folder')) + '<button class="btn btn-sec btn-sm mt-12" id="kdUp">' + ic('upload', 'ic-sm') + 'Unggah dokumen untuk karyawan ini</button>',
        cuti: '<div class="kvbox"><span>Sisa cuti tahunan</span><b>' + x.cuti.sisa + ' / ' + x.cuti.kuota + ' hari</b></div>' + x.riwayatCuti.reverse().map(function (c) { return '<div class="kvbox"><div><b class="small">' + esc(c.Jenis) + '</b><div class="small muted">' + tgl(c.TglMulai) + ' – ' + tgl(c.TglSelesai) + ' (' + c.JumlahHari + ' hr)</div></div>' + pill(c.Status) + '</div>'; }).join(''),
        pay: x.payroll.length ? x.payroll.map(function (p) { return '<div class="kvbox"><div><b>' + esc(p.Periode) + '</b><div class="small muted">' + p.HariHadir + ' hadir · ' + p.HariAlpa + ' alpa</div></div><div class="right"><b class="num">' + rp(p.GajiBersih) + '</b><div>' + pill(p.StatusSlip) + '</div></div></div>'; }).join('') : empty('Belum ada data payroll.', 'banknote'),
        kpi: (x.kpi.length ? x.kpi.map(function (p) { return '<div class="kvbox"><div><b>' + esc(p.Periode) + '</b><div class="small muted">' + esc(p.Catatan || '') + '</div></div><b class="num blue-t" style="font-size:18px">' + p.SkorKPI + '</b></div>'; }).join('') : empty('Belum ada penilaian KPI.', 'award')) + '<button class="btn btn-sec btn-sm mt-12" id="kdKpi">' + ic('plus', 'ic-sm') + 'Input Penilaian KPI</button>'
      };
      var show = function (t) { $('#kdBody', dl).innerHTML = panes[t];
        $$('[data-dl]', dl).forEach(function (b) { b.onclick = async function () { var rr = await withBusy(b, function () { return api('dokUnduh', { id: b.dataset.dl }); }); if (rr.success) lihatB64(rr.data); else toast(rr.message, 'bad'); }; });
        var up = $('#kdUp', dl); if (up) up.onclick = function () { unggahUntuk(kk); };
        var kp = $('#kdKpi', dl); if (kp) kp.onclick = function () { dd.close(); formKpi(null, kk.ID); };
      };
      $$('[data-tab]', dl).forEach(function (t) { t.onclick = function () { $$('[data-tab]', dl).forEach(function (x) { x.classList.toggle('on', x === t); }); show(t.dataset.tab); }; });
      show('diri');
    } });
}
function unggahUntuk(k) {
  modal({ title: 'Unggah Dokumen — ' + k.Nama, body: '<div class="field"><label>Jenis</label><select class="select" name="jenis">' + selectOpts(['KTP', 'NPWP', 'Kartu Keluarga', 'Ijazah', 'Transkrip', 'Sertifikat', 'BPJS', 'Kontrak Kerja', 'Lainnya'], 'Kontrak Kerja') + '</select></div><div class="field mt-12"><label>Berkas (PDF/JPG/PNG)</label><input type="file" id="uF" accept=".pdf,.jpg,.jpeg,.png" multiple></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Unggah', cls: 'btn-primary', act: async function (m) { var fs = Array.prototype.slice.call($('#uF', m.el).files); if (!fs.length) { toast('Pilih berkas.', 'warn'); return false; } var j = $('[name=jenis]', m.el).value, files = []; for (var i = 0; i < fs.length; i++) { var f = await fileToB64(fs[i], 10); f.jenis = j; files.push(f); } var r = await api('dokUpload', { idKaryawan: k.ID, files: files }); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) cacheBust(['karyawanList', 'dokList']); return r.success; } }] });
}
function formKaryawan(el, k) {
  k = k || {}; var baru = !k.ID;
  modal({ title: baru ? 'Tambah Karyawan' : 'Edit Data ' + k.Nama, sub: 'Email Google dipakai untuk login — boleh email pribadi (Gmail, dsb).', size: 'lg',
    body: '<form class="fgrid" id="fk">' +
      '<div class="field"><label>NIK Karyawan <span class="req">*</span></label><input class="input mono" name="NIK" value="' + esc(k.NIK || '') + '"></div><div class="field"><label>Nama Lengkap <span class="req">*</span></label><input class="input" name="Nama" value="' + esc(k.Nama || '') + '"></div>' +
      '<div class="field"><label>Email Google Login <span class="req">*</span></label><input class="input" type="email" name="Email" value="' + esc(k.Email || '') + '"><span class="hint">Karyawan masuk dengan akun Google ini</span></div><div class="field"><label>No. WhatsApp</label><input class="input mono" name="NoWA" inputmode="tel" value="' + esc(k.NoWA || '') + '"></div>' +
      '<div class="field"><label>Divisi</label><input class="input" name="Divisi" list="dlDiv" value="' + esc(k.Divisi || '') + '"><datalist id="dlDiv">' + Object.keys((KSt.rows || []).reduce(function (o, r) { if (r.Divisi) o[r.Divisi] = 1; return o; }, {})).map(function (d) { return '<option value="' + esc(d) + '">'; }).join('') + '</datalist></div><div class="field"><label>Jabatan</label><input class="input" name="Jabatan" value="' + esc(k.Jabatan || '') + '"></div>' +
      '<div class="field"><label>Peran Akses</label><select class="select" name="Role"' + (isSA() ? '' : ' disabled') + '>' + selectOpts([{ v: 'KARYAWAN', l: 'Karyawan' }, { v: 'STAFF_HRD', l: 'Staff HRD' }, { v: 'SUPER_ADMIN', l: 'Super Admin' }], k.Role || 'KARYAWAN') + '</select></div><div class="field"><label>Status Kerja</label><select class="select" name="StatusKerja">' + selectOpts(['Tetap', 'Kontrak', 'Probasi'], k.StatusKerja || 'Tetap') + '</select></div>' +
      '<div class="field"><label>Tanggal Bergabung</label><input class="input" type="date" name="TglBergabung" value="' + esc(k.TglBergabung || ymd()) + '"></div><div class="field"><label>Kontrak Berakhir (PKWT)</label><input class="input" type="date" name="TglKontrakBerakhir" value="' + esc(k.TglKontrakBerakhir || '') + '"></div>' +
      '<div class="field"><label>Gaji Pokok (Rp)</label><input class="input mono" name="GajiPokok" inputmode="numeric" value="' + esc(k.GajiPokok || '') + '"></div><div class="field"><label>Tunjangan Tetap (Rp)</label><input class="input mono" name="Tunjangan" inputmode="numeric" value="' + esc(k.Tunjangan || '') + '"></div>' +
      '<div class="field"><label>Status PTKP</label><select class="select" name="StatusPTKP">' + selectOpts(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'], k.StatusPTKP || 'TK/0') + '</select></div><div class="field"><label>NPWP</label><input class="input mono" name="NPWP" value="' + esc(k.NPWP || '') + '"></div>' +
      '<div class="field"><label>Bank</label><input class="input" name="Bank" value="' + esc(k.Bank || '') + '"></div><div class="field"><label>No. Rekening</label><input class="input mono" name="NoRekening" value="' + esc(k.NoRekening || '') + '"></div>' +
      '<div class="field"><label>Kuota Cuti Tahunan</label><input class="input mono" name="KuotaCuti" inputmode="numeric" value="' + esc(k.KuotaCuti || 12) + '"></div><div class="field full"><label>Alamat</label><textarea class="textarea" name="Alamat" rows="2">' + esc(k.Alamat || '') + '</textarea></div></form>',
    foot: [{ label: 'Batal', close: true }].concat(!baru && isSA() ? [{ label: k.Status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan', cls: k.Status === 'Aktif' ? 'btn-danger-o' : 'btn-sec', act: async function () { var r = await api('karyawanStatus', { id: k.ID, status: k.Status === 'Aktif' ? 'Nonaktif' : 'Aktif' }); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatK(el, true); return r.success; } }] : [])
      .concat([{ label: baru ? 'Simpan Karyawan' : 'Simpan Perubahan', cls: 'btn-primary', act: async function (m) {
        var v = formVals($('#fk', m.el)); if (!isSA()) delete v.Role; if (!baru) v.ID = k.ID;
        var r = await api('karyawanSave', v); toast(r.message, r.success ? 'ok' : 'bad');
        if (r.success) { cacheBust(['karyawanList', 'adminDashboard']); muatK(el, true); }
        return r.success;
      } }]) });
}

/* ============================================================ ABSENSI ADMIN */
var AA = {};
registerPage('absensi-admin', {
  auth: 'hrd', title: 'Kelola Absensi', menu: 'absensi-admin',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Absensi', 'Kelola Absensi & QR'], title: 'Kelola Absensi & Validasi Lokasi', sub: '<span id="aaMod"></span> <span class="pill">' + ic('shield', 'ic-sm') + 'Super Admin / Staff HRD</span>',
      actions: '<button class="btn btn-sec" id="aaExp">' + ic('sheet', 'ic-sm') + 'Export Log (.xlsx)</button><button class="btn btn-sec" id="aaKios">' + ic('maximize', 'ic-sm') + 'Mode Kios Layar Penuh</button><button class="btn btn-primary" id="aaMan">' + ic('calendar-plus', 'ic-sm') + 'Absen Manual / Penyesuaian</button>' }) +
      '<div class="grid g-5" id="aaStat">' + skel(1, 110) + '</div>' +
      '<div class="tabs boxed mt-16"><button class="tab on" data-tab="qr">' + ic('scan-qr-code') + 'Absensi QR & Geofencing</button><button class="tab" data-tab="rekap">' + ic('grid-3x3') + 'Rekap Matriks Bulanan (H/T/I/S/A)</button><button class="tab" data-tab="import">' + ic('fingerprint') + 'Import Log Fingerprint</button><button class="tab" data-tab="lokasi">' + ic('users') + 'Lokasi Pegawai <span class="count" id="lkN" hidden>0</span></button>' + (isSA() ? '<button class="tab" data-tab="konfig">' + ic('map-pin') + 'Konfigurasi Radius & Koordinat ' + ic('lock', 'ic-sm') + '</button>' : '') + '</div>' +
      '<div data-pane="qr" class="mt-16"><div class="grid g-main-l"><div class="stack"><div class="card"><div class="card-h"><div><h3>QR Code Hari Ini</h3><p class="sub">Token terenkripsi, berganti otomatis tiap hari & anti-titip</p></div><span class="avatar" style="border-radius:6px">' + ic('shield') + '</span></div><div class="card-b print-area" id="aaQr">' + skel(1, 220) + '</div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Validasi Radius Geofencing</h3><p class="sub">Parameter koordinat presisi tinggi GPS</p></div><span class="pill info">LOCK OK</span></div><div class="card-b" id="aaGeo"></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Live Audit Log Absensi <span class="chip blue small">Sheets Live Link</span></h3><p class="sub">Pencatatan verifikasi lokasi satelit, metode, dan token — diperbarui otomatis saat halaman terbuka</p></div><button class="iconbtn" id="aaRef" title="Muat ulang">' + ic('refresh-cw') + '</button></div><div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="aaQ" placeholder="Cari nama karyawan, NIK…"></div><select class="select soft" id="aaSt">' + selectOpts(['Valid', 'Terlambat'], '', 'Semua Status') + '</select><select class="select soft" id="aaDv"></select></div></div><div class="card-b flush" id="aaLog"></div><div id="aaAnom"></div></div></div></div>' +
      '<div data-pane="rekap" hidden class="mt-16"><div class="card"><div class="card-h"><div><h3>Rekap Matriks Kehadiran</h3><p class="sub">H = Hadir, T = Terlambat, I = Izin/Cuti, S = Sakit, A = Alpa (hari kerja)</p></div><div class="row"><input class="input" type="month" id="rkB" style="width:auto"><button class="btn btn-sec btn-sm" id="rkX">' + ic('download', 'ic-sm') + 'Excel</button></div></div><div class="card-b flush" id="rkT"></div></div></div>' +
      '<div data-pane="import" hidden class="mt-16" id="fpPane"></div>' +
      '<div data-pane="lokasi" hidden class="mt-16" id="lkPane"></div>' +
      '<div data-pane="konfig" hidden class="mt-16" id="kfPane"></div>';
  },
  init: function (el) {
    bindTabs(el, function (t) { if (t === 'rekap') muatRekap(el); if (t === 'import') paneImport(el); if (t === 'konfig') paneKonfig(el); if (t === 'lokasi') paneLokasi(el); });
    AA.tbl = Table($('#aaLog', el), { key: 'id', per: 10, unit: 'data tercatat hari ini', search: function (r) { return r.nama + ' ' + r.nik + ' ' + r.divisi; }, cols: [
      { k: 'jam', label: 'Waktu Masuk', render: function (r) { return '<span class="mono ' + (r.telat ? 'bad-t' : '') + '">' + esc(r.jam) + '</span> <span class="small muted">WIB</span>' + (r.keluar ? '<span class="t2 mono">pulang ' + esc(r.keluar) + '</span>' : ''); } },
      { k: 'nama', label: 'Karyawan & Identitas', render: function (r) { return userCell(r.nama, 'NIK: ' + r.nik); } },
      { k: 'divisi', label: 'Divisi' },
      { k: 'jarak', label: 'Jarak GPS', cls: 'n', render: function (r) { return r.jarak === '' ? '-' : '<b class="mono ' + (r.jarak > (AA.radius || 50) ? 'bad-t' : '') + '">' + r.jarak + '</b> m'; } },
      { k: 'akurasi', label: 'Akurasi', cls: 'n', render: function (r) { return r.akurasi === '' ? '<span class="small muted">Mesin FP</span>' : '<span class="mono small">±' + r.akurasi + 'm</span>'; } },
      { k: 'metode', label: 'Metode Masuk', render: function (r) { return '<span class="row small">' + ic(/Finger/.test(r.metode) ? 'fingerprint' : /Manual/.test(r.metode) ? 'pencil' : /Selfie/.test(r.metode) ? 'camera' : 'scan-qr-code', 'ic-sm blue-t') + esc(r.metode) + '</span>'; } },
      { k: 'foto', label: 'Foto', sort: false, render: function (r) { return (r.foto ? '<button class="foto-btn" data-foto="masuk" title="Lihat selfie masuk">' + ic('camera', 'ic-sm') + 'Masuk</button> ' : '') + (r.fotoPulang ? '<button class="foto-btn" data-foto="pulang" title="Lihat selfie pulang">' + ic('camera', 'ic-sm') + 'Pulang</button>' : '') || '<span class="small muted">-</span>'; } },
      { k: 'status', label: 'Status', render: function (r) { return r.telat ? pill('Terlambat', 'Terlambat +' + r.telat + 'm', false) : pill('Valid', 'Tepat Waktu', false); } }] });
    $('#aaLog', el).addEventListener('click', async function (e) {
      var b = e.target.closest('[data-foto]'); if (!b) return;
      var tr = b.closest('tr[data-id]'), row = (AA.data && AA.data.log || []).filter(function (x) { return String(x.id) === tr.dataset.id; })[0] || {};
      var r = await withBusy(b, function () { return api('absenFoto', { id: tr.dataset.id, jenis: b.dataset.foto }, { silent: true }); });
      if (!r.success) return toast(r.message, 'bad');
      r.data.info = (row.nama || '') + ' · ' + (b.dataset.foto === 'pulang' ? 'pulang ' + (row.keluar || '') : 'masuk ' + (row.jam || '')) + ' WIB';
      lihatFoto(r.data, 'Selfie ' + (b.dataset.foto === 'pulang' ? 'Pulang' : 'Masuk'));
    });
    $('#aaQ', el).oninput = debounce(function () { AA.tbl.search($('#aaQ', el).value); }, 250);
    var fl = function () { var s = $('#aaSt', el).value, dv = $('#aaDv', el).value; AA.tbl.filter(function (r) { return (!s || (s === 'Terlambat' ? r.telat : !r.telat)) && (!dv || r.divisi === dv); }); };
    $('#aaSt', el).onchange = fl; $('#aaDv', el).onchange = fl;
    $('#aaRef', el).onclick = function () { withBusy(this, function () { return muatAA(el, true); }); };
    $('#aaExp', el).onclick = function () { exportXlsx('Log_Absensi_' + ymd(), { Log: AA.tbl.view().map(function (r) { return { Masuk: r.jam, Pulang: r.keluar, NIK: r.nik, Nama: r.nama, Divisi: r.divisi, 'Jarak (m)': r.jarak, Akurasi: r.akurasi, Metode: r.metode, Status: r.status, 'Telat (mnt)': r.telat, Selfie: r.foto ? 'Ada' : '' }; }) }); };
    $('#aaKios', el).onclick = function () { modeKios(); };
    $('#aaMan', el).onclick = function () { absenManual(el); };
  },
  show: function (el, param) {
    if (param === 'import') { var t = $('[data-tab="import"]', el); if (t) t.click(); }
    muatAA(el);
    poll('absAdmin', function () { return muatAA(el, true).then(function (r) { return r && r.success ? hashStr(JSON.stringify(r.data.log)) : ''; }); }, 20000);
  },
  hide: function () { stopPoll('absAdmin'); }
});
function muatAA(el, force) {
  return swr('absensiAdmin', 'absensiAdmin', {}, function (d) {
    AA.data = d; AA.radius = d.cfg.radius;
    $('#aaMod', el).innerHTML = (d.cfg.modulQR ? '<span class="pill info dot">MODUL QR DINAMIS: AKTIF</span>' : '<span class="pill warn dot">MODUL QR: NONAKTIF' + (d.cfg.modulSelfie ? '' : ' (mode fingerprint)') + '</span>') + (d.cfg.modulSelfie ? ' <span class="pill info dot">SELFIE' + (d.cfg.selfieWajib ? ' (WAJIB)' : '') + ': AKTIF</span>' : '');
    var pct = d.total ? Math.round(d.tepat / d.total * 1000) / 10 : 0;
    $('#aaStat', el).innerHTML = stat({ label: 'Terjadwal Hari Ini', icon: 'calendar', val: d.total, meta: '<span>Pegawai aktif terdaftar shift</span>' }) +
      stat({ acc: 'blue', label: 'Hadir Tepat Waktu', val: d.tepat, unit: pct + '%', bar: pct, meta: '<span>Toleransi ' + esc(d.cfg.jamMasuk) + ' +' + d.cfg.toleransi + 'm</span>' }) +
      stat({ label: 'Terlambat', icon: 'timer', val: d.terlambat, unit: d.terlambat ? 'Avg ' + Math.round(d.menitTelat / d.terlambat) + 'm' : '', meta: '<span>Akumulasi: ' + d.menitTelat + ' menit</span>' }) +
      stat({ label: 'Izin / Cuti Sah', icon: 'calendar-check', val: d.cuti, badge: '<span class="pill info">Tervalidasi</span>', meta: '<span>Cuti disetujui HRD</span>' }) +
      stat({ acc: 'red', label: 'Belum Absen / Anomali', icon: 'map-pin-off', val: '<span class="bad-t">' + d.belum.length + '</span>', unit: d.anomali.length ? d.anomali.length + ' ditolak sistem' : '', meta: '<span>' + d.belum.slice(0, 2).map(function (b) { return esc(b.nama); }).join(', ') + (d.belum.length > 2 ? ' +' + (d.belum.length - 2) : '') + '</span>' });
    var dvs = {}; d.log.forEach(function (r) { if (r.divisi) dvs[r.divisi] = 1; });
    $('#aaDv', el).innerHTML = selectOpts(Object.keys(dvs), $('#aaDv', el).value, 'Semua Divisi');
    AA.tbl.set(d.log);
    $('#aaAnom', el).innerHTML = (d.anomali.length ? '<div class="card-b" style="border-top:1px solid var(--line)"><div class="ov mb-8 bad-t">Percobaan Presensi Ditolak Sistem Hari Ini</div>' + d.anomali.slice(-8).reverse().map(function (a) { return '<div class="valid-item bad">' + ic('shield-x', 'bad-t') + '<div class="small"><b>' + esc(a.email) + '</b> · ' + jam(a.waktu) + '<div class="muted">' + esc(a.detail) + '</div></div></div>'; }).join('') + '</div>' : '') +
      '<div class="card-f"><span><span class="dotlive" style="background:var(--blue)"></span>Sinkron otomatis saat tab terbuka · LockService aktif</span><span>Total: ' + d.log.length + ' data tercatat hari ini</span></div>';
    if (d.qrHarian) {
      qrSvg(d.qrHarian, 8).then(function (svg) {
        var sisa = function () { var n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; return [Math.floor(m / 3600e3), Math.floor(m / 60e3) % 60, Math.floor(m / 1e3) % 60].map(function (x) { return String(x).padStart(2, '0'); }).join(':'); };
        $('#aaQr', el).innerHTML = '<div class="qrbox" id="aaQrSvg">' + svg + '</div><div class="card tint mt-16"><div class="card-b tight"><div class="row between"><span class="ov">Token Identifier</span><span class="small blue-t strong">HMAC-SHA256</span></div><div class="row between"><b class="mono small" style="word-break:break-all">' + esc(d.qrHarian) + '</b><button class="iconbtn" id="aaCopy" title="Salin">' + ic('copy', 'ic-sm') + '</button></div></div></div>' +
          '<div class="row between mt-12 small"><span class="row">' + ic('refresh-cw', 'ic-sm blue-t') + 'Rotasi token berikutnya dalam:</span><b class="mono chip" id="aaCd">' + sisa() + '</b></div><div class="grid g-2 mt-12" style="gap:8px"><button class="btn btn-sec btn-sm" id="aaPrint">' + ic('printer', 'ic-sm') + 'Cetak Poster QR</button><button class="btn btn-sec btn-sm" id="aaSvg">' + ic('download', 'ic-sm') + 'Unduh SVG</button></div>';
        stopPoll('qrcd'); App.timers.qrcd = setInterval(function () { var c = $('#aaCd', el); if (c) c.textContent = sisa(); else stopPoll('qrcd'); }, 1000);
        $('#aaCopy', el).onclick = function () { navigator.clipboard.writeText(d.qrHarian).then(function () { toast('Token disalin.'); }); };
        $('#aaSvg', el).onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); a.download = 'QR_Absensi_' + d.tanggal + '.svg'; a.click(); };
        $('#aaPrint', el).onclick = function () { var w = window.open('', '_blank'); w.document.write('<html><head><title>Poster QR Absensi</title><style>body{font-family:Inter,Arial;text-align:center;padding:40px}svg{width:70vmin;height:70vmin}h1{margin:0 0 8px}</style></head><body><h1>Presensi ' + esc(perusahaan()) + '</h1><p>Pindai dengan menu Absensi di SIM HRD · Berlaku ' + tglHari(d.tanggal) + '</p>' + svg + '<p style="font-family:monospace">' + esc(d.qrHarian) + '</p><p>Lokasi: ' + esc(d.cfg.kantor.nama) + ' · radius ' + d.cfg.radius + ' m</p></body></html>'); w.document.close(); setTimeout(function () { w.print(); }, 400); };
      });
    } else $('#aaQr', el).innerHTML = d.tanggal && d.tanggal !== ymd() ? empty('QR hanya tersedia untuk hari ini.', 'qr-code') : empty('Token QR belum dimuat — periksa koneksi ke Apps Script lalu tekan muat ulang.', 'qr-code');
    $('#aaGeo', el).innerHTML = '<div class="row top gap-12">' + ic('map-pin', 'blue-t') + '<div><b>' + esc(d.cfg.kantor.nama) + '</b></div></div><div class="grid g-2 mt-12" style="gap:8px"><div class="card tint"><div class="card-b tight"><div class="ov">Koordinat Lat/Long</div><b class="mono small">' + d.cfg.kantor.lat + ',<br>' + d.cfg.kantor.lng + '</b></div></div><div class="card tint"><div class="card-b tight"><div class="ov">Toleransi Radius</div><b class="mono blue-t">' + d.cfg.radius + ' Meter</b></div></div></div>' +
      '<div class="radar mt-12">' + radarSvg(Math.round(d.cfg.radius * .4), d.cfg.radius, true).replace('Anda (', 'Contoh (') + '</div><a class="small mt-8" style="display:inline-block" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + d.cfg.kantor.lat + ',' + d.cfg.kantor.lng + '">Lihat di Google Maps →</a>';
  }, { fresh: 15000, force: force });
}
async function modeKios() {
  var d = AA.data; if (!d || !d.kioskSeed) return toast('Seed QR belum tersedia.', 'warn');
  await loadQR();
  var k = document.createElement('div'); k.className = 'kiosk';
  k.innerHTML = '<div class="row gap-12"><div class="logo">' + ic('building-2') + '</div><b style="font-size:20px">Presensi ' + esc(perusahaan()) + '</b></div><div class="qrbox" id="kQr"></div><div><div class="clock" id="kJam"></div><div style="color:#AEB6C8">' + tglHari(d.tanggal) + ' · QR berganti tiap 20 detik · radius ' + d.cfg.radius + ' m</div></div><button class="btn btn-sec" id="kOut">' + ic('minimize', 'ic-sm') + 'Keluar Mode Kios (Esc)</button>';
  document.body.appendChild(k);
  try { if (k.requestFullscreen) k.requestFullscreen(); } catch (e) { }
  var last = -1;
  async function tick() {
    var n = new Date(); $('#kJam', k).textContent = [n.getHours(), n.getMinutes(), n.getSeconds()].map(function (x) { return String(x).padStart(2, '0'); }).join(':');
    var slot = Math.floor(Date.now() / 20000); if (slot === last) return; last = slot;
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d.kioskSeed + '|' + slot));
    var sig = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').slice(0, 12);
    $('#kQr', k).innerHTML = await qrSvg('K-' + d.ymd + '-' + slot + '-' + sig, 10);
  }
  tick(); var iv = setInterval(tick, 1000);
  function tutup() { clearInterval(iv); k.remove(); document.removeEventListener('keydown', esc1); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { } }
  function esc1(e) { if (e.key === 'Escape') tutup(); }
  document.addEventListener('keydown', esc1); $('#kOut', k).onclick = tutup;
}
async function absenManual(el) {
  var list = cacheGet('karyawanList'); if (!list) { var r = await api('karyawanList'); list = r.success ? r.data : []; if (r.success) cacheSet('karyawanList', r.data); }
  list = list.filter(function (k) { return k.StatusKerja !== 'Akun Admin'; });
  modal({ title: 'Absen Manual / Penyesuaian', sub: 'Tercatat di audit log dengan nama Anda. Gunakan untuk perangkat bermasalah atau koreksi.',
    body: '<div class="col gap-12"><div class="field"><label>Karyawan</label><select class="select" name="nik">' + selectOpts(list.filter(function (k) { return k.Status === 'Aktif'; }).map(function (k) { return { v: k.NIK, l: k.Nama + ' · ' + k.NIK }; }), '', 'Pilih karyawan…') + '</select></div>' +
      '<div class="grid g-3" style="gap:10px"><div class="field"><label>Tanggal</label><input class="input" type="date" name="tanggal" value="' + ymd() + '"></div><div class="field"><label>Jam Masuk</label><input class="input" type="time" name="masuk" value="08:00"></div><div class="field"><label>Jam Pulang</label><input class="input" type="time" name="keluar"></div></div>' +
      '<div class="field"><label>Alasan Penyesuaian <span class="req">*</span></label><textarea class="textarea" name="alasan" rows="2" placeholder="mis. kamera HP rusak, diverifikasi satpam"></textarea></div></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Simpan Presensi', cls: 'btn-primary', act: async function (m) { var r = await api('absenManual', formVals(m.el)); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatAA(el, true); return r.success; } }] });
}
function muatRekap(el) {
  var inp = $('#rkB', el); if (!inp.value) inp.value = ymd().slice(0, 7);
  inp.onchange = function () { muatRekap(el); };
  $('#rkT', el).innerHTML = '<div class="card-b">' + skel(6, 28) + '</div>';
  swr('rekap:' + inp.value, 'absensiRekap', { bulan: inp.value }, function (d) {
    AA.rekap = d;
    $('#rkT', el).innerHTML = '<div class="tbl-wrap"><table class="tbl compact matrix"><thead><tr><th style="text-align:left">Karyawan</th>' + d.hariKerja.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '<th>H</th><th>T</th><th>I</th><th>S</th><th>A</th></tr></thead><tbody>' +
      (d.rows.length ? d.rows.map(function (r) { return '<tr><td style="text-align:left;min-width:170px"><b class="small">' + esc(r.nama) + '</b><span class="t2 mono">' + esc(r.nik) + '</span></td>' + d.hariKerja.map(function (h) { var c = r.hari[h] || ''; return '<td class="m-' + c + '">' + c + '</td>'; }).join('') + ['H', 'T', 'I', 'S', 'A'].map(function (x) { return '<td class="m-' + x + '"><b>' + r[x] + '</b></td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="99">' + empty('Tidak ada data.') + '</td></tr>') + '</tbody></table></div>';
  }, { fresh: 120000 });
  $('#rkX', el).onclick = function () { var d = AA.rekap; if (!d) return; exportXlsx('Rekap_Matriks_' + d.bulan, { Rekap: d.rows.map(function (r) { var o = { NIK: r.nik, Nama: r.nama, Divisi: r.divisi }; d.hariKerja.forEach(function (h) { o[h] = r.hari[h] || ''; }); ['H', 'T', 'I', 'S', 'A'].forEach(function (x) { o[x] = r[x]; }); o['Menit Telat'] = r.menit; return o; }) }); };
}

/* ---------- Import fingerprint (US-06) */
function paneImport(el) {
  var p = $('#fpPane', el); if (p.dataset.ok) return; p.dataset.ok = 1;
  var st = { step: 1, rows: [], head: [], map: {}, nama: '' };
  p.innerHTML = '<div class="page-head" style="margin-bottom:12px"><div><h1 style="font-size:22px">Import Log Mesin Fingerprint</h1><p class="sub">Sinkronisasi kehadiran mesin biometrik offline (.xlsx / .csv) ke sheet <span class="chip mono">Absensi_Fingerprint</span>. Dipakai sebagai sumber payroll & KPI bila modul QR nonaktif.</p></div><div class="actions"><button class="btn btn-sec btn-sm" id="fpTpl">' + ic('download', 'ic-sm') + 'Unduh Format Template (.xlsx)</button></div></div>' +
    '<div class="card"><div class="card-b stepper" id="fpStep"></div></div><div id="fpBody" class="mt-16"></div>';
  $('#fpTpl', p).onclick = function () { exportXlsx('Template_Import_Fingerprint', { Log: [{ NIK: '0012', Tanggal: '2026-09-19', 'Jam Masuk': '08:02', 'Jam Pulang': '17:05', Mesin: 'Solution X100 Lobi' }] }); };
  function steps() {
    $('#fpStep', p).innerHTML = [['Berkas Terunggah', st.nama || 'Pilih berkas .xlsx/.csv'], ['Pemetaan & Validasi Kolom', st.step >= 2 ? Object.keys(st.map).filter(function (k) { return st.map[k]; }).length + '/5 kolom terpetakan' : 'Menunggu'], ['Impor ke Database', st.hasil ? 'Selesai' : 'Menunggu']].map(function (s, i) {
      var n = i + 1; return '<div class="s ' + (st.step > n ? 'done' : st.step === n ? 'on' : '') + '"><span class="n">' + (st.step > n ? ic('check') : n) + '</span><div class="grow"><div class="ov" style="color:inherit">Langkah 0' + n + '</div><b class="small">' + s[0] + '</b><div class="small muted ellip">' + esc(s[1]) + '</div></div></div>'; }).join('');
  }
  function langkah1() {
    st.step = 1; steps();
    $('#fpBody', p).innerHTML = '<div class="grid g-main"><div class="card"><div class="card-b"><div class="dropzone" id="fpDz" style="padding:40px"><div class="ico">' + ic('file-spreadsheet') + '</div><b>Tarik & lepas berkas ekspor mesin fingerprint</b><div class="small muted mt-8">Format .xlsx, .xls, atau .csv · hingga 20.000 baris per impor</div></div></div></div><div class="card"><div class="card-h"><h3>' + ic('history') + 'Riwayat Import Terakhir</h3></div><div class="card-b" id="fpRiw">' + skel(3, 40) + '</div></div></div>';
    dropzone($('#fpDz', p), async function (files) {
      var f = files[0]; st.nama = f.name;
      try { await loadXLSX(); var wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }); var ws = wb.Sheets[wb.SheetNames[0]]; var arr = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
        if (!arr.length) return toast('Berkas kosong.', 'bad'); st.rows = arr; st.head = Object.keys(arr[0]); tebakMap(); langkah2(); } catch (e) { toast('Gagal membaca berkas: ' + e.message, 'bad'); }
    }, '.xlsx,.xls,.csv');
    api('fpRiwayat', {}, { silent: true }).then(function (r) { $('#fpRiw', p).innerHTML = r.success && r.data.length ? r.data.map(function (x) { return '<div class="kvbox"><div><b class="small">' + esc(x.detail.split(':')[0]) + '</b><div class="small muted">' + tglJam(x.waktu) + ' · ' + esc(x.oleh) + '</div></div>' + pill('Selesai', 'Sukses Sinkron') + '</div>'; }).join('') : empty('Belum ada riwayat impor.', 'history'); });
  }
  function tebakMap() {
    var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z]/g, ''); }, cari = function (al) { return st.head.filter(function (h) { return al.some(function (a) { return norm(h).indexOf(a) > -1; }); })[0] || ''; };
    st.map = { nik: cari(['nik', 'nip', 'pin', 'employee', 'id']), tanggal: cari(['tanggal', 'date', 'tgl']), masuk: cari(['masuk', 'checkin', 'in', 'datang']), keluar: cari(['pulang', 'keluar', 'checkout', 'out']), mesin: cari(['mesin', 'device', 'lokasi']) };
  }
  function susun() { return st.rows.map(function (r) { return { nik: r[st.map.nik], tanggal: r[st.map.tanggal], masuk: st.map.masuk ? r[st.map.masuk] : '', keluar: st.map.keluar ? r[st.map.keluar] : '', mesin: st.map.mesin ? r[st.map.mesin] : '' }; }); }
  async function langkah2() {
    st.step = 2; st.hasil = null; steps();
    var sel = function (k, l, req) { return '<div class="card tint"><div class="card-b tight"><div class="row between"><b>' + l + (req ? ' <span class="req">*</span>' : ' <span class="small muted">(opsional)</span>') + '</b>' + (st.map[k] ? '<span class="small blue-t">' + ic('circle-check', 'ic-sm') + 'Terpetakan</span>' : '<span class="small warn-t">Belum</span>') + '</div><select class="select mt-8" data-m="' + k + '">' + selectOpts(st.head, st.map[k], '— pilih kolom Excel —') + '</select></div></div>'; };
    $('#fpBody', p).innerHTML = '<div class="card"><div class="card-b row between wrap"><div class="row gap-12"><div class="fileico" style="background:var(--blue-1);color:var(--blue)">' + ic('file-spreadsheet') + '</div><div><b>' + esc(st.nama) + '</b> <span class="pill info">File Siap Dipetakan</span><div class="small muted">' + st.rows.length.toLocaleString('id-ID') + ' baris terbaca</div></div></div><button class="btn btn-sec btn-sm" id="fpGanti">' + ic('arrow-left-right', 'ic-sm') + 'Ganti File</button></div></div>' +
      '<div class="grid g-2 mt-16"><div class="stack"><div class="card"><div class="card-h"><h3>' + ic('network') + 'Pemetaan Kolom Excel</h3><span class="chip">5 target</span></div><div class="card-b col">' + sel('nik', 'NIK Karyawan', 1) + sel('tanggal', 'Tanggal Presensi', 1) + sel('masuk', 'Jam Masuk (Tap In)', 1) + sel('keluar', 'Jam Pulang (Tap Out)') + sel('mesin', 'Lokasi Mesin / Device') + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('git-merge') + 'Kebijakan Data Duplikat</h3></div><div class="card-b col"><label class="opt"><input type="radio" name="fpK" value="lewati" checked><div><b>Lewati baris yang sudah ada</b> <span class="small blue-t">Rekomendasi</span><div class="small muted">Mencegah menimpa log yang sudah tervalidasi HRD.</div></div></label><label class="opt"><input type="radio" name="fpK" value="timpa"><div><b>Timpa dengan data terbaru</b><div class="small muted">Memperbarui jam masuk & pulang dari berkas ini.</div></div></label>' +
      '<label class="check mt-8"><input type="checkbox" id="fpAlert" checked><span>Kirim email alert ke HRD bila ada NIK tidak terdaftar</span></label></div></div></div>' +
      '<div class="stack"><div id="fpAnom"></div><div class="card"><div class="card-h"><div><h3>' + ic('eye') + 'Pratinjau & Validasi</h3><p class="sub">Simulasi validasi (dry-run) sebelum commit ke database</p></div><button class="btn btn-sec btn-sm" id="fpCek">' + ic('scan-search', 'ic-sm') + 'Validasi Ulang</button></div><div class="card-b flush" id="fpPrev"></div></div></div></div>' +
      '<div class="formbar mt-16" style="border-radius:8px"><div class="in"><b>Status Rekonsiliasi:</b><span id="fpRing" class="small">–</span><span class="grow"></span><button class="btn btn-sec" id="fpBatal">Batal</button><button class="btn btn-primary" id="fpGo" disabled>' + ic('cloud-upload', 'ic-sm') + 'Mulai Sinkronisasi & Impor</button></div></div>';
    $('#fpGanti', p).onclick = langkah1; $('#fpBatal', p).onclick = langkah1;
    $$('[data-m]', p).forEach(function (s) { s.onchange = function () { st.map[s.dataset.m] = s.value; langkah2(); }; });
    $('#fpCek', p).onclick = function () { validasi(); };
    $('#fpGo', p).onclick = async function () {
      var r = await aksi(this, 'fpImport', { rows: susun(), namaFile: st.nama, kebijakan: $('[name=fpK]:checked', p).value, alertEmail: $('#fpAlert', p).checked }, { bust: ['absensiAdmin', 'adminDashboard'] });
      if (r.success) { st.hasil = r.data; st.step = 4; steps(); $('#fpBody', p).innerHTML = '<div class="card"><div class="card-b center"><div style="width:56px;height:56px;border-radius:12px;background:var(--ok-bg);color:var(--ok);display:flex;align-items:center;justify-content:center;margin:6px auto 12px">' + ic('circle-check', 'ic-lg') + '</div><h2 style="margin:0">Impor Selesai</h2><p class="muted">' + esc(r.message) + '</p><button class="btn btn-primary" id="fpLagi">Impor Berkas Lain</button></div></div>'; $('#fpLagi', p).onclick = langkah1; }
    };
    validasi();
  }
  async function validasi() {
    if (!st.map.nik || !st.map.tanggal || !st.map.masuk) { $('#fpPrev', p).innerHTML = '<div class="card-b">' + empty('Petakan kolom NIK, Tanggal, dan Jam Masuk terlebih dahulu.', 'network') + '</div>'; $('#fpGo', p).disabled = true; return; }
    $('#fpPrev', p).innerHTML = '<div class="card-b">' + skel(5, 28) + '</div>';
    var r = await api('fpImport', { rows: susun(), dryRun: true, namaFile: st.nama }, { silent: true });
    if (!r.success) { $('#fpPrev', p).innerHTML = '<div class="card-b">' + empty(r.message, 'circle-alert') + '</div>'; return; }
    var h = r.data, anom = {}; h.anomali.forEach(function (a) { anom[a.baris] = a.alasan; });
    $('#fpAnom', p).innerHTML = h.jumlahAnomali ? '<div class="note bad">' + ic('triangle-alert') + '<div><b>' + h.jumlahAnomali + ' Anomali Ditemukan</b><div class="small">' + esc(h.anomali.slice(0, 3).map(function (a) { return 'Baris #' + a.baris + ' NIK ' + a.nik + ': ' + a.alasan; }).join(' · ')) + '. Baris ini akan dilewati agar integritas relasi terjaga.</div></div></div>' : '<div class="note ok">' + ic('circle-check') + '<div>Semua NIK cocok dengan Master Karyawan.</div></div>';
    $('#fpPrev', p).innerHTML = '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Baris</th><th>NIK</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr></thead><tbody>' + susun().slice(0, 8).map(function (x, i) { var bad = anom[i + 2]; return '<tr class="' + (bad ? 'danger' : '') + '"><td class="mono muted">#' + (i + 1) + '</td><td class="mono">' + esc(x.nik) + '</td><td>' + esc(typeof x.tanggal === 'number' ? 'serial ' + x.tanggal : x.tanggal) + '</td><td class="mono">' + esc(typeof x.masuk === 'number' ? '(waktu)' : x.masuk) + '</td><td class="mono">' + esc(typeof x.keluar === 'number' ? '(waktu)' : x.keluar || '--:--') + '</td><td>' + (bad ? pill('Ditolak', 'NIK tidak dikenal') : pill('Valid')) + '</td></tr>'; }).join('') + '</tbody></table></div><div class="card-f small"><span>Menampilkan 8 dari ' + st.rows.length + ' baris</span><span>Baris tanpa jam pulang = presensi berjalan</span></div>';
    $('#fpRing', p).innerHTML = 'Total <b>' + h.total + '</b> · <span class="blue-t">' + h.baru + ' baru</span> · ' + h.dilewati + ' sudah ada · <span class="bad-t">' + h.jumlahAnomali + ' anomali dilewati</span>';
    $('#fpGo', p).disabled = !(h.baru || $('[name=fpK]:checked', p).value === 'timpa');
    $('#fpGo', p).innerHTML = ic('cloud-upload', 'ic-sm') + 'Mulai Sinkronisasi & Impor (' + (h.baru + (h.dilewati && $('[name=fpK]:checked', p).value === 'timpa' ? h.dilewati : 0)) + ' Data)';
  }
  langkah1();
}
/* ---------- Konfigurasi radius (SA) */
function paneKonfig(el) {
  var p = $('#kfPane', el), peta = null;
  if (!p.innerHTML) p.innerHTML = skel(4, 50);
  swr('settingsGet', 'settingsGet', {}, function (data) {
    var s = {}; data.nilai.forEach(function (x) { s[x.kunci] = x.nilai; });
    var sw = function (k, judul, ket) { return '<label class="row between opt"><span><b>' + judul + '</b><div class="small muted">' + ket + '</div></span><span class="switch"><input type="checkbox" name="' + k + '"' + (s[k] === 'YA' ? ' checked' : '') + '><span></span></span></label>'; };
    p.innerHTML = '<div class="grid g-2"><div class="card"><div class="card-h"><h3>' + ic('map-pin') + 'Titik Kantor & Radius Geofence</h3></div><div class="card-b col gap-12">' +
      '<div id="kfPeta"></div><div class="small muted">Klik peta atau geser pin untuk memindah titik kantor. Lingkaran biru = radius geofence.</div>' +
      '<div class="field"><label>Nama Lokasi</label><input class="input" name="KANTOR_NAMA" value="' + esc(s.KANTOR_NAMA) + '"></div><div class="grid g-2" style="gap:10px"><div class="field"><label>Latitude</label><input class="input mono" name="KANTOR_LAT" value="' + esc(s.KANTOR_LAT) + '"></div><div class="field"><label>Longitude</label><input class="input mono" name="KANTOR_LNG" value="' + esc(s.KANTOR_LNG) + '"></div></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn btn-sec btn-sm" id="kfLok">' + ic('locate-fixed', 'ic-sm') + 'Gunakan lokasi saya sekarang</button><div class="input-ic grow" style="min-width:200px">' + ic('link') + '<input class="input" id="kfLink" placeholder="atau tempel tautan Google Maps / koordinat"></div></div>' +
      '<div class="field"><label>Radius Toleransi: <b id="kfRv">' + esc(s.RADIUS_GEOFENCE) + '</b> meter</label><input type="range" class="range" min="10" max="100" step="5" name="RADIUS_GEOFENCE" value="' + esc(s.RADIUS_GEOFENCE) + '"><span class="hint">PRD: 10–100 m. Pertimbangkan margin error GPS HP (±5–20 m). Lokasi khusus per pegawai bisa sampai 1000 m (tab Lokasi Kerja Pegawai).</span></div></div></div>' +
      '<div class="stack"><div class="card"><div class="card-h"><h3>' + ic('clock') + 'Jadwal & Modul</h3></div><div class="card-b col gap-12">' +
      sw('MODUL_ABSENSI_QR', 'Modul Absensi QR + Geofencing', 'Nonaktif → menu QR hilang, gunakan import fingerprint') +
      sw('MODUL_ABSENSI_SELFIE', 'Absensi Selfie + GPS', 'Pegawai bisa absen dengan foto wajah (kamera depan) tanpa QR. Foto tersimpan privat di Drive.') +
      sw('SELFIE_WAJIB', 'Selfie Wajib di Setiap Presensi', 'Scan QR juga harus disertai foto selfie (anti titip absen)') +
      '<div class="grid g-3" style="gap:10px"><div class="field"><label>Jam Masuk</label><input class="input" type="time" name="JAM_MASUK" value="' + esc(s.JAM_MASUK) + '"></div><div class="field"><label>Jam Pulang</label><input class="input" type="time" name="JAM_PULANG" value="' + esc(s.JAM_PULANG) + '"></div><div class="field"><label>Toleransi (mnt)</label><input class="input mono" name="TOLERANSI_MENIT" value="' + esc(s.TOLERANSI_MENIT) + '"></div></div>' +
      '<div class="field"><label>Hari Kerja (1=Senin … 7=Minggu)</label><input class="input mono" name="HARI_KERJA" value="' + esc(s.HARI_KERJA) + '"></div><label class="check"><input type="checkbox" id="kfRot"><span>Rotasi kunci QR sekarang (poster QR hari ini tidak berlaku lagi)</span></label></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('users') + 'Lokasi Kerja per Pegawai</h3></div><div class="card-b col gap-12">' +
      sw('LOKASI_PER_PEGAWAI', 'Izinkan Lokasi Kerja Khusus per Pegawai', 'Pegawai cabang / lapangan memakai titik & radius sendiri; lainnya tetap memakai titik kantor') +
      '<div class="field"><label>Sinkron lokasi dari GPS perangkat pegawai</label><select class="select" name="LOKASI_SINKRON_PEGAWAI">' + selectOpts([{ v: 'PERSETUJUAN', l: 'Perlu persetujuan HRD (disarankan)' }, { v: 'OTOMATIS', l: 'Otomatis — langsung berlaku' }, { v: 'TIDAK', l: 'Tidak diizinkan (hanya HRD yang mengatur)' }], s.LOKASI_SINKRON_PEGAWAI || 'PERSETUJUAN') + '</select><span class="hint">Pegawai menekan "Atur dari Posisi Saya" di menu Absensi; titik diambil dari GPS HP (akurasi ≤ 100 m).</span></div></div>' +
      '<div class="card-f"><span></span><button class="btn btn-primary" id="kfSave">' + ic('save', 'ic-sm') + 'Simpan Konfigurasi</button></div></div></div></div>';
    var lat = $('[name=KANTOR_LAT]', p), lng = $('[name=KANTOR_LNG]', p), rad = $('[name=RADIUS_GEOFENCE]', p);
    petaLokasi($('#kfPeta', p), { lat: s.KANTOR_LAT, lng: s.KANTOR_LNG, radius: s.RADIUS_GEOFENCE, edit: true, tinggi: 260, onChange: function (a, b) { lat.value = a.toFixed(6); lng.value = b.toFixed(6); } }).then(function (x) { peta = x; });
    var dariInput = debounce(function () { if (peta && lat.value && lng.value) peta.set(num(lat.value), num(lng.value)); }, 500);
    lat.oninput = dariInput; lng.oninput = dariInput;
    rad.oninput = function () { $('#kfRv', p).textContent = this.value; if (peta) peta.radius(this.value); };
    $('#kfLink', p).oninput = function () { var k = koordinatDariTeks(this.value); if (!k) return; lat.value = k.lat.toFixed(6); lng.value = k.lng.toFixed(6); if (peta) peta.set(k.lat, k.lng); toast('Koordinat diambil dari tautan.'); this.value = ''; };
    $('#kfLok', p).onclick = function () {
      withBusy(this, function () {
        return gpsTerbaik(9000).then(function (g) { lat.value = g.lat.toFixed(6); lng.value = g.lng.toFixed(6); if (peta) { peta.set(g.lat, g.lng); peta.saya(g.lat, g.lng, g.acc); } toast('Koordinat diisi (akurasi ±' + g.acc + ' m).'); }).catch(function (e) { toast(e.message, 'bad'); });
      });
    };
    $('#kfSave', p).onclick = async function () {
      var v = formVals(p);
      ['MODUL_ABSENSI_QR', 'MODUL_ABSENSI_SELFIE', 'SELFIE_WAJIB', 'LOKASI_PER_PEGAWAI'].forEach(function (k) { v[k] = v[k] ? 'YA' : 'TIDAK'; });
      if (v.SELFIE_WAJIB === 'YA' && v.MODUL_ABSENSI_QR !== 'YA' && v.MODUL_ABSENSI_SELFIE !== 'YA') return toast('Aktifkan modul QR atau Selfie terlebih dahulu.', 'warn');
      var r = await aksi(this, 'settingsSave', { nilai: v, rotasiQR: $('#kfRot', p).checked }, { bust: ['absensiAdmin', 'lokasiList', 'absenInfo'] });
      if (r.success) { if (r.data && r.data.nilai) cacheSet('settingsGet', r.data); muatAA(el, true); refreshBoot(); }
    };
  }, { fresh: 30000, onError: function (r) { p.innerHTML = empty(r.message); } });
}

/* ------------------------------------------------------------ v2.1: Lokasi kerja per pegawai (HRD) */
var LK = {};
function paneLokasi(el) {
  var p = $('#lkPane', el);
  if (!LK.tbl || !p.contains(LK.host)) {
    p.innerHTML = '<div id="lkInfo"></div><div class="card mt-12"><div class="card-h"><div><h3>Lokasi Kerja Pegawai</h3><p class="sub">Pegawai tanpa lokasi khusus memakai titik kantor. Usulan dari GPS HP pegawai muncul di sini untuk disetujui.</p></div><button class="iconbtn" id="lkRef" title="Muat ulang">' + ic('refresh-cw') + '</button></div>' +
      '<div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="lkQ" placeholder="Cari nama, NIK, divisi…"></div><select class="select soft" id="lkF">' + selectOpts([{ v: 'usul', l: 'Ada usulan menunggu' }, { v: 'khusus', l: 'Lokasi khusus' }, { v: 'kantor', l: 'Lokasi kantor' }], '', 'Semua Pegawai') + '</select></div></div><div class="card-b flush" id="lkT"></div></div>';
    LK.host = $('#lkT', p);
    LK.tbl = Table(LK.host, { key: 'id', per: 10, unit: 'pegawai', search: function (r) { return r.nama + ' ' + r.nik + ' ' + r.divisi + ' ' + r.lokasi.nama; }, cols: [
      { k: 'nama', label: 'Pegawai', render: function (r) { return userCell(r.nama, r.nik + ' · ' + (r.divisi || '-')); } },
      { k: 'lokasi', label: 'Lokasi Efektif (Geofence)', sort: false, render: function (r) { var l = r.lokasi; return '<b class="small">' + esc(l.nama) + '</b> <span class="chip ' + (r.khusus ? 'blue' : '') + '">' + (r.khusus ? 'Khusus' : 'Kantor') + '</span><span class="t2 mono">' + (+l.lat).toFixed(6) + ', ' + (+l.lng).toFixed(6) + ' · r ' + l.radius + ' m</span>'; } },
      { k: 'usul', label: 'Usulan dari GPS Pegawai', sort: false, render: function (r) {
        if (r.usul) return '<div class="small"><b>' + esc(r.usul.nama) + '</b> ' + pill('Menunggu') + '<span class="t2 mono">' + r.usul.lat + ', ' + r.usul.lng + ' · ±' + r.usul.akurasi + ' m · ' + esc(relatif(r.usul.waktu)) + '</span>' + (r.usul.catatan ? '<span class="t2">"' + esc(r.usul.catatan) + '"</span>' : '') +
          '<div class="row mt-8" style="gap:6px"><button class="btn btn-primary btn-xs" data-lk="setujui">' + ic('check', 'ic-sm') + 'Setujui</button><button class="btn btn-sec btn-xs" data-lk="lihat">' + ic('map-pin', 'ic-sm') + 'Peta</button><button class="btn btn-ghost btn-xs" data-lk="tolak">' + ic('x', 'ic-sm') + 'Tolak</button></div></div>';
        if (r.riwayatUsul) return '<span class="small muted">Terakhir: ' + pill(r.riwayatUsul.status, r.riwayatUsul.status, false) + ' ' + esc(relatif(r.riwayatUsul.diputuskan || r.riwayatUsul.waktu)) + '</span>';
        return '<span class="small muted">-</span>'; } },
      { k: 'id', label: 'Aksi', sort: false, cls: 'right', render: function (r) { return '<div class="row" style="gap:6px;justify-content:flex-end"><button class="btn btn-sec btn-xs" data-lk="atur">' + ic('pencil', 'ic-sm') + 'Atur</button>' + (r.khusus ? '<button class="btn btn-ghost btn-xs" data-lk="hapus" title="Kembalikan ke lokasi kantor">' + ic('rotate-ccw', 'ic-sm') + 'Kantor</button>' : '') + '</div>'; } }] });
    var fl = function () { var f = $('#lkF', p).value; LK.tbl.filter(function (r) { return !f || (f === 'usul' ? !!r.usul : f === 'khusus' ? !!r.khusus : !r.khusus); }); };
    $('#lkF', p).onchange = fl;
    $('#lkQ', p).oninput = debounce(function () { LK.tbl.search($('#lkQ', p).value); }, 250);
    $('#lkRef', p).onclick = function () { withBusy(this, function () { return muatLokasi(el, true); }); };
    LK.host.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-lk]'); if (!b) return;
      var tr = b.closest('tr[data-id]'), r = (LK.data && LK.data.rows || []).filter(function (x) { return x.id === tr.dataset.id; })[0]; if (!r) return;
      var aksiLk = b.dataset.lk;
      if (aksiLk === 'atur') return aturLokasiPegawai(el, r);
      if (aksiLk === 'lihat') return aturLokasiPegawai(el, r, true);
      if (aksiLk === 'hapus') { if (!(await confirmBox('Kembalikan ke Lokasi Kantor?', 'Lokasi khusus ' + r.nama + ' dihapus; geofence kembali memakai titik kantor (' + LK.data.kantor.nama + ').', 'Ya, kembalikan'))) return; var h = await aksi(b, 'lokasiAtur', { id: r.id, hapus: true }, { bust: ['lokasiList'] }); if (h.success) muatLokasi(el, true); return; }
      if (aksiLk === 'tolak') { var cat = await promptBox('Tolak Usulan Lokasi', 'Alasan penolakan (opsional, terlihat di riwayat)', { ok: 'Tolak Usulan', danger: true }); if (cat === null) return; var t = await aksi(b, 'lokasiPutus', { id: r.id, aksi: 'tolak', catatan: cat }, { bust: ['lokasiList'] }); if (t.success) muatLokasi(el, true); return; }
      if (aksiLk === 'setujui') { var s2 = await aksi(b, 'lokasiPutus', { id: r.id, aksi: 'setujui', radius: (r.khusus && r.khusus.radius) || LK.data.kantor.radius }, { bust: ['lokasiList'] }); if (s2.success) muatLokasi(el, true); }
    });
  }
  muatLokasi(el);
}
function muatLokasi(el, force) {
  var p = $('#lkPane', el);
  return swr('lokasiList', 'lokasiList', {}, function (d) {
    LK.data = d; LK.tbl.set(d.rows);
    var nUsul = d.rows.filter(function (r) { return r.usul; }).length, nKhusus = d.rows.filter(function (r) { return r.khusus; }).length;
    var n = $('#lkN', el); if (n) { n.textContent = nUsul; n.hidden = !nUsul; }
    $('#lkInfo', p).innerHTML = '<div class="grid g-3">' + stat({ label: 'Titik Kantor', icon: 'building', val: d.kantor.radius, unit: 'm radius', meta: '<span>' + esc(d.kantor.nama) + '</span>' }) +
      stat({ acc: 'blue', label: 'Pegawai Lokasi Khusus', icon: 'map-pin', val: nKhusus, unit: '/ ' + d.rows.length, meta: '<span>' + (d.aktif ? 'Fitur lokasi per pegawai AKTIF' : '<b class="warn-t">Fitur NONAKTIF — semua memakai titik kantor</b>') + '</span>' }) +
      stat({ label: 'Usulan Menunggu', icon: 'hourglass', val: nUsul ? '<span class="warn-t">' + nUsul + '</span>' : 0, meta: '<span>Mode sinkron: <b>' + esc({ PERSETUJUAN: 'Perlu persetujuan', OTOMATIS: 'Otomatis', TIDAK: 'Tidak diizinkan' }[d.mode] || d.mode) + '</b></span>' }) + '</div>';
  }, { fresh: 20000, force: force });
}
/** Modal atur lokasi kerja khusus pegawai: peta (geser pin), GPS perangkat, tempel tautan Maps, radius 10–1000 m. */
function aturLokasiPegawai(el, r, lihatUsul) {
  var k = r.khusus || {}, u = r.usul, awal = lihatUsul && u ? { lat: u.lat, lng: u.lng, nama: u.nama } : { lat: k.lat || r.lokasi.lat, lng: k.lng || r.lokasi.lng, nama: k.nama || '' };
  var radius = k.radius || LK.data.kantor.radius || 50, peta = null;
  modal({ title: (lihatUsul ? 'Tinjau Usulan Lokasi — ' : 'Atur Lokasi Kerja — ') + r.nama, sub: r.nik + ' · ' + (r.divisi || '-'), noFocus: true,
    body: (lihatUsul && u ? '<div class="note small mb-12">' + ic('info') + '<div>Usulan dikirim ' + esc(relatif(u.waktu)) + ' dari GPS perangkat pegawai (akurasi ±' + u.akurasi + ' m).' + (u.catatan ? ' Catatan: "' + esc(u.catatan) + '"' : '') + ' Anda boleh menggeser pin sebelum menyimpan.</div></div>' : '') +
      '<div id="lpPeta"></div><div class="small muted mt-8">Klik peta / geser pin untuk menentukan titik. Lingkaran = radius geofence pegawai ini.</div>' +
      '<div class="field mt-12"><label>Nama lokasi kerja</label><input class="input" id="lpNama" maxlength="80" value="' + esc(awal.nama) + '" placeholder="mis. Site Proyek Cikarang"></div>' +
      '<div class="grid g-2" style="gap:10px"><div class="field"><label>Latitude</label><input class="input mono" id="lpLat" value="' + esc(awal.lat) + '"></div><div class="field"><label>Longitude</label><input class="input mono" id="lpLng" value="' + esc(awal.lng) + '"></div></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn btn-sec btn-sm" id="lpGps">' + ic('locate-fixed', 'ic-sm') + 'Posisi perangkat ini</button><div class="input-ic grow" style="min-width:200px">' + ic('link') + '<input class="input" id="lpLink" placeholder="tempel tautan Google Maps / koordinat"></div></div>' +
      '<div class="field mt-12"><label>Radius: <b id="lpRv">' + radius + '</b> meter</label><input type="range" class="range" id="lpRad" min="10" max="1000" step="10" value="' + radius + '"><span class="hint">10–1000 m. Untuk area luas (site proyek, gudang) gunakan radius lebih besar.</span></div>',
    foot: [{ label: 'Batal', close: true }, { label: lihatUsul && u ? 'Setujui & Simpan' : 'Simpan Lokasi', cls: 'btn-primary', act: async function (m) {
      var d = { id: r.id, nama: $('#lpNama', m.el).value.trim(), lat: num($('#lpLat', m.el).value), lng: num($('#lpLng', m.el).value), radius: num($('#lpRad', m.el).value) };
      var res, geser = lihatUsul && u && (Math.abs(d.lat - u.lat) > 1e-6 || Math.abs(d.lng - u.lng) > 1e-6);
      if (lihatUsul && u) { res = await api('lokasiPutus', { id: r.id, aksi: 'setujui', nama: d.nama, radius: d.radius }); if (res.success && geser) res = await api('lokasiAtur', d); }
      else res = await api('lokasiAtur', d);
      if (!res.success) { toast(res.message, 'bad'); return false; }
      toast(res.message, 'ok'); cacheBust('lokasiList'); muatLokasi(el, true);
    } }],
    onOpen: async function (mel) {
      var lat = $('#lpLat', mel), lng = $('#lpLng', mel), rad = $('#lpRad', mel);
      peta = await petaLokasi($('#lpPeta', mel), { lat: awal.lat, lng: awal.lng, radius: radius, edit: true, tinggi: 280, onChange: function (a, b) { lat.value = a.toFixed(6); lng.value = b.toFixed(6); } });
      var dariInput = debounce(function () { if (peta) peta.set(num(lat.value), num(lng.value)); }, 500);
      lat.oninput = dariInput; lng.oninput = dariInput;
      rad.oninput = function () { $('#lpRv', mel).textContent = this.value; if (peta) peta.radius(this.value); };
      $('#lpLink', mel).oninput = function () { var c = koordinatDariTeks(this.value); if (!c) return; lat.value = c.lat.toFixed(6); lng.value = c.lng.toFixed(6); if (peta) peta.set(c.lat, c.lng); this.value = ''; toast('Koordinat diambil dari tautan.'); };
      $('#lpGps', mel).onclick = function () { withBusy(this, function () { return gpsTerbaik(9000).then(function (g) { lat.value = g.lat.toFixed(6); lng.value = g.lng.toFixed(6); if (peta) { peta.set(g.lat, g.lng); peta.saya(g.lat, g.lng, g.acc); } }).catch(function (e) { toast(e.message, 'bad'); }); }); };
    } });
}

/* ============================================================ CUTI ADMIN */
registerPage('cuti-admin', {
  auth: 'hrd', title: 'Cuti & Izin', menu: 'cuti-admin',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Cuti & Izin'], title: 'Persetujuan Cuti & Izin', sub: 'Staff HRD melakukan verifikasi awal; persetujuan final oleh Super Admin. Saldo cuti tahunan terpotong otomatis saat disetujui.', actions: '<button class="btn btn-sec" id="caX">' + ic('download', 'ic-sm') + 'Export (.xlsx)</button>' }) +
      '<div class="tabs mb-16" id="caTabs">' + ['Menunggu', 'Diproses', 'Disetujui', 'Ditolak', 'Semua'].map(function (s, i) { return '<button class="tab ' + (i ? '' : 'on') + '" data-s="' + s + '">' + s + ' <span class="count" data-n="' + s + '">0</span></button>'; }).join('') + '</div>' +
      '<div class="card"><div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="caQ" placeholder="Cari nama, NIK, jenis…"></div><select class="select soft" id="caJ">' + selectOpts(['Cuti Tahunan', 'Cuti Sakit', 'Izin', 'Cuti Khusus', 'Cuti Melahirkan'], '', 'Semua Jenis') + '</select></div></div><div class="card-b flush" id="caT"></div></div>';
  },
  init: function (el) {
    var st = 'Menunggu';
    App.tables.ca = Table($('#caT', el), { key: 'ID', per: 10, unit: 'pengajuan', search: function (c) { return c.Nama + ' ' + c.NIK + ' ' + c.Jenis + ' ' + c.Divisi; }, cols: [
      { k: 'Nama', label: 'Karyawan', render: function (c) { return userCell(c.Nama, (c.Jabatan || '') + ' • ' + (c.Divisi || '')); } },
      { k: 'Jenis', label: 'Jenis & Sisa', render: function (c) { return '<b class="small">' + esc(c.Jenis) + ' (' + c.JumlahHari + ' hari)</b><span class="t2">' + (c.Jenis === 'Cuti Tahunan' ? 'Sisa kini: ' + c.SisaKini + '/' + c.Kuota + ' hari' : '') + (c.LampiranID ? ' · ada lampiran' : '') + '</span>'; } },
      { k: 'TglMulai', label: 'Tanggal', render: function (c) { return tgl(c.TglMulai) + ' – ' + tgl(c.TglSelesai); } },
      { k: 'Alasan', label: 'Alasan', render: function (c) { return '<span class="small">' + esc(String(c.Alasan).slice(0, 80)) + '</span>' + (c.CatatanHRD ? '<span class="t2">HRD: ' + esc(c.CatatanHRD) + '</span>' : ''); } },
      { k: 'Status', label: 'Status', render: function (c) { return pill(c.Status) + (c.DiprosesOleh ? '<span class="t2">oleh ' + esc(c.DiprosesOleh.split('@')[0]) + '</span>' : ''); } },
      { label: 'Aksi', cls: 'n', render: function (c) { if (['Menunggu', 'Diproses'].indexOf(c.Status) < 0) return '<span class="small muted">' + (c.DiputuskanPada ? tgl(c.DiputuskanPada) : '') + '</span>'; return '<div class="row" style="justify-content:flex-end">' + (isSA() ? '<button class="btn btn-primary btn-xs" data-cs="' + c.ID + '">Setujui</button><button class="btn btn-sec btn-xs" data-ct="' + c.ID + '">Tolak</button>' : (c.Status === 'Menunggu' ? '<button class="btn btn-sec btn-xs" data-cp="' + c.ID + '">Proses</button>' : '<span class="small muted">Menunggu SA</span>')) + '</div>'; } }],
      after: function (tb) { bindCutiAksi(tb, function () { muatCA(el, true); refreshBoot(); }); } });
    var terap = function () { var j = $('#caJ', el).value; App.tables.ca.filter(function (c) { return (st === 'Semua' || c.Status === st) && (!j || c.Jenis === j); }); };
    $$('[data-s]', el).forEach(function (t) { t.onclick = function () { st = t.dataset.s; $$('[data-s]', el).forEach(function (x) { x.classList.toggle('on', x === t); }); terap(); }; });
    $('#caJ', el).onchange = terap; $('#caQ', el).oninput = debounce(function () { App.tables.ca.search($('#caQ', el).value); }, 250);
    App.caTerap = terap;
    $('#caX', el).onclick = function () { exportXlsx('Cuti_Izin_' + ymd(), { Cuti: App.tables.ca.view().map(function (c) { return { NIK: c.NIK, Nama: c.Nama, Divisi: c.Divisi, Jenis: c.Jenis, Mulai: c.TglMulai, Selesai: c.TglSelesai, Hari: c.JumlahHari, Alasan: c.Alasan, Status: c.Status, 'Catatan HRD': c.CatatanHRD, 'Diputuskan oleh': c.DisetujuiOleh }; }) }); };
  },
  show: function (el) { muatCA(el); }
});
function muatCA(el, force) {
  return swr('cutiList', 'cutiList', {}, function (rows) {
    ['Menunggu', 'Diproses', 'Disetujui', 'Ditolak'].forEach(function (s) { $('[data-n="' + s + '"]', el).textContent = rows.filter(function (c) { return c.Status === s; }).length; });
    $('[data-n="Semua"]', el).textContent = rows.length;
    App.tables.ca.set(rows); App.caTerap();
  }, { fresh: 30000, force: force });
}

/* ============================================================ PAYROLL */
var PY = {};
registerPage('payroll', {
  auth: 'hrd', title: 'Payroll & Gaji', menu: 'payroll',
  template: function () {
    return '<div id="pyHead"></div><div class="card tint" style="border-color:#D3E0FB"><div class="card-b row between wrap"><div class="row gap-12"><span class="avatar blue" style="border-radius:6px">' + ic('arrow-left-right') + '</span><div><div class="strong row">Periode Aktif: <span id="pyRg"></span> <span class="tag live" id="pyCut"></span></div><div class="small muted" id="pySrc">Sumber data: Absensi QR valid + Import Fingerprint terintegrasi otomatis</div></div></div><div class="row"><input class="input" type="month" id="pyPer" style="width:auto;height:36px"><span class="pill info dot">Docs Engine Terhubung</span></div></div></div>' +
      '<div class="grid g-4 mt-16" id="pySt"></div><div class="card mt-16"><div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="pyQ" placeholder="Cari nama pegawai atau NIK…"></div><select class="select soft" id="pyDv"></select><select class="select soft" id="pySs">' + selectOpts(['Siap', 'Perlu Review', 'Antre', 'Terbit'], '', 'Semua Status Slip') + '</select></div></div>' +
      '<div class="card-b flush" id="pyT"></div><div class="card-f" style="background:#F1F5FD"><b>Total Terpilih: <span id="pySelN">0</span> karyawan</b><b class="num blue-t" style="font-size:17px" id="pySelT">Rp 0</b></div></div>' +
      '<div class="console mt-16" id="pyQ2"></div>';
  },
  init: function (el) {
    PY.tbl = Table($('#pyT', el), { key: 'ID', select: true, per: 10, unit: 'karyawan', search: function (p) { return p.Nama + ' ' + p.NIK + ' ' + p.Divisi; }, cols: [
      { k: 'NIK', label: 'NIK', render: function (p) { return '<b class="mono small">' + esc(p.NIK) + '</b>'; } },
      { k: 'Nama', label: 'Karyawan', render: function (p) { return userCell(p.Nama, p.Email || p.Jabatan); } },
      { k: 'Divisi', label: 'Divisi', render: function (p) { return '<span class="chip">' + esc(p.Jabatan || p.Divisi || '-') + '</span>'; } },
      { k: 'GajiPokok', label: 'Gaji Pokok', cls: 'n', render: function (p) { return '<span class="mono">' + rp(p.GajiPokok) + '</span>'; } },
      { k: 'Tunjangan', label: 'Tunjangan', cls: 'n', render: function (p) { return '<span class="mono blue-t">' + rp(num(p.Tunjangan) + num(p.Lembur)) + '</span>' + (num(p.Lembur) ? '<span class="t2">lembur ' + rp(p.Lembur) + '</span>' : ''); } },
      { k: 'Potongan', label: 'Potongan', cls: 'n', render: function (p) { return '<span class="mono bad-t">' + rp(p.Potongan) + '</span>' + (p.HariTerlambat >= 2 || p.HariAlpa ? '<span class="t2 warn-t">' + ic('triangle-alert', 'ic-sm') + (p.HariTerlambat ? p.HariTerlambat + 'x telat ' : '') + (p.HariAlpa ? p.HariAlpa + ' alpa' : '') + '</span>' : ''); } },
      { k: 'GajiBersih', label: 'Gaji Bersih (THP)', cls: 'n', render: function (p) { return '<b class="mono">' + rp(p.GajiBersih) + '</b>'; } },
      { k: 'StatusSlip', label: 'Status Slip', render: function (p) { return pill(p.StatusSlip, p.StatusSlip === 'Siap' ? 'Siap Kirim' : p.StatusSlip); } }],
      rowClass: function (p) { return p.StatusSlip === 'Perlu Review' ? 'flag' : ''; },
      onRow: function (p) { editPayroll(el, p); },
      onSelect: function (s) { $('#pySelN', el).textContent = s.length; $('#pySelT', el).textContent = rp(s.reduce(function (a, p) { return a + num(p.GajiBersih); }, 0)); } });
    $('#pyQ', el).oninput = debounce(function () { PY.tbl.search($('#pyQ', el).value); }, 250);
    var fl = function () { var d = $('#pyDv', el).value, s = $('#pySs', el).value; PY.tbl.filter(function (p) { return (!d || p.Divisi === d) && (!s || p.StatusSlip === s); }); };
    $('#pyDv', el).onchange = fl; $('#pySs', el).onchange = fl;
    $('#pyPer', el).onchange = function () { PY.periode = this.value; muatPY(el); };
  },
  show: function (el) { muatPY(el); },
  hide: function () { stopPoll('pyq'); }
});
function muatPY(el, force) {
  PY.periode = PY.periode || periodeAktif();
  $('#pyPer', el).value = PY.periode;
  return swr('payroll:' + PY.periode, 'payrollList', { periode: PY.periode }, function (d) {
    PY.data = d;
    var lbl = BULAN[+d.periode.slice(5, 7) - 1] + ' ' + d.periode.slice(0, 4);
    $('#pyHead', el).innerHTML = pageHead({ crumbs: ['Beranda', 'Payroll & Gaji', 'Periode ' + lbl], title: 'Penggajian & Kompensasi Karyawan', sub: '<span class="pill">' + (isSA() ? 'Super Admin' : 'Staff HRD') + '</span> Perhitungan otomatis berbasis rekap absensi, potongan keterlambatan/alpa, BPJS & PPh 21 (estimasi TER), dan slip PDF via Google Docs.',
      actions: '<button class="btn btn-sec" id="pyBank">' + ic('sheet', 'ic-sm') + 'Export Rekap Bank (.xlsx)</button><button class="btn btn-accent" id="pyHit">' + ic('calculator', 'ic-sm') + 'Hitung Ulang Otomatis</button>' + (isSA() ? '<button class="btn btn-primary" id="pyGen">' + ic('file-stack', 'ic-sm') + 'Generate Semua Slip PDF</button>' : '') });
    $('#pyRg', el).textContent = tgl(d.rentang.dari, true) + ' – ' + tgl(d.rentang.sampai, true); $('#pyCut', el).textContent = 'CUT-OFF ' + d.rentang.dari.slice(8);
    var t = d.total;
    $('#pySt', el).innerHTML = stat({ acc: 'navy', label: 'Total Estimasi Payroll', icon: 'banknote', val: rp(t.bersih), meta: '<span>Karyawan terkalkulasi</span><b>' + d.rows.length + ' / ' + d.aktif + ' aktif</b>' }) +
      stat({ acc: 'blue', label: 'Total Tunjangan & Lembur', icon: 'trending-up', val: rp(t.tunj), meta: '<span>Tunjangan tetap + lembur</span>' }) +
      stat({ acc: 'red', label: 'Total Potongan (BPJS/PPh/Alpa)', icon: 'circle-minus', val: '<span class="bad-t">' + rp(t.pot) + '</span>', meta: '<span>BPJS ' + rpShort(t.bpjs) + ' • PPh ' + rpShort(t.pph) + ' • <span class="bad-t">Absen ' + rpShort(t.alpa) + '</span></span>' }) +
      stat({ label: 'Status Penerbitan Slip', icon: 'file-check', val: (t.Terbit || 0) + (t.Terkirim || 0), unit: '/ ' + d.rows.length + ' terbit', badge: '<span class="pill info">' + (t.Siap || 0) + ' Siap, ' + (t['Perlu Review'] || 0) + ' Review</span>', meta: '<span class="ellip">Template: ' + esc(d.template || 'SLIP_GAJI') + '</span><a href="#/template">Ubah</a>' });
    var dvs = {}; d.rows.forEach(function (p) { if (p.Divisi) dvs[p.Divisi] = 1; });
    $('#pyDv', el).innerHTML = selectOpts(Object.keys(dvs), $('#pyDv', el).value, 'Semua Divisi & Unit');
    PY.tbl.set(d.rows);
    konsolSlip(el, d);
    $('#pyHit', el).onclick = async function () { var r = await aksi(this, 'payrollHitung', { periode: PY.periode }); if (r.success) muatPY(el, true); };
    $('#pyBank', el).onclick = function () { exportXlsx('Rekap_Bank_' + PY.periode, { Transfer: d.rows.map(function (p) { return { NIK: p.NIK, Nama: p.Nama, Divisi: p.Divisi, 'Gaji Bersih': num(p.GajiBersih), Status: p.StatusSlip }; }), Rincian: d.rows.map(function (p) { return { NIK: p.NIK, Nama: p.Nama, 'Gaji Pokok': num(p.GajiPokok), Tunjangan: num(p.Tunjangan), Lembur: num(p.Lembur), BPJS: num(p.BPJS), PPh21: num(p.PPh21), 'Pot Terlambat': num(p.PotTerlambat), 'Pot Alpa': num(p.PotAlpa), 'Gaji Bersih': num(p.GajiBersih), Hadir: p.HariHadir, Terlambat: p.HariTerlambat, Alpa: p.HariAlpa, Cuti: p.HariCuti }; }) }); };
    var g = $('#pyGen', el); if (g) g.onclick = async function () {
      var sel = PY.tbl.selected(), rev = d.rows.filter(function (p) { return p.StatusSlip === 'Perlu Review'; }).length;
      if (!await confirmBox('Terbitkan slip gaji ' + lbl + '?', (sel.length ? sel.length + ' slip terpilih' : 'Semua slip berstatus Siap') + ' akan dibuat PDF-nya lewat Google Docs dan dikirim notifikasinya.' + (rev ? ' ' + rev + ' slip "Perlu Review" dilewati kecuali dipilih.' : ''), 'Generate PDF')) return;
      var r = await aksi(g, 'payrollTerbitkan', { periode: PY.periode, ids: sel.length ? sel.map(function (p) { return p.ID; }) : null, termasukReview: !!sel.length }); if (r.success) { PY.tbl.clearSel(); muatPY(el, true); }
    };
  }, { fresh: 30000, force: force });
}
function konsolSlip(el, d) {
  var q = d.antrean, pct = q.total ? Math.round(q.selesai / q.total * 100) : 0, jalan = q.total && q.selesai + q.gagal < q.total;
  $('#pyQ2', el).innerHTML = '<div class="row between wrap"><div class="row gap-12"><span class="avatar" style="border-radius:6px;background:#26314A;color:#fff">' + ic('terminal') + '</span><div><b style="font-size:17px">Google Apps Script Automated PDF Generator Queue</b><div class="small mono" style="color:#AEB6C8">/SIM_HRD_Storage/Slip_Gaji_Generated/' + d.periode.slice(0, 4) + '/' + d.periode.slice(5) + '/</div></div>' + (jalan ? '<span class="pill solid-blue">RUNNING</span>' : q.total ? '<span class="pill ok">SELESAI</span>' : '<span class="pill">IDLE</span>') + '</div>' +
    '<div class="row"><a class="btn btn-sec btn-sm" href="#/notifikasi/konfig">' + ic('mail', 'ic-sm') + 'Notifikasi Slip</a><button class="btn btn-accent btn-sm" id="pyLanjut"' + (jalan ? '' : ' disabled') + '>' + ic('play', 'ic-sm') + 'Proses Sekarang</button></div></div>' +
    '<div class="row between mt-16 small"><span>Progres Pembuatan Batch PDF & QR Verifikasi</span><b class="mono">' + pct + '% Complete (' + q.selesai + ' / ' + q.total + ' Slip)</b></div><div class="progress mt-8"><i style="width:' + pct + '%"></i></div>' +
    '<div class="row between mt-8 small mono" style="color:#AEB6C8"><span>Diproses otomatis ±25 slip/menit oleh trigger</span><span>' + (q.gagal ? '<span style="color:#F87171">' + q.gagal + ' gagal</span>' : '') + '</span></div>' +
    '<div class="log">' + (q.total ? d.rows.filter(function (p) { return p.StatusSlip === 'Terbit' || p.StatusSlip === 'Antre'; }).slice(0, 6).map(function (p) { return '[' + jam(new Date()) + '] ' + (p.StatusSlip === 'Terbit' ? '<span class="g">GENERATE:</span> NIK ' + esc(p.NIK) + ' (' + esc(p.Nama) + ') → <span class="b">SUCCESS</span>' : '<span class="y">ANTRE:</span> NIK ' + esc(p.NIK) + ' (' + esc(p.Nama) + ') menunggu giliran'); }).join('<br>') : '<span class="muted">Belum ada antrean. Tekan "Generate Semua Slip PDF" setelah payroll dihitung & direview.</span>') + '</div>';
  var l = $('#pyLanjut', el); if (l) l.onclick = async function () { var r = await withBusy(l, function () { return api('payrollProsesSlip', { periode: PY.periode }); }); if (r.success) { cacheSet('payroll:' + PY.periode, r.data); PY.tbl.set(r.data.rows); konsolSlip(el, r.data); } else toast(r.message, 'bad'); };
  if (jalan) poll('pyq', function () { return api('payrollList', { periode: PY.periode }, { silent: true }).then(function (r) { if (r.success) { cacheSet('payroll:' + PY.periode, r.data); PY.tbl.set(r.data.rows); konsolSlip(el, r.data); return r.data.antrean.selesai + ':' + r.data.antrean.gagal; } return ''; }); }, 15000);
  else stopPoll('pyq');
}
function editPayroll(el, p) {
  var kunci = p.StatusSlip === 'Terbit' || p.StatusSlip === 'Terkirim';
  modal({ title: 'Rincian Payroll — ' + p.Nama, sub: 'Periode ' + p.Periode + ' · NIK ' + p.NIK + (kunci ? ' · Slip sudah terbit (terkunci)' : ''), size: 'lg',
    body: '<div class="grid g-2"><div><div class="ov mb-8">Kehadiran Periode</div><div class="grid g-2" style="gap:8px">' + [['Hadir', p.HariHadir], ['Terlambat', p.HariTerlambat + ' hr / ' + p.MenitTerlambat + ' mnt'], ['Cuti/Izin', p.HariCuti], ['Alpa', p.HariAlpa]].map(function (x) { return '<div class="kvbox"><span class="muted">' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div>' +
      '<div class="ov mt-16 mb-8">Penyesuaian Manual</div><div class="grid g-2" style="gap:10px"><div class="field"><label>Lembur (Rp)</label><input class="input mono" name="Lembur" inputmode="numeric" value="' + num(p.Lembur) + '"' + (kunci ? ' disabled' : '') + '></div><div class="field"><label>PPh 21 override (Rp)</label><input class="input mono" name="PPh21" inputmode="numeric" placeholder="otomatis: ' + num(p.PPh21) + '"' + (kunci ? ' disabled' : '') + '></div></div><p class="small muted">PPh 21 otomatis memakai estimasi tarif efektif (TER) bulanan. Kosongkan untuk tetap otomatis.</p></div>' +
      '<div><table class="tbl compact"><tbody>' + [['Gaji Pokok', p.GajiPokok], ['Tunjangan', p.Tunjangan], ['Lembur', p.Lembur], ['BPJS (karyawan)', -p.BPJS], ['PPh 21', -p.PPh21], ['Pot. Terlambat', -p.PotTerlambat], ['Pot. Alpa', -p.PotAlpa]].map(function (x) { return '<tr><td>' + x[0] + '</td><td class="n mono ' + (x[1] < 0 ? 'bad-t' : '') + '">' + (x[1] < 0 ? '−' : '') + rp(Math.abs(x[1])) + '</td></tr>'; }).join('') + '<tr><td><b>Gaji Bersih</b></td><td class="n"><b class="mono">' + rp(p.GajiBersih) + '</b></td></tr></tbody></table></div></div>',
    foot: [{ label: 'Tutup', close: true }].concat(kunci ? [{ label: 'Unduh Slip PDF', cls: 'btn-primary', icon: 'download', act: async function () { var r = await api('slipUnduh', { id: p.ID }); if (r.success) unduhB64(r.data); else toast(r.message, 'bad'); return false; } }] :
      [{ label: 'Simpan & Hitung Ulang', cls: 'btn-primary', act: async function (m) { var v = formVals(m.el), ov = {}; ov[p.ID_Karyawan] = { Lembur: num(v.Lembur) }; if (v.PPh21 !== '') ov[p.ID_Karyawan].PPh21 = num(v.PPh21); var r = await api('payrollHitung', { periode: p.Periode, overrides: ov }); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatPY(el, true); return r.success; } }]) });
}

/* ============================================================ REKRUTMEN */
var RK = { view: 'tabel' };
var TAHAP = ['Screening', 'Wawancara', 'Tes Teknis', 'Offering'];
registerPage('rekrutmen', {
  auth: 'hrd', title: 'Rekrutmen', menu: 'rekrutmen',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Rekrutmen', 'Pipeline Pelamar'], title: 'Pipeline & Seleksi Rekrutmen', sub: 'Kelola lowongan aktif, pantau screening pelamar, dan alur seleksi menuju karyawan aktif atau database leads.',
      actions: '<a class="btn btn-sec" href="#/karir" target="_blank">' + ic('external-link', 'ic-sm') + 'Buka Portal Karir Publik</a><button class="btn btn-sec" id="rkX">' + ic('download', 'ic-sm') + 'Export Data Pelamar (.xlsx)</button><button class="btn btn-primary" id="rkNew">' + ic('circle-plus', 'ic-sm') + 'Buat Lowongan Baru</button>' }) +
      '<div class="grid g-4" id="rkSt"></div><div class="card mt-16"><div class="card-b"><div class="row between wrap"><b class="row">' + ic('git-fork') + 'Distribusi Jalur Pipeline Pelamar</b><span class="small muted" id="rkTot"></span></div><div class="seg-bar mt-12" id="rkBar"></div><div class="legend mt-8" id="rkLg"></div></div></div>' +
      '<div class="card mt-16"><div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="rkQ" placeholder="Cari pelamar, email, atau posisi…"></div><select class="select soft" id="rkLow"></select><select class="select soft" id="rkTh">' + selectOpts(TAHAP.concat(['Diterima', 'Ditolak']), '', 'Semua Tahapan') + '</select><select class="select soft" id="rkSk">' + selectOpts([{ v: '80', l: 'Skor ≥ 80' }, { v: '60', l: 'Skor ≥ 60' }, { v: '0', l: 'Skor < 60' }], '', 'Semua Skor') + '</select><span class="grow"></span><div class="seg"><button class="on" data-v="tabel">' + ic('table', 'ic-sm') + ' Tabel</button><button data-v="kanban">' + ic('kanban', 'ic-sm') + ' Kanban</button></div></div></div></div>' +
      '<div class="bulkbar mt-16" id="rkBulk" hidden><span class="count blue" id="rkSelN"></span><b>Kandidat Terpilih untuk Operasi Massal</b><span class="grow"></span><button class="btn btn-sec btn-sm" id="rkWa">' + ic('message-circle', 'ic-sm') + 'Kirim WA Massal</button>' + (isSA() ? '<button class="btn btn-sec btn-sm" id="rkLeads">' + ic('database', 'ic-sm') + 'Pindahkan ke Leads (Tolak)</button>' : '') + '</div>' +
      '<div class="card mt-16" id="rkTabel"><div class="card-b flush" id="rkT"></div></div><div id="rkKan" class="mt-16" hidden></div>' +
      '<div class="card mt-16"><div class="card-h"><div><h3>' + ic('briefcase') + 'Lowongan & Form Builder</h3><p class="sub">Atur pertanyaan khusus per posisi (US-12). Lowongan berstatus Buka tampil di portal karir.</p></div></div><div class="card-b flush" id="rkLowT"></div></div>' +
      '<div class="card mt-16"><div class="card-h"><h3>' + ic('workflow') + 'Alur Tata Kelola Siklus Hidup Rekrutmen</h3></div><div class="card-b grid g-4">' + [['01 Ingestion', 'user-round-check', 'Pelamar Masuk Portal Karir', 'Formulir lowongan publik + CV tersimpan privat di Drive.'], ['02 Screening', 'bot', 'Screening HRD & Skor Kecocokan', 'Kelengkapan & kata kunci kualifikasi dihitung otomatis.'], ['03 Evaluation', 'messages-square', 'Review CV & Wawancara', 'Catatan evaluasi, tahap seleksi, notifikasi kandidat.'], ['04 Governance', 'gavel', 'Putusan Final Super Admin', 'Diterima → Master Karyawan. Ditolak → Database Leads.']].map(function (x, i) {
        return '<div class="card ' + (i === 3 ? 'dark' : 'tint') + '"><div class="card-b tight"><div class="row between"><span class="ov ' + (i === 3 ? '' : 'blue-t') + '" style="' + (i === 3 ? 'color:#AEB6C8' : '') + '">' + x[0] + '</span>' + ic(x[1], 'ic-sm') + '</div><b class="small">' + x[2] + '</b><div class="small ' + (i === 3 ? 'muted' : 'muted') + '">' + x[3] + '</div></div></div>'; }).join('') + '</div></div>';
  },
  init: function (el) {
    RK.tbl = Table($('#rkT', el), { key: 'id', select: true, per: 10, unit: 'pelamar', sort: 'dibuat', dir: -1, search: function (k) { return k.nama + ' ' + k.email + ' ' + k.posisi; }, cols: [
      { k: 'nama', label: 'Nama Pelamar & Kontak', render: function (k) { return userCell(k.nama, k.email + ' • ' + k.wa, k.statusWA === 'Terdaftar' ? ' ' + ic('badge-check', 'ic-sm blue-t') : ''); } },
      { k: 'posisi', label: 'Posisi Dilamar & Tgl', render: function (k) { return '<b class="small">' + esc(k.posisi) + '</b><span class="t2">' + tglJam(k.dibuat) + '</span>'; } },
      { k: 'sumber', label: 'Sumber', render: function (k) { return '<span class="chip">' + esc(k.sumber || '-') + '</span>'; } },
      { k: 'skor', label: 'Skor', desc: true, render: function (k) { return '<div style="min-width:110px">' + skorBar(k.skor) + '<span class="t2">' + (k.skor >= 80 ? 'Sangat Cocok' : k.skor >= 60 ? 'Menengah' : 'Di Bawah Ambang') + '</span></div>'; } },
      { k: 'cv', label: 'Lampiran', render: function (k) { return k.cv ? '<span class="chip">' + ic('file-text', 'ic-sm') + 'CV</span>' : '-'; } },
      { k: 'tahap', label: 'Status Seleksi', render: function (k) { return k.status === 'Proses' ? pill(k.tahap, k.tahap) : pill(k.status); } },
      { label: '', render: function (k) { return '<a class="btn btn-primary btn-xs" href="#/kandidat/' + k.id + '">Review</a>'; } }],
      onRow: function (k) { go('kandidat', k.id); },
      onSelect: function (s) { $('#rkBulk', el).hidden = !s.length; $('#rkSelN', el).textContent = s.length; } });
    RK.low = Table($('#rkLowT', el), { key: 'id', per: 5, unit: 'lowongan', cols: [
      { k: 'judul', label: 'Posisi', render: function (l) { return '<b>' + esc(l.judul) + '</b><span class="t2">' + esc([l.divisi, l.tipe, l.model].filter(Boolean).join(' · ')) + '</span>'; } },
      { k: 'batas', label: 'Batas', render: function (l) { return l.batas ? tgl(l.batas) : 'Terbuka'; } },
      { k: 'pelamar', label: 'Pelamar', cls: 'n' }, { k: 'form', label: 'Pertanyaan', cls: 'n', render: function (l) { return l.form.length; } },
      { k: 'status', label: 'Status', render: function (l) { return pill(l.status === 'Buka' ? 'Aktif' : 'Nonaktif', l.status); } },
      { label: '', render: function (l) { return '<button class="btn btn-sec btn-xs" data-el="' + l.id + '">' + ic('pencil', 'ic-sm') + 'Edit</button>'; } }],
      after: function (tb) { $$('[data-el]', tb).forEach(function (b) { b.onclick = function () { formLowongan(el, RK.low.rows().filter(function (l) { return l.id === b.dataset.el; })[0]); }; }); } });
    var fl = function () { var lo = $('#rkLow', el).value, th = $('#rkTh', el).value, sk = $('#rkSk', el).value;
      RK.tbl.filter(function (k) { return (!lo || k.lowonganId === lo) && (!th || (k.status === 'Proses' ? k.tahap === th : k.status === th)) && (sk === '' || (sk === '0' ? k.skor < 60 : k.skor >= +sk)); }); if (RK.view === 'kanban') kanban(el); };
    ['rkLow', 'rkTh', 'rkSk'].forEach(function (i) { $('#' + i, el).onchange = fl; }); RK.fl = fl;
    $('#rkQ', el).oninput = debounce(function () { RK.tbl.search($('#rkQ', el).value); if (RK.view === 'kanban') kanban(el); }, 250);
    $$('.seg [data-v]', el).forEach(function (b) { b.onclick = function () { RK.view = b.dataset.v; $$('.seg [data-v]', el).forEach(function (x) { x.classList.toggle('on', x === b); }); $('#rkTabel', el).hidden = RK.view !== 'tabel'; $('#rkKan', el).hidden = RK.view !== 'kanban'; if (RK.view === 'kanban') kanban(el); }; });
    $('#rkNew', el).onclick = function () { formLowongan(el); };
    $('#rkX', el).onclick = function () { exportXlsx('Pelamar_' + ymd(), { Pelamar: RK.tbl.view().map(function (k) { return { Nama: k.nama, Email: k.email, WhatsApp: k.wa, Posisi: k.posisi, Sumber: k.sumber, Skor: k.skor, Tahap: k.tahap, Status: k.status, Masuk: k.dibuat, Domisili: k.domisili }; }) }); };
    $('#rkWa', el).onclick = function () { App.blastPrefill = RK.tbl.selected().map(function (k) { return { hp: k.wa, nama: k.nama, posisi: k.posisi }; }); go('notifikasi', 'blast'); };
    var lb = $('#rkLeads', el); if (lb) lb.onclick = async function () { var s = RK.tbl.selected().filter(function (k) { return k.status === 'Proses'; }); if (!s.length) return toast('Pilih kandidat berstatus proses.', 'warn'); if (!await confirmBox('Tolak ' + s.length + ' kandidat?', 'Kandidat dipindah ke Database Leads (grade otomatis dari skor) dan menerima email hasil seleksi sesuai pengaturan notifikasi.', 'Tolak & Pindahkan', true)) return; var r = await aksi(lb, 'kandidatPutus', { ids: s.map(function (k) { return k.id; }), keputusan: 'tolak' }, { bust: ['kandidatList', 'leadsList'] }); if (r.success) { RK.tbl.clearSel(); muatRK(el, true); refreshBoot(); } };
  },
  show: function (el) { muatRK(el); }
});
function muatRK(el, force) {
  swr('lowonganList', 'lowonganList', {}, function (rows) { RK.lowongan = rows; RK.low.set(rows); $('#rkLow', el).innerHTML = selectOpts(rows.map(function (l) { return { v: l.id, l: l.judul }; }), $('#rkLow', el).value, 'Semua Posisi (' + rows.filter(function (l) { return l.status === 'Buka'; }).length + ' Lowongan Aktif)'); }, { fresh: 60000, force: force });
  return swr('kandidatList', 'kandidatList', {}, function (rows) {
    var aktif = rows.filter(function (k) { return k.status === 'Proses'; }), c = function (t) { return aktif.filter(function (k) { return k.tahap === t; }).length; };
    var diterima = rows.filter(function (k) { return k.status === 'Diterima'; }).length, ditolak = rows.filter(function (k) { return k.status === 'Ditolak'; }).length;
    var minggu = rows.filter(function (k) { return new Date(k.dibuat) > Date.now() - 7 * 864e5; }).length;
    $('#rkSt', el).innerHTML = stat({ acc: 'navy', label: 'Total Pelamar Aktif', icon: 'users', val: aktif.length, unit: 'Pelamar', meta: '<span class="blue-t">' + ic('trending-up', 'ic-sm') + ' +' + minggu + ' pelamar baru minggu ini</span>' }) +
      stat({ acc: 'blue', label: 'Menunggu Screening HR', badge: c('Screening') ? '<span class="pill info">URGENT</span>' : '', val: c('Screening'), unit: 'Kandidat', meta: '<span>' + ic('timer', 'ic-sm') + ' SLA respon 3–5 hari kerja</span>' }) +
      stat({ acc: 'navy', label: 'Lolos Tahap Wawancara', icon: 'calendar', val: c('Wawancara') + c('Tes Teknis'), unit: 'Kandidat', meta: '<span>Offering: ' + c('Offering') + ' orang</span>' }) +
      stat({ label: 'Konversi Hire Rate', icon: 'target', val: rows.length ? (diterima / rows.length * 100).toFixed(1) + '%' : '0%', meta: '<span>' + diterima + ' diterima dari ' + rows.length + ' pelamar</span>' });
    var seg = [['Screening', c('Screening'), '#2563EB'], ['Wawancara', c('Wawancara') + c('Tes Teknis'), '#316BF3'], ['Offering', c('Offering'), '#141B2B'], ['Diterima', diterima, '#1D4ED8'], ['Ditolak / Leads', ditolak, '#DCE3EC']], tot = rows.length || 1;
    $('#rkTot', el).textContent = 'Total ' + rows.length + ' kandidat di database';
    $('#rkBar', el).innerHTML = seg.map(function (s) { return '<i style="width:' + (s[1] / tot * 100) + '%;background:' + s[2] + '" data-tip="' + s[0] + ': ' + s[1] + '"></i>'; }).join('');
    $('#rkLg', el).innerHTML = seg.map(function (s) { return '<span><i style="background:' + s[2] + '"></i>' + s[0] + ': <b>' + s[1] + '</b> (' + (s[1] / tot * 100).toFixed(1) + '%)</span>'; }).join('');
    RK.tbl.set(rows); RK.fl();
  }, { fresh: 30000, force: force });
}
function kanban(el) {
  var rows = RK.tbl.view(), kol = TAHAP.concat(['Diterima', 'Ditolak']);
  $('#rkKan', el).innerHTML = '<div style="display:grid;grid-template-columns:repeat(' + kol.length + ',minmax(220px,1fr));gap:12px;overflow-x:auto;padding-bottom:6px">' + kol.map(function (t) {
    var isi = rows.filter(function (k) { return k.status === 'Proses' ? k.tahap === t : k.status === t; });
    return '<div class="card tint"><div class="card-b tight"><div class="row between mb-8"><b class="small">' + t + '</b><span class="count">' + isi.length + '</span></div><div class="col">' + isi.slice(0, 40).map(function (k) { return '<a class="card" style="padding:10px;text-decoration:none;color:inherit" href="#/kandidat/' + k.id + '"><b class="small">' + esc(k.nama) + '</b><div class="small muted ellip">' + esc(k.posisi) + '</div><div class="mt-8">' + skorBar(k.skor) + '</div></a>'; }).join('') + '</div></div></div>'; }).join('') + '</div>';
}
function formLowongan(el, l) {
  l = l || { form: [], status: 'Buka' };
  var form = JSON.parse(JSON.stringify(l.form || []));
  modal({ title: l.id ? 'Edit Lowongan' : 'Buat Lowongan Baru', sub: 'Form builder: tambahkan pertanyaan khusus posisi (teks, paragraf, pilihan, angka, tanggal, tautan).', size: 'xl',
    body: '<div class="grid g-2"><form class="fgrid" id="fl"><div class="field full"><label>Judul Posisi <span class="req">*</span></label><input class="input" name="judul" value="' + esc(l.judul || '') + '"></div>' +
      '<div class="field"><label>Divisi</label><input class="input" name="divisi" value="' + esc(l.divisi || '') + '"></div><div class="field"><label>Tipe Kontrak</label><input class="input" name="tipe" list="dlTipe" value="' + esc(l.tipe || '') + '"><datalist id="dlTipe"><option value="Penuh Waktu (Tetap)"><option value="Penuh Waktu (PKWT)"><option value="Magang"><option value="Paruh Waktu"></datalist></div>' +
      '<div class="field"><label>Model Kerja</label><select class="select" name="model">' + selectOpts(['On-site', 'Hybrid', 'Remote'], l.model || 'On-site') + '</select></div><div class="field"><label>Lokasi</label><input class="input" name="lokasi" value="' + esc(l.lokasi || '') + '"></div>' +
      '<div class="field"><label>Level & Pengalaman</label><input class="input" name="level" placeholder="Middle • Min. 2 Tahun" value="' + esc(l.level || '') + '"></div><div class="field"><label>Kuota</label><input class="input mono" name="kuota" value="' + esc(l.kuota || 1) + '"></div>' +
      '<div class="field"><label>Batas Lamaran</label><input class="input" type="date" name="batas" value="' + esc(l.batas || '') + '"></div><div class="field"><label>Status</label><select class="select" name="status">' + selectOpts(['Buka', 'Tutup'], l.status || 'Buka') + '</select></div>' +
      '<div class="field full"><label>Deskripsi Pekerjaan</label><textarea class="textarea" name="deskripsi" rows="4">' + esc(l.deskripsi || '') + '</textarea></div><div class="field full"><label>Kualifikasi Kunci</label><textarea class="textarea" name="kualifikasi" rows="3">' + esc(l.kualifikasi || '') + '</textarea><span class="hint">Kata kunci di sini dipakai untuk skor kecocokan pelamar.</span></div>' +
      '<label class="check full"><input type="checkbox" name="populer"' + (l.populer ? ' checked' : '') + '><span>Tandai sebagai lowongan populer</span></label></form>' +
      '<div><div class="row between mb-8"><b>Pertanyaan Formulir</b><button class="btn btn-sec btn-sm" id="flAdd" type="button">' + ic('plus', 'ic-sm') + 'Tambah Pertanyaan</button></div><div id="flQ" class="col"></div><div class="note mt-12 small">' + ic('info', 'ic-sm') + '<div>Identitas, CV, dan persetujuan privasi selalu ada di formulir; tidak perlu ditambahkan.</div></div></div></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Simpan Lowongan', cls: 'btn-primary', act: async function (m) { var v = formVals($('#fl', m.el)); v.id = l.id; v.form = form; v.populer = !!v.populer; var r = await api('lowonganSave', v); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) { cacheBust(['lowonganList']); Store.del('pub:karir'); muatRK(el, true); } return r.success; } }],
    onOpen: function (mel) {
      function draw() {
        $('#flQ', mel).innerHTML = form.length ? form.map(function (f, i) { return '<div class="card tint"><div class="card-b tight col"><div class="row"><span class="count">' + (i + 1) + '</span><input class="input" data-i="' + i + '" data-k="label" value="' + esc(f.label) + '" placeholder="Pertanyaan"><button class="iconbtn" data-del="' + i + '" type="button">' + ic('trash-2', 'ic-sm') + '</button></div>' +
          '<div class="row wrap"><select class="select" data-i="' + i + '" data-k="tipe" style="width:auto">' + selectOpts([{ v: 'teks', l: 'Teks singkat' }, { v: 'area', l: 'Paragraf' }, { v: 'pilihan', l: 'Pilihan ganda' }, { v: 'angka', l: 'Angka (Rp)' }, { v: 'tanggal', l: 'Tanggal' }, { v: 'url', l: 'Tautan' }], f.tipe) + '</select><label class="check small"><input type="checkbox" data-i="' + i + '" data-k="wajib"' + (f.wajib ? ' checked' : '') + '>Wajib</label>' +
          (f.tipe === 'pilihan' ? '<input class="input grow" data-i="' + i + '" data-k="opsi" value="' + esc((f.opsi || []).join(', ')) + '" placeholder="Opsi dipisah koma">' : '') + '</div></div></div>'; }).join('') : empty('Belum ada pertanyaan khusus.', 'list-plus');
        $$('[data-k]', mel).forEach(function (inp) { inp.onchange = function () { var f = form[+inp.dataset.i], k = inp.dataset.k; f[k] = k === 'wajib' ? inp.checked : k === 'opsi' ? inp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : inp.value; if (k === 'tipe') draw(); }; });
        $$('[data-del]', mel).forEach(function (b) { b.onclick = function () { form.splice(+b.dataset.del, 1); draw(); }; });
      }
      $('#flAdd', mel).onclick = function () { form.push({ label: '', tipe: 'teks', wajib: false, opsi: [] }); draw(); };
      draw();
    } });
}

/* ============================================================ REVIEW KANDIDAT */
registerPage('kandidat', {
  auth: 'hrd', title: 'Review Kandidat', menu: 'rekrutmen',
  template: function () { return '<div id="kdWrap">' + skel(6, 60) + '</div>'; },
  show: async function (el, id) {
    var w = $('#kdWrap', el); w.innerHTML = skel(6, 60);
    var r = await api('kandidatDetail', { id: id });
    if (!r.success) { w.innerHTML = empty(r.message); return; }
    var k = r.data, proses = k.status === 'Proses';
    var low = (RK.lowongan || cacheGet('lowonganList') || []).filter(function (l) { return l.id === k.lowonganId; })[0] || { form: [] };
    w.innerHTML = pageHead({ crumbs: ['Beranda', 'Rekrutmen', 'Pipeline Pelamar', 'Review Kandidat'], title: 'Review Kandidat: ' + esc(k.nama) + ' ' + pill(proses ? 'Menunggu' : k.status, proses ? 'Tahap ' + k.tahap : k.status),
      actions: '<button class="btn btn-soft" id="kdCv">' + ic('cloud-download', 'ic-sm') + 'Unduh CV</button>' + (k.lampiran ? '<button class="btn btn-soft" id="kdLamp">' + ic('paperclip', 'ic-sm') + 'Lampiran</button>' : '') + '<a class="btn btn-soft" href="mailto:' + esc(k.email) + '?subject=' + encodeURIComponent('Lamaran ' + k.posisi) + '">' + ic('mail', 'ic-sm') + 'Email Kandidat</a><a class="btn btn-soft" target="_blank" rel="noopener" href="' + waLink(k.wa, 'Halo ' + k.nama + ', terkait lamaran ' + k.posisi + ' di ' + perusahaan() + '…') + '">' + ic('message-circle', 'ic-sm') + 'WhatsApp</a>' }) +
      '<div class="grid g-main"><div class="stack"><div class="viewer" id="kdView"><div class="card-b center" style="padding:60px">' + ic('file-text', 'ic-lg') + '<p class="muted">Pratinjau CV dimuat…</p></div></div></div>' +
      '<div class="stack"><div class="card"><div class="card-b"><div class="row gap-12">' + avatar(k.nama, 'lg') + '<div><b style="font-size:18px">' + esc(k.nama) + '</b><div class="small blue-t">' + ic('mail', 'ic-sm') + ' ' + esc(k.email) + '</div><div class="small">Lamaran: <b class="blue-t">' + esc(k.posisi) + '</b></div><div class="small muted mono">ID Aplikasi: ' + esc(k.id) + ' · Kode ' + esc(k.kode) + '</div></div></div>' +
      '<div class="card tint mt-16"><div class="card-b tight"><div class="row between"><span class="ov">Skor Kecocokan Posisi</span><b>' + k.skor + ' / 100 <span class="blue-t small">(' + (k.skor >= 80 ? 'Sangat Cocok' : k.skor >= 60 ? 'Menengah' : 'Rendah') + ')</span></b></div><div class="progress mt-8"><i style="width:' + k.skor + '%"></i></div><div class="small muted mt-8">Dihitung dari kelengkapan berkas & kecocokan kata kunci kualifikasi. Dapat disesuaikan HRD.</div></div></div>' +
      '<div class="grid g-3 mt-12" style="gap:8px"><div class="card tint center"><div class="card-b tight"><div class="small muted">Domisili</div><b class="small">' + esc(k.domisili || '-') + '</b></div></div><div class="card tint center"><div class="card-b tight"><div class="small muted">WhatsApp</div><b class="small mono">' + esc(k.wa) + '</b></div></div><div class="card tint center"><div class="card-b tight"><div class="small muted">Sumber</div><b class="small">' + esc(k.sumber) + '</b></div></div></div>' +
      (k.linkedin || k.portofolio ? '<div class="col mt-12 small">' + (k.linkedin ? '<a target="_blank" rel="noopener" href="https://' + esc(String(k.linkedin).replace(/^https?:\/\//, '')) + '">' + ic('link', 'ic-sm') + ' ' + esc(k.linkedin) + '</a>' : '') + (k.portofolio ? '<a target="_blank" rel="noopener" href="https://' + esc(String(k.portofolio).replace(/^https?:\/\//, '')) + '">' + ic('globe', 'ic-sm') + ' ' + esc(k.portofolio) + '</a>' : '') + '</div>' : '') + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Jawaban Khusus Formulir</h3><span class="small muted">Tahap Screening</span></div><div class="card-b col">' + (Object.keys(k.jawaban).length ? Object.keys(k.jawaban).map(function (q, i) { var j = k.jawaban[q]; return '<div class="card tint"><div class="card-b tight"><div class="ov blue-t">Pertanyaan ' + String(i + 1).padStart(2, '0') + ': ' + esc(j.label) + '</div><div class="mt-8" style="white-space:pre-line">' + esc(j.nilai || '-') + '</div></div></div>'; }).join('') : empty('Tidak ada pertanyaan khusus.')) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Catatan Evaluasi Screening HRD</h3><span class="small muted">Internal HR Ledger</span></div><div class="card-b col"><div class="grid g-2" style="gap:10px"><div class="field"><label>Tahap Seleksi</label><select class="select" id="kdTh"' + (proses ? '' : ' disabled') + '>' + selectOpts(TAHAP, k.tahap) + '</select></div><div class="field"><label>Skor (penyesuaian)</label><input class="input mono" id="kdSk" value="' + k.skor + '"' + (proses ? '' : ' disabled') + '></div></div>' +
      '<textarea class="textarea" id="kdCat" rows="4" placeholder="Catatan penilaian kandidat…"' + (proses ? '' : ' disabled') + '>' + esc(k.catatan || '') + '</textarea><label class="check small"><input type="checkbox" id="kdNot" checked><span>Kirim notifikasi WA/Email otomatis bila tahap berubah</span></label>' + (proses ? '<button class="btn btn-sec" id="kdSave">' + ic('save', 'ic-sm') + 'Simpan Catatan & Tahap</button>' : '') + '</div></div>' +
      (proses ? '<div class="card accent-top"><div class="card-h"><div><h3>' + ic('gavel') + 'Konsol Keputusan Rekrutmen</h3><div class="ov blue-t mt-8">Otoritas: Super Admin</div></div></div><div class="card-b col"><p class="small muted" style="margin:0">Pilih status final kandidat. Tindakan ini memicu otomatisasi data di Google Workspace:</p>' +
        '<div class="card tint"><div class="card-b tight"><button class="btn btn-primary btn-block" id="kdTerima"' + (isSA() ? '' : ' disabled') + '>' + ic('circle-check') + 'Terima Kandidat (Pindahkan ke Data Karyawan)</button><div class="small muted mt-8">Data kandidat, email pribadi, dan CV otomatis didaftarkan ke sheet Karyawan (status aktif) — kandidat langsung bisa login dengan akun Google tersebut.</div></div></div>' +
        '<div class="card tint"><div class="card-b tight"><button class="btn btn-danger btn-block" id="kdTolak"' + (isSA() ? '' : ' disabled') + '>' + ic('circle-x') + 'Tolak Kandidat (Simpan ke Database Leads)</button><div class="small muted mt-8">Kandidat diarsipkan ke Database Leads dengan grade A/B/C untuk dihubungi pada peluang berikutnya.</div></div></div>' + (isSA() ? '' : '<div class="note warn small">' + ic('lock', 'ic-sm') + '<div>Keputusan final hanya oleh Super Admin. Staff HRD melakukan screening & catatan.</div></div>') + '</div></div>' : '<div class="note ' + (k.status === 'Diterima' ? 'ok' : 'warn') + '">' + ic('info') + '<div>Kandidat sudah diputuskan: <b>' + esc(k.status) + '</b>.</div></div>') + '</div></div>';
    muatBerkas(w, k.id, 'cv');
    $('#kdCv', w).onclick = function () { muatBerkas(w, k.id, 'cv', true); };
    if ($('#kdLamp', w)) $('#kdLamp', w).onclick = function () { muatBerkas(w, k.id, 'lampiran', true); };
    if (proses) {
      $('#kdSave', w).onclick = async function () { var r = await aksi(this, 'kandidatUpdate', { id: k.id, tahap: $('#kdTh', w).value, skor: num($('#kdSk', w).value), catatan: $('#kdCat', w).value, notif: $('#kdNot', w).checked }, { bust: ['kandidatList'] }); if (r.success) k.tahap = $('#kdTh', w).value; };
      $('#kdTerima', w).onclick = function () { formTerima(el, k, low); };
      $('#kdTolak', w).onclick = function () {
        modal({ title: 'Tolak & Simpan ke Leads', sub: k.nama + ' — ' + k.posisi, body: '<div class="col gap-12"><div class="field"><label>Grade Talent Pool</label><select class="select" name="grade">' + selectOpts([{ v: 'A', l: 'Grade A — prioritas tinggi' }, { v: 'B', l: 'Grade B' }, { v: 'C', l: 'Grade C' }], k.skor >= 80 ? 'A' : k.skor >= 60 ? 'B' : 'C') + '</select></div><div class="field"><label>Keahlian Kunci (pisah koma)</label><input class="input" name="keahlian"></div><div class="field"><label>Catatan Evaluasi</label><textarea class="textarea" name="catatan" rows="3">' + esc($('#kdCat', w).value) + '</textarea></div><label class="check"><input type="checkbox" name="kirimNotif" checked><span>Kirim email hasil seleksi ke kandidat</span></label></div>',
          foot: [{ label: 'Batal', close: true }, { label: 'Tolak & Simpan ke Leads', cls: 'btn-danger', act: async function (m) { var v = formVals(m.el); v.id = k.id; v.keputusan = 'tolak'; var r = await api('kandidatPutus', v); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) { cacheBust(['kandidatList', 'leadsList']); refreshBoot(); go('rekrutmen'); } return r.success; } }] });
      };
    }
  }
});
async function muatBerkas(w, id, jenis, unduh) {
  var r = await api('kandidatDetail', { id: id, berkas: jenis }, { silent: !unduh });
  if (!r.success || !r.data.berkas) { if (unduh) toast(r.message || 'Berkas tidak tersedia.', 'bad'); $('#kdView', w).innerHTML = '<div class="card-b">' + empty('Berkas tidak tersedia.', 'file-x') + '</div>'; return; }
  var b = r.data.berkas;
  if (unduh) return unduhB64(b);
  if (b.b64 && /pdf/.test(b.mime)) { $('#kdView', w).innerHTML = '<div class="row between" style="padding:10px 14px;background:#fff;border-bottom:1px solid var(--line)"><b class="small row">' + ic('file-text', 'ic-sm') + esc(b.nama) + '</b><button class="btn btn-sec btn-xs" id="kvOpen">' + ic('maximize', 'ic-sm') + 'Buka penuh</button></div><iframe title="CV kandidat" src="' + URL.createObjectURL(b64Blob(b.b64, 'application/pdf')) + '"></iframe>'; $('#kvOpen', w).onclick = function () { lihatB64(b); }; }
  else $('#kdView', w).innerHTML = '<div class="card-b center" style="padding:50px">' + ic('file-text', 'ic-lg') + '<p><b>' + esc(b.nama || 'Berkas') + '</b></p><p class="muted small">Pratinjau hanya untuk PDF. Unduh untuk membuka DOCX.</p><button class="btn btn-primary" id="kvDl">Unduh Berkas</button></div>', $('#kvDl', w).onclick = function () { unduhB64(b); };
}
function formTerima(el, k, low) {
  modal({ title: 'Terima Kandidat sebagai Karyawan', sub: k.nama + ' akan login dengan akun Google ' + k.email, size: 'lg',
    body: '<div class="fgrid"><div class="field"><label>NIK Karyawan (kosongkan = otomatis)</label><input class="input mono" name="nik"></div><div class="field"><label>Tanggal Mulai Kerja</label><input class="input" type="date" name="tglMulai" value="' + ymd() + '"></div>' +
      '<div class="field"><label>Divisi</label><input class="input" name="divisi" value="' + esc(low.divisi || '') + '"></div><div class="field"><label>Jabatan</label><input class="input" name="jabatan" value="' + esc(k.posisi) + '"></div>' +
      '<div class="field"><label>Status Kerja</label><select class="select" name="statusKerja">' + selectOpts(['Probasi', 'Kontrak', 'Tetap'], 'Probasi') + '</select></div><div class="field"><label>Gaji Pokok (Rp)</label><input class="input mono" name="gajiPokok" inputmode="numeric"></div>' +
      '<div class="field"><label>Tunjangan (Rp)</label><input class="input mono" name="tunjangan" inputmode="numeric"></div><label class="check full"><input type="checkbox" name="kirimNotif" checked><span>Kirim ucapan selamat + info login via WA/Email</span></label></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Terima & Daftarkan Karyawan', cls: 'btn-primary', icon: 'user-check', act: async function (m) { var v = formVals(m.el); v.id = k.id; v.keputusan = 'terima'; var r = await api('kandidatPutus', v); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) { cacheBust(['kandidatList', 'karyawanList', 'adminDashboard']); refreshBoot(); go('rekrutmen'); } return r.success; } }] });
}

/* ============================================================ LEADS */
var LD = {};
registerPage('leads', {
  auth: 'hrd', title: 'Database Leads', menu: 'leads',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Rekrutmen', 'Database Leads'], title: 'Database Leads & Talent Pool', sub: 'Kandidat berpotensi yang belum lolos seleksi atau mendaftar ke Talent Pool. Siap dihubungi kembali saat posisi baru dibuka.',
      actions: '<button class="btn btn-sec" id="ldX">' + ic('download', 'ic-sm') + 'Export Excel Leads (.xlsx)</button><button class="btn btn-sec" id="ldBc">' + ic('mail', 'ic-sm') + 'Broadcast Lowongan Baru</button><button class="btn btn-primary" id="ldAdd">' + ic('user-plus', 'ic-sm') + 'Tambah Lead Manual</button>' }) +
      '<div class="grid g-4" id="ldSt"></div><div class="card mt-16"><div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="ldQ" placeholder="Cari nama lead, email, keahlian, atau posisi asal…"></div><select class="select soft" id="ldG">' + selectOpts([{ v: 'A', l: 'Grade A - Top Priority' }, { v: 'B', l: 'Grade B' }, { v: 'C', l: 'Grade C' }], '', 'Semua Grade') + '</select><select class="select soft" id="ldP"></select><select class="select soft" id="ldS">' + selectOpts(['Belum Dihubungi', 'Sudah Dihubungi', 'Tertarik', 'Tidak Tertarik'], '', 'Semua Status') + '</select></div></div></div>' +
      '<div class="card mt-16"><div class="card-b flush" id="ldT"></div></div><div class="card tint mt-16"><div class="card-b row top gap-16"><span class="avatar blue" style="border-radius:8px;width:44px;height:44px">' + ic('shield-check') + '</span><div class="grow"><b>Protokol Retensi Data Pelamar & Kepatuhan Privasi (UU PDP)</b><p class="small muted" style="margin:4px 0 0">Kandidat di database leads telah menyetujui penyimpanan data untuk penawaran kerja mendatang. Data tersimpan privat di Google Drive & Sheets <span class="chip mono">Leads_Database</span>. Data berusia &gt; 12 bulan dapat dianonimkan otomatis oleh Super Admin lewat Backup & Refresh Tahunan.</p></div></div></div>';
  },
  init: function (el) {
    LD.tbl = Table($('#ldT', el), { key: 'ID', select: true, per: 10, unit: 'leads kandidat', search: function (l) { return l.Nama + ' ' + l.Email + ' ' + l.Keahlian + ' ' + l.Posisi; }, cols: [
      { k: 'Nama', label: 'Nama Kandidat & Kontak', render: function (l) { return '<div class="cell-user">' + avatar(l.Nama) + '<div><b>' + esc(l.Nama) + '</b><span class="t2">' + ic('mail', 'ic-sm') + ' ' + esc(l.Email || '-') + '</span><span class="t2">' + ic('phone', 'ic-sm') + ' ' + esc(l.NoWA || '-') + '</span></div></div>'; } },
      { k: 'Posisi', label: 'Posisi Terakhir & Tgl', render: function (l) { return '<b>' + esc(l.Posisi) + '</b><span class="t2">Masuk: ' + tgl(l.Tgl_Ditolak || l.DibuatPada) + '</span>'; } },
      { k: 'Keahlian', label: 'Keahlian Kunci', render: function (l) { return '<div class="row wrap gap-4" style="max-width:220px">' + String(l.Keahlian || '').split(',').filter(function (s) { return s.trim(); }).slice(0, 4).map(function (s) { return '<span class="chip">' + esc(s.trim()) + '</span>'; }).join('') + '</div>'; } },
      { k: 'Catatan', label: 'Catatan Evaluasi', render: function (l) { return '<span class="small" style="display:block;max-width:260px">' + esc(String(l.Catatan || '').slice(0, 110)) + '</span>'; } },
      { k: 'StatusKontak', label: 'Kontak', render: function (l) { return pill(l.StatusKontak) + (l.TerakhirDihubungi ? '<span class="t2">' + relatif(l.TerakhirDihubungi) + '</span>' : ''); } },
      { k: 'Grade', label: 'Grade', render: function (l) { return '<span class="pill ' + (l.Grade === 'A' ? 'info' : '') + '">Grade ' + esc(l.Grade) + '</span>'; } },
      { label: '', render: function (l) { return '<div class="row">' + (l.NoWA ? '<a class="iconbtn" target="_blank" rel="noopener" title="WhatsApp" href="' + waLink(l.NoWA, 'Halo ' + l.Nama + ', kami dari tim HRD ' + perusahaan() + ' ingin menawarkan peluang posisi baru…') + '" data-wa="' + l.ID + '">' + ic('message-circle', 'ic-sm') + '</a>' : '') + '<button class="iconbtn" data-ed="' + l.ID + '" title="Edit">' + ic('pencil', 'ic-sm') + '</button></div>'; } }],
      after: function (tb) {
        $$('[data-ed]', tb).forEach(function (b) { b.onclick = function () { formLead(el, LD.tbl.rows().filter(function (l) { return l.ID === b.dataset.ed; })[0]); }; });
        $$('[data-wa]', tb).forEach(function (a) { a.addEventListener('click', function () { api('leadsSave', { ID: a.dataset.wa, StatusKontak: 'Sudah Dihubungi', dihubungi: true }, { silent: true }).then(function () { muatLD(el, true); }); }); });
      } });
    var fl = function () { var g = $('#ldG', el).value, p = $('#ldP', el).value, s = $('#ldS', el).value; LD.tbl.filter(function (l) { return (!g || l.Grade === g) && (!p || l.Posisi === p) && (!s || l.StatusKontak === s); }); };
    ['ldG', 'ldP', 'ldS'].forEach(function (i) { $('#' + i, el).onchange = fl; }); LD.fl = fl;
    $('#ldQ', el).oninput = debounce(function () { LD.tbl.search($('#ldQ', el).value); }, 250);
    $('#ldAdd', el).onclick = function () { formLead(el); };
    $('#ldX', el).onclick = function () { exportXlsx('Database_Leads_' + ymd(), { Leads: LD.tbl.view().map(function (l) { return { Nama: l.Nama, Email: l.Email, WhatsApp: l.NoWA, Posisi: l.Posisi, Keahlian: l.Keahlian, Grade: l.Grade, Status: l.StatusKontak, Catatan: l.Catatan, Masuk: l.DibuatPada }; }) }); };
    $('#ldBc', el).onclick = function () { var s = LD.tbl.selected(); App.blastPrefill = (s.length ? s : LD.tbl.view()).filter(function (l) { return l.NoWA; }).map(function (l) { return { hp: l.NoWA, nama: l.Nama, posisi: l.Posisi }; }); go('notifikasi', 'blast'); };
  },
  show: function (el) { muatLD(el); }
});
function muatLD(el, force) {
  return swr('leadsList', 'leadsList', {}, function (rows) {
    var a = rows.filter(function (l) { return l.Grade === 'A'; }).length, h = rows.filter(function (l) { return l.StatusKontak === 'Sudah Dihubungi' || l.TerakhirDihubungi; }).length;
    var pos = {}; rows.forEach(function (l) { pos[l.Posisi] = (pos[l.Posisi] || 0) + 1; }); var top = Object.keys(pos).sort(function (x, y) { return pos[y] - pos[x]; });
    $('#ldSt', el).innerHTML = stat({ label: 'Total Leads Tersimpan', icon: 'database', val: rows.length, unit: 'Kandidat', meta: '<span class="blue-t">' + ic('cloud', 'ic-sm') + ' Semua arsip tersimpan di Google Drive</span>' }) +
      stat({ label: 'Grade A (Prioritas Tinggi)', badge: '<span class="pill info">Top ' + (rows.length ? Math.round(a / rows.length * 100) : 0) + '%</span>', val: a, unit: 'Kandidat', meta: '<span class="blue-t">Skor screening ≥ 80</span>' }) +
      stat({ label: 'Pernah Dihubungi Ulang', icon: 'phone-call', val: h, unit: 'Kandidat', meta: '<span>Response rate: <b>' + (rows.length ? (h / rows.length * 100).toFixed(1) : 0) + '%</b></span>' }) +
      stat({ label: 'Top Posisi Diminati', icon: 'chart-column', val: '<span style="font-size:20px;line-height:26px">' + esc(top[0] || '-') + '</span>', bar: rows.length && top[0] ? pos[top[0]] / rows.length * 100 : 0, meta: '<span class="ellip">' + esc(top.slice(1, 3).join(', ')) + '</span>' });
    $('#ldP', el).innerHTML = selectOpts(top, $('#ldP', el).value, 'Semua Posisi');
    LD.tbl.set(rows); LD.fl();
  }, { fresh: 60000, force: force });
}
function formLead(el, l) {
  l = l || { Grade: 'B', StatusKontak: 'Belum Dihubungi' };
  modal({ title: l.ID ? 'Edit Lead — ' + l.Nama : 'Tambah Lead Manual', body: '<form class="fgrid" id="flead"><div class="field full"><label>Nama <span class="req">*</span></label><input class="input" name="Nama" value="' + esc(l.Nama || '') + '"></div><div class="field"><label>Email</label><input class="input" name="Email" value="' + esc(l.Email || '') + '"></div><div class="field"><label>WhatsApp</label><input class="input mono" name="NoWA" value="' + esc(l.NoWA || '') + '"></div>' +
    '<div class="field"><label>Posisi</label><input class="input" name="Posisi" value="' + esc(l.Posisi || '') + '"></div><div class="field"><label>Grade</label><select class="select" name="Grade">' + selectOpts(['A', 'B', 'C'], l.Grade) + '</select></div><div class="field full"><label>Keahlian (pisah koma)</label><input class="input" name="Keahlian" value="' + esc(l.Keahlian || '') + '"></div>' +
    '<div class="field"><label>Status Kontak</label><select class="select" name="StatusKontak">' + selectOpts(['Belum Dihubungi', 'Sudah Dihubungi', 'Tertarik', 'Tidak Tertarik'], l.StatusKontak) + '</select></div><div class="field full"><label>Catatan</label><textarea class="textarea" name="Catatan" rows="3">' + esc(l.Catatan || '') + '</textarea></div></form>',
    foot: [{ label: 'Batal', close: true }].concat(l.ID && isSA() ? [{ label: 'Hapus', cls: 'btn-danger-o', act: async function () { if (!await confirmBox('Hapus lead?', 'Data lead dihapus permanen dari sheet (hak dihapus UU PDP).', 'Hapus', true)) return false; var r = await api('leadsHapus', { id: l.ID }); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatLD(el, true); return r.success; } }] : [])
      .concat([{ label: 'Simpan', cls: 'btn-primary', act: async function (m) { var v = formVals($('#flead', m.el)); if (l.ID) v.ID = l.ID; var r = await api('leadsSave', v); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatLD(el, true); return r.success; } }]) });
}

/* ============================================================ ARSIP DOKUMEN (HRD) */
registerPage('arsip', {
  auth: 'hrd', title: 'Dokumen Arsip', menu: 'arsip',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Dokumen Arsip'], title: 'Arsip Dokumen Karyawan', sub: 'Seluruh dokumen karyawan tersimpan privat di Google Drive /Dokumen_Karyawan/{NIK}/. Verifikasi unggahan karyawan di sini.', actions: '<a class="btn btn-sec" href="#/template">' + ic('file-text', 'ic-sm') + 'Buat Surat dari Template</a>' }) +
      '<div class="card"><div class="card-b"><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="arQ" placeholder="Cari nama, NIK, berkas…"></div><select class="select soft" id="arS">' + selectOpts(['Menunggu Verifikasi', 'Terverifikasi'], '', 'Semua Status') + '</select><select class="select soft" id="arJ"></select><span class="grow"></span><button class="btn btn-accent btn-sm" id="arVer" disabled>' + ic('check-check', 'ic-sm') + 'Verifikasi Terpilih</button></div></div><div class="card-b flush" id="arT"></div></div>';
  },
  init: function (el) {
    var tb = App.tables.ar = Table($('#arT', el), { key: 'ID', select: true, per: 15, unit: 'dokumen', search: function (d) { return d.Nama + ' ' + d.NIK + ' ' + d.NamaFile + ' ' + d.JenisDokumen; }, cols: [
      { k: 'Nama', label: 'Karyawan', render: function (d) { return userCell(d.Nama || d.NIK, 'NIK ' + d.NIK + ' · ' + (d.Divisi || '')); } },
      { k: 'JenisDokumen', label: 'Jenis' }, { k: 'NamaFile', label: 'Berkas', render: function (d) { return '<span class="small">' + esc(d.NamaFile) + '</span><span class="t2">' + (num(d.Ukuran) ? (num(d.Ukuran) / 1048576).toFixed(2) + ' MB' : '') + '</span>'; } },
      { k: 'TglUpload', label: 'Diunggah', render: function (d) { return tgl(d.TglUpload) + '<span class="t2">' + esc(String(d.DiunggahOleh).split('@')[0]) + '</span>'; } },
      { k: 'Status', label: 'Status', render: function (d) { return pill(d.Status); } },
      { label: '', render: function (d) { return '<div class="row"><button class="iconbtn" data-o="' + d.ID + '" title="Buka">' + ic('external-link', 'ic-sm') + '</button>' + (isSA() ? '<button class="iconbtn" data-h="' + d.ID + '" title="Hapus">' + ic('trash-2', 'ic-sm') + '</button>' : '') + '</div>'; } }],
      onSelect: function (s) { $('#arVer', el).disabled = !s.length; },
      after: function (t) {
        $$('[data-o]', t).forEach(function (b) { b.onclick = async function () { var r = await withBusy(b, function () { return api('dokUnduh', { id: b.dataset.o }); }); if (r.success) lihatB64(r.data); else toast(r.message, 'bad'); }; });
        $$('[data-h]', t).forEach(function (b) { b.onclick = async function () { if (!await confirmBox('Hapus dokumen?', 'Berkas dipindah ke sampah Google Drive dan metadata dihapus.', 'Hapus', true)) return; var r = await aksi(b, 'dokHapus', { id: b.dataset.h }); if (r.success) muatAr(el, true); }; });
      } });
    $('#arQ', el).oninput = debounce(function () { tb.search($('#arQ', el).value); }, 250);
    var fl = function () { var s = $('#arS', el).value, j = $('#arJ', el).value; tb.filter(function (d) { return (!s || d.Status === s) && (!j || d.JenisDokumen === j); }); };
    $('#arS', el).onchange = fl; $('#arJ', el).onchange = fl; App.arFl = fl;
    $('#arVer', el).onclick = async function () { var r = await aksi(this, 'dokVerifikasi', { ids: tb.selected().map(function (d) { return d.ID; }) }); if (r.success) { tb.clearSel(); muatAr(el, true); } };
  },
  show: function (el) { muatAr(el); }
});
function muatAr(el, force) {
  return swr('dokList', 'dokList', {}, function (rows) { var j = {}; rows.forEach(function (d) { j[d.JenisDokumen] = 1; }); $('#arJ', el).innerHTML = selectOpts(Object.keys(j), $('#arJ', el).value, 'Semua Jenis'); App.tables.ar.set(rows); App.arFl(); }, { fresh: 60000, force: force });
}

/* ============================================================ LAPORAN & KPI */
var LP = {};
function kuartalIni() { var d = new Date(); return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1); }
registerPage('laporan', {
  auth: 'hrd', title: 'Laporan & KPI', menu: 'laporan',
  template: function () {
    return '<div id="lpHead"></div><div class="tabs boxed mb-16"><button class="tab on" data-tab="kpi">' + ic('layout-dashboard') + 'Ringkasan Eksekutif & KPI</button><button class="tab" data-tab="hadir">' + ic('clock') + 'Analisis Kehadiran</button><button class="tab" data-tab="pay">' + ic('banknote') + 'Distribusi Anggaran Payroll</button></div>' +
      '<div class="grid g-4" id="lpSt"></div><div data-pane="kpi" class="mt-16"><div class="grid g-main"><div class="card"><div class="card-h"><div><h3>' + ic('chart-bar') + 'Distribusi Skor KPI per Divisi</h3><p class="sub">Rata-rata skor penilaian per unit (target 85)</p></div><div class="legend"><span><i style="background:#141B2B"></i>Realisasi</span><span><i style="background:transparent;border-left:2px solid #141B2B;border-radius:0"></i>Target</span></div></div><div class="card-b" id="lpDiv"></div></div>' +
      '<div class="stack"><div class="card"><div class="card-h"><h3>' + ic('trending-up') + 'Korelasi Punctuality vs KPI</h3></div><div class="card-b" id="lpKor"></div></div><div class="card"><div class="card-h"><h3>' + ic('chart-pie') + 'Distribusi Predikat Kinerja</h3></div><div class="card-b" id="lpPred"></div></div></div></div>' +
      '<div class="card mt-16"><div class="card-h"><div><h3>' + ic('table') + 'Matriks Evaluasi Kinerja Karyawan & Skor Terkini</h3><p class="sub">Rekap penilaian, kehadiran tervalidasi, dan catatan reviewer kuartal berjalan</p></div><div class="row"><div class="input-ic">' + ic('search') + '<input class="input soft" id="lpQ" placeholder="Cari nama, NIK, divisi…" style="height:34px"></div><button class="btn btn-sec btn-sm" id="lpXm">' + ic('download', 'ic-sm') + 'Export</button></div></div><div class="card-b flush" id="lpM"></div></div></div>' +
      '<div data-pane="hadir" hidden class="mt-16"><div class="card"><div class="card-h"><h3>Tingkat Ketepatan & Kehadiran per Bulan</h3></div><div class="card-b" id="lpHd"></div></div></div>' +
      '<div data-pane="pay" hidden class="mt-16"><div class="card"><div class="card-h"><h3>Realisasi Anggaran Payroll per Bulan</h3></div><div class="card-b" id="lpPy"></div></div></div>';
  },
  init: function (el) {
    bindTabs(el);
    LP.tbl = Table($('#lpM', el), { key: 'id', per: 10, unit: 'karyawan', sort: 'skor', dir: -1, search: function (r) { return r.nama + ' ' + r.nik + ' ' + r.divisi; }, cols: [
      { k: 'nama', label: 'Karyawan / NIK', render: function (r) { return userCell(r.nama, 'NIK: ' + r.nik + ' • ' + r.email); } },
      { k: 'divisi', label: 'Divisi & Jabatan', render: function (r) { return '<b class="small">' + esc(r.divisi || '-') + '</b><span class="t2">' + esc(r.jabatan || '') + '</span>'; } },
      { k: 'skor', label: 'Skor KPI', cls: 'n', render: function (r) { return r.skor == null ? '<span class="muted">—</span>' : '<b class="num" style="font-size:16px">' + r.skor.toFixed(1) + '</b><div class="progress thin mt-8 ' + (r.skor >= 90 ? 'navy' : '') + '"><i style="width:' + Math.min(100, r.skor) + '%"></i></div>'; } },
      { k: 'tepat', label: 'Rasio Tepat Waktu', cls: 'n', render: function (r) { return r.sesi ? '<b class="mono">' + (r.tepat / r.sesi * 100).toFixed(1) + '%</b><span class="t2">' + r.tepat + '/' + r.sesi + ' Sesi</span>' : '-'; } },
      { label: 'Predikat', render: function (r) { if (r.skor == null) return '<span class="pill">Belum dinilai</span>'; var p = r.skor >= 90 ? ['navy', '★ Grade A+'] : r.skor >= 80 ? ['solid-blue', 'Grade A'] : r.skor >= 70 ? ['', 'Grade B'] : ['bad', 'Grade C']; return '<span class="pill ' + p[0] + '">' + p[1] + '</span>'; } },
      { k: 'catatan', label: 'Catatan Reviewer HRD', render: function (r) { return '<span class="small ellip" style="display:block;max-width:260px">' + esc(r.catatan || '') + '</span>'; } },
      { label: '', render: function (r) { return '<button class="btn btn-ghost btn-xs" data-kpi="' + r.id + '">' + ic('pencil', 'ic-sm') + 'Nilai</button>'; } }],
      after: function (tb) { $$('[data-kpi]', tb).forEach(function (b) { b.onclick = function () { formKpi(el, b.dataset.kpi); }; }); } });
    $('#lpQ', el).oninput = debounce(function () { LP.tbl.search($('#lpQ', el).value); }, 250);
    $('#lpXm', el).onclick = function () { exportXlsx('Matriks_KPI_' + LP.periode, { KPI: LP.tbl.view().map(function (r) { return { NIK: r.nik, Nama: r.nama, Divisi: r.divisi, Jabatan: r.jabatan, 'Skor KPI': r.skor, 'Tepat Waktu (%)': r.sesi ? +(r.tepat / r.sesi * 100).toFixed(1) : '', Catatan: r.catatan }; }) }); };
  },
  show: function (el) { LP.periode = LP.periode || kuartalIni(); muatLP(el); }
});
function muatLP(el, force) {
  var opsi = []; var y = new Date().getFullYear(); [y, y - 1].forEach(function (t) { for (var q = 4; q >= 1; q--) opsi.push({ v: t + '-Q' + q, l: 'Kuartal ' + q + ' ' + t }); });
  $('#lpHead', el).innerHTML = pageHead({ crumbs: ['Beranda', 'Laporan & KPI', 'Eksekutif Analytics'], title: 'Laporan & Evaluasi Kinerja Eksekutif <span class="pill solid-blue">' + esc(LP.periode.replace('-', ' ')) + '</span>', sub: 'Konsolidasi metrik kehadiran, realisasi anggaran penggajian, dan skor pencapaian KPI seluruh divisi ' + esc(perusahaan()) + '.',
    actions: '<select class="select" id="lpPer" style="width:auto">' + selectOpts(opsi, LP.periode) + '</select><select class="select" id="lpDv" style="width:auto"><option value="">Semua Divisi</option></select><button class="btn btn-sec" id="lpX">' + ic('download', 'ic-sm') + 'Unduh Laporan (.xlsx)</button><button class="btn btn-primary" id="lpAdd">' + ic('circle-plus', 'ic-sm') + 'Input Penilaian KPI</button>' });
  $('#lpPer', el).onchange = function () { LP.periode = this.value; muatLP(el); };
  $('#lpDv', el).onchange = function () { LP.divisi = this.value; muatLP(el); };
  $('#lpAdd', el).onclick = function () { formKpi(el); };
  return swr('laporan:' + LP.periode + ':' + (LP.divisi || ''), 'laporan', { periode: LP.periode, divisi: LP.divisi || '' }, function (d) {
    LP.data = d;
    $('#lpDv', el).innerHTML = selectOpts(d.divisiList, LP.divisi || '', 'Semua Divisi');
    var r = d.ringkas;
    $('#lpSt', el).innerHTML = stat({ acc: 'navy', label: 'Rata-rata Skor KPI Perusahaan', icon: 'award', val: r.kpi || '—', unit: '/ 100', meta: '<span>' + r.karyawan + ' karyawan aktif</span>' }) +
      stat({ acc: 'blue', label: 'Rasio Disiplin Kehadiran', icon: 'badge-check', val: r.punctuality + '%', unit: '(Punctuality)', meta: '<span>' + r.sesi.toLocaleString('id-ID') + ' log presensi</span><span class="pill info">≥ 90% target</span>' }) +
      stat({ label: 'Total Anggaran Payroll', icon: 'banknote', val: rpShort(r.payroll), meta: '<span>Gaji bersih 3 bulan kuartal</span>' }) +
      stat({ acc: 'navy', label: 'Indeks Retensi & Stabilitas', icon: 'users', val: r.retensi + '%', unit: '(Net Retention)', meta: '<span>' + r.keluar + ' nonaktif tahun ini</span>' });
    $('#lpDiv', el).innerHTML = d.divisi.length ? '<div class="hbar">' + d.divisi.sort(function (a, b) { return b.skor - a.skor; }).map(function (x, i) { var g = x.skor >= 90 ? 'A+' : x.skor >= 85 ? 'A' : x.skor >= 80 ? 'B+' : 'B'; return '<div class="hbar-row"><div class="top"><span>' + esc(x.divisi) + ' <span class="small muted">(' + x.n + ' org)</span></span><span class="row"><b class="num">' + x.skor + '</b><span class="tag ' + (x.skor >= 85 ? 'navy' : '') + '">Grade ' + g + '</span></span></div><div class="hbar-track"><i style="width:' + Math.min(100, x.skor) + '%;background:' + (i % 2 ? '#2563EB' : '#141B2B') + '"></i><b style="left:85%"></b></div><div class="row between small mt-8"><span class="muted">Target: 85.0</span><span class="' + (x.skor >= 85 ? 'blue-t' : 'warn-t') + '">' + (x.skor >= 85 ? '+' : '') + (x.skor - 85).toFixed(1) + ' dari target</span></div></div>'; }).join('') + '</div>' : empty('Belum ada penilaian KPI pada ' + d.periode + '. Tekan "Input Penilaian KPI".', 'award');
    $('#lpKor', el).innerHTML = '<div class="grid g-3" style="gap:8px">' + d.bulan.map(function (b) { return '<div class="card tint center"><div class="card-b tight"><div class="small muted">' + BULAN[+b.bulan.slice(5) - 1] + '</div><b class="num" style="font-size:20px">' + b.punctuality + '%</b><div class="small blue-t">KPI ' + (b.kpi == null ? '—' : b.kpi) + '</div></div></div>'; }).join('') + '</div><div class="note mt-12 small">' + ic('sparkles', 'ic-sm') + '<div>Bandingkan tren ketepatan waktu dengan skor KPI bulanan (bila HRD menilai per bulan) untuk melihat keterkaitan disiplin & output.</div></div>';
    var p = d.predikat, tot = (p['A+'] + p.A + p.B + p.C) || 1, seg = [['A+ (Istimewa)', p['A+'], '#141B2B'], ['A (Sangat Baik)', p.A, '#2563EB'], ['B (Cukup)', p.B, '#76777D'], ['C (Pembinaan)', p.C, '#BA1A1A']];
    $('#lpPred', el).innerHTML = '<div class="seg-bar">' + seg.map(function (s) { return '<i style="width:' + (s[1] / tot * 100) + '%;background:' + s[2] + '" data-tip="' + s[0] + ': ' + s[1] + '"></i>'; }).join('') + '</div><div class="grid g-2 mt-12" style="gap:8px">' + seg.map(function (s, i) { return '<div class="kvbox" style="' + (i === 3 && s[1] ? 'background:var(--bad-bg)' : '') + '"><span class="row small"><i style="width:9px;height:9px;border-radius:50%;background:' + s[2] + '"></i>' + s[0] + '</span><b>' + s[1] + ' Org <span class="small muted">(' + Math.round(s[1] / tot * 100) + '%)</span></b></div>'; }).join('') + '</div>';
    LP.tbl.set(d.matriks);
    $('#lpHd', el).innerHTML = chartBars(d.bulan.map(function (b) { return { label: BULAN[+b.bulan.slice(5) - 1], values: { a: b.punctuality } }; }), { keys: [{ k: 'a', color: '#2563EB', label: 'Tepat waktu %' }], h: 220, max: 100, pct: true, target: 90, targetLabel: 'Target 90%' }) + '<div class="grid g-3 mt-12">' + d.bulan.map(function (b) { return '<div class="kvbox"><span>' + BULAN[+b.bulan.slice(5) - 1] + ' — kehadiran</span><b>' + b.kehadiran + '%</b></div>'; }).join('') + '</div>';
    $('#lpPy', el).innerHTML = chartBars(d.bulan.map(function (b) { return { label: BULAN[+b.bulan.slice(5) - 1], values: { a: b.payroll / 1e6 } }; }), { keys: [{ k: 'a', color: '#141B2B', label: 'Payroll (juta Rp)' }], h: 220 }) + '<div class="grid g-3 mt-12">' + d.bulan.map(function (b) { return '<div class="kvbox"><span>' + BULAN[+b.bulan.slice(5) - 1] + '</span><b class="num">' + rpShort(b.payroll) + '</b></div>'; }).join('') + '</div>';
    $('#lpX', el).onclick = function () { exportXlsx('Laporan_Eksekutif_' + d.periode, { Ringkasan: [{ Periode: d.periode, 'KPI Rata-rata': r.kpi, 'Punctuality %': r.punctuality, 'Log Presensi': r.sesi, 'Payroll Kuartal': r.payroll, 'Retensi %': r.retensi }], Divisi: d.divisi, Bulanan: d.bulan, Matriks: d.matriks.map(function (m) { return { NIK: m.nik, Nama: m.nama, Divisi: m.divisi, 'Skor KPI': m.skor, 'Tepat Waktu': m.tepat, Sesi: m.sesi, Catatan: m.catatan }; }) }); };
  }, { fresh: 120000, force: force });
}
async function formKpi(el, idKaryawan) {
  var list = cacheGet('karyawanList'); if (!list) { var rr = await api('karyawanList'); list = rr.success ? rr.data : []; cacheSet('karyawanList', list); }
  var ind = [{ nama: '', target: '', bobot: 1, skor: '' }];
  modal({ title: 'Input Penilaian KPI', sub: 'Skor akhir = rata-rata tertimbang skor indikator (0–120).', size: 'lg',
    body: '<div class="fgrid"><div class="field"><label>Karyawan</label><select class="select" name="idKaryawan">' + selectOpts(list.filter(function (k) { return k.Status === 'Aktif'; }).map(function (k) { return { v: k.ID, l: k.Nama + ' · ' + (k.Divisi || '') }; }), idKaryawan || '', 'Pilih karyawan…') + '</select></div><div class="field"><label>Periode</label><input class="input mono" name="periode" value="' + esc(LP.periode || kuartalIni()) + '"><span class="hint">Format yyyy-Q1..Q4 atau yyyy-MM</span></div></div>' +
      '<div class="row between mt-16 mb-8"><b>Indikator (KRA)</b><button class="btn btn-sec btn-sm" id="kiAdd" type="button">' + ic('plus', 'ic-sm') + 'Tambah Indikator</button></div><div id="kiL" class="col"></div><div class="kvbox mt-12"><b>Skor Akhir</b><b class="num blue-t" style="font-size:20px" id="kiS">0</b></div><div class="field mt-12"><label>Catatan Reviewer</label><textarea class="textarea" name="catatan" rows="3"></textarea></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Simpan Penilaian', cls: 'btn-primary', act: async function (m) { var v = formVals(m.el); v.indikator = ind; var r = await api('kpiSave', v); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success && el) muatLP(el, true); return r.success; } }],
    onOpen: function (mel) {
      function hitung() { var tb = 0, s = 0; ind.forEach(function (i) { if (i.nama && i.skor !== '') { tb += num(i.bobot) || 1; s += num(i.skor) * (num(i.bobot) || 1); } }); $('#kiS', mel).textContent = tb ? (s / tb).toFixed(1) : '0'; }
      function draw() {
        $('#kiL', mel).innerHTML = ind.map(function (i, x) { return '<div class="row"><input class="input grow" data-x="' + x + '" data-k="nama" placeholder="Nama indikator" value="' + esc(i.nama) + '"><input class="input" style="width:120px" data-x="' + x + '" data-k="target" placeholder="Target" value="' + esc(i.target) + '"><input class="input mono" style="width:70px" data-x="' + x + '" data-k="bobot" placeholder="Bobot" value="' + esc(i.bobot) + '"><input class="input mono" style="width:80px" data-x="' + x + '" data-k="skor" placeholder="Skor" value="' + esc(i.skor) + '"><button class="iconbtn" data-dx="' + x + '" type="button">' + ic('x', 'ic-sm') + '</button></div>'; }).join('');
        $$('[data-k]', mel).forEach(function (inp) { inp.oninput = function () { ind[+inp.dataset.x][inp.dataset.k] = inp.value; hitung(); }; });
        $$('[data-dx]', mel).forEach(function (b) { b.onclick = function () { ind.splice(+b.dataset.dx, 1); draw(); hitung(); }; });
      }
      $('#kiAdd', mel).onclick = function () { ind.push({ nama: '', target: '', bobot: 1, skor: '' }); draw(); };
      draw();
    } });
}
