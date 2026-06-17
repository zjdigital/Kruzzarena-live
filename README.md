# KRUZZARENA Live Match Dashboard

Website static siap upload ke Vercel.

## Halaman

- `index.html` - login admin
- `admin.html` - kontrol jadwal pertandingan
- `viewer.html` - halaman live match untuk peserta/penonton

## Password Admin

Password awal: `12345`

Ubah di file `config.js`:

```js
adminPassword: "12345"
```

## Agar Admin dan Viewer Sinkron Antar Perangkat

Mode tanpa Firebase hanya cocok untuk tes di browser yang sama. Untuk event asli, gunakan Firebase Realtime Database.

Langkah ringkas:

1. Buka Firebase Console.
2. Buat project baru.
3. Masuk ke menu Realtime Database.
4. Buat database, pilih lokasi terdekat seperti Asia.
5. Masuk ke Project Settings, buat Web App.
6. Copy konfigurasi Firebase.
7. Tempel ke `config.js` pada bagian `firebase`.

Contoh:

```js
firebase: {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_PROJECT.firebaseapp.com",
  databaseURL: "https://ISI_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ISI_PROJECT",
  storageBucket: "ISI_PROJECT.appspot.com",
  messagingSenderId: "ISI_SENDER_ID",
  appId: "ISI_APP_ID"
}
```

## Upload ke Vercel

1. Masuk ke Vercel.
2. Buat project baru.
3. Upload folder ini atau sambungkan ke GitHub.
4. Framework preset pilih `Other`.
5. Build command kosongkan.
6. Output directory kosongkan atau isi `.`.
7. Deploy.

Setelah deploy:

- Admin: `/index.html`
- Viewer: `/viewer.html`

Untuk layar penonton, buka `viewer.html` dan tampilkan full screen.
