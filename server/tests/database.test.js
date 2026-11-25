import test, {afterEach, mock} from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unityhome_test';
process.env.DNS_SERVERS = '';
const {default: mongoose} = await import('mongoose');
const {connectDatabase, databaseStatus} = await import('../src/config/database.js');

afterEach(() => {mock.restoreAll(); mongoose.connection.readyState = 0;});

test('cold requests share a connection and warm requests reuse it', async () => {
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  const connect = mock.method(mongoose, 'connect', async () => {
    await gate;
    mongoose.connection.readyState = 1;
  });
  const first = connectDatabase();
  const second = connectDatabase();
  assert.strictEqual(first, second);
  assert.equal(connect.mock.callCount(), 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(await connectDatabase(), true);
  assert.equal(connect.mock.callCount(), 1);
});

test('a failed connection can recover without exposing credentials', async () => {
  mock.method(mongoose, 'connect', async () => {throw Object.assign(new Error('private error'), {code: 18});});
  assert.equal(await connectDatabase(), false);
  assert.equal(databaseStatus().issue, 'authentication_failed');
  assert(!JSON.stringify(databaseStatus()).includes('private error'));
  mock.restoreAll();
  mock.method(mongoose, 'connect', async () => {mongoose.connection.readyState = 1;});
  assert.equal(await connectDatabase(), true);
  assert.equal(databaseStatus().ready, true);
  assert.equal(databaseStatus().issue, undefined);
});
