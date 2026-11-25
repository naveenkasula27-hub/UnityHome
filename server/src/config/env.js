import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url)),quiet:true});
export const config={nodeEnv:process.env.NODE_ENV||'development',port:Number(process.env.PORT)||5050,mongoUri:(process.env.MONGODB_URI||'').trim(),mongoDatabase:process.env.MONGODB_DB_NAME||'unityhome',jwtSecret:process.env.JWT_SECRET||'',clientOrigin:process.env.CLIENT_ORIGIN||'http://127.0.0.1:5174',automationEnabled:process.env.AUTOMATION_ENABLED==='true'};
export const allowedOrigins=new Set([config.clientOrigin,...(config.nodeEnv==='development'?['http://localhost:5174','http://127.0.0.1:5174','http://localhost:'+config.port,'http://127.0.0.1:'+config.port]:[])]);
