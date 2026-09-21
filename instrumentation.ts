/**
 * Next.js instrumentation hook — the entry point the framework auto-loads.
 *
 * `onRequestError` receives every uncaught server-side error (route handlers,
 * server components, server actions) and pipes it into our self-hosted
 * monitoring (`error_events` table, migration 00015). All heavy imports are
 * dynamic so the hook itself stays cheap, and registration is env-gated so
 * builds without a database never touch it.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Runs once when a new server instance boots. Nothing to pre-warm —
  // the dynamic import inside onRequestError handles itself.
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | undefined> },
  context: { digest?: string },
) {
  try {
    const { logErrorEvent } = await import('@/lib/monitoring/instrumentation');
    await logErrorEvent({
      source: 'server',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? (error.stack ?? null) : null,
      digest: context?.digest ?? null,
      path: request?.path ?? null,
      userAgent: request?.headers?.['user-agent'] ?? null,
    });
  } catch {
    // Monitoring must never break the app.
  }
}
