import type { MikroAdapter } from '../adapter';
import type {
  MikroProduct,
  MikroStockLevel,
  MikroCustomerOrSupplier,
  MikroPurchaseOrder,
  MikroInvoice,
  SyncResult,
} from '../types';

/**
 * Dummy adaptör — canlı Mikro bağlı olmadığında UI ve sync queue'nun
 * çalışmaya devam etmesi için sahte ama tutarlı veri döndürür.
 */
export class DummyMikroAdapter implements MikroAdapter {
  async ping() {
    return { ok: true, latencyMs: 2, version: 'dummy-1.0' };
  }

  async fetchProductsSince(_since: Date): Promise<MikroProduct[]> {
    return [
      {
        mikroId: 'MK-STK-0001',
        code: 'IPLK-KIRMIZI-20/2',
        name: 'Kırmızı İplik 20/2',
        uom: 'kg',
        updatedAt: new Date(),
      },
    ];
  }

  async fetchStockLevelsSince(_since: Date): Promise<MikroStockLevel[]> {
    return [
      { mikroProductId: 'MK-STK-0001', warehouse: 'MERKEZ', qtyOnHand: 180, updatedAt: new Date() },
    ];
  }

  async fetchCustomersSince(_since: Date): Promise<MikroCustomerOrSupplier[]> {
    return [
      { mikroId: 'MK-CRI-M-001', code: 'ACME', name: 'Acme Tekstil', type: 'customer', updatedAt: new Date() },
    ];
  }

  async fetchSuppliersSince(_since: Date): Promise<MikroCustomerOrSupplier[]> {
    return [
      { mikroId: 'MK-CRI-S-001', code: 'TED-001', name: 'İplik A.Ş.', type: 'supplier', updatedAt: new Date() },
    ];
  }

  async fetchInvoicesSince(_since: Date): Promise<MikroInvoice[]> {
    return [];
  }

  async upsertProduct(p: Omit<MikroProduct, 'mikroId'> & { mikroId?: string }) {
    return { mikroId: p.mikroId ?? `MK-STK-${Math.floor(Math.random() * 100000)}` };
  }

  async createPurchaseOrder(_po: Omit<MikroPurchaseOrder, 'mikroId'>) {
    return { mikroId: `MK-PO-${Date.now()}` };
  }

  async createOutgoingInvoice(_inv: Omit<MikroInvoice, 'mikroId' | 'direction'>) {
    return { mikroId: `MK-INV-${Date.now()}` };
  }

  async fullPull(_since: Date): Promise<SyncResult<unknown>[]> {
    return [
      { entity: 'product', pulled: 1, pushed: 0, conflicts: [] },
      { entity: 'stock', pulled: 1, pushed: 0, conflicts: [] },
      { entity: 'customer', pulled: 1, pushed: 0, conflicts: [] },
      { entity: 'supplier', pulled: 1, pushed: 0, conflicts: [] },
    ];
  }
}
