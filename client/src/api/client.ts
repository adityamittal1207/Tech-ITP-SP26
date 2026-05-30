const API_BASE = import.meta.env.VITE_API_URL || "/api";

type ApiRequestOptions = RequestInit & {
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}
