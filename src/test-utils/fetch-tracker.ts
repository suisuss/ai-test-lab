/**
 * Fetch Tracker
 *
 * Intercepts window.fetch in development mode to track all in-flight
 * requests. Exposes two window globals for test introspection:
 *
 * - window.__TEST_PENDING_REQUESTS__() — array of { method, url, startedAt }
 * - window.__TEST_NETWORK_IDLE__() — true when no requests are in-flight
 */

type PendingEntry = {
  method: string;
  url: string;
  startedAt: number;
};

export function installFetchTracker() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;
  const pending = new Map<number, PendingEntry>();
  let counter = 0;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const id = ++counter;
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method || "GET";

    pending.set(id, { method, url, startedAt: Date.now() });

    try {
      const response = await originalFetch.call(this, input, init);
      pending.delete(id);
      return response;
    } catch (error) {
      pending.delete(id);
      throw error;
    }
  };

  (window as any).__TEST_PENDING_REQUESTS__ = (): PendingEntry[] =>
    Array.from(pending.values());

  (window as any).__TEST_NETWORK_IDLE__ = (): boolean => pending.size === 0;
}
