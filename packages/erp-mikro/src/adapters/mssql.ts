/**
 * Mikro v16 MSSQL adaptör — İSKELET (Faz 6'da tamamlanacak).
 *
 * Mikro v16'nın gerçek tablo şeması kuruluma göre küçük farklar gösterebilir;
 * saha ekibinden sorgu örnekleri alındıktan sonra alt SQL'ler netleşecek.
 * Bu dosya interface'i tatmin eden tip-güvenli bir stub'tır ve `MIKRO_MODE=mssql`
 * değilken kullanılmamalıdır. `mssql` paketi peerDependency, opsiyoneldir.
 */

import type { MikroAdapter, MikroAdapterConfig } from '../adapter';
import type {
  MikroProduct,
  MikroStockLevel,
  MikroCustomerOrSupplier,
  MikroPurchaseOrder,
  MikroInvoice,
  SyncResult,
} from '../types';

type MssqlModule = typeof import('mssql');

export class MssqlMikroAdapter implements MikroAdapter {
  private pool: unknown = null;

  constructor(private readonly cfg: MikroAdapterConfig) {
    if (cfg.mode !== 'mssql' || !cfg.mssql) {
      throw new Error('MssqlMikroAdapter yalnızca mode=mssql ile başlatılabilir');
    }
  }

  private async getPool(): Promise<{ request: () => { query: (sql: string) => Promise<{ recordset: unknown[] }> } }> {
    if (this.pool) return this.pool as any;
    let mssql: MssqlModule;
    try {
      mssql = await import('mssql');
    } catch {
      throw new Error('mssql paketi yüklü değil. `pnpm add mssql -F @tekstil/erp-mikro` ile ekleyin.');
    }
    const { host, port, user, password, database, options } = this.cfg.mssql!;
    this.pool = await mssql.connect({ server: host, port, user, password, database, options });
    return this.pool as any;
  }

  async ping() {
    const start = Date.now();
    try {
      const pool = await this.getPool();
      await pool.request().query('SELECT 1 AS ok');
      return { ok: true, latencyMs: Date.now() - start, version: 'Mikro v16 (mssql)' };
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - start, error: (e as Error).message };
    }
  }

  // TODO(Faz6): Gerçek SQL'leri sahadan doğrulayıp doldur.
  async fetchProductsSince(_since: Date): Promise<MikroProduct[]> {
    throw new Error('fetchProductsSince: implementasyon bekliyor (Faz 6).');
  }
  async fetchStockLevelsSince(_since: Date): Promise<MikroStockLevel[]> {
    throw new Error('fetchStockLevelsSince: implementasyon bekliyor (Faz 6).');
  }
  async fetchCustomersSince(_since: Date): Promise<MikroCustomerOrSupplier[]> {
    throw new Error('fetchCustomersSince: implementasyon bekliyor (Faz 6).');
  }
  async fetchSuppliersSince(_since: Date): Promise<MikroCustomerOrSupplier[]> {
    throw new Error('fetchSuppliersSince: implementasyon bekliyor (Faz 6).');
  }
  async fetchInvoicesSince(_since: Date): Promise<MikroInvoice[]> {
    throw new Error('fetchInvoicesSince: implementasyon bekliyor (Faz 6).');
  }
  async upsertProduct(_p: Omit<MikroProduct, 'mikroId'> & { mikroId?: string }) {
    throw new Error('upsertProduct: implementasyon bekliyor (Faz 6).');
  }
  async createPurchaseOrder(_po: Omit<MikroPurchaseOrder, 'mikroId'>) {
    throw new Error('createPurchaseOrder: implementasyon bekliyor (Faz 6).');
  }
  async createOutgoingInvoice(_inv: Omit<MikroInvoice, 'mikroId' | 'direction'>) {
    throw new Error('createOutgoingInvoice: implementasyon bekliyor (Faz 6).');
  }
  async fullPull(_since: Date): Promise<SyncResult<unknown>[]> {
    throw new Error('fullPull: implementasyon bekliyor (Faz 6).');
  }
}
