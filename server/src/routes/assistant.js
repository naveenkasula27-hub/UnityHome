import {Router} from 'express';
import {readFileSync} from 'node:fs';
import {optionalAuth} from '../middleware/auth.js';
import {databaseStatus} from '../config/database.js';
import {resolveAgency,catalog} from './state.js';
const samples=JSON.parse(readFileSync(new URL('../sample-data.json',import.meta.url),'utf8')).properties;
const router=Router();router.use(optionalAuth);
function money(n){return n>=10000000?'₹'+(n/10000000).toFixed(2)+' Cr':n>=100000?'₹'+(n/100000).toFixed(0)+' L':'₹'+n.toLocaleString('en-IN')}
router.post('/',async(req,res)=>{const {message,propertyId,filters={}}=req.body;if(typeof message!=='string'||!message.trim()||message.length>2000)return res.status(400).json({error:'Enter a property question of up to 2,000 characters.'});const agency=databaseStatus().ready?await resolveAgency(req):null;const inventory=agency?await catalog(agency):samples;const available=inventory.filter(p=>!['Archived','Sold','Rented'].includes(p.status)),p=available.find(p=>p.id===propertyId),m=message.toLowerCase();let text='',matches=[];
 if(process.env.ASSISTANT_WEBHOOK_URL){try{const endpoint=new URL(process.env.ASSISTANT_WEBHOOK_URL);if(endpoint.protocol!=='https:')throw Error();const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.N8N_WEBHOOK_SECRET?{Authorization:'Bearer '+process.env.N8N_WEBHOOK_SECRET}:{})},body:JSON.stringify({message,property:p||null,inventory:available,filters}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(r.ok&&typeof d.text==='string')return res.json({text:d.text.slice(0,5000),matches:[],mode:'connected'})}catch{}}
 if(p&&/price|cost/.test(m))text=`${p.name} is listed at ${money(p.price)}${p.intent==='Rent'?' per month':''}. This is illustrative pricing; confirm final terms with an advisor.`;
 else if(p&&/bed|bath|size|area/.test(m))text=`${p.name} has ${p.beds} bedrooms, ${p.baths} bathrooms and ${p.area.toLocaleString()} sq ft of illustrative built-up area.`;
 else if(/visit|tour|book/.test(m))text='Choose Request a site visit to share a preferred time. Your request stays pending until an agent confirms it.';
 else if(p&&/location|where|near/.test(m))text=`${p.name} is in ${p.locality}, ${p.city||'Hyderabad'}. Ask an advisor to confirm the exact address and commute details.`;
 else if(p&&/available|ready/.test(m))text=`${p.name} is marked ${p.status}. An advisor should confirm current availability.`;
 else if(p&&/amenit|pool|parking/.test(m))text=`${p.name} includes illustrative parking and landscaped areas. Ask the advisor for the confirmed amenity list.`;
 else if(/brochure/.test(m))text='Open a property and choose Download sample brochure to get its property details.';
 else if(/agent|human|callback/.test(m))text='Choose Talk to an agent or Request callback. Your property context and requirements will stay with the inquiry.';
 else{const locality=available.find(x=>m.includes(x.locality.toLowerCase()))?.locality||filters.locality,beds=m.match(/([1-5])\s*(?:bhk|bed)/)?.[1]||filters.beds,intent=/rent/.test(m)?'Rent':filters.intent||'Buy';const amount=m.match(/(?:under|below|budget)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l)?/);const budget=amount?Number(amount[1])*(/^(crore|cr)$/.test(amount[2])?10000000:/^(lakh|lac|l)$/.test(amount[2])?100000:1):Number(filters.budget)||Infinity;matches=available.filter(x=>x.intent===intent&&(!locality||x.locality===locality)&&(!beds||x.beds===Number(beds))&&x.price<=budget).slice(0,3);text=matches.length?'Here are matching homes from the current inventory. An advisor can help refine your shortlist.':'No exact matches were found. Try a nearby locality or share your requirements with an advisor.'}
 res.json({text,matches:matches.map(x=>({id:x.id,name:x.name,price:money(x.price)})),mode:'inventory-demo'})});export default router;
