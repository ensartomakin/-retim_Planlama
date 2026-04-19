# 04 — Audit Log Erişim Politikası

## Karar (Faz 2)

**Tüm roller tüm audit log kayıtlarını okuyabilir.** Yazma yetkisi yoktur; kayıtlar sistem tarafından her mutasyonda üretilir.

### Gerekçe
Şeffaf süreç izleme kritik: "kim, ne zaman, ne yaptı" sorusunun cevabı tüm ekipler için aynı olmalı. Gizli alan politikası (örn. fiyat) yalnızca içerik (satır bazında) maskelenebilir, kayıt varlığı gizlenmez.

### Uygulama
- `audit_log` tablosu `SELECT *` tüm oturum açmış kullanıcılara açık.
- Supabase RLS politikası:
  ```sql
  CREATE POLICY audit_read_all ON audit_log FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY audit_no_write ON audit_log FOR INSERT WITH CHECK (false);
  ```
  (Insert'ler Prisma service role ile yapılır, client-side yazma yasak.)
- UI: `/audit` sayfası tüm kullanıcılara link. Filtre: entity, kullanıcı, tarih aralığı, action tipi.

### Hassas Veri Maskeleme (ileride gerekirse)
- `before_json` / `after_json` içinde hassas alan (örn. `unitPrice`) görünmesin istenirse audit helper içinde `redactFields` ile maskelenir. Şu an için aktif değil.
