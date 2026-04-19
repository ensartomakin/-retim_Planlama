# Tekstil Üretim Yönetim Sistemi (MES/MRP)

Endüstri 4.0 tabanlı, tekstil sektörüne özel, Odoo Üretim modülü esintili uçtan uca üretim takip platformu.

> Durum: **Faz 0 – Mimari ve İskelet**. Bu aşamada ER modeli, state-machine ve dashboard mockup teslim edilmiştir. Henüz canlı backend/DB kurulmamıştır.

---

## 1. Kapsam Özeti

| Modül | Sorumluluk |
|-------|------------|
| **Tasarım / Ürün Geliştirme** | Model kartı, numune, teknik çizim, termin |
| **Kalıp (Modalist)** | Atama, versiyonlama, iş yükü, revize metrikleri |
| **Planlama / İş Emri** | Sipariş, asorti (renk×beden), kapasite, barkodlu iş emri |
| **Satın Alma / BOM** | Reçete, stok kontrolü, eksik malzeme talebi, tedarikçi |
| **Kesimhane / Atölye** | Parti takibi, üretim akışı (Faz 2) |
| **Ortak Dashboard** | KPI kartları, süreç çarkları, read-only izleme, Excel/PDF |

---

## 2. Önerilen Teknik Yığın (Taslak – Onayınızı Bekliyor)

| Katman | Öneri | Alternatif | Neden |
|---|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | Vue/Nuxt, SvelteKit | Odoo-benzeri kart UI için hızlı, SSR + auth kolay |
| **Backend** | Next.js API Routes **veya** ayrı NestJS | Django, FastAPI | Tek repo / monorepo, TypeScript paylaşımı |
| **DB** | PostgreSQL (Supabase-hosted) | Self-hosted PG + Prisma | RLS ile RBAC, anlık hazır auth, realtime, storage |
| **ORM** | Prisma | Drizzle | Şema-migrasyon + tip güvenliği |
| **Auth** | Supabase Auth (email + magic link) | NextAuth + JWT | Rol tablosu + RLS entegrasyonu yerleşik |
| **Dosya (teknik çizim)** | Supabase Storage | S3 | PDF/AI/DXF yükleme, imzalı URL |
| **Entegrasyon (Mikro ERP)** | REST/JSON adapter katmanı, iki yönlü job queue (BullMQ) | Webhook + cron | Çift taraflı senkronizasyonu tek noktadan yönetmek |
| **Raporlama** | `exceljs` + `pdfmake` | SheetJS + puppeteer | Excel/PDF ihracı için yeterli |

### Neden monorepo?
- `apps/web` (UI), `apps/api` (varsa), `packages/db` (Prisma schema), `packages/contracts` (REST DTO + Zod) → Mikro ERP adapteri `packages/erp-mikro` altında izole kalır; dummy data modundan canlıya geçiş tek flag ile olur.

---

## 3. Klasör Düzeni (Planlanan)

```
.
├── apps/
│   └── web/                  # Next.js UI + API routes
├── packages/
│   ├── db/                   # Prisma şeması + migrations + seed
│   ├── contracts/            # Zod DTO + REST tipleri (Mikro ERP adaptörüyle paylaşılır)
│   └── erp-mikro/            # Mikro ERP two-way sync adaptörü (dummy ↔ live)
├── docs/
│   ├── 01-ER-DIAGRAM.md      # ER modeli (Mermaid)
│   └── 02-STATE-MACHINE.md   # Taslak → Atölye akışı
├── mockup/
│   └── dashboard.html        # Statik Odoo-benzeri dashboard önizleme
└── README.md
```

> Not: Faz 0'da yalnızca `docs/` ve `mockup/` dolu. Kod iskeleti teknoloji seçimi onaylandıktan sonra kurulacak.

---

## 4. RBAC Matrisi

| Rol | Model | Kalıp | Sipariş | BOM | Stok | Dashboard | Kullanıcı Yön. |
|---|---|---|---|---|---|---|---|
| Super Admin | CRUD | CRUD | CRUD | CRUD | CRUD | R | CRUD |
| Modalist | R | **CRUD** | R | R | R | R | – |
| Planlama | R | R | **CRUD** | R | R | R | – |
| Satın Alma | R | R | R | **CRUD** | **CRUD** | R | – |
| Üretim/Atölye | R | R | R (kendi emirleri) | R | R | R | – |
| Tasarım | **CRUD** | R | R | R | R | R | – |

- Yazma yetkisi = sadece kendi modülündeki kayıtların `update/create/delete`'i.
- Tüm roller tüm modüllerde **read** ve **Excel/PDF export** yapabilir.
- Her mutasyon `audit_log` tablosuna `user_id, action, entity, before, after, ts` olarak yazılır.

---

## 5. Faz Planı

- **Faz 0 (bugün):** ER, state machine, dashboard mockup ✅
- **Faz 1:** Monorepo iskeleti + Prisma şema + seed (dummy data) + Auth + RBAC middleware
- **Faz 2:** Tasarım + Kalıp modülleri (statü akışı dahil)
- **Faz 3:** Planlama + İş Emri + kapasite ve asorti matrisi
- **Faz 4:** BOM + Stok + Satın Alma talep akışı ("Üretimi Başlat" engel mantığı)
- **Faz 5:** Ortak Dashboard + Excel/PDF export + Audit Log UI
- **Faz 6:** Mikro ERP iki yönlü sync adaptörü

---

## 6. Mevcut Teslimler (Faz 0)

- [`docs/01-ER-DIAGRAM.md`](docs/01-ER-DIAGRAM.md) — Veri modeli (Mermaid ER + tablo açıklamaları)
- [`docs/02-STATE-MACHINE.md`](docs/02-STATE-MACHINE.md) — "Taslak → Atölye" durum geçiş mantığı + guard kuralları
- [`mockup/dashboard.html`](mockup/dashboard.html) — Odoo-benzeri ortak takip ekranı (tek dosya, tarayıcıda açılır)
