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
      .select("google_email, folder_id, folder_name")
      .eq("user_id", context.userId)
      .maybeSingle();

    return {
      connected: !!data,
      email: (data as any)?.google_email ?? null,
      folderId: (data as any)?.folder_id ?? null,
      folderName: (data as any)?.folder_name ?? null,
    };
  });

export const saveDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ folderUrl: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Extrai o ID da pasta de uma URL do Drive ou aceita um ID bruto
    const match = data.folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = match ? match[1] : data.folderUrl.trim();

    // Valida via Drive API e obtém o nome da pasta
    const { getValidGoogleDriveToken } = await import("@/features/agenda/lib/google-auth.functions");
    const token = await getValidGoogleDriveToken(context.userId);
    if (!token) throw new Error("Google Drive não está conectado.");

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      if (res.status === 404) throw new Error("Pasta não encontrada. Verifique se a URL está correta e se você tem acesso.");
      throw new Error("Não foi possível acessar a pasta no Google Drive.");
    }

    const file = await res.json();
    if (file.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error("O link informado não é uma pasta do Google Drive.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("google_drive_tokens")
      .update({ folder_id: file.id, folder_name: file.name })
      .eq("user_id", context.userId);

    return { folderId: file.id, folderName: file.name as string };
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
