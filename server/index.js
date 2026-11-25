import express from 'express';
import {createApp} from './src/app.js';
import {connectDatabase} from './src/config/database.js';

// Vercel owns the HTTP listener. The local runner remains src/index.js.
const app = express();
app.set('trust proxy', 1);
app.use(createApp({prepareDatabase: connectDatabase, serveClient: false, trustProxy: 1}));
export default app;
