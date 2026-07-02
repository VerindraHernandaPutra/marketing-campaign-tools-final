# Setup Guide — Marketing Campaign Tools

Panduan lengkap konfigurasi dari awal berdasarkan pengalaman implementasi nyata.

---

## 1. Meta App Configuration

### Tipe App
Gunakan **Business App** dengan sistem **Use Cases** (bukan Consumer App lama).

### Use Cases yang perlu ditambahkan
Di **Kasus penggunaan → Tambahkan kasus penggunaan**:
| Use Case | Fungsi |
|---|---|
| Berinteraksi dengan pelanggan di Messenger from Meta | Menerima pesan Messenger + balas via Inbox |
| Kelola pesan & konten di Instagram | Post Instagram + terima DM Instagram |
| Terhubung dengan pelanggan melalui WhatsApp | Kirim WA campaign |
| Kelola Halaman | Post ke Facebook Page |

### Permissions per Use Case
Izin TIDAK ditambahkan secara global — harus masuk ke setiap use case → **Sesuaikan → Izin dan fitur**.

**"Kelola Halaman"** → aktifkan:
- `pages_manage_posts` ← untuk posting ke Facebook Page feed
- `pages_read_engagement`
- `pages_show_list`
- `pages_manage_metadata`

**"Kelola pesan & konten di Instagram"** → aktifkan:
- `instagram_content_publish` ← untuk posting ke Instagram feed
- `instagram_basic`
- `instagram_manage_messages`

**"Messenger from Meta"** → aktifkan:
- `pages_messaging`
- `pages_manage_metadata`

**"Facebook Login for Business"** → tidak perlu tambahan manual, sudah di-handle OAuth.

> **Catatan penting:** `pages_manage_posts` dan `instagram_content_publish` TIDAK muncul di daftar izin global — hanya tersedia di dalam use case masing-masing. Jika scope diminta sebelum diaktifkan di use case, Meta akan error "Invalid Scopes".

---

## 2. OAuth Scopes (Frontend)

File: `src/hooks/useMetaAuth.ts`

```typescript
const scopes = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_posts',       // Posting ke Facebook Page
  'instagram_basic',
  'instagram_manage_messages',
  'instagram_content_publish', // Posting ke Instagram
  'pages_messaging',
  'business_management',
].join(',');
```

Setelah mengubah scopes → **wajib disconnect dan reconnect** Meta integration dari app supaya token baru mencakup permission baru.

---

## 3. Supabase Edge Functions

### Deploy Commands
```bash
# Functions yang dipanggil dari client (perlu JWT)
supabase functions deploy send-social
supabase functions deploy send-whatsapp
supabase functions deploy send-chat-message
supabase functions deploy meta-oauth
supabase functions deploy generate-caption

# Webhook functions (TANPA JWT karena dipanggil oleh Meta/sistem eksternal)
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy meta-webhook --no-verify-jwt
supabase functions deploy facebook-webhook --no-verify-jwt
```

> **Penting:** Webhook functions HARUS di-deploy dengan `--no-verify-jwt` karena request dari Meta tidak membawa JWT Supabase. Tanpa flag ini, semua webhook akan return 401 dan tidak bisa menerima pesan.

### Supabase Secrets yang dibutuhkan
Di **Supabase Dashboard → Edge Functions → Manage secrets**:

| Secret | Nilai | Digunakan oleh |
|---|---|---|
| `SUPABASE_URL` | URL project Supabase | Semua functions (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Semua functions (auto) |
| `META_VERIFY_TOKEN` | `marketing-tool-verify-token-123` | meta-webhook |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token custom (contoh: `skripsi_webhook_2025`) | whatsapp-webhook |
| `META_CLIENT_ID` | Meta App ID | meta-oauth (opsional, bisa dari DB) |
| `META_CLIENT_SECRET` | Meta App Secret | meta-oauth (opsional, bisa dari DB) |
| `META_REDIRECT_URI` | `https://<domain>/integrations/meta-callback` | meta-oauth |
| `FRONTEND_URL` | URL frontend (production) | meta-oauth |
| `RESEND_API_KEY` | API key Resend | send-email |
| `OPENAI_API_KEY` | API key OpenAI | generate-caption, generate-image |

---

## 4. Webhook Configuration di Meta Developer Console

### WhatsApp Webhook
**Meta Developer Console → WhatsApp → Configuration → Webhook:**
1. Callback URL: `https://<supabase-ref>.supabase.co/functions/v1/whatsapp-webhook`
2. Verify Token: isi dengan nilai yang sama persis dengan secret `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Klik **Verify and Save**
4. Setelah verified → klik **Manage** → centang field **`messages`** → Subscribe

### Messenger Webhook
**Meta Developer Console → Kasus penggunaan → Messenger → Sesuaikan → Pengaturan Messenger API:**
1. Di bagian **Webhooks** → isi Callback URL: `https://<supabase-ref>.supabase.co/functions/v1/meta-webhook`
2. Verify Token: `marketing-tool-verify-token-123`
3. Klik **Verify and Save**
4. Setelah verified → di bawah ada daftar Facebook Pages → klik **Subscribe** pada halaman yang ingin dihubungkan
5. Fields yang perlu disubscribe: `messages`, `messaging_postbacks`

> **Yang sering terlewat:** Langkah Subscribe pada Page (poin 4) adalah langkah berbeda dari mengisi webhook URL. Banyak orang hanya isi URL dan verify, tapi lupa subscribe ke page-nya.

### Instagram Webhook
Instagram DM menggunakan function yang sama dengan Messenger (`meta-webhook`). Konfigurasi dilakukan di:
**Kasus penggunaan → Kelola pesan & konten di Instagram → Sesuaikan → Pengaturan Instagram → Webhooks**

---

## 5. Supabase Storage Buckets

Buat dua bucket di **Supabase Dashboard → Storage → New bucket**:

### `campaign-media` (untuk upload media campaign)
- Tipe: **Public**
- SQL policies:
```sql
CREATE POLICY "Allow authenticated uploads to campaign-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-media');

CREATE POLICY "Allow public read from campaign-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-media');
```

### `chat-media` (untuk attachment di Inbox)
- Tipe: **Public**
- SQL policies:
```sql
CREATE POLICY "Allow authenticated uploads to chat-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Allow public read from chat-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');
```

---

## 6. WhatsApp Template Setup

Template yang digunakan: `marketing_campaign` dengan:
- **Header:** IMAGE (wajib kirim image_url saat menggunakan template ini)
- **Body:** 2 variabel `{{1}}` dan `{{2}}`
  - `{{1}}` = nama organisasi
  - `{{2}}` = judul + konten campaign

Jika template punya lebih dari 2 variabel → tampilkan error di UI, user harus edit manual.

Template dibuat di **Meta Business Suite → WA Manager → Message Templates**.

---

## 7. Cara Kerja Campaign Sending

```
User klik Submit Campaign
  ↓
Upload media ke Supabase Storage (campaign-media bucket)
  ↓
Insert row ke whatsapp_outbox / social_posts
  ↓
Invoke edge function langsung (bukan database webhook):
  - supabase.functions.invoke('send-whatsapp', { body: { record: inserted } })
  - supabase.functions.invoke('send-social', { body: { record: inserted } })
  ↓
Edge function kirim ke Meta Graph API
  ↓
Update status row menjadi 'sent' atau 'failed'
```

> **Catatan:** Database webhooks Supabase tidak digunakan (schema `supabase_functions` tidak tersedia di project ini). Gantinya, edge function dipanggil langsung setelah insert menggunakan `supabase.functions.invoke`.

---

## 8. Cara Kerja Inbox (Omnichannel)

```
Customer kirim pesan (WA / Messenger / Instagram DM)
  ↓
Meta kirim webhook ke Supabase edge function:
  - WhatsApp → whatsapp-webhook
  - Messenger & Instagram → meta-webhook
  ↓
Edge function upsert ke tabel 'conversations' + insert ke 'messages'
  ↓
Inbox UI (realtime subscription) otomatis menampilkan pesan baru
  ↓
Agent balas dari Inbox → send-chat-message function → Meta Graph API
```

---

## 9. Instagram Posting — Persyaratan

Instagram menolak gambar dengan aspect ratio yang tidak didukung:

| Format | Rasio | Contoh |
|---|---|---|
| Square | 1:1 | 1080×1080 |
| Portrait | 4:5 | 1080×1350 |
| Landscape | 1.91:1 | 1080×566 |

Gambar terlalu lebar (> 1.91:1) atau terlalu tinggi (< 4:5) akan ditolak dengan error `"The aspect ratio is not supported"`.

---

## 10. Deploy Ulang dari Nol (Automated)

Semua setup database, storage bucket, dan RLS sudah tersimpan di migration files. Tidak perlu klik manual di Supabase Dashboard.

### Langkah deploy ulang:

```bash
# 1. Install dependencies
npm install

# 2. Login ke Supabase CLI
supabase login

# 3. Link ke project Supabase
supabase link --project-ref xclvqujhmbhwqtqbtbsg

# 4. Jalankan semua migrations (buat tabel + storage bucket + RLS)
supabase db push

# 5. Deploy semua edge functions
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

# Webhook functions — WAJIB --no-verify-jwt
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy meta-webhook --no-verify-jwt
supabase functions deploy facebook-webhook --no-verify-jwt

# 6. Set secrets (satu kali, atau lewat Supabase Dashboard)
supabase secrets set META_VERIFY_TOKEN=marketing-tool-verify-token-123
supabase secrets set WHATSAPP_WEBHOOK_VERIFY_TOKEN=skripsi_webhook_2025
supabase secrets set RESEND_API_KEY=<your-key>
supabase secrets set OPENAI_API_KEY=<your-key>
supabase secrets set FRONTEND_URL=<your-frontend-url>
supabase secrets set META_REDIRECT_URI=<your-frontend-url>/integrations/meta-callback
```

### Yang TIDAK bisa di-automate (harus manual sekali):
- Konfigurasi webhook URL di Meta Developer Console
- Subscribe Facebook Page ke Messenger webhook
- Konfigurasi WhatsApp webhook dan subscribe field `messages`
- Setup Meta App Use Cases dan permissions
- Isi App ID + App Secret di halaman Integrations → Meta di app

---

## 11. Urutan Konfigurasi Manual (Satu Kali)

1. **Meta Developer Console:**
   - Buat Business App
   - Tambahkan 4 use cases
   - Aktifkan permissions di setiap use case
   
2. **Supabase:**
   - Tambahkan semua secrets
   - Buat storage buckets (`campaign-media`, `chat-media`) + SQL policies
   - Deploy semua edge functions (perhatikan mana yang butuh `--no-verify-jwt`)

3. **Meta Developer Console:**
   - Konfigurasi WhatsApp webhook URL + verify token + subscribe field `messages`
   - Konfigurasi Messenger webhook URL + subscribe page

4. **App (Frontend):**
   - Integrations → Meta → isi App ID + App Secret → Save
   - Klik **Connect via Meta** → login → grant semua permissions

5. **Test:**
   - Kirim campaign WhatsApp → cek `whatsapp_outbox` table di Supabase
   - Kirim campaign Facebook → cek `social_posts` table
   - Kirim campaign Instagram → gunakan gambar dengan rasio yang benar
   - Kirim WA dari HP ke nomor bisnis → cek apakah muncul di Inbox
   - Kirim pesan Messenger ke Facebook Page → cek Inbox

---

## 11. Troubleshooting Umum

| Error | Penyebab | Solusi |
|---|---|---|
| `Invalid Scopes: pages_manage_posts` | Permission belum diaktifkan di use case | Aktifkan di "Kelola Halaman" use case |
| `(#200) permission not available` | Token lama tidak punya scope baru | Disconnect + reconnect Meta integration |
| `column clients_1.instagram does not exist` | Query FK join ke kolom yang tidak ada | Gunakan two-step query (lihat `CampaignForm.tsx`) |
| `Storage bucket not found` | Bucket belum dibuat | Buat bucket di Supabase Dashboard → Storage |
| `HTTP 520` | Supabase project paused (free tier) | Restore project di supabase.com/dashboard |
| `Missing authorization header` | Session JWT expired | Refresh halaman |
| `The aspect ratio is not supported` | Gambar Instagram rasio tidak valid | Crop ke 1:1, 4:5, atau 1.91:1 |
| `Requires instagram_content_publish permission` | Permission belum di-grant via OAuth | Aktifkan di Instagram use case + reconnect |
| Inbox kosong setelah webhook setup | Belum ada pesan masuk | Kirim test message dari HP ke akun bisnis |
| Messenger tidak muncul di Inbox | Lupa subscribe page ke webhook | Meta Console → Messenger → Webhooks → Subscribe page |
