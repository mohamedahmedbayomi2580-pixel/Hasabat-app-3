import {db} from "./firebase-config.js";
import {collection,doc,query,where,onSnapshot,updateDoc,deleteDoc,addDoc,serverTimestamp,Timestamp,arrayUnion} from "firebase/firestore";
import {S,$,esc,toast,sheet,closeSheet,avatar,compress,ic,findByPhones,getUser} from "./ui.js";
import {canon} from "./phone.js";
import {Local} from "./local-db.js";
import {L} from "./i18n.js";
import {skel} from "./fx.js";
let mine=[],others=[],muted=[],timer=null,openU=true,loaded=false,prevN=0;
const COLORS=["#004F52","#006B70","#FF7900","#1b2a49","#7a2d5a","#2f6f3e"];
const live=a=>a.filter(x=>x.expireAt&&x.expireAt.toMillis()>Date.now()).sort((a,b)=>a.expireAt.toMillis()-b.expireAt.toMillis());
const map=s=>s.docs.map(d=>({id:d.id,...d.data()}));
const t0=x=>x.createdAt?.toMillis?.()||x.expireAt.toMillis()-864e5;
const ago=ms=>{const m=Math.max(1,Math.round((Date.now()-ms)/6e4));return m<60?L(`منذ ${m} دقيقة`,`${m} min ago`):L(`منذ ${Math.round(m/60)} ساعة`,`${Math.round(m/60)} h ago`)};
export const getMine=()=>live(mine);
export async function initStatus(){try{muted=JSON.parse(await Local.kvGet("muted")||"[]")}catch(e){}
 onSnapshot(query(collection(db,"statuses"),where("uid","==",S.me.uid)),s=>{mine=map(s);S.tab==="status"&&renderStatus()},()=>{});
 onSnapshot(query(collection(db,"statuses"),where("audience","array-contains",S.me.uid)),s=>{others=map(s);loaded=true;markNew();S.tab==="status"&&renderStatus()},()=>{})}
function markNew(){const nb=document.querySelector(".bnav [data-t=status]");if(!nb)return;const n=live(others).filter(x=>!muted.includes(x.uid)&&!(x.viewers||[]).includes(S.me.uid)).length;nb.classList.toggle("has-new",n>0);if(n>prevN){nb.classList.remove("anim");void nb.offsetWidth;nb.classList.add("anim")}prevN=n}
export function renderStatus(){if(!loaded){$("t-status").innerHTML=skel(4);return}const el=$("t-status"),m=live(mine),by={};live(others).filter(x=>!muted.includes(x.uid)).forEach(x=>(by[x.uid]??=[]).push(x));
 const g=Object.values(by),seen=a=>a.every(x=>(x.viewers||[]).includes(S.me.uid)),fresh=g.filter(a=>!seen(a)),old=g.filter(seen);
 const tile=a=>`<div class="tile gl" data-g="${g.indexOf(a)}"><span class="ring seen">${avatar(a[0].name,50)}</span><div><b>${esc(a[0].name)}</b><small>${ago(t0(a[a.length-1]))}</small></div><button class="ib" data-m="${a[0].uid}">${ic("dots",20)}</button></div>`;
 el.innerHTML=`<div class="mystat gl" id="myst"><div class="camc">${ic("camera",28)}<b class="plus orb" id="addst">+</b></div><div><b>${L("حالتي","My status")}</b><small>${m.length?L(m.length+" حالة — اضغط للعرض","View my statuses"):L("انقر لإضافة حالة جديدة","Tap to add a new status")}</small></div><span class="chev flip">${ic("chev")}</span></div>
 <div class="sect gl"><div class="shd" id="shU">${ic("refresh",20)} ${L("المستجدات","Recent updates")} <span class="chev">${ic("chevU",20)}</span></div>${openU?`<div class="strow">${fresh.length?fresh.map(a=>`<div class="story" data-g="${g.indexOf(a)}"><span class="ring">${avatar(a[0].name,58)}</span><small>${esc(a[0].name)}</small></div>`).join(""):`<div class="empty" style="width:100%">${L("لا توجد مستجدات","No new updates")}</div>`}</div>`:""}</div>
 <div class="sect gl"><div class="shd">${ic("clock",20)} ${L("الحالات الأخيرة","Viewed updates")}</div>${old.length?old.map(tile).join(""):`<div class="empty">${L("لا توجد حالات","Nothing here")}</div>`}</div>
 ${muted.length?`<button class="btn g" id="unm">${L("الحالات المكتومة","Muted")} (${muted.length})</button>`:""}`;
 $("myst").onclick=e=>{if(e.target.closest("#addst")||!m.length)compose();else show(m,0)};
 $("shU").onclick=()=>{openU=!openU;renderStatus()};
 el.querySelectorAll("[data-g]").forEach(e=>e.onclick=ev=>{if(ev.target.closest("[data-m]"))return;show(g[e.dataset.g],0)});
 el.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>muteSheet(b.dataset.m));
 if($("unm"))$("unm").onclick=async()=>{const s=sheet(`<h3>${L("الحالات المكتومة","Muted")}</h3><div id="mls"></div>`);for(const u of muted){const x=await getUser(u),b=document.createElement("button");b.className="shb";b.innerHTML=`${avatar(x.username,34)} ${esc(x.username)} <span style="margin-inline-start:auto">${L("إلغاء الكتم","Unmute")}</span>`;b.onclick=()=>setMute(u,false);$("mls").append(b)}}}
async function setMute(u,on){muted=on?[...new Set([...muted,u])]:muted.filter(x=>x!==u);await Local.kvSet("muted",JSON.stringify(muted));closeSheet();renderStatus();toast("✔")}
function muteSheet(u){const s=sheet(`<button class="shb" id="mu1">${ic("bell")} ${L("كتم حالات هذا الشخص","Mute this person's status")}</button>`);$("mu1").onclick=()=>setMute(u,true)}
export function compose(){let bg=COLORS[0],img=null;
 sheet(`<h3>${L("حالة جديدة","New status")}</h3><textarea class="in" id="stx" rows="3" placeholder="${L("اكتب حالتك...","Write your status...")}"></textarea><div class="sw" id="ssw">${COLORS.map((c,i)=>`<i data-c="${c}" class="${i?"":"on"}" style="background:${c}"></i>`).join("")}</div>
 <div class="brow" style="margin:0 0 10px"><button class="btn s g" id="spic">${ic("camera",20)} ${L("صورة","Photo")}</button><button class="btn s g" id="semo">${ic("emoji",20)}</button></div><input type="file" id="sfile2" accept="image/*" hidden>
 <input class="in" id="smn" placeholder="@ ${L("اذكر أرقامًا (اختياري، بفاصلة)","Mention numbers (optional)")}"><input class="in" id="shd" placeholder="${L("إخفاء عن أرقام (اختياري)","Hide from numbers (optional)")}"><input class="in" id="sol" placeholder="${L("مشاركة مع أرقام محددة فقط (اختياري)","Share only with numbers (optional)")}">
 <button class="btn" id="spost">${L("نشر","Post")}</button>`);
 $("ssw").querySelectorAll("i").forEach(i=>i.onclick=()=>{bg=i.dataset.c;$("ssw").querySelectorAll("i").forEach(x=>x.classList.remove("on"));i.classList.add("on")});
 $("spic").onclick=()=>$("sfile2").click();$("sfile2").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{img=await compress(f);toast("✔ "+L("تم اختيار الصورة","Photo selected"))}catch(x){toast(L("تعذر قراءة الصورة","Cannot read image"))}};
 $("semo").onclick=()=>{$("stx").value+=["😀","😍","😂","🔥","👏","🎉"][Math.floor(Math.random()*6)]};
 const ph=v=>(v||"").split(/[,،;\n]+/).map(canon).filter(Boolean);
 $("spost").onclick=async()=>{const text=$("stx").value.trim();if(!text&&!img)return toast(L("اكتب شيئًا أو اختر صورة","Write something or pick a photo"));$("spost").disabled=true;
  try{const set=new Set(),mn=ph($("smn").value),hd=ph($("shd").value),ol=ph($("sol").value);
   const mu=mn.length?(await findByPhones(mn)).users:[];
   if(ol.length)(await findByPhones(ol)).uids.forEach(u=>set.add(u));else{S.docs.forEach(d=>{const c=d.data();if(!c.isGroup)c.members.forEach(u=>set.add(u))});S.pb.forEach(c=>c.uid&&set.add(c.uid))}
   mu.forEach(u=>set.add(u.id));if(hd.length)(await findByPhones(hd)).uids.forEach(u=>{if(!mu.some(m=>m.id===u))set.delete(u)});set.delete(S.me.uid);
   await addDoc(collection(db,"statuses"),{uid:S.me.uid,name:S.name,type:img?"image":"text",text,bg,img:img||"",mentions:mu.map(u=>({u:u.id,n:u.name})),audience:[...set],viewers:[],createdAt:serverTimestamp(),expireAt:Timestamp.fromMillis(Date.now()+864e5)});
   closeSheet();toast("✔ "+L("تم نشر الحالة","Status posted"))}catch(e){toast((e.code||e.message));$("spost").disabled=false}}}
function show(list,i){clearTimeout(timer);const x=list[i],v=$("sv");if(!x){v.hidden=true;renderStatus();return}const own=x.uid===S.me.uid;v.hidden=false;
 if(!own&&!(x.viewers||[]).includes(S.me.uid))updateDoc(doc(db,"statuses",x.id),{viewers:arrayUnion(S.me.uid)}).catch(()=>{});
 const bg=x.type==="text"?(/^#[0-9a-f]{6}$/i.test(x.bg)?x.bg:"#004F52"):"#000",mn=(x.mentions||[]).length?`<small>${x.mentions.map(m=>"@"+esc(m.n)).join(" ")}</small>`:"";
 v.innerHTML=`<div class="svb" style="background:${bg}">${x.type==="image"?`<img class="svimg" src="${esc(x.img)}">`:""}<div class="svtxt">${esc(x.text)}${mn}</div>
 <div class="bars">${list.map((_,k)=>`<i class="${k<i?"d":k===i?"a":""}"></i>`).join("")}</div>
 <div class="svh gl">${avatar(x.name,38)}<div class="svn"><b>${esc(x.name)}</b><small>${ago(t0(x))}</small></div><button class="ib" id="vM">${ic("dots")}</button><button class="ib" id="vX">${ic("x")}</button></div>
 <div class="tapa" id="tA"></div><div class="tapb" id="tB"></div>
 <div class="svf gl">${own?`<button class="btn s g" id="vV">${ic("eye",20)} ${(x.viewers||[]).length}</button>`:`<div class="rrow"><button class="ib emob" id="vE">${ic("emoji")}</button><input class="in" id="vRI" placeholder="${L("رد على الحالة...","Reply to status...")}"><button class="ib orb snd" id="vRS" style="width:46px;height:46px;flex:none">${ic("send")}</button></div><div class="swhint" id="vH">${ic("chevU",18)}<small>${L("اسحب للأعلى للتفاعل السريع","Swipe up for quick reactions")}</small></div><div class="qr" id="vQ" hidden>${["❤️","😂","😮","😢","👏","🔥"].map(e=>`<button data-e="${e}">${e}</button>`).join("")}</div>`}</div></div>`;
 const next=()=>{if(v.hidden)return;show(list,i+1)},prev=()=>show(list,Math.max(0,i-1));timer=setTimeout(next,5000);
 const rtl=document.documentElement.dir==="rtl";$(rtl?"tA":"tB").onclick=next;$(rtl?"tB":"tA").onclick=prev;
 $("vX").onclick=()=>{clearTimeout(timer);v.hidden=true;renderStatus()};
 $("vM").onclick=()=>{clearTimeout(timer);own?(confirm(L("حذف الحالة؟","Delete status?"))&&deleteDoc(doc(db,"statuses",x.id)).then(()=>{v.hidden=true})):muteSheet(x.uid)};
 if(own){$("vV").onclick=async()=>{clearTimeout(timer);const s=sheet(`<h3>${L("المشاهدون","Viewers")} (${(x.viewers||[]).length})</h3><div id="vl"></div>`);for(const u of x.viewers||[]){const y=await getUser(u),d=document.createElement("div");d.className="shb";d.innerHTML=`${avatar(y.username,34)} ${esc(y.username)}`;$("vl").append(d)}if(!(x.viewers||[]).length)$("vl").textContent=L("لا مشاهدات بعد","No views yet")}}
 else{const rr=$("vRI");rr.onfocus=()=>clearTimeout(timer);
  $("vE").onclick=()=>{rr.value+="😊";rr.focus()};
  $("vRS").onclick=()=>{const tx=rr.value.trim();if(!tx)return;S.sendDirect(x.uid,{text:tx,replyTo:L("حالة: ","Status: ")+(x.text||"📷")},tx.slice(0,40));rr.value="";toast("✔");timer=setTimeout(next,5000)};
  const q=$("vQ"),tog=()=>{q.hidden=!q.hidden;clearTimeout(timer)};$("vH").onclick=tog;let y0=0;const f=v.querySelector(".svf");f.ontouchstart=e=>{y0=e.touches[0].clientY};f.ontouchend=e=>{if(y0-e.changedTouches[0].clientY>40)tog()};
  q.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{S.sendDirect(x.uid,{text:b.dataset.e+" "+L("تفاعل مع حالتك","reacted to your status"),replyTo:L("حالة: ","Status: ")+(x.text||"📷")},b.dataset.e);q.hidden=true;toast(b.dataset.e);timer=setTimeout(next,5000)})}}
