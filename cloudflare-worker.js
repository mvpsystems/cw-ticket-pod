/**
 * ConnectWise API CORS Proxy — Cloudflare Worker
 *
 * DEPLOYMENT (one-time, ~5 min)
 *   1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create Worker
 *   2. Name it (e.g. "cw-api-proxy"), click Deploy, then Edit Code
 *   3. Replace all starter code with the contents of this file
 *   4. Click Save & Deploy
 *   5. Go to Settings -> Variables and Secrets -> Add Environment Variables:
 *        CW_COMPANY_ID  ->  mvptech
 *        CW_CLIENT_ID   ->  (your ConnectWise Client ID)
 *        CW_PUBLIC_KEY  ->  (your API member public key)
 *        CW_PRIVATE_KEY ->  (your private key -- click Encrypt)
 *   6. Copy the Worker URL shown at the top (e.g. https://cw-api-proxy.mvpsystems.workers.dev)
 *   7. Paste it into ticket-pod.html CONFIG.API_BASE:
 *        API_BASE: 'https://cw-api-proxy.mvpsystems.workers.dev/v4_6_release/apis/3.0'
 *   8. Commit and push ticket-pod.html -- pod will start working immediately.
 *
 * FREE TIER: 100,000 requests/day -- plenty for an internal pod.
 */

const ALLOWED_ORIGIN = 'https://mvpsystems.github.io';
const CW_API_BASE    = 'https://api-na.myconnectwise.net';

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age':       '86400',
        }
      });
    }

    // Only serve our pod origin
    const origin = request.headers.get('Origin') || '';
    if (origin !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 });
    }

    // Read-only -- only allow GET
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Build upstream CW API URL
    const url      = new URL(request.url);
    const upstream = CW_API_BASE + url.pathname + url.search;

    // Auth -- credentials live here in env vars, never in the browser
    const auth = btoa(env.CW_COMPANY_ID + '+' + env.CW_PUBLIC_KEY + ':' + env.CW_PRIVATE_KEY);

    // Call CW API server-to-server (no CORS restriction)
    let apiResp;
    try {
      apiResp = await fetch(upstream, {
        headers: {
          'Authorization': 'Basic ' + auth,
          'clientId':      env.CW_CLIENT_ID,
          'Content-Type':  'application/json',
          'Accept':        'application/json',
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }), {
        status: 502,
        headers: {
          'Content-Type':                'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        }
      });
    }

    // Return with CORS headers so the browser accepts it
    const body        = await apiResp.arrayBuffer();
    const contentType = apiResp.headers.get('Content-Type') || 'application/json';

    return new Response(body, {
      status: apiResp.status,
      headers: {
        'Content-Type':                 contentType,
        'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control':                'no-store',
      }
    });
  }
};
