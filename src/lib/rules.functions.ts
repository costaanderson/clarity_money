import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ruleSchema = z.object({
  name: z.string().min(1).max(120),
  active: z.boolean().default(true),
  applies_to_status: z.enum(["lead", "ativo", "arquivado"]).default("lead"),
  trigger_days_no_contact: z.number().int().min(1).max(365).default(14),
  action: z.enum(["task", "email", "ambos"]).default("task"),
  email_subject: z.string().max(200).optional().or(z.literal("")),
  email_body_template: z.string().max(4000).optional().or(z.literal("")),
});

export const listRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("activation_rules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ruleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("activation_rules")
      .insert({
        ...data,
        email_subject: data.email_subject || null,
        email_body_template: data.email_body_template || null,
        user_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    ruleSchema.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("activation_rules").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("activation_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Runs enabled activation rules: finds clients that haven't had contact
 * for more than the trigger window and creates tasks (and email drafts) for them.
 */
export const runActivationRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rules } = await context.supabase
      .from("activation_rules")
      .select("*")
      .eq("active", true);
    if (!rules || rules.length === 0) return { created: 0 };

    let created = 0;

    for (const rule of rules) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - rule.trigger_days_no_contact);

      const { data: clients } = await context.supabase
        .from("clients")
        .select("id,name,last_contact_at,created_at")
        .eq("status", rule.applies_to_status)
        .or(`last_contact_at.lt.${threshold.toISOString()},last_contact_at.is.null`);

      if (!clients) continue;

      for (const client of clients) {
        const ref = client.last_contact_at ?? client.created_at;
        if (ref && new Date(ref) > threshold) continue;

        // Skip if an open activation task already exists for this client
        const { data: existing } = await context.supabase
          .from("tasks")
          .select("id")
          .eq("client_id", client.id)
          .eq("source", "regra_ativacao")
          .eq("status", "pendente")
          .limit(1);
        if (existing && existing.length > 0) continue;

        if (rule.action === "task" || rule.action === "ambos") {
          const due = new Date();
          due.setDate(due.getDate() + 1);
          const { error } = await context.supabase.from("tasks").insert({
            user_id: context.userId,
            client_id: client.id,
            title: `Reativar: ${client.name}`,
            description: `Regra "${rule.name}" — sem contato há ${rule.trigger_days_no_contact}+ dias.`,
            due_at: due.toISOString(),
            source: "regra_ativacao",
          });
          if (!error) created++;
        }
      }
    }

    return { created };
  });
