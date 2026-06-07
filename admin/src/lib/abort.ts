/**
 * Create an AbortSignal that fires after `ms` milliseconds.
 * Falls back to a manual AbortController for environments where
 * AbortSignal.timeout is not available.
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).timeout === "function") {
    return (AbortSignal as any).timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException("Timeout", "TimeoutError")), ms);
  return controller.signal;
}

/**
 * Race a promise against a timeout. Resolves to a fallback value on timeout.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[withTimeout] Operation exceeded ${ms}ms, using fallback`);
      resolve(fallback);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
