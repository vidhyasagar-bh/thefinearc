import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ isolated: void }>({
  isolated: [async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    await context.routeWebSocket('**/*', socket => {
      if (new URL(socket.url()).host === new URL(origin).host) socket.connectToServer();
      else socket.close();
    });
    // Install before navigation. Every API response is synthetic, including on previews.
    await context.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/admin' && url.searchParams.get('action') === 'session')
          return route.fulfill({ json: { authed: false } });
        if (url.pathname === '/api/shipping-rates' && req.method() === 'GET')
          return route.fulfill({ json: { enabled: false, countries: ['US'] } });
        return route.fulfill({ status: 503, json: { error: 'Test service unavailable' } });
      }
      if (url.origin === origin && ['GET', 'HEAD'].includes(req.method())) return route.continue();
      if (req.resourceType() === 'image') {
        if (process.env.E2E_REAL_IMAGES === '1') return route.continue();
        return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#c7b9a2"/></svg>' });
      }
      // No real Stripe.js, Supabase, SMTP, analytics, or third-party writes.
      return route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
    });
    // Preview builds may contain production credentials; force all catalog reads to demo data.
    await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await use();
  }, { auto: true }],
});
export { expect };
