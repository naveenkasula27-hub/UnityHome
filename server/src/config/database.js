import dns from 'node:dns';
import mongoose from 'mongoose';
import {config} from './env.js';
mongoose.set('bufferCommands',false);
let issue=null;
export function databaseStatus(){if(!config.mongoUri)return {status:'not_configured',ready:false};if(config.mongoUri.includes('<')||!/^mongodb(?:\+srv)?:\/\//.test(config.mongoUri))return {status:'invalid_configuration',ready:false};const state=mongoose.connection.readyState;return {status:state===1?'connected':state===2?'connecting':'disconnected',ready:state===1,...(issue?{issue}:{})}}
export async function connectDatabase(){const state=databaseStatus();if(state.status==='not_configured'||state.status==='invalid_configuration'){console.info('[database] Set MONGODB_URI in server/.env, then restart the server.');return}try{if(process.env.DNS_SERVERS?.trim())dns.setServers(process.env.DNS_SERVERS.split(',').map(value=>value.trim()).filter(Boolean));await mongoose.connect(config.mongoUri,{dbName:config.mongoDatabase,serverSelectionTimeoutMS:10000,maxPoolSize:10});issue=null;console.info('[database] MongoDB connected.')}catch(error){issue=error.code===18?'authentication_failed':'connection_failed';console.error('[database] Connection failed. Check the Atlas URI, database user and network access. Credentials are not logged.');}}
export async function closeDatabase(){await mongoose.disconnect()}
