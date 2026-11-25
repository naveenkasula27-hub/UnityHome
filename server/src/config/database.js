import dns from 'node:dns';
import mongoose from 'mongoose';
import {config} from './env.js';

mongoose.set('bufferCommands', false);
let issue = null;
let connectionPromise = null;

export function databaseStatus() {
  if (!config.mongoUri) return {status: 'not_configured', ready: false};
  if (config.mongoUri.includes('<') || !/^mongodb(?:\+srv)?:\/\//.test(config.mongoUri)) {
    return {status: 'invalid_configuration', ready: false};
  }
  const state = mongoose.connection.readyState;
  return {
    status: state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected',
    ready: state === 1,
    ...(issue ? {issue} : {})
  };
}

export function connectDatabase() {
  if (databaseStatus().ready) return Promise.resolve(true);
  // Concurrent requests on a cold function share one connection attempt.
  if (connectionPromise) return connectionPromise;
  const state = databaseStatus();
  if (['not_configured', 'invalid_configuration'].includes(state.status)) {
    return Promise.resolve(false);
  }
  connectionPromise = (async () => {
    try {
      if (process.env.DNS_SERVERS?.trim()) {
        dns.setServers(process.env.DNS_SERVERS.split(',').map(value => value.trim()).filter(Boolean));
      }
      await mongoose.connect(config.mongoUri, {
        dbName: config.mongoDatabase,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      });
      issue = null;
      console.info('[database] MongoDB connected.');
      return true;
    } catch (error) {
      issue = error.code === 18 ? 'authentication_failed' : 'connection_failed';
      console.error('[database] Connection failed. Check Atlas configuration and network access. Credentials are not logged.');
      return false;
    }
  })().finally(() => {connectionPromise = null;});
  return connectionPromise;
}

export async function closeDatabase() {
  if (connectionPromise) await connectionPromise;
  await mongoose.disconnect();
}
