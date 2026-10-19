import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  due_at: z.string().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  due_at: z.string().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
});
