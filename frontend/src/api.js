// Cliente HTTP único: agrega el JWT, normaliza errores y avisa si la sesión expiró.
const TOKEN_KEY = "studyflow.token";
const USER_KEY = "studyflow.user";

export const storage = {
  getToken: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  getUser: () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  save(token, user) { try { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* sin almacenamiento */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* sin almacenamiento */ } },
};

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

export async function api(path, { method = "GET", body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v); });
  const headers = {};
  const token = storage.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("studyflow:unauthorized"));
    throw new ApiError(res.status, data.error || "Ocurrió un error inesperado.");
  }
  return data;
}
