/**
 * Mikro ERP v16 — kanonik veri tipleri.
 * Mikro'nun gerçek tablo kolon adlarından SOYUTLANMIŞ görünümdür; adapter implementasyonları bu tipe dönüştürür.
 */

export interface MikroProduct {
  mikroId: string; // STOK_KODU
  code: string;
  name: string;
  uom: string;
  group?: string;
  price?: number;
  updatedAt: Date;
}

export interface MikroStockLevel {
  mikroProductId: string;
  warehouse: string;
  qtyOnHand: number;
  updatedAt: Date;
}

export interface MikroCustomerOrSupplier {
  mikroId: string; // CARI_KOD
  code: string;
  name: string;
  taxNumber?: string;
  type: 'customer' | 'supplier';
  updatedAt: Date;
}

export interface MikroPurchaseOrder {
  mikroId: string;
  supplierMikroId: string;
  items: Array<{ productMikroId: string; qty: number; unitPrice: number }>;
  dueDate: Date;
}

export interface MikroInvoice {
  mikroId: string;
  direction: 'incoming' | 'outgoing';
  counterpartyMikroId: string;
  total: number;
  items: Array<{ productMikroId: string; qty: number; unitPrice: number }>;
  issuedAt: Date;
}

export type MikroEntity =
  | 'product'
  | 'stock'
  | 'customer'
  | 'supplier'
  | 'purchase_order'
  | 'invoice';

export interface SyncResult<T> {
  entity: MikroEntity;
  pulled: number;
  pushed: number;
  conflicts: Array<{ mikroId: string; localId: string; reason: string; payload?: T }>;
}
