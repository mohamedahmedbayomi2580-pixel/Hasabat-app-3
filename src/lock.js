// قفل المحادثات بكلمة سر (محلي على الجهاز، بدون بصمة). كلمة السر تُخزَّن مُجزّأة PBKDF2 + salt
import {Local} from "./local-db.js";
import {auth} from "./firebase-config.js";
import {reauthenticateWithCredential,EmailAuthProvider} from "firebase/auth";
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const bytes=h=>new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));
const hash=async(pw,salt)=>{const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:150000,hash:"SHA-256"},k,256))};
const kg=k=>Local.kvGet(k).catch(()=>null);
const open=new Set();document.addEventListener("visibilitychange",()=>{if(document.hidden)open.clear()});
export const list=async()=>JSON.parse(await kg("locked")||"[]");
async function verify(msg){const s=await kg("lockpw");if(!s)return true;const pw=prompt(msg||"كلمة سر القفل");if(!pw)return false;const [salt,h]=s.split(":");if(await hash(pw,bytes(salt))===h)return true;alert("كلمة السر غير صحيحة");return false}
async function setPw(){const a=prompt("اختر كلمة سر للقفل (4 أحرف على الأقل)");if(!a||a.length<4){alert("كلمة السر قصيرة");return false}if(prompt("أعد كتابتها")!==a){alert("غير متطابقة");return false}
 const salt=crypto.getRandomValues(new Uint8Array(16));await Local.kvSet("lockpw",hex(salt)+":"+await hash(a,salt));return true}
export async function unlock(cid){if(!(await list()).includes(cid)||open.has(cid))return true;if(await verify("هذه المحادثة مقفولة — أدخل كلمة السر")){open.add(cid);return true}return false}
export async function toggle(cid){if(!await kg("lockpw")){if(!await setPw())return null}else if(!await verify())return null;
 const l=await list(),on=!l.includes(cid);await Local.kvSet("locked",JSON.stringify(on?[...l,cid]:l.filter(x=>x!==cid)));on?open.add(cid):open.delete(cid);return on}
export async function change(){if(!await kg("lockpw"))return alert("اقفل أي محادثة أولًا لتعيين كلمة السر");if(await verify("كلمة السر الحالية"))await setPw()}
export async function reset(){const pw=prompt("نسيت كلمة السر؟ اكتب كلمة مرور حسابك للتأكيد");if(!pw)return false;
 try{await reauthenticateWithCredential(auth.currentUser,EmailAuthProvider.credential(auth.currentUser.email,pw));await Local.kvSet("locked","[]");await Local.kvSet("lockpw","");open.clear();return true}catch(e){alert("كلمة مرور الحساب غير صحيحة");return false}}
