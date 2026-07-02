# ERD — Marketing Campaign Tools (Core Tables)

Diagram ini mencakup 12 tabel inti yang merepresentasikan alur bisnis utama.
Tabel pendukung (contacts, projects, email_events, link_clicks, messenger_outbox) tidak ditampilkan.

```mermaid
erDiagram
    organizations {
        uuid id PK
        text name
        text status
        text description
        int max_operators
        int max_designers
        int max_marketers
        timestamp created_at
    }

    profiles {
        uuid id PK
        text username
        text email
        text avatar_url
    }

    organization_members {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        string role
        text status
        timestamp created_at
    }

    organization_integrations {
        uuid id PK
        uuid organization_id FK
        text platform
        text provider_account_id
        text access_token
        text status
        timestamp connected_at
    }

    clients {
        uuid id PK
        uuid organization_id FK
        text name
        text email
        text phone
        text instagram
        text facebook
        timestamp created_at
    }

    groups {
        uuid id PK
        uuid organization_id FK
        text name
        text description
        timestamp created_at
    }

    client_groups {
        uuid client_id FK
        uuid group_id FK
    }

    marketing_campaigns {
        uuid id PK
        uuid organization_id FK
        text title
        text content
        text platforms
        text status
        timestamp scheduled_date
        timestamp created_at
    }

    whatsapp_outbox {
        bigint id PK
        uuid organization_id FK
        uuid campaign_id FK
        text phone
        text message
        text status
        timestamp created_at
    }

    social_posts {
        bigint id PK
        uuid organization_id FK
        uuid campaign_id FK
        text content
        text platforms
        text status
        timestamp created_at
    }

    conversations {
        uuid id PK
        uuid organization_id FK
        text platform
        text external_contact_id
        text contact_name
        int unread_count
        timestamp last_message_at
        timestamp created_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        text sender_type
        text content
        text media_url
        text status
        timestamp created_at
    }

    organizations ||--o{ organization_members : "has member"
    profiles ||--o{ organization_members : "joins"
    organizations ||--o{ organization_integrations : "has integration"
    organizations ||--o{ clients : "has"
    organizations ||--o{ groups : "has"
    clients }o--o{ groups : "belongs to"
    client_groups ||--|| clients : " "
    client_groups ||--|| groups : " "
    organizations ||--o{ marketing_campaigns : "creates"
    marketing_campaigns ||--o{ whatsapp_outbox : "sends via WA"
    marketing_campaigns ||--o{ social_posts : "posts via IG-FB"
    organizations ||--o{ conversations : "manages"
    conversations ||--o{ messages : "contains"
```

## Keterangan Relasi

| Entitas | Relasi | Entitas |
|---|---|---|
| organizations | 1 : N | organization_members |
| profiles | 1 : N | organization_members |
| organizations | 1 : N | organization_integrations |
| organizations | 1 : N | clients |
| organizations | 1 : N | groups |
| clients | M : N | groups *(via client_groups)* |
| organizations | 1 : N | marketing_campaigns |
| marketing_campaigns | 1 : N | whatsapp_outbox |
| marketing_campaigns | 1 : N | social_posts |
| organizations | 1 : N | conversations |
| conversations | 1 : N | messages |

## Enum

`app_role` = `admin` | `operator` | `designer` | `marketer`

## Catatan

- Semua FK menggunakan `ON DELETE CASCADE`
- Semua tabel memiliki RLS (Row Level Security) aktif
- `profiles.id` ↔ `auth.users.id` (Supabase Auth — di luar diagram)
- `organization_members` adalah tabel pivot yang juga menyimpan **role** user dalam org
- `client_groups` adalah tabel pivot murni (tidak ada kolom tambahan)
- `conversations` memiliki unique constraint pada `(organization_id, platform, external_contact_id)` — mencegah duplikasi thread per pelanggan per platform
```
