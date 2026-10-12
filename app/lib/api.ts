export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response = await fetch(path, { ...options, headers });
  const isRefreshEndpoint = path === "/api/auth/refresh" || path.startsWith("/api/auth/refresh?");
  if (response.status === 401 && !isRefreshEndpoint) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    if (refreshResponse.ok) {
      const refreshPayload: unknown = await refreshResponse.json().catch(() => null);
      const refreshedAccessToken = typeof refreshPayload === "object" && refreshPayload !== null &&
        "accessToken" in refreshPayload && typeof refreshPayload.accessToken === "string"
        ? refreshPayload.accessToken
        : null;
      if (refreshedAccessToken) {
        headers.set("Authorization", `Bearer ${refreshedAccessToken}`);
        response = await fetch(path, { ...options, headers });
      }
    }
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload &&
      typeof payload.error === "object" && payload.error !== null && "message" in payload.error &&
      typeof payload.error.message === "string"
      ? payload.error.message
      : "The request could not be completed.";
    throw new Error(message);
  }

  return payload as T;
}
