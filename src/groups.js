import {canon} from "./phone.js";
import {db} from "./firebase-config.js";
import {doc,setDoc,updateDoc,collection,serverTimestamp,arrayUnion,arrayRemove} from "firebase/firestore";
import {S,$,toast,sheet,closeSheet,findByPhones} from "./ui.js";
const phones=t=>(t||"").split(/[,،;\n]+/).map(x=>canon(x)).filter(Boolean);
export function createGroup(){sheet(`<h3>👥 مجموعة جديدة</h3><input class="in" id="gn" placeholder="اسم المجموعة"><textarea class="in" id="gp" rows="4" placeholder="أرقام الأعضاء (رقم في كل سطر أو مفصولة بفاصلة)"></textarea><button class="btn" id="gc">إنشاء</button>`);
 $("gc").onclick=async()=>{const name=$("gn").value.trim();if(!name)return toast("اكتب اسم المجموعة");const m=phones($("gp").value);$("gc").disabled=true;
  try{const {uids,got}=m.length?await findByPhones(m):{uids:[],got:new Set()},miss=m.filter(p=>!got.has(p)),members=[...new Set([S.me.uid,...uids])];
   await setDoc(doc(collection(db,"chats")),{isGroup:true,name,members,admins:[S.me.uid],updatedAt:serverTimestamp(),lastText:"تم إنشاء المجموعة"});
   closeSheet();toast("تم إنشاء المجموعة ("+members.length+" عضو)"+(miss.length?" — غير مسجلين: "+miss.join("، "):""))}
  catch(e){toast("تعذر إنشاء المجموعة: "+(e.code||e.message));$("gc").disabled=false}}}
const cr=cid=>doc(db,"chats",cid),adminOnly=()=>toast("هذا الإجراء للمشرفين فقط");
export const addMember=async(cid,done)=>{const p=phones(prompt("رقم هاتف العضو"));if(!p.length)return;try{const {uids}=await findByPhones(p);if(!uids[0])return toast("المستخدم غير موجود");await updateDoc(cr(cid),{members:arrayUnion(uids[0])});toast("✔");done?.()}catch(e){adminOnly()}};
export const removeMember=async(cid,u,done)=>{try{await updateDoc(cr(cid),{members:arrayRemove(u),admins:arrayRemove(u)});done?.()}catch(e){adminOnly()}};
export const makeAdmin=async(cid,u,done)=>{try{await updateDoc(cr(cid),{admins:arrayUnion(u)});done?.()}catch(e){adminOnly()}};
export const renameGroup=async(cid,done)=>{const n=prompt("الاسم الجديد");if(!n)return;try{await updateDoc(cr(cid),{name:n});done?.(n)}catch(e){adminOnly()}};
export const leaveGroup=async(cid,done)=>{if(!confirm("مغادرة المجموعة؟"))return;try{await updateDoc(cr(cid),{members:arrayRemove(S.me.uid)});done?.()}catch(e){toast("تعذرت المغادرة")}};
