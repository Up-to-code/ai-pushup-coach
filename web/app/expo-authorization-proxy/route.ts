import { convexSiteUrl } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailable() {
  return new Response('Push Counter auth is not configured for this deployment.', { status: 503 });
}

export async function GET(request: Request) {
  if (!convexSiteUrl) return unavailable();

  const requestUrl = new URL(request.url);
  const targetUrl = new URL('/api/auth/expo-authorization-proxy', convexSiteUrl);
  targetUrl.search = requestUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('transfer-encoding');
  headers.set('accept-encoding', 'identity');
  headers.set('host', new URL(convexSiteUrl).host);
  headers.set('x-forwarded-host', requestUrl.host);
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(/:$/, ''));
  headers.set('x-better-auth-forwarded-host', requestUrl.host);
  headers.set('x-better-auth-forwarded-proto', requestUrl.protocol.replace(/:$/, ''));

  return fetch(targetUrl, {
    headers,
    method: 'GET',
    redirect: 'manual',
  });
}
