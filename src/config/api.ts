/** Endpoint da API industrial no Render (WebSocket directo; REST via proxy relativo). */
export const API_URL = 'https://pimo-pro-industrial-api.onrender.com';

/**
 * REST: em dev usa proxy Vite `/api`; em prod no host industrial usa `/api` relativo (.htaccess).
 * Override opcional: VITE_API_BASE_URL (ex.: URL Render absoluta).
 */
const API_ORIGIN =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  (import.meta.env.DEV ? '' : '');

/** WebSocket: Hostinger não faz proxy `/ws` — usar URL absoluta Render em produção. */
const WS_ORIGIN =
  (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  (import.meta.env.DEV ? '' : API_URL);

/** Base REST central: `/api` relativo (dev/prod industrial) ou URL absoluta se configurada. */
export const CENTRAL_API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

/** Rotas MES / projetos industriais. */
export const INDUSTRIAL_API_BASE = API_ORIGIN
  ? `${API_ORIGIN}/api/industrial`
  : '/api/industrial';

export function centralWebSocketUrl(): string {
  if (WS_ORIGIN) {
    const wsOrigin = WS_ORIGIN.replace(/^http/i, 'ws');
    return `${wsOrigin}/ws`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}
