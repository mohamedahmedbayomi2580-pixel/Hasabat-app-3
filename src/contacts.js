// تحميل جهات اتصال الهاتف (بإذن المستخدم) ومطابقتها مع المسجلين. تُحفظ محليًا (SQLite) ونسخة على السيرفر لمدة 3 أيام ثم تُمسح
import {Capacitor} from "@capacitor/core";
import {Contacts} from "@capacitor-community/contacts";
import {db} from "./firebase-config.js";
import {collection,getDocs,getDoc,setDoc,doc,query,where,limit,serverTimestamp,Timestamp} from "firebase/firestore";
import {Local} from "./local-db.js";
import {canon as dg} from "./phone.js";
import {Share} from "@capacitor/share";
import {toast} from "./ui.js";
import {L} from "./i18n.js";
const variants=d=>{const v=new Set([d]);if(d.startsWith("20")&&d.length===12)v.add("0"+d.slice(2));else if(d.startsWith("0"))v.add("20"+d.slice(1));return[...v]};
async function readPhone(){
 if(Capacitor.isNativePlatform()){const p=await Contacts.requestPermissions();if(p.contacts!=="granted")throw Error("لم يتم السماح بالوصول لجهات الاتصال");
  const r=await Contacts.getContacts({projection:{name:true,phones:true}});
  return r.contacts.map(c=>({n:c.name?.display||c.name?.given||"",ph:(c.phones||[]).map(x=>x.number)}))}
 if("contacts" in navigator&&navigator.contacts.select){const r=await navigator.contacts.select(["name","tel"],{multiple:true});return r.map(c=>({n:(c.name||[])[0]||"",ph:c.tel||[]}))}
 throw Error("هذه الميزة تعمل في تطبيق الأندرويد (APK)")}
export async function importContacts(meUid,onProg){
 const list=[];(await readPhone()).forEach(c=>{const seen=new Set();c.ph.forEach(x=>{const d=dg(x);if(d.length<8||d.length>15||seen.has(d))return;seen.add(d);list.push({n:c.n||d,p:d})})});
 const all=[...new Set(list.flatMap(c=>variants(c.p)))],found={},chunks=[];
 for(let i=0;i<all.length;i+=30)chunks.push(all.slice(i,i+30));
 const one=async ch=>(await getDocs(query(collection(db,"users"),where("phoneNorm","in",ch),limit(30)))).forEach(d=>{const u=d.data();if(d.id!==meUid&&u.status==="active")found[u.phoneNorm]={uid:d.id,name:u.username}});
 for(let i=0;i<chunks.length;i+=8){await Promise.all(chunks.slice(i,i+8).map(one));onProg?.(Math.min(i+8,chunks.length),chunks.length)}
 const rows=list.map(c=>{const m=variants(c.p).map(v=>found[v]).find(Boolean);return{n:c.n,p:c.p,uid:m?.uid||null}}).sort((a,b)=>a.n.localeCompare(b.n,"ar"));
 await Local.kvSet("phonebook",JSON.stringify(rows));return rows}
export const savedContacts=async()=>{try{return JSON.parse(await Local.kvGet("phonebook")||"[]")}catch(e){return[]}};
// نسخة السيرفر: كل الجهات في حقل نصي واحد (حتى ~15 ألف جهة)، وتُمسح تلقائيًا بعد 3 أيام (expireAt + دالة cleanup)
export const syncUp=(uid,rows)=>{let r=rows.slice(0,15000),data=JSON.stringify(r.map(c=>[c.n,c.p,c.uid||0]));
 while(data.length>450000&&r.length>10){r=r.slice(0,Math.floor(r.length*.9));data=JSON.stringify(r.map(c=>[c.n,c.p,c.uid||0]))}
 return setDoc(doc(db,"contactSync",uid),{data,count:r.length,at:serverTimestamp(),expireAt:Timestamp.fromMillis(Date.now()+3*864e5)})};
export async function restoreSynced(uid){try{const s=await getDoc(doc(db,"contactSync",uid));if(!s.exists()||s.data().expireAt.toMillis()<Date.now())return null;const x=s.data();
 return x.data?JSON.parse(x.data).map(([n,p,u])=>({n,p,uid:u||null})):(x.rows||[]).map(r=>({n:r.n,p:r.p,uid:r.u}))}catch(e){return null}}
// دعوة صديق لتنزيل التطبيق (قائمة المشاركة في الهاتف: واتساب، رسائل، ...)
const LINK="https://hasabat-app-b2d8e.web.app";
export const getInviteLink=async()=>(await Local.kvGet("inviteLink").catch(()=>null))||LINK;
export const setInviteLink=v=>Local.kvSet("inviteLink",v);
export async function invite(name){const link=await getInviteLink(),text=L(`مرحبًا ${name}! انضم لي على تطبيق حاسبات ابب للمحادثات. حمّل التطبيق من هنا:\n${link}`,`Hi ${name}! Join me on Hasabat App. Download it here:\n${link}`);
 try{if((await Share.canShare()).value){await Share.share({title:"حاسبات ابب",text,dialogTitle:L("إرسال دعوة","Send invite")})}
  else if(navigator.share)await navigator.share({title:"حاسبات ابب",text});
  else{await navigator.clipboard.writeText(text);toast(L("تم نسخ الدعوة، الصقها في أي تطبيق","Invite copied, paste it anywhere"))}}
 catch(e){if(!/cancel|abort/i.test(String(e?.name||e?.message||e)))toast(L("تعذرت المشاركة","Share failed"))}}
