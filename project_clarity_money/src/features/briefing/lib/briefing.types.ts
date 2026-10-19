export type DateAlert = {
  clientId: string;
  clientName: string;
  type: "birthday" | "important_date";
  label: string;
  daysUntil: number;
};

export type RadarClient = {
  id: string;
  name: string;
  daysSinceContact: number | null;
  hasOpenTask: boolean;
};

export type RadarRule = {
  id: string;
  name: string;
  active: boolean;
  applies_to_status: string;
  trigger_days_no_contact: number;
  action: string;
  triggeredClients: RadarClient[];
};

export type BriefingMeeting = {
  id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  from_google: boolean;
  client: { id: string; name: string; type: string } | null;
  overdueTasks: { id: string; title: string; due_at: string | null }[];
};

export type BriefingTask = {
  id: string;
  title: string;
  due_at: string | null;
  client: { id: string; name: string } | null;
};

export type ClientWithoutMeeting = {
  id: string;
  name: string;
  type: string;
  daysSinceLastMeeting: number | null;
};

export type DailyBriefing = {
  date: string;
  meetings: BriefingMeeting[];
  overdueTasks: BriefingTask[];
  pendingCount: number;
  meetingCount: number;
  pjCount: number;
  loadScore: number;
  clientsWithoutMeeting: ClientWithoutMeeting[];
};
