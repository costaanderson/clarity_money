import { z } from "zod";

export const importantDateSchema = z.object({
  label: z.string().min(1).max(120),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  year: z.number().int().min(1900).max(2100).nullable(),
});

export type ImportantDate = z.infer<typeof importantDateSchema>;

export const clientSchema = z.object({
  type: z.enum(["PF", "PJ"]),
  name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  document: z.string().max(50).optional().or(z.literal("")),
  status: z.enum(["lead", "ativo", "arquivado"]).default("lead"),
  category_id: z.string().uuid().nullable().optional(),
  source: z
    .enum(["instagram", "google_ads", "landing_page", "indicacao", "outro"])
    .default("outro"),
  source_campaign: z.string().max(120).optional().or(z.literal("")),
  pipeline_stage: z
    .enum([
      "novo",
      "primeiro_contato",
      "reuniao_agendada",
      "reuniao_realizada",
      "fechamento",
      "contrato_enviado",
      "em_andamento",
    ])
    .optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  important_dates: z.array(importantDateSchema).nullable().optional(),
});
