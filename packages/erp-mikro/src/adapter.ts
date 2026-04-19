import type {
  MikroProduct,
  MikroStockLevel,
  MikroCustomerOrSupplier,
  MikroPurchaseOrder,
  MikroInvoice,
  SyncResult,
} from './types';

/**
 * Mikro ERP adaptör arayüzü.
 * Somut adaptörler (MSSQL v16, REST, Dummy) bu arayüzü uygular.
 */
export interface MikroAdapter {
  // Bağlantı testi — UI'dan "Bağlantıyı Dene" butonu çağırır.
  ping(): Promise<{ ok: boolean; latencyMs: number; version?: string; error?: string }>;

  // ─── INBOUND (Mikro → biz) ────────────────────────────────────────
  fetchProductsSince(since: Date): Promise<MikroProduct[]>;
  fetchStockLevelsSince(since: Date): Promise<MikroStockLevel[]>;
  fetchCustomersSince(since: Date): Promise<MikroCustomerOrSupplier[]>;
  fetchSuppliersSince(since: Date): Promise<MikroCustomerOrSupplier[]>;
  fetchInvoicesSince(since: Date): Promise<MikroInvoice[]>;

  // ─── OUTBOUND (biz → Mikro) ───────────────────────────────────────
  upsertProduct(p: Omit<MikroProduct, 'mikroId'> & { mikroId?: string }): Promise<{ mikroId: string }>;
  createPurchaseOrder(po: Omit<MikroPurchaseOrder, 'mikroId'>): Promise<{ mikroId: string }>;
  createOutgoingInvoice(inv: Omit<MikroInvoice, 'mikroId' | 'direction'>): Promise<{ mikroId: string }>;

  // ─── SYNC orchestrator yardımcıları ───────────────────────────────
  fullPull(since: Date): Promise<SyncResult<unknown>[]>;
}

/** Faz 1 için config. Runtime'da process.env'den oluşturulur. */
export interface MikroAdapterConfig {
  mode: 'mssql' | 'rest' | 'dummy';
  mssql?: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    options?: { encrypt?: boolean; trustServerCertificate?: boolean };
  };
  rest?: {
    baseUrl: string;
    apiKey: string;
  };
}

export function adapterConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MikroAdapterConfig {
  const mode = (env.MIKRO_MODE ?? 'dummy') as MikroAdapterConfig['mode'];
  if (mode === 'mssql') {
    return {
      mode,
      mssql: {
        host: env.MIKRO_MSSQL_HOST ?? 'localhost',
        port: Number(env.MIKRO_MSSQL_PORT ?? 1433),
        user: env.MIKRO_MSSQL_USER ?? 'sa',
        password: env.MIKRO_MSSQL_PASSWORD ?? '',
        database: env.MIKRO_MSSQL_DATABASE ?? 'MikroDB_V16',
        options: { encrypt: false, trustServerCertificate: true },
      },
    };
  }
  if (mode === 'rest') {
    return {
      mode,
      rest: {
        baseUrl: env.MIKRO_REST_URL ?? '',
        apiKey: env.MIKRO_REST_KEY ?? '',
      },
    };
  }
  return { mode: 'dummy' };
}
