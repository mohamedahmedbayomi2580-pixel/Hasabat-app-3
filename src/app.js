import {auth,db} from "./firebase-config.js";
import {createUserWithEmailAndPassword as reg,signInWithEmailAndPassword as login,onAuthStateChanged as onA,signOut} from "firebase/auth";
import {doc,setDoc,getDoc,updateDoc,collection,query,where,orderBy,limit,onSnapshot,getDocs,serverTimestamp,Timestamp,arrayUnion,increment,deleteField} from "firebase/firestore";
import {Local} from "./local-db.js";import * as Lock from "./lock.js";import {startRecording} from "./voice.js";import {FX,loadFx,sfx,haptic,initRipple,skel,emptyEl,voicePlayer,stopAudio} from "./fx.js";
import {savedContacts,restoreSynced,invite} from "./contacts.js";
import {canon,isEg} from "./phone.js";
import {S,$,esc,toast,sheet,closeSheet,avatar,getUser,hm,dayLabel,ic,colorOf} from "./ui.js";
import {loadLang,apply,t,L} from "./i18n.js";
import {applyPrefs,openSettings,settingsBack,settingsRefresh,toggleTheme,chatBg,bgPicker} from "./settings.js";
import {initStatus,renderStatus,compose} from "./status.js";
import {createGroup,addMember,removeMember,makeAdmin,renameGroup,leaveGroup} from "./groups.js";
import {initNotifications,unregisterPush} from "./notifications.js";
let mode="L",splashDone=false,booted=false,unsubC,cur=null,unsubM,unsubT,unsubU,lastTy=0,vr=null,qt;
const TABS=["chats","groups","status"],EM=["😀","😂","😍","🥰","😎","🤔","😢","😡","👍","🙏","❤️","🔥","🎉","👏","😅","🤝","💯","😴"];
document.querySelectorAll("[data-ic]").forEach(e=>e.innerHTML=ic(e.dataset.ic));
/* ---------- تسجيل الدخول / إنشاء حساب ---------- */
const setMode=m=>{mode=m;$("tL").className=m==="L"?"on":"";$("tR").className=m==="R"?"on":"";$("regOnly").hidden=$("pol").hidden=m==="L";$("go").textContent=m==="L"?"تسجيل دخول":"إنشاء حساب"};
$("tL").onclick=()=>setMode("L");$("tR").onclick=()=>setMode("R");
$("go").onclick=async()=>{$("err").textContent="";try{
 if(mode==="L"){const e=$("em").value.trim();await login(auth,e.includes("@")?e:e+"@admin.hasabat.app",$("pw").value)} // رقم بدون @ = دخول الأدمن
 else{const em=$("em").value.trim().toLowerCase();if(!em.includes("@")||em.endsWith("@admin.hasabat.app"))throw Error("أدخل بريدًا إلكترونيًا صحيحًا");
  const ph=$("ph").value.trim(),pn=canon(ph),un=$("un").value.trim();
  if(!/^\d{8,15}$/.test(pn)||!un)throw Error("أدخل رقم هاتف صحيحًا واسم مستخدم");
  if(pn.startsWith("01")&&!isEg(pn))throw Error("رقم مصري غير صحيح: يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقمًا");
  const c=await reg(auth,em,$("pw").value);
  try{await setDoc(doc(db,"phones",pn),{uid:c.user.uid})}catch(_){await c.user.delete();throw Error("رقم الهاتف مسجل بالفعل")}
  await setDoc(doc(db,"users",c.user.uid),{phone:ph,phoneNorm:pn,username:un,usernameLower:un.toLowerCase(),gender:$("gd").value,status:"active",createdAt:serverTimestamp(),lastSeen:serverTimestamp(),online:true,badge:null,notif:{messages:true,status:true,hide:false}})}
}catch(e){$("err").textContent=e.message}};
const T0=performance.now(),minSplash=()=>new Promise(r=>setTimeout(r,Math.max(0,900-(performance.now()-T0)))),hideSplash=()=>{const s=$("splash");s.classList.add("out");setTimeout(()=>{s.hidden=true},260)};initRipple();
const net=()=>$("cstat")&&cur&&stat();addEventListener("online",()=>toast("🟢"));addEventListener("offline",()=>toast("🔴 "+t("offline")));
S.buildPb=()=>{S.pbMap=new Map(S.pb.map(c=>[c.p,c.n]))};
S.refresh=()=>{apply();paint();settingsRefresh()};
S.logout=async()=>{await Promise.race([updateDoc(doc(db,"users",S.me.uid),{online:false,lastSeen:serverTimestamp()}).catch(()=>{}),new Promise(r=>setTimeout(r,1500))]);await Promise.race([unregisterPush().catch(()=>{}),new Promise(r=>setTimeout(r,1500))]);await signOut(auth);location.reload()};
S.startWith=(uid,name)=>openChat([S.me.uid,uid].sort().join("_"),{title:name,other:uid});
S.sendDirect=(other,x,last)=>sendMsg(x,last,{cid:[S.me.uid,other].sort().join("_"),other});
S.openChatById=async cid=>{try{for(let i=0;i<40&&!S.loaded;i++)await new Promise(r=>setTimeout(r,250));let d=S.docs.find(x=>x.id===cid);if(!d){const s=await getDoc(doc(db,"chats",cid));if(!s.exists())return;d={id:cid,data:()=>s.data()}}openChat(cid,await chatInfo(d))}catch(e){}};
S.onPush=(d,title,body)=>{if(cur&&d.cid&&cur.cid===d.cid&&document.visibilityState==="visible")return;toast(title+(body?" — "+body:""),{act:[L("فتح","Open"),()=>d.cid&&S.openChatById(d.cid)]});sfx("recv")};
onA(auth,async u=>{S.me=u;await minSplash();hideSplash();$("app").hidden=!u;if(!u){$("auth").hidden=false;return}
 $("auth").hidden=true;requestAnimationFrame(moveNav);
 const adm=await getDoc(doc(db,"admins",u.uid)).catch(()=>null);if(adm&&adm.exists()){location.replace("admin.html");return} // الأدمن يُحوَّل تلقائيًا للوحة الإدارة
 let s=null;try{for(let i=0;i<10;i++){s=await getDoc(doc(db,"users",u.uid));if(s.exists()||s.metadata.fromCache)break;await new Promise(r=>setTimeout(r,500))}}catch(e){}
 if(auth.currentUser?.uid!==u.uid)return;
 if(s&&s.exists()&&s.data().status!=="active"){alert("الحساب غير نشط: "+(s.data().status==="banned"?"محظور ":"موقوف مؤقتًا ")+(s.data().banReason||""));return signOut(auth)}
 if(s&&!s.exists()&&!s.metadata.fromCache){alert("هذا الحساب غير مكتمل");return signOut(auth)}
 S.name=s?.data()?.username||await Local.kvGet("myName")||"";S.phone=s?.data()?.phone||"";if(S.name)Local.kvSet("myName",S.name);
 await applyPrefs();await loadLang();await loadFx();
 updateDoc(doc(db,"users",u.uid),{online:true,lastSeen:serverTimestamp(),tzOffset:new Date().getTimezoneOffset()}).catch(()=>{});
 if(booted)return;booted=true;initNotifications(u);initStatus();onSnapshot(doc(db,"users",u.uid),s=>{S.muted=s.data()?.muted||{};if(S.loaded&&S.tab!=="status")paint()},()=>{});
 S.pb=await savedContacts();if(!S.pb.length){const r=await restoreSynced(u.uid);if(r){S.pb=r;Local.kvSet("phonebook",JSON.stringify(r))}}S.buildPb();
 subscribeChats(u);go("chats");const qc=new URLSearchParams(location.search).get("chat");if(qc){S.openChatById(qc);history.replaceState({},"",location.pathname)}});
/* ---------- التبويبات والقوائم ---------- */
function go(tab){S.tab=tab;TABS.forEach(k=>{$("t-"+k).classList.toggle("on",k===tab);document.querySelector(`.bnav [data-t=${k}]`).classList.toggle("on",k===tab)});moveNav();paint()}
function moveNav(){const b=document.querySelector(".bnav [data-t].on"),i=document.querySelector(".nvi");if(!b||!i||!b.offsetWidth)return;i.style.width=b.offsetWidth+"px";i.style.transform=`translateX(${b.offsetLeft}px)`}addEventListener("resize",moveNav);
function paint(){({chats:()=>renderList($("t-chats"),false),groups:()=>renderList($("t-groups"),true),status:renderStatus})[S.tab]()}
document.querySelectorAll(".bnav [data-t]").forEach(b=>b.onclick=()=>go(b.dataset.t));
$("dn").onclick=()=>{const i=$("dn").querySelector(".ic");i.classList.remove("rot");void i.getBoundingClientRect();i.classList.add("rot");haptic(10);toggleTheme()};
$("fab").onclick=()=>{if(S.tab==="status")return compose();if(S.tab==="groups")return createGroup();
 sheet(`<button class="shb" id="f1">${ic("chat",20)} ${t("newchat")}</button><button class="shb" id="f2">${ic("users",20)} ${t("newgroup")}</button>`);
 $("f1").onclick=()=>{closeSheet();$("sbar").hidden=false;$("q").focus()};$("f2").onclick=()=>{closeSheet();createGroup()}};
$("menu").onclick=()=>{const s=sheet(`<button class="shb" data-m="set">${ic("gear",20)} ${t("settings")}</button><button class="shb" data-m="con">${ic("book",20)} ${L("جهات الاتصال","Contacts")}</button><button class="shb" data-m="out">${ic("logout",20)} ${t("logout")}</button>`);
 s.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{closeSheet();({set:()=>openSettings(),con:()=>openSettings("contacts"),out:S.logout})[b.dataset.m]()})};
const bdg=b=>b?`<span class="badge" style="background:${esc(b.color)}">${esc(b.label)} ✔</span>`:"";
const pbName=u=>S.pbMap.get(u?.phoneNorm);
async function chatInfo(d){const c=d.data();if(c.isGroup)return{title:c.name,group:true,members:c.members};
 const o=c.members.find(x=>x!==S.me.uid),u=await getUser(o);return{title:pbName(u)||u.username,other:o,u,badge:u.badge}}
function chatRow(d,info,lk){const c=d.data(),me=S.me.uid,un=c.unread?.[me]||0,ts=c.updatedAt?.toMillis?.(),locked=lk.includes(d.id);
 let tick="";const pu=S.prevUn||(S.prevUn={}),nw=pu[d.id]!==undefined&&un>pu[d.id];pu[d.id]=un;if(!info.group&&c.lastFrom===me)tick=(c.unread?.[info.other]||0)>0?'<span class="tk">✓</span>':'<span class="tk rd">✓✓</span>';
 const r=document.createElement("div");r.className="crow gl";
 r.innerHTML=`${info.group?`<span class="av g" style="width:46px;height:46px">${ic("users",24)}</span>`:avatar(info.title)}<div class="cm"><b class="nmx">${esc(info.title)}${bdg(info.badge)}</b><span class="sub">${locked?"🔒 "+t("locked"):esc(c.lastText||"")}</span></div><div class="mt2"><small class="${un?"hl":""}">${S.muted?.[d.id]>Date.now()?ic("bellOff",13)+" ":""}${ts?hm(ts):""}</small>${un?`<i class="ub${nw?" nw":""}">${un}</i>`:tick}</div>`;
 r.onclick=()=>openChat(d.id,info);return r}
async function renderList(el,only){if(!S.loaded){el.innerHTML=skel(6);return}const lk=await Lock.list().catch(()=>[]),frag=document.createDocumentFragment();let n=0;
 if(only){const a=document.createElement("div");a.className="crow gl";a.innerHTML=`<span class="av g" style="width:46px;height:46px">${ic("plus",22)}</span><div class="cm"><b class="nmx">${t("newgroup")}</b></div>`;a.onclick=createGroup;frag.append(a)}
 for(const d of S.docs){const c=d.data();if(only&&!c.isGroup)continue;const info=await chatInfo(d);if(S.filter&&!info.title.toLowerCase().includes(S.filter))continue;frag.append(chatRow(d,info,lk));n++}
 if(!n&&!only)frag.append(emptyEl("chat",S.filter?L("لا توجد نتائج مطابقة","No matching results"):t("empty"),S.filter?"":L("ابحث عن شخص وابدأ محادثة","Search for someone and start chatting"),S.filter?null:[L("محادثة جديدة","New chat"),()=>{$("sbar").hidden=false;$("q").focus()}]));
 if(!n&&only)frag.append(emptyEl("users",L("لا توجد مجموعات بعد","No groups yet"),"",null));
 if(!only&&S.pb.length)frag.append(pbNode());
 el.replaceChildren(frag)}
function pbNode(){const w=document.createElement("div"),f=S.filter,list=S.pb.filter(c=>!f||c.n.toLowerCase().includes(f)||c.p.includes(f));
 w.innerHTML=`<div class="sec">${ic("book",16)} ${t("contacts")} (${list.length})</div>`;
 list.slice(0,S.pbLimit).forEach(c=>{const r=document.createElement("div");r.className="crow gl";r.innerHTML=`${avatar(c.n)}<div class="cm"><b class="nmx">${esc(c.n)}</b><span class="sub">${esc(c.p)}</span></div>${c.uid?`<span class="badge">${t("onapp")}</span>`:""}<button class="ib shr">${ic("share",20)}</button>`;r.querySelector(".shr").onclick=ev=>{ev.stopPropagation();invite(c.n)};r.onclick=()=>c.uid?S.startWith(c.uid,c.n):invite(c.n);w.append(r)});
 if(list.length>S.pbLimit){const m=document.createElement("button");m.className="btn g";m.textContent="＋";m.onclick=()=>{S.pbLimit+=150;paint()};w.append(m)}return w}
function badge(){const n=S.docs.reduce((a,d)=>a+(d.data().unread?.[S.me.uid]||0),0),b=$("nbc");b.hidden=!n;b.textContent=n>99?"99+":n;if(S.lastN!==undefined&&n>S.lastN&&!cur&&document.visibilityState==="visible")sfx("recv");S.lastN=n}
function subscribeChats(u){unsubC&&unsubC();const base=[collection(db,"chats"),where("members","array-contains",u.uid)],ms=d=>d.data().updatedAt?.toMillis?.()||Date.now();
 const on=docs=>{S.docs=docs;S.loaded=true;badge();if(S.tab!=="status")paint();settingsRefresh()},err=e=>toast("⚠ "+(e.code||e.message)+(e.code==="permission-denied"?" — firebase deploy":""));
 const fallback=()=>{unsubC=onSnapshot(query(...base,limit(100)),sn=>on(sn.docs.slice().sort((a,b)=>ms(b)-ms(a))),err)};
 unsubC=onSnapshot(query(...base,orderBy("updatedAt","desc"),limit(50)),sn=>on(sn.docs),e=>{if(e.code==="failed-precondition")fallback();else err(e)})}
/* ---------- البحث ---------- */
$("srch").onclick=()=>{$("sbar").hidden=!$("sbar").hidden;$("srch").classList.toggle("on",!$("sbar").hidden);if(!$("sbar").hidden)$("q").focus();else closeSearch()};$("sx").onclick=closeSearch;
function closeSearch(){$("sbar").hidden=true;$("srch").classList.remove("on");$("q").value="";$("found").innerHTML="";if(S.filter){S.filter="";paint()}}
$("q").oninput=e=>{const v=e.target.value.trim();S.filter=v.toLowerCase();if(S.tab!=="status")paint();clearTimeout(qt);qt=setTimeout(()=>search(v),300)};
async function search(v){const f=$("found");f.innerHTML="";if(v.length<2)return;
 const lo=v.toLowerCase();let dg=canon(v);if(/^1[0125]\d*$/.test(dg)&&dg.length<10)dg="0"+dg;const num=/^[\d\s\-+()]+$/.test(v)&&dg.length>=3,res=new Map();
 if(navigator.onLine){try{const qs=[getDocs(query(collection(db,"users"),where("usernameLower",">=",lo),where("usernameLower","<=",lo+"\uf8ff"),limit(10)))];
  if(num)qs.push(getDocs(query(collection(db,"users"),where("phoneNorm",">=",dg),where("phoneNorm","<=",dg+"\uf8ff"),limit(10))));
  (await Promise.all(qs)).forEach(sn=>sn.forEach(d=>res.set(d.id,d.data())))}catch(e){f.innerHTML='<div class="empty gl">'+esc(e.message)+'</div>';return}}
 else(await Local.contacts()).filter(c=>(c.username||"").toLowerCase().includes(lo)||(num&&(c.phone||"").includes(dg))).forEach(c=>res.set(c.uid,c));
 res.delete(S.me.uid);if(!res.size){f.innerHTML=`<div class="empty gl">${esc(L("لا توجد نتائج","No results"))}</div>`;return}
 res.forEach((u,id)=>{if(u.status&&u.status!=="active")return;Local.putContact({uid:id,username:u.username,phone:u.phone}).catch(()=>{});
  const r=document.createElement("div");r.className="crow gl";r.innerHTML=`${avatar(u.username)}<div class="cm"><b class="nmx">${esc(u.username)}${bdg(u.badge)}</b><span class="sub">${esc(u.phone||"")}</span></div>${ic("chat",20)}`;
  r.onclick=()=>{closeSearch();S.startWith(id,u.username)};f.append(r)})}
/* ---------- صفحة المحادثة ---------- */
const row=(id,m,cid)=>({id,cid,sender:m.from,sname:m.fname||"",text:m.text||"",status:m.status,ts:m.createdAt?.toMillis?.()||Date.now(),reply:m.replyTo||"",edited:+!!m.edited,deleted:+!!m.deleted,hidden:+(m.deletedFor||[]).includes(S.me.uid),audio:m.audio||"",dur:m.dur||0,react:JSON.stringify(m.reactions||{}),fwd:+!!m.fwd,star:0});
async function openChat(cid,info){try{if(!await Lock.unlock(cid))return;closeSearch();
 if(info.other&&!info.u)info.u=await getUser(info.other);
 cur={cid,...info,exists:false,q:"",reply:null,pinned:null,sel:new Set(),rows:[],first:true,loaded:false,seen:null,rx:{},replyUid:null};
 $("cname").textContent=(info.group?"👥 ":"")+info.title;$("cav").innerHTML=info.group?`<span class="av g" style="width:40px;height:40px">${ic("users",20)}</span>`:avatar(info.title,40);$("cstat").textContent="";
 $("chat").classList.add("on");history.pushState({},"");
 $("tx").value="";setReply(null);$("pin").hidden=true;$("csb").hidden=true;$("selbar").hidden=true;$("ms").innerHTML=skel(5,"msg");$("ms").style.background=await chatBg(cid);
 unsubM&&unsubM();unsubT&&unsubT();unsubU&&unsubU();const cr=doc(db,"chats",cid);
 unsubT=onSnapshot(cr,s=>{if(!cur||cur.cid!==cid)return;cur.exists=s.exists();const c=s.data()||{};if(c.members)cur.members=c.members;cur.pinned=c.pinned||null;
  $("pin").hidden=!cur.pinned;if(cur.pinned)$("pin").textContent="📌 "+cur.pinned.text;
  const tv=Object.entries(c.typing||{}).filter(([k])=>k!==S.me.uid).map(([,v])=>v).sort().pop()||0;
  if(cur.tv===undefined)cur.tv=tv;else if(tv&&tv!==cur.tv){cur.tv=tv;cur.typingUntil=Date.now()+4500;setTimeout(stat,4600)}stat();
  if(s.exists()&&(c.unread?.[S.me.uid]||0)>0)updateDoc(cr,{["unread."+S.me.uid]:0}).catch(()=>{})},()=>{});
 if(!info.group)unsubU=onSnapshot(doc(db,"users",info.other),s=>{if(cur&&s.exists()){cur.u=s.data();stat()}},()=>{});
 unsubM=onSnapshot(query(collection(cr,"messages"),orderBy("createdAt","desc"),limit(100)),async sn=>{
  for(const d of sn.docs){const m=d.data();await Local.save(row(d.id,m,cid)).catch(()=>{});
   if(m.from!==S.me.uid&&m.status!=="read"&&!d.metadata.hasPendingWrites&&document.visibilityState==="visible")updateDoc(d.ref,{status:"read"}).catch(()=>{})}
  if(cur&&cur.cid===cid)cur.loaded=true;render()},e=>toast("تعذر تحميل الرسائل: "+(e.code||e.message)));
 render()}catch(e){toast("تعذر فتح المحادثة: "+(e.message||e))}}
function leaveChat(){stopAudio();unsubM&&unsubM();unsubT&&unsubT();unsubU&&unsubU();vr&&vr.cancel();endRec();cur=null;$("chat").classList.remove("on")}
function stat(){if(!cur)return;const u=cur.u||{};if(Date.now()<(cur.typingUntil||0)){$("cstat").innerHTML='<span class="dots"><i></i><i></i><i></i></span> '+esc(t("typing"));return}$("cstat").textContent=cur.group?(cur.members?.length||0)+" "+t("members"):u.hideSeen?"":u.online?t("online"):u.lastSeen?.toMillis?t("lastseen")+" "+hm(u.lastSeen.toMillis()):""}
async function render(){if(!cur)return;const cid=cur.cid,all=await Local.list(cid,300).catch(()=>[]);if(!cur||cur.cid!==cid)return;
 const q=(cur.q||"").toLowerCase(),rows=all.filter(r=>!r.hidden&&(!q||(r.text||"").toLowerCase().includes(q)));cur.rows=rows;if(!rows.length&&!cur.loaded){$("ms").innerHTML=skel(5,"msg");return}
 if(!rows.length&&cur.loaded&&!q){$("ms").replaceChildren(emptyEl("chat",L("ابدأ المحادثة","Start the conversation"),L("أرسل أول رسالة الآن","Send the first message"),null));return}
 const fresh=cur.seen?new Set(rows.filter(r=>!cur.seen.has(r.id)).map(r=>r.id)):null,box=document.createDocumentFragment();let last="";
 rows.forEach(r=>{const day=dayLabel(r.ts);if(day!==last){last=day;const d=document.createElement("div");d.className="day";d.textContent=day;box.append(d)}
  const mine=r.sender===S.me.uid,w=document.createElement("div"),e=document.createElement("div");w.className="mr"+(mine?" me":"")+(cur.sel.has(r.id)?" sel":"");e.className="m";w.dataset.id=r.id;if(fresh&&fresh.has(r.id)){w.classList.add("new");if(!mine)w.classList.add("in")}
  let rc={};try{rc=JSON.parse(r.react||"{}")}catch(x){}const rs=Object.values(rc),rxc=cur.rx[r.id]!==undefined&&cur.rx[r.id]!==r.react;cur.rx[r.id]=r.react;
  const tk=mine?(r.status==="read"?'<span class="tk rd">✓✓</span>':r.status==="delivered"?'<span class="tk">✓✓</span>':'<span class="tk">✓</span>'):"";
  e.innerHTML=`${cur.group&&!mine?`<b class="sn" style="color:${colorOf(r.sname)}">${esc(r.sname)}</b>`:""}${r.fwd?`<span class="fw">↪ ${t("fwd")}</span>`:""}${r.reply?`<div class="rp">${esc(r.reply)}</div>`:""}<div class="bd">${r.deleted?`<i>🚫 ${esc(L("تم حذف الرسالة","Message deleted"))}</i>`:r.audio?"🎤 "+(+r.dur||0)+" "+L("ث","s"):esc(r.text)}</div>${rs.length?`<span class="rx${rxc?" rxb":""}">${[...new Set(rs)].join("")}${rs.length>1?" "+rs.length:""}</span>`:""}<div class="mt">${r.star?"⭐":""}${r.edited?`<span>${t("edited")}</span>`:""}<span>${hm(r.ts)}</span>${tk}</div>`;
  if(r.audio&&!r.deleted&&r.audio.startsWith("data:audio/")){e.querySelector(".bd").replaceWith(voicePlayer(r.audio,r.dur,r.id))}
  e.onclick=ev=>{if(ev.target.closest("audio,button"))return;if(cur.sel.size){cur.sel.has(r.id)?cur.sel.delete(r.id):cur.sel.add(r.id);selUI();render()}else msgMenu(r,mine)};
  if(!mine&&cur.group){const av=document.createElement("span");av.innerHTML=avatar(r.sname,26);w.append(av.firstChild)}
  w.append(e);box.append(w)});
 if(fresh&&rows.some(r=>fresh.has(r.id)&&r.sender!==S.me.uid))sfx("recv");
 const ms=$("ms"),bottom=ms.scrollHeight-ms.scrollTop-ms.clientHeight<140;ms.replaceChildren(box);if(cur.first||bottom){ms.scrollTop=1e9;if(rows.length)cur.first=false}cur.seen=new Set(rows.map(r=>r.id))}
const fadeOut=id=>new Promise(res=>{const el=document.querySelector(`.mr[data-id="${id}"]`);if(!el||FX.motion==="off")return res();el.classList.add("fade");setTimeout(res,220)});
function selUI(){const n=cur.sel.size;$("selbar").hidden=!n;$("selc").textContent=n}
const selRows=()=>cur.rows.filter(r=>cur.sel.has(r.id)),mref=id=>doc(db,"chats",cur.cid,"messages",id);
$("selx").onclick=()=>{cur.sel.clear();selUI();render()};
$("selcp").onclick=()=>{navigator.clipboard?.writeText(selRows().map(r=>r.text).join("\n"));toast("✔")};
$("selfw").onclick=()=>pickTarget(tg=>{fwdMsgs(selRows(),tg);$("selx").onclick()});
$("seldl").onclick=async()=>{await Promise.all(selRows().map(r=>{updateDoc(mref(r.id),{deletedFor:arrayUnion(S.me.uid)}).catch(()=>{});return Local.hide(r.id)}));$("selx").onclick()};
function fwdMsgs(rows,tg){rows.filter(r=>!r.deleted).forEach(r=>{const x={text:r.text,fwd:true};if(r.audio){x.type="voice";x.audio=r.audio;x.dur=r.dur}sendMsg(x,r.audio?"🎤":r.text.slice(0,40),tg)});toast("✔")}
async function pickTarget(cb){sheet(`<h3>↪ ${t("forward")}</h3><div id="pk"></div>`);if(!S.docs.length)$("pk").textContent=t("empty");
 for(const d of S.docs){const info=await chatInfo(d),r=document.createElement("div");r.className="crow";r.innerHTML=`${info.group?`<span class="av g" style="width:40px;height:40px">${ic("users",20)}</span>`:avatar(info.title,40)}<div class="cm"><b class="nmx">${esc(info.title)}</b></div>`;r.onclick=()=>{closeSheet();cb({cid:d.id,...info})};$("pk").append(r)}}
function msgMenu(r,mine){const em=["👍","❤️","😂","😮","😢","🙏"],pinned=cur.pinned?.id===r.id;
 const A=[["reply","reply",t("reply")],["copy","copy",t("copy")],["fwd","fwd",t("forward")],["pin","pin",pinned?t("unpin"):t("pin")],["star","star",r.star?t("unstar"):t("star")],["sel","select",L("تحديد عدة رسائل","Select messages")]];
 if(mine&&!r.audio&&!r.deleted)A.push(["edit","edit",t("edit")]);A.push(["dm","trash",t("delme")]);if(mine&&!r.deleted)A.push(["da","trash",t("delall")]);
 const s=sheet(`<div class="rxr">${em.map(e=>`<button data-e="${e}">${e}</button>`).join("")}</div>`+A.map(a=>`<button class="shb" data-a="${a[0]}">${ic(a[1],20)} ${a[2]}</button>`).join(""));
 s.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{closeSheet();let m={};try{m=JSON.parse(r.react||"{}")}catch(x){}updateDoc(mref(r.id),{["reactions."+S.me.uid]:m[S.me.uid]===b.dataset.e?deleteField():b.dataset.e}).catch(e=>toast(e.code||"⚠"))});
 s.querySelectorAll("[data-a]").forEach(b=>b.onclick=async()=>{closeSheet();const a=b.dataset.a,cr=doc(db,"chats",cur.cid);
  if(a==="reply"){setReply((r.audio?"🎤 ":"")+r.text.slice(0,60));cur.replyUid=r.sender;$("tx").focus()}
  else if(a==="copy"){navigator.clipboard?.writeText(r.text);toast("✔")}
  else if(a==="fwd")pickTarget(tg=>fwdMsgs([r],tg));
  else if(a==="pin")updateDoc(cr,{pinned:pinned?deleteField():{id:r.id,text:(r.audio?"🎤":r.text).slice(0,60)}}).catch(()=>toast("⚠"));
  else if(a==="star"){await Local.setStar(r.id,!r.star);render()}
  else if(a==="sel"){cur.sel=new Set([r.id]);selUI();render()}
  else if(a==="edit"){const n=prompt(t("edit"),r.text);if(n&&n!==r.text)updateDoc(mref(r.id),{text:n,edited:true}).catch(()=>toast("⚠"))}
  else if(a==="dm"){await fadeOut(r.id);await Local.hide(r.id);render();updateDoc(mref(r.id),{deletedFor:arrayUnion(S.me.uid)}).catch(()=>{})}
  else if(a==="da"){if(Date.now()-r.ts>36e5)return toast(t("toolate"));await fadeOut(r.id);updateDoc(mref(r.id),{deleted:true,text:"",audio:""}).catch(()=>toast("⚠"))}})}
function setReply(x){if(cur){cur.reply=x;if(!x)cur.replyUid=null}$("rbar").hidden=!x;$("rtx").textContent=x||""}
$("rx").onclick=()=>setReply(null);
function sendMsg(x,last,tg=cur){if(!tg)return;sfx("send");haptic(10);const me=S.me.uid,cr=doc(db,"chats",tg.cid),mr=doc(collection(cr,"messages")),meta={updatedAt:serverTimestamp(),lastText:last,lastFrom:me};
 if(tg.group){const d={...meta};(tg.members||[]).filter(u=>u!==me).forEach(u=>d["unread."+u]=increment(1));updateDoc(cr,d).catch(()=>{})}
 else setDoc(cr,{members:[me,tg.other],isGroup:false,...meta,unread:{[tg.other]:increment(1)}},{merge:true}).catch(()=>{});
 setDoc(mr,{text:"",replyTo:null,type:"text",...x,from:me,fname:S.name,status:"sent",createdAt:serverTimestamp(),expireAt:Timestamp.fromMillis(Date.now()+864e5),deletedFor:[]}).catch(()=>toast("⚠ "+L("فشل الإرسال، أعد المحاولة","Send failed, retry")))}
function send(){const v=$("tx").value.trim();if(!v||!cur)return;$("tx").value="";const rp=cur.reply,ru=cur.replyUid||null;setReply(null);$("emo").hidden=true;$("sd").classList.remove("fly");void $("sd").offsetWidth;$("sd").classList.add("fly");sendMsg({text:v,replyTo:rp,replyUid:ru},v.slice(0,40))}
$("sd").onclick=send;$("tx").onkeydown=e=>e.key==="Enter"&&send();
$("tx").oninput=()=>{if(cur&&cur.exists&&Date.now()-lastTy>2500){lastTy=Date.now();updateDoc(doc(db,"chats",cur.cid),{["typing."+S.me.uid]:Date.now()}).catch(()=>{})}};
$("emo").innerHTML=EM.map(e=>`<button>${e}</button>`).join("");$("emo").querySelectorAll("button").forEach(b=>b.onclick=()=>{$("tx").value+=b.textContent;$("tx").focus()});
$("emb").onclick=()=>{$("emo").hidden=!$("emo").hidden};
const endRec=()=>{vr=null;$("rec").hidden=true;$("tx").hidden=$("mic").hidden=$("sd").hidden=$("emb").hidden=false};
$("mic").onclick=async()=>{if(!cur||vr)return;try{vr=await startRecording(s=>$("rt").textContent="⏺ "+Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0"));$("rec").hidden=false;$("tx").hidden=$("mic").hidden=$("sd").hidden=$("emb").hidden=true}catch(e){vr=null;toast("لا يمكن تشغيل الميكروفون: "+e.message)}};
$("rc").onclick=()=>{vr&&vr.cancel();endRec()};
$("rs").onclick=async()=>{const v=vr;endRec();if(!v)return;try{const r=await v.stop();if(r)sendMsg({type:"voice",audio:r.data,dur:r.dur},"🎤 "+L("رسالة صوتية","Voice message"))}catch(e){toast(e.message)}};
$("csr").onclick=()=>{$("csb").hidden=!$("csb").hidden;if($("csb").hidden){cur.q="";render()}else $("cq").focus()};$("cq").oninput=e=>{cur.q=e.target.value.trim();render()};
$("bk").onclick=()=>history.back();$("ibk").onclick=()=>history.back();$("setbk").onclick=()=>history.back();
$("cmn").onclick=()=>{if(!cur)return;const s=sheet(`<button class="shb" data-x="i">${ic("user",20)} ${t("info")}</button><button class="shb" data-x="l">${ic("lock",20)} ${L("قفل / فتح المحادثة","Lock / unlock chat")}</button><button class="shb" data-x="b">${ic("palette",20)} ${L("خلفية هذه المحادثة","Chat wallpaper")}</button><button class="shb" data-x="m">${ic("bellOff",20)} ${L("كتم الإشعارات","Mute notifications")}</button>`);
 s.querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{closeSheet();const x=b.dataset.x;if(x==="i")openInfo();else if(x==="l")lockToggle();else if(x==="m")muteSheet();else chatBgPick()})};
function muteSheet(){if(!cur)return;const cid=cur.cid,cu=S.muted?.[cid]>Date.now(),o=[[8,L("8 ساعات","8 hours")],[168,L("أسبوع","1 week")],[0,L("دائمًا","Always")]];
 sheet(`<h3>${ic("bellOff",20)} ${L("كتم الإشعارات","Mute notifications")}</h3>${o.map(x=>`<button class="shb" data-h="${x[0]}">${x[1]}</button>`).join("")}${cu?`<button class="shb" data-h="-1">${L("إلغاء الكتم","Unmute")}</button>`:""}`);
 $("sheet").querySelectorAll("[data-h]").forEach(b=>b.onclick=async()=>{closeSheet();const h=+b.dataset.h;try{await updateDoc(doc(db,"users",S.me.uid),{["muted."+cid]:h<0?deleteField():h===0?9e15:Date.now()+h*36e5});toast("✔ "+(h<0?L("تم إلغاء الكتم","Unmuted"):L("تم الكتم","Muted")))}catch(e){toast("⚠ "+(e.code||e.message))}})}
async function lockToggle(){const on=await Lock.toggle(cur.cid);if(on!==null){toast(on?"🔒":"🔓");paint()}}
const chatBgPick=()=>bgPicker({title:L("خلفية هذه المحادثة","Chat wallpaper"),key:"bgChat:"+cur.cid,allKey:"bgChat",after:async()=>{if(cur)$("ms").style.background=await chatBg(cur.cid)}});
/* ---------- صفحة المعلومات ---------- */
$("chead").onclick=()=>openInfo();
function openInfo(){if(!cur)return;$("info").classList.add("on");history.pushState({},"");renderInfo()}
async function renderInfo(){if(!cur)return;const el=$("ib"),cid=cur.cid;
 const tail=`<button class="btn g" id="ilk">${ic("lock",18)} ${L("قفل / فتح المحادثة","Lock / unlock chat")}</button><button class="btn g" id="ibg">${ic("palette",18)} ${L("خلفية هذه المحادثة","Chat wallpaper")}</button><button class="btn g" id="imu">${ic("bellOff",18)} ${L("كتم الإشعارات","Mute notifications")}</button>`;
 if(cur.group){const d=await getDoc(doc(db,"chats",cid)).catch(()=>null),c=d?.data()||{members:cur.members||[],admins:[],name:cur.title},adm=(c.admins||[]).includes(S.me.uid);
  el.innerHTML=`<div class="ibig"><span class="av g" style="width:96px;height:96px">${ic("users",48)}</span><h2>${esc(c.name)}</h2><small>${c.members.length} ${t("members")}</small></div><div class="sec">${t("members")}</div><div id="gm"></div><div style="display:grid;gap:10px;margin-top:12px">${adm?`<button class="btn" id="gadd">${L("إضافة عضو","Add member")}</button><button class="btn g" id="gren">${L("تغيير اسم المجموعة","Rename group")}</button>`:""}${tail}<button class="btn r" id="glv">${L("مغادرة المجموعة","Leave group")}</button></div>`;
  for(const u of c.members){const x=await getUser(u),r=document.createElement("div");r.className="crow gl";r.innerHTML=`${avatar(x.username,40)}<div class="cm"><b class="nmx">${esc(pbName(x)||x.username)}${u===S.me.uid?" ("+L("أنت","you")+")":""}</b><span class="sub">${esc(x.phone||"")}</span></div>${(c.admins||[]).includes(u)?`<span class="badge">${L("مشرف","Admin")}</span>`:""}`;
   if(adm&&u!==S.me.uid){const b=document.createElement("button");b.className="ib";b.innerHTML=ic("dots");b.onclick=()=>{sheet(`<button class="shb" data-x="a">${L("تعيين مشرف","Make admin")}</button><button class="shb" data-x="r">${L("إزالة من المجموعة","Remove")}</button>`);$("sheet").querySelectorAll("[data-x]").forEach(z=>z.onclick=()=>{closeSheet();(z.dataset.x==="a"?makeAdmin:removeMember)(cid,u,renderInfo)})};r.append(b)}
   $("gm").append(r)}
  if($("gadd"))$("gadd").onclick=()=>addMember(cid,renderInfo);if($("gren"))$("gren").onclick=()=>renameGroup(cid,n=>{if(cur){cur.title=n;$("cname").textContent="👥 "+n}renderInfo()});
  $("glv").onclick=()=>leaveGroup(cid,()=>{$("info").classList.remove("on");leaveChat()})}
 else{const u=cur.u||await getUser(cur.other),shared=S.docs.filter(d=>d.data().isGroup&&d.data().members.includes(cur.other));
  el.innerHTML=`<div class="cover"></div><div class="ibig pf ${u.online&&!u.hideSeen?"on":""}">${avatar(cur.title,96)}<h2>${esc(cur.title)}</h2><small dir="ltr">${esc(u.phone||"")}</small></div><div class="ibox gl"><div><small>${t("username")}</small><b>@${esc(u.username)}</b></div><div><small>${t("phone")}</small><b dir="ltr">${esc(u.phone||"")}</b></div><div><small>${L("الحالة","Status")}</small><b>${u.hideSeen?"—":u.online?t("online"):u.lastSeen?.toMillis?t("lastseen")+" "+hm(u.lastSeen.toMillis()):"—"}</b></div></div><div class="sec">${t("shared")} (${shared.length})</div><div id="shg"></div><div style="display:grid;gap:10px;margin-top:12px"><button class="btn" id="imsg">${t("msg")}</button>${tail}</div>`;
  shared.forEach(d=>{const c=d.data(),r=document.createElement("div");r.className="crow gl";r.innerHTML=`<span class="av g" style="width:40px;height:40px">${ic("users",20)}</span><div class="cm"><b class="nmx">${esc(c.name)}</b><span class="sub">${c.members.length} ${t("members")}</span></div>`;r.onclick=()=>{$("info").classList.remove("on");openChat(d.id,{title:c.name,group:true,members:c.members})};$("shg").append(r)});
  $("imsg").onclick=()=>history.back()}
 $("ilk").onclick=lockToggle;$("ibg").onclick=chatBgPick;$("imu").onclick=muteSheet}
/* ---------- زر الرجوع ---------- */
addEventListener("popstate",()=>{
 if(!$("sv").hidden||!$("sheet").hidden){$("sv").hidden=true;closeSheet();history.pushState({},"");return}
 if($("info").classList.contains("on")){$("info").classList.remove("on");return}
 if(cur){leaveChat();return}
 if($("set").classList.contains("on")){if(!settingsBack())$("set").classList.remove("on")}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&cur)Lock.list().then(l=>{if(l.includes(cur?.cid)){$("info").classList.remove("on");leaveChat()}})});
addEventListener("beforeunload",()=>S.me&&updateDoc(doc(db,"users",S.me.uid),{online:false,lastSeen:serverTimestamp()}).catch(()=>{}));
