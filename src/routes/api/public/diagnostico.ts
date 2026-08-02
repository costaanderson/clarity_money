import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const answerSchema = z.object({
  question: z.string().max(500),
  answer: z.string().max(300),
  value: z.number().int().min(0).max(10),
});

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  score: z.number().int().min(0).max(1000),
  max_score: z.number().int().min(0).max(1000),
  stage_key: z.string().max(60),
  stage_label: z.string().max(120),
  answers: z.array(answerSchema).max(50),
  utm_source: z.string().trim().max(120).optional(),
  utm_medium: z.string().trim().max(120).optional(),
  utm_campaign: z.string().trim().max(120).optional(),
  utm_content: z.string().trim().max(120).optional(),
  landing_url: z.string().trim().max(500).optional(),
  referrer: z.string().trim().max(500).optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function mapSource(utmSource?: string): "instagram" | "google_ads" | "landing_page" {
  const s = (utmSource ?? "").toLowerCase().trim();
  if (s === "instagram" || s === "ig" || s === "meta") return "instagram";
  if (["google", "google_ads", "googleads", "adwords", "gads"].includes(s)) return "google_ads";
  return "landing_page";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/api/public/diagnostico")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }: { request: Request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;

        // Rate-limit por IP: 10/min
        if (ip) {
          const since = new Date(Date.now() - 60_000).toISOString();
          const { count } = await supabaseAdmin
            .from("lead_intake_log")
            .select("id", { count: "exact", head: true })
            .eq("ip", ip)
            .gte("created_at", since);
          if ((count ?? 0) > 10) {
            return Response.json({ error: "rate limited" }, { status: 429, headers: CORS });
          }
        }

        let payload: z.infer<typeof bodySchema>;
        try {
          const raw = await request.json();
          payload = bodySchema.parse(raw);
        } catch (err) {
          await supabaseAdmin.from("lead_intake_log").insert({ ip, ok: false, reason: "invalid payload" });
          return Response.json({ error: "invalid payload", detail: String(err) }, { status: 400, headers: CORS });
        }

        // Descobre o dono (app single-user): o primeiro profile por created_at.
        const { data: owner, error: ownerErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (ownerErr || !owner) {
          return Response.json({ error: "app não configurado" }, { status: 500, headers: CORS });
        }

        const source = mapSource(payload.utm_source);

        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("clients")
          .insert({
            user_id: owner.id,
            type: "PF",
            name: payload.name,
            email: payload.email || null,
            phone: payload.phone || null,
            status: "lead",
            source,
            source_campaign: payload.utm_campaign || null,
            utm_source: payload.utm_source || null,
            utm_medium: payload.utm_medium || null,
            utm_campaign: payload.utm_campaign || null,
            landing_url: payload.landing_url || null,
            referrer: payload.referrer || null,
          })
          .select("id")
          .single();

        if (insErr || !inserted) {
          await supabaseAdmin.from("lead_intake_log").insert({ ip, ok: false, reason: insErr?.message ?? "insert failed" });
          return Response.json({ error: "não foi possível salvar o lead" }, { status: 500, headers: CORS });
        }

        const { error: diagErr } = await supabaseAdmin.from("client_diagnostics").insert({
          client_id: inserted.id,
          user_id: owner.id,
          diagnostic_type: "sono_financeiro",
          score: payload.score,
          max_score: payload.max_score,
          stage_key: payload.stage_key,
          stage_label: payload.stage_label,
          answers: payload.answers,
        });
        if (diagErr) {
          await supabaseAdmin.from("lead_intake_log").insert({ ip, ok: false, reason: `diag: ${diagErr.message}` });
        }

        await supabaseAdmin.from("lead_intake_log").insert({ ip, ok: true, reason: "diagnostico" });
        return Response.json({ ok: true }, { status: 201, headers: CORS });
      },
    },
  },
});
