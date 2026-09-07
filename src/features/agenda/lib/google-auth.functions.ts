import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// ─── State encoding: "userId|service" ────────────────────────────────────────

function encodeState(userId: string, service: "calendar" | "drive") {
  return `${userId}|${service}`;
}

export function decodeState(state: string): { userId: string; service: "calendar" | "drive" } {
  const [userId, service] = state.split("|");
  return { userId, service: (service === "drive" ? "drive" : "calendar") as "calendar" | "drive" };
}

// ─── Google Calendar ──────────────────────────────────────────────────────────

export const getGoogleAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { redirectUri: string }) =>
    z.object({ redirectUri: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID não configurado");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: data.redirectUri,
      response_type: "code",
      scope: CALENDAR_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: encodeState(context.userId, "calendar"),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  });

export const getGoogleConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("google_email")
      .eq("user_id", context.userId)
      .maybeSingle();

    return { connected: !!data, email: data?.google_email ?? null };
  });

export const revokeGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", context.userId);
    return { ok: true };
  });

// ─── Google Drive ─────────────────────────────────────────────────────────────

export const getGoogleDriveAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { redirectUri: string }) =>
    z.object({ redirectUri: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID não configurado");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: data.redirectUri,
      response_type: "code",
      scope: DRIVE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: encodeState(context.userId, "drive"),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  });

export const getGoogleDriveConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("google_drive_tokens")
      .select("google_email")
      .eq("user_id", context.userId)
      .maybeSingle();

    return { connected: !!data, email: (data as any)?.google_email ?? null };
  });

export const revokeGoogleDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("google_drive_tokens")
      .delete()
      .eq("user_id", context.userId);
    return { ok: true };
  });

// ─── Internal helpers (server-only) ──────────────────────────────────────────

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ui.ok) return (await ui.json()).email ?? null;
  } catch {}
  return null;
}

export async function exchangeCodeForTokens(
  code: string,
  userId: string,
  redirectUri: string,
  service: "calendar" | "drive" = "calendar",
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Google token exchange failed: ${body}`);
  }

  const tokens = await resp.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const email = await fetchGoogleEmail(tokens.access_token);

  const table = service === "drive" ? "google_drive_tokens" : "google_calendar_tokens";

  await (supabaseAdmin as any).from(table).upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    google_email: email,
  });
}

async function getValidToken(
  userId: string,
  table: "google_calendar_tokens" | "google_drive_tokens",
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row } = await (supabaseAdmin as any)
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) return null;

  const expiresAt = new Date((row as any).expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return (row as any).access_token;

  // Token expirado — renovar com refresh_token
  try {
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: (row as any).refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!resp.ok) return null;

    const newTokens = await resp.json();
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

    await (supabaseAdmin as any)
      .from(table)
      .update({ access_token: newTokens.access_token, expires_at: newExpiresAt })
      .eq("user_id", userId);

    return newTokens.access_token;
  } catch {
    return null;
  }
}

export async function getValidGoogleToken(userId: string): Promise<string | null> {
  return getValidToken(userId, "google_calendar_tokens");
}

export async function getValidGoogleDriveToken(userId: string): Promise<string | null> {
  return getValidToken(userId, "google_drive_tokens");
}
