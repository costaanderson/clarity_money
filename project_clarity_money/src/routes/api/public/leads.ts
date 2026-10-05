import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import crypto from "crypto";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  utm_source: z.string().trim().max(120).optional(),
  utm_medium: z.string().trim().max(120).optional(),
  utm_campaign: z.string().trim().max(120).optional(),
  landing_url: z.string().trim().max(500).optional(),
  referrer: z.string().trim().max(500).optional(),
});

function hashToken(t: string) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Lead-Token",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/api/public/leads")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }: { request: Request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const token = request.headers.get("x-lead-token") ?? "";
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;

        if (!token) {
          return Response.json({ error: "missing token" }, { status: 401, headers: CORS });
        }

        // Rate limit per IP: 20 last minute
        if (ip) {
          const since = new Date(Date.now() - 60_000).toISOString();
          const { count } = await supabaseAdmin
            .from("lead_intake_log")
            .select("id", { count: "exact", head: true })
            .eq("ip", ip)
            .gte("created_at", since);
          if ((count ?? 0) > 20) {
            return Response.json({ error: "rate limited" }, { status: 429, headers: CORS });
          }
        }

        const { data: tk } = await supabaseAdmin
          .from("lead_intake_tokens")
          .select("id,user_id,active")
          .eq("token_hash", hashToken(token))
          .maybeSingle();

        if (!tk || !tk.active) {
          await supabaseAdmin.from("lead_intake_log").insert({ ip, ok: false, reason: "invalid token" });
          return Response.json({ error: "invalid token" }, { status: 401, headers: CORS });
        }

        let payload: z.infer<typeof bodySchema>;
        try {
          const raw = await request.json();
          payload = bodySchema.parse(raw);
        } catch (err) {
          await supabaseAdmin.from("lead_intake_log").insert({ token_id: tk.id, ip, ok: false, reason: "invalid payload" });
          return Response.json({ error: "invalid payload", detail: String(err) }, { status: 400, headers: CORS });
        }

        const { error: insErr } = await supabaseAdmin.from("clients").insert({
          user_id: tk.user_id,
          type: "PF",
          name: payload.name,
          email: payload.email || null,
          phone: payload.phone || null,
          status: "lead",
          source: "landing_page",
          source_campaign: payload.utm_campaign || null,
          utm_source: payload.utm_source || null,
          utm_medium: payload.utm_medium || null,
          utm_campaign: payload.utm_campaign || null,
          landing_url: payload.landing_url || null,
          referrer: payload.referrer || null,
        });

        if (insErr) {
          await supabaseAdmin.from("lead_intake_log").insert({ token_id: tk.id, ip, ok: false, reason: insErr.message });
          return Response.json({ error: "could not save lead" }, { status: 500, headers: CORS });
        }

        await supabaseAdmin.from("lead_intake_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tk.id);
        await supabaseAdmin.from("lead_intake_log").insert({ token_id: tk.id, ip, ok: true });

        return Response.json({ ok: true }, { status: 201, headers: CORS });
      },
    },
  },
});
