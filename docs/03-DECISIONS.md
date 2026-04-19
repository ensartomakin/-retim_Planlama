# 03 — Kararlar ve Varsayılanlar (Faz 1)

Bu dokümanda Faz 0 sonunda netleştirilen kararlar ve siz tarafından bırakılan alanlarda öne sürdüğüm varsayılanlar yer alır. Varsayılanlar `TODO:onay` etiketiyle işaretlenmiştir — değiştirmek isterseniz söylemeniz yeterli.

---

## 1. Onaylanmış Kararlar

| Alan | Karar |
|---|---|
| Frontend | **Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui** |
| Backend | Next.js Route Handlers (API Routes) |
| DB | **PostgreSQL 16** (Supabase-compatible, self-host edilebilir) |
| ORM | **Prisma** |
| Auth | **Supabase Auth — Magic Link** |
| Storage | **Supabase Storage** (teknik çizim / kalıp PDF) |
| Dil | **Türkçe**, i18n katmanı Faz 5'te |
| Deploy | **Şirket içi VPN** arkası → Docker Compose ile on-prem stack; Supabase self-hosted veya cloud |
| Kullanıcı Sayısı | ~10 aktif, bir kullanıcı **birden fazla role** sahip olabilir |
| Varyant boyutu | Sadece **Renk × Beden** |
| Super Admin | Tek kişi (siz), magic link ile giriş |
| Mikro ERP | **v16**, iki yönlü sync: **stok + satın alma + ürün + fatura** (ve "daha fazlası" için genişletilebilir adaptör) |

---

## 2. Varsayılan Kararlar (TODO:onay)

### 2.1 Barkod / İş Emri No Formatı

| Alan | Varsayılan | Açıklama |
|---|---|---|
| Sipariş no | `SO-YYYY-NNNNNN` | Yıl başına sıfırlanır, 6 haneli sıra |
| İş emri no | `WO-YYYY-NNNNNN-PP` | `PP` = parti sıra (01..99) |
| Model kodu | `{SEZON}-{KATEGORI}-{SIRA3}` | Örn. `SS26-GML-007` |
| Barkod türü | **Code-128**, opsiyonel QR ikincil | Code-128 alfa-numerik kısa alan için en uygun |
| Etiket boyutu | **50 × 30 mm** termal etiket | 2 satır metin + barkod sığar |

### 2.2 Parti Bölme Kuralı

| Kural | Değer |
|---|---|
| Varsayılan maksimum parti adedi | **500 adet** |
| Minimum parti adedi | **50 adet** (daha küçük parti için super admin override) |
| Otomatik bölme | `ceil(total_qty / max_batch)` kadar `work_order` üretilir |
| Manuel bölme | Planlamacı adet bazlı elle de bölebilir; toplam = `order.total_qty` check'i |
| Parti/atölye atama | Varsayılan tek atölye; çoklu atölyeye bölme Faz 3.1 |

> Atölye bazlı `max_batch` için `workshops.max_batch_pcs` kolonu ekliyorum, 500 default.

### 2.3 Kapasite Hesabı

- Günlük kapasite birimi: **adet/gün** (`workshops.daily_capacity_pcs`).
- `order` release sırasında termin tarihine kadar düz dağıtım yapılır: `qtyPerDay = ceil(total_qty / iş_günü)`.
- Çakışma: `booked_pcs + qtyPerDay > daily_capacity_pcs` → kırmızı; override super_admin.

### 2.4 Magic Link + Beyaz Liste

- Kullanıcı oluşturma yalnızca super admin paneli üzerinden olur.
- `public.users` tablosuna önceden eklenmemiş bir email magic link isterse auth callback **reddeder** (sessizce 403).
- Oturum süresi: **8 saat** idle timeout + **30 gün** sliding (Supabase default override).

### 2.5 Audit Log

- `audit_log.before_json / after_json` **JSONB**, diff server tarafında tutulur.
- Değişmeyen kolonlar log'a girmez (noise azaltma).
- UI'da son 200 kayıt anlık; geçmiş sorgulama Faz 5.

### 2.6 Mikro ERP v16 Entegrasyonu

| Varlık | Yön | Mikro Tablosu (tahmini) | Not |
|---|---|---|---|
| Ürün (model/reçete çıktısı) | **OUT** + IN | `STOKLAR` | `STOK_KODU` = `model.code`; sync_mapping ile eşleşir |
| Stok hareketi | IN | `STOK_HAREKETLERI` | Girişler ana gerçek; bizde `stock.qty_on_hand` özeti |
| Satın alma siparişi | OUT | `SIPARISLER (tip=A)` | `purchase_request` ONAYLI → push |
| Fatura (alış) | IN | `FATURALAR` | Maliyet + kapanış için |
| Fatura (satış) | OUT (opsiyonel) | `FATURALAR` | Sipariş kapanışında irsaliye/fatura sonrası |
| Cari (müşteri/tedarikçi) | IN | `CARI_HESAPLAR` | `customers`, `suppliers` ile eşlenir |

- **Protokol**: Mikro v16'nın SQL'e doğrudan erişim (MSSQL) verdiği kurulumlar çoğunlukta. Adaptör, ortam değişkeni ile **iki sürücü** destekler:
  - `MIKRO_MODE=mssql` → MSSQL üzerinden `mssql` paketi (varsayılan v16).
  - `MIKRO_MODE=rest` → Mikro Fly REST API (varsa) için placeholder.
- Sync tarzı: **outbox pattern**. Local DB'de her mutasyon `sync_queue(OUT)` yazar; cron (BullMQ + Redis) Mikro'ya pushlar. Inbound için **polling + değişiklik tablosu** (her saatte bir).
- Conflict: `sync_mapping.hash` ile son bilinen hash kıyası; farklıysa **CONFLICT** → super admin UI'da çözer.

### 2.7 VPN / Deploy Topolojisi

```
[Kullanıcı] --VPN--> [ Traefik / Caddy ]
                       |- apps/web       (Next.js 14, 3000)
                       |- supabase stack (db, auth, storage, 54321)
                       |- redis          (sync queue)
                       |- worker         (BullMQ, Mikro sync)
                       `- mikro-adapter  (MSSQL'e tünel eden servis)
```

- Hepsi `docker-compose.yml` ile tek komutla ayağa kalkar.
- MSSQL (Mikro) genelde aynı LAN'de; adapter servisi 1433'e `host.docker.internal` veya sabit IP ile bağlanır.

---

## 3. Açık Kalan Konular (sonraki round)

- **Audit UI kapsamı**: Kim nereye kadar detay görebilir? (Şu an: tüm roller read-only, full detay).
- **Numune onayı 2-aşamalı mı**? Tasarım + Modalist birlikte mi imzalar, yoksa tek tasarım yeterli mi?
- **Fatura yönü**: Satış faturası Mikro'da mı kesilecek (biz sadece tetikler miyiz)?
- **Yedekleme**: PG dump frekansı + retention politikası.

Bu 4 konuyu Faz 2 başında konuşalım.
