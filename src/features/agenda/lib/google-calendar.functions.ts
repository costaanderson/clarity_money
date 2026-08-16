import { getValidGoogleToken } from "./google-auth.functions";

const GCAL_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// ─── Internal helpers (called from calendar.functions.ts server handlers) ────

export async function syncEventToGoogle(
  userId: string,
  event: {
    title: string;
    description?: string | null;
    start_at: string;
    end_at: string;
    meet_link?: string | null;
  },
): Promise<string | null> {
  const token = await getValidGoogleToken(userId);
  if (!token) return null;

  const body: Record<string, unknown> = {
    summary: event.title,
    start: { dateTime: event.start_at, timeZone: "America/Sao_Paulo" },
    end: { dateTime: event.end_at, timeZone: "America/Sao_Paulo" },
  };
  if (event.description) body.description = event.description;
  if (event.meet_link) body.location = event.meet_link;

  const resp = await fetch(GCAL_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error("[syncEventToGoogle] failed:", await resp.text());
    return null;
  }

  const created = await resp.json();
  return (created.id as string) ?? null;
}

export type GoogleEventItem = {
  google_event_id: string;
  title: string;
  start_at: string;
  end_at: string;
  description: string | null;
  from_google: true;
};

export async function fetchGoogleEvents(
  userId: string,
  from: string,
  to: string,
): Promise<GoogleEventItem[]> {
  const token = await getValidGoogleToken(userId);
  if (!token) return [];

  const params = new URLSearchParams({
    timeMin: from,
    timeMax: to,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const resp = await fetch(`${GCAL_BASE}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    console.error("[fetchGoogleEvents] failed:", await resp.text());
    return [];
  }

  const json = await resp.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.items ?? []).flatMap((e: any) => {
    if (!e.start?.dateTime || !e.end?.dateTime) return [];
    return [
      {
        google_event_id: e.id as string,
        title: (e.summary as string) ?? "(sem título)",
        start_at: e.start.dateTime as string,
        end_at: e.end.dateTime as string,
        description: (e.description as string) ?? null,
        from_google: true as const,
      },
    ];
  });
}

export async function deleteGoogleEvent(
  userId: string,
  googleEventId: string,
): Promise<void> {
  const token = await getValidGoogleToken(userId);
  if (!token) return;

  const resp = await fetch(`${GCAL_BASE}/${googleEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  // 404 / 410 = already gone, ignore
  if (!resp.ok && resp.status !== 404 && resp.status !== 410) {
    console.error("[deleteGoogleEvent] failed:", googleEventId, resp.status);
  }
}
