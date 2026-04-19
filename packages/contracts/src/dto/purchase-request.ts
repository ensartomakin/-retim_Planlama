import { z } from 'zod';

export const PurchaseRequestItemInput = z.object({
  materialId: z.string().uuid(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
  note: z.string().max(500).optional(),
});

export const CreatePurchaseRequestInput = z.object({
  orderId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
  items: z.array(PurchaseRequestItemInput).min(1),
});

export type CreatePurchaseRequestInput = z.infer<typeof CreatePurchaseRequestInput>;
