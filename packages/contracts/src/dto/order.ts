import { z } from 'zod';

export const OrderVariantInput = z.object({
  colorId: z.string().uuid(),
  sizeId: z.string().uuid(),
  qty: z.number().int().positive(),
});

export const CreateOrderInput = z
  .object({
    code: z.string().optional(),
    modelId: z.string().uuid(),
    workshopId: z.string().uuid().optional(),
    totalQty: z.number().int().positive(),
    dueDate: z.coerce.date().optional(),
    variants: z.array(OrderVariantInput).min(1),
  })
  .refine(
    (d) => d.variants.reduce((a, v) => a + v.qty, 0) === d.totalQty,
    { message: 'Asorti toplamı sipariş adediyle eşleşmiyor', path: ['variants'] },
  );

export type CreateOrderInput = z.infer<typeof CreateOrderInput>;

export const OrderCodeFormat = {
  /** SO-YYYY-NNNNNN */
  build(seq: number, year = new Date().getFullYear()): string {
    return `SO-${year}-${String(seq).padStart(6, '0')}`;
  },
};

export const WorkOrderCodeFormat = {
  /** WO-YYYY-NNNNNN-PP */
  build(seq: number, batch: number, year = new Date().getFullYear()): string {
    return `WO-${year}-${String(seq).padStart(6, '0')}-${String(batch).padStart(2, '0')}`;
  },
};
