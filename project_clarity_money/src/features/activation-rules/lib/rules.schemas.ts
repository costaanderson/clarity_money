import { z } from "zod";

export const ruleSchema = z.object({
  name: z.string().min(1).max(120),
  active: z.boolean().default(true),
  applies_to_status: z.enum(["lead", "ativo", "arquivado"]).default("lead"),
  trigger_days_no_contact: z.number().int().min(1).max(365).default(14),
  action: z.enum(["task", "email", "ambos"]).default("task"),
  email_subject: z.string().max(200).optional().or(z.literal("")),
  email_body_template: z.string().max(4000).optional().or(z.literal("")),
});
