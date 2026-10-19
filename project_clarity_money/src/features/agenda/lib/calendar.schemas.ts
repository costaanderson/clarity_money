import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  meet_link: z.string().max(500).optional().or(z.literal("")),
  start_at: z.string(),
  end_at: z.string(),
  client_id: z.string().uuid().nullable().optional(),
  is_personal: z.boolean().optional().default(false),
});

export type LocalEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  meet_link: string | null;
  start_at: string;
  end_at: string;
  google_event_id: string | null;
  is_personal: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  clients: { id: string; name: string; type: string } | null;
  from_google?: false;
};
