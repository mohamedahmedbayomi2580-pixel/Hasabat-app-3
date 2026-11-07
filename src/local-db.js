// تخزين محلي: SQLite على الأندرويد، وIndexedDB كبديل تلقائي. جداول: messages, kv (إعدادات/خلفيات/قفل), contacts
// يُنشئ الجداول بعبارات منفصلة ويتحقق منها، ويُصلح نفسه تلقائيًا لو جدول أو عمود ناقص
import {Capacitor} from "@capacitor/core";
import {CapacitorSQLite as SQ} from "@capacitor-community/sqlite";
const DB="hasabat";let native=Capacitor.isNativePlatform(),ready,idb;
const COLS=["id","cid","sender","sname","text","status","ts","reply","edited","deleted","hidden","audio","dur","react","fwd","star"];
const TABLES=["CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,cid TEXT,sender TEXT,sname TEXT,text TEXT,status TEXT,ts INTEGER,reply TEXT,edited INTEGER DEFAULT 0,deleted INTEGER DEFAULT 0,hidden INTEGER DEFAULT 0,audio TEXT,dur INTEGER DEFAULT 0,react TEXT,fwd INTEGER DEFAULT 0,star INTEGER DEFAULT 0)","CREATE INDEX IF NOT EXISTS ix ON messages(cid,ts)","CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT)","CREATE TABLE IF NOT EXISTS contacts(uid TEXT PRIMARY KEY,username TEXT,phone TEXT)"];
const ADD=[["audio","TEXT"],["dur","INTEGER DEFAULT 0"],["react","TEXT"],["fwd","INTEGER DEFAULT 0"],["star","INTEGER DEFAULT 0"]];
const rawRun=(s,v=[])=>SQ.run({database:DB,statement:s,values:v});
const rawQry=async(s,v=[])=>(await SQ.query({database:DB,statement:s,values:v})).values||[];
async function schema(){for(const s of TABLES)await SQ.execute({database:DB,statements:s});
 for(const [n,d] of ADD){try{await rawQry(`SELECT ${n} FROM messages LIMIT 1`)}catch(e){await rawRun(`ALTER TABLE messages ADD COLUMN ${n} ${d}`)}}
 await rawQry("SELECT v FROM kv LIMIT 1");await rawQry("SELECT id,audio,react,star FROM messages LIMIT 1");await rawQry("SELECT uid FROM contacts LIMIT 1")}
const heal=async e=>{if(!/no such (table|column)/i.test(String(e?.message||e)))throw e;await schema()};
const run=async(s,v)=>{try{return await rawRun(s,v)}catch(e){await heal(e);return rawRun(s,v)}};
const qry=async(s,v)=>{try{return await rawQry(s,v)}catch(e){await heal(e);return rawQry(s,v)}};
const idbOpen=()=>new Promise((ok,no)=>{const r=indexedDB.open(DB,2);r.onupgradeneeded=()=>{const d=r.result,h=n=>d.objectStoreNames.contains(n);if(!h("messages"))d.createObjectStore("messages",{keyPath:"id"}).createIndex("cid","cid");if(!h("kv"))d.createObjectStore("kv",{keyPath:"k"});if(!h("contacts"))d.createObjectStore("contacts",{keyPath:"uid"})};r.onsuccess=()=>{idb=r.result;ok()};r.onerror=no});
const init=()=>ready||(ready=(async()=>{if(native){
 try{await SQ.createConnection({database:DB,version:1,encrypted:false,mode:"no-encryption",readonly:false})}catch(e){/* قد يكون الاتصال موجودًا بعد استئناف التطبيق */}
 try{await SQ.open({database:DB})}catch(e){/* قد تكون مفتوحة */}
 try{await schema();return}catch(e){console.warn("SQLite فشل، استخدام IndexedDB",e);native=false}}
 await idbOpen()})());
const st=(m="readonly",s="messages")=>idb.transaction(s,m).objectStore(s);
const p=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=no});
export const Local={
 async save(m){await init();const v=COLS.map(c=>m[c]??(["edited","deleted","hidden","dur","fwd","star"].includes(c)?0:""));
  if(native)return run(`INSERT INTO messages(${COLS}) VALUES(${"?,".repeat(COLS.length-1)}?) ON CONFLICT(id) DO UPDATE SET text=excluded.text,status=excluded.status,ts=excluded.ts,edited=excluded.edited,deleted=excluded.deleted,hidden=MAX(hidden,excluded.hidden),audio=excluded.audio,dur=excluded.dur,react=excluded.react,fwd=excluded.fwd`,v);
  const o=await p(st().get(m.id));if(o){m.hidden=Math.max(o.hidden||0,m.hidden||0);m.star=o.star||m.star||0}await p(st("readwrite").put(m))},
 async list(cid,n){await init();if(native)return(await qry("SELECT * FROM messages WHERE cid=? ORDER BY ts DESC LIMIT ?",[cid,n])).reverse();
  return(await p(st().index("cid").getAll(cid))).sort((a,b)=>a.ts-b.ts).slice(-n)},
 async hide(id){await init();if(native)return run("UPDATE messages SET hidden=1 WHERE id=?",[id]);const o=await p(st().get(id));if(o){o.hidden=1;await p(st("readwrite").put(o))}},
 async setStar(id,v){await init();if(native)return run("UPDATE messages SET star=? WHERE id=?",[v?1:0,id]);const o=await p(st().get(id));if(o){o.star=v?1:0;await p(st("readwrite").put(o))}},
 async kvGet(k){await init();if(native)return(await qry("SELECT v FROM kv WHERE k=?",[k]))[0]?.v??null;return(await p(st("readonly","kv").get(k)))?.v??null},
 async kvSet(k,v){await init();if(native)return run("INSERT OR REPLACE INTO kv(k,v) VALUES(?,?)",[k,v]);await p(st("readwrite","kv").put({k,v}))},
 async kvDel(k){await init();if(native)return run("DELETE FROM kv WHERE k=?",[k]);await p(st("readwrite","kv").delete(k))},
 async kvKeys(prefix){await init();const all=native?await qry("SELECT k FROM kv"):await p(st("readonly","kv").getAll());return all.map(x=>x.k).filter(k=>k.startsWith(prefix))},
 async putContact(c){await init();if(native)return run("INSERT OR REPLACE INTO contacts(uid,username,phone) VALUES(?,?,?)",[c.uid,c.username||"",c.phone||""]);await p(st("readwrite","contacts").put(c))},
 async contacts(){await init();if(native)return qry("SELECT * FROM contacts");return p(st("readonly","contacts").getAll())},
 async all(){await init();if(native)return{v:1,messages:await qry("SELECT * FROM messages"),kv:await qry("SELECT * FROM kv")};return{v:1,messages:await p(st().getAll()),kv:await p(st("readonly","kv").getAll())}},
 async restore(o,cb){let n=0;const tot=(o.messages||[]).length;for(const m of o.messages||[]){await Local.save(m);if(m.star)await Local.setStar(m.id,1);n++;if(cb&&(n%20===0||n===tot))cb(n,tot)}for(const x of o.kv||[])await Local.kvSet(x.k,x.v);return n}
};
