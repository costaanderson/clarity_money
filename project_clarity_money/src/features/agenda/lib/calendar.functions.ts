import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  syncEventToGoogle,
  fetchGoogleEvents,
  deleteGoogleEvent,
  type GoogleEventItem,
} from "./google-calendar.functions";
import { getValidGoogleToken } from "./google-auth.functions";

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  meet_link: z.string().max(500).optional().or(z.literal("")),
  start_at: z.string(),
  end_at: z.string(),
  client_id: z.string().uuid().nullable().optional(),
});

// ─── Unified event type returned to the client ───────────────────────────────

type LocalEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  meet_link: string | null;
  start_at: string;
  end_at: string;
  google_event_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  clients: { id: string; name: string; type: string } | null;
  from_google?: false;
};

type MergedEvent = LocalEvent | (GoogleEventItem & {
  id: null;
  location: null;
  meet_link: null;
  user_id: null;
  created_at: null;
  updated_at: null;
  client_id: null;
  clients: null;
});

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { from?: string; to?: string; clientId?: string } | undefined) => input ?? {},
  )
  .handler(async ({ data, context }) => {
    // 1. Local events from Supabase
    let q = context.supabase
      .from("calendar_events")
      .select("*, clients(id,name,type)")
      .order("start_at");
    if (data.from) q = q.gte("start_at", data.from);
    if (data.to) q = q.lte("start_at", data.to);
    if (data.clientId) q = q.eq("client_id", data.clientId);
    const { data: localRows, error } = await q;
    if (error) throw new Error(error.message);

    const local = (localRows ?? []) as LocalEvent[];

    // 2. Google Calendar events (only when connected and time range provided)
    const googleConnected = !!(await getValidGoogleToken(context.userId));

    if (!googleConnected || !data.from || !data.to) {
      return local as MergedEvent[];
    }

    const googleEvents = await fetchGoogleEvents(context.userId, data.from, data.to);

    // Deduplicate: exclude Google events whose ID already exists in local records
    const localGoogleIds = new Set(local.map((e) => e.google_event_id).filter(Boolean));
    const uniqueGoogleEvents = googleEvents.filter(
      (e) => !localGoogleIds.has(e.google_event_id),
    );

    // Normalize Google events to merged shape
    const normalized: MergedEvent[] = uniqueGoogleEvents.map((e) => ({
      ...e,
      id: null,
      location: null,
      meet_link: null,
      user_id: null,
      created_at: null,
      updated_at: null,
      client_id: null,
      clients: null,
    }));

    // Merge and sort by start_at
    const merged: MergedEvent[] = [...local, ...normalized].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );

    return merged;
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("calendar_events")
      .insert({
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        meet_link: data.meet_link || null,
        start_at: data.start_at,
        end_at: data.end_at,
        client_id: data.client_id || null,
        user_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Sync to Google Calendar (non-blocking)
    let googleEventId: string | null = null;
    try {
      googleEventId = await syncEventToGoogle(context.userId, {
        title: data.title,
        description: data.description || null,
        start_at: data.start_at,
        end_at: data.end_at,
        meet_link: data.meet_link || null,
      });
      if (googleEventId) {
        await context.supabase
          .from("calendar_events")
          .update({ google_event_id: googleEventId })
          .eq("id", row.id);
      }
    } catch (e) {
      console.error("[createEvent] Google sync failed (non-fatal):", e);
    }

    return { ...row, google_event_id: googleEventId, syncedToGoogle: !!googleEventId };
  });

export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    eventSchema.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("calendar_events").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Fetch google_event_id before deleting
    const { data: row } = await context.supabase
      .from("calendar_events")
      .select("google_event_id")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("calendar_events")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Remove from Google Calendar (non-blocking)
    if (row?.google_event_id) {
      try {
        await deleteGoogleEvent(context.userId, row.google_event_id);
      } catch (e) {
        console.error("[deleteEvent] Google delete failed (non-fatal):", e);
      }
    }

    return { ok: true };
  });
