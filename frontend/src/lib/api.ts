export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function handleJson(res: Response, url: string) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    console.error(`[api] ${url} → HTTP ${res.status}. Preview:\n${text.slice(0, 200)}`);
    throw new Error(`${url} HTTP ${res.status}`);
  }
  if (!ct.includes("application/json")) {
    console.error(`[api] ${url} → non-JSON (${ct}). Preview:\n${text.slice(0, 200)}`);
    throw new Error(`${url} returned non-JSON`);
  }
  return JSON.parse(text);
}

export async function getJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { credentials: "omit" });
  return handleJson(res, url);
}

export async function getBlob(path: string): Promise<Blob> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "GET", credentials: "omit" });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[api] ${url} → HTTP ${res.status}. Preview:\n${text.slice(0, 200)}`);
    throw new Error(`${url} HTTP ${res.status}`);
  }
  return res.blob();
}
