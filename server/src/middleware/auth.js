import jwt from 'jsonwebtoken';
import {config} from '../config/env.js';
import {databaseStatus} from '../config/database.js';
import {User} from '../models/index.js';
export const cookieOptions={httpOnly:true,secure:config.nodeEnv==='production',sameSite:'lax',path:'/',maxAge:8*60*60*1000};
export function setSession(res,user){if(config.jwtSecret.length<32)throw Object.assign(new Error('Server session secret is not configured'),{status:503});res.cookie('unityhome_session',jwt.sign({sub:String(user._id)},config.jwtSecret,{expiresIn:'8h',issuer:'unityhome',audience:'unityhome-client'}),cookieOptions)}
export function requireDatabase(req,res,next){if(!databaseStatus().ready)return res.status(503).json({error:'MongoDB is not connected. Configure server/.env and Atlas network access first.'});next()}
export async function optionalAuth(req,res,next){try{const token=req.cookies.unityhome_session;if(!token)return next();if(!databaseStatus().ready)return res.status(503).json({error:'The database is temporarily unavailable.'});let payload;try{payload=jwt.verify(token,config.jwtSecret,{issuer:'unityhome',audience:'unityhome-client'})}catch{return next()}req.user=await User.findById(payload.sub);next()}catch(e){next(e)}}
export function requireAuth(req,res,next){if(!req.user)return res.status(401).json({error:'Sign in to UnityHome to continue.'});next()}
export function requireStaff(req,res,next){if(!req.user?.agency||!['owner','admin','agent'].includes(req.user.role))return res.status(403).json({error:'An agency team account is required.'});next()}
export function requireManager(req,res,next){if(!['owner','admin'].includes(req.user?.role))return res.status(403).json({error:'An owner or admin account is required.'});next()}
