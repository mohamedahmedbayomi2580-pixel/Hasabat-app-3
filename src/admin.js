import {canon} from "./phone.js";
import {auth,db,app} from "./firebase-config.js";
import {signInWithEmailAndPassword as si,onAuthStateChanged as on,signOut,updatePassword} from "firebase/auth";
import {doc,getDoc,getDocs,addDoc,updateDoc,collection,collectionGroup,query,where,orderBy,limit,serverTimestamp,getCountFromServer,Timestamp} from "firebase/firestore";
import {getFunctions,httpsCallable} from "firebase/functions";
import {ic} from "./ui.js";
const $=i=>document.getElementById(i);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=t=>t?.toDate?t.toDate().toLocaleString("ar-EG"):"-";
const nmc={},nm=async u=>nmc[u]??=((await getDoc(doc(db,"users",u))).data()?.username||u.slice(0,6));
const sel={id:null};
const go=()=>si(auth,$("u").value.trim()+"@admin.hasabat.app",$("p").value).catch(e=>$("e").textContent=e.message);
$("go").onclick=go;$("p").onkeydown=e=>e.key==="Enter"&&go();
$("x").onclick=()=>signOut(auth).then(()=>location.replace("index.html"));
const log=(a,t)=>addDoc(collection(db,"auditLogs"),{admin:auth.currentUser.uid,action:a,target:t||null,at:serverTimestamp()});
on(auth,async u=>{if(!u){$("lg").hidden=false;$("ad").hidden=true;return}
 const a=await getDoc(doc(db,"admins",u.uid));if(!a.exists()){$("e").textContent="غير مصرح";return signOut(auth)}
 if(a.data().mustChange){const n=prompt("يجب تغيير كلمة المرور (8+ أحرف)");if(!n||n.length<8)return signOut(auth);await updatePassword(u,n);await updateDoc(a.ref,{mustChange:false})}
 $("lg").hidden=true;$("ad").hidden=false;list();stats()});
const ov=(title,html)=>{$("ovt").textContent=title;$("ovb").innerHTML=html||"";$("ov").hidden=false};
$("ovx").onclick=()=>{$("ov").hidden=true};$("ov").onclick=e=>{if(e.target===$("ov"))$("ov").hidden=true};
const cnt=async q=>{try{return (await getCountFromServer(q)).data().count}catch(e){return "؟"}};
async function stats(){const U=collection(db,"users"),d=new Date();d.setHours(0,0,0,0);
 const [a,o,b,c,m]=await Promise.all([cnt(U),cnt(query(U,where("online","==",true))),cnt(query(U,where("status","!=","active"))),cnt(collection(db,"chats")),cnt(query(collectionGroup(db,"messages"),where("createdAt",">=",Timestamp.fromDate(d))))]);
 const s=(await getDoc(doc(db,"stats","global")).catch(()=>null))?.data()||{};
 $("sts").innerHTML=`<p>${ic("user",18)} الحسابات: <b>${a}</b> &nbsp; <span class="dot g"></span>متصلون ${o} &nbsp; <span class="dot r"></span>محظور/معطل ${b}</p><p>${ic("chat",18)} المحادثات: <b>${c}</b> &nbsp; ${ic("trash",18)} حذف تلقائي: <b>${s.autoDeleted||0}</b> &nbsp; رسائل اليوم: <b>${m}</b></p><p>استهلاك المنصة والمساحة ← <a class="alink" href="https://console.firebase.google.com/project/hasabat-app-b2d8e/usage" target="_blank" rel="noopener">${ic("gear",16)} Firebase Console</a></p>`}
$("al").onclick=async()=>{await log("view_audit");const s=await getDocs(query(collection(db,"auditLogs"),orderBy("at","desc"),limit(50)));
 ov("سجل التدقيق (آخر 50)",s.docs.map(d=>{const x=d.data();return `<p><small>${T(x.at)}</small><br>${esc(x.action)} ← ${esc(x.target||"")}</p>`}).join(""))};
let qt;$("s").oninput=()=>{clearTimeout(qt);qt=setTimeout(()=>list($("s").value.trim()),300)};
const dotOf=x=>x.status==="active"?(x.online?"g":"o"):x.status==="banned"?"r":"x";
async function list(ph){const lo=(ph||"").toLowerCase(),dg=canon(ph||""),isNum=/^[\d\s\-+()]+$/.test(ph||"");
 const q=!ph?query(collection(db,"users"),limit(100)):isNum?query(collection(db,"users"),where("phoneNorm","==",dg)):query(collection(db,"users"),where("usernameLower",">=",lo),where("usernameLower","<=",lo+"\uf8ff"),limit(100));
 const sn=await getDocs(q);$("st").textContent="الحسابات الحالية: "+sn.size;$("ul").innerHTML="";
 sn.docs.forEach(d=>{const x=d.data(),r=document.createElement("button");r.className="arow";r.innerHTML=`<span class="dot ${dotOf(x)}"></span><span>${esc(x.username)} — <b class="alink" data-ph="1">${esc(x.phone)}</b></span><small>${x.status==="active"?"Active":esc(x.status)}</small>`;
  r.onclick=e=>e.target.closest("[data-ph]")?userChats(d.id,x.username):user(d.id);$("ul").append(r)})}
async function userChats(id,name){sel.id=id;await log("view_user_chats",id);const cs=await getDocs(query(collection(db,"chats"),where("members","array-contains",id)));
 ov("محادثات "+(name||""),"");const box=$("ovb");if(!cs.size)box.innerHTML="<p>لا توجد محادثات</p>";
 for(const c of cs.docs){const d=c.data();let label;if(d.isGroup)label="👥 "+d.name+" ("+d.members.length+" عضو)";else{const o=d.members.find(m=>m!==id),od=(await getDoc(doc(db,"users",o))).data()||{};label="💬 "+(od.username||o)+" — "+(od.phone||"")}
  const b=document.createElement("button");b.className="arow";b.innerHTML=`<span>${esc(label)}</span><small>${T(d.updatedAt)}</small>`;b.onclick=()=>msgs(c.id,label);box.append(b)}}
async function msgs(cid,label){await log("view_chat",cid);const ms=await getDocs(query(collection(db,"chats",cid,"messages"),orderBy("createdAt","desc"),limit(150)));
 ov(label,"<small>الرسائل المحفوظة على السيرفر (آخر 24 ساعة) مرتبة زمنيًا</small>");const box=$("ovb");if(!ms.size)box.innerHTML+="<p>لا توجد رسائل محفوظة</p>";
 for(const d of ms.docs.reverse()){const m=d.data(),p=document.createElement("p");p.innerHTML=`<b>${esc(await nm(m.from))}</b> <small>${T(m.createdAt)}</small><br>${m.deleted?"(محذوفة)":m.audio?"🎤 رسالة صوتية":esc(m.text)}`;
  if(m.audio&&!m.deleted&&String(m.audio).startsWith("data:audio/")){const a=document.createElement("audio");a.controls=true;a.src=m.audio;p.append(a)}box.append(p)}}
$("sm").onclick=()=>sel.id?userChats(sel.id):alert("اختر حسابًا أولًا");
$("bc").onclick=async()=>{const title=prompt("عنوان الإشعار");if(!title)return;const body=prompt("نص الإشعار");if(!body)return;if(!confirm("إرسال هذا الإشعار لجميع المستخدمين؟"))return;
 try{await addDoc(collection(db,"broadcasts"),{title,body,admin:auth.currentUser.uid,at:serverTimestamp()});await log("broadcast",null);alert("تم إرسال الإشعار")}catch(e){alert(e.message)}};
async function user(id,quiet){sel.id=id;if(!quiet)await log("view_user",id);const x=(await getDoc(doc(db,"users",id))).data();if(!x)return;
 const vs=(await getDocs(query(collection(db,"violations"),where("uid","==",id),limit(20)))).docs.map(d=>d.data()).sort((a,b)=>(b.at?.seconds||0)-(a.at?.seconds||0));
 $("dt").innerHTML=`<h3 style="margin:0 0 8px"><span class="dot ${dotOf(x)}"></span>${esc(x.username)} — <b class="alink" id="dph">${esc(x.phone)}</b> ${x.badge?`<span class="badge" style="background:${esc(x.badge.color)}">${esc(x.badge.label)}</span>`:""}</h3>
<p>الحالة: <b>${esc(x.status)}</b>${x.banReason?" ("+esc(x.banReason)+")":""} | ${x.online?"متصل":"غير متصل"}<br>تاريخ التسجيل: ${T(x.createdAt)} | آخر نشاط: ${T(x.lastSeen)}<br>تقييد الرسائل: ${x.restrictMsg?"نعم":"لا"} | تقييد المجموعات: ${x.restrictGroups?"نعم":"لا"}</p>
<div class="agrid" id="g1"></div><div class="agrid" id="g2"></div><div id="g3"></div>
<h4>سجل المخالفات (${vs.length})</h4>${vs.map(v=>`<p>• ${esc(v.reason)} — <small>${T(v.at)}</small></p>`).join("")||"<small>لا توجد مخالفات</small>"}
<h4>جهات التواصل والمحادثات</h4><div id="cs"></div>`;
 $("dph").onclick=()=>userChats(id,x.username);
 const U=(f,a)=>updateDoc(doc(db,"users",id),f).then(()=>log(a,id)).then(()=>{list($("s").value.trim());stats();user(id,true)}).catch(e=>alert(e.message));
 const viol=r=>addDoc(collection(db,"violations"),{uid:id,reason:r,admin:auth.currentUser.uid,at:serverTimestamp()});
 const B=(h,t,c,f)=>{const b=document.createElement("button");b.className="abtn "+c;b.textContent=t;b.onclick=f;$(h).append(b)};
 if(x.status==="banned")B("g1","فك الحظر","",()=>U({status:"active",banReason:""},"unban"));else B("g1","حظر","red",async()=>{const r=prompt("سبب الحظر");if(r){await viol("حظر: "+r);U({status:"banned",banReason:r,bannedAt:serverTimestamp()},"ban")}});
 if(x.status==="suspended")B("g1","إلغاء التعطيل","or",()=>U({status:"active",banReason:""},"unsuspend"));else B("g1","تعطيل مؤقت","or",()=>U({status:"suspended",banReason:prompt("السبب")||""},"suspend"));
 B("g1",x.restrictMsg?"فك تقييد الرسائل":"تقييد الرسائل","",()=>U({restrictMsg:!x.restrictMsg},"restrict_msg"));
 B("g2",x.restrictGroups?"فك تقييد المجموعات":"تقييد المجموعات","",()=>U({restrictGroups:!x.restrictGroups},"restrict_groups"));
 B("g2","اسم مميز","",()=>{const l=prompt("الاسم المميز (اتركه فارغًا لإزالته)");if(l===null)return;if(!l)return U({badge:null},"badge_remove");const c=prompt("اللون (hex)","#FF7900")||"";U({badge:{label:l,color:/^#[0-9a-f]{6}$/i.test(c)?c:"#FF7900"}},"badge")});
 B("g2","تسجيل مخالفة","",async()=>{const r=prompt("وصف المخالفة");if(r){await viol(r);await log("violation",id);user(id,true)}});
 B("g3","حذف الحساب","or wide",async()=>{if(!confirm("حذف الحساب نهائيًا؟"))return;try{await httpsCallable(getFunctions(app),"deleteAccount")({uid:id});alert("تم الحذف");$("dt").innerHTML="";sel.id=null;list();stats()}catch(e){alert(e.message)}});
 const cs=await getDocs(query(collection(db,"chats"),where("members","array-contains",id)));
 for(const c of cs.docs){const d=c.data();let label;if(d.isGroup)label=d.name+" — "+d.members.length+" عضو";else{const o=d.members.find(m=>m!==id),od=(await getDoc(doc(db,"users",o))).data()||{};label=(od.username||o)+" — "+(od.phone||"")}
  const b=document.createElement("button");b.className="arow";b.innerHTML=`${ic(d.isGroup?"users":"chat",18)}<span>${esc(label)}<br><small>آخر تواصل: ${T(d.updatedAt)}</small></span>`;b.onclick=()=>msgs(c.id,label);$("cs").append(b)}}
