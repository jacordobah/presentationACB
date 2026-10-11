type Service = "admin" | "geo";
type QueryValue = string | number | null | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  form?: FormData;
  authenticated?: boolean;
}

const BASE_PATHS: Record<Service, string> = {
  admin: "/api/admin",
  geo: "/api/geo",
};

const GEO_UPSTREAM_PREFIX = "/api/v1/";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let sessionToken: string | null = null;
let handleUnauthorized: () => void = () => undefined;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export function onUnauthorized(handler: () => void) {
  handleUnauthorized = handler;
}

function buildUrl(
  service: Service,
  path: string,
  query?: RequestOptions["query"],
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return `${BASE_PATHS[service]}/${path}${search ? `?${search}` : ""}`;
}

function fallbackMessage(status: number) {
  if (status === 403) return "No tienes permiso para hacer esto.";
  if (status === 404) return "No encontramos lo que buscas.";
  if (status >= 502 && status <= 504) {
    return "El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.";
  }
  return "Algo salió mal. Intenta de nuevo.";
}

// Admin errors come as { message } (Spring) and geo errors as { detail }
// (FastAPI), where a FastAPI validation error carries a list of issues instead
// of a string.
async function readErrorMessage(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object") {
    const { message, detail } = body as { message?: unknown; detail?: unknown };
    if (typeof message === "string") return message;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const issues = detail
        .map((issue: { msg?: unknown }) => issue?.msg)
        .filter((msg): msg is string => typeof msg === "string");
      if (issues.length > 0) return issues.join(" ");
    }
  }
  return fallbackMessage(response.status);
}

function authorizationHeader(): Record<string, string> {
  return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
}

async function send(url: string, init: RequestInit, authenticated: boolean) {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(
      0,
      "No hay conexión con el servidor. Revisa tu conexión a internet e intenta de nuevo.",
    );
  }
  if (response.status === 401 && authenticated) handleUnauthorized();
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  return response;
}

export async function request<T>(
  service: Service,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const authenticated = options.authenticated ?? true;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(authenticated ? authorizationHeader() : {}),
  };
  let body: BodyInit | undefined = options.form;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const response = await send(
    buildUrl(service, path, options.query),
    { method: options.method ?? "GET", headers, body },
    authenticated,
  );
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function fetchBlob(url: string) {
  const response = await send(url, { headers: authorizationHeader() }, true);
  return response.blob();
}

// The geo API returns URLs on its own /api/v1 prefix; the browser reaches it
// through /api/geo.
export function geoPublicUrl(url: string) {
  return url.startsWith(GEO_UPSTREAM_PREFIX)
    ? `${BASE_PATHS.geo}/${url.slice(GEO_UPSTREAM_PREFIX.length)}`
    : url;
}
