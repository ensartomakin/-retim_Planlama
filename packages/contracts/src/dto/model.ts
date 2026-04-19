import { z } from 'zod';

export const ModelStatusSchema = z.enum([
  'TASLAK',
  'NUMUNE_HAZIRLANIYOR',
  'REVIZE',
  'ONAYLANDI',
  'IPTAL',
]);

export const CreateModelInput = z.object({
  code: z.string().min(3).max(64),
  name: z.string().min(2).max(160),
  customerId: z.string().uuid(),
  seasonId: z.string().uuid(),
  category: z.string().min(2).max(64),
  designerId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
});

export const UpdateModelInput = CreateModelInput.partial().extend({
  id: z.string().uuid(),
});

export type CreateModelInput = z.infer<typeof CreateModelInput>;
export type UpdateModelInput = z.infer<typeof UpdateModelInput>;
