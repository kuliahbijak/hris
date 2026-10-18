/* ============================================================================
 * SIM HRD — pages-public.js
 * Portal Karir (publik) · Formulir Lamaran · Talent Pool · Login Google · Akses Ditolak · Verifikasi Dokumen
 * ========================================================================== */
'use strict';

function pubNav(aktif) {
  return '<header class="pub-nav"><div class="in"><a href="#/karir" class="row" style="color:inherit;text-decoration:none"><div class="logo">' + ic('building-2') + '</div><div><div class="brand-t">SIM HRD</div><div class="brand-s">' + esc(perusahaan()) + '</div></div></a>' +
    '<nav><a href="#/karir" class="' + (aktif === 'karir' ? 'on' : '') + '">Semua Lowongan</a><a href="#/karir" data-scroll="tentang">Tentang Perusahaan</a><a href="#/karir" data-scroll="alur">Alur Rekrutmen</a><a href="#/karir" data-scroll="faq">FAQ Pelamar</a></nav>' +
    '<a class="btn btn-sec btn-sm" href="#/login">' + ic('log-in', 'ic-sm') + '<span class="hide-m">Login Karyawan / Staff HRD</span><span class="show-m">Masuk</span></a></div></header>';
}
function pubFoot() {
  var p = App.pub || {};
  return '<footer class="pub-foot"><div class="in"><div style="max-width:360px"><div class="row"><div class="logo">' + ic('building-2') + '</div><div><b>' + esc(perusahaan()) + '</b><div class="small muted">Sistem Tata Kelola SDM & Portal Karir Resmi</div></div></div>' +
    '<p class="small muted" style="margin:12px 0 0">' + esc(p.alamat || '') + '</p></div>' +
    '<div><div class="ov mb-8">Navigasi Karir</div><div class="col small"><a href="#/karir">Lowongan Pekerjaan Aktif</a><a href="#/karir" data-scroll="alur">Tahapan Seleksi</a><a href="#/karir/TALENT_POOL">Kirim CV ke Talent Pool</a><a href="javascript:void 0" data-status>Cek Status Lamaran</a></div></div>' +
    '<div style="max-width:320px"><div class="ov mb-8">Kontak Tim Talent Acquisition</div><div class="col small">' + (p.hrdEmail ? '<span class="row">' + ic('mail', 'ic-sm') + esc(p.hrdEmail) + '</span>' : '') + (p.hrdWa ? '<span class="row">' + ic('phone', 'ic-sm') + esc(p.hrdWa) + '</span>' : '') +
    '<div class="note small" style="margin-top:6px">' + ic('shield-check', 'ic-sm') + '<div><b>Catatan Resmi:</b> Rekrutmen ' + esc(perusahaan()) + ' tidak pernah memungut biaya apa pun.</div></div></div></div></div>' +
    '<div class="pwrap small muted" style="padding-bottom:22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><span>© ' + new Date().getFullYear() + ' ' + esc(perusahaan()) + '. Seluruh hak cipta dilindungi.</span><span><span class="dotlive"></span>Server Recruitment Aktif</span></div></footer>';
}
function bindPub(el) {
  $$('[data-scroll]', el).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); if (App.cur !== 'karir') { go('karir'); setTimeout(function () { var t = $('#' + a.dataset.scroll); if (t) t.scrollIntoView({ behavior: 'smooth' }); }, 300); return; } var t = $('#' + a.dataset.scroll); if (t) t.scrollIntoView({ behavior: 'smooth' }); }; });
  $$('[data-status]', el).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); cekStatusLamaran(); }; });
}
async function muatKarir(force) {
  var c = Store.get('pub:karir', null);
  if (c && !force && Date.now() - c.t < 300000) { App.pub = c.data; return c.data; }
  var r = await api('karirList', {}, { silent: !!c });
  if (r.success) { Store.set('pub:karir', { t: Date.now(), data: r.data }); App.pub = r.data; return r.data; }
  if (c) { App.pub = c.data; return c.data; }
  throw new Error(r.message);
}
function sisaHari(t) { if (!t) return null; return Math.ceil((toDate(t) - new Date(ymd() + 'T00:00:00')) / 864e5); }
function cekStatusLamaran() {
  modal({ title: 'Cek Status Lamaran', sub: 'Masukkan email & kode lamaran yang Anda terima setelah mengirim lamaran.', size: 'sm',
    body: '<div class="col gap-12"><div class="field"><label>Email</label><input class="input" name="email" type="email" autocomplete="email"></div><div class="field"><label>Kode Lamaran</label><input class="input mono" name="kode" maxlength="8" style="text-transform:uppercase"></div><div id="stHasil"></div></div>',
    foot: [{ label: 'Tutup', close: true }, { label: 'Cek Status', cls: 'btn-primary', act: async function (m) {
      var v = formVals(m.el), r = await api('karirStatus', v);
      $('#stHasil', m.el).innerHTML = r.success ? '<div class="note ' + (r.data.status === 'Diterima' ? 'ok' : r.data.status === 'Ditolak' ? 'warn' : '') + '">' + ic('info') + '<div><b>' + esc(r.data.posisi) + '</b><br>' + esc(r.data.label) + '<div class="small muted">Dikirim ' + tglJam(r.data.dikirim) + '</div></div></div>' : '<div class="note bad">' + ic('circle-alert') + '<div>' + esc(r.message) + '</div></div>';
      return false;
    } }] });
}

/* ---------------------------------------------------------------- KARIR (landing) */
registerPage('karir', {
  layout: 'public', auth: 'public', title: 'Portal Karir',
  template: function () {
    return '<div id="karirTop"></div><section class="hero"><span class="badge" id="hBadge">Karier & Kesempatan Bertumbuh</span><h1 id="hTitle">Bergabung & Berkembang Bersama Kami</h1>' +
      '<p>Wujudkan transformasi digital bersama tim lintas disiplin yang adaptif, transparan, dan berorientasi dampak nyata.</p>' +
      '<div class="trust"><span>' + ic('shield-check', 'ic-sm') + 'Rekrutmen Resmi & Akuntabel</span><span>' + ic('zap', 'ic-sm') + 'Respon Cepat 3–5 Hari</span><span>' + ic('badge-check', 'ic-sm') + 'Bebas Pungutan Biaya</span></div></section>' +
      '<div class="pwrap"><div class="searchcard"><div class="fr"><div class="field"><label class="ov">Pencarian Posisi</label><div class="input-ic">' + ic('search') + '<input class="input soft" id="kQ" placeholder="Cari posisi, divisi, atau teknologi…"></div></div>' +
      '<div class="field"><label class="ov">Divisi Kerja</label><select class="select soft" id="kDiv"></select></div><div class="field"><label class="ov">Tipe Kontrak</label><select class="select soft" id="kTipe"></select></div>' +
      '<div class="field"><label class="ov">Model Kerja</label><select class="select soft" id="kModel"></select></div></div>' +
      '<div class="row between mt-12"><button class="btn btn-ghost btn-sm" id="kReset">' + ic('rotate-ccw', 'ic-sm') + 'Reset Filter</button><button class="btn btn-primary" id="kCari">' + ic('search', 'ic-sm') + 'Cari Lowongan</button></div></div>' +
      '<div class="grid g-4 mt-24" id="tentang">' +
      '<div class="infocard"><div class="ico">' + ic('briefcase') + '</div><div class="ov blue-t">Status Rekrutmen</div><div class="strong mt-8" id="kJml">– Posisi Dibuka</div><div class="small muted mt-8">Kebutuhan talenta untuk penguatan tim ' + esc(perusahaan()) + '.</div></div>' +
      '<div class="infocard"><div class="ico">' + ic('building') + '</div><div class="ov blue-t">Keseimbangan Kerja</div><div class="strong mt-8">Hybrid & On-site</div><div class="small muted mt-8">Model kerja fleksibel sesuai kebutuhan peran dan tim.</div></div>' +
      '<div class="infocard"><div class="ico">' + ic('trophy') + '</div><div class="ov blue-t">Kompensasi & Karier</div><div class="strong mt-8">KPI & Merit-Based</div><div class="small muted mt-8">Evaluasi transparan berbasis KPI dengan jenjang promosi terukur.</div></div>' +
      '<div class="infocard"><div class="ico">' + ic('shield-check') + '</div><div class="ov blue-t">Proteksi Komprehensif</div><div class="strong mt-8">BPJS & Asuransi</div><div class="small muted mt-8">BPJS Kesehatan dan BPJS Ketenagakerjaan untuk karyawan.</div></div></div>' +
      '<div class="row between mt-24 mb-16 wrap"><h2 style="margin:0;font-size:18px" class="row"><span class="dotlive" style="background:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.15)"></span>Menampilkan <span class="blue-t" id="kCount">0</span> Lowongan Kerja Aktif</h2>' +
      '<label class="row small"><span class="ov">Urutkan</span><select class="select" id="kSort" style="width:auto;height:34px"><option value="baru">Terbaru</option><option value="batas">Batas lamaran terdekat</option><option value="az">A–Z</option></select></label></div>' +
      '<div class="grid g-2" id="kList">' + skel(4, 220) + '</div>' +
      '<section id="alur" class="mt-24" style="padding-top:28px"><div class="center"><div class="ov blue-t">Alur Transparan</div><h2 style="margin:6px 0 6px;font-size:24px">Tahapan Seleksi Rekrutmen</h2><p class="muted" style="margin:0 auto 20px;max-width:560px">Proses seleksi objektif, berbasis kompetensi, dan menghargai waktu setiap kandidat.</p></div>' +
      '<div class="steps4">' + [['Pengajuan Berkas', 'Kirim CV terbaru dan portofolio profesional melalui portal karir.', 'Estimasi: Mandiri'], ['Screening & Asesmen', 'Review kualifikasi oleh tim People Operations & HRD.', 'Estimasi: 3–5 Hari'], ['Wawancara & Studi Kasus', 'Diskusi mendalam bersama pimpinan divisi dan simulasi penyelesaian studi kasus.', 'Estimasi: 1 Minggu'], ['Offering & Onboarding', 'Penerbitan surat penawaran resmi dan aktivasi akun karyawan.', 'Sambutan Hangat']].map(function (s, i) {
        return '<div class="stepc"><div class="no">0' + (i + 1) + '</div><div class="strong">' + s[0] + '</div><p class="small muted" style="margin:6px 0 10px">' + s[1] + '</p><div class="small blue-t row">' + ic('clock', 'ic-sm') + s[2] + '</div></div>'; }).join('') + '</div></section>' +
      '<section class="cta mt-24" id="faq"><div style="max-width:620px"><span class="chip" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.18)">' + ic('users', 'ic-sm') + 'JARINGAN TALENTA TERBUKA</span><h2 style="margin:12px 0 8px;font-size:26px;line-height:32px">Belum menemukan posisi yang sesuai keahlian Anda?</h2>' +
      '<p style="margin:0;color:#C5CCDA">Kirimkan CV Anda ke Talent Pool resmi ' + esc(perusahaan()) + '. Profil Anda tersimpan di database talenta dan akan dihubungi saat posisi relevan dibuka.</p></div>' +
      '<div class="col"><a class="btn btn-sec" style="height:44px" href="#/karir/TALENT_POOL">' + ic('send', 'ic-sm') + 'Kirim CV ke Talent Pool</a><button class="btn btn-ghost" style="color:#fff" data-status>' + ic('search-check', 'ic-sm') + 'Cek Status Lamaran</button></div></section></div>' +
      '<div id="karirFoot"></div>';
  },
  init: function (el) {
    ['kQ'].forEach(function (id) { $('#' + id, el).oninput = debounce(function () { renderLowongan(el); }, 250); });
    ['kDiv', 'kTipe', 'kModel', 'kSort'].forEach(function (id) { $('#' + id, el).onchange = function () { renderLowongan(el); }; });
    $('#kCari', el).onclick = function () { renderLowongan(el); $('#kList', el).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $('#kReset', el).onclick = function () { $('#kQ', el).value = ''; ['kDiv', 'kTipe', 'kModel'].forEach(function (i) { $('#' + i, el).value = ''; }); renderLowongan(el); };
  },
  show: async function (el) {
    $('#karirTop', el).innerHTML = pubNav('karir');
    try {
      var d = await muatKarir();
      $('#hTitle', el).textContent = 'Bergabung & Berkembang Bersama ' + (d.perusahaan || perusahaan());
      $('#hBadge', el).textContent = 'Karier & Kesempatan Bertumbuh • ' + (d.perusahaan || '');
      var uniq = function (k) { var o = {}; d.lowongan.forEach(function (l) { if (l[k]) o[l[k]] = 1; }); return Object.keys(o); };
      $('#kDiv', el).innerHTML = selectOpts(uniq('divisi'), $('#kDiv', el).value, 'Semua Divisi');
      $('#kTipe', el).innerHTML = selectOpts(uniq('tipe'), $('#kTipe', el).value, 'Semua Tipe');
      $('#kModel', el).innerHTML = selectOpts(uniq('model'), $('#kModel', el).value, 'Semua Model');
      $('#kJml', el).textContent = d.lowongan.length + ' Posisi Dibuka';
      renderLowongan(el);
    } catch (e) { $('#kList', el).innerHTML = '<div class="card" style="grid-column:1/-1"><div class="card-b">' + empty('Gagal memuat lowongan: ' + e.message, 'wifi-off') + '<div class="center"><button class="btn btn-sec" id="kRetry">Coba lagi</button></div></div></div>'; $('#kRetry', el).onclick = function () { muatKarir(true).then(function () { App.pages.karir.show(el); }); }; }
    $('#karirFoot', el).innerHTML = pubFoot();
    bindPub(el);
  }
});
function renderLowongan(el) {
  var d = App.pub || { lowongan: [] }, q = $('#kQ', el).value.toLowerCase(), dv = $('#kDiv', el).value, tp = $('#kTipe', el).value, md = $('#kModel', el).value, so = $('#kSort', el).value;
  var rows = d.lowongan.filter(function (l) { return (!dv || l.divisi === dv) && (!tp || l.tipe === tp) && (!md || l.model === md) && (!q || (l.judul + ' ' + l.divisi + ' ' + l.kualifikasi + ' ' + l.deskripsi).toLowerCase().indexOf(q) > -1); });
  rows.sort(function (a, b) { return so === 'az' ? a.judul.localeCompare(b.judul) : so === 'batas' ? String(a.batas || '9').localeCompare(String(b.batas || '9')) : 0; });
  $('#kCount', el).textContent = rows.length;
  $('#kList', el).innerHTML = rows.length ? rows.map(function (l) {
    var s = sisaHari(l.batas);
    return '<article class="job"><div class="row wrap gap-4">' + (l.populer ? '<span class="chip amber">' + ic('flame', 'ic-sm') + 'Populer</span>' : '') + (l.tipe ? '<span class="chip">' + esc(l.tipe) + '</span>' : '') + (l.divisi ? '<span class="chip">' + esc(l.divisi) + '</span>' : '') +
      (l.model ? '<span class="chip blue">' + esc(l.model + (l.lokasi ? ' (' + l.lokasi + ')' : '')) + '</span>' : '') + '</div><div><h3>' + esc(l.judul) + '</h3><div class="lvl">' + esc(l.level || '') + '</div></div>' +
      '<div class="desc">' + esc(l.deskripsi) + '</div>' + (l.kualifikasi ? '<div class="kual"><b>' + ic('key-round', 'ic-sm') + ' Kualifikasi Kunci:</b> ' + esc(l.kualifikasi) + '</div>' : '') +
      '<div class="meta"><span class="row">' + ic('calendar', 'ic-sm') + 'Batas Lamaran: <b>' + (l.batas ? tgl(l.batas, true) : 'Terbuka') + '</b>' + (s != null && s <= 7 ? ' <span class="pill warn">' + s + ' hari lagi</span>' : '') + '</span><span class="row">' + ic('users', 'ic-sm') + 'Kuota: <b>' + (l.kuota || 1) + ' Orang</b></span></div>' +
      '<div class="grid g-2" style="gap:10px"><button class="btn btn-ghost" data-det="' + esc(l.id) + '">Lihat Detail Posisi</button><a class="btn btn-primary" href="#/karir/' + esc(l.id) + '">Lamar Sekarang</a></div></article>';
  }).join('') : '<div class="card" style="grid-column:1/-1"><div class="card-b">' + empty('Belum ada lowongan yang cocok dengan filter. Kirim CV Anda ke Talent Pool.', 'search-x') + '</div></div>';
  $$('[data-det]', el).forEach(function (b) { b.onclick = function () {
    var l = d.lowongan.filter(function (x) { return x.id === b.dataset.det; })[0];
    modal({ title: l.judul, sub: [l.divisi, l.tipe, l.model].filter(Boolean).join(' · '), size: 'lg',
      body: '<div class="col gap-16"><div><div class="ov mb-8">Deskripsi Pekerjaan</div><div style="white-space:pre-line">' + esc(l.deskripsi) + '</div></div><div><div class="ov mb-8">Kualifikasi</div><div style="white-space:pre-line">' + esc(l.kualifikasi) + '</div></div>' +
        '<div class="grid g-3"><div class="kvbox"><span class="muted">Level</span><b>' + esc(l.level || '-') + '</b></div><div class="kvbox"><span class="muted">Batas</span><b>' + (l.batas ? tgl(l.batas) : 'Terbuka') + '</b></div><div class="kvbox"><span class="muted">Kuota</span><b>' + (l.kuota || 1) + ' orang</b></div></div>' +
        (l.form.length ? '<div class="note">' + ic('list-checks') + '<div>Formulir berisi ' + l.form.length + ' pertanyaan khusus posisi. Siapkan CV (PDF/DOCX maks 5 MB).</div></div>' : '') + '</div>',
      foot: [{ label: 'Tutup', close: true }, { label: 'Lamar Sekarang', cls: 'btn-primary', act: function () { go('karir', l.id); } }] });
  }; });
}

/* ---------------------------------------------------------------- FORMULIR LAMARAN (#/karir/ID) */
registerPage('lamar', { layout: 'public', auth: 'public', title: 'Formulir Lamaran' });
var _karirShow = App.pages.karir.show;
App.pages.karir.show = function (el, param) { if (param) return tampilLamar(param); return _karirShow(el); };
App.pages.karir.hide = function () { var f = $('.page[data-page="lamar"]'); if (f) f.hidden = true; };

async function tampilLamar(id) {
  var host = $('#pubhost'), el = $('.page[data-page="lamar"]', host);
  if (!el) { el = document.createElement('section'); el.className = 'page'; el.dataset.page = 'lamar'; host.appendChild(el); }
  $$('.page', host).forEach(function (p) { p.hidden = p !== el; });
  el.innerHTML = pubNav('karir') + '<div class="pwrap" style="padding-top:24px">' + skel(6, 60) + '</div>';
  var d; try { d = await muatKarir(); } catch (e) { el.innerHTML = pubNav() + '<div class="pwrap">' + empty(e.message, 'wifi-off') + '</div>'; return; }
  var talent = id === 'TALENT_POOL';
  var l = talent ? { id: 'TALENT_POOL', judul: 'Talent Pool', divisi: 'Semua Divisi', model: '-', tipe: 'Sukarela', form: [] } : d.lowongan.filter(function (x) { return x.id === id; })[0];
  if (!l) { el.innerHTML = pubNav() + '<div class="pwrap" style="padding:40px 20px">' + empty('Lowongan tidak ditemukan atau sudah ditutup.', 'briefcase') + '<div class="center"><a class="btn btn-primary" href="#/karir">Lihat lowongan lain</a></div></div>'; bindPub(el); return; }
  document.title = (talent ? 'Kirim CV ke Talent Pool' : 'Lamar ' + l.judul) + ' · SIM HRD';
  var draftKey = 'draft:lamar:' + l.id, draft = Store.get(draftKey, {}), berkas = { cv: null, lampiran: null }, s = sisaHari(l.batas);
  var fields = l.form.map(function (f) {
    var v = (draft.jawaban || {})[f.id] || '', nm = 'j_' + f.id, req = f.wajib ? ' <span class="req">*</span>' : '';
    if (f.tipe === 'area') return '<div class="field full"><div class="row between"><label>' + esc(f.label) + req + '</label><span class="small muted mono" data-cnt="' + nm + '">0 / 1000</span></div><textarea class="textarea soft" name="' + nm + '" maxlength="1000" rows="4">' + esc(v) + '</textarea></div>';
    if (f.tipe === 'pilihan' && f.opsi.length <= 3) return '<div class="field full"><label>' + esc(f.label) + req + '</label><div class="grid g-3" style="gap:8px">' + f.opsi.map(function (o) { return '<label class="opt"><input type="radio" name="' + nm + '" value="' + esc(o) + '"' + (v === o ? ' checked' : '') + '>' + esc(o) + '</label>'; }).join('') + '</div></div>';
    if (f.tipe === 'pilihan') return '<div class="field full"><label>' + esc(f.label) + req + '</label><select class="select soft" name="' + nm + '">' + selectOpts(f.opsi, v, 'Pilih…') + '</select></div>';
    if (f.tipe === 'angka') return '<div class="field"><label>' + esc(f.label) + req + '</label><div class="input-grp"><span class="addon">Rp</span><input class="input soft mono" name="' + nm + '" inputmode="numeric" value="' + esc(v) + '"></div></div>';
    return '<div class="field full"><label>' + esc(f.label) + req + '</label><input class="input soft" name="' + nm + '" type="' + (f.tipe === 'tanggal' ? 'date' : f.tipe === 'url' ? 'url' : 'text') + '" value="' + esc(v) + '"></div>';
  }).join('');
  el.innerHTML = pubNav('karir') + '<div class="pwrap" style="padding-top:20px;padding-bottom:30px">' +
    '<div class="crumbs"><a href="#/karir">Beranda</a>' + ic('chevron-right', 'ic-sm') + '<a href="#/karir">Karir</a>' + ic('chevron-right', 'ic-sm') + '<span>' + esc(l.judul) + '</span>' + ic('chevron-right', 'ic-sm') + '<b>Formulir Lamaran</b></div>' +
    '<div class="page-head" style="margin-bottom:12px"><div class="grow"><div class="row gap-12"><span class="chip mono">' + esc(l.id) + '</span><span class="small blue-t strong row"><span class="dotlive" style="background:var(--blue)"></span>Pendaftaran Dibuka</span></div>' +
    '<h1 style="margin-top:6px">' + (talent ? 'Kirim CV ke Talent Pool' : 'Formulir Pendaftaran: ' + esc(l.judul)) + '</h1><div class="row wrap mt-8">' +
    '<span class="chip">' + ic('building', 'ic-sm') + 'Divisi: ' + esc(l.divisi || '-') + '</span>' + (l.model && l.model !== '-' ? '<span class="chip">' + ic('map-pin', 'ic-sm') + 'Model: ' + esc(l.model + (l.lokasi ? ' ' + l.lokasi : '')) + '</span>' : '') +
    (l.tipe ? '<span class="chip">' + ic('clock', 'ic-sm') + 'Tipe: ' + esc(l.tipe) + '</span>' : '') + (l.batas ? '<span class="chip amber">' + ic('hourglass', 'ic-sm') + 'Batas Waktu: ' + tgl(l.batas, true) + (s != null ? ' (Sisa ' + s + ' Hari)' : '') + '</span>' : '') + '</div></div>' +
    '<div style="min-width:180px"><div class="ov">Kelengkapan Formulir</div><div class="row" style="align-items:baseline"><span class="stat" style="border:0;box-shadow:none;padding:0"><span class="val" id="lPct">0%</span></span><span class="small muted" id="lPctT">Belum lengkap</span></div><div class="progress mt-8"><i id="lBar" style="width:0"></i></div></div></div>' +
    '<form id="fLamar" class="grid g-main" novalidate><div class="stack">' +
    '<div class="card"><div class="card-h"><div><h3><span class="secno">01</span>Identitas Pribadi Pelamar</h3><p class="sub">Informasi dasar untuk verifikasi dan komunikasi seleksi</p></div>' + ic('id-card', 'muted') + '</div><div class="card-b"><div class="fgrid">' +
    '<div class="field full"><label>Nama Lengkap Sesuai KTP <span class="req">*</span></label><input class="input soft" name="nama" autocomplete="name" value="' + esc(draft.nama || '') + '"></div>' +
    '<div class="field"><label>Email Aktif <span class="req">*</span></label><input class="input soft" name="email" type="email" autocomplete="email" value="' + esc(draft.email || '') + '"><span class="hint">Email bebas/pribadi diperbolehkan</span></div>' +
    '<div class="field"><label>Nomor WhatsApp / HP <span class="req">*</span></label><div class="input-grp"><span class="addon">ID +62</span><input class="input soft mono" name="wa" inputmode="tel" autocomplete="tel" placeholder="812-xxxx-xxxx" value="' + esc(draft.wa || '') + '"></div></div>' +
    '<div class="field full"><label>Domisili Sekarang (Kota/Kabupaten) <span class="req">*</span></label><input class="input soft" name="domisili" value="' + esc(draft.domisili || '') + '"></div>' +
    '<div class="field"><label>Link Profil LinkedIn</label><div class="input-grp"><span class="addon">https://</span><input class="input soft" name="linkedin" value="' + esc(draft.linkedin || '') + '"></div></div>' +
    '<div class="field"><label>' + (talent ? 'Posisi / Bidang yang Diminati' : 'Portofolio Online / Website') + '</label>' + (talent ? '<input class="input soft" name="posisi" value="' + esc(draft.posisi || '') + '">' : '<div class="input-grp"><span class="addon">https://</span><input class="input soft" name="portofolio" value="' + esc(draft.portofolio || '') + '"></div>') + '</div>' +
    (talent ? '<div class="field full"><label>Keahlian Utama</label><input class="input soft" name="keahlian" placeholder="mis. Figma, React, Rekrutmen, Pajak" value="' + esc(draft.keahlian || '') + '"></div>' : '') +
    '</div></div></div>' +
    '<div class="card"><div class="card-h"><div><h3><span class="secno">02</span>Lampiran Berkas & Resume</h3><p class="sub">Dokumen tersimpan aman di Google Drive Recruitment (privat)</p></div>' + ic('cloud-upload', 'muted') + '</div><div class="card-b">' +
    '<div class="dropzone" id="dzCv"><div class="ico">' + ic('file-up') + '</div><div>Tarik dan lepas file CV/Resume ke sini, atau <a href="javascript:void 0">Klik untuk Memilih Berkas</a></div><div class="small muted mt-8">Format PDF atau DOCX dengan ukuran maksimal 5MB</div></div>' +
    '<div id="cvList" class="mt-12"></div>' + (talent ? '' : '<div class="field mt-16"><label>Lampiran Portofolio Tambahan (Opsional)</label><div class="filerow">' + ic('paperclip', 'muted') + '<span class="grow small muted" id="lampNama">PDF/ZIP maks 10MB (contoh: studi kasus, sertifikat)</span><button type="button" class="btn btn-sec btn-sm" id="lampBtn">Unggah File</button></div></div>') + '</div></div>' +
    (fields ? '<div class="card"><div class="card-h"><div><h3><span class="secno">03</span>Isian Khusus Posisi</h3><p class="sub">Pertanyaan relevan yang ditetapkan oleh tim HRD & User</p></div>' + ic('clipboard-list', 'muted') + '</div><div class="card-b"><div class="fgrid">' + fields + '</div></div></div>' : '') +
    '<div class="card"><div class="card-h"><div><h3><span class="secno">' + (fields ? '04' : '03') + '</span>Pernyataan & Kepatuhan Privasi</h3><p class="sub">Konfirmasi legalitas informasi dan persetujuan pemrosesan data</p></div>' + ic('shield-check', 'muted') + '</div><div class="card-b col">' +
    '<label class="opt check"><input type="checkbox" name="s1"' + (draft.s1 ? ' checked' : '') + '><span>Saya menyatakan bahwa seluruh data, lampiran berkas, dan pengalaman kerja yang diisi adalah benar, otentik, dan dapat dipertanggungjawabkan.</span></label>' +
    '<label class="opt check"><input type="checkbox" name="s2"' + (draft.s2 ? ' checked' : '') + '><span>Saya menyetujui data diri saya diproses oleh tim HRD ' + esc(perusahaan()) + ' untuk keperluan seleksi, dan bila belum lolos bersedia disimpan dalam Talent Leads Database untuk lowongan mendatang (UU PDP).</span></label></div></div></div>' +
    '<aside class="stack"><div class="card"><div class="card-h"><h3>' + ic('git-branch') + 'Tahapan Proses Seleksi Anda</h3></div><div class="card-b"><ul class="timeline">' +
    [['Pendaftaran & Submit Berkas', 'Sedang mengisi formulir'], ['Screening CV & Portofolio', 'Estimasi 3–5 hari kerja oleh Talent Acquisition'], ['Interview & User Review', 'Wawancara kompetensi / studi kasus'], ['Offering & Onboarding', 'Penawaran resmi & aktivasi akun karyawan']].map(function (t, i) { return '<li class="' + (i ? '' : 'on') + '"><span class="d"></span><div class="strong small">' + (i + 1) + '. ' + t[0] + (i ? '' : ' <span class="pill info">Aktif</span>') + '</div><div class="small muted">' + t[1] + '</div></li>'; }).join('') + '</ul></div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic('lightbulb', 'warn-t') + 'Tips Melamar dari HRD</h3></div><div class="card-b col small">' +
    ['Pastikan link portofolio dapat diakses publik tanpa login.', 'Cantumkan nomor WhatsApp aktif untuk undangan wawancara.', 'Sertakan contoh studi kasus nyata yang menunjukkan cara berpikir Anda.'].map(function (t) { return '<div class="row top">' + ic('check', 'ic-sm blue-t') + '<span>' + t + '</span></div>'; }).join('') + '</div></div>' +
    '<div class="card dark"><div class="card-b"><div class="strong row">' + ic('circle-help') + 'Butuh Bantuan Teknis?</div><p class="small muted" style="margin:4px 0 12px">Kendala unggah berkas atau konfirmasi pendaftaran dapat menghubungi helpdesk:</p>' +
    (d.hrdEmail ? '<div class="kvbox" style="background:#1F2A44;color:#fff">' + ic('mail', 'ic-sm') + '<span class="grow">' + esc(d.hrdEmail) + '</span></div>' : '') + (d.hrdWa ? '<a class="kvbox" style="background:#1F2A44;color:#fff;margin-top:8px" href="' + waLink(d.hrdWa) + '" target="_blank" rel="noopener">' + ic('message-circle', 'ic-sm') + '<span class="grow">WhatsApp: ' + esc(d.hrdWa) + '</span></a>' : '') + '</div></div></aside></form></div>' +
    '<div class="formbar"><div class="in"><span class="small row" id="lDraft">' + ic('cloud', 'ic-sm') + 'Draft formulir otomatis tersimpan lokal</span><span class="grow"></span><a class="btn btn-sec" href="#/karir">Batal & Kembali</a><button class="btn btn-primary" id="lKirim">' + (talent ? 'Kirim CV ke Talent Pool' : 'Kirim Lamaran Pekerjaan Sekarang') + ic('send', 'ic-sm') + '</button></div></div>';
  bindPub(el);
  var form = $('#fLamar', el);
  function kumpul() {
    var v = formVals(form), jw = {};
    l.form.forEach(function (f) { var nm = 'j_' + f.id; jw[f.id] = f.tipe === 'angka' ? String(v[nm] || '').replace(/\D/g, '') : (v[nm] || ''); });
    return { nama: v.nama, email: v.email, wa: v.wa, domisili: v.domisili, linkedin: v.linkedin, portofolio: v.portofolio, posisi: v.posisi, keahlian: v.keahlian, s1: v.s1, s2: v.s2, jawaban: jw };
  }
  function progres() {
    var v = kumpul(), wajib = [v.nama, v.email, v.wa, v.domisili, berkas.cv, v.s1, v.s2];
    l.form.forEach(function (f) { if (f.wajib) wajib.push(v.jawaban[f.id]); });
    var pct = Math.round(wajib.filter(Boolean).length / wajib.length * 100);
    $('#lPct', el).textContent = pct + '%'; $('#lBar', el).style.width = pct + '%'; $('#lPctT', el).textContent = pct === 100 ? 'Siap Dikirim' : 'Belum lengkap';
    $$('[data-cnt]', el).forEach(function (c) { var t = $('[name="' + c.dataset.cnt + '"]', form); c.textContent = (t ? t.value.length : 0) + ' / 1000'; });
  }
  var simpanDraft = debounce(function () { var v = kumpul(); Store.set(draftKey, v); $('#lDraft', el).innerHTML = ic('cloud', 'ic-sm ok-t') + 'Draft formulir otomatis tersimpan lokal pukul <b class="mono">' + jam(new Date()) + ' WIB</b>'; }, 600);
  form.addEventListener('input', function () { progres(); simpanDraft(); });
  form.addEventListener('change', function () { progres(); simpanDraft(); });
  function drawCv() {
    $('#cvList', el).innerHTML = berkas.cv ? '<div class="ov mb-8">Berkas Terlampir</div><div class="filerow"><div class="fileico">' + ic('file-text') + '</div><div class="grow"><div class="strong small ellip">' + esc(berkas.cv.nama) + '</div><div class="small muted">' + (berkas.cv.size / 1048576).toFixed(1) + ' MB • ' + (/pdf/.test(berkas.cv.mime) ? 'PDF' : 'DOCX') + '</div></div><span class="pill ok">Siap</span><button type="button" class="iconbtn" id="cvDel" aria-label="Hapus">' + ic('trash-2', 'ic-sm') + '</button></div>' : '';
    var d2 = $('#cvDel', el); if (d2) d2.onclick = function () { berkas.cv = null; drawCv(); progres(); };
  }
  dropzone($('#dzCv', el), async function (files) {
    var f = files[0];
    if (!/\.(pdf|docx?)$/i.test(f.name)) return toast('CV harus berformat PDF atau DOCX.', 'bad');
    try { berkas.cv = await fileToB64(f, 5); if (!/pdf|word|officedocument/.test(berkas.cv.mime)) berkas.cv.mime = /pdf$/i.test(f.name) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; drawCv(); progres(); } catch (e) { toast(e.message, 'bad'); }
  }, '.pdf,.doc,.docx');
  var lb = $('#lampBtn', el);
  if (lb) { var li = document.createElement('input'); li.type = 'file'; li.accept = '.pdf,.zip'; li.hidden = true; el.appendChild(li); lb.onclick = function () { li.click(); };
    li.onchange = async function () { if (!li.files[0]) return; try { berkas.lampiran = await fileToB64(li.files[0], 10); $('#lampNama', el).textContent = berkas.lampiran.nama; } catch (e) { toast(e.message, 'bad'); } }; }
  progres();
  $('#lKirim', el).onclick = async function () {
    var v = kumpul(), err = [];
    if ((v.nama || '').length < 3) err.push('nama'); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email || '')) err.push('email'); if (!/^08\d{8,12}$/.test(hp08(v.wa))) err.push('wa');
    if (!v.domisili) err.push('domisili');
    $$('.input,.textarea,.select', form).forEach(function (i) { i.classList.remove('err'); });
    err.forEach(function (n) { var i = $('[name="' + n + '"]', form); if (i) i.classList.add('err'); });
    var jwKurang = l.form.filter(function (f) { return f.wajib && !v.jawaban[f.id]; });
    if (err.length) { toast('Lengkapi identitas (nama, email, WhatsApp 08xx, domisili).', 'warn'); $('[name="' + err[0] + '"]', form).focus(); return; }
    if (!berkas.cv) return toast('Unggah CV/Resume terlebih dahulu.', 'warn');
    if (jwKurang.length) return toast('Pertanyaan wajib belum diisi: ' + jwKurang[0].label, 'warn');
    if (!v.s1 || !v.s2) return toast('Centang kedua pernyataan & persetujuan privasi.', 'warn');
    var r = await withBusy(this, function () { return api('karirApply', Object.assign({}, v, { lowonganId: l.id, cv: berkas.cv, lampiran: berkas.lampiran, setuju: true, sumber: 'Portal Karir' })); });
    if (!r.success) return toast(r.message, 'bad');
    Store.del(draftKey);
    el.innerHTML = pubNav() + '<div class="authcard strip" style="text-align:center"><div class="logo" style="margin:6px auto 14px;width:52px;height:52px;background:var(--ok-bg);color:var(--ok)">' + ic('circle-check', 'ic-lg') + '</div>' +
      '<h1 style="margin:0 0 8px;font-size:24px">' + (talent ? 'CV Tersimpan di Talent Pool' : 'Lamaran Terkirim!') + '</h1><p class="muted">' + esc(r.message) + '</p>' +
      (talent ? '' : '<div class="kvbox mt-16" style="justify-content:center;gap:16px"><span class="muted">Kode Lamaran</span><b class="mono" style="font-size:22px;letter-spacing:.12em">' + esc(r.data.kode) + '</b></div><p class="small muted">Simpan kode ini beserta email Anda untuk mengecek status seleksi.</p>') +
      '<div class="row mt-16" style="justify-content:center"><a class="btn btn-sec" href="#/karir">Lihat Lowongan Lain</a>' + (talent ? '' : '<button class="btn btn-primary" data-status>Cek Status Lamaran</button>') + '</div></div>';
    bindPub(el);
  };
}

/* ---------------------------------------------------------------- LOGIN */
function authBar() {
  return '<div class="authbar"><div class="row"><div class="logo">' + ic('building-2') + '</div><div><div class="brand-t">SIM HRD <span class="tag">Enterprise</span></div><div class="brand-s">' + esc(perusahaan()) + '</div></div></div><a class="row strong" href="#/karir">' + ic('arrow-left', 'ic-sm') + 'Portal Karir</a></div>';
}
registerPage('login', {
  layout: 'public', auth: 'public', title: 'Masuk',
  template: function () { return '<div class="gridbg"><div id="lgBar"></div><div class="authcard strip" id="lgCard"></div></div>'; },
  show: async function (el) {
    $('#lgBar', el).innerHTML = authBar();
    var card = $('#lgCard', el);
    card.innerHTML = '<div class="center"><div class="row" style="justify-content:center;gap:12px"><div class="logo" style="width:52px;height:52px">' + ic('building-2', 'ic-lg') + '</div><div style="text-align:left"><div class="brand-t" style="font-size:16px">SIM HRD</div><div class="ov">v2.1 Enterprise</div></div></div>' +
      '<h1 style="font-size:24px;margin:20px 0 6px">Masuk ke SIM HRD</h1><p class="muted" style="margin:0">Sistem Informasi Manajemen SDM & Operasional<br>' + esc(perusahaan()) + '</p></div>' +
      '<div class="mt-24" id="gHost"><div class="skel" style="height:48px"></div></div>' +
      '<div class="note mt-16">' + ic('info', 'blue-t') + '<div><b style="color:var(--ink)">Ketentuan Akun Google Karyawan</b><div class="small" style="margin-top:4px">Sistem mengizinkan email pribadi (Gmail, dll) atau email dinas. Pastikan Anda masuk menggunakan alamat email yang telah didaftarkan secara resmi oleh tim HRD pada Master Data Karyawan.</div></div></div>' +
      '<div class="divider">ATAU VERIFIKASI STATUS LAMARAN</div>' +
      '<a class="linkcard" href="#/karir"><span class="avatar" style="background:#fff;color:var(--blue);border-radius:6px">' + ic('contact') + '</span><div class="grow"><b>Calon Karyawan & Pelamar</b><div class="small muted">Lihat Lowongan Terbuka & Status di Portal Karir</div></div>' + ic('arrow-right', 'muted') + '</a>' +
      '<div class="row wrap mt-24" style="justify-content:center;gap:6px"><span class="chip">' + ic('lock', 'ic-sm') + 'Enkripsi TLS</span><span class="chip">' + ic('shield', 'ic-sm') + 'Google OAuth 2.0</span><span class="chip">' + ic('badge-check', 'ic-sm') + 'Token HMAC</span></div>' +
      '<p class="center small muted mt-16" style="margin-bottom:0">Kendala akses login? <a href="javascript:void 0" id="lgHelp">Hubungi HRD Operations</a></p>';
    $('#lgHelp', el).onclick = function () { var p = App.pub || {}; modal({ title: 'Hubungi HRD Operations', size: 'sm', body: '<div class="col">' + (p.hrdEmail ? '<a class="linkcard" href="mailto:' + esc(p.hrdEmail) + '">' + ic('mail') + esc(p.hrdEmail) + '</a>' : '') + (p.hrdWa ? '<a class="linkcard" target="_blank" rel="noopener" href="' + waLink(p.hrdWa, 'Halo HRD, saya kesulitan masuk SIM HRD.') + '">' + ic('message-circle') + 'WhatsApp ' + esc(p.hrdWa) + '</a>' : '') + '<p class="small muted">Sebutkan nama lengkap, NIK, dan email Google yang Anda gunakan.</p></div>' }); };
    var gh = $('#gHost', el);
    if (DEMO) {
      gh.innerHTML = '<div class="note warn" style="margin-bottom:12px">' + ic('flask-conical') + '<div><b>Mode Demo</b> — backend belum disambungkan (GAS_URL kosong). Pilih peran untuk mencoba tampilan dengan data contoh.</div></div><div class="col">' +
        [['owner@demo.id', 'Super Admin HRD', 'shield-check'], ['siti.hr@demo.id', 'Staff HRD', 'user-cog'], ['dimas.wicak@gmail.com', 'Karyawan (Dimas Wicaksono)', 'user']].map(function (d) { return '<button class="gbtn" data-demo="' + d[0] + '">' + ic(d[2]) + 'Masuk sebagai ' + d[1] + '</button>'; }).join('') +
        '<button class="btn btn-ghost btn-sm" data-demo="budi.personal.test@gmail.com">Coba email yang belum terdaftar</button></div>';
      $$('[data-demo]', gh).forEach(function (b) { b.onclick = function () { withBusy(b, function () { return loginDengan('DEMO:' + b.dataset.demo); }); }; });
      return;
    }
    try {
      var pc = App.pub && App.pub.clientId ? App.pub : null;
      if (!pc) { var r = await api('publicConfig', {}, { silent: true }); if (r.success) { App.pub = Object.assign(App.pub || {}, r.data); pc = r.data; } }
      var cid = CFG.GOOGLE_CLIENT_ID || (pc && pc.clientId);
      if (!cid) { gh.innerHTML = '<div class="note bad">' + ic('circle-alert') + '<div>GOOGLE_CLIENT_ID belum diatur. Isi di js/config.js atau di sheet Pengaturan_Sistem, lalu muat ulang.</div></div>'; return; }
      await loadScript('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({ client_id: cid, callback: function (resp) { gh.style.opacity = .5; loginDengan(resp.credential).finally(function () { gh.style.opacity = 1; }); }, auto_select: false, cancel_on_tap_outside: true, ux_mode: 'popup', itp_support: true });
      gh.innerHTML = '<div id="gBtn" style="display:flex;justify-content:center"></div>';
      google.accounts.id.renderButton($('#gBtn', gh), { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'center', width: Math.min(440, gh.clientWidth || 360), locale: 'id' });
    } catch (e) { gh.innerHTML = '<div class="note bad">' + ic('wifi-off') + '<div>Tombol Google gagal dimuat: ' + esc(e.message) + ' <a href="javascript:location.reload()">Muat ulang</a></div></div>'; }
  }
});

/* ---------------------------------------------------------------- AKSES DITOLAK */
registerPage('ditolak', {
  layout: 'public', auth: 'public', title: 'Akses Ditolak',
  template: function () { return '<div class="gridbg"><div id="dtBar"></div><div class="authcard" id="dtCard"></div></div>'; },
  show: function (el) {
    var d = Store.get('ditolak', {}) || {};
    $('#dtBar', el).innerHTML = authBar();
    $('#dtCard', el).innerHTML = '<div class="center"><div style="width:62px;height:62px;border-radius:12px;background:var(--bad-bg);color:var(--bad);display:flex;align-items:center;justify-content:center;margin:6px auto 14px">' + ic('shield-alert', 'ic-lg') + '</div>' +
      '<span class="pill bad dot">AUTENTIKASI GAGAL • KODE: AUTH-403</span><h1 style="font-size:24px;margin:14px 0 14px">Akses Akun Ditolak</h1></div>' +
      '<div class="note center" style="display:block"><div class="small muted">Akun Google yang Anda gunakan:</div><div class="strong row" style="justify-content:center;font-size:16px;margin:4px 0">' + ic('circle-user') + esc(d.email || '-') + '</div><div class="small bad-t strong row" style="justify-content:center">' + ic('circle-alert', 'ic-sm') + (d.nonaktif ? 'Akun karyawan Anda berstatus nonaktif' : 'Email belum terdaftar di Master Database Karyawan aktif') + '</div></div>' +
      '<p class="center" style="color:var(--ink-2)">Sistem SIM HRD membatasi hak akses operasional internal hanya untuk akun email yang telah didaftarkan dan diaktifkan oleh Tim HRD pada sheet Karyawan.</p>' +
      '<button class="btn btn-primary btn-block" style="height:44px" id="dtLain">' + ic('users') + 'Coba Masuk dengan Akun Lain</button>' +
      '<button class="btn btn-ghost btn-block mt-8" id="dtHelp">' + ic('circle-help', 'blue-t') + 'Hubungi Tim HRD / Helpdesk</button>' +
      '<div class="card tint mt-24"><div class="card-b"><div class="strong row mb-8">' + ic('list-checks') + 'Petunjuk Penyelesaian Masalah</div><ol class="small" style="margin:0;padding-left:18px;display:grid;gap:8px;color:var(--ink-2)">' +
      '<li>Periksa kembali apakah Anda memilih akun Google yang tepat jika peramban memiliki multi-profil kantor dan pribadi.</li><li><b>Karyawan Baru:</b> pastikan email Anda sudah didaftarkan HRD pada Master Data Karyawan.</li><li><b>Pelamar Kerja:</b> pantau tahapan seleksi lewat email resmi atau portal karir.</li></ol></div></div>' +
      '<div class="row between mt-16 small"><a href="#/karir" class="row">' + ic('globe', 'ic-sm') + 'Beranda Karir Publik</a><span class="muted">Kebijakan Privasi & Data</span></div>';
    $('#dtLain', el).onclick = function () { try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { } go('login'); };
    $('#dtHelp', el).onclick = function () { var p = App.pub || {}; var t = 'Halo HRD, email Google saya ' + (d.email || '') + ' belum bisa masuk SIM HRD. Mohon didaftarkan.'; if (p.hrdWa) window.open(waLink(p.hrdWa, t), '_blank'); else if (p.hrdEmail) location.href = 'mailto:' + p.hrdEmail + '?subject=Akses SIM HRD&body=' + encodeURIComponent(t); else toast('Hubungi tim HRD dan sebutkan email ' + (d.email || ''), 'warn'); };
  }
});

/* ---------------------------------------------------------------- VERIFIKASI DOKUMEN (QR) */
registerPage('verifikasi', {
  layout: 'public', auth: 'public', title: 'Verifikasi Dokumen',
  template: function () { return '<div class="gridbg"><div id="vBar"></div><div class="authcard strip" id="vCard"></div></div>'; },
  show: async function (el, kode) {
    $('#vBar', el).innerHTML = authBar();
    var c = $('#vCard', el);
    if (!kode) {
      c.innerHTML = '<h1 style="font-size:22px;margin:0 0 6px">Verifikasi Keaslian Dokumen</h1><p class="muted">Masukkan kode verifikasi yang tercetak di bawah QR dokumen.</p><div class="row"><input class="input mono" id="vK" placeholder="20 karakter kode" style="text-transform:uppercase"><button class="btn btn-primary" id="vGo">Periksa</button></div>';
      $('#vGo', el).onclick = function () { var k = $('#vK', el).value.trim().toUpperCase(); if (k) go('verifikasi', k); };
      return;
    }
    c.innerHTML = skel(5, 40);
    var r = await api('verifikasiDok', { kode: kode });
    if (!r.success) { c.innerHTML = '<div class="center"><div style="width:62px;height:62px;border-radius:12px;background:var(--bad-bg);color:var(--bad);display:flex;align-items:center;justify-content:center;margin:6px auto 14px">' + ic('shield-x', 'ic-lg') + '</div><h1 style="font-size:22px;margin:0 0 8px">Dokumen Tidak Terverifikasi</h1><p class="muted">' + esc(r.message) + '</p><p class="small mono muted">' + esc(kode) + '</p></div>'; return; }
    var d = r.data, sah = d.status === 'SAH';
    c.innerHTML = '<div class="center"><div style="width:62px;height:62px;border-radius:12px;background:' + (sah ? 'var(--ok-bg);color:var(--ok)' : 'var(--bad-bg);color:var(--bad)') + ';display:flex;align-items:center;justify-content:center;margin:6px auto 12px">' + ic(sah ? 'shield-check' : 'shield-alert', 'ic-lg') + '</div>' +
      pill(sah ? 'SAH' : d.status, sah ? 'DOKUMEN SAH & TERDAFTAR' : 'DOKUMEN ' + d.status) + '<h1 style="font-size:22px;margin:12px 0 4px">' + esc(d.jenis || 'Dokumen') + '</h1><p class="muted" style="margin:0">' + esc(d.perusahaan) + '</p></div>' +
      (d.alasan ? '<div class="note bad mt-16">' + ic('circle-alert') + '<div>Ditarik: ' + esc(d.alasan) + '</div></div>' : '') +
      '<dl class="kv mt-24"><dt>Nomor</dt><dd class="mono">' + esc(d.nomor || '-') + '</dd><dt>Judul</dt><dd>' + esc(d.judul || '-') + '</dd>' + (d.atasNama ? '<dt>Atas nama</dt><dd>' + esc(d.atasNama) + '</dd>' : '') + '<dt>Diterbitkan</dt><dd>' + tglJam(d.terbit) + ' WIB</dd></dl>' +
      '<div class="ov mt-24 mb-8">Penanda Tangan</div>' + (d.penandatangan || []).map(function (p) { return '<div class="kvbox"><div><b>' + esc(p.nama) + '</b><div class="small muted">' + esc(p.jabatan) + '</div></div><div class="right small">' + pill(p.metode ? 'Valid' : 'Menunggu', p.metode || 'Belum') + '<div class="muted">' + (p.waktu ? tglJam(p.waktu) : '') + '</div></div></div>'; }).join('') +
      (d.hashPdf ? '<div class="card tint mt-16"><div class="card-b"><div class="strong small">Cek integritas berkas PDF</div><p class="small muted" style="margin:4px 0 10px">Unggah PDF yang Anda terima; sistem menghitung sidik jari SHA-256 di perangkat Anda (berkas tidak dikirim ke server).</p><input type="file" accept="application/pdf" id="vPdf" class="small"><div id="vHasil" class="mt-8"></div></div></div>' : '') +
      '<p class="small muted center mt-16" style="margin-bottom:0">Kode: <span class="mono">' + esc(kode) + '</span></p>';
    var vp = $('#vPdf', el);
    if (vp) vp.onchange = async function () {
      var f = vp.files[0]; if (!f) return;
      var buf = await f.arrayBuffer(), h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      $('#vHasil', el).innerHTML = h === d.hashPdf ? '<div class="note ok">' + ic('circle-check') + '<div>Berkas identik dengan dokumen asli yang diterbitkan.</div></div>' : '<div class="note bad">' + ic('circle-alert') + '<div>Berkas BERBEDA dari dokumen asli — kemungkinan telah diubah.</div></div>';
    };
  }
});
