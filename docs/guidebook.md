# BUKU PANDUAN PENGGUNAAN MARKIVO

**Platform Asisten Marketing Berbasis Generative AI untuk Manajemen dan Proses Desain Media Kampanye secara Terjadwal**

---

> **Instruksi untuk Claude:** Tolong buatkan dokumen buku panduan profesional dalam format yang rapi berdasarkan konten di bawah ini. Struktur setiap BAB dengan heading yang jelas, gunakan tabel dan bullet list yang sudah ada, tambahkan keterangan "[gambar]" sebagai placeholder screenshot di tempat yang sudah ditandai. Hasilkan dalam format Markdown yang bersih dan siap cetak.

---

## Daftar Isi

- BAB 1 : Pendahuluan
- BAB 2 : Halaman Login
- BAB 3 : Dasbor Utama
- BAB 4 : Manajemen Kampanye
- BAB 5 : Manajemen Klien dan Grup
- BAB 6 : Omnichannel Inbox
- BAB 7 : Design Editor
- BAB 8 : Analitik Kampanye
- BAB 9 : Integrasi Platform
- BAB 10 : Template WhatsApp
- BAB 11 : Panel Administrasi

---

## BAB 1 : Pendahuluan

Selamat datang di **Markivo**, platform manajemen kampanye pemasaran omnichannel berbasis kecerdasan buatan. Markivo dirancang untuk membantu tim pemasaran hotel dan bisnis perhotelan dalam membuat, menjadwalkan, dan mendistribusikan konten kampanye ke berbagai platform secara terpusat — mulai dari WhatsApp, Instagram, Facebook, hingga Email.

Buku panduan ini menjelaskan seluruh fungsi antarmuka pengguna yang tersedia di dalam platform Markivo beserta cara penggunaannya secara langkah demi langkah.

Platform Markivo dapat diakses melalui tautan berikut:

```
https://marketing-campaign-tools-final.vercel.app
```

### 1.1 Fitur Utama Markivo

| Fitur | Deskripsi |
|---|---|
| Campaign Manager | Buat dan kirim kampanye ke WhatsApp, Instagram, Facebook, dan Email sekaligus |
| Omnichannel Inbox | Terima dan balas pesan masuk dari semua platform dalam satu tampilan |
| Design Editor | Buat desain materi kampanye secara visual dengan bantuan AI |
| CRM | Kelola data klien dan grup penerima kampanye |
| Analitik | Pantau performa kampanye secara real-time |
| AI Caption & Image | Generate caption dan gambar otomatis menggunakan kecerdasan buatan |
| WA Templates | Kelola template pesan WhatsApp resmi yang disetujui Meta |

### 1.2 Peran Pengguna (Role)

Markivo menggunakan sistem multi-peran untuk mengatur hak akses setiap pengguna:

| Peran | Hak Akses |
|---|---|
| Super Admin | Mengelola seluruh organisasi dan pengguna di sistem |
| Admin | Mengelola anggota dan pengaturan organisasi |
| Operator | Akses penuh ke semua fitur kampanye, CRM, dan inbox |
| Marketer | Membuat kampanye, melihat analitik, dan mengelola inbox |
| Designer | Akses ke design editor dan manajemen proyek desain |

### 1.3 Kebutuhan Sistem

Markivo adalah aplikasi berbasis web yang dapat diakses menggunakan browser modern. Berikut adalah kebutuhan minimum untuk menjalankan platform ini:

| Komponen | Kebutuhan |
|---|---|
| Browser | Google Chrome 100+, Mozilla Firefox 100+, Microsoft Edge 100+, Safari 15+ |
| Koneksi Internet | Diperlukan (koneksi stabil minimal 5 Mbps untuk fitur AI) |
| Resolusi Layar | Minimal 1280 x 720 piksel |

---

## BAB 2 : Halaman Login

Halaman Login adalah tampilan pertama yang muncul saat pengguna mengakses Markivo. Pengguna diwajibkan untuk masuk menggunakan akun yang telah didaftarkan oleh administrator.

[gambar]

*Gambar 2.1 Halaman Login Markivo*

### 2.1 Cara Masuk ke Sistem

Berikut adalah langkah-langkah untuk masuk ke dalam sistem Markivo:

1. Buka tautan platform Markivo di browser
2. Masukkan **Email** yang telah terdaftar pada kolom yang tersedia
3. Masukkan **Password** akun Anda
4. Klik tombol **Sign In**
5. Sistem akan mengarahkan Anda ke halaman dasbor sesuai peran yang dimiliki

### 2.2 Catatan

- Jika terjadi kesalahan saat login, pastikan email dan kata sandi yang dimasukkan sudah benar
- Akun baru hanya dapat dibuat oleh Super Admin atau Admin melalui Panel Administrasi
- Apabila lupa kata sandi, hubungi administrator sistem Anda

---

## BAB 3 : Dasbor Utama

Setelah berhasil login, pengguna akan diarahkan ke Dasbor Utama. Halaman ini menampilkan ringkasan aktivitas dan navigasi menuju seluruh fitur platform.

[gambar]

*Gambar 3.1 Dasbor Utama Markivo*

### 3.1 Menu Navigasi Sidebar

Di sisi kiri layar terdapat menu navigasi utama yang dapat digunakan untuk berpindah antar halaman. Sidebar dapat diciutkan (collapse) dengan menekan ikon toggle di bagian atas untuk memberikan ruang tampilan yang lebih luas.

[gambar]

*Gambar 3.2 Menu Navigasi Sidebar*

Menu navigasi terdiri dari beberapa bagian sesuai peran pengguna:

**Bagian Global:**
- **Dashboard** — Kembali ke halaman utama

**Bagian Campaign:**
- **Broadcast** — Membuat dan mengelola kampanye
- **Campaign Designs** — Melihat desain kampanye
- **WA Templates** — Mengelola template WhatsApp
- **Insight** — Melihat analitik performa

**Bagian CRM:**
- **Clients** — Mengelola data klien
- **Groups** — Mengelola grup penerima
- **Users** — Mengelola pengguna organisasi

**Bagian Desain:**
- **Design Dashboard** — Dasbor desain
- **Projects** — Proyek desain
- **Templates** — Template desain

**Bagian Platform:**
- **WhatsApp** — Konfigurasi WhatsApp Cloud API
- **Meta (IG & Messenger)** — Konfigurasi Instagram dan Messenger
- **Resend (Email)** — Konfigurasi layanan email

### 3.2 Header Halaman

Di bagian atas halaman terdapat header yang menampilkan:
- Tombol toggle untuk membuka/menutup sidebar
- Badge peran pengguna yang sedang aktif
- Tombol profil untuk mengakses pengaturan akun dan logout

[gambar]

*Gambar 3.3 Header Dasbor*

---

## BAB 4 : Manajemen Kampanye

Halaman Campaign Manager (Broadcast) adalah fitur inti Markivo. Di sini pengguna dapat membuat kampanye baru dan mendistribusikannya ke berbagai platform sekaligus.

[gambar]

*Gambar 4.1 Halaman Campaign Manager*

### 4.1 Membuat Kampanye Baru

Klik tombol **+ New Campaign** untuk membuka formulir pembuatan kampanye.

[gambar]

*Gambar 4.2 Formulir Pembuatan Kampanye Baru*

Formulir kampanye terdiri dari beberapa bagian:

**A. Informasi Dasar**
- **Judul Kampanye** — Nama kampanye (wajib diisi)
- **Konten/Caption** — Isi pesan atau caption utama kampanye
- **Upload Media** — Unggah gambar atau video untuk kampanye

**B. Pilihan Platform**

Pilih satu atau lebih platform tujuan pengiriman kampanye:

| Platform | Deskripsi |
|---|---|
| WhatsApp | Kirim pesan ke nomor HP klien melalui WhatsApp Cloud API |
| Instagram | Publikasikan postingan ke feed Instagram Business |
| Facebook | Publikasikan postingan ke Facebook Page |
| Email | Kirim email ke alamat email klien |

**C. Penerima Kampanye**
- Pilih **Grup** dari daftar grup klien yang tersedia
- Atau masukkan penerima secara manual

**D. Jadwal Pengiriman**
- **Kirim Sekarang** — Kampanye langsung dikirim setelah dikonfirmasi
- **Jadwalkan** — Tentukan tanggal dan waktu pengiriman yang diinginkan

### 4.2 Fitur AI Caption Generator

Markivo dilengkapi dengan fitur pembuatan caption otomatis menggunakan kecerdasan buatan GPT-4o. Fitur ini dapat diakses dengan mengklik tombol **Generate with AI** pada formulir kampanye.

[gambar]

*Gambar 4.3 Fitur AI Caption Generator*

Cara menggunakan:

1. Unggah gambar kampanye terlebih dahulu
2. Klik tombol **Generate with AI**
3. Sistem akan menganalisis gambar dan menghasilkan judul serta caption secara otomatis
4. Hasil dapat diedit sebelum digunakan

### 4.3 Pengaturan Per Platform

Setiap platform memiliki pengaturan tersendiri yang dapat dikonfigurasi secara terpisah:

**WhatsApp:**
- Pilih template pesan yang telah disetujui Meta
- Sistem otomatis mengisi variabel template dengan nama organisasi dan konten kampanye

**Instagram:**
- Pastikan gambar memiliki rasio aspek yang didukung: 1:1, 4:5, atau 1,91:1
- Caption Instagram mendukung penggunaan tanda pagar (hashtag)

**Facebook:**
- Konten akan diposting ke Facebook Page yang telah terhubung

**Email:**
- Isi subjek email dan body pesan secara terpisah
- Mendukung format teks kaya (rich text)

### 4.4 Riwayat Kampanye

Seluruh kampanye yang pernah dibuat dapat dilihat pada halaman daftar kampanye. Status pengiriman setiap kampanye ditampilkan secara real-time.

[gambar]

*Gambar 4.4 Daftar Riwayat Kampanye*

| Status | Keterangan |
|---|---|
| Draft | Kampanye belum dikirim |
| Scheduled | Kampanye dijadwalkan untuk dikirim |
| Sent | Kampanye berhasil dikirim |
| Failed | Pengiriman gagal, periksa konfigurasi integrasi |

---

## BAB 5 : Manajemen Klien dan Grup

Halaman CRM (Customer Relationship Management) digunakan untuk mengelola data klien dan mengelompokkannya ke dalam grup sebagai target penerima kampanye.

### 5.1 Halaman Klien

[gambar]

*Gambar 5.1 Halaman Manajemen Klien*

Halaman Klien menampilkan seluruh data kontak klien yang terdaftar dalam organisasi.

**Menambah Klien Baru:**

1. Klik tombol **+ Add Client**
2. Isi data klien: Nama, Email, Nomor HP, Username Instagram, Username Facebook
3. Klik **Save** untuk menyimpan

**Pencarian dan Filter:**

Gunakan kolom pencarian di bagian atas untuk mencari klien berdasarkan nama atau nomor telepon.

**Mengedit dan Menghapus Klien:**

Klik ikon pada baris klien yang ingin diubah, lalu pilih **Edit** untuk mengubah data atau **Delete** untuk menghapus.

### 5.2 Halaman Grup

[gambar]

*Gambar 5.2 Halaman Manajemen Grup*

Grup digunakan untuk mengelompokkan klien sehingga kampanye dapat dikirim ke banyak penerima sekaligus secara efisien.

**Membuat Grup Baru:**

1. Klik tombol **+ New Group**
2. Masukkan nama dan deskripsi grup
3. Klik **Save**

**Menambahkan Klien ke Grup:**

1. Buka detail grup yang diinginkan dengan mengklik nama grup
2. Klik **Add Members**
3. Pilih satu atau lebih klien dari daftar yang tersedia
4. Klik **Confirm** untuk menyimpan

[gambar]

*Gambar 5.3 Menambahkan Anggota ke Grup*

---

## BAB 6 : Omnichannel Inbox

Halaman Inbox merupakan fitur pusat komunikasi dua arah. Semua pesan masuk dari pelanggan melalui WhatsApp, Instagram DM, dan Messenger Facebook ditampilkan di satu tempat dan dapat dibalas langsung dari platform ini tanpa perlu berpindah aplikasi.

[gambar]

*Gambar 6.1 Halaman Omnichannel Inbox*

### 6.1 Daftar Percakapan

Di sisi kiri halaman terdapat daftar seluruh percakapan aktif. Setiap percakapan menampilkan informasi berikut:

- Nama atau nomor pengirim pesan
- Ikon platform asal pesan (WhatsApp, Instagram, atau Messenger)
- Pratinjau pesan terakhir yang diterima
- Waktu pesan masuk
- Badge jumlah pesan yang belum dibaca

**Filter Percakapan:**

Gunakan dropdown filter di bagian atas untuk menyaring percakapan berdasarkan platform tertentu, misalnya hanya menampilkan percakapan dari WhatsApp saja.

### 6.2 Panel Percakapan

Di sisi kanan halaman ditampilkan isi percakapan yang sedang aktif. Riwayat pesan ditampilkan secara kronologis dari atas ke bawah.

[gambar]

*Gambar 6.2 Panel Isi Percakapan*

### 6.3 Membalas Pesan

Langkah-langkah untuk membalas pesan yang masuk:

1. Klik percakapan yang ingin dibalas dari daftar di sebelah kiri
2. Ketik pesan balasan pada kolom teks di bagian bawah layar
3. Untuk mengirim lampiran gambar, klik ikon klip dan pilih file dari komputer
4. Klik tombol **Send** atau tekan Enter pada keyboard untuk mengirim

### 6.4 Pembaruan Real-time

Inbox memperbarui daftar percakapan dan isi pesan secara otomatis tanpa perlu memuat ulang halaman. Notifikasi pesan baru akan muncul segera setelah pesan diterima dari platform manapun.

---

## BAB 7 : Design Editor

Design Editor adalah fitur editor visual berbasis kanvas yang memungkinkan pengguna membuat materi desain kampanye seperti poster, banner, dan konten media sosial langsung di dalam platform Markivo.

[gambar]

*Gambar 7.1 Halaman Design Editor*

### 7.1 Membuat Proyek Desain Baru

Langkah-langkah untuk membuat proyek desain baru:

1. Buka menu **Design Editor** atau **Projects** dari sidebar
2. Klik tombol **+ New Project**
3. Tentukan nama proyek dan ukuran kanvas yang diinginkan
4. Klik **Create** untuk membuka editor

### 7.2 Antarmuka Editor

[gambar]

*Gambar 7.2 Antarmuka Utama Design Editor*

Editor terdiri dari beberapa area kerja utama:

**A. Sidebar Kiri — Panel Elemen**

Berisi kumpulan elemen yang dapat ditambahkan ke kanvas:

- **Text** — Menambahkan teks dengan berbagai pilihan font (lebih dari 80 jenis font tersedia)
- **Image** — Mengunggah gambar dari komputer
- **Shape** — Menambahkan bentuk geometri (persegi, lingkaran, segitiga, dan lainnya)
- **AI Image** — Membuat gambar baru menggunakan kecerdasan buatan

**B. Kanvas Tengah**

Area kerja utama tempat elemen-elemen desain disusun. Elemen dapat dipindahkan dengan cara drag-and-drop, diubah ukurannya dengan menarik sudut elemen, serta dirotasi sesuai kebutuhan.

**C. Panel Kanan — Properties**

Menampilkan opsi pengaturan elemen yang sedang dipilih, seperti warna isian, ukuran font, tebal font, opacity, posisi X-Y, lebar, dan tinggi elemen.

### 7.3 Fitur AI Image Generator

Design Editor dilengkapi dengan fitur pembuatan gambar otomatis menggunakan model gpt-image-1 dari OpenAI.

[gambar]

*Gambar 7.3 Fitur AI Image Generator*

Cara menggunakan fitur AI Image Generator:

1. Klik menu **AI Image** pada sidebar kiri
2. Deskripsikan gambar yang ingin dibuat pada kolom teks deskripsi
3. Pilih pengaturan tambahan: gaya, palet warna, pencahayaan, suasana, dan rasio aspek
4. Klik tombol **Generate**
5. Gambar hasil AI akan otomatis muncul dan siap ditambahkan ke kanvas

Jika memiliki gambar referensi, pengguna dapat mengunggahnya agar AI menganalisis gaya gambar tersebut dan menghasilkan gambar baru dengan gaya yang serupa.

### 7.4 Menyimpan dan Mengekspor Desain

- **Save** — Menyimpan proyek ke sistem untuk dapat dilanjutkan di lain waktu
- **Download** — Mengunduh hasil desain dalam format PNG

### 7.5 Template Desain

Pengguna dapat mengakses koleksi template desain yang siap pakai melalui halaman **Templates**. Template dapat langsung digunakan sebagai dasar desain baru dan disesuaikan sesuai kebutuhan kampanye.

[gambar]

*Gambar 7.4 Halaman Template Desain*

---

## BAB 8 : Analitik Kampanye

Halaman Analitik (Insight) menampilkan data performa seluruh kampanye yang telah dikirimkan dalam bentuk grafik dan ringkasan statistik yang dapat disaring berdasarkan periode waktu.

[gambar]

*Gambar 8.1 Halaman Analitik Kampanye*

### 8.1 Ringkasan Performa

Di bagian atas halaman ditampilkan kartu metrik utama yang mencakup:

- Total jangkauan kampanye (reach)
- Total keterlibatan audiens (engagement)
- Total klik tautan (clicks)
- Jumlah konversi (conversions)

### 8.2 Statistik per Platform

**Email (Resend):**

| Metrik | Keterangan |
|---|---|
| Emails Sent | Total email yang dikirim |
| Delivery Rate | Persentase email yang berhasil diterima |
| Open Rate | Persentase email yang dibuka oleh penerima |
| Click-Through Rate | Persentase klik tautan dalam email |

[gambar]

*Gambar 8.2 Statistik Email*

**WhatsApp:**

| Metrik | Keterangan |
|---|---|
| Total Messages | Total pesan yang diproses |
| Sent | Jumlah pesan berhasil terkirim |
| In Progress | Pesan yang sedang dalam proses pengiriman |
| Failed | Pesan yang gagal terkirim |

[gambar]

*Gambar 8.3 Statistik WhatsApp*

**Meta (Instagram & Facebook):**

| Metrik | Keterangan |
|---|---|
| Total Posts | Total postingan yang dipublikasikan |
| Failed Posts | Postingan yang gagal dipublikasikan |

### 8.3 Filter Periode

Gunakan dropdown filter periode di bagian atas untuk menampilkan data dalam rentang waktu tertentu:

- 24 Jam Terakhir
- 7 Hari Terakhir
- 30 Hari Terakhir
- 3 Bulan Terakhir
- 6 Bulan Terakhir

### 8.4 Fitur AI Analytics Summary

Markivo menyediakan fitur ringkasan analitik berbasis kecerdasan buatan. Fitur ini menganalisis seluruh data performa dan menghasilkan wawasan strategis serta rekomendasi tindakan dalam bahasa yang mudah dipahami.

[gambar]

*Gambar 8.4 Fitur AI Analytics Summary*

Cara menggunakan fitur AI Analytics Summary:

1. Klik tombol **AI Summary** pada halaman Analitik
2. Sistem akan menganalisis data kampanye untuk periode yang sedang aktif
3. Ringkasan akan ditampilkan yang mencakup:
   - **Skor performa keseluruhan** (0–100) beserta label: Critical, Needs Work, Average, Good, atau Excellent
   - **Headline** — kalimat ringkas yang merangkum performa secara keseluruhan
   - **Executive Summary** — penjelasan 2-3 kalimat dengan angka spesifik
   - **Top Performers** — metrik dan kanal yang menunjukkan performa terbaik
   - **Concerns** — hal-hal yang perlu mendapat perhatian
   - **Recommendations** — 3 rekomendasi tindakan yang diprioritaskan berdasarkan dampak

---

## BAB 9 : Integrasi Platform

Halaman Integrasi digunakan untuk menghubungkan Markivo dengan platform eksternal sehingga fitur pengiriman kampanye dapat berfungsi. Integrasi hanya perlu dikonfigurasi sekali oleh Operator.

### 9.1 Integrasi WhatsApp

[gambar]

*Gambar 9.1 Halaman Integrasi WhatsApp*

Untuk mengaktifkan pengiriman kampanye via WhatsApp, lakukan langkah berikut:

1. Buka **Sidebar → WhatsApp** pada menu Platform
2. Masukkan **Phone Number ID** yang didapat dari Meta Developer Console
3. Masukkan **Access Token** WhatsApp Business API
4. Klik **Save**
5. Status integrasi akan berubah menjadi **Connected**

### 9.2 Integrasi Meta (Instagram & Messenger)

[gambar]

*Gambar 9.2 Halaman Integrasi Meta*

Integrasi Meta menghubungkan akun Instagram Business dan Facebook Page ke Markivo sehingga kampanye dapat dipublikasikan secara langsung.

Langkah konfigurasi:

1. Buka **Sidebar → Meta (IG & Messenger)** pada menu Platform
2. Masukkan **App ID** dan **App Secret** dari Meta Developer Console
3. Klik **Save**
4. Klik tombol **Connect via Meta**
5. Login dengan akun Facebook yang memiliki akses ke halaman Facebook dan akun Instagram bisnis
6. Setujui seluruh izin yang diminta oleh aplikasi
7. Setelah proses selesai, status akun Instagram dan Facebook Page akan tampil sebagai **Connected**

### 9.3 Integrasi Email (Resend)

[gambar]

*Gambar 9.3 Halaman Integrasi Email*

Untuk mengaktifkan pengiriman kampanye via email:

1. Buka **Sidebar → Resend (Email)** pada menu Platform
2. Masukkan **API Key** dari akun Resend
3. Masukkan **Alamat Email Pengirim** yang telah diverifikasi di akun Resend
4. Klik **Save**

---

## BAB 10 : Template WhatsApp

Halaman WA Templates digunakan untuk mengelola template pesan WhatsApp yang telah mendapat persetujuan resmi dari Meta. Template ini wajib digunakan saat mengirim pesan keluar (outbound) kepada pelanggan yang belum memulai percakapan dalam 24 jam terakhir.

[gambar]

*Gambar 10.1 Halaman WA Template Manager*

### 10.1 Melihat Daftar Template

Seluruh template yang telah dibuat beserta statusnya ditampilkan dalam bentuk tabel. Status template terdiri dari:

| Status | Keterangan |
|---|---|
| Approved | Template telah disetujui Meta dan siap digunakan dalam kampanye |
| Pending | Template sedang dalam proses peninjauan oleh Meta |
| Rejected | Template ditolak oleh Meta, perlu direvisi dan diajukan ulang |

### 10.2 Membuat Template Baru

Langkah-langkah membuat template WhatsApp baru:

1. Klik tombol **+ New Template**
2. Isi nama template, kategori pesan (Marketing, Utility, atau Authentication), dan bahasa yang digunakan
3. Tentukan jenis header: Teks, Gambar, atau Tanpa Header
4. Tulis isi pesan (body) dengan menggunakan variabel `{{1}}`, `{{2}}`, dan seterusnya untuk bagian yang akan diisi secara dinamis saat pengiriman
5. Tambahkan footer dan tombol aksi jika diperlukan
6. Klik **Submit** untuk mengirimkan template ke Meta guna ditinjau

[gambar]

*Gambar 10.2 Formulir Pembuatan Template WhatsApp*

### 10.3 Catatan Penggunaan Template

- Hanya template dengan status **Approved** yang dapat digunakan dalam kampanye WhatsApp
- Template dengan header bertipe **IMAGE** memerlukan unggahan media saat kampanye dikirim
- Pengiriman pesan di luar jendela percakapan 24 jam hanya dapat dilakukan menggunakan template yang telah disetujui Meta
- Nama template tidak dapat diubah setelah diajukan; buat template baru jika diperlukan perubahan nama

---

## BAB 11 : Panel Administrasi

Panel Administrasi hanya dapat diakses oleh pengguna dengan peran **Super Admin** atau **Admin**. Halaman ini digunakan untuk mengelola organisasi, pengguna, dan konfigurasi sistem secara keseluruhan.

### 11.1 Dasbor Admin

[gambar]

*Gambar 11.1 Dasbor Panel Administrasi*

Dasbor Admin menampilkan ringkasan seluruh organisasi yang terdaftar dalam sistem beserta statistik penggunaan masing-masing organisasi.

### 11.2 Manajemen Organisasi

Super Admin dapat membuat organisasi baru dan mengatur batasan jumlah pengguna per peran untuk setiap organisasi.

**Membuat Organisasi Baru:**

1. Klik tombol **+ New Organization**
2. Masukkan nama dan deskripsi organisasi
3. Tentukan batas jumlah pengguna: Operator, Designer, dan Marketer
4. Klik **Save** untuk menyimpan

[gambar]

*Gambar 11.2 Formulir Pembuatan Organisasi Baru*

### 11.3 Manajemen Pengguna

[gambar]

*Gambar 11.3 Halaman Manajemen Pengguna*

**Mengundang Pengguna Baru:**

1. Buka detail organisasi yang diinginkan
2. Klik tombol **Invite User**
3. Masukkan alamat email pengguna yang akan diundang
4. Pilih peran yang akan diberikan kepada pengguna tersebut
5. Klik **Send Invite**

Pengguna yang diundang akan menerima informasi akses dan dapat langsung login ke sistem menggunakan email yang didaftarkan.

**Mengubah Peran Pengguna:**

1. Klik ikon edit pada baris pengguna yang ingin diubah
2. Pilih peran baru dari daftar pilihan yang tersedia
3. Klik **Save** untuk menyimpan perubahan

**Menonaktifkan atau Menghapus Pengguna:**

Klik ikon hapus pada baris pengguna, lalu konfirmasi tindakan tersebut. Pengguna yang dihapus tidak dapat lagi mengakses organisasi yang bersangkutan.

---

## Penutup

Demikian buku panduan penggunaan platform Markivo. Panduan ini mencakup seluruh fitur utama yang tersedia mulai dari manajemen kampanye, pengelolaan klien, komunikasi omnichannel, desain konten berbantuan AI, analitik performa, hingga konfigurasi integrasi platform.

Apabila terdapat pertanyaan atau kendala teknis dalam penggunaan platform, silakan menghubungi administrator sistem Anda.

---

*© 2025 Markivo — Platform Asisten Marketing Berbasis Generative AI*

*Dikembangkan oleh Verindra Hernanda Putra*
