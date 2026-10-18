/**
 * ============================================================
 *  KONFIGURASI FRONTEND SIM HRD v2 — ISI SEBELUM DEPLOY
 * ============================================================
 *  SUPABASE_URL      : Supabase → Project Settings → Data API → Project URL
 *  SUPABASE_ANON_KEY : Supabase → Project Settings → API Keys → anon / public
 *                      (kunci ini AMAN berada di browser; data dilindungi RLS)
 *                      ⚠️ JANGAN PERNAH menaruh service_role key di sini.
 *  GAS_URL           : URL Web App Apps Script berakhiran /exec
 *                      (Apps Script → Deploy → Manage deployments → salin URL)
 *                      Dipakai untuk SEMUA penyimpanan data, unggah/unduh berkas
 *                      Google Drive, PDF slip & surat, email, dan WhatsApp.
 *  GOOGLE_CLIENT_ID  : OAuth Client ID Google (tombol "Masuk dengan Google").
 *                      Boleh dikosongkan bila sudah diisi di Pengaturan_Sistem
 *                      (kunci GOOGLE_CLIENT_ID).
 *  DEMO              : 'auto' = Mode Demo bila SUPABASE_URL kosong.
 *                      Tambahkan ?demo=1 di URL untuk memaksa Mode Demo.
 */
window.SIMHRD_CONFIG = {
  SUPABASE_URL: 'https://tlzhdhkcewyugkbhswgx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsemhkaGtjZXd5dWdrYmhzd2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjU3NTQsImV4cCI6MjEwNzg0MTc1NH0.bnGLjklr61dTSV5rKqQOq0qLHSulkXHLdW0ceWSM_98',
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwRuiJvuDLm7SXDNOSiRSt5W7tDWmBTrWqTwfL8w95hfNBd1r-j8fs0J29BLY-n2r6v/exec',            // ← TEMPEL URL /exec Apps Script di sini
  GOOGLE_CLIENT_ID: '814366104575-1ah3d5u67qnpq04dmoq4e2vgvr7m685p.apps.googleusercontent.com',   // ← contoh: '1234567890-abc123.apps.googleusercontent.com'
  NAMA_PERUSAHAAN: 'PT Solusi Enterprise Nusantara',
  DEMO: 'auto'
};
