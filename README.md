# Marketing Campaign Tools

Aplikasi manajemen kampanye pemasaran omnichannel berbasis web untuk hotel (Anggrek Hotel). Mendukung pengiriman kampanye via WhatsApp, Instagram, Facebook, dan Email, serta fitur Omnichannel Inbox untuk merespons pesan masuk dari pelanggan secara real-time.

> Dibangun sebagai proyek skripsi — Sistem Informasi, 2026.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Prasyarat](#prasyarat)
- [Instalasi & Setup](#instalasi--setup)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Database Migration](#database-migration)
- [Deploy Edge Functions](#deploy-edge-functions)
- [Konfigurasi Meta & WhatsApp](#konfigurasi-meta--whatsapp)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Struktur Proyek](#struktur-proyek)
- [Role & Akses](#role--akses)
- [Black Box Testing](#black-box-testing)

---

## Fitur Utama

| Modul | Fitur |
|---|---|
| **Campaign Manager** | Buat & kirim kampanye multi-platform (WA, IG, FB, Email) |
| **Omnichannel Inbox** | Terima & balas pesan WhatsApp, Instagram DM, Messenger |
| **Design Editor** | Editor desain berbasis Fabric.js dengan template |
| **CRM** | Manajemen klien, grup kontak, import/export |
| **Analytics** | Performa kampanye, email open rate, engagement |
| **WA Templates** | Kelola template WhatsApp Business API |
| **Integrations** | Hubungkan Meta (IG/FB/Messenger), WhatsApp Cloud API, Resend (Email) |
| **Multi-tenant** | Support banyak organisasi dengan role-based access |

---

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite 8
- Mantine UI v8
- React Router v7
- Recharts (grafik)
- Fabric.js (design editor)
- FullCalendar (scheduled posts)

**Backend (Serverless)**
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Supabase Edge Functions (Deno)

**Third-party APIs**
- Meta Graph API v19 (WhatsApp Cloud API, Instagram, Facebook, Messenger)
- Resend (transactional email)
- OpenAI (AI caption & image generation)

---

## Arsitektur Sistem

```
Browser (React + Vite)
    │
    ├── Supabase JS Client
    │       ├── Auth (JWT)
    │       ├── Database (PostgreSQL + RLS)
    │       ├── Storage (campaign-media, chat-media)
    │       └── Realtime (Inbox live updates)
    │
    └── Supabase Edge Functions (Deno)
            ├── send-whatsapp     → Meta WhatsApp Cloud API
            ├── send-social       → Meta Graph API (IG + FB)
            ├── send-email        → Resend API
            ├── send-chat-message → Meta API (reply inbox)
            ├── whatsapp-webhook  ← Menerima pesan WA masuk
            ├── meta-webhook      ← Menerima pesan IG/Messenger masuk
            ├── meta-oauth        → OAuth flow Meta
            ├── generate-caption  → OpenAI GPT
            └── generate-image    → OpenAI DALL-E
```

**Alur Campaign Sending:**
```
Submit Campaign → Upload media ke Storage → Insert ke outbox table
    → supabase.functions.invoke('send-whatsapp' / 'send-social')
    → Meta Graph API → Update status → Done
```

**Alur Inbox:**
```
Pesan masuk dari pelanggan (WA / IG / Messenger)
    → Meta kirim webhook → whatsapp-webhook / meta-webhook
    → Upsert conversations + insert messages
    → Realtime subscription → Tampil di Inbox UI
```

---

## Prasyarat

Pastikan sudah terinstall:
- **Node.js** v18+
- **npm** v9+
- **Supabase CLI** — `npm install -g supabase`
- Akun **Supabase** (supabase.com)
- Akun **Meta Developer** (developers.facebook.com) — Business App
- Akun **Resend** (resend.com) — untuk email
- Akun **OpenAI** (platform.openai.com) — untuk AI features

---

## Instalasi & Setup

### 1. Clone repository

```bash
git clone https://github.com/<username>/marketing-campaign-tools.git
cd marketing-campaign-tools
npm install
```

### 2. Buat Supabase project

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Catat **Project URL** dan **anon public key** dari Settings → API

### 3. Buat file environment

```bash
cp .env.example .env.local
```

Edit `.env.local` dengan nilai dari Supabase Dashboard → Settings → API:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> File `.env.local` sudah ada di `.gitignore` — jangan pernah commit file ini.

---

## Konfigurasi Environment

### Supabase Edge Function Secrets

Set via CLI atau Supabase Dashboard → Edge Functions → Manage secrets:

```bash
supabase secrets set META_VERIFY_TOKEN=marketing-tool-verify-token-123
supabase secrets set WHATSAPP_WEBHOOK_VERIFY_TOKEN=<token-bebas-tapi-catat>
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set OPENAI_API_KEY=sk-xxxxxxxxxxxx
supabase secrets set FRONTEND_URL=https://<domain-production>
supabase secrets set META_REDIRECT_URI=https://<domain-production>/integrations/meta-callback
```

| Secret | Sumber | Keterangan |
|---|---|---|
| `META_VERIFY_TOKEN` | Bebas (custom string) | Harus sama dengan isian di Meta webhook config |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Bebas (custom string) | Harus sama dengan isian di WA webhook config |
| `RESEND_API_KEY` | resend.com → API Keys | Untuk kirim email |
| `OPENAI_API_KEY` | platform.openai.com | Untuk AI caption & gambar |
| `FRONTEND_URL` | URL domain production | Untuk redirect setelah Meta OAuth |
| `META_REDIRECT_URI` | `FRONTEND_URL` + `/integrations/meta-callback` | Callback OAuth Meta |

---

## Database Migration

Login ke Supabase CLI, link project, lalu jalankan migrations:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Migrations otomatis membuat:
- Semua tabel (organizations, profiles, campaigns, conversations, dll.)
- Enum types (`app_role`)
- RLS policies untuk semua tabel
- Storage buckets `campaign-media` dan `chat-media`
- Storage RLS policies
- Realtime publication
- Database functions & triggers

> Tidak perlu setup manual di Supabase Dashboard.

---

## Deploy Edge Functions

```bash
# Functions yang dipanggil dari frontend (memerlukan JWT)
supabase functions deploy send-social
supabase functions deploy send-whatsapp
supabase functions deploy send-chat-message
supabase functions deploy meta-oauth
supabase functions deploy generate-caption
supabase functions deploy generate-image
supabase functions deploy send-email
supabase functions deploy analytics-overview
supabase functions deploy summarize-analytics
supabase functions deploy admin-create-user
supabase functions deploy disconnect-integration
supabase functions deploy create-wa-template
supabase functions deploy get-wa-config

# Webhook functions — WAJIB pakai --no-verify-jwt
# Meta memanggil endpoint ini langsung, bukan dari browser user
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy meta-webhook --no-verify-jwt
supabase functions deploy facebook-webhook --no-verify-jwt
```

---

## Konfigurasi Meta & WhatsApp

### A. Setup Meta App (Satu Kali)

1. Buka [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App → Business**
2. Tambahkan **Use Cases** berikut (Kasus Penggunaan → Tambahkan):
   - Berinteraksi dengan pelanggan di **Messenger from Meta**
   - Kelola pesan & konten di **Instagram**
   - Terhubung dengan pelanggan melalui **WhatsApp**
   - **Kelola Halaman** (untuk posting ke Facebook Page feed)

3. Aktifkan permissions di setiap use case → **Sesuaikan → Izin dan fitur**:

   | Use Case | Permission yang perlu diaktifkan |
   |---|---|
   | Kelola Halaman | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` |
   | Kelola pesan & konten di Instagram | `instagram_content_publish`, `instagram_basic`, `instagram_manage_messages` |
   | Messenger from Meta | `pages_messaging`, `pages_manage_metadata` |

   > Permission **tidak** ada di daftar global — harus masuk ke dalam setiap use case.

4. Di **Facebook Login for Business → Pengaturan → Valid OAuth Redirect URIs**, tambahkan:
   ```
   https://<domain>/integrations/meta-callback
   ```

### B. WhatsApp Webhook

Di **Meta Developer Console → WhatsApp → Configuration → Webhook**:

1. Callback URL: `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`
2. Verify Token: nilai `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Klik **Verify and Save**
4. Klik **Manage** → centang field **`messages`** → Subscribe

### C. Messenger Webhook

Di **Meta Developer Console → Kasus penggunaan → Messenger → Sesuaikan → Pengaturan Messenger API**:

1. Callback URL: `https://<project-ref>.supabase.co/functions/v1/meta-webhook`
2. Verify Token: nilai `META_VERIFY_TOKEN`
3. Klik **Verify and Save**
4. Pilih Facebook Page → klik **Subscribe**
5. Subscribe fields: `messages`, `messaging_postbacks`

> Langkah Subscribe page (poin 4) sering terlewat — tanpa ini, Meta tidak akan mengirim event Messenger ke function.

### D. Hubungkan dari App

1. Buka app → **Platform → Meta (IG & Messenger)**
2. Isi **App ID** dan **App Secret** → klik **Save**
3. Klik **Connect via Meta** → login Facebook → grant semua permissions
4. Setelah redirect kembali ke app, akun IG dan FB Page akan tersimpan

---

## Menjalankan Aplikasi

```bash
# Development
npm run dev
# Buka http://localhost:5173

# Build production
npm run build

# Preview build production
npm run preview
```

---

## Struktur Proyek

```
marketing-campaign-tools/
├── src/
│   ├── App.tsx
│   ├── AppRouter.tsx
│   ├── supabaseClient.ts
│   ├── auth/                  # Auth context, protected routes, role guard
│   ├── campaign/              # CampaignForm, flows (WA/IG/FB/Email)
│   ├── analytics/             # Chart components
│   ├── editor/                # Fabric.js design editor
│   ├── hooks/                 # useMetaAuth, useMetaAppId, dll.
│   ├── notifications/         # Toast system
│   ├── scheduled/             # Scheduled posts
│   ├── shared/                # Shared UI components
│   └── pages/
│       ├── admin/             # Admin dashboard & org management
│       ├── designer/          # Design dashboard, projects, templates
│       ├── marketer/          # Campaigns, Inbox, Integrations, CRM
│       ├── LoginPage.tsx
│       └── MetaOAuthCallback.tsx
│
├── supabase/
│   ├── migrations/            # Dijalankan dengan: supabase db push
│   └── functions/             # Edge Functions (Deno)
│       ├── send-whatsapp/
│       ├── send-social/
│       ├── send-email/
│       ├── send-chat-message/
│       ├── whatsapp-webhook/
│       ├── meta-webhook/
│       ├── meta-oauth/
│       ├── generate-caption/
│       ├── generate-image/
│       └── analytics-overview/
│
├── .env.example               # Template (aman dicommit)
├── .env.local                 # [GITIGNORED] Kredensial aktual
├── .gitignore
├── README.md
├── SETUP_GUIDE.md             # Panduan teknis lengkap & troubleshooting
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Role & Akses

| Role | Akses |
|---|---|
| **Admin** | Full access — kelola org, user, semua fitur |
| **Operator** | Kelola campaign, CRM, integrasi, inbox |
| **Marketer** | Buat campaign, lihat analytics, inbox |
| **Designer** | Design editor, projects, templates |

---

## Black Box Testing

Pengujian dilakukan dengan metode **equivalence partitioning** dan **boundary value analysis**.

---

### 1. Autentikasi

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| AUTH-01 | Login kredensial valid | Email & password terdaftar | Redirect ke Dashboard sesuai role |
| AUTH-02 | Login password salah | Email valid, password salah | Pesan error "Invalid login credentials" |
| AUTH-03 | Login email tidak terdaftar | Email tidak ada di sistem | Pesan error autentikasi |
| AUTH-04 | Login field kosong | Semua field kosong | Validasi error pada form |
| AUTH-05 | Akses halaman tanpa login | URL langsung tanpa session | Redirect ke halaman login |
| AUTH-06 | Akses halaman role lain | Marketer akses `/admin` | Redirect atau tampil forbidden |

---

### 2. Manajemen Klien & Grup (CRM)

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| CRM-01 | Tambah klien baru | Nama, email, nomor HP valid | Klien tersimpan, muncul di daftar |
| CRM-02 | Tambah klien dengan email duplikat | Email yang sudah ada | Pesan error duplikat |
| CRM-03 | Edit data klien | Ubah nomor HP | Data terupdate di tabel |
| CRM-04 | Hapus klien | Pilih klien → hapus | Klien hilang dari daftar |
| CRM-05 | Buat grup baru | Nama grup | Grup berhasil dibuat |
| CRM-06 | Tambah klien ke grup | Pilih klien → assign ke grup | Klien muncul di anggota grup |
| CRM-07 | Cari klien | Ketik nama/nomor di search | Daftar terfilter sesuai query |

---

### 3. Campaign Manager

#### Pembuatan & Pengiriman Campaign

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| CAMP-01 | Submit campaign tanpa judul | Form kosong | Validasi error — judul wajib diisi |
| CAMP-02 | Campaign WhatsApp valid | Judul, konten, pilih grup, platform WA | Campaign tersimpan & WA terkirim ke semua anggota grup |
| CAMP-03 | Campaign Instagram gambar valid | Gambar rasio 1:1, caption, akun IG terhubung | Post berhasil muncul di feed Instagram |
| CAMP-04 | Campaign Instagram tanpa gambar | Caption tanpa media | Error: Instagram membutuhkan media |
| CAMP-05 | Campaign Instagram gambar rasio salah | Gambar 16:9 (terlalu lebar) | Error: aspect ratio not supported |
| CAMP-06 | Campaign Facebook | Caption, platform FB, page terhubung | Post berhasil muncul di Facebook Page |
| CAMP-07 | Campaign Email | Subject, body, grup dengan email | Email terkirim ke semua penerima |
| CAMP-08 | Campaign multi-platform | WA + IG + FB dipilih | Semua platform menerima konten masing-masing |
| CAMP-09 | Apply to all platforms | Isi konten → klik Apply to all | Caption IG include judul; WA auto-fill params |
| CAMP-10 | Upload media campaign | File gambar/video | Media terupload ke storage, URL tersimpan |
| CAMP-11 | Campaign tanpa integrasi | Platform IG dipilih tapi IG belum connect | Error: integration not connected |

#### WhatsApp Template

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| WA-01 | Template 2 variabel | Pilih template 2 param | Auto-fill: nama org + konten campaign |
| WA-02 | Template lebih dari 2 variabel | Template 3+ param | Warning: edit manual tampil di UI |
| WA-03 | Template dengan IMAGE header | Media diupload saat campaign | Gambar dikirim sebagai header template |
| WA-04 | Kirim ke nomor manual | Input nomor HP manual | Pesan terkirim ke nomor yang diinput |
| WA-05 | Kirim ke grup | Pilih grup berisi nomor HP | Pesan terkirim ke semua anggota grup |

---

### 4. Omnichannel Inbox

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| INBOX-01 | Pesan WA masuk dari pelanggan | Kirim WA ke nomor bisnis dari HP lain | Conversation muncul di Inbox secara realtime |
| INBOX-02 | Pesan Messenger masuk | Kirim DM ke Facebook Page | Conversation muncul di Inbox |
| INBOX-03 | Pesan Instagram DM masuk | Kirim DM ke akun IG bisnis | Conversation muncul di Inbox |
| INBOX-04 | Balas pesan WA dari Inbox | Ketik pesan → kirim | Pesan terkirim via WA, muncul di thread |
| INBOX-05 | Balas pesan Messenger dari Inbox | Ketik pesan → kirim | Pesan terkirim via Messenger |
| INBOX-06 | Balas pesan Instagram DM dari Inbox | Ketik pesan → kirim | Pesan terkirim via Instagram DM |
| INBOX-07 | Kirim gambar via Inbox | Attach file → kirim | Gambar terupload & terkirim ke pelanggan |
| INBOX-08 | Filter percakapan per channel | Pilih "WhatsApp" di dropdown filter | Hanya percakapan WA yang tampil |
| INBOX-09 | Cari percakapan | Ketik nama atau nomor di search | Daftar percakapan terfilter |
| INBOX-10 | Reset unread badge | Buka percakapan dengan badge unread | Badge hilang setelah percakapan dibuka |
| INBOX-11 | Realtime update | Kirim pesan dari HP saat Inbox terbuka | Pesan muncul tanpa perlu refresh halaman |

---

### 5. Design Editor

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| DESIGN-01 | Buat project baru | Nama project, pilih ukuran kanvas | Editor terbuka dengan kanvas kosong |
| DESIGN-02 | Tambah teks ke kanvas | Klik "Add Text" → edit | Teks muncul, bisa dipindah & di-resize |
| DESIGN-03 | Upload gambar ke kanvas | Pilih file gambar | Gambar muncul di kanvas |
| DESIGN-04 | Simpan design | Klik Save | Design tersimpan ke Supabase |
| DESIGN-05 | Export PDF | Klik Download → pilih PDF | File PDF berhasil terdownload |
| DESIGN-06 | Generate AI image | Input prompt teks | Gambar dari AI muncul di kanvas |

---

### 6. Analytics

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| ANALYTICS-01 | Lihat dashboard analytics | Buka halaman Analytics | Grafik campaign, email stats, WA stats tampil |
| ANALYTICS-02 | Filter per periode | Pilih range tanggal | Data terfilter sesuai periode yang dipilih |
| ANALYTICS-03 | AI summary | Klik tombol AI Summary | Ringkasan performa dalam bahasa natural |

---

### 7. Integrasi Platform

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| INT-01 | Hubungkan Meta (IG + FB + Messenger) | App ID + Secret → Connect via Meta → Login Facebook | Akun IG dan FB Page tersimpan di sistem |
| INT-02 | Disconnect integrasi Meta | Klik Disconnect Instagram / Disconnect Messenger | Data integrasi terhapus dari database |
| INT-03 | Hubungkan WhatsApp Cloud API | Phone Number ID + Access Token | WA integration tersimpan, campaign WA bisa dikirim |
| INT-04 | Hubungkan Email (Resend) | API Key + From email | Email integration tersimpan, campaign email bisa dikirim |
| INT-05 | Connect Meta tanpa App ID | Klik Connect sebelum isi App ID | Tombol disabled atau muncul error message |
| INT-06 | Reconnect Meta setelah tambah scope | Disconnect → Connect ulang | Token baru mencakup permission terbaru |

---

### 8. Admin Panel

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| ADMIN-01 | Buat organisasi baru | Nama org | Org berhasil dibuat, muncul di daftar |
| ADMIN-02 | Invite user ke org | Email + pilih role | User mendapat akses dengan role yang dipilih |
| ADMIN-03 | Ubah role user | Pilih user → ubah role | Role terupdate, akses berubah sesuai role baru |
| ADMIN-04 | Hapus user dari org | Pilih user → hapus | User tidak bisa mengakses org |
| ADMIN-05 | Lihat semua organisasi | Buka Admin Dashboard | Daftar semua org beserta statistik tampil |

---

### 9. WA Template Manager

| ID | Skenario | Input | Expected Output |
|---|---|---|---|
| TEMPLATE-01 | Lihat daftar template WA | Buka halaman WA Templates | Daftar template dari Meta API ditampilkan |
| TEMPLATE-02 | Buat template baru | Nama, kategori, konten, variabel | Template tersubmit ke Meta untuk review |
| TEMPLATE-03 | Template dengan image header | Pilih header type IMAGE | Form header image muncul |

---

## Catatan Penting

### Instagram
- Gambar harus memiliki aspect ratio yang didukung: **1:1**, **4:5**, atau **1.91:1**
- Gambar dengan rasio di luar range tersebut akan ditolak dengan error `aspect ratio not supported`

### WhatsApp
- Hanya template berstatus **Approved** di Meta yang bisa digunakan untuk campaign
- Template dengan IMAGE header wajib menyertakan media saat mengirim campaign
- Pengiriman di luar 24-jam conversation window hanya bisa lewat approved template

### Meta App Review
- Untuk pengguna di luar developer/tester app, permissions `pages_manage_posts` dan `instagram_content_publish` memerlukan **App Review** dari Meta sebelum bisa digunakan di production
- Selama development, hanya akun yang terdaftar sebagai Developer atau Tester di Meta App yang dapat menggunakan fitur posting

---

## Lisensi

Proyek ini dibuat untuk keperluan akademik (skripsi). Tidak untuk distribusi komersial.
