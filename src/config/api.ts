/** Endpoint da API industrial no Render. */
export const API_URL = 'https://pimo-pro-industrial-api.onrender.com';

/** Origem efectiva: em dev vazio → proxy Vite `/api` → localhost:5180 */
const API_ORIGIN =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  (import.meta.env.DEV ? '' : API_URL);

/** Base REST central: `/api` relativo (dev) ou `${API_URL}/api` (prod) */
export const CENTRAL_API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

/** Rotas MES / projetos: middleware Vite em dev; API Render em prod */
export const INDUSTRIAL_API_BASE = API_ORIGIN
  ? `${API_ORIGIN}/api/industrial`
  : '/api/industrial';

export function centralWebSocketUrl(): string {
  if (API_ORIGIN) {
    const wsOrigin = API_ORIGIN.replace(/^http/i, 'ws');
    return `${wsOrigin}/ws`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}
