import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {rateLimit} from 'express-rate-limit';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {config,allowedOrigins} from './config/env.js';
import {databaseStatus} from './config/database.js';
import authRoutes from './routes/auth.js';
import stateRoutes from './routes/state.js';
import assistantRoutes from './routes/assistant.js';
export function createApp({prepareDatabase=null,serveClient=true,trustProxy=false}={}){
 const app=express();app.disable('x-powered-by');if(trustProxy!==false)app.set('trust proxy',trustProxy);
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],imgSrc:["'self'",'data:','blob:'],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],upgradeInsecureRequests:config.nodeEnv==='production'?[]:null}}}));
 app.use(cors({credentials:true,origin(origin,callback){if(!origin||allowedOrigins.has(origin))return callback(null,true);callback(Object.assign(new Error('Origin not allowed'),{status:403}))}}));
 app.use(express.json({limit:'64kb'}));app.use(cookieParser());
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&!allowedOrigins.has(req.headers.origin))return res.status(403).json({error:'Invalid request origin.'});next()});
 app.use('/api',rateLimit({windowMs:15*60*1000,limit:500,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Please try again later.'}}));
 if(prepareDatabase)app.use('/api',async(req,res,next)=>{try{if(req.path!=='/health')await prepareDatabase();next()}catch(error){next(error)}});
 app.get('/api/health',(req,res)=>res.json({service:'unityhome-api',status:'online',database:databaseStatus(),automationEnabled:config.automationEnabled}));
 app.get('/api/ready',(req,res)=>res.status(databaseStatus().ready?200:503).json({ready:databaseStatus().ready}));
 app.use('/api/auth',authRoutes);app.use('/api/state',stateRoutes);app.use('/api/assistant',assistantRoutes);
 app.use('/api',(req,res)=>res.status(404).json({error:'API route not found.'}));
 const clientDist=fileURLToPath(new URL('../../client/dist/',import.meta.url));
 if(serveClient&&existsSync(clientDist)){app.use(express.static(clientDist));app.use((req,res,next)=>{if(req.method==='GET'&&req.accepts('html'))return res.sendFile(clientDist+'index.html');next()})}
 app.use((req,res)=>res.status(404).json({error:'Not found.'}));
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);if(error.code===11000)return res.status(409).json({error:'This record already exists.'});if(error.name==='VersionError')return res.status(409).json({error:'This record changed. Refresh and try again.'});if(['ValidationError','CastError'].includes(error.name)||error.type==='entity.parse.failed')return res.status(400).json({error:'Check the submitted details.'});const status=Number(error.status)||500;if(status>=500)console.error('[api]',error.name||'Error');res.status(status).json({error:status<500?error.message:'The server could not complete this request.'})});
 return app;
}
