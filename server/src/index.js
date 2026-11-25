import {createApp} from './app.js';
import {config} from './config/env.js';
import {connectDatabase,closeDatabase} from './config/database.js';
if(config.jwtSecret.length<32){console.error('JWT_SECRET must be set to a random value of at least 32 characters in server/.env.');process.exit(1)}
const app=createApp();const server=app.listen(config.port,'127.0.0.1',()=>{console.info('UnityHome API: http://127.0.0.1:'+config.port);connectDatabase()});
let closing=false;async function shutdown(){if(closing)return;closing=true;server.close(async()=>{await closeDatabase();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
