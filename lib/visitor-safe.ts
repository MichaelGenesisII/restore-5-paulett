/**
 * Messages safe to show visitors. Never forward raw provider / infra errors.
 */

const TECH_LEAK =
  /\b(supabase|stripe|prisma|postgres|postgresql|resend|webhook|api[_ ]?key|service[_ ]?role|auth\.admin|EPERM|ECONN|ETL|stack|exception|undefined is not|cannot read propert|fetch failed|ENOTFOUND|ECONNREFUSED|JWT|anon key|NEXT_PUBLIC_|SECRET_KEY|query_engine|pooler)\b/i;

/** True when a string looks like it would expose infrastructure. */
export function looksTechnical(message: string): boolean {
  return TECH_LEAK.test(message);
}

/**
 * Prefer a known visitor-safe API message (usually HTTP 400 validation).
 * Otherwise use the fallback — never surface raw backend/provider text.
 */
export function visitorSafeMessage(
  candidate: string | null | undefined,
  fallback: string,
): string {
  const trimmed = candidate?.trim();
  if (!trimmed) return fallback;
  if (looksTechnical(trimmed)) return fallback;
  // Cap length so a dumped stack/body never fills a toast.
  if (trimmed.length > 180) return fallback;
  return trimmed;
}

/**
 * Only trust API `error` strings on validation responses (4xx).
 * Server failures (5xx) always use the fallback.
 */
export function visitorSafeApiError(
  status: number,
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (status >= 500 || status === 0) return fallback;
  if (status >= 400 && status < 500) {
    return visitorSafeMessage(candidate, fallback);
  }
  return fallback;
}

export class VisitorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisitorError";
  }
}

export function isVisitorError(error: unknown): error is VisitorError {
  return error instanceof VisitorError;
}
