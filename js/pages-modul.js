/* ============================================================================
 * SIM HRD — pages-modul.js  (lazy, HRD)
 * WhatsApp & Notifikasi (blast/antrean/konfigurasi) · CRM Kontak · Template Dokumen (Doc Engine)
 * Pengaturan: Umum & Payroll · Backup & Refresh Tahunan · Migrasi Data · Audit Log
 * ========================================================================== */
'use strict';

/* ============================================================ WHATSAPP & NOTIFIKASI */
var NT = { batch: 20, penerima: [], blastAktif: null, auto: false };
registerPage('notifikasi', {
  auth: 'hrd', title: 'WhatsApp & Notifikasi', menu: 'notifikasi',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Komunikasi', 'WhatsApp & Notifikasi'], title: 'WhatsApp & Notifikasi', sub: 'Blast WhatsApp per batch (Fonnte), pantau antrean pesan otomatis, dan atur notifikasi per kejadian (WA / Email).' }) +
      '<div class="tabs mb-16"><button class="tab on" data-tab="blast">' + ic('megaphone') + 'Blast WhatsApp</button><button class="tab" data-tab="antrean">' + ic('inbox') + 'Antrean & Riwayat</button>' + (isSA() ? '<button class="tab" data-tab="konfig">' + ic('settings-2') + 'Konfigurasi</button>' : '') + '</div>' +
      '<div data-pane="blast"><div class="grid g-2"><div class="card"><div class="card-h"><h3><span class="secno">1</span>Pilih Sasaran</h3></div><div class="card-b col">' +
      '<div class="grid g-2" style="gap:10px"><div class="field"><label>Sumber</label><select class="select" id="bsSum">' + selectOpts([{ v: 'crm', l: 'CRM Kontak (semua entitas)' }, { v: 'manual', l: 'Tempel nomor manual' }], 'crm') + '</select></div><div class="field" id="bsSegW"><label>Segmen</label><select class="select" id="bsSeg">' + selectOpts(['Karyawan', 'Pelamar', 'Talent Pool', 'Kontak Luar'], '', 'Semua segmen') + '</select></div></div>' +
      '<div class="field" id="bsManW" hidden><label>Nomor (satu per baris: 0812…|Nama)</label><textarea class="textarea mono" id="bsMan" rows="4"></textarea></div>' +
      '<div class="row wrap"><button class="btn btn-sec btn-sm" id="bsLoad">' + ic('users', 'ic-sm') + 'Muat Penerima</button><button class="btn btn-sec btn-sm" id="bsDet">' + ic('smartphone', 'ic-sm') + 'Deteksi Nomor WA</button><span class="small muted" id="bsProg"></span></div>' +
      '<div class="row wrap small" id="bsRing"></div><label class="check small"><input type="checkbox" id="bsHanyaWA"><span>Kirim hanya ke nomor terdeteksi WhatsApp</span></label><div id="bsTbl"></div></div></div>' +
      '<div class="stack"><div class="card"><div class="card-h"><h3><span class="secno">2</span>Tulis Pesan</h3></div><div class="card-b col"><div class="field"><label>Judul internal</label><input class="input" id="bsJud" placeholder="mis. Info lowongan Oktober"></div>' +
      '<div class="row wrap gap-4">' + ['nama', 'posisi', 'divisi', 'institusi', 'link'].map(function (v) { return '<button class="chip" data-var="{' + v + '}" type="button">{' + v + '}</button>'; }).join('') + '</div>' +
      '<textarea class="textarea" id="bsPes" rows="6" placeholder="Halo {nama}, …">Halo {nama},\n\n</textarea><div class="ov">Pratinjau</div><div class="wa-preview"><div class="wa-bubble" id="bsPrev"></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3><span class="secno">3</span>Ukuran Batch & Jeda</h3></div><div class="card-b col"><div class="row wrap"><div class="seg" id="bsSegB">' + [10, 20, 50].map(function (n) { return '<button data-b="' + n + '">' + n + '</button>'; }).join('') + '</div><div class="field" style="width:130px"><input class="input mono" id="bsJeda" value="5" title="Jeda detik, boleh acak 3-8"></div><span class="small muted">detik jeda (acak mis. 3-8)</span></div>' +
      '<div class="note small" id="bsEst"></div><button class="btn btn-primary" style="height:46px" id="bsGo">' + ic('rocket') + 'Mulai Blast</button></div></div>' +
      '<div class="card" id="bsProgCard" hidden></div></div></div>' +
      '<div class="card mt-16"><div class="card-h"><h3>' + ic('history') + 'Riwayat Blast</h3><button class="btn btn-ghost btn-sm" id="bsRef">' + ic('refresh-cw', 'ic-sm') + '</button></div><div class="card-b flush" id="bsHist"></div></div></div>' +
      '<div data-pane="antrean" hidden><div class="grid g-4" id="aqSt"></div><div class="card mt-16"><div class="card-b"><div class="filters"><select class="select soft" id="aqS">' + selectOpts(['Antri', 'Terkirim', 'Gagal', 'Batal'], '', 'Semua Status') + '</select><select class="select soft" id="aqK">' + selectOpts(['WA', 'EMAIL'], '', 'Semua Kanal') + '</select><span class="grow"></span><button class="btn btn-sec btn-sm" id="aqNow">' + ic('play', 'ic-sm') + 'Proses Sekarang</button>' + (isSA() ? '<button class="btn btn-sec btn-sm" id="aqRetry">' + ic('rotate-ccw', 'ic-sm') + 'Ulangi yang Gagal</button>' : '') + '</div></div><div class="card-b flush" id="aqT"></div></div></div>' +
      '<div data-pane="konfig" hidden id="nkPane"></div>';
  },
  init: function (el) {
    bindTabs(el, function (t) { if (t === 'antrean') muatAq(el); if (t === 'konfig') paneNotifKonfig(el); if (t === 'blast') muatBlastHist(el); });
    NT.tbl = Table($('#bsTbl', el), { key: 'k', select: true, per: 8, unit: 'penerima', cols: [
      { k: 'nama', label: 'Nama', render: function (r) { return '<b class="small">' + esc(r.nama || '-') + '</b>' + (r.segmen ? '<span class="t2">' + esc(r.segmen) + '</span>' : ''); } },
      { k: 'hp', label: 'Nomor', render: function (r) { return '<span class="mono small">' + esc(r.hp) + '</span>'; } },
      { k: 'statusWA', label: 'WA', render: function (r) { return !r.valid ? '<span class="wa-badge tidak">tidak valid</span>' : r.optOut ? '<span class="wa-badge tidak">opt-out</span>' : '<span class="wa-badge ' + (r.statusWA === 'Terdaftar' ? 'ya' : r.statusWA ? 'tidak' : 'belum') + '">' + (r.statusWA === 'Terdaftar' ? '✓ WA' : r.statusWA ? '✕ bukan WA' : '? belum dicek') + '</span>'; } }],
      rowClass: function (r) { return !r.valid || r.ganda || r.optOut ? 'dim' : ''; }, onSelect: function () { estimasi(el); } });
    $('#bsSum', el).onchange = function () { var m = this.value === 'manual'; $('#bsManW', el).hidden = !m; $('#bsSegW', el).hidden = m; };
    $('#bsLoad', el).onclick = function () { muatPenerima(el, this); };
    $('#bsDet', el).onclick = function () { deteksiWA(el, this); };
    $('#bsHanyaWA', el).onchange = function () { estimasi(el); };
    $$('[data-var]', el).forEach(function (b) { b.onclick = function () { var t = $('#bsPes', el), p = t.selectionStart; t.value = t.value.slice(0, p) + b.dataset.var + t.value.slice(t.selectionEnd); t.focus(); preview(el); }; });
    $('#bsPes', el).oninput = function () { preview(el); };
    $$('[data-b]', el).forEach(function (b) { b.onclick = function () { NT.batch = +b.dataset.b; $$('[data-b]', el).forEach(function (x) { x.classList.toggle('on', x === b); }); estimasi(el); }; });
    $('#bsJeda', el).oninput = function () { estimasi(el); };
    $('#bsGo', el).onclick = function () { mulaiBlast(el, this); };
    $('#bsRef', el).onclick = function () { muatBlastHist(el, true); };
    NT.aq = Table($('#aqT', el), { key: 'AntrianID', per: 15, unit: 'pesan', cols: [
      { k: 'DibuatPada', label: 'Waktu', render: function (r) { return '<span class="small">' + tglJam(r.DikirimPada || r.DibuatPada) + '</span>'; } },
      { k: 'Kanal', label: 'Kanal', render: function (r) { return '<span class="chip ' + (r.Kanal === 'WA' ? 'blue' : '') + '">' + ic(r.Kanal === 'WA' ? 'message-circle' : 'mail', 'ic-sm') + r.Kanal + '</span>'; } },
      { k: 'Tujuan', label: 'Tujuan', render: function (r) { return '<b class="small">' + esc(r.NamaPenerima || '-') + '</b><span class="t2 mono">' + esc(r.Tujuan) + '</span>'; } },
      { k: 'Event', label: 'Event', render: function (r) { return '<span class="small">' + esc(r.Event) + '</span>' + (r.BlastID ? '<span class="t2 mono">' + esc(r.BlastID) + '</span>' : ''); } },
      { k: 'Pesan', label: 'Pesan', render: function (r) { return '<span class="small" style="display:block;max-width:300px">' + esc(r.Pesan) + '</span>'; } },
      { k: 'Status', label: 'Status', render: function (r) { return pill(r.Status) + (r.Respon ? '<span class="t2">' + esc(String(r.Respon).slice(0, 40)) + '</span>' : ''); } }] });
    var aqf = function () { muatAq(el, true); }; $('#aqS', el).onchange = aqf; $('#aqK', el).onchange = aqf;
    $('#aqNow', el).onclick = async function () { var r = await aksi(this, 'notif.processNow', {}); if (r.success) muatAq(el, true); };
    var rt = $('#aqRetry', el); if (rt) rt.onclick = async function () { var r = await aksi(rt, 'notif.retry', {}); if (r.success) muatAq(el, true); };
  },
  show: function (el, param) {
    var seg = $('[data-b="' + NT.batch + '"]', el); if (seg) seg.classList.add('on');
    if (param && $('[data-tab="' + param + '"]', el)) $('[data-tab="' + param + '"]', el).click();
    if (App.blastPrefill) { NT.penerima = App.blastPrefill.map(function (p) { var hp = hp08(p.hp); return Object.assign({ k: hp + Math.random().toString(36).slice(2, 5), valid: /^08\d{8,12}$/.test(hp), statusWA: '' }, p, { hp: hp }); }); App.blastPrefill = null; ringkasPen(el); toast(NT.penerima.length + ' penerima terisi dari pilihan Anda.', 'ok'); }
    preview(el); estimasi(el); muatBlastHist(el);
  },
  hide: function () { NT.auto = false; clearTimeout(NT.autoT); }
});
function preview(el) {
  var p = NT.penerima.filter(function (r) { return r.valid; })[0] || { nama: 'Dimas', posisi: 'UI/UX Designer', divisi: 'Teknologi' }, t = $('#bsPes', el).value;
  var v = Object.assign({ institusi: perusahaan(), link: location.origin + location.pathname }, p);
  $('#bsPrev', el).innerHTML = esc(t.replace(/\{(\w+)\}/g, function (m, k) { return v[k] == null ? '' : v[k]; })).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') || '<span class="muted">Tulis pesan…</span>';
}
function penerimaFinal(el) {
  var sel = NT.tbl.selected(), base = sel.length ? sel : NT.penerima, hanya = $('#bsHanyaWA', el).checked, seen = {};
  return base.filter(function (r) { if (!r.valid || r.optOut || seen[r.hp] || (hanya && r.statusWA !== 'Terdaftar')) return false; seen[r.hp] = 1; return true; });
}
function estimasi(el) {
  var n = penerimaFinal(el).length, jeda = String($('#bsJeda', el).value || '5').split('-').map(Number), avg = jeda.length > 1 ? (jeda[0] + jeda[1]) / 2 : jeda[0] || 5, b = Math.ceil(n / NT.batch);
  $('#bsEst', el).innerHTML = ic('info', 'ic-sm') + '<div><b>' + n + ' penerima</b> → ' + b + ' batch × ' + NT.batch + ' · estimasi ±' + Math.max(1, Math.round(n * avg / 60 + b)) + ' menit. Server tetap mengirim 1 batch/menit walau halaman ditutup.</div>';
  $('#bsGo', el).innerHTML = ic('rocket') + 'Mulai Blast (' + n + ' nomor)'; $('#bsGo', el).disabled = !n;
}
function ringkasPen(el, ring) {
  var seen = {}; NT.penerima.forEach(function (r) { r.ganda = !!(r.valid && seen[r.hp]); if (r.valid) seen[r.hp] = 1; });
  ring = ring || { total: NT.penerima.length, valid: NT.penerima.filter(function (r) { return r.valid; }).length, ganda: NT.penerima.filter(function (r) { return r.ganda; }).length, optOut: NT.penerima.filter(function (r) { return r.optOut; }).length, terdaftarWA: NT.penerima.filter(function (r) { return r.statusWA === 'Terdaftar'; }).length };
  $('#bsRing', el).innerHTML = ['<span class="chip">Total ' + ring.total + '</span>', '<span class="chip blue">Valid ' + ring.valid + '</span>', '<span class="chip">Tidak valid ' + (ring.total - ring.valid) + '</span>', '<span class="chip">Ganda ' + ring.ganda + '</span>', '<span class="chip">Opt-out ' + ring.optOut + '</span>', '<span class="chip blue">✓ WA ' + ring.terdaftarWA + '</span>'].join('');
  NT.tbl.set(NT.penerima); estimasi(el); preview(el);
}
async function muatPenerima(el, btn) {
  var r = await withBusy(btn, function () { return api('wa.audience', { sumber: $('#bsSum', el).value, segmen: $('#bsSeg', el).value, manual: $('#bsMan', el).value }); });
  if (!r.success) return toast(r.message, 'bad');
  NT.penerima = r.data.rows.map(function (x, i) { x.k = (x.id || x.hp) + ':' + i; return x; });
  ringkasPen(el, r.data.ringkas);
}
async function deteksiWA(el, btn) {
  var nomor = NT.penerima.filter(function (r) { return r.valid && !r.statusWA; }).map(function (r) { return r.hp; }), uniq = nomor.filter(function (n, i) { return nomor.indexOf(n) === i; });
  if (!uniq.length) return toast('Tidak ada nomor yang perlu dicek.', 'warn');
  btn.disabled = true;
  for (var i = 0; i < uniq.length; i += 50) {
    $('#bsProg', el).textContent = 'Mengecek ' + Math.min(uniq.length, i + 50) + '/' + uniq.length;
    var r = await api('wa.validate', { nomor: uniq.slice(i, i + 50) }, { silent: true });
    if (!r.success) { toast(r.message, 'bad'); break; }
    NT.penerima.forEach(function (p) { if (r.data.hasil[p.hp]) p.statusWA = r.data.hasil[p.hp]; });
  }
  btn.disabled = false; $('#bsProg', el).textContent = ''; ringkasPen(el);
}
async function mulaiBlast(el, btn) {
  var pen = penerimaFinal(el), pes = $('#bsPes', el).value;
  if (pes.trim().length < 5) return toast('Tulis isi pesan.', 'warn');
  if (!await confirmBox('Mulai blast ke ' + pen.length + ' nomor?', 'Pesan dikirim bertahap ' + NT.batch + ' nomor per batch dengan jeda ' + $('#bsJeda', el).value + ' detik. Tips anti-banned: pakai nomor "hangat", mulai batch 10, jangan kirim tautan sama ke ratusan orang dalam 1 jam.', 'Mulai Blast')) return;
  var r = await aksi(btn, 'wa.blastCreate', { judul: $('#bsJud', el).value, pesan: pes, ukuranBatch: NT.batch, jeda: $('#bsJeda', el).value, penerima: pen, sasaran: $('#bsSum', el).value + ':' + ($('#bsSeg', el).value || 'semua') });
  if (r.success) { NT.blastAktif = r.data.blastId; progresBlast(el, { BlastID: r.data.blastId, Total: r.data.total, Terkirim: 0, Gagal: 0, persen: 0, sisa: r.data.total, Status: 'Berjalan', UkuranBatch: NT.batch }); muatBlastHist(el, true); }
}
function progresBlast(el, b) {
  var c = $('#bsProgCard', el); c.hidden = false; NT.blastAktif = b.BlastID;
  c.innerHTML = '<div class="card-h"><h3>' + ic('send') + 'Blast Aktif <span class="chip mono">' + esc(b.BlastID) + '</span></h3>' + pill(b.Status) + '</div><div class="card-b col"><div class="progress"><i style="width:' + b.persen + '%"></i></div><div class="row between small"><span>Terkirim <b class="ok-t">' + b.Terkirim + '</b> · Gagal <b class="bad-t">' + b.Gagal + '</b> · Sisa <b>' + b.sisa + '</b></span><b>' + b.persen + '%</b></div>' +
    (b.Status === 'Berjalan' ? '<div class="row wrap"><button class="btn btn-primary btn-sm" id="bpNext">' + ic('skip-forward', 'ic-sm') + 'Kirim Batch Berikutnya Sekarang</button><label class="row small"><span class="switch"><input type="checkbox" id="bpAuto"' + (NT.auto ? ' checked' : '') + '><span></span></span>Otomatis</label><button class="btn btn-danger-o btn-sm" id="bpStop">' + ic('square', 'ic-sm') + 'Hentikan</button></div><div class="small muted">Server tetap mengirim 1 batch/menit walau halaman ditutup.</div>' : '') + '</div>';
  var nx = $('#bpNext', c), au = $('#bpAuto', c), st = $('#bpStop', c);
  var kirim = async function () { var r = await api('wa.blastProcess', { blastId: b.BlastID }, { silent: true }); if (r.success) { progresBlast(el, r.data); muatBlastHist(el, true); if (r.data.Status !== 'Berjalan') NT.auto = false; } else toast(r.message, 'bad'); return r; };
  if (nx) nx.onclick = function () { withBusy(nx, kirim); };
  if (au) au.onchange = function () { NT.auto = au.checked; clearTimeout(NT.autoT); if (NT.auto) jadwal(); };
  function jadwal() { var j = String(b.JedaDetik || $('#bsJeda', el).value || 5).split('-').map(Number), avg = j.length > 1 ? (j[0] + j[1]) / 2 : j[0]; NT.autoT = setTimeout(async function () { if (!NT.auto) return; await kirim(); if (NT.auto) jadwal(); }, Math.max(30, (num(b.UkuranBatch) || NT.batch) * avg) * 1000); }
  if (NT.auto && b.Status === 'Berjalan') { clearTimeout(NT.autoT); jadwal(); }
  if (st) st.onclick = async function () { if (!await confirmBox('Hentikan blast?', 'Pesan yang belum terkirim akan dibatalkan.', 'Hentikan', true)) return; var r = await aksi(st, 'wa.blastStop', { blastId: b.BlastID }); if (r.success) { NT.auto = false; c.hidden = true; muatBlastHist(el, true); } };
}
function muatBlastHist(el, force) {
  if (!NT.hist) NT.hist = Table($('#bsHist', el), { key: 'BlastID', per: 5, unit: 'blast', cols: [
    { k: 'Judul', label: 'Judul', render: function (b) { return '<b class="small">' + esc(b.Judul) + '</b><span class="t2">' + esc(b.Sasaran) + ' · ' + tglJam(b.Tanggal) + '</span>'; } },
    { k: 'UkuranBatch', label: 'Batch·Jeda', render: function (b) { return '<span class="mono small">' + b.UkuranBatch + ' · ' + esc(b.JedaDetik) + 's</span>'; } },
    { k: 'persen', label: 'Progres', render: function (b) { return '<div style="min-width:120px"><div class="progress thin"><i style="width:' + b.persen + '%"></i></div><span class="t2">' + b.Terkirim + '/' + b.Total + (b.Gagal ? ' · ' + b.Gagal + ' gagal' : '') + '</span></div>'; } },
    { k: 'Status', label: 'Status', render: function (b) { return pill(b.Status); } },
    { label: '', render: function (b) { return b.Status === 'Berjalan' ? '<button class="btn btn-sec btn-xs" data-pantau="' + b.BlastID + '">Pantau</button>' : ''; } }],
    after: function (tb) { $$('[data-pantau]', tb).forEach(function (x) { x.onclick = function () { progresBlast(el, NT.hist.rows().filter(function (b) { return b.BlastID === x.dataset.pantau; })[0]); window.scrollTo({ top: 0, behavior: 'smooth' }); }; }); } });
  return swr('blastList', 'wa.blastList', {}, function (rows) { NT.hist.set(rows); var akt = rows.filter(function (b) { return b.Status === 'Berjalan'; })[0]; if (akt && !NT.blastAktif) progresBlast(el, akt); }, { fresh: 20000, force: force });
}
function muatAq(el, force) {
  var f = { status: $('#aqS', el).value, kanal: $('#aqK', el).value };
  return swr('notifQueue:' + f.status + f.kanal, 'notif.queue', f, function (d) {
    var r = d.ringkas;
    $('#aqSt', el).innerHTML = stat({ acc: 'amber', label: 'Menunggu', icon: 'hourglass', val: r.Antri || 0 }) + stat({ acc: 'green', label: 'Terkirim', icon: 'circle-check', val: r.Terkirim || 0 }) + stat({ acc: 'red', label: 'Gagal', icon: 'circle-x', val: r.Gagal || 0 }) + stat({ label: 'Dibatalkan', icon: 'ban', val: r.Batal || 0 });
    NT.aq.set(d.rows);
  }, { fresh: 15000, force: force });
}
async function paneNotifKonfig(el, force) {
  var p = $('#nkPane', el), diubah = false; if (!cacheGet('notifKonfig') || !p.innerHTML) p.innerHTML = skel(5, 60);
  /* v2.1: tampil instan dari cache, disegarkan di latar belakang (tidak menimpa form yang sedang diedit) */
  return swr('notifKonfig', 'notif.config', {}, function (c0) {
    if (diubah) return;
    gambarNotifKonfig(el, p, JSON.parse(JSON.stringify(c0)));
    p.oninput = p.onchange = function () { diubah = true; };
  }, { fresh: 30000, force: force, onError: function (r) { p.innerHTML = empty(r.message); } });
}
function gambarNotifKonfig(el, p, c) {
  var mat = c.matriks;
  p.innerHTML = '<div class="grid g-2"><div class="card"><div class="card-h"><h3>' + ic('message-circle', 'ok-t') + 'WhatsApp (Fonnte)</h3></div><div class="card-b col">' +
    '<label class="opt row between"><span><b>Notifikasi WhatsApp</b><div class="small muted" id="nkWaT">' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</div></span><span class="switch"><input type="checkbox" id="nkWa"' + (c.waAktif ? ' checked' : '') + '><span></span></span></label>' +
    '<div class="field"><label>Token Fonnte</label><input class="input mono" type="password" id="nkTok" placeholder="' + esc(c.token || 'Tempel token dari fonnte.com → Device') + '" autocomplete="off"><span class="hint">Disimpan di Script Properties (tidak tertulis di sheet, tidak dikirim ke browser). ' + (c.punyaToken ? '<a href="javascript:void 0" id="nkHapus">Hapus token</a>' : '') + '</span></div>' +
    '<div class="row wrap"><button class="btn btn-sec btn-sm" id="nkDev">' + ic('radio-tower', 'ic-sm') + 'Cek Perangkat</button><button class="btn btn-sec btn-sm" id="nkTesWa">' + ic('send', 'ic-sm') + 'Kirim Tes WA</button><span class="small" id="nkDevR"></span></div>' +
    '<div class="grid g-2" style="gap:10px"><div class="field"><label>Batch default</label><select class="select" id="nkB">' + selectOpts([10, 20, 50], c.batchDefault) + '</select></div><div class="field"><label>Jeda (detik)</label><input class="input mono" id="nkJ" value="' + esc(c.jeda) + '"></div></div>' +
    '<label class="check"><input type="checkbox" id="nkDet"' + (c.deteksiOtomatis ? ' checked' : '') + '><span>Deteksi otomatis nomor kontak baru terdaftar WhatsApp</span></label></div></div>' +
    '<div class="card"><div class="card-h"><h3>' + ic('mail', 'blue-t') + 'Email (Gmail)</h3></div><div class="card-b col">' +
    '<label class="opt row between"><span><b>Notifikasi Email</b><div class="small muted">Sisa kuota hari ini: <b>' + c.kuotaEmail + '</b></div></span><span class="switch"><input type="checkbox" id="nkEm"' + (c.emailAktif ? ' checked' : '') + '><span></span></span></label>' +
    '<div class="field"><label>Nama pengirim</label><input class="input" id="nkNm" value="' + esc(c.namaPengirim) + '"></div><button class="btn btn-sec btn-sm" id="nkTesEm" style="align-self:flex-start">' + ic('send', 'ic-sm') + 'Kirim Tes Email ke saya</button>' +
    '<div class="field"><label>URL aplikasi (untuk {link})</label><input class="input" id="nkUrl" value="' + esc(c.appUrl || location.origin + location.pathname) + '"></div><div class="kvbox"><span>Trigger antrean (1 menit)</span>' + (c.trigger ? pill('Aktif') : pill('Nonaktif', 'Belum terpasang')) + '</div></div></div></div>' +
    '<div class="card mt-16"><div class="card-h"><div><h3>' + ic('grid-3x3') + 'Matriks Notifikasi Otomatis</h3><p class="sub">Aktifkan kanal per kejadian. Klik ✎ untuk mengubah isi pesan (variabel {nama} {institusi} {link} + khusus event).</p></div></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th class="center">WhatsApp</th><th class="center">Email</th><th></th></tr></thead><tbody id="nkMat"></tbody></table></div></div>' +
    '<div class="card-f"><span class="small">Perubahan berlaku untuk notifikasi berikutnya.</span><button class="btn btn-primary" id="nkSave">' + ic('save', 'ic-sm') + 'Simpan Konfigurasi</button></div></div>';
  function drawMat() {
    $('#nkMat', p).innerHTML = mat.map(function (m, i) { return '<tr><td><b class="small">' + esc(m.label) + '</b><span class="t2 mono">' + m.kode + '</span></td><td class="center"><span class="switch"><input type="checkbox" data-mi="' + i + '" data-mk="wa"' + (m.wa ? ' checked' : '') + '><span></span></span></td><td class="center"><span class="switch"><input type="checkbox" data-mi="' + i + '" data-mk="email"' + (m.email ? ' checked' : '') + '><span></span></span></td><td><button class="btn btn-ghost btn-xs" data-me="' + i + '">✎ Ubah</button></td></tr>'; }).join('');
    $$('[data-mk]', p).forEach(function (x) { x.onchange = function () { mat[+x.dataset.mi][x.dataset.mk] = x.checked; }; });
    $$('[data-me]', p).forEach(function (b) { b.onclick = function () { var m = mat[+b.dataset.me]; modal({ title: m.label, sub: m.kode, size: 'lg', body: '<div class="field"><label>Subjek email</label><input class="input" id="meS" value="' + esc(m.subjek) + '"></div><div class="field mt-12"><label>Isi pesan (WA & email)</label><textarea class="textarea" id="meP" rows="7">' + esc(m.pesan) + '</textarea></div>',
      foot: [{ label: '↺ Kembalikan bawaan', cls: 'btn-ghost', act: function (mm) { $('#meS', mm.el).value = m.subjekDefault; $('#meP', mm.el).value = m.pesanDefault; return false; } }, { label: 'Terapkan', cls: 'btn-primary', act: function (mm) { m.subjek = $('#meS', mm.el).value; m.pesan = $('#meP', mm.el).value; toast('Diterapkan. Tekan "Simpan Konfigurasi" untuk menyimpan.', 'warn'); } }] }); }; });
  }
  drawMat();
  $('#nkWa', p).onchange = function () { $('#nkWaT', p).textContent = this.checked ? 'AKTIF' : 'NONAKTIF'; };
  var hp = $('#nkHapus', p); if (hp) hp.onclick = function () { $('#nkTok', p).value = '__HAPUS__'; toast('Token akan dihapus saat disimpan.', 'warn'); };
  $('#nkDev', p).onclick = async function () { var rr = await withBusy(this, function () { return api('wa.device'); }); $('#nkDevR', p).innerHTML = rr.success ? pill(rr.data.status === 'connect' ? 'Aktif' : 'Menunggu', (rr.data.nomor || '') + ' · ' + rr.data.status + ' · kuota ' + rr.data.kuota) : '<span class="bad-t">' + esc(rr.message) + '</span>'; };
  $('#nkTesWa', p).onclick = async function () { var n = await promptBox('Kirim Tes WA', 'Nomor tujuan', { inputmode: 'tel', ok: 'Kirim' }); if (n) aksi(this, 'wa.test', { nomor: n }); };
  $('#nkTesEm', p).onclick = function () { aksi(this, 'email.test', {}); };
  $('#nkSave', p).onclick = async function () {
    var rr = await aksi(this, 'notif.configSave', { waAktif: $('#nkWa', p).checked, emailAktif: $('#nkEm', p).checked, token: $('#nkTok', p).value.trim(), batchDefault: +$('#nkB', p).value, jeda: $('#nkJ', p).value, deteksiOtomatis: $('#nkDet', p).checked, namaPengirim: $('#nkNm', p).value, appUrl: $('#nkUrl', p).value, matriks: mat });
    if (rr.success) paneNotifKonfig(el, true);
  };
}

/* ============================================================ CRM KONTAK */
var CR = { hal: 1, f: {} };
registerPage('crm', {
  auth: 'hrd', title: 'CRM Kontak', menu: 'crm',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Komunikasi', 'CRM Kontak'], title: 'CRM Kontak', sub: 'Satu layar untuk memonitor seluruh kontak (Nama · Email · WhatsApp) dari karyawan, pelamar, dan talent pool — lalu langsung dipakai untuk blast.',
      actions: '<button class="btn btn-sec" id="crSync">' + ic('refresh-cw', 'ic-sm') + 'Sinkron Sekarang</button><button class="btn btn-sec" id="crImp">' + ic('upload', 'ic-sm') + 'Import CSV</button><button class="btn btn-sec" id="crDup">' + ic('copy', 'ic-sm') + 'Periksa Duplikat</button>' + (isSA() ? '<button class="btn btn-sec" id="crExp">' + ic('download', 'ic-sm') + 'Ekspor</button>' : '') }) +
      '<div class="grid g-3" id="crSt" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))"></div><div class="card mt-16"><div class="card-b"><div class="row wrap gap-4 mb-8" id="crSeg"></div><div class="filters"><div class="input-ic">' + ic('search') + '<input class="input soft" id="crQ" placeholder="Cari nama, email, atau nomor…"></div><select class="select soft" id="crWa">' + selectOpts([{ v: 'Terdaftar', l: '✓ Terdaftar WA' }, { v: 'Tidak Terdaftar', l: '✕ Bukan WA' }, { v: 'belum', l: '? Belum dicek' }], '', 'Status WA') + '</select><select class="select soft" id="crEm">' + selectOpts([{ v: 'YA', l: 'Email valid' }, { v: 'TIDAK', l: 'Email tidak valid' }], '', 'Status Email') + '</select><select class="select soft" id="crTag"></select><select class="select soft" id="crOpt">' + selectOpts([{ v: 'YA', l: 'Opt-out' }, { v: 'TIDAK', l: 'Tidak opt-out' }], '', 'Opt-out') + '</select><span class="small muted" id="crSyncT"></span></div></div></div>' +
      '<div class="bulkbar mt-16" id="crBulk" hidden><b id="crSelN"></b><span class="grow"></span><button class="btn btn-sec btn-sm" data-bk="deteksiWA">' + ic('smartphone', 'ic-sm') + 'Deteksi WA</button><button class="btn btn-sec btn-sm" data-bk="tag">' + ic('tag', 'ic-sm') + 'Beri Tag</button><button class="btn btn-sec btn-sm" id="crBlast">' + ic('megaphone', 'ic-sm') + 'Blast ke Terpilih</button><button class="btn btn-sec btn-sm" data-bk="optout">' + ic('ban', 'ic-sm') + 'Opt-out</button><button class="btn btn-sec btn-sm" data-bk="optin">Opt-in</button></div>' +
      '<div class="card mt-16"><div class="card-b flush" id="crT"></div></div>';
  },
  init: function (el) {
    CR.tbl = Table($('#crT', el), { key: 'id', select: true, per: 50, unit: 'kontak', cols: [
      { k: 'nama', label: 'Kontak', render: function (k) { return userCell(k.nama, '', ' <span class="chip">' + esc(k.segmen) + '</span>'); } },
      { k: 'email', label: 'Email', render: function (k) { return k.email ? '<span class="small">' + esc(k.email) + '</span> ' + (k.emailValid === 'YA' ? ic('circle-check', 'ic-sm ok-t') : ic('triangle-alert', 'ic-sm warn-t')) : '<span class="muted">-</span>'; } },
      { k: 'wa', label: 'WhatsApp', render: function (k) { return k.wa ? '<span class="mono small">' + esc(k.wa) + '</span> <span class="wa-badge ' + (k.statusWA === 'Terdaftar' ? 'ya' : k.statusWA ? 'tidak' : 'belum') + '">' + (k.statusWA === 'Terdaftar' ? '✓ WA' : k.statusWA ? '✕' : '?') + '</span> <a href="' + waLink(k.wa) + '" target="_blank" rel="noopener" title="wa.me">' + ic('external-link', 'ic-sm') + '</a>' : '<span class="muted">-</span>'; } },
      { k: 'tag', label: 'Tag', render: function (k) { return String(k.tag || '').split(',').filter(function (t) { return t.trim(); }).map(function (t) { return '<span class="chip blue">' + esc(t.trim()) + '</span>'; }).join(' ') + (k.optOut ? ' <span class="pill bad">opt-out</span>' : '') + (k.duplikat ? ' <span class="pill warn">duplikat</span>' : ''); } },
      { k: 'terakhir', label: 'Terakhir dihubungi', render: function (k) { return k.terakhir ? relatif(k.terakhir) : '<span class="muted">-</span>'; } },
      { k: 'jumlahPesan', label: 'Pesan', cls: 'n' }],
      rowClass: function (k) { return (!k.wa && k.emailValid !== 'YA') || k.duplikat ? 'flag' : ''; },
      onRow: function (k) { detailKontak(el, k); },
      onSelect: function (s) { $('#crBulk', el).hidden = !s.length; $('#crSelN', el).textContent = s.length + ' kontak terpilih'; } });
    var reload = function () { CR.hal = 1; muatCR(el, true); };
    $('#crQ', el).oninput = debounce(reload, 350);
    ['crWa', 'crEm', 'crTag', 'crOpt'].forEach(function (i) { $('#' + i, el).onchange = reload; });
    $('#crSync', el).onclick = async function () { var r = await aksi(this, 'crm.sync', {}); if (r.success) muatCR(el, true); };
    $$('[data-bk]', el).forEach(function (b) { b.onclick = async function () {
      var ids = CR.tbl.selected().map(function (k) { return k.id; }), nilai = '';
      if (b.dataset.bk === 'tag') { nilai = await promptBox('Beri Tag', 'Nama tag (mis. "Batch Oktober")', { ok: 'Terapkan' }); if (!nilai) return; }
      var r = await aksi(b, 'crm.bulk', { ids: ids, aksi: b.dataset.bk, nilai: nilai }); if (r.success) { CR.tbl.clearSel(); muatCR(el, true); }
    }; });
    $('#crBlast', el).onclick = function () { App.blastPrefill = CR.tbl.selected().filter(function (k) { return k.wa && !k.optOut; }).map(function (k) { return { hp: k.wa, nama: k.nama, posisi: k.info.Posisi || k.info.Jabatan || '', divisi: k.info.Divisi || '' }; }); go('notifikasi', 'blast'); };
    $('#crImp', el).onclick = function () { importKontak(el); };
    $('#crDup', el).onclick = function () { cekDuplikat(el); };
    var ex = $('#crExp', el); if (ex) ex.onclick = async function () { var r = await withBusy(ex, function () { return api('crm.export', filterCR(el)); }); if (r.success) exportXlsx('CRM_Kontak_' + ymd(), { Kontak: r.data }); else toast(r.message, 'bad'); };
  },
  show: function (el) { muatCR(el); swr('crmStats', 'crm.stats', {}, function (s) { statCR(el, s); }, { fresh: 60000 }); }
});
function filterCR(el) { return { cari: $('#crQ', el).value, statusWA: $('#crWa', el).value, emailValid: $('#crEm', el).value, tag: $('#crTag', el).value, optOut: $('#crOpt', el).value, segmen: CR.f.segmen || '', duplikat: CR.f.duplikat, masalah: CR.f.masalah }; }
function statCR(el, s) {
  var k = [['Total Kontak', s.total, 'contact', {}], ['WA Terverifikasi', s.terdaftarWA, 'badge-check', { statusWA: 'Terdaftar' }], ['Email Valid', s.emailValid, 'mail-check', { emailValid: 'YA' }], ['Belum Dicek WA', s.belumCek, 'smartphone', { statusWA: 'belum' }], ['Opt-out', s.optOut, 'ban', { optOut: 'YA' }], ['Duplikat', s.duplikat, 'copy', { duplikat: true }]];
  $('#crSt', el).innerHTML = k.map(function (x, i) { return stat({ acc: i ? '' : 'navy', label: x[0], icon: x[2], val: x[1], go: 'crm' }).replace('data-go="crm"', 'data-cf="' + i + '"'); }).join('');
  $$('[data-cf]', el).forEach(function (c) { c.onclick = function () { var f = k[+c.dataset.cf][3]; $('#crWa', el).value = f.statusWA || ''; $('#crEm', el).value = f.emailValid || ''; $('#crOpt', el).value = f.optOut || ''; CR.f.duplikat = !!f.duplikat; CR.hal = 1; muatCR(el, true); }; });
}
function muatCR(el, force) {
  var f = filterCR(el);
  return swr('crm:' + JSON.stringify(f), 'crm.list', Object.assign({ per: 1000, halaman: 1 }, f), function (d) {
    $('#crSeg', el).innerHTML = '<button class="chip ' + (!CR.f.segmen ? 'blue' : '') + '" data-sg="">Semua</button>' + Object.keys(d.facet.segmen).map(function (s) { return '<button class="chip ' + (CR.f.segmen === s ? 'blue' : '') + '" data-sg="' + esc(s) + '">' + esc(s) + ' <b>' + d.facet.segmen[s].toLocaleString('id-ID') + '</b></button>'; }).join('');
    $$('[data-sg]', el).forEach(function (b) { b.onclick = function () { CR.f.segmen = b.dataset.sg; muatCR(el, true); }; });
    $('#crTag', el).innerHTML = selectOpts(d.tags, $('#crTag', el).value, 'Semua Tag');
    $('#crSyncT', el).textContent = d.sinkron ? 'Sinkron terakhir ' + relatif(new Date(d.sinkron)) : '';
    CR.tbl.set(d.rows);
  }, { fresh: 30000, force: force });
}
async function detailKontak(el, k) {
  var r = await api('crm.detail', { kontakId: k.id }); if (!r.success) return toast(r.message, 'bad');
  var d = r.data;
  drawer({ head: '<div class="row gap-12">' + avatar(k.nama, 'lg') + '<div><b style="font-size:17px">' + esc(k.nama) + '</b><div class="small muted">' + esc(k.segmen) + ' · sumber ' + esc(k.sumber) + ' ' + esc(k.refId) + '</div></div></div>',
    body: '<div class="row wrap">' + (k.wa ? '<a class="btn btn-sec btn-sm" target="_blank" rel="noopener" href="' + waLink(k.wa) + '">' + ic('message-circle', 'ic-sm') + 'WhatsApp</a>' : '') + (k.email ? '<a class="btn btn-sec btn-sm" href="mailto:' + esc(k.email) + '">' + ic('mail', 'ic-sm') + 'Email</a>' : '') + '</div>' +
      '<div class="fgrid mt-16" id="kkF"><div class="field full"><label>Nama</label><input class="input" name="nama" value="' + esc(k.nama) + '"></div><div class="field"><label>Email</label><input class="input" name="email" value="' + esc(k.email) + '"' + (k.sumber === 'karyawan' ? ' disabled title="Email login karyawan diubah dari Master Karyawan"' : '') + '></div><div class="field"><label>WhatsApp</label><input class="input mono" name="wa" value="' + esc(k.wa) + '"></div>' +
      '<div class="field full"><label>Tag (pisah koma)</label><input class="input" name="tag" value="' + esc(k.tag || '') + '"></div><div class="field full"><label>Catatan</label><textarea class="textarea" name="catatan" rows="2">' + esc(d.catatan || '') + '</textarea></div><label class="check full"><input type="checkbox" name="optOut"' + (k.optOut ? ' checked' : '') + '><span>Opt-out (tidak menerima blast; notifikasi transaksional tetap dikirim)</span></label></div>' +
      '<div class="ov mt-24 mb-8">Catat Interaksi</div><div class="row"><select class="select" id="kkK" style="width:auto">' + selectOpts(['Telepon', 'WA Manual', 'Kunjungan', 'Catatan'], 'Telepon') + '</select><input class="input" id="kkR" placeholder="Ringkasan interaksi"><button class="btn btn-sec" id="kkAdd">Catat</button></div>' +
      '<div class="ov mt-24 mb-8">Timeline</div><ul class="timeline">' + (d.timeline.length ? d.timeline.slice(0, 40).map(function (t) { return '<li><span class="d"></span><div class="small"><b>' + esc(t.kanal) + '</b> · ' + tglJam(t.tanggal) + (t.status ? ' · ' + esc(t.status) : '') + '</div><div class="small muted">' + esc(t.ringkasan) + '</div></li>'; }).join('') : '<li>' + empty('Belum ada interaksi.', 'history') + '</li>') + '</ul>',
    foot: '<button class="btn btn-sec" data-close>Tutup</button><button class="btn btn-primary" id="kkSave">Simpan</button>',
    onOpen: function (dl, dd) {
      $('#kkSave', dl).onclick = async function () { var v = formVals($('#kkF', dl)); v.id = k.id; if (k.sumber === 'karyawan') delete v.email; var rr = await aksi(this, 'crm.save', v); if (rr.success) { dd.close(); muatCR(el, true); } };
      $('#kkAdd', dl).onclick = async function () { var rr = await aksi(this, 'crm.interaksi', { kontakId: k.id, kanal: $('#kkK', dl).value, ringkasan: $('#kkR', dl).value }); if (rr.success) { dd.close(); detailKontak(el, k); } };
    } });
}
function importKontak(el) {
  modal({ title: 'Import Kontak (CSV / Excel)', sub: 'Kolom: nama, email, wa, segmen, tag. Kontak luar app (peserta job fair, referensi) masuk sumber "manual".', body: '<button class="btn btn-sec btn-sm" id="ikTpl">' + ic('download', 'ic-sm') + 'Unduh template</button><div class="field mt-12"><label>Berkas</label><input type="file" id="ikF" accept=".csv,.xlsx,.xls"></div><div id="ikInfo" class="mt-8 small muted"></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Import', cls: 'btn-primary', act: async function (m) {
      var f = $('#ikF', m.el).files[0]; if (!f) { toast('Pilih berkas.', 'warn'); return false; }
      await loadXLSX(); var wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      rows = rows.map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k.toLowerCase().trim()] = r[k]; }); return { nama: o.nama || o.name, email: o.email, wa: String(o.wa || o.whatsapp || o.hp || o.nohp || ''), segmen: o.segmen, tag: o.tag }; });
      var r = await api('crm.import', { rows: rows }); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatCR(el, true); return r.success;
    } }], onOpen: function (mel) { $('#ikTpl', mel).onclick = function () { exportXlsx('Template_Import_Kontak', { Kontak: [{ nama: 'Contoh Nama', email: 'contoh@gmail.com', wa: '081234567890', segmen: 'Kontak Luar', tag: 'Job Fair 2026' }] }); }; } });
}
async function cekDuplikat(el) {
  var r = await api('crm.list', { duplikat: true, per: 500 }); if (!r.success) return toast(r.message, 'bad');
  var grup = {}; r.data.rows.forEach(function (k) { var key = k.wa || k.email; (grup[key] = grup[key] || []).push(k); });
  var keys = Object.keys(grup).filter(function (x) { return grup[x].length > 1; });
  modal({ title: 'Periksa Duplikat', sub: keys.length + ' grup nomor/email sama', size: 'lg', body: keys.length ? keys.map(function (key, gi) { return '<div class="card tint mb-8"><div class="card-b tight"><div class="row between"><b class="mono small">' + esc(key) + '</b><button class="btn btn-sec btn-xs" data-mg="' + gi + '">Gabungkan ke yang pertama</button></div>' + grup[key].map(function (k) { return '<div class="small">• ' + esc(k.nama) + ' <span class="muted">(' + esc(k.segmen) + ', ' + esc(k.sumber) + ')</span></div>'; }).join('') + '</div></div>'; }).join('') : empty('Tidak ada duplikat. 🎉', 'check'),
    onOpen: function (mel) { $$('[data-mg]', mel).forEach(function (b) { b.onclick = async function () { var g = grup[keys[+b.dataset.mg]]; var rr = await aksi(b, 'crm.merge', { utama: g[0].id, gabung: g.slice(1).map(function (k) { return k.id; }) }); if (rr.success) { b.disabled = true; muatCR(el, true); } }; }); } });
}

/* ============================================================ TEMPLATE DOKUMEN (Doc Engine) */
var DE = {};
registerPage('template', {
  auth: 'hrd', title: 'Template Dokumen', menu: 'template',
  template: function () {
    return pageHead({ crumbs: ['Beranda', 'Dokumen', 'Template & Penerbitan'], title: 'Template Dokumen & Surat', sub: 'Desain template di Google Docs/Sheets/Slides dengan penanda <span class="mono">{{NAMA_KARYAWAN}}</span>, pindai, isi form otomatis, minta persetujuan pejabat (Google + PIN), lalu terbitkan PDF ber-QR verifikasi.' }) +
      '<div class="tabs mb-16"><button class="tab on" data-tab="buat">' + ic('file-plus') + 'Buat Dokumen</button><button class="tab" data-tab="terbit">' + ic('files') + 'Dokumen</button><button class="tab" data-tab="tpl">' + ic('layout-template') + 'Template</button><button class="tab" data-tab="pejabat">' + ic('user-check') + 'Pejabat Penanda Tangan</button><button class="tab" data-tab="massal">' + ic('layers') + 'Generate Massal</button></div>' +
      '<div data-pane="buat"><div class="grid g-main"><div class="card"><div class="card-h"><h3>Isian Dokumen</h3></div><div class="card-b col gap-12"><div class="grid g-2" style="gap:12px"><div class="field"><label>Template</label><select class="select" id="deT"></select></div><div class="field"><label>Kaitkan ke Karyawan (isi otomatis)</label><select class="select" id="deK"></select></div></div><div class="field"><label>Judul dokumen (internal)</label><input class="input" id="deJ"></div><div id="deForm" class="fgrid"></div><div id="deSlot"></div></div>' +
      '<div class="card-f"><span class="small" id="deInfo"></span><div class="row"><button class="btn btn-sec" id="dePrev">' + ic('eye', 'ic-sm') + 'Pratinjau PDF</button><button class="btn btn-primary" id="deAju">' + ic('send', 'ic-sm') + 'Simpan & Ajukan</button></div></div></div>' +
      '<div class="stack"><div class="card tint"><div class="card-b small"><b class="row">' + ic('lightbulb', 'warn-t') + 'Cara kerja</b><ol style="margin:8px 0 0;padding-left:18px;display:grid;gap:6px"><li>Pilih template & karyawan — data karyawan terisi otomatis.</li><li>Lengkapi kolom khusus (mis. Keperluan).</li><li>Ajukan → pejabat menerima notifikasi & menyetujui dengan PIN.</li><li>Dokumen terbit: nomor otomatis, QR verifikasi, arsip Drive.</li></ol></div></div><div class="card"><div class="card-h"><h3>Kode penanda yang tersedia</h3></div><div class="card-b small" id="deKode"></div></div></div></div></div>' +
      '<div data-pane="terbit" hidden><div class="card"><div class="card-b"><div class="filters"><select class="select soft" id="dsS">' + selectOpts(['DRAF', 'MENUNGGU_TTD', 'TERBIT', 'DITARIK'], '', 'Semua Status') + '</select><label class="check small"><input type="checkbox" id="dsSlip">Tampilkan slip gaji</label></div></div><div class="card-b flush" id="dsT"></div></div></div>' +
      '<div data-pane="tpl" hidden><div class="card"><div class="card-h"><div><h3>Daftar Template</h3><p class="sub">Master template tidak pernah diubah — sistem selalu membuat salinan.</p></div>' + (isSA() ? '<button class="btn btn-primary btn-sm" id="tpNew">' + ic('scan-search', 'ic-sm') + 'Pindai Template Baru</button>' : '') + '</div><div class="card-b flush" id="tpT"></div></div></div>' +
      '<div data-pane="pejabat" hidden><div class="card"><div class="card-h"><div><h3>Pejabat Penanda Tangan</h3><p class="sub">Menyetujui dengan login Google (email sama) + PIN 6 angka. Super Admin dapat bypass dengan alasan (tercatat).</p></div>' + (isSA() ? '<button class="btn btn-primary btn-sm" id="pjNew">' + ic('plus', 'ic-sm') + 'Tambah Pejabat</button>' : '') + '</div><div class="card-b flush" id="pjT"></div></div></div>' +
      '<div data-pane="massal" hidden><div class="grid g-2"><div class="card"><div class="card-h"><h3>Generate Massal (Mail Merge)</h3></div><div class="card-b col gap-12"><div class="field"><label>Template</label><select class="select" id="msT"></select></div><div class="field"><label>Sumber data</label><select class="select" id="msSrc">' + selectOpts([{ v: 'karyawan', l: 'Karyawan terpilih' }, { v: 'excel', l: 'Berkas Excel (judul kolom = kunci placeholder)' }], 'karyawan') + '</select></div><div id="msKar" class="field"><label>Karyawan</label><select class="select" id="msK" multiple size="8"></select><span class="hint">Ctrl/⌘ + klik untuk memilih banyak</span></div><div id="msX" class="field" hidden><label>Berkas Excel</label><input type="file" id="msF" accept=".xlsx,.xls,.csv"></div><div class="field"><label>Isian umum (JSON opsional, mis. {"KEPERLUAN":"Pengajuan KPR"})</label><input class="input mono" id="msU"></div><button class="btn btn-primary" id="msGo">' + ic('layers', 'ic-sm') + 'Masukkan ke Antrean</button></div></div>' +
      '<div class="card"><div class="card-h"><h3>Progres Antrean</h3><button class="btn btn-ghost btn-sm" id="msRef">' + ic('refresh-cw', 'ic-sm') + '</button></div><div class="card-b" id="msProg"></div></div></div></div>';
  },
  init: function (el) {
    bindTabs(el, function (t) { if (t === 'terbit') muatDok2(el, true); if (t === 'pejabat') muatPj(el); if (t === 'tpl') muatTpl(el); if (t === 'massal') muatMassal(el); });
    $('#deT', el).onchange = function () { formDe(el); };
    $('#deK', el).onchange = function () { isiKaryawan(el); };
    $('#dePrev', el).onclick = async function () { var p = kumpulDe(el); if (!p) return; var r = await withBusy(this, function () { return api('de.pratinjau', p); }); if (r.success) lihatB64(r.data); else toast(r.message, 'bad'); };
    $('#deAju', el).onclick = async function () {
      var p = kumpulDe(el); if (!p) return; var b = this;
      var r = await withBusy(b, function () { return api('de.dokumenSimpan', p); }); if (!r.success) return toast(r.message, 'bad');
      var r2 = await withBusy(b, function () { return api('de.dokumenAjukan', { id: r.data.id }); }); toast(r2.message, r2.success ? 'ok' : 'bad');
      if (r2.success) { cacheBust(['deDokumen']); $('[data-tab="terbit"]', el).click(); }
    };
    DE.dok = Table($('#dsT', el), { key: 'id', per: 15, unit: 'dokumen', cols: [
      { k: 'judul', label: 'Dokumen', render: function (d) { return '<b class="small">' + esc(d.judul) + '</b><span class="t2">' + esc(d.template) + (d.nomor ? ' · <span class="mono">' + esc(d.nomor) + '</span>' : '') + '</span>'; } },
      { k: 'status', label: 'Status', render: function (d) { return pill(d.status, d.status.replace('_', ' ')); } },
      { label: 'Penanda Tangan', render: function (d) { return d.penandatangan.map(function (s) { return '<div class="small">' + (s.status === 'SETUJU' || s.status === 'OTOMATIS' ? ic('circle-check', 'ic-sm ok-t') : ic('clock', 'ic-sm warn-t')) + ' ' + esc(s.nama || s.label) + (s.metode === 'BYPASS' ? ' <span class="pill warn">bypass</span>' : '') + '</div>'; }).join(''); } },
      { k: 'dibuat', label: 'Tanggal', render: function (d) { return tglJam(d.terbit || d.dibuat); } },
      { label: '', render: function (d) { return '<div class="row">' + (d.status === 'TERBIT' ? '<button class="btn btn-sec btn-xs" data-dpdf="' + d.id + '">' + ic('download', 'ic-sm') + 'PDF</button><a class="btn btn-ghost btn-xs" target="_blank" href="#/verifikasi/' + esc(d.kode) + '">' + ic('qr-code', 'ic-sm') + '</a>' + (isSA() ? '<button class="btn btn-ghost btn-xs" data-tarik="' + d.id + '">Tarik</button>' : '') : '') + (d.status === 'DRAF' ? '<button class="btn btn-primary btn-xs" data-aju="' + d.id + '">Ajukan</button>' : '') + '</div>'; } }],
      after: function (tb) {
        $$('[data-dpdf]', tb).forEach(function (b) { b.onclick = async function () { var r = await withBusy(b, function () { return api('de.unduh', { id: b.dataset.dpdf }); }); if (r.success) lihatB64(r.data); else toast(r.message, 'bad'); }; });
        $$('[data-aju]', tb).forEach(function (b) { b.onclick = async function () { var r = await aksi(b, 'de.dokumenAjukan', { id: b.dataset.aju }); if (r.success) muatDok2(el, true); }; });
        $$('[data-tarik]', tb).forEach(function (b) { b.onclick = async function () { var a = await promptBox('Tarik Dokumen', 'Alasan penarikan (tampil di halaman verifikasi)', { area: true, min: 5, ok: 'Tarik Dokumen', danger: true }); if (!a) return; var r = await aksi(b, 'de.dokumenTarik', { id: b.dataset.tarik, alasan: a }); if (r.success) muatDok2(el, true); }; });
      } });
    $('#dsS', el).onchange = function () { muatDok2(el, true); }; $('#dsSlip', el).onchange = function () { muatDok2(el, true); };
    var tn = $('#tpNew', el); if (tn) tn.onclick = function () { pindaiTpl(el); };
    var pn = $('#pjNew', el); if (pn) pn.onclick = function () { formPj(el); };
    $('#msSrc', el).onchange = function () { $('#msKar', el).hidden = this.value !== 'karyawan'; $('#msX', el).hidden = this.value !== 'excel'; };
    $('#msGo', el).onclick = function () { jalanMassal(el, this); };
    $('#msRef', el).onclick = function () { muatMassal(el); };
  },
  show: function (el) { muatTplData(el).then(function () { formDe(el); }); }
});
function muatTplData(el, force) {
  var p1 = swr('deTpl', 'de.templateList', {}, function (d) {
    DE.tpl = d.templates; DE.pj = d.pejabat;
    var akt = d.templates.filter(function (t) { return t.aktif; });
    ['#deT', '#msT'].forEach(function (s) { var v = $(s, el).value; $(s, el).innerHTML = selectOpts(akt.filter(function (t) { return s === '#msT' || t.kode !== 'SLIP_GAJI'; }).map(function (t) { return { v: t.id, l: t.nama + ' (' + t.kode + ')' }; }), v); });
  }, { fresh: 120000, force: force });
  var p2 = (cacheGet('karyawanList') ? Promise.resolve({ success: true, data: cacheGet('karyawanList') }) : api('karyawanList', {}, { silent: true })).then(function (r) {
    if (!r.success) return; DE.kar = r.data; cacheSet('karyawanList', r.data);
    var opt = r.data.map(function (k) { return { v: k.ID, l: k.Nama + ' · ' + k.NIK + (k.Status !== 'Aktif' ? ' (nonaktif)' : '') }; });
    $('#deK', el).innerHTML = selectOpts(opt, $('#deK', el).value, '— tanpa karyawan —'); $('#msK', el).innerHTML = selectOpts(opt.filter(function (o, i) { return r.data[i].Status === 'Aktif'; }));
  });
  return Promise.all([p1, p2]);
}
var DE_MAP = { NAMA_KARYAWAN: 'Nama', NIK_KARYAWAN: 'NIK', JABATAN_KARYAWAN: 'Jabatan', DIVISI: 'Divisi', TGL_BERGABUNG: 'TglBergabung', STATUS_KERJA: 'StatusKerja', ALAMAT_KARYAWAN: 'Alamat', EMAIL_KARYAWAN: 'Email', TGL_KONTRAK_BERAKHIR: 'TglKontrakBerakhir' };
function formDe(el) {
  var t = (DE.tpl || []).filter(function (x) { return x.id === $('#deT', el).value; })[0];
  if (!t) { $('#deForm', el).innerHTML = empty('Belum ada template aktif. Pindai template di tab Template.', 'layout-template'); return; }
  DE.cur = t;
  $('#deForm', el).innerHTML = t.bidang.map(function (b) {
    var id = 'de_' + b.kunci, lab = '<label for="' + id + '">' + esc(b.label) + (b.wajib ? ' <span class="req">*</span>' : '') + (b.otomatis ? ' <span class="chip blue">otomatis</span>' : '') + '</label>', inp;
    if (b.tipe === 'area') inp = '<textarea class="textarea" id="' + id + '" rows="2"></textarea>';
    else if (b.tipe === 'naskah') inp = '<div class="textarea" id="' + id + '" contenteditable="true" style="min-height:110px"></div>';
    else if (b.tipe === 'pilihan') inp = '<select class="select" id="' + id + '">' + selectOpts(b.opsi || []) + '</select>';
    else if (b.tipe === 'daftar') inp = '<textarea class="textarea mono" id="' + id + '" rows="3" placeholder="Satu baris per item, kolom dipisah | : ' + esc((b.kolom || []).map(function (k) { return k.kunci; }).join(' | ')) + '"></textarea>';
    else inp = '<input class="input" id="' + id + '" type="' + ({ tanggal: 'date', angka: 'number' }[b.tipe] || 'text') + '">';
    return '<div class="field ' + (['area', 'naskah', 'daftar'].indexOf(b.tipe) > -1 ? 'full' : '') + '">' + lab + inp + (b.bantu ? '<span class="hint">' + esc(b.bantu) + '</span>' : '') + '</div>';
  }).join('') || '<div class="full">' + empty('Template ini tidak punya kolom isian.', 'file') + '</div>';
  $('#deSlot', el).innerHTML = t.slot.length ? '<div class="ov mb-8">Penanda Tangan</div>' + t.slot.map(function (s) { return '<div class="kvbox"><span><b>' + esc(s.label) + '</b> <span class="small muted">(' + (s.wajibSetuju ? 'wajib setuju' : 'otomatis') + ', tanda: ' + esc(s.tanda) + ')</span></span>' + (s.cara === 'pilih' ? '<select class="select" data-slot="' + s.slot + '" style="width:auto">' + selectOpts((DE.pj || []).map(function (p) { return { v: p.id, l: p.nama + ' — ' + p.jabatan }; }), s.pejabatId, 'Pilih pejabat…') + '</select>' : '<span class="small">' + esc(((DE.pj || []).filter(function (p) { return p.id === s.pejabatId; })[0] || {}).nama || s.jabatan || '-') + '</span>') + '</div>'; }).join('') : '';
  $('#deKode', el).innerHTML = '<div class="col gap-4">' + ['{{NOMOR}} {{TANGGAL}} {{TAHUN}} {{BULAN_ROMAWI}}', '{{NAMA_KARYAWAN}} {{NIK_KARYAWAN}} {{JABATAN_KARYAWAN}} {{DIVISI}} {{TGL_BERGABUNG|tanggal}}', '{{TTD_1}} {{NAMA_PEJABAT_1}} {{JABATAN_1}} {{QR}} {{KODE_VERIFIKASI}}', 'Pengubah: |kapital |judul |rupiah |terbilang:rupiah |tanggal', 'Blok: {{#ITEM}}…{{ITEM.NAMA}} · Syarat: {{?X}}…{{/X}}'].map(function (x) { return '<span class="mono" style="font-size:11.5px">' + esc(x) + '</span>'; }).join('') + '</div>';
  $('#deInfo', el).textContent = t.engine.toUpperCase() + ' · v' + t.versi + ' · keluaran ' + t.keluaran.join(', ').toUpperCase();
  isiKaryawan(el);
}
function isiKaryawan(el) {
  var k = (DE.kar || []).filter(function (x) { return x.ID === $('#deK', el).value; })[0] || {}, t = DE.cur; if (!t) return;
  t.bidang.forEach(function (b) { var f = DE_MAP[b.kunci], inp = $('#de_' + b.kunci, el); if (f && inp && k[f] !== undefined) inp.value = k[f]; });
  if (k.Nama) $('#deJ', el).value = t.nama + ' — ' + k.Nama;
}
function kumpulDe(el) {
  var t = DE.cur; if (!t) return toast('Pilih template.', 'warn'), null;
  var isian = {};
  for (var i = 0; i < t.bidang.length; i++) {
    var b = t.bidang[i], inp = $('#de_' + b.kunci, el); if (!inp) continue;
    var v = b.tipe === 'naskah' ? inp.innerHTML : inp.value.trim();
    if (b.tipe === 'angka' && v !== '') v = Number(v);
    if (b.tipe === 'daftar') v = String(v).split('\n').filter(Boolean).map(function (ln) { var p = ln.split('|'), o = {}; (b.kolom || []).forEach(function (k, j) { o[k.kunci] = (p[j] || '').trim(); }); return o; });
    if (b.wajib && (v === '' || (Array.isArray(v) && !v.length))) { toast('Kolom "' + b.label + '" wajib diisi.', 'warn'); inp.focus(); return null; }
    isian[b.kunci] = v;
  }
  var ttd = $$('[data-slot]', el).map(function (s) { return { slot: +s.dataset.slot, pejabatId: s.value }; });
  return { templateId: t.id, idKaryawan: $('#deK', el).value, isian: isian, penandatangan: ttd, judul: $('#deJ', el).value };
}
function muatDok2(el, force) { return swr('deDokumen:' + $('#dsS', el).value + $('#dsSlip', el).checked, 'de.dokumenList', { status: $('#dsS', el).value, termasukSlip: $('#dsSlip', el).checked }, function (rows) { DE.dok.set(rows); }, { fresh: 20000, force: force }); }
function muatTpl(el) {
  muatTplData(el, true).then(function () {
    if (!DE.tplT) DE.tplT = Table($('#tpT', el), { key: 'id', per: 10, unit: 'template', cols: [
      { k: 'nama', label: 'Template', render: function (t) { return '<b>' + esc(t.nama) + '</b><span class="t2 mono">' + esc(t.kode) + ' · ' + t.engine + ' · v' + t.versi + '</span>'; } },
      { label: 'Isian', cls: 'n', render: function (t) { return t.bidang.length; } }, { label: 'Slot TTD', cls: 'n', render: function (t) { return t.slot.length; } },
      { label: 'Keluaran', render: function (t) { return t.keluaran.map(function (k) { return '<span class="chip">' + k.toUpperCase() + '</span>'; }).join(' '); } },
      { k: 'aktif', label: 'Status', render: function (t) { return pill(t.aktif ? 'Aktif' : 'Nonaktif'); } },
      { label: '', render: function (t) { return '<div class="row"><a class="btn btn-ghost btn-xs" target="_blank" rel="noopener" href="' + esc(t.url) + '">' + ic('external-link', 'ic-sm') + 'Buka</a>' + (isSA() ? '<button class="btn btn-sec btn-xs" data-atur="' + t.id + '">Atur</button><button class="btn btn-sec btn-xs" data-scan="' + t.kode + '">Pindai Ulang</button>' : '') + '</div>'; } }],
      after: function (tb) {
        $$('[data-atur]', tb).forEach(function (b) { b.onclick = function () { aturTpl(el, DE.tpl.filter(function (t) { return t.id === b.dataset.atur; })[0]); }; });
        $$('[data-scan]', tb).forEach(function (b) { b.onclick = async function () { var r = await aksi(b, 'de.templatePindai', { kode: b.dataset.scan }); if (r.success) muatTpl(el); }; });
      } });
    DE.tplT.set(DE.tpl);
  });
}
function pindaiTpl(el) {
  modal({ title: 'Pindai Template Baru', sub: 'Tempel tautan Google Docs/Sheets/Slides yang berisi penanda {{...}}. Akun pemilik skrip harus bisa membuka berkas tersebut.', body: '<div class="col gap-12"><div class="field"><label>Tautan template</label><input class="input" name="url" placeholder="https://docs.google.com/document/d/…"></div><div class="grid g-2" style="gap:10px"><div class="field"><label>Kode (huruf besar)</label><input class="input mono" name="kode" placeholder="SURAT_TUGAS"></div><div class="field"><label>Nama</label><input class="input" name="nama"></div></div><div class="field"><label>Keluaran</label><select class="select" name="keluaran">' + selectOpts([{ v: 'pdf', l: 'PDF' }, { v: 'pdf,docx', l: 'PDF + DOCX' }, { v: 'xlsx', l: 'XLSX (Sheets)' }, { v: 'pdf,png', l: 'PDF + PNG (Slides)' }], 'pdf') + '</select></div></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Pindai', cls: 'btn-primary', act: async function (m) { var r = await api('de.templatePindai', formVals(m.el)); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatTpl(el); return r.success; } }] });
}
function aturTpl(el, t) {
  var bid = JSON.parse(JSON.stringify(t.bidang)), slot = JSON.parse(JSON.stringify(t.slot));
  modal({ title: 'Atur Template — ' + t.nama, size: 'xl', body: '<div class="grid g-2"><div><div class="ov mb-8">Atur Kolom</div><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Kunci</th><th>Label</th><th>Tipe</th><th>Wajib</th></tr></thead><tbody>' + bid.map(function (b, i) { return '<tr><td class="mono small">' + esc(b.kunci) + '</td><td><input class="input" data-b="' + i + '" data-k="label" value="' + esc(b.label) + '"></td><td><select class="select" data-b="' + i + '" data-k="tipe">' + selectOpts(['teks', 'area', 'naskah', 'tanggal', 'angka', 'pilihan', 'daftar', 'gambar'], b.tipe) + '</select></td><td><input type="checkbox" data-b="' + i + '" data-k="wajib"' + (b.wajib ? ' checked' : '') + '></td></tr>'; }).join('') + '</tbody></table></div></div>' +
    '<div><div class="ov mb-8">Atur Penanda Tangan</div>' + (slot.length ? slot.map(function (s, i) { return '<div class="card tint mb-8"><div class="card-b tight col"><b>Slot ' + s.slot + '</b><div class="grid g-2" style="gap:8px"><input class="input" data-s="' + i + '" data-k="label" value="' + esc(s.label) + '"><select class="select" data-s="' + i + '" data-k="cara">' + selectOpts([{ v: 'tetap', l: 'Pejabat tetap' }, { v: 'pilih', l: 'Dipilih saat membuat' }, { v: 'jabatan', l: 'Berdasarkan jabatan' }], s.cara) + '</select><select class="select" data-s="' + i + '" data-k="pejabatId">' + selectOpts((DE.pj || []).map(function (p) { return { v: p.id, l: p.nama }; }), s.pejabatId, '— pejabat —') + '</select><input class="input" data-s="' + i + '" data-k="jabatan" placeholder="Jabatan (cara jabatan)" value="' + esc(s.jabatan || '') + '"><select class="select" data-s="' + i + '" data-k="tanda">' + selectOpts([{ v: 'qr', l: 'QR eTTD' }, { v: 'spesimen', l: 'Spesimen TTD' }, { v: 'qr+spesimen', l: 'Spesimen (fallback QR)' }, { v: 'kosong', l: 'Kosong (TTD basah)' }], s.tanda) + '</select><input class="input mono" data-s="' + i + '" data-k="urutan" value="' + s.urutan + '" title="Urutan persetujuan"></div><label class="check small"><input type="checkbox" data-s="' + i + '" data-k="wajibSetuju"' + (s.wajibSetuju ? ' checked' : '') + '>Wajib persetujuan pejabat (Google + PIN)</label></div></div>'; }).join('') : empty('Tidak ada slot {{TTD_n}}.') ) +
    '<label class="check"><input type="checkbox" id="atQr"' + (t.qrPerPenandatangan ? ' checked' : '') + '>QR per penanda tangan menggantikan TTD</label><div class="field mt-12"><label>Keluaran</label><input class="input" id="atOut" value="' + esc(t.keluaran.join(',')) + '"></div><label class="check mt-12"><input type="checkbox" id="atAkt"' + (t.aktif ? ' checked' : '') + '>Template aktif</label></div></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Simpan', cls: 'btn-primary', act: async function (m) {
      $$('[data-b]', m.el).forEach(function (x) { bid[+x.dataset.b][x.dataset.k] = x.type === 'checkbox' ? x.checked : x.value; });
      $$('[data-s]', m.el).forEach(function (x) { slot[+x.dataset.s][x.dataset.k] = x.type === 'checkbox' ? x.checked : x.dataset.k === 'urutan' ? +x.value : x.value; });
      var r = await api('de.templateSave', { id: t.id, bidang: bid, slot: slot, qrPerPenandatangan: $('#atQr', m.el).checked, keluaran: $('#atOut', m.el).value.split(','), aktif: $('#atAkt', m.el).checked });
      toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) muatTpl(el); return r.success; } }] });
}
function muatPj(el) {
  if (!DE.pjT) DE.pjT = Table($('#pjT', el), { key: 'id', unit: 'pejabat', cols: [
    { k: 'nama', label: 'Pejabat', render: function (p) { return userCell([p.nama, p.gelar].filter(Boolean).join(', '), p.email); } }, { k: 'jabatan', label: 'Jabatan' }, { k: 'nip', label: 'NIP', render: function (p) { return '<span class="mono small">' + esc(p.nip || '-') + '</span>'; } },
    { label: 'PIN', render: function (p) { return p.punyaPin ? pill('Aktif', 'PIN diatur') : pill('Menunggu', 'Belum'); } }, { label: 'Spesimen', render: function (p) { return p.spesimen ? pill('Aktif', 'Ada') : '-'; } },
    { k: 'aktif', label: 'Status', render: function (p) { return pill(p.aktif ? 'Aktif' : 'Nonaktif'); } }, { label: '', render: function (p) { return isSA() ? '<button class="btn btn-sec btn-xs" data-pj="' + p.id + '">Edit</button>' : ''; } }],
    after: function (tb) { $$('[data-pj]', tb).forEach(function (b) { b.onclick = function () { formPj(el, DE.pjAll.filter(function (p) { return p.id === b.dataset.pj; })[0]); }; }); } });
  api('de.pejabatList', {}, { silent: true }).then(function (r) { if (r.success) { DE.pjAll = r.data; DE.pjT.set(r.data); } });
}
function formPj(el, p) {
  p = p || { aktif: true };
  modal({ title: p.id ? 'Edit Pejabat' : 'Tambah Pejabat', body: '<div class="fgrid"><div class="field"><label>Nama</label><input class="input" name="nama" value="' + esc(p.nama || '') + '"></div><div class="field"><label>Gelar</label><input class="input" name="gelar" value="' + esc(p.gelar || '') + '"></div><div class="field"><label>Jabatan</label><input class="input" name="jabatan" value="' + esc(p.jabatan || '') + '"></div><div class="field"><label>NIP / No. Induk</label><input class="input mono" name="nip" value="' + esc(p.nip || '') + '"></div>' +
    '<div class="field full"><label>Email Google (untuk login & persetujuan)</label><input class="input" name="email" value="' + esc(p.email || '') + '"></div><div class="field"><label>Masa jabatan mulai</label><input class="input" type="date" name="mulai" value="' + esc(p.mulai || '') + '"></div><div class="field"><label>Selesai</label><input class="input" type="date" name="selesai" value="' + esc(p.selesai || '') + '"></div>' +
    '<div class="field full"><label>Spesimen TTD (PNG transparan, opsional)</label><input type="file" id="pjSp" accept="image/png"></div><label class="check full"><input type="checkbox" name="aktif"' + (p.aktif ? ' checked' : '') + '>Aktif</label></div>',
    foot: [{ label: 'Batal', close: true }, { label: 'Simpan', cls: 'btn-primary', act: async function (m) { var v = formVals(m.el); v.id = p.id; var f = $('#pjSp', m.el).files[0]; if (f) v.spesimen = await fileToB64(f, 2); var r = await api('de.pejabatSave', v); toast(r.message, r.success ? 'ok' : 'bad'); if (r.success) { muatPj(el); cacheBust(['deTpl']); } return r.success; } }] });
}
function muatMassal(el) {
  muatTplData(el);
  api('de.massalStatus', {}, { silent: true }).then(function (r) { $('#msProg', el).innerHTML = r.success && r.data.length ? r.data.map(function (b) { var pct = Math.round((b.selesai + b.gagal) / b.total * 100); return '<div class="mb-16"><div class="row between small"><b class="mono">' + esc(b.batch) + '</b><span>' + b.selesai + '/' + b.total + (b.gagal ? ' · <span class="bad-t">' + b.gagal + ' gagal</span>' : '') + '</span></div><div class="progress mt-8"><i style="width:' + pct + '%"></i></div></div>'; }).join('') : empty('Belum ada antrean massal.', 'layers'); });
}
async function jalanMassal(el, btn) {
  var d = { templateId: $('#msT', el).value };
  try { d.isianUmum = $('#msU', el).value ? JSON.parse($('#msU', el).value) : {}; } catch (e) { return toast('Isian umum harus JSON valid.', 'bad'); }
  if ($('#msSrc', el).value === 'karyawan') d.idKaryawan = Array.prototype.slice.call($('#msK', el).selectedOptions).map(function (o) { return o.value; });
  else { var f = $('#msF', el).files[0]; if (!f) return toast('Pilih berkas Excel.', 'warn'); await loadXLSX(); var wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); d.rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false }).map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k.trim().toUpperCase()] = r[k]; }); return Object.assign(o, d.isianUmum); }); }
  if (!(d.idKaryawan || d.rows || []).length) return toast('Tidak ada data dipilih.', 'warn');
  var r = await aksi(btn, 'de.massal', d); if (r.success) muatMassal(el);
}

/* ============================================================ PENGATURAN (Super Admin) */
registerPage('pengaturan', {
  auth: 'sa', title: 'Pengaturan', menu: 'pengaturan',
  template: function () {
    return '<div class="card mb-16"><div class="card-b">' + pageHead({ crumbs: ['Beranda', 'Pengaturan Sistem & Tata Kelola Database'], title: 'Pengaturan Sistem & Tata Kelola Database', sub: '<span class="tag navy">' + ic('lock', 'ic-sm') + ' Hanya Super Admin</span> Konfigurasi global, modul absensi, integrasi template, notifikasi, pencadangan tahunan, dan migrasi data dari aplikasi lama.' }) + '</div></div>' +
      '<div class="grid g-main-l" style="grid-template-columns:260px minmax(0,1fr)"><div class="stack"><div class="card"><div class="card-b" style="padding:10px"><div class="ov" style="padding:6px 8px">Direktori Tata Kelola</div>' +
      [['umum', 'sliders-horizontal', 'Umum & Payroll'], ['akses', 'user-cog', 'Akses & Peran Admin'], ['backup', 'archive-restore', 'Backup & Refresh Tahunan'], ['migrasi', 'database-zap', 'Migrasi Data (Import)'], ['reset', 'trash-2', 'Hapus Data Dummy'], ['log', 'scroll-text', 'Audit Log Aktivitas'], ['sistem', 'server', 'Info Sistem']].map(function (x, i) { return '<a class="sb-item ' + (i ? '' : 'active') + '" data-sec="' + x[0] + '">' + ic(x[1]) + x[2] + '</a>'; }).join('') +
      '<a class="sb-item" href="#/absensi-admin">' + ic('map-pin') + 'Modul & Geofence →</a><a class="sb-item" href="#/template">' + ic('file-text') + 'Template Dokumen →</a><a class="sb-item" href="#/notifikasi/konfig">' + ic('bell') + 'Notifikasi WA & Email →</a></div></div>' +
      '<div class="card tint"><div class="card-b small">' + ic('shield-check', 'blue-t') + ' Sesi admin: <b>' + esc(App.boot.me.nama) + '</b>. Setiap perubahan dicatat permanen di sheet <span class="mono">Log_Aktivitas</span>.</div></div></div><div id="pgBody"></div></div>';
  },
  init: function (el) { $$('[data-sec]', el).forEach(function (a) { a.onclick = function () { $$('[data-sec]', el).forEach(function (x) { x.classList.toggle('active', x === a); }); secPengaturan(el, a.dataset.sec); }; }); },
  show: function (el) { secPengaturan(el, ($('[data-sec].active', el) || {}).dataset ? $('[data-sec].active', el).dataset.sec : 'umum'); }
});
var PG = { sec: '' };
/** v2.1: render bagian Pengaturan dari cache dulu (instan), lalu segarkan; abaikan bila pengguna sudah pindah bagian / sedang mengedit. */
function pgSwr(el, sec, key, action, data, gambar) {
  var b = $('#pgBody', el), diubah = false;
  return swr(key, action, data || {}, function (d) {
    if (PG.sec !== sec || diubah) return;
    gambar(d, b);
    b.oninput = b.onchange = function () { diubah = true; };
  }, { fresh: 30000, onError: function (r) { if (PG.sec === sec) b.innerHTML = empty(r.message); } });
}
async function secPengaturan(el, sec) {
  var b = $('#pgBody', el); PG.sec = sec; b.oninput = b.onchange = null; b.innerHTML = skel(6, 50);
  if (sec === 'akses') return secAkses(el, b);
  if (sec === 'reset') return secReset(el, b);
  if (sec === 'umum') return pgSwr(el, 'umum', 'settingsGet', 'settingsGet', {}, function (data, b) {
    var r = { data: data };
    var grup = { 'Identitas': ['NAMA_PERUSAHAAN', 'INSTITUSI_ALAMAT', 'HRD_EMAIL', 'HRD_WA', 'APP_URL', 'GOOGLE_CLIENT_ID', 'VERIFIKASI_URL'], 'Cuti & Payroll': ['KUOTA_CUTI_DEFAULT', 'PAYROLL_CUTOFF', 'HARI_KERJA_BULAN', 'POT_TERLAMBAT_PER_MENIT', 'BPJS_PERSEN', 'PPH21_METODE'] };
    var s = {}; r.data.nilai.forEach(function (x) { s[x.kunci] = x; });
    b.innerHTML = Object.keys(grup).map(function (g) { return '<div class="card mb-16"><div class="card-h"><h3>' + g + '</h3></div><div class="card-b fgrid">' + grup[g].map(function (k) { var x = s[k] || { nilai: '', ket: '' }; return '<div class="field ' + (/ALAMAT|CLIENT|URL/.test(k) ? 'full' : '') + '"><label class="mono small">' + k + '</label><input class="input" name="' + k + '" value="' + esc(x.nilai) + '"><span class="hint">' + esc(x.ket) + '</span></div>'; }).join('') + '</div></div>'; }).join('') +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-primary" id="pgSave">' + ic('save', 'ic-sm') + 'Simpan Semua Perubahan</button></div>';
    $('#pgSave', b).onclick = async function () { var rr = await aksi(this, 'settingsSave', { nilai: formVals(b) }); if (rr.success) { if (rr.data && rr.data.nilai) cacheSet('settingsGet', rr.data); Store.del('pub:karir'); refreshBoot(); } };
  });
  if (sec === 'backup') return pgSwr(el, 'backup', 'backupList', 'backupList', {}, function (d, b) {
    b.innerHTML = '<div class="card" style="border-left:3px solid var(--navy)"><div class="card-b row top gap-12"><span class="avatar navy" style="border-radius:6px">' + ic('shield') + '</span><div class="grow"><div class="row between"><b>Prosedur Siklus Tutup Buku & Refresh Database SIM HRD</b><span class="pill info">PROTOKOL US-16</span></div><p class="small muted" style="margin:4px 0 0">Seluruh tabel database Supabase diekspor menjadi Google Sheets di <span class="mono">/SIM_HRD_Storage/Backup_Tahunan/{Tahun}/</span>, lalu (opsional) sheet transaksional Absensi_QR & Absensi_Fingerprint dikosongkan untuk tahun yang dibackup. Master Karyawan, Payroll, dan KPI tidak disentuh.</p></div></div></div>' +
      '<div class="card mt-16"><div class="card-h"><h3>' + ic('archive-restore') + 'Konfigurasi Backup Tahunan Otomatis</h3>' + (d.otomatis ? '<span class="pill info dot">Trigger harian 23:00 aktif</span>' : '<span class="pill">Otomatis nonaktif</span>') + '</div><div class="card-b col gap-12"><div class="grid g-2"><div class="field"><label>Jadwal (MM-dd, dijalankan ±23:00)</label><input class="input mono" name="BACKUP_TANGGAL" value="' + esc(d.jadwal) + '"></div><div class="field"><label>Folder Tujuan</label><a class="input" style="display:flex;align-items:center" target="_blank" rel="noopener" href="' + esc(d.folder) + '">/SIM_HRD_Storage/Backup_Tahunan/ ' + ic('external-link', 'ic-sm') + '</a></div></div>' +
      '<label class="opt row between"><b>Backup otomatis tahunan</b><span class="switch"><input type="checkbox" name="BACKUP_OTOMATIS"' + (d.otomatis ? ' checked' : '') + '><span></span></span></label>' +
      '<div class="ov">Kebijakan Refresh & Retensi Pasca-Pencadangan</div><label class="opt check"><input type="checkbox" name="RESET_ABSENSI"' + (d.opsi.absensi ? ' checked' : '') + '><span><b>Reset sheet transaksional Absensi_QR & Absensi_Fingerprint</b><div class="small muted">Data s/d 31 Des tahun backup dihapus dari sheet aktif (tetap ada di berkas backup).</div></span></label>' +
      '<label class="opt check"><input type="checkbox" name="RESET_CUTI"' + (d.opsi.cuti ? ' checked' : '') + '><span><b>Arsipkan pengajuan cuti yang sudah diputuskan</b><div class="small muted">Saldo cuti tahun baru otomatis kembali ke kuota (dihitung per tahun).</div></span></label>' +
      '<label class="opt check"><input type="checkbox" name="HAPUS_LEADS_LAMA"' + (d.opsi.leads ? ' checked' : '') + '><span><b>Anonimkan leads pelamar berusia &gt; 12 bulan (UU PDP)</b><div class="small muted">Nama/email/WA dikosongkan dan CV dipindah ke sampah Drive.</div></span></label>' +
      '<label class="opt check" style="opacity:.7"><input type="checkbox" checked disabled><span><b>Pertahankan Master Karyawan, Riwayat Payroll, dan KPI</b> <span class="chip">WAJIB AKTIF</span></span></label><div class="row" style="justify-content:flex-end"><button class="btn btn-sec" id="bkSave">' + ic('save', 'ic-sm') + 'Simpan Kebijakan</button></div>' +
      '<div class="card tint"><div class="card-b row between wrap"><div class="row gap-12"><span class="avatar" style="border-radius:6px;background:#fff">' + ic('rocket') + '</span><div><b>Pemicu Backup Manual (On-Demand)</b> <span class="pill bad">Tindakan Operasional</span><div class="small muted">Salin database sekarang; berkas diberi stempel waktu. Refresh opsional.</div></div></div><button class="btn btn-primary" id="bkRun">' + ic('circle-play', 'ic-sm') + 'Eksekusi Backup Database Manual Sekarang</button></div></div></div></div>' +
      '<div class="card mt-16"><div class="card-h"><div><h3>Riwayat Log Backup Tahunan</h3><p class="sub">Disinkronkan dari sheet Log_Backup — berkas backup read-only untuk audit</p></div><span class="chip mono">Total Arsip: ' + d.rows.length + '</span></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahun Arsip & Berkas</th><th>Tanggal Eksekusi</th><th class="n">Ukuran</th><th>Status</th><th>Catatan</th><th></th></tr></thead><tbody>' +
      (d.rows.length ? d.rows.map(function (x) { return '<tr><td><b>Tahun ' + esc(x.Tahun) + '</b><span class="t2 mono">SIM_HRD_Backup_' + esc(x.Tahun) + '</span></td><td class="mono small">' + tglJam(x.Tgl_Backup) + '</td><td class="n mono">' + (num(x.Ukuran) / 1048576).toFixed(1) + ' MB</td><td>' + pill(x.Status === 'Sukses' ? 'Valid' : 'Gagal', x.Status) + '</td><td class="small">' + esc(x.Catatan) + '<span class="t2">oleh ' + esc(x.Oleh) + '</span></td><td><a class="btn btn-sec btn-xs" target="_blank" rel="noopener" href="' + esc(x.Link_File_Backup) + '">Buka di Drive</a></td></tr>'; }).join('') : '<tr><td colspan="6">' + empty('Belum ada backup.', 'archive') + '</td></tr>') + '</tbody></table></div></div></div>';
    $('#bkSave', b).onclick = async function () { var v = formVals(b); ['BACKUP_OTOMATIS', 'RESET_ABSENSI', 'RESET_CUTI', 'HAPUS_LEADS_LAMA'].forEach(function (k) { v[k] = v[k] ? 'YA' : 'TIDAK'; }); var rr = await aksi(this, 'settingsSave', { nilai: v, pasangTrigger: true }, { bust: ['backupList', 'settingsGet'] }); if (rr.success) secPengaturan(el, 'backup'); };
    $('#bkRun', b).onclick = function () {
      var btn = this;
      modal({ title: 'Eksekusi Backup Manual', body: '<div class="col gap-12"><div class="field"><label>Tahun arsip</label><input class="input mono" name="tahun" value="' + new Date().getFullYear() + '"></div><label class="check"><input type="checkbox" name="refresh"><span><b>Sekaligus refresh data transaksional</b> sesuai kebijakan (hapus absensi s/d 31 Des tahun tersebut). Gunakan saat tutup buku akhir tahun.</span></label><div class="note warn small">' + ic('triangle-alert', 'ic-sm') + '<div>Refresh tidak dapat dibatalkan dari aplikasi. Data tetap tersedia di berkas backup.</div></div></div>',
        foot: [{ label: 'Batal', close: true }, { label: 'Jalankan Backup', cls: 'btn-primary', act: async function (m) { var v = formVals(m.el); var rr = await api('backupRun', v); toast(rr.message, rr.success ? 'ok' : 'bad'); if (rr.success) { cacheBust('backupList'); secPengaturan(el, 'backup'); } return rr.success; } }] });
    };
  });
  if (sec === 'migrasi') paneMigrasi(el, b);
  if (sec === 'log') {
    b.innerHTML = '<div class="card"><div class="card-h"><div><h3>' + ic('scroll-text') + 'Audit Log Aktivitas</h3><p class="sub">300 kejadian terakhir (termasuk antrean yang belum di-flush)</p></div><div class="row"><input class="input" id="lgQ" placeholder="Filter aksi, mis. CUTI" style="height:34px;width:200px"><button class="btn btn-sec btn-sm" id="lgX">' + ic('download', 'ic-sm') + 'Export</button></div></div><div class="card-b flush" id="lgT"></div></div>';
    var t = Table($('#lgT', b), { key: 'ID', per: 25, unit: 'log', cols: [{ k: 'Waktu', label: 'Waktu', render: function (l) { return '<span class="mono small">' + tglJam(l.Waktu) + '</span>'; } }, { k: 'User', label: 'Pengguna', render: function (l) { return '<span class="small">' + esc(l.User) + '</span><span class="t2">' + esc(l.Role) + '</span>'; } }, { k: 'Aksi', label: 'Aksi', render: function (l) { return '<span class="chip mono">' + esc(l.Aksi) + '</span>'; } }, { k: 'Tabel', label: 'Tabel' }, { k: 'Detail', label: 'Detail', render: function (l) { return '<span class="small">' + esc(l.Detail) + '</span>'; } }] });
    swr('logList', 'logList', {}, function (rows) { if (PG.sec === 'log') t.set(rows); }, { fresh: 20000 });
    $('#lgQ', b).oninput = debounce(function () { t.search(this.value); }, 250);
    $('#lgX', b).onclick = function () { exportXlsx('Audit_Log_' + ymd(), { Log: t.view().map(function (l) { return { Waktu: l.Waktu, User: l.User, Role: l.Role, Aksi: l.Aksi, Tabel: l.Tabel, Detail: l.Detail }; }) }); };
  }
  if (sec === 'sistem') return pgSwr(el, 'sistem', 'systemInfo', 'systemInfo', {}, function (x, b) {
    b.innerHTML = '<div class="grid g-3">' + stat({ label: 'Versi Aplikasi', val: esc(x.versi), unit: 'skema v' + esc(x.skema) }) + stat({ label: 'Ukuran Database', val: (x.ukuranDb / 1048576).toFixed(1), unit: 'MB' }) + stat({ label: 'Sisa Kuota Email', val: x.kuotaEmail, unit: 'hari ini' }) + '</div>' +
      '<div class="card mt-16"><div class="card-b col"><div class="kvbox"><span>Database Supabase (Table Editor)</span><a target="_blank" rel="noopener" href="' + esc(x.spreadsheetUrl) + '">Buka ' + ic('external-link', 'ic-sm') + '</a></div><div class="kvbox"><span>Folder Drive SIM_HRD_Storage</span><a target="_blank" rel="noopener" href="' + esc(x.driveUrl) + '">Buka ' + ic('external-link', 'ic-sm') + '</a></div>' +
      '<div class="kvbox"><span>Trigger terpasang</span><span>' + (x.triggers.length ? x.triggers.map(function (t) { return '<span class="chip mono">' + esc(t) + '</span>'; }).join(' ') : '<span class="bad-t">Belum ada — jalankan pasangSemuaTrigger()</span>') + '</span></div>' +
      '<div class="kvbox"><span>Jumlah data</span><span class="small">' + x.jumlah.karyawan + ' karyawan · ' + x.jumlah.absensi + ' log absensi · ' + x.jumlah.kandidat + ' kandidat · ' + x.jumlah.leads + ' leads</span></div><div class="kvbox"><span>Performa klien</span><button class="btn btn-sec btn-xs" onclick="Perf.table();toast(\'Tabel performa ditampilkan di Console (F12).\')">Perf.table()</button></div></div></div>';
  });
}

/* ------------------------------------------------------------ v2.1: Akses & Peran Admin (Super Admin) */
function secAkses(el, b) {
  b.innerHTML = '<div class="card"><div class="card-h"><div><h3>' + ic('user-cog') + 'Akses & Peran Admin</h3><p class="sub">Tambah Super Admin / Admin (Staff HRD) baru, ubah peran, atau cabut akses. Login tetap memakai akun Google dengan email terdaftar.</p></div><button class="btn btn-primary" id="akTambah">' + ic('user-plus', 'ic-sm') + 'Tambah Admin</button></div>' +
    '<div class="card-b"><div class="grid g-3" id="akStat">' + skel(1, 90) + '</div></div><div class="card-b flush" id="akT"></div></div>' +
    '<div class="card tint mt-16"><div class="card-b small"><b>Perbedaan peran</b><ul style="margin:6px 0 0;padding-left:18px;display:grid;gap:4px"><li><b>Super Admin</b> — semua menu termasuk Pengaturan, Akses & Peran, Hapus Data, persetujuan final cuti/payroll.</li><li><b>Admin (Staff HRD)</b> — kelola karyawan, absensi, cuti (verifikasi awal), rekrutmen, arsip, notifikasi; tanpa menu Pengaturan.</li>' +
    '<li>Email yang <b>sudah terdaftar sebagai karyawan</b> cukup dinaikkan perannya. Email baru dibuat sebagai <b>Akun Admin</b> (tidak ikut absensi, payroll, & rekap).</li><li>Minimal harus selalu ada 1 Super Admin aktif; Anda tidak bisa menurunkan/mencabut akses diri sendiri.</li></ul></div></div>';
  var me = App.boot.me.email.toLowerCase();
  var t = Table($('#akT', b), { key: 'ID', per: 25, unit: 'akun admin', search: function (k) { return k.Nama + ' ' + k.Email + ' ' + k.NIK; }, cols: [
    { k: 'Nama', label: 'Nama & Email', render: function (k) { return userCell(k.Nama, k.Email, k.Email.toLowerCase() === me ? ' <span class="chip blue">Anda</span>' : ''); } },
    { k: 'Role', label: 'Peran', render: function (k) { return k.Role === ROLE.SA ? '<span class="pill solid-blue">Super Admin</span>' : '<span class="pill info">Admin (Staff HRD)</span>'; } },
    { k: 'akunAdmin', label: 'Jenis Akun', render: function (k) { return k.akunAdmin ? '<span class="chip">Akun Admin</span><span class="t2">tidak ikut absensi</span>' : '<span class="chip blue">Pegawai</span><span class="t2">' + esc(k.Jabatan || '-') + '</span>'; } },
    { k: 'Status', label: 'Status', render: function (k) { return pill(k.Status); } },
    { k: 'ID', label: 'Aksi', sort: false, cls: 'right', render: function (k) { if (k.Email.toLowerCase() === me) return '<span class="small muted">—</span>'; return '<div class="row" style="gap:6px;justify-content:flex-end"><button class="btn btn-sec btn-xs" data-ak="ubah">' + ic('key-round', 'ic-sm') + 'Ubah Peran</button><button class="btn btn-ghost btn-xs" data-ak="cabut">' + ic('user-x', 'ic-sm') + 'Cabut</button></div>'; } }] });
  function gambar(rows) {
    if (PG.sec !== 'akses') return;
    t.set(rows);
    var sa = rows.filter(function (k) { return k.Role === ROLE.SA && k.Status === 'Aktif'; }).length, st = rows.filter(function (k) { return k.Role === ROLE.STAFF && k.Status === 'Aktif'; }).length;
    $('#akStat', b).innerHTML = stat({ acc: 'blue', label: 'Super Admin Aktif', icon: 'shield-check', val: sa }) + stat({ label: 'Admin (Staff HRD) Aktif', icon: 'users', val: st }) + stat({ label: 'Akun Admin Non-Pegawai', icon: 'user-cog', val: rows.filter(function (k) { return k.akunAdmin; }).length });
  }
  function muat(force) { return swr('aksesList', 'aksesList', {}, gambar, { fresh: 20000, force: force }); }
  function selesai() { cacheBust(['aksesList', 'karyawanList', 'adminDashboard']); muat(true); }
  $('#akTambah', b).onclick = function () { formAkses(null, selesai); };
  $('#akT', b).addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-ak]'); if (!btn) return;
    var id = btn.closest('tr[data-id]').dataset.id, k = t.rows().filter(function (x) { return x.ID === id; })[0]; if (!k) return;
    if (btn.dataset.ak === 'ubah') return formAkses(k, selesai);
    if (!(await confirmBox('Cabut Akses Admin?', k.Nama + ' (' + k.Email + ') tidak lagi bisa membuka menu admin.' + (k.akunAdmin ? ' Karena ini Akun Admin (bukan pegawai), akunnya dinonaktifkan.' : ' Akunnya tetap aktif sebagai Karyawan biasa.'), 'Ya, cabut akses', true))) return;
    var r = await aksi(btn, 'aksesCabut', { id: k.ID }); if (r.success) selesai();
  });
  muat();
}
/** Modal tambah admin baru / ubah peran. */
function formAkses(k, done) {
  var kar = cacheGet('karyawanList') || [], baru = !k;
  modal({ title: baru ? 'Tambah Admin Baru' : 'Ubah Peran — ' + k.Nama, sub: baru ? 'Akun langsung bisa login dengan Google memakai email ini' : k.Email, size: 'sm',
    body: '<div class="col gap-12">' + (baru ? '<div class="field"><label>Email Google <span class="req">*</span></label><input class="input" name="email" type="email" placeholder="nama@gmail.com" autocomplete="off"><span class="hint" id="faH">Bisa email karyawan yang sudah ada (perannya dinaikkan) atau email baru.</span></div>' +
      '<div class="field" id="faNm"><label>Nama lengkap <span class="req">*</span></label><input class="input" name="nama" maxlength="80"></div><div class="grid g-2" style="gap:10px" id="faX"><div class="field"><label>Jabatan</label><input class="input" name="jabatan" value="Administrator"></div><div class="field"><label>No. WhatsApp</label><input class="input" name="wa" inputmode="tel" placeholder="08…"></div></div>' : '') +
      '<div class="field"><label>Peran <span class="req">*</span></label><div class="col" style="gap:8px">' +
      [[ROLE.SA, 'Super Admin', 'Akses penuh termasuk Pengaturan & Hapus Data'], [ROLE.STAFF, 'Admin (Staff HRD)', 'Kelola operasional HR tanpa menu Pengaturan']].map(function (x) { return '<label class="opt check"><input type="radio" name="role" value="' + x[0] + '"' + ((k ? k.Role : ROLE.STAFF) === x[0] ? ' checked' : '') + '><span><b>' + x[1] + '</b><div class="small muted">' + x[2] + '</div></span></label>'; }).join('') + '</div></div></div>',
    foot: [{ label: 'Batal', close: true }, { label: baru ? 'Tambah Admin' : 'Simpan Peran', cls: 'btn-primary', act: async function (m) {
      var v = formVals(m.el);
      if (baru) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email || '')) { toast('Email tidak valid.', 'warn'); return false; } }
      else v.email = k.Email;
      if (!v.role) { toast('Pilih peran.', 'warn'); return false; }
      var r = await api('aksesSimpan', v);
      if (!r.success) { toast(r.message, 'bad'); return false; }
      toast(r.message, 'ok'); done();
    } }],
    onOpen: function (mel) {
      var em = $('[name=email]', mel); if (!em) return;
      em.oninput = debounce(function () {
        var e = em.value.trim().toLowerCase(), ada = kar.filter(function (x) { return String(x.Email).toLowerCase() === e; })[0];
        $('#faNm', mel).hidden = !!ada; $('#faX', mel).hidden = !!ada;
        $('#faH', mel).innerHTML = ada ? '<span class="ok-t">Terdaftar: <b>' + esc(ada.Nama) + '</b> (' + esc(ada.Jabatan || ada.Divisi || '-') + ') — perannya akan diubah.</span>' : 'Email baru → dibuat sebagai Akun Admin (tidak ikut absensi & payroll).';
      }, 250);
    } });
}

/* ------------------------------------------------------------ v2.1: Hapus Data Dummy (siap produksi) */
var GRUP_HAPUS = [['absensi', 'Absensi', 'Log QR, selfie & fingerprint'], ['cuti', 'Cuti & Izin', 'Semua pengajuan cuti/izin'], ['payroll', 'Payroll', 'Slip & riwayat gaji'], ['kpi', 'KPI', 'Nilai KPI / performa'],
  ['dokumen', 'Dokumen Arsip', 'Dokumen unggahan karyawan'], ['rekrutmen', 'Rekrutmen', 'Lowongan, kandidat & leads'], ['komunikasi', 'Komunikasi & CRM', 'Antrean notifikasi, blast WA, kontak CRM'],
  ['surat', 'Surat / Dokumen Engine', 'Dokumen terbit, persetujuan, antrean, penomoran'], ['log', 'Log', 'Audit log aktivitas & log backup']];
function secReset(el, b) {
  b.innerHTML = '<div class="card" style="border-left:3px solid var(--bad, #DC2626)"><div class="card-b row top gap-12"><span class="avatar" style="border-radius:6px;background:var(--bad-bg);color:var(--bad)">' + ic('trash-2') + '</span><div class="grow"><b>Hapus Data Dummy — Siapkan Aplikasi untuk Dipakai</b><p class="small muted" style="margin:4px 0 0">Kosongkan data contoh/uji coba sebelum aplikasi dipakai sungguhan. <b>Selalu dipertahankan:</b> Pengaturan Sistem, Template Dokumen, Pejabat Penandatangan, dan akun Anda sendiri. Tindakan ini <b>tidak dapat dibatalkan</b> — jalankan Backup terlebih dahulu bila ragu.</p></div></div></div>' +
    '<div class="card mt-16"><div class="card-h"><div><h3>1. Pilih data transaksi yang dihapus</h3><p class="sub">Angka = jumlah baris saat ini</p></div><div class="row" style="gap:6px"><button class="btn btn-ghost btn-xs" id="rsAll">Pilih semua</button><button class="btn btn-ghost btn-xs" id="rsNone">Kosongkan</button></div></div><div class="card-b"><div class="reset-grup">' +
    GRUP_HAPUS.map(function (g) { return '<label><input type="checkbox" name="g_' + g[0] + '" checked><span class="grow"><b>' + g[1] + '</b> <span class="chip mono" data-n="' + g[0] + '">…</span><div class="small muted">' + g[2] + '</div></span></label>'; }).join('') + '</div></div></div>' +
    '<div class="card mt-16"><div class="card-h"><div><h3>2. Data karyawan</h3><p class="sub" id="rsKar">Memuat jumlah…</p></div></div><div class="card-b col" style="gap:8px">' +
    [['tidak', 'Pertahankan semua karyawan', 'Hanya data transaksi di atas yang dihapus'], ['nonadmin', 'Hapus karyawan dummy (peran Karyawan)', 'Super Admin & Admin tetap ada — disarankan sebelum import karyawan asli'], ['semua', 'Hapus semua akun kecuali akun saya', 'Termasuk admin lain; hanya Anda yang tersisa']].map(function (x, i) { return '<label class="opt check"><input type="radio" name="karyawan" value="' + x[0] + '"' + (i === 1 ? ' checked' : '') + '><span><b>' + x[1] + '</b><div class="small muted">' + x[2] + '</div></span></label>'; }).join('') + '</div></div>' +
    '<div class="card mt-16"><div class="card-h"><h3>3. Opsi tambahan</h3></div><div class="card-b col" style="gap:8px"><label class="opt check"><input type="checkbox" name="resetNomor" checked><span><b>Reset penomoran ID</b><div class="small muted">ID baru mulai lagi dari 1 (mis. CUT-0001) untuk tabel yang dikosongkan.</div></span></label>' +
    '<label class="opt check"><input type="checkbox" name="hapusBerkas"><span><b>Pindahkan berkas Drive terkait ke Sampah</b><div class="small muted">Selfie, lampiran cuti, dokumen arsip, CV, PDF slip/surat milik data yang dihapus (bisa dipulihkan dari Sampah Drive 30 hari).</div></span></label></div>' +
    '<div class="card-b" style="border-top:1px solid var(--line)"><div class="field"><label>Ketik <b class="mono">HAPUS DATA</b> untuk konfirmasi</label><input class="input mono" name="konfirmasi" autocomplete="off" placeholder="HAPUS DATA"></div></div>' +
    '<div class="card-f"><span class="small muted" id="rsRing"></span><button class="btn btn-danger" id="rsGo" disabled>' + ic('trash-2', 'ic-sm') + 'Hapus Data Sekarang</button></div></div><div id="rsHasil" class="mt-16"></div>';
  var go = $('#rsGo', b), info = null;
  function ringkas() {
    var v = formVals(b), g = GRUP_HAPUS.filter(function (x) { return v['g_' + x[0]]; });
    var n = info ? g.reduce(function (s, x) { return s + (info.grup[x[0]] || 0); }, 0) : null;
    $('#rsRing', b).textContent = g.length + ' kelompok dipilih' + (n != null ? ' · ±' + n.toLocaleString('id-ID') + ' baris' : '') + (v.karyawan !== 'tidak' && info ? ' + ' + (v.karyawan === 'semua' ? info.karyawan.total - 1 : info.karyawan.pegawai) + ' akun karyawan' : '');
    go.disabled = String(v.konfirmasi).trim().toUpperCase() !== 'HAPUS DATA' || (!g.length && v.karyawan === 'tidak');
  }
  b.addEventListener('input', ringkas); b.addEventListener('change', ringkas);
  $('#rsAll', b).onclick = function () { $$('[name^=g_]', b).forEach(function (c) { c.checked = true; }); ringkas(); };
  $('#rsNone', b).onclick = function () { $$('[name^=g_]', b).forEach(function (c) { c.checked = false; }); ringkas(); };
  api('resetInfo', {}, { silent: true }).then(function (r) {
    if (PG.sec !== 'reset' || !r.success) { if (PG.sec === 'reset') $('#rsKar', b).textContent = 'Jumlah data tidak dapat dimuat.'; return; }
    info = r.data;
    GRUP_HAPUS.forEach(function (g) { var c = $('[data-n="' + g[0] + '"]', b); if (c) c.textContent = (info.grup[g[0]] || 0).toLocaleString('id-ID'); });
    $('#rsKar', b).textContent = info.karyawan.total + ' akun: ' + info.karyawan.pegawai + ' berperan Karyawan, ' + info.karyawan.admin + ' Super Admin/Admin.';
    ringkas();
  });
  ringkas();
  go.onclick = async function () {
    var v = formVals(b), d = { grup: GRUP_HAPUS.filter(function (x) { return v['g_' + x[0]]; }).map(function (x) { return x[0]; }), karyawan: v.karyawan, resetNomor: !!v.resetNomor, hapusBerkas: !!v.hapusBerkas, konfirmasi: v.konfirmasi };
    if (!(await confirmBox('Yakin hapus data?', 'Data yang dipilih akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.', 'Ya, hapus permanen', true))) return;
    var r = await aksi(go, 'resetData', d);
    if (!r.success) return;
    var L = r.data.laporan || {};
    $('#rsHasil', b).innerHTML = '<div class="card"><div class="card-h"><h3>' + ic('circle-check', 'ok-t') + 'Hasil Penghapusan</h3>' + pill('Selesai', r.data.total + ' baris') + '</div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tabel</th><th class="n">Baris dihapus</th></tr></thead><tbody>' +
      Object.keys(L).map(function (t) { return '<tr><td class="mono">' + esc(t) + '</td><td class="n">' + L[t] + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card-b small">' + (r.data.berkas ? r.data.berkas + ' berkas dipindah ke Sampah Drive. ' : '') + 'Langkah berikutnya: import / tambah karyawan asli di menu <a href="#/karyawan">Karyawan</a>, atur titik kantor di <a href="#/absensi-admin">Absensi → Konfigurasi</a>.</div></div>';
    $('[name=konfirmasi]', b).value = '';
    var sess = Store.get('sess', null); Store.clearUser(); if (sess) Store.set('sess', sess);
    App._pref = 0; refreshBoot();
    secResetInfo();
    function secResetInfo() { api('resetInfo', {}, { silent: true }).then(function (x) { if (!x.success || PG.sec !== 'reset') return; info = x.data; GRUP_HAPUS.forEach(function (g) { var c = $('[data-n="' + g[0] + '"]', b); if (c) c.textContent = (info.grup[g[0]] || 0).toLocaleString('id-ID'); }); $('#rsKar', b).textContent = info.karyawan.total + ' akun: ' + info.karyawan.pegawai + ' berperan Karyawan, ' + info.karyawan.admin + ' Super Admin/Admin.'; ringkas(); }); }
  };
}
function paneMigrasi(el, b) {
  var st = { info: null, pasangan: [] };
  b.innerHTML = '<div class="card"><div class="card-h"><div><h3>' + ic('database-zap') + 'Import Data dari App / Spreadsheet Lama</h3><p class="sub">App lama <b>hanya dibaca</b> — tidak ada yang diubah. Aman diulang (upsert kunci alami), dry-run dulu, lalu delta sync tepat sebelum pindah.</p></div></div><div class="card-b col gap-12">' +
    '<div class="field"><label>URL / ID spreadsheet app lama</label><div class="row"><input class="input" id="mgSrc" placeholder="https://docs.google.com/spreadsheets/d/…"><button class="btn btn-sec" id="mgInfo">' + ic('scan-search', 'ic-sm') + 'Baca Struktur</button></div><span class="hint">Harus bisa dibuka akun Google pemilik skrip ini (sebaiknya akun yang sama agar ID berkas Drive lama tetap valid).</span></div><div id="mgSheets"></div></div></div><div id="mgHasil" class="mt-16"></div>' +
    '<div class="card tint mt-16"><div class="card-b small"><b>Checklist cutover</b><ol style="margin:6px 0 0;padding-left:18px;display:grid;gap:4px"><li>Pasang app baru → Baca Struktur → Pindai (dry-run) → Jalankan Import.</li><li>Cek Master Karyawan, absensi, dan uji login 1 akun karyawan.</li><li>Tepat sebelum pindah: jalankan Import sekali lagi (delta sync).</li><li>Umumkan alamat baru (blast WA). Sesi lama tidak ikut pindah — pengguna cukup login ulang dengan Google.</li></ol></div></div>';
  $('#mgInfo', b).onclick = async function () {
    var r = await withBusy(this, function () { return api('importInfo', { source: $('#mgSrc', b).value }); }); if (!r.success) return toast(r.message, 'bad');
    st.info = r.data;
    $('#mgSheets', b).innerHTML = '<div class="note ok">' + ic('file-spreadsheet') + '<div>Sumber: <b>' + esc(r.data.nama) + '</b> — ' + r.data.sheets.length + ' sheet. Pilih sheet & target (Karyawan diproses lebih dulu).</div></div><div class="tbl-wrap mt-12"><table class="tbl"><thead><tr><th>Impor?</th><th>Sheet Lama</th><th class="n">Baris</th><th>Target di SIM HRD</th><th>Pemetaan kolom (otomatis)</th></tr></thead><tbody>' +
      r.data.sheets.map(function (s, i) { return '<tr><td><input type="checkbox" data-mi="' + i + '"' + (s.saran && s.saran !== 'Log_Aktivitas' ? ' checked' : '') + '></td><td><b>' + esc(s.nama) + '</b></td><td class="n mono">' + s.baris + '</td><td><select class="select" data-mt="' + i + '" style="min-width:170px">' + selectOpts(r.data.target.map(function (t) { return t.nama; }), s.saran, '— pilih —') + '</select></td><td class="small" data-mp="' + i + '">' + petaTxt(s.peta) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="row wrap mt-12"><label class="check small"><input type="checkbox" id="mgTimpa"><span>Timpa kolom yang boleh diperbarui bila data sudah ada (default: tidak)</span></label><span class="grow"></span><button class="btn btn-sec" id="mgDry">' + ic('scan-search', 'ic-sm') + 'Pindai (Dry-run)</button><button class="btn btn-primary" id="mgRun">' + ic('database-zap', 'ic-sm') + 'Jalankan Import</button></div>';
    $('#mgDry', b).onclick = function () { jalan(true, this); };
    $('#mgRun', b).onclick = async function () { if (!await confirmBox('Jalankan import?', 'Data baru ditambahkan ke SIM HRD. Proses aman diulang (tidak menggandakan data).', 'Jalankan Import')) return; jalan(false, this); };
  };
  function petaTxt(p) { var k = Object.keys(p || {}); return k.length ? k.slice(0, 6).map(function (x) { return '<span class="chip">' + esc(p[x]) + ' → ' + x + '</span>'; }).join(' ') + (k.length > 6 ? ' +' + (k.length - 6) : '') : '<span class="muted">pilih target</span>'; }
  async function jalan(dry, btn) {
    var pas = $$('[data-mi]', b).filter(function (c) { return c.checked; }).map(function (c) { var i = +c.dataset.mi; return { sumber: st.info.sheets[i].nama, target: $('[data-mt="' + i + '"]', b).value }; }).filter(function (p) { return p.target; });
    if (!pas.length) return toast('Pilih minimal satu sheet & target.', 'warn');
    var r = await withBusy(btn, function () { return api('importData', { source: st.info.id, pasangan: pas, dryRun: dry, overwrite: $('#mgTimpa', b).checked }); });
    if (!r.success) return toast(r.message, 'bad');
    toast(r.message, 'ok');
    var L = r.data.laporan;
    $('#mgHasil', b).innerHTML = '<div class="card"><div class="card-h"><h3>' + (dry ? 'Hasil Pindai (Dry-run — belum ada yang ditulis)' : 'Hasil Import') + '</h3>' + pill(dry ? 'Menunggu' : 'Selesai', dry ? 'DRY-RUN' : 'SELESAI') + '</div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Dari sheet</th><th class="n">Di app lama</th><th class="n">Ditambah</th><th class="n">Diperbarui</th><th class="n">Dilewati</th></tr></thead><tbody>' +
      Object.keys(L).map(function (t) { var x = L[t]; return '<tr><td><b>' + esc(t) + '</b></td><td>' + esc(x.dariSheet) + '</td><td class="n">' + x.sumber + '</td><td class="n ok-t strong">' + x.ditambah + '</td><td class="n blue-t">' + x.diperbarui + '</td><td class="n muted">' + x.dilewati + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      (r.data.peringatan.length ? '<div class="card-b"><div class="ov mb-8 warn-t">Peringatan</div>' + r.data.peringatan.map(function (p) { return '<div class="note warn small mb-8">' + ic('triangle-alert', 'ic-sm') + '<div>' + esc(p) + '</div></div>'; }).join('') + '</div>' : '') + '</div>';
    if (!dry) cacheBust(['karyawanList', 'adminDashboard', 'leadsList', 'kandidatList']);
  }
}
