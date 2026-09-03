let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.error || "api_error");
    this.status = status;
    this.body = body;
  }
}

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: unknown } = {},
  _retried = false
): Promise<T> {
  const method = options.method || "GET";
  if (!csrfToken && method !== "GET") {
    await fetchCsrfToken();
  }

  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(method !== "GET" && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 403 && !_retried) {
    const cloned = await res.clone().json().catch(() => ({}));
    if (cloned?.error === "invalid_csrf_token") {
      await fetchCsrfToken();
      return api<T>(path, options, true);
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export { fetchCsrfToken };
