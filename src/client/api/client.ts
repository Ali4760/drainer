// src/client/api/client.ts
const API_BASE = '/api';

export async function get<T>(url: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${url}`);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`GET ${url} failed: ${resp.status} ${txt}`);
  }
  return (await resp.json()) as T;
}

export async function post<T>(url: string, body: any): Promise<T> {
  const resp = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`POST ${url} failed: ${resp.status} ${txt}`);
  }
  return (await resp.json()) as T;
}

const apiClient = { get, post };
export default apiClient;
