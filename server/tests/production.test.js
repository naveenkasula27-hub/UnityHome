import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';

process.env.NODE_ENV = 'production';
process.env.VERCEL = '1';
process.env.VERCEL_URL = 'unityhome-preview-check.vercel.app';
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'unityhome-production-check.vercel.app';
process.env.CLIENT_ORIGIN = 'https://homes.example';
const {createApp} = await import('../src/app.js');
const {cookieOptions} = await import('../src/middleware/auth.js');
let server, base;
before(async () => {
  server = createApp({serveClient: false, trustProxy: 1}).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));});

test('production accepts the exact project, preview and custom origins', async () => {
  for (const origin of ['https://homes.example', 'https://unityhome-preview-check.vercel.app', 'https://unityhome-production-check.vercel.app']) {
    const response = await fetch(base + '/api/auth/logout', {
      method: 'POST', headers: {Origin: origin, 'X-Forwarded-For': '192.0.2.1'}
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  }
  assert.equal(cookieOptions.secure, true);
  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.sameSite, 'lax');
});

test('production rejects unrelated Vercel domains and local development origins', async () => {
  for (const origin of ['https://unrelated-project.vercel.app', 'http://127.0.0.1:5174']) {
    const response = await fetch(base + '/api/auth/logout', {method: 'POST', headers: {Origin: origin}});
    assert.equal(response.status, 403);
  }
});
