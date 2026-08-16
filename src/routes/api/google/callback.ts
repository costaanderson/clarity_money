import { createFileRoute } from "@tanstack/react-router";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/api/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // userId encoded as state
        const error = url.searchParams.get("error");

        const origin = url.origin;

        if (error || !code || !state) {
          return Response.redirect(`${origin}/configuracoes?error=google_auth_failed`);
        }

        const redirectUri = `${origin}/api/google/callback`;

        try {
          const { exchangeCodeForTokens } = await import(
            "@/features/agenda/lib/google-auth.functions"
          );
          await exchangeCodeForTokens(code, state, redirectUri);
          return Response.redirect(`${origin}/configuracoes?connected=1`);
        } catch (e) {
          console.error("[Google Calendar callback error]", e);
          return Response.redirect(`${origin}/configuracoes?error=google_auth_failed`);
        }
      },
    },
  },
});
