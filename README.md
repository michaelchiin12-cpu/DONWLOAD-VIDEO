# Batch Downloader TikTok

Tempel banyak link TikTok bernomor, video otomatis diunduh dan dinamai sesuai nomor (1.mp4, 2.mp4, ...).

## Format input

```
1. https://vt.tiktok.com/ZSp8MPYHd/
2. https://vt.tiktok.com/xxxxxxx/
```

## Jalankan lokal

```
npm install
npm run dev
```

Buka http://localhost:3000

## Deploy ke Vercel

1. Upload folder ini ke repo GitHub (tanpa node_modules dan .next).
2. Di Vercel: Add New > Project > pilih repo > Deploy. Tidak perlu environment variable.

## Cara kerja

- `/api/resolve` meminta alamat video ke layanan tikwm.com (biasanya tanpa watermark).
- `/api/file` meneruskan file video ke browser (hanya host yang diizinkan).
- Halaman memproses satu per satu dengan jeda 1,3 detik, mencoba ulang sekali bila gagal.
- Chrome/Edge: pilih folder, file langsung tersimpan di sana. Browser lain: diunduh satu per satu.

## Jika suatu saat gagal semua

Layanan pihak ketiga (tikwm.com) bisa berubah atau dibatasi. Ganti isi `app/api/resolve/route.js`
dengan layanan lain yang mengembalikan alamat video.
