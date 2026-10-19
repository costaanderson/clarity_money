export const CLIENT_SOURCES = [
  { key: "instagram", label: "Instagram" },
  { key: "google_ads", label: "Google Ads" },
  { key: "landing_page", label: "Landing Page" },
  { key: "indicacao", label: "Indicação" },
  { key: "outro", label: "Manual / Outro" },
] as const;

export type ClientSource = (typeof CLIENT_SOURCES)[number]["key"];
