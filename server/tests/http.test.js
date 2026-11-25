import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../src/app.js';
let server,base;
before(async()=>{server=createApp().listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))});
test('health works before a MongoDB connection is established',async()=>{const r=await fetch(base+'/api/health');assert.equal(r.status,200);const d=await r.json();assert.equal(d.service,'unityhome-api');assert.equal(d.database.ready,false);assert(!JSON.stringify(d).includes('mongodb+srv://'))});
test('readiness remains unavailable until MongoDB is connected',async()=>{const r=await fetch(base+'/api/ready');assert.equal(r.status,503);assert.deepEqual(await r.json(),{ready:false})});
test('anonymous visitors cannot access staff data or create leads',async()=>{assert.equal((await fetch(base+'/api/state?view=staff')).status,401);assert.equal((await fetch(base+'/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'lead',data:{}})})).status,401)});
test('public catalog fallback does not expose agency customer data',async()=>{const r=await fetch(base+'/api/state?view=buyer');assert.equal(r.status,200);const d=await r.json();assert.equal(d.identity,null);assert(d.records.every(x=>x.kind==='settings'))});
test('cross-origin cookie writes are blocked',async()=>{const r=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:'https://untrusted.example'}});assert.equal(r.status,403)});
test('malformed JSON is rejected and API routes do not fall through to the SPA',async()=>{const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(r.status,400);assert.equal((await fetch(base+'/api/does-not-exist')).status,404)});

test('serverless API waits for database preparation, while health stays available', async () => {
  let calls = 0;
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  const instance = createApp({serveClient: false, prepareDatabase: async () => {calls++; await gate;}}).listen(0, '127.0.0.1');
  await once(instance, 'listening');
  const url = 'http://127.0.0.1:' + instance.address().port;
  try {
    assert.equal((await fetch(url + '/api/health')).status, 200);
    assert.equal(calls, 0);
    const pending = fetch(url + '/api/state?view=staff');
    // Health is responsive even while a data request is initializing.
    assert.equal((await fetch(url + '/api/health')).status, 200);
    release();
    assert.equal((await pending).status, 401);
    assert.equal(calls, 1);
    assert.equal((await fetch(url + '/dashboard')).status, 404);
  } finally {
    release();
    instance.closeAllConnections();
    await new Promise(resolve => instance.close(resolve));
  }
});
