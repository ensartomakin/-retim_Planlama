# @tekstil/erp-mikro

Mikro ERP v16 çift taraflı entegrasyon adaptörü.

## Modlar

- `MIKRO_MODE=dummy` — geliştirme ve UI testi için sahte veri.
- `MIKRO_MODE=mssql` — Mikro v16'nın MSSQL veritabanına doğrudan bağlanır. `mssql` paketi gerektirir.
- `MIKRO_MODE=rest` — Mikro Fly REST API'si için yer tutucu (Faz 6.1).

## Mimari

```
Next.js route  ─►  packages/db (Prisma)  ─►  sync_queue
                                                  ▼
                                            worker (BullMQ)
                                                  ▼
                                         packages/erp-mikro
                                                  ▼
                                          Mikro MSSQL / REST
```

- Tüm mutasyonlar `sync_queue`'ya yazılır, worker bunları sırayla adaptöre iletir.
- Inbound tarafta `fullPull(since)` periyodik çağrılır; `sync_mapping` ile local kayıtlarla eşlenir.
- Çakışma (`conflicts[]`) super admin UI'da manuel çözülür.

## Tablo Eşlemeleri (Faz 6'da tamamlanacak — sahadan doğrulanacak)

| Kanonik | Mikro v16 tablo/kolon (tahmini) |
|---|---|
| `MikroProduct` | `STOKLAR.STOK_KODU, STOK_ADI, BIRIM, SON_GUNCELLEME` |
| `MikroStockLevel` | `STOK_HAREKETLERI` üzerinden özet → depo bazlı agregasyon |
| `MikroCustomerOrSupplier` | `CARI_HESAPLAR.CARI_KOD, CARI_UNVANI, VERGI_NO, CARI_TIPI` |
| `MikroPurchaseOrder` | `SIPARISLER` (tip=alış) + `SIPARIS_HAREKETLERI` |
| `MikroInvoice` | `FATURALAR` + `FATURA_HAREKETLERI` |

> Sütun adları v16 kurulumuna göre farklı olabilir. Sahadan `sp_columns` veya gerçek view tanımı alındıktan sonra `adapters/mssql.ts` içindeki SQL'ler netleşecek.
