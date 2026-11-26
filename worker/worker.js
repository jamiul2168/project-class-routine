// Class Routine API — Cloudflare Worker + D1. Bind your D1 database to this Worker with the variable name "DB".
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Authorization,Content-Type","Access-Control-Allow-Methods":"GET,POST,PUT,OPTIONS","Access-Control-Max-Age":"86400","Content-Type":"application/json","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...H,"Cache-Control":"no-store"}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const eq=(a,b)=>{a=String(a);b=String(b);let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0};
const hmac=async(k,m)=>{const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(k),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(m)))};
// Every text value is stripped of < > and control characters; objects/arrays are size-limited. Links in wa/ms/url fields must be https.
const clean=(v,d=0)=>{if(d>6)return null;if(typeof v==="string")return v.replace(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").slice(0,20000);if(Array.isArray(v))return v.slice(0,5000).map(x=>clean(x,d+1));if(v&&typeof v==="object"){const o={};for(const k of Object.keys(v).slice(0,80)){if(/^__/.test(k))continue;o[k.slice(0,60)]=clean(v[k],d+1)}return o}return typeof v==="number"||typeof v==="boolean"||v===null?v:null};
const URLK=["wa","ms","url"];
const badUrl=(v,d=0)=>{if(d>6)return"";if(Array.isArray(v)){for(const x of v){const r=badUrl(x,d+1);if(r)return r}return""}if(v&&typeof v==="object"){for(const k of Object.keys(v)){const x=v[k];if(URLK.includes(k)&&typeof x==="string"&&x.trim()&&!LK(x))return k;if(x&&typeof x==="object"){const r=badUrl(x,d+1);if(r)return r}}}return""};
const hp=async(p,s)=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s+":"+p)));
const MAXB=100*1024*1024,PARTB=8*1024*1024,OKMIME=/^[a-z0-9][\w.+-]*\/[a-z0-9][\w.+-]*$/i,FID=/^[0-9a-f]{16}$/;
// Files that can run code in a browser (html, svg, xml, js) are served inside a CSP sandbox, so they can never touch this site or the admin session.
const ACTIVE=/^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|application\/xml|text\/javascript|application\/javascript)/i;
const ctype=m=>/^text\//i.test(m)&&!/charset/i.test(m)?m+"; charset=utf-8":m;
const fsec=m=>({"X-Content-Type-Options":"nosniff",...(ACTIVE.test(m||"")?{"Content-Security-Policy":"sandbox allow-scripts allow-forms allow-popups allow-modals"}:{})});
const LK=u=>{try{if(typeof u!=="string"||u.length>500)return false;const x=new URL(u.trim());return x.protocol==="https:"&&/\./.test(x.hostname)}catch(e){return false}};
const FCAT=["Cover Page","Files","Main Routine"],FOKM=/^(image\/(jpeg|png|webp|gif|avif|bmp)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/vnd\.ms-(excel|powerpoint)|text\/(plain|csv))$/i;
const SEC=["settings","subjects","teachers","groups","links","routine","notices","holidays","students","homework","timings","files"],PIN=/^\d{4}$/;
const SCHEMA=[
"CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE COLLATE NOCASE,salt TEXT,pin TEXT,role TEXT,active INTEGER DEFAULT 1,fails INTEGER DEFAULT 0,locked_until INTEGER DEFAULT 0,created_at INTEGER)",
"CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,admin_id INTEGER,exp INTEGER)",
"CREATE TABLE IF NOT EXISTS content(section TEXT PRIMARY KEY,data TEXT,rev INTEGER DEFAULT 0,upd_by TEXT,at INTEGER)",
"CREATE TABLE IF NOT EXISTS changes(id INTEGER PRIMARY KEY AUTOINCREMENT,section TEXT,data TEXT,admin_id INTEGER,author TEXT,status TEXT DEFAULT 'pending',note TEXT,at INTEGER,reviewed_by TEXT,reviewed_at INTEGER)",
"CREATE TABLE IF NOT EXISTS log(id INTEGER PRIMARY KEY AUTOINCREMENT,who TEXT,what TEXT,at INTEGER)"];

const ADDL="CREATE TABLE IF NOT EXISTS attempts(ip TEXT PRIMARY KEY,fails INTEGER DEFAULT 0,locked_until INTEGER DEFAULT 0)";SCHEMA.push(ADDL);const PINUSED="That PIN can't be used. Choose a different one.";
const PDDL="CREATE TABLE IF NOT EXISTS parts(id TEXT,n INTEGER,data TEXT,PRIMARY KEY(id,n))";SCHEMA.push(PDDL);
const FDDL="CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,name TEXT,mime TEXT,data TEXT,at INTEGER)";SCHEMA.push(FDDL);
const UDDL="CREATE TABLE IF NOT EXISTS usage(day TEXT,k TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(day,k))",FBDDL="CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY AUTOINCREMENT,g TEXT,roll TEXT,name TEXT,msg TEXT,at INTEGER)",TRK=["go","wk","cv","fl","mr","hw","gl","tc","nt","st","fb","gd"];SCHEMA.push(UDDL,FBDDL);
const VDDL="CREATE TABLE IF NOT EXISTS views(day TEXT PRIMARY KEY,n INTEGER DEFAULT 0)";SCHEMA.push(VDDL);
const IBDDL="CREATE TABLE IF NOT EXISTS idblock(ip TEXT PRIMARY KEY,reason TEXT,by TEXT,at INTEGER)",ILDDL="CREATE TABLE IF NOT EXISTS idlog(id INTEGER PRIMARY KEY AUTOINCREMENT,ip TEXT,name TEXT,father TEXT,mother TEXT,roll TEXT,tech TEXT,sess TEXT,act TEXT,ua TEXT,at INTEGER)";const ITDDL="CREATE TABLE IF NOT EXISTS idtpl(k TEXT PRIMARY KEY,data TEXT,at INTEGER)",IKDDL="CREATE TABLE IF NOT EXISTS idtk(t TEXT PRIMARY KEY,ip TEXT,exp INTEGER,n INTEGER DEFAULT 0)";SCHEMA.push(IBDDL,ILDDL,ITDDL,IKDDL);
// ---- name check (same rules on the page and on the server) ----
const BADW=new Set("FUCK FUCKER SHIT BITCH SEX SEXY PORN PORNO DICK COCK PUSSY BASTARD SLUT WHORE NIGGA NIGGER RAPE LESBO IDIOT STUPID DUMB FOOL LOSER NOOB CHUTIA GANDU MAGI MAGIR KHANKI KHANKIR CHODA CHUDA CHUDI BOKACHODA BOKACHUDA HARAMI HARAMZADA HARAMJADA KUTTA KUTTAR KUKUR SHUOR SHUWOR BAICHOD BEYADOB HIJRA".split(" "));
const BADSUB=["FUCK","SHIT","BITCH","PORN","KHANKI","CHODA","GANDU","HARAMI","KUTTA","PUSSY","ASSHOLE","NIGGA","BASTARD","WHORE"];
const NONW=new Set("TEST TESTING DEMO FAKE NAME FULLNAME YOURNAME USER USERNAME STUDENT FATHER MOTHER MOM DAD NULL NONE NA UNKNOWN ADMIN HACKER HACK BOT ROBOT JOKER VIRUS ANONYMOUS NOBODY SAMPLE EXAMPLE ABC XYZ ASDF QWERTY KILLER MONSTER DEMON DEVIL GHOST".split(" "));
const SEQ=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM","ABCDEFGHIJKLMNOPQRSTUVWXYZ"].flatMap(r=>[r,[...r].reverse().join("")]);
// returns "" when the name looks real, otherwise: empty | chars | short | bad | junk
function nameBad(n){
  n=String(n||"").trim().replace(/\s+/g," ").toUpperCase();
  if(!n)return"empty";
  if(n.length>40||!/^[A-Z][A-Z .'\-]*$/.test(n))return"chars";
  const T=n.split(/[ .'\-]+/).filter(Boolean),L=n.replace(/[^A-Z]/g,"");
  if(L.length<3)return"short";
  if(T.some(t=>BADW.has(t))||BADSUB.some(w=>L.includes(w)))return"bad";
  if(T.some(t=>NONW.has(t))||NONW.has(L))return"junk";
  if(!/[AEIOUY]/.test(L)||new Set(L).size<3||/(.)\1{2,}/.test(L)||/([A-Z]{1,3})\1{2,}/.test(L)||/[^AEIOUY]{5,}/.test(L))return"junk";
  if(T.some(t=>t.length>=4&&!/[AEIOUY]/.test(t)))return"junk";
  for(let i=0;i+4<=L.length;i++)if(SEQ.some(r=>r.includes(L.slice(i,i+4))))return"junk";
  if(T.filter(t=>t.length===1).length>2)return"junk";
  const c={};for(const t of T){c[t]=(c[t]||0)+1;if(c[t]>=3)return"junk"}
  return"";
}
// student, father and mother must be three different names
const sameNames=(a,b,c)=>{const f=x=>String(x||"").trim().replace(/\s+/g," ").toUpperCase(),A=f(a),B=f(b),C=f(c);return A===B||A===C||B===C};
const GN=n=>!nameBad(n);
const IPOK=/^[0-9a-fA-F:.]{3,45}$/;
const DEDDL="CREATE TABLE IF NOT EXISTS devices(h TEXT PRIMARY KEY,admin_id INTEGER,at INTEGER)";SCHEMA.push(DEDDL);
export default{async fetch(req,env){
 if(req.method==="OPTIONS")return new Response(null,{headers:H});
 const DB=env.DB,p=new URL(req.url).pathname,now=Date.now();
 if(!DB)return J({error:'D1 binding named "DB" is missing on this Worker'},500);
 if(req.method==="POST"&&+req.headers.get("content-length")>1.5e6)return J({error:"Request too large"},413);
 const b=req.method==="POST"?await req.json().catch(()=>({})):{};
 const q=(s,...a)=>DB.prepare(s).bind(...a);
 const ip=req.headers.get("CF-Connecting-IP")||"?";
 // PINs are stored as HMAC(secret PEPPER, salt:pin) when the PEPPER secret is set; older plain hashes still verify and are upgraded at login
 const hn=async(p,s)=>env.PEPPER?"h2$"+await hmac(env.PEPPER,s+":"+p):await hp(p,s);
 const hv=async(p,s,st)=>String(st).startsWith("h2$")?(env.PEPPER?eq(await hmac(env.PEPPER,s+":"+p),String(st).slice(3)):false):eq(await hp(p,s),st);
 const RLK=/^[HTFBUPS]:/;
 const rl=async(key,lim,win)=>{const run=()=>q("INSERT INTO attempts(ip,fails,locked_until) VALUES(?1,1,?2) ON CONFLICT(ip) DO UPDATE SET fails=CASE WHEN locked_until<?3 THEN 1 ELSE fails+1 END,locked_until=CASE WHEN locked_until<?3 THEN ?2 ELSE locked_until END RETURNING fails",key,now+win,now).first();let r;try{r=await run()}catch(e){if(!/no such table/i.test(e.message))throw e;await DB.prepare(ADDL).run();r=await run()}
  if(Math.random()<.02)try{await q("DELETE FROM attempts WHERE locked_until<?1 AND (ip LIKE 'H:%' OR ip LIKE 'T:%' OR ip LIKE 'F:%' OR ip LIKE 'B:%' OR ip LIKE 'U:%' OR ip LIKE 'P:%' OR ip LIKE 'S:%' OR ip LIKE 'I:%')",now).run()}catch(e){}
  return !!r&&r.fails>lim};
 const note=(who,what)=>q("INSERT INTO log(who,what,at) VALUES(?1,?2,?3)",who,what,now);
 // Domain lock: Settings > Allowed domains. Empty = nobody can load the data. Otherwise the request must come from one of these sites (Origin or Referer header).
 const hostOf=u=>{try{return new URL(u).hostname.toLowerCase()}catch(e){return ""}};
 const allowed=async S=>{let list=[];try{if(!S){const o=await q("SELECT data FROM content WHERE section='settings'").first();S=o?JSON.parse(o.data):[]}list=String(((S||[])[0]||{}).allowedDomains||"").split(/[\s,]+/).map(x=>x.toLowerCase()).filter(Boolean)}catch(e){}
  const org=req.headers.get("Origin")||"";if(!list.length)return{ok:false,origin:org||"*"};
  const h=hostOf(org||req.headers.get("Referer")||"");return{ok:!!h&&list.some(d=>h===d||h.endsWith("."+d)),origin:org||"*"}};
 const DENY=()=>J({error:"This website is not allowed to load this data."},403);
 const fids=a=>{const o=[];try{(Array.isArray(a)?a:[]).forEach(r=>{if(r&&typeof r.file==="string"&&FID.test(r.file))o.push(r.file)})}catch(e){}return o};
 const refd=async ids=>{const rows=[...(await q("SELECT data FROM content").all()).results,...(await q("SELECT data FROM changes WHERE status IN ('pending','rejected')").all()).results],all=rows.map(x=>x.data||"").join("\n");return new Set(ids.filter(i=>all.includes(i)))};
 const kill=async id=>{if(env.BUCKET)try{await env.BUCKET.delete("f/"+id)}catch(e){}await DB.batch([q("DELETE FROM parts WHERE id=?1",id),q("DELETE FROM files WHERE id=?1",id)])};
 const gc=async(ids,who)=>{try{ids=[...new Set(ids)];if(!ids.length)return 0;const keep=await refd(ids);let n=0;for(const id of ids)if(!keep.has(id)){await kill(id);n++}if(n)await note(who||"System","Deleted "+n+" unused file"+(n>1?"s":"")+" from storage").run();return n}catch(e){return 0}};
 const put=async(s,d,who)=>{let old=[];try{const o=await q("SELECT data FROM content WHERE section=?1",s).first();if(o)old=JSON.parse(o.data)}catch(e){}
  await DB.batch([q("INSERT INTO content(section,data,rev,upd_by,at) VALUES(?1,?2,1,?3,?4) ON CONFLICT(section) DO UPDATE SET data=?2,rev=rev+1,upd_by=?3,at=?4",s,d,who,now),note(who,"Published "+s)]);
  let nw=[];try{nw=JSON.parse(d)}catch(e){}const keep=new Set(fids(nw));await gc(fids(old).filter(i=>!keep.has(i)),who)};
 const taken=async(pin,id)=>{for(const x of(await q("SELECT id,salt,pin FROM admins").all()).results)if(x.id!==id&&await hv(String(pin),x.salt,x.pin))return true;return false};
 const ready=async()=>{try{return !!await q("SELECT 1 x FROM admins LIMIT 1").first()}catch(e){if(/no such table/i.test(e.message))return false;throw e}};
 try{
  if(p==="/api/status")return J({ready:await ready()});
  if(p==="/api/public"){const r=await q("SELECT section,data FROM content").all(),o={};r.results.forEach(x=>o[x.section]=JSON.parse(x.data));const g=await allowed(o.settings);if(!g.ok)return DENY();return new Response(JSON.stringify(o),{headers:{...H,"Access-Control-Allow-Origin":g.origin,"Vary":"Origin","Cache-Control":"public,max-age=10"}})}
  if(p==="/api/hit"){
   if(!b.peek&&await rl("H:"+ip,40,6e4))return J({error:"Too many requests"},429);
   const day=new Date(now+216e5).toISOString().slice(0,10);
   const go=async()=>{if(!b.peek)await q("INSERT INTO views(day,n) VALUES(?1,1) ON CONFLICT(day) DO UPDATE SET n=n+1",day).run();return J({total:(await q("SELECT COALESCE(SUM(n),0) t FROM views").first()).t})};
   try{return await go()}catch(e){if(!/no such table/i.test(e.message))throw e;await DB.prepare(VDDL).run();return await go()}}
  if(p==="/api/track"){const k=String(b.k||"");if(!TRK.includes(k))return J({ok:0});if(await rl("T:"+ip,60,6e4))return J({error:"Too many requests"},429);const go=()=>q("INSERT INTO usage(day,k,n) VALUES(?1,?2,1) ON CONFLICT(day,k) DO UPDATE SET n=n+1",new Date(now+216e5).toISOString().slice(0,10),k).run();try{await go()}catch(e){if(!/no such table/i.test(e.message))throw e;await DB.prepare(UDDL).run();await go()}return J({ok:1})}
  if(p==="/api/feedback/list"){if(!(await allowed()).ok)return DENY();if(await rl("F:"+ip,30,6e4))return J({error:"Too many requests"},429);await DB.prepare(FBDDL).run();return J((await q("SELECT id,g,roll,msg,at FROM feedback ORDER BY id DESC LIMIT 50").all()).results)}
  if(p==="/api/feedback"){
   if(await rl("B:"+ip,5,6e5))return J({error:"অনেকবার চেষ্টা হয়েছে, একটু পরে আবার পাঠান"},429);
   const g=String(b.g||""),roll=String(b.roll||"").replace(/[<>]/g,"").trim().slice(0,12),msg=String(b.msg||"").replace(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").trim();
   if(!["A1","B1","A2","B2"].includes(g)||!roll)return J({error:"গ্রুপ ও রোল দিন"},400);
   if(msg.length<3||msg.length>1000)return J({error:"৩ থেকে ১০০০ অক্ষরের মধ্যে লিখুন"},400);
   let st=[];try{const o=await q("SELECT data FROM content WHERE section='students'").first();if(o)st=JSON.parse(o.data)}catch(e){}
   const s=st.find(x=>x&&String(x.g)===g&&String(x.roll).trim()===roll);
   if(!s)return J({error:"এই গ্রুপে এই রোল পাওয়া যায়নি"},400);
   await DB.prepare(FBDDL).run();
   const last=await q("SELECT at FROM feedback WHERE g=?1 AND roll=?2 ORDER BY id DESC LIMIT 1",g,roll).first();
   if(last&&now-last.at<6e4)return J({error:"এক মিনিট পর আবার পাঠান"},429);
   await q("INSERT INTO feedback(g,roll,name,msg,at) VALUES(?1,?2,?3,?4,?5)",g,roll,String(s.name||""),msg,now).run();
   return J({ok:1})}
  if(p==="/api/id/check"){
   // called by the ID card page when it opens ("open") and before every download / print ("make")
   if(!(await allowed()).ok)return DENY();
   if(await rl("I:"+ip,25,6e5))return J({error:"Too many requests. Try again in a few minutes."},429);
   await DB.batch([DB.prepare(IBDDL),DB.prepare(ILDDL)]);
   const bl=await q("SELECT reason FROM idblock WHERE ip=?1",ip).first();
   if(bl)return J({blocked:1,error:"You are blocked from using the ID card maker. Contact the admin."},403);
   const f=k=>String(b[k]||"").replace(/[<>\u0000-\u001f]/g,"").trim().slice(0,40);
   const okNames=GN(b.name)&&GN(b.father)&&GN(b.mother)&&!sameNames(b.name,b.father,b.mother);
   if(b.act==="bad"){
    // the page reports a junk / inappropriate name attempt: keep a record for the admin (nothing is issued)
    if(!okNames)await q("INSERT INTO idlog(ip,name,father,mother,roll,tech,sess,act,ua,at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",ip,f("name"),f("father"),f("mother"),f("roll"),f("tech"),f("sess"),"rej",(req.headers.get("User-Agent")||"").slice(0,160),now).run();
    return J({ok:1})}
   if(b.act!=="make")return J({ok:1});
   if(!okNames||!f("roll"))return J({error:"Please enter real, different names for student, father and mother (English letters), and your class roll."},400);
   await q("INSERT INTO idlog(ip,name,father,mother,roll,tech,sess,act,ua,at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",ip,f("name"),f("father"),f("mother"),f("roll"),f("tech"),f("sess"),String(b.kind||"").slice(0,10),(req.headers.get("User-Agent")||"").slice(0,160),now).run();
   if(Math.random()<.02)try{await q("DELETE FROM idlog WHERE at<?1",now-90*864e5).run()}catch(e){}
   // one short-lived ticket per download: the real card template is only given out against it
   await DB.batch([DB.prepare(ITDDL),DB.prepare(IKDDL)]);
   const t=rnd(16);await DB.batch([q("DELETE FROM idtk WHERE exp<?1",now),q("INSERT INTO idtk(t,ip,exp,n) VALUES(?1,?2,?3,0)",t,ip,now+18e4)]);
   return J({ok:1,t})}
  if(p==="/api/id/tpl"){
   // the private card template (front "f" / back "b"): only with a valid ticket, from the same IP, never for a blocked IP
   const u=new URL(req.url),t=u.searchParams.get("t")||"",s=u.searchParams.get("s")==="b"?"b":"f";
   await DB.batch([DB.prepare(ITDDL),DB.prepare(IKDDL),DB.prepare(IBDDL)]);
   if(await q("SELECT 1 x FROM idblock WHERE ip=?1",ip).first())return J({blocked:1,error:"Blocked"},403);
   const k=await q("SELECT ip,exp,n FROM idtk WHERE t=?1",t).first();
   if(!k||k.ip!==ip||k.exp<now||k.n>=6)return J({error:"Ticket is not valid. Please try again."},403);
   const r=await q("SELECT data FROM idtpl WHERE k=?1",s).first();
   if(!r)return J({error:"The card template is not uploaded yet. Please tell the admin.",notpl:1},404);
   await q("UPDATE idtk SET n=n+1 WHERE t=?1",t).run();
   return new Response(Uint8Array.from(atob(r.data),c=>c.charCodeAt(0)),{headers:{...H,"Content-Type":"image/jpeg","Cache-Control":"no-store"}})}
  if(p==="/api/setup"){
   if(await ready())return J({error:"Already set up"},403);
   if(await rl("S:"+ip,10,36e5))return J({error:"Too many requests"},429);
   if(env.SETUP_KEY&&!eq(String(b.key||""),env.SETUP_KEY))return J({error:"Setup key required"},403);
   const nm=String(b.name||"").replace(/[<>]/g,"").trim().slice(0,40);if(!nm||!PIN.test(b.pin))return J({error:"Enter a name and a 4-digit PIN"},400);
   await DB.batch(SCHEMA.map(s=>DB.prepare(s)));
   const salt=rnd(8);
   await q("INSERT INTO admins(name,salt,pin,role,created_at) VALUES(?1,?2,?3,'super',?4)",nm,salt,await hn(b.pin,salt),now).run();
   for(const s of SEC)await put(s,JSON.stringify(clean(b.seed&&b.seed[s])||(s==="settings"?[{}]:[])),nm);
   return J({ok:1})}
  if(p.startsWith("/api/file/")){
   await DB.batch([DB.prepare(FBDDL),DB.prepare(PDDL)]);
   const f=await q("SELECT * FROM files WHERE id=?1",p.slice(10)).first();if(!f)return J({error:"File not found"},404);
   if(f.data==="@r2"){
    if(!env.BUCKET)return J({error:"R2 bucket is not bound to this Worker"},500);
    const sp2=new URL(req.url).searchParams;
    if(sp2.has("info")){const h=await env.BUCKET.head("f/"+f.id);return new Response(JSON.stringify({r2:1,mime:f.mime,name:f.name,size:h?h.size:0}),{headers:{...H,"Cache-Control":"public,max-age=60"}})}
    const o=await env.BUCKET.get("f/"+f.id,{range:req.headers});
    if(!o)return J({error:"File not found"},404);
    const hd={...H,"Content-Type":ctype(f.mime),"Accept-Ranges":"bytes","Cache-Control":"public,max-age=86400","ETag":o.httpEtag,"Access-Control-Expose-Headers":"Content-Length,Content-Range,Accept-Ranges",...fsec(f.mime)};
    if(sp2.get("dl"))hd["Content-Disposition"]='attachment; filename="'+f.name.replace(/[^\w.\- ]/g,"_")+'"';
    let st=200;
    if(o.range){const r=o.range,off=r.offset!==undefined?r.offset:o.size-r.suffix,len=r.length!==undefined?r.length:o.size-off;st=206;hd["Content-Range"]="bytes "+off+"-"+(off+len-1)+"/"+o.size;hd["Content-Length"]=String(len)}
    else hd["Content-Length"]=String(o.size);
    return new Response(o.body,{status:st,headers:hd})}
   const sp=new URL(req.url).searchParams;
   if(sp.has("info")||sp.has("part")){
    const rows=(await q("SELECT n,data FROM parts WHERE id=?1 ORDER BY n",f.id).all()).results,pl=rows.length?rows.map(x=>x.data):(f.data?[f.data]:[]);
    if(sp.has("info"))return new Response(JSON.stringify({parts:pl.length,mime:f.mime,name:f.name}),{headers:{...H,"Cache-Control":"public,max-age=60"}});
    const k=parseInt(sp.get("part"),10);if(!(k>=0&&k<pl.length))return J({error:"Part not found"},404);
    return new Response(pl[k],{headers:{...H,"Content-Type":"text/plain","Cache-Control":"public,max-age=86400"}})}
   const hd={...H,"Content-Type":ctype(f.mime),"Cache-Control":"public,max-age=86400",...fsec(f.mime)};
   if(new URL(req.url).searchParams.get("dl"))hd["Content-Disposition"]='attachment; filename="'+f.name.replace(/[^\w.\- ]/g,"_")+'"';
   const ps=(await q("SELECT data FROM parts WHERE id=?1 ORDER BY n",f.id).all()).results.map(x=>x.data);if(!ps.length)ps.push(f.data);
   const bs=ps.map(s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))),all=new Uint8Array(bs.reduce((a,x)=>a+x.length,0));let o=0;bs.forEach(x=>{all.set(x,o);o+=x.length});
   return new Response(all,{headers:hd})}
  if(p==="/api/login"){
   let lkr,adm;
   try{[lkr,adm]=(await DB.batch([q("SELECT * FROM attempts WHERE ip IN (?1,'*','L:'||?1,'L:*')",ip),q("SELECT * FROM admins WHERE active=1")])).map(x=>x.results)}
   catch(e){if(!/no such table/i.test(e.message))throw e;await DB.prepare(ADDL).run();lkr=[];adm=(await q("SELECT * FROM admins WHERE active=1").all()).results}
   // a device that has signed in before (random id kept on the admin's phone) is not locked out by the global limit; the PIN is still required
   const dev=String(b.dev||"");let trusted=false,dh="";
   if(/^[0-9a-f]{48}$/.test(dev)){dh=await hp(dev,"d");try{trusted=!!await q("SELECT 1 x FROM devices WHERE h=?1 AND at>?2",dh,now-15552e6).first()}catch(e){}}
   const rowOf=k=>lkr.find(r=>r.ip===k),lkIp=rowOf(ip),lkAll=rowOf("*");
   const lk=lkIp&&lkIp.locked_until>now?lkIp:(!trusted&&lkAll&&lkAll.locked_until>now?lkAll:null);
   if(lk)return J({error:"Too many wrong PINs. Try again in "+Math.ceil((lk.locked_until-now)/6e4)+" min"},429);
   const pin=String(b.pin||"");let a=null;
   if(PIN.test(pin))for(const x of adm)if(await hv(pin,x.salt,x.pin)){a=x;break}
   if(!a){
    // every lock-out is longer than the last one (15 min, 1 h, 4 h, 16 h, 24 h) and the level cools down after a quiet day
    const lvl=k=>{const r=rowOf("L:"+k);return r&&now-r.locked_until<864e5?r.fails:0},dur=l=>Math.min(9e5*Math.pow(4,l),864e5),st=[];
    for(const[k,lim]of[[ip,5],["*",40]]){
     const cur=rowOf(k),trig=((cur&&cur.fails)||0)+1>=lim;
     if(trig)st.push(q("INSERT INTO attempts(ip,fails,locked_until) VALUES(?1,0,?2) ON CONFLICT(ip) DO UPDATE SET fails=0,locked_until=?2",k,now+dur(lvl(k))),q("INSERT INTO attempts(ip,fails,locked_until) VALUES(?1,1,?2) ON CONFLICT(ip) DO UPDATE SET fails=CASE WHEN ?2-locked_until<864e5 THEN fails+1 ELSE 1 END,locked_until=?2","L:"+k,now));
     else st.push(q("INSERT INTO attempts(ip,fails,locked_until) VALUES(?1,1,0) ON CONFLICT(ip) DO UPDATE SET fails=fails+1",k))}
    await DB.batch(st);return J({error:"Wrong PIN"},401)}
   if(env.PEPPER&&!String(a.pin).startsWith("h2$")){const s2=rnd(8);try{await q("UPDATE admins SET salt=?1,pin=?2 WHERE id=?3",s2,await hn(pin,s2),a.id).run()}catch(e){}}
   const t=rnd(24),th=await hp(t,"s"),nd=trusted?dev:rnd(24);
   try{await DB.prepare(DEDDL).run()}catch(e){}
   const st=[q("DELETE FROM attempts WHERE ip=?1",ip),q("DELETE FROM sessions WHERE exp<?1",now),q("INSERT INTO sessions VALUES(?1,?2,?3)",th,a.id,now+432e5),q("DELETE FROM devices WHERE at<?1",now-15552e6)];
   st.push(trusted?q("UPDATE devices SET at=?1 WHERE h=?2",now,dh):q("INSERT OR REPLACE INTO devices(h,admin_id,at) VALUES(?1,?2,?3)",await hp(nd,"d"),a.id,now));
   await DB.batch(st);
   return J({token:t,name:a.name,role:a.role,dev:nd})}

  const ah=req.headers.get("Authorization")||"",th=await hp(ah.startsWith("Bearer ")?ah.slice(7):"-","s");
  const m=await q("SELECT a.id,a.name,a.role,s.exp FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token=?1 AND s.exp>?2 AND a.active=1",th,now).first();
  if(!m)return J({error:"Session expired. Sign in again."},401);
  if(m.exp-now<216e5)await q("UPDATE sessions SET exp=?1 WHERE token=?2",now+432e5,th).run();
  if(p==="/api/logout"){await q("DELETE FROM sessions WHERE token=?1",th).run();return J({ok:1})}
  const su=m.role==="super";
  if(p==="/api/content"){const r=await q("SELECT * FROM content").all(),c={};r.results.forEach(x=>c[x.section]={data:JSON.parse(x.data),rev:x.rev,by:x.upd_by,at:x.at});let rej=[];if(!su)rej=(await q("SELECT id,section,note,reviewed_by,reviewed_at FROM changes c WHERE admin_id=?1 AND status='rejected' AND id=(SELECT MAX(id) FROM changes WHERE admin_id=?1 AND section=c.section)",m.id).all()).results;return J({content:c,rej,pending:(await q("SELECT COUNT(*) n FROM changes WHERE status='pending'").first()).n})}
  if(p==="/api/save"){
   if(!SEC.includes(b.section)||!Array.isArray(b.data))return J({error:"Invalid data"},400);
   b.data=clean(b.data);{const bu=badUrl(b.data);if(bu)return J({error:"The \""+bu+"\" link must be a full https:// address."},400)}
   if(b.section==="settings"){const nd=v=>String(v==null?"":v).replace(/[\u09e6-\u09ef]/g,c=>c.charCodeAt(0)-2534).replace(/[\u0660-\u0669]/g,c=>c.charCodeAt(0)-1632).trim(),r0=b.data[0];
    if(r0&&typeof r0==="object"){
     if(r0.periodLen!==undefined&&String(r0.periodLen).trim()!==""){const n=parseInt(nd(r0.periodLen).replace(/\D/g,""),10);if(!(n>=10&&n<=120))return J({error:"Period length must be a number between 10 and 120 minutes."},400);r0.periodLen=String(n)}
     for(const k of["shiftStart","shift2Start"])if(r0[k]!==undefined&&String(r0[k]).trim()!==""){const m=/^(\d{1,2}):(\d{2})$/.exec(nd(r0[k]));if(!m||+m[1]>23||+m[2]>59)return J({error:"Shift start time must look like 08:00."},400);r0[k]=String(+m[1]).padStart(2,"0")+":"+m[2]}
     if(r0.allowedDomains!==undefined){const L=String(r0.allowedDomains).split(/[\s,]+/).map(x=>x.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/[\/:?#].*$/,"").replace(/^\*?\./,"")).filter(Boolean);if(L.some(x=>!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(x)||(!x.includes(".")&&x!=="localhost")))return J({error:"Allowed domains must look like myroutine.pages.dev (one per line)."},400);r0.allowedDomains=[...new Set(L)].join("\n")}}}
   if(b.section==="files"){const bad=b.data.find(r=>!r||typeof r!=="object"||!FCAT.includes(r.cat)||!String(r.title||"").trim()||String(r.desc||"").length>500||!(r.url?(LK(r.url)&&!r.file):(typeof r.file==="string"&&FID.test(r.file)&&FOKM.test(String(r.mime||"")))));
    if(bad)return J({error:"Each file needs a category (Cover Page, Files or Main Routine), a title, and a photo or document (JPG, PNG, WebP, PDF, Word, Excel, PowerPoint or text) or an https:// link."},400);
    b.data=b.data.map(r=>r.url?({cat:r.cat,title:String(r.title).trim().slice(0,120),desc:String(r.desc||"").trim().slice(0,500),url:String(r.url).trim(),file:"",fname:"",mime:"",acc:""}):({cat:r.cat,title:String(r.title).trim().slice(0,120),desc:String(r.desc||"").trim().slice(0,500),file:r.file,fname:String(r.fname||"").slice(0,80),mime:r.mime,acc:r.acc==="v"||r.acc==="d"?r.acc:""}))}
   const d=JSON.stringify(b.data);if(d.length>9e5)return J({error:"Too much data in one section"},413);
   if(su){
    const cur=await q("SELECT rev,data,upd_by FROM content WHERE section=?1",b.section).first();
    if(cur&&Number.isInteger(b.rev)&&!b.force&&cur.rev!==b.rev){if(cur.data===d)return J({ok:1,applied:1,rev:cur.rev});return J({error:"Someone else updated this section.",conflict:1,by:cur.upd_by},409)}
    await put(b.section,d,m.name);return J({ok:1,applied:1,rev:(cur?cur.rev:0)+1})}
   const olds=(await q("SELECT data FROM changes WHERE admin_id=?1 AND section=?2 AND status='pending'",m.id,b.section).all()).results;
   await DB.batch([q("UPDATE changes SET status='replaced' WHERE admin_id=?1 AND section=?2 AND status='pending'",m.id,b.section),q("INSERT INTO changes(section,data,admin_id,author,at) VALUES(?1,?2,?3,?4,?5)",b.section,d,m.id,m.name,now),note(m.name,"Submitted "+b.section+" for review")]);
   for(const o of olds){try{await gc(fids(JSON.parse(o.data)),m.name)}catch(e){}}
   return J({ok:1,pending:1})}
  if(p==="/api/changes"){const r=await(su?q("SELECT * FROM changes ORDER BY (status='pending') DESC,id DESC LIMIT 60"):q("SELECT * FROM changes WHERE admin_id=?1 ORDER BY id DESC LIMIT 30",m.id)).all();return J(r.results.map(x=>({...x,data:JSON.parse(x.data)})))}
  if(p==="/api/changes/dismiss"){const c=await q("SELECT * FROM changes WHERE id=?1 AND admin_id=?2 AND status='rejected'",b.id,m.id).first();if(!c)return J({ok:1});await q("UPDATE changes SET status='closed' WHERE id=?1",c.id).run();try{await gc(fids(JSON.parse(c.data)),m.name)}catch(e){}return J({ok:1})}
  if(p==="/api/views"){
   await DB.prepare(VDDL).run();
   const day=new Date(now+216e5).toISOString().slice(0,10),r=(await q("SELECT day,n FROM views ORDER BY day DESC LIMIT 7").all()).results;
   return J({total:(await q("SELECT COALESCE(SUM(n),0) t FROM views").first()).t,today:(r.find(x=>x.day===day)||{n:0}).n,days:r})}
  if(p==="/api/usage"){await DB.prepare(UDDL).run();const day=new Date(now+216e5).toISOString().slice(0,10),d7=new Date(now+216e5-6*864e5).toISOString().slice(0,10);return J((await q("SELECT k,SUM(n) t,SUM(CASE WHEN day=?1 THEN n ELSE 0 END) td,SUM(CASE WHEN day>=?2 THEN n ELSE 0 END) w FROM usage GROUP BY k",day,d7).all()).results)}
  if(p==="/api/feedbacks"){await DB.prepare(FBDDL).run();return J((await q("SELECT * FROM feedback ORDER BY id DESC LIMIT 200").all()).results)}
  if(p==="/api/feedback/del"){if(!su)return J({error:"Only the admin can delete"},403);await q("DELETE FROM feedback WHERE id=?1",+b.id||0).run();return J({ok:1})}
  if(p==="/api/idlog"){
   if(!su)return J({error:"Only the main admin can see this"},403);
   await DB.batch([DB.prepare(IBDDL),DB.prepare(ILDDL),DB.prepare(ITDDL)]);
   const [l,k,tp]=(await DB.batch([q("SELECT id,ip,name,father,mother,roll,tech,sess,act,ua,at FROM idlog ORDER BY id DESC LIMIT 300"),q("SELECT ip,reason,by,at FROM idblock ORDER BY at DESC"),q("SELECT k,at FROM idtpl")])).map(x=>x.results);
   return J({log:l,blocked:k,tpl:Object.fromEntries(tp.map(x=>[x.k,x.at]))})}
  if(p==="/api/idtpl"){
   if(!su)return J({error:"Only the main admin can upload the template"},403);
   const k=b.k==="b"?"b":b.k==="f"?"f":"",d=String(b.data||"");
   if(!k||!/^\/9j\/[A-Za-z0-9+\/=]+$/.test(d)||d.length>1.4e6)return J({error:"Upload a JPG image under 1 MB."},400);
   await DB.prepare(ITDDL).run();
   await DB.batch([q("INSERT INTO idtpl(k,data,at) VALUES(?1,?2,?3) ON CONFLICT(k) DO UPDATE SET data=?2,at=?3",k,d,now),note(m.name,"Uploaded the ID card "+(k==="f"?"front":"back")+" template")]);
   return J({ok:1})}
  if(p==="/api/idblock"){
   if(!su)return J({error:"Only the main admin can block"},403);
   const t=String(b.ip||"").trim();if(!IPOK.test(t)||t==="?")return J({error:"Invalid IP address"},400);
   if(t===ip)return J({error:"This is your own IP address - you cannot block yourself."},400);
   await DB.prepare(IBDDL).run();
   await DB.batch([q("INSERT INTO idblock(ip,reason,by,at) VALUES(?1,?2,?3,?4) ON CONFLICT(ip) DO UPDATE SET reason=?2,by=?3,at=?4",t,String(b.reason||"").replace(/[<>]/g,"").trim().slice(0,200),m.name,now),note(m.name,"Blocked ID card IP "+t)]);
   return J({ok:1})}
  if(p==="/api/idunblock"){
   if(!su)return J({error:"Only the main admin can unblock"},403);
   const t=String(b.ip||"").trim();await DB.prepare(IBDDL).run();
   await DB.batch([q("DELETE FROM idblock WHERE ip=?1",t),note(m.name,"Unblocked ID card IP "+t)]);return J({ok:1})}
  if(p==="/api/idlog/clear"){
   if(!su)return J({error:"Only the main admin can clear"},403);
   await DB.prepare(ILDDL).run();await DB.batch([q("DELETE FROM idlog"),note(m.name,"Cleared the ID card log")]);return J({ok:1})}
  if(p==="/api/mypin"){
   if(!PIN.test(b.pin))return J({error:"PIN must be 4 digits"},400);
   if(await rl("P:"+m.id,8,36e5))return J({error:"Too many tries. Try again in an hour."},429);
   const a=await q("SELECT * FROM admins WHERE id=?1",m.id).first();
   if(!await hv(String(b.old),a.salt,a.pin))return J({error:"Current PIN is wrong"},401);
   if(await taken(b.pin,m.id))return J({error:PINUSED},409);
   const s=rnd(8);await q("UPDATE admins SET salt=?1,pin=?2 WHERE id=?3",s,await hn(b.pin,s),m.id).run();return J({ok:1})}

  if(p.startsWith("/api/up")&&await rl("U:"+m.id,400,36e5))return J({error:"Too many uploads. Try again later."},429);
  if(p==="/api/up/start"){
   if(!env.BUCKET)return J({error:"Large uploads need an R2 bucket bound to this Worker as BUCKET.",r2off:1},400);
   const size=Number(b.size);
   if(!OKMIME.test(b.mime)||!(size>0))return J({error:"This file type is not supported."},400);
   if(size>MAXB)return J({error:"File must be under 100 MB"},413);
   await DB.prepare(FBDDL).run();
   const id=rnd(8),mp=await env.BUCKET.createMultipartUpload("f/"+id,{httpMetadata:{contentType:b.mime}});
   return J({id,uploadId:mp.uploadId,part:PARTB})}
  if(p==="/api/up/part"&&req.method==="PUT"){
   if(!env.BUCKET)return J({error:"R2 bucket is not bound",r2off:1},400);
   const sp=new URL(req.url).searchParams,id=sp.get("id")||"",uid=sp.get("uploadId")||"",n=parseInt(sp.get("n"),10);
   if(!FID.test(id)||!uid||!(n>=1&&n<=20))return J({error:"Bad upload request"},400);
   const buf=await req.arrayBuffer();
   if(!buf.byteLength||buf.byteLength>PARTB)return J({error:"Bad part size"},400);
   const r=await env.BUCKET.resumeMultipartUpload("f/"+id,uid).uploadPart(n,buf);
   return J({etag:r.etag,n})}
  if(p==="/api/up/done"){
   if(!env.BUCKET)return J({error:"R2 bucket is not bound",r2off:1},400);
   const id=String(b.id||"");
   if(!FID.test(id)||!b.uploadId||!OKMIME.test(b.mime)||!Array.isArray(b.parts)||!b.parts.length||b.parts.length>20)return J({error:"Bad upload request"},400);
   const o=await env.BUCKET.resumeMultipartUpload("f/"+id,b.uploadId).complete(b.parts.map(x=>({partNumber:x.partNumber,etag:x.etag})));
   if(o.size>MAXB){await env.BUCKET.delete("f/"+id);return J({error:"File must be under 100 MB"},413)}
   await q("INSERT INTO files VALUES(?1,?2,?3,'@r2',?4)",id,String(b.name||"file").slice(0,80),b.mime,now).run();
   return J({id,size:o.size})}
  if(p==="/api/up/abort"){
   const id=String(b.id||"");
   if(env.BUCKET&&FID.test(id)&&b.uploadId)try{await env.BUCKET.resumeMultipartUpload("f/"+id,b.uploadId).abort()}catch(e){}
   return J({ok:1})}

  if(p==="/api/upload"){
   const n=Number.isInteger(b.n)?b.n:0;
   if(!OKMIME.test(b.mime)||typeof b.data!=="string"||!b.data||b.data.length>8e5||n<0||n>7)return J({error:"Use a file under 4 MB"},400);
   await DB.batch([DB.prepare(FBDDL),DB.prepare(PDDL)]);
   let id=b.id;
   if(id){if(!await q("SELECT 1 x FROM files WHERE id=?1",id).first())return J({error:"Upload expired. Try again."},404)}
   else{id=rnd(8);await q("INSERT INTO files VALUES(?1,?2,?3,'',?4)",id,String(b.name||"file").slice(0,80),b.mime,now).run()}
   await q("INSERT OR REPLACE INTO parts VALUES(?1,?2,?3)",id,n,b.data).run();return J({id})}
  if(!su)return J({error:"Super admin only"},403);
  if(p==="/api/files/cleanup"){
   try{await DB.batch([DB.prepare(FBDDL),DB.prepare(PDDL)])}catch(e){}
   const old=now-36e5,fl=(await q("SELECT id FROM files WHERE at<?1",old).all()).results,keep=await refd(fl.map(x=>x.id)),orph=fl.filter(x=>!keep.has(x.id));
   if(b.peek)return J({count:orph.length});
   let n=0;for(const f of orph.slice(0,100)){await kill(f.id);n++}
   if(n)await note(m.name,"Deleted "+n+" unused file"+(n>1?"s":"")+" from storage").run();
   return J({deleted:n,left:orph.length-n})}
  if(p==="/api/review"){
   const c=await q("SELECT * FROM changes WHERE id=?1 AND status='pending'",b.id).first();
   if(!c)return J({error:"Already reviewed"},404);
   if(b.approve){let cd=c.data;try{cd=JSON.stringify(clean(JSON.parse(c.data)))}catch(e){}await put(c.section,cd,c.author+" (approved)")}
   await DB.batch([q("UPDATE changes SET status=?1,note=?2,reviewed_by=?3,reviewed_at=?4 WHERE id=?5",b.approve?"approved":"rejected",b.note||"",m.name,now,c.id),note(m.name,(b.approve?"Approved ":"Rejected ")+c.author+"'s "+c.section+" change")]);
   return J({ok:1})}
  if(p==="/api/migrate"){
   await DB.batch([DB.prepare(FBDDL),DB.prepare(PDDL)]);
   const old=now-36e5,WH="(data IS NULL OR data!='@r2') AND at<?1",cnt=async()=>(await q("SELECT COUNT(*) n FROM files WHERE "+WH,old).first()).n;
   if(!env.BUCKET)return J({r2off:1,left:await cnt()});
   if(b.peek)return J({left:await cnt()});
   const f=await q("SELECT * FROM files WHERE "+WH+" LIMIT 1",old).first();
   if(!f)return J({moved:0,left:0});
   const rows=(await q("SELECT data FROM parts WHERE id=?1 ORDER BY n",f.id).all()).results,pl=rows.length?rows.map(x=>x.data):(f.data?[f.data]:[]);
   if(!pl.length){await DB.batch([q("DELETE FROM files WHERE id=?1",f.id),note(m.name,"Removed empty file record "+f.name)]);return J({moved:0,dropped:1,left:await cnt()})}
   const bs=pl.map(s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))),len=bs.reduce((a,x)=>a+x.length,0),all=new Uint8Array(len);let o=0;bs.forEach(x=>{all.set(x,o);o+=x.length});
   await env.BUCKET.put("f/"+f.id,all,{httpMetadata:{contentType:f.mime}});
   const h=await env.BUCKET.head("f/"+f.id);
   if(!h||h.size!==len)return J({error:"Could not verify "+f.name+" in R2. Nothing was deleted."},500);
   await DB.batch([q("UPDATE files SET data='@r2' WHERE id=?1",f.id),q("DELETE FROM parts WHERE id=?1",f.id),note(m.name,"Moved file "+f.name+" to R2")]);
   return J({moved:1,name:f.name,left:await cnt()})}
  if(p==="/api/admins")return J((await q("SELECT id,name,role,active FROM admins ORDER BY role='super' DESC,name").all()).results);
  if(p==="/api/admin"){
   const s=rnd(8);let msg;
   try{
    if(b.op==="add"){
     const nm=String(b.name||"").replace(/[<>]/g,"").trim().slice(0,40);if(!nm||!PIN.test(b.pin))return J({error:"Name and 4-digit PIN required"},400);
     if(await rl("P:"+m.id,20,36e5))return J({error:"Too many tries. Try again in an hour."},429);
     if(await taken(b.pin,0))return J({error:PINUSED},409);
     await q("INSERT INTO admins(name,salt,pin,role,created_at) VALUES(?1,?2,?3,'sub',?4)",nm,s,await hn(b.pin,s),now).run();msg="Added sub admin "+nm}
    else{
     const t=await q("SELECT * FROM admins WHERE id=?1",b.id).first();if(!t||t.role==="super")return J({error:"Not allowed"},400);
     if(b.op==="del"){await DB.batch([q("DELETE FROM sessions WHERE admin_id=?1",t.id),q("DELETE FROM admins WHERE id=?1",t.id)]);msg="Deleted "+t.name}
     else if(b.op==="pin"){if(!PIN.test(b.pin))return J({error:"PIN must be 4 digits"},400);if(await rl("P:"+m.id,20,36e5))return J({error:"Too many tries. Try again in an hour."},429);if(await taken(b.pin,t.id))return J({error:PINUSED},409);await q("UPDATE admins SET salt=?1,pin=?2,fails=0,locked_until=0 WHERE id=?3",s,await hn(b.pin,s),t.id).run();msg="Reset PIN for "+t.name}
     else if(b.op==="name"){const nn=String(b.name||"").replace(/[<>]/g,"").trim().slice(0,40);if(!nn)return J({error:"Name required"},400);await q("UPDATE admins SET name=?1 WHERE id=?2",nn,t.id).run();msg="Renamed "+t.name}
     else if(b.op==="active"){await DB.batch([q("UPDATE admins SET active=?1 WHERE id=?2",b.active?1:0,t.id),q("DELETE FROM sessions WHERE admin_id=?1",t.id)]);msg=(b.active?"Enabled ":"Disabled ")+t.name}
     else return J({error:"Unknown action"},400)}
   }catch(e){return J({error:"That name is already used"},409)}
   await note(m.name,msg).run();return J({ok:1})}
  if(p==="/api/changes/clear"){const olds=(await q("SELECT data FROM changes WHERE status!='pending'").all()).results;await q("DELETE FROM changes WHERE status!='pending'").run();for(const o of olds){try{await gc(fids(JSON.parse(o.data)),m.name)}catch(e){}}await note(m.name,"Cleared review history").run();return J({ok:1})}
  if(p==="/api/log/clear"){await q("DELETE FROM log").run();await note(m.name,"Cleared the activity log").run();return J({ok:1})}
  if(p==="/api/log")return J((await q("SELECT * FROM log ORDER BY id DESC LIMIT 100").all()).results);
  return J({error:"Not found"},404);
 }catch(e){return /network|overload|timeout|reset|temporar|try again|D1_ERROR/i.test(e.message)?J({error:"The database is busy. Please try again.",retry:1},503):(console.error("worker error:",e&&e.message),J({error:"Server error. Please try again."},500))}
}};