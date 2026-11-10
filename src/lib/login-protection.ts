// In-memory sliding-window limiter — single-host only, matching the file-based store.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failuresByKey = new Map<string, number[]>();

function prune(timestamps: number[]) {
  const cutoff = Date.now() - WINDOW_MS;
  return timestamps.filter((ts) => ts > cutoff);
}

export function isRateLimited(key: string) {
  const failures = prune(failuresByKey.get(key) ?? []);
  failuresByKey.set(key, failures);

  if (failures.length < MAX_FAILURES) {
    return { limited: false as const };
  }

  const retryAfterSeconds = Math.ceil((failures[0] + WINDOW_MS - Date.now()) / 1000);
  return { limited: true as const, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
}

export function recordFailure(key: string) {
  const failures = prune(failuresByKey.get(key) ?? []);
  failures.push(Date.now());
  failuresByKey.set(key, failures);
}

export function clearFailures(key: string) {
  failuresByKey.delete(key);
}

export function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// Blocks login CSRF: cross-site form posts carry a mismatched (or missing) Origin.
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true; // non-browser clients (curl, tests) send no Origin
  }
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
