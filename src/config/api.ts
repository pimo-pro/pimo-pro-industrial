/** Origem da API central (Render). Vazio em dev → proxy Vite `/api` → localhost:5180 */
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** Base REST central: `/api` relativo (dev) ou `https://…onrender.com/api` (prod) */
export const CENTRAL_API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

export function centralWebSocketUrl(): string {
  if (API_ORIGIN) {
    const wsOrigin = API_ORIGIN.replace(/^http/i, 'ws');
    return `${wsOrigin}/ws`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}
