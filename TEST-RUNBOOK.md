# Test Runbook — Tekstil MES

Bu rehber, sistemi lokalde **Supabase kurulumu olmadan** ayağa kaldırmanızı ve
ana senaryoları uçtan uca test etmenizi sağlar.

## 0. Ön gereksinimler

- Node.js **20.11+**
- pnpm **9+** (`npm i -g pnpm@9`)
- Docker Desktop (Postgres + Redis için)

## 1. Ortamı hazırla

```bash
# 1) Depoyu aç
cd -retim_Planlama

# 2) .env dosyası
cp .env.example .env
# .env içinde SUPER_ADMIN_EMAIL'i istediğin değere ayarla (örn. ensartomakin@demo.local)
# DEV_MODE=true olduğundan emin ol

# 3) Postgres + Redis
pnpm docker:up

# 4) Bağımlılıklar
pnpm install

# 5) Şemayı oluştur, migrate et
pnpm db:generate
pnpm db:migrate

# 6) Demo veri
pnpm db:seed

# 7) Web uygulamasını başlat
pnpm dev
```

→ [http://localhost:3001](http://localhost:3001)

## 2. DEV MODE nasıl çalışır?

`.env`'de `DEV_MODE=true` olduğunda:

- `/login` ekranı atlanır — doğrudan dashboard açılır.
- Varsayılan oturum: `SUPER_ADMIN_EMAIL` ile eşleşen kullanıcı.
- Sayfanın **üst sarı şeridi** ile rol denemek için kullanıcı değiştirebilirsiniz:

  | Kullanıcı | Rol(ler) | Ne görür? |
  |---|---|---|
  | Sistem Sahibi (SUPER_ADMIN) | super_admin | Her şey |
  | Emre Aydın | tasarim | Model oluşturma, numune |
  | Ayşe Kaya | modalist | Kalıp atama / versiyon |
  | Seda Yıldız | planlama | Sipariş, BOM doğrulama, atölyeye çıkış |
  | Mehmet Er | satinalma | PR onay / teslim |
  | Fatma Güneş | uretim | İş emri transitions |
  | Çift Rol | tasarim + modalist | İki alan birden |

Prod'da `DEV_MODE=false` yapın → magic link akışı devreye girer.

## 3. Demo senaryo: Sipariş → Üretim

Seed sonrası sistemde hazır bulunanlar:

- **Model**: `SS26-GML-001` (ONAYLANDI)
- **Sipariş**: `SO-2026-000181` — 1200 adet, MALZEME_BEKLIYOR
- **PR**: `PR-2026-000041` — 130kg kırmızı iplik (TASLAK)
- **Stok**: kırmızı iplik yalnızca 50 kg (kritik), diğer malzemeler bol

### A) Satın Alma akışı

1. Sarı şeritten **Mehmet Er (satinalma)** seç.
2. `Satın Alma` → `PR-2026-000041` → **Onaya Gönder** → **Onayla**
   - Stokta `qty_reserved` 130'a çıkar.
3. **Teslim Al** → `qty_on_hand` +130 olur, `qty_reserved` sıfırlanır.
4. `PR` statüsü `TESLIM_ALINDI`, sipariş otomatik `HAZIR` olur.
5. Ait olduğu sayfada **Audit Log** kronolojik olarak görünür.

### B) Atölyeye çıkış

1. **Seda Yıldız (planlama)** olarak geç.
2. `Siparişler` → `SO-2026-000181` → **Atölyeye Gönder**.
3. Kapasiteyi aşıyorsa override gerekçesi istenir (Super Admin yetkili).
4. İş emirleri oluşur: `WO-2026-000181-01`, `-02`, ...

### C) Üretim akışı

1. **Fatma Güneş (uretim)** olarak geç.
2. `İş Emirleri` → sıradaki butonları tıkla:
   `OLUSTURULDU → KESIM → DIKIM → KALITE → PAKETLEME → TAMAMLANDI`
3. Tüm iş emirleri `TAMAMLANDI` olunca sipariş otomatik `KAPALI`.

### D) Tasarım akışı (yeni model)

1. **Emre Aydın (tasarim)** olarak geç.
2. `Modeller` → **Yeni Model** → kaydet (durum: `TASLAK`).
3. Detayda `Numune Hazırla → OK → Onayla` transitions'ını sırayla tetikle.

### E) Kalıp (modalist)

1. **Ayşe Kaya (modalist)** olarak geç.
2. `Kalıplar` → model seç → kalıp ata → versiyon ekle → kapat.

## 4. Test checklist

- [ ] Dashboard KPI'ları gerçek veriyi yansıtıyor
- [ ] Sipariş detayında **asorti matrisi** (renk × beden) doğru
- [ ] Sipariş detayında **BOM/Stok tablosu** eksikleri kırmızı gösteriyor
- [ ] Stok yetersizse **Üretimi Başlat** butonu disable
- [ ] PR onayı `qty_reserved`'ı değiştiriyor
- [ ] Teslim alma `qty_on_hand`'i artırıyor
- [ ] Work order transitions inline butonlarla çalışıyor
- [ ] Tüm transitions `/audit` sayfasında listeleniyor
- [ ] Excel export (`/api/export/orders`, `/api/export/models`) indiriyor
- [ ] DEV MODE kullanıcı değiştirme rolü anında güncelliyor

## 5. Sıfırdan başlamak

```bash
pnpm db:reset   # tüm veriyi siler
pnpm db:seed    # demo veriyi yeniden yükler
```

## 6. Sorun giderme

| Belirti | Çözüm |
|---|---|
| `relation does not exist` | `pnpm db:migrate` çalıştır |
| Dashboard boş | `pnpm db:seed` çalıştır |
| "UNAUTHENTICATED" | `.env`'de `DEV_MODE=true` ve `SUPER_ADMIN_EMAIL` doğru mu? |
| Docker port çakışması | `pnpm docker:down` → port 5432/6379 kullanıyor mu kontrol et |
| Prisma client eski | `pnpm db:generate` |

## 7. Prod'a geçerken

1. `.env`'de `DEV_MODE=false`
2. Supabase projesi → URL + anon key + service role doldurulur
3. `SUPER_ADMIN_EMAIL` gerçek e-posta
4. Mikro ERP için `MIKRO_MODE=mssql` + bağlantı bilgileri
5. `pnpm build && pnpm start`
