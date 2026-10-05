export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  console.error("[error]", {
    message: error instanceof Error ? error.message : String(error),
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...context,
  });
}
