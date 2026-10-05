import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Bússola CRM" },
      { name: "description", content: "Acesse seu CRM comportamental." },
    ],
  }),
});
