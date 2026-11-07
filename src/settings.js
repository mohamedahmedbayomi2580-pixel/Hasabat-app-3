// مركز الإعدادات: المظهر واللغة والخلفيات + الحساب + النسخ الاحتياطي + سحب جهات الاتصال + الإشعارات والخصوصية + المطور
// كل الخلفيات والتفضيلات تُحفظ في SQLite المحلي (جدول kv)
import {S,$,esc,toast,sheet,closeSheet,avatar,compress,ic} from "./ui.js";
import {Local} from "./local-db.js";
import {db} from "./firebase-config.js";
import {doc,getDoc,updateDoc} from "firebase/firestore";
import * as Lock from "./lock.js";
import {setLang,lang,L,apply} from "./i18n.js";
import {importContacts,syncUp,savedContacts,invite,getInviteLink,setInviteLink} from "./contacts.js";
import {getMine} from "./status.js";
import {FX,setFx,resetFx,sfx,haptic} from "./fx.js";
import {pushState,requestPush} from "./notifications.js";
import {Capacitor} from "@capacitor/core";
import {Filesystem,Directory,Encoding} from "@capacitor/filesystem";
import {Share} from "@capacitor/share";
const VER="1.0.0",DEV={name:"محمد أحمد",phone:"01020939471",wa:"201020939471"};
let sub="main";
const J=async(k,d=null)=>{try{const v=await Local.kvGet(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const cssOf=(v,fixed)=>!v?"":v.t==="img"?`url(${v.v}) center/cover${fixed?" fixed":""}`:v.v;
const kb=n=>n>1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";
const fdate=ms=>new Date(ms).toLocaleString(lang==="ar"?"ar-EG":"en-GB");
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");
export async function applyPrefs(){const th=(await Local.kvGet("theme").catch(()=>null))||"light";document.documentElement.dataset.t=th;
 const a=await J("bgApp"),b=await Local.kvGet("bubble").catch(()=>null),r=document.documentElement.style;
 a?r.setProperty("--appbg",cssOf(a,true)):r.removeProperty("--appbg");b?r.setProperty("--mine",b):r.removeProperty("--mine")}
export async function chatBg(cid){return cssOf((await J("bgChat:"+cid))||(await J("bgChat")))}
export async function toggleTheme(){await Local.kvSet("theme",document.documentElement.dataset.t==="dark"?"light":"dark");await applyPrefs()}
const READY=[["#ffffff00","—"],["linear-gradient(160deg,#004F52,#001f21)","1"],["linear-gradient(160deg,#006B70,#003235)","2"],["linear-gradient(160deg,#004F52,#FF7900)","3"],["linear-gradient(160deg,#1b2a49,#004F52)","4"],["#004F52","5"],["#0b3b3d","6"],["linear-gradient(160deg,#ffffff,#bcdcdc)","7"]];
export function bgPicker({title,key,allKey,after}){let pend,css="";
 sheet(`<h3>${title}</h3><div class="bgprev" id="bgp">${L("معاينة","Preview")}</div><div class="sw" id="bgs">${READY.map((c,i)=>`<i data-i="${i}" style="background:${c[0]}">${i?"":"✖"}</i>`).join("")}<input type="color" id="bgc" value="#004F52" style="width:44px;height:44px;border:0;background:none"></div>
 <button class="btn s g" id="bgup">${ic("palette",20)} ${L("من الجهاز","From device")}</button><input type="file" id="bgf" accept="image/*" hidden>
 ${allKey?`<label class="sw2"><span>${L("تطبيق على جميع المحادثات","Apply to all chats")}</span><input type="checkbox" id="bgall"></label>`:""}
 <div class="brow"><button class="btn" id="bgok">${L("تطبيق","Apply")}</button><button class="btn g" id="bgdef">${L("استعادة الافتراضي","Reset")}</button></div>`);
 const pv=v=>{pend=v;css=cssOf(v);$("bgp").style.background=css||"";$("bgp").textContent=v?"":L("الافتراضي","Default")};
 $("bgs").querySelectorAll("[data-i]").forEach(i=>i.onclick=()=>pv(+i.dataset.i?{t:"c",v:READY[+i.dataset.i][0]}:null));
 $("bgc").oninput=e=>pv({t:"c",v:e.target.value});
 $("bgup").onclick=()=>$("bgf").click();$("bgf").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{pv({t:"img",v:await compress(f,1080,.7)})}catch(x){toast(L("تعذر قراءة الصورة","Cannot read image"))}};
 $("bgok").onclick=async()=>{if(pend===undefined)return toast(L("اختر خلفية أولًا","Pick a wallpaper first"));try{const all=allKey&&$("bgall")?.checked,k=all?allKey:key;
  if(pend)await Local.kvSet(k,JSON.stringify(pend));else await Local.kvDel(k);if(all)await Local.kvDel(key);await applyPrefs();closeSheet();after?.();toast("✔ "+L("تم الحفظ على الهاتف","Saved on device"))}catch(e){toast(L("تعذر الحفظ","Save failed"))}};
 $("bgdef").onclick=async()=>{await Local.kvDel(key);await applyPrefs();closeSheet();after?.();toast("✔ "+L("تمت استعادة الافتراضي","Default restored"))}}
const B=()=>$("setb");
const row=(k,i,ti,de)=>`<div class="scard gl" data-k="${k}"><span class="sic">${ic(i,24)}</span><div><b>${ti}</b><small>${de}</small></div><span class="chev flip">${ic("chev",20)}</span></div>`;
const act=(a,i,ti,de)=>row(a,i,ti,de);
const TT=()=>({main:L("الإعدادات","Settings"),look:L("المظهر والتخصيص","Appearance"),acct:L("الحساب الشخصي","Account"),backup:L("النسخ الاحتياطي","Backup"),contacts:L("جهات الاتصال","Contacts"),notif:L("الإشعارات","Notifications"),priv:L("الخصوصية والأمان","Privacy & security"),dev:L("عن المطور","About developer")});
const bind=(sel,fn)=>B().querySelectorAll(sel).forEach(e=>e.onclick=()=>fn(e));
const PAGES={
 main(){B().innerHTML=`<div class="gl pad" style="display:flex;gap:14px;align-items:center;margin-bottom:12px">${avatar(S.name,60)}<div><b>${esc(S.name)}</b><small>${esc(S.phone||"")}</small></div></div>`+
  row("look","palette",TT().look,L("اللغة والخلفيات وألوان المحادثة","Language, wallpapers & chat colors"))+row("acct","user",TT().acct,L("تغيير اسم المستخدم","Change your username"))+row("backup","backup",TT().backup,L("إنشاء واستعادة نسخة من بياناتك","Create & restore your data"))+row("contacts","book",TT().contacts,L("سحب جهات الاتصال ودعوة الأصدقاء","Pull contacts & invite friends"))+row("notif","bell",TT().notif,L("التحكم في أنواع الإشعارات","Control notification types"))+row("priv","lock",TT().priv,L("آخر ظهور وقفل المحادثات","Last seen & chat lock"))+row("dev","code",TT().dev,L("معلومات المطور والتواصل","Developer info & contact"))+row("out","logout",L("تسجيل الخروج","Log out"),L("الخروج من هذا الجهاز","Sign out of this device"));
  bind("[data-k]",e=>e.dataset.k==="out"?S.logout():show(e.dataset.k,true))},
 look(){const dk=document.documentElement.dataset.t==="dark";B().innerHTML=`<div class="sec">${L("اللغة","Language")}</div><div class="gl pad"><div class="seg"><button data-l="ar" class="${lang==="ar"?"on":""}">العربية</button><button data-l="en" class="${lang==="en"?"on":""}">English</button></div><small>${L("يتغير فورًا ويُحفظ على الهاتف — يمكن إضافة لغات لاحقًا","Applies instantly & saved on device — more languages can be added")}</small></div>
  <div class="sec">${L("الخلفيات","Wallpapers")}</div>`+act("bga","palette",L("خلفية البرنامج","App wallpaper"),L("لون أو صورة مع معاينة","Color or image with preview"))+act("bgc","chat",L("خلفية المحادثات","Chat wallpaper"),L("موحدة، ويمكن تخصيص كل محادثة من صفحة معلوماتها","Global; per-chat from chat info"))+act("bgr","refresh",L("إعادة ضبط خلفيات المحادثات الفردية","Reset per-chat wallpapers"),L("تعود كل المحادثات للخلفية الموحدة","All chats use the global wallpaper"))+act("bub","chat",L("لون فقاعات الرسائل المرسلة","Sent bubble color"),"")+
  `<div class="sec">${L("الوضع","Mode")}</div><div class="gl pad sw2" style="border:0"><span>${L("الوضع الليلي","Dark mode")}</span><span class="tg ${dk?"on":""}" id="tgt"></span></div>${fxBlock()}`;
  bind("[data-l]",async b=>{await setLang(b.dataset.l);S.refresh();show("look")});
  bind("[data-k=bga]",()=>bgPicker({title:L("خلفية البرنامج","App wallpaper"),key:"bgApp"}));
  bind("[data-k=bgc]",()=>bgPicker({title:L("خلفية المحادثات","Chat wallpaper"),key:"bgChat"}));
  bind("[data-k=bgr]",async()=>{for(const k of await Local.kvKeys("bgChat:"))await Local.kvDel(k);toast("✔")});
  bind("[data-k=bub]",()=>{const cols=["","#006B70","#1b2a49","#7a2d5a","#2f6f3e","#8a4b08"];sheet(`<h3>${L("لون الفقاعات","Bubble color")}</h3><div class="sw">${cols.map(c=>`<i data-c="${c}" style="background:${c||"transparent"}">${c?"":"✖"}</i>`).join("")}</div>`);
   $("sheet").querySelectorAll("[data-c]").forEach(i=>i.onclick=async()=>{i.dataset.c?await Local.kvSet("bubble",i.dataset.c):await Local.kvDel("bubble");await applyPrefs();closeSheet();toast("✔")})});
  $("tgt").onclick=async()=>{await toggleTheme();show("look")};fxBind()},
 acct(){B().innerHTML=`<div class="gl pad"><div class="f"><label style="color:var(--or)">${L("اسم المستخدم الحالي","Current username")}</label><input class="in" id="nn" value="${esc(S.name)}"></div><small>${L("رقم الهاتف","Phone")}: ${esc(S.phone||"")}<br>${L("معرّف الحساب لا يتغير عند تغيير الاسم، ويتحدث الاسم تلقائيًا في المحادثات والمجموعات (الرسائل القديمة تحتفظ بالاسم وقت إرسالها)","Your account ID does not change; the new name appears everywhere (old messages keep the name at send time)")}</small></div><button class="btn" id="ns" style="margin-top:12px">${L("حفظ التغييرات","Save changes")}</button>`;
  $("ns").onclick=async()=>{const n=$("nn").value.trim();if(n.length<2)return toast(L("الاسم قصير","Name too short"));if(n===S.name)return toast(L("لا تغييرات","No changes"));$("ns").disabled=true;
   try{await updateDoc(doc(db,"users",S.me.uid),{username:n,usernameLower:n.toLowerCase()});S.name=n;await Local.kvSet("myName",n);toast("✔ "+L("تم تحديث الاسم","Name updated"))}catch(e){toast(L("فشل التحديث: ","Failed: ")+(e.code||e.message))}$("ns").disabled=false}},
 async backup(){const lb=await J("lastBackup");B().innerHTML=`<div class="gl pad"><b>${L("آخر نسخة احتياطية","Last backup")}</b><small>${lb?fdate(lb.at)+" — "+kb(lb.size):L("لا توجد نسخة بعد","No backup yet")}</small><small>${L("تشمل: بيانات الحساب، المحادثات والرسائل، المجموعات، حالاتك، جهات الاتصال، الخلفيات والتفضيلات. لا تشمل كلمات المرور أو كلمة سر القفل.","Includes account, chats & messages, groups, your statuses, contacts, wallpapers & preferences. Never passwords or the lock secret.")}</small><div id="bl"></div></div>
  <div style="display:grid;gap:10px;margin-top:12px"><button class="btn" id="b1">${L("إنشاء نسخة احتياطية الآن","Create backup now")}</button><button class="btn g" id="b2">${L("تصدير إلى ملف","Export to file")}</button><button class="btn g" id="b3">${L("استعادة آخر نسخة على الهاتف","Restore last on-device backup")}</button><button class="btn g" id="b4">${L("استعادة من ملف","Restore from file")}</button></div>`;
  const busy=on=>{$("bl").innerHTML=on?'<div class="prog"><i id="pgi" style="width:5%;animation:none"></i></div><small id="pgt"></small>':"";B().querySelectorAll("button").forEach(b=>b.disabled=on)};
  const prog=(p,txt)=>{const i=$("pgi");if(i)i.style.width=p+"%";const t=$("pgt");if(t)t.textContent=txt||""};
  const build=async()=>{prog(10,L("قراءة البيانات","Reading data"));const loc=await Local.all();prog(35,L("تجميع الرسائل والإعدادات","Collecting messages & settings"));const kv=loc.kv.filter(x=>!["lockpw","backupSnap","lastBackup"].includes(x.k));
   const payload={app:"hasabat",v:1,at:Date.now(),account:{username:S.name,phone:S.phone},groups:S.docs.filter(d=>d.data().isGroup).map(d=>({id:d.id,name:d.data().name,members:d.data().members,admins:d.data().admins})),statuses:getMine().map(x=>({text:x.text,type:x.type,bg:x.bg})),messages:loc.messages,kv};
   prog(60,L("تجهيز الملف","Preparing file"));const sum=await sha(JSON.stringify(payload));prog(85,L("التحقق من السلامة","Integrity check"));const s=JSON.stringify({sum,payload});await Local.kvSet("backupSnap",s);await Local.kvSet("lastBackup",JSON.stringify({at:Date.now(),size:s.length}));prog(100,L("تم الحفظ على الهاتف","Saved on device"));return s};
  const doRestore=async text=>{let o;try{o=JSON.parse(text);if(!o.payload||o.payload.app!=="hasabat"||!Array.isArray(o.payload.messages)||await sha(JSON.stringify(o.payload))!==o.sum)throw 0}catch(e){return toast(L("الملف غير صالح أو تالف","Invalid or corrupted file"))}
   if(!confirm(L(`استعادة ${o.payload.messages.length} رسالة وإعدادات من نسخة بتاريخ ${fdate(o.payload.at)}؟ سيتم دمج البيانات مع الحالية.`,`Restore ${o.payload.messages.length} messages & settings from ${fdate(o.payload.at)}? Data will be merged.`)))return;
   busy(true);try{await Local.restore(o.payload,(i,n)=>prog(Math.round(10+i/n*85),L(`استعادة الرسائل ${i}/${n}`,`Restoring messages ${i}/${n}`)));prog(98,L("تطبيق الإعدادات","Applying settings"));await applyPrefs();S.pb=await savedContacts();S.buildPb();S.refresh();toast("✔ "+L("تمت الاستعادة","Restored"))}catch(e){toast(L("فشلت الاستعادة","Restore failed"))}busy(false)};
  $("b1").onclick=async()=>{busy(true);try{const s=await build();toast("✔ "+kb(s.length));show("backup")}catch(e){toast(L("فشل إنشاء النسخة","Backup failed"));busy(false)}};
  $("b2").onclick=async()=>{busy(true);try{const s=await build(),name="hasabat-backup-"+new Date().toISOString().slice(0,10)+".json";
   if(Capacitor.isNativePlatform()){const r=await Filesystem.writeFile({path:name,data:s,directory:Directory.Cache,encoding:Encoding.UTF8});await Share.share({title:"Hasabat backup",url:r.uri})}
   else{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([s],{type:"application/json"}));a.download=name;a.click()}toast("✔");show("backup")}catch(e){toast(L("تعذر التصدير","Export failed"));busy(false)}};
  $("b3").onclick=async()=>{const s=await Local.kvGet("backupSnap");s?doRestore(s):toast(L("لا توجد نسخة على الهاتف","No on-device backup"))};
  $("b4").onclick=()=>{const f=$("bfile");f.value="";f.onchange=async()=>{if(f.files[0])doRestore(await f.files[0].text())};f.click()}},
 async contacts(){const sy=await J("pbSync"),n=S.pb.length,on=S.pb.filter(c=>c.uid).length;
  B().innerHTML=`<div class="gl pad"><div style="display:flex;gap:12px;align-items:center"><span class="sic">${ic("book",24)}</span><div><b>${L("سحب جهات الاتصال","Pull contacts")}</b><small>${L("يقرأ جهات اتصال الهاتف بعد موافقتك، ويحفظها على الهاتف ونسخة على السيرفر لمدة 3 أيام ثم تُمسح تلقائيًا، لتجد المسجلين بسهولة بدل البحث اليدوي.","Reads your phone contacts after consent, saves them on the device and a server copy for 3 days, then auto-deleted, so you can find registered people without manual search.")}</small></div></div>
  <button class="btn" id="pc" style="margin-top:12px">${n?L("تحديث جهات الاتصال","Refresh contacts"):L("سحب جهات الاتصال","Pull contacts")}</button><div id="pl"></div>
  <small id="pst">${n?L(`تم استيراد ${n} جهة — ${on} منهم على التطبيق`,`${n} imported — ${on} on the app`)+(sy?" • "+L("آخر سحب: ","Last: ")+fdate(sy.at)+" • "+L("تُمسح من السيرفر: ","Deleted from server: ")+fdate(sy.at+3*864e5):""):L("لم يتم السحب بعد","Not pulled yet")}</small></div>
  <input class="in" id="cs" placeholder="🔍 ${L("بحث بالاسم أو الرقم","Search name or number")}" style="margin:12px 0"><div class="gl pad" style="margin-bottom:12px"><small style="margin:0">${L("رابط دعوة التحميل","Invite download link")}</small><div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span id="ilink" dir="ltr" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">…</span><button class="btn s g" id="iedit">${ic("edit",18)}</button></div></div><div id="cl"></div>`;
  let lim=100;const paint=()=>{const v=($("cs").value||"").trim().toLowerCase(),all=S.pb.filter(c=>!v||c.n.toLowerCase().includes(v)||c.p.includes(v)),rows=all.slice(0,lim);
   $("cl").innerHTML=rows.length?rows.map((c,i)=>`<div class="crow gl" data-i="${i}">${avatar(c.n)}<div class="cm"><b class="nmx">${esc(c.n)}</b><span class="sub">${esc(c.p)}</span></div>${c.uid?`<span class="badge">${L("على التطبيق","On app")}</span><button class="ib orb" data-c="${i}" style="width:38px;height:38px">${ic("chat",18)}</button>`:""}<button class="ib shr" data-s="${i}">${ic("share",20)}</button></div>`).join("")+(all.length>lim?`<button class="btn g" id="mrc">＋ ${all.length-lim}</button>`:""):`<div class="empty">${L("لا توجد جهات اتصال","No contacts")}</div>`;
   $("cl").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{const c=rows[+b.dataset.c];S.startWith(c.uid,c.n)});$("cl").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>invite(rows[+b.dataset.s].n));if($("mrc"))$("mrc").onclick=()=>{lim+=100;paint()}};
  paint();$("cs").oninput=paint;getInviteLink().then(l=>{$("ilink").textContent=l});$("iedit").onclick=async()=>{const v=prompt(L("رابط تحميل التطبيق (APK أو الموقع)","App download link (APK or website)"),await getInviteLink());if(v&&/^https?:\/\//.test(v)){await setInviteLink(v.trim());$("ilink").textContent=v.trim();toast("✔")}};
  $("pc").onclick=async()=>{await pullContacts(true);show("contacts")}},
 async notif(){const u=(await getDoc(doc(db,"users",S.me.uid)).catch(()=>null))?.data()||{},n={messages:true,groups:true,mentions:true,reactions:true,status:true,hide:false,sound:true,vibrate:true,...(u.notif||{}),dnd:{on:false,from:"23:00",to:"07:00",...(u.notif?.dnd||{})}};
  const ps=await pushState(),items=[["messages",L("الرسائل الشخصية","Direct messages")],["groups",L("رسائل المجموعات","Group messages")],["mentions",L("الإشارات والردود","Mentions & replies")],["reactions",L("التفاعلات","Reactions")],["status",L("الحالات","Statuses")],["hide",L("إخفاء محتوى الرسالة (الخصوصية)","Hide message preview")],["sound",L("صوت الإشعار","Notification sound")],["vibrate",L("الاهتزاز","Vibration")]];
  const warn={unsupported:L("إشعارات الهاتف تعمل في تطبيق الأندرويد فقط","Push works in the Android app only"),nofirebase:L("هذا الإصدار بُني بدون google-services.json فلا تعمل إشعارات الهاتف","This build has no google-services.json, so push is unavailable"),denied:L("الإشعارات معطّلة من إعدادات الهاتف","Notifications are disabled in phone settings"),prompt:L("لم تسمح بالإشعارات بعد","Notifications not allowed yet")}[ps];
  B().innerHTML=`${warn?`<div class="gl pad" style="margin-bottom:12px;border-color:var(--or)"><b>${ic("bell",18)} ${warn}</b>${ps==="denied"||ps==="prompt"?`<button class="btn s" id="pr" style="margin-top:8px">${L("السماح بالإشعارات","Allow notifications")}</button>`:""}</div>`:""}
  <div class="gl pad">${items.map(i=>`<div class="sw2"><span>${i[1]}</span><span class="tg ${n[i[0]]?"on":""}" data-k="${i[0]}"></span></div>`).join("")}</div>
  <div class="sec">${L("عدم الإزعاج","Do not disturb")}</div><div class="gl pad"><div class="sw2"><span>${L("تفعيل ساعات عدم الإزعاج","Quiet hours")}</span><span class="tg ${n.dnd.on?"on":""}" id="dn1"></span></div><div style="display:flex;gap:10px"><div style="flex:1"><small>${L("من","From")}</small><input class="in" type="time" id="dnf" value="${n.dnd.from}"></div><div style="flex:1"><small>${L("إلى","To")}</small><input class="in" type="time" id="dnt" value="${n.dnd.to}"></div></div><small>${L("الإشعارات الأمنية تصل دائمًا. كتم محادثة معينة من قائمتها ⋮","Security alerts always arrive. Mute one chat from its ⋮ menu")}</small></div>`;
  const save=async()=>{try{await updateDoc(doc(db,"users",S.me.uid),{notif:n,tzOffset:new Date().getTimezoneOffset()});toast("✔ "+L("تم الحفظ","Saved"))}catch(x){toast("⚠ "+L("تعذر الحفظ","Save failed"))}};
  bind("[data-k]",async e=>{n[e.dataset.k]=!n[e.dataset.k];e.classList.toggle("on",n[e.dataset.k]);await save()});
  $("dn1").onclick=async e=>{n.dnd.on=!n.dnd.on;e.target.classList.toggle("on",n.dnd.on);await save()};$("dnf").onchange=async e=>{n.dnd.from=e.target.value;await save()};$("dnt").onchange=async e=>{n.dnd.to=e.target.value;await save()};
  if($("pr"))$("pr").onclick=async()=>{await requestPush();show("notif")}},
 async priv(){const u=(await getDoc(doc(db,"users",S.me.uid)).catch(()=>null))?.data()||{};
  B().innerHTML=`<div class="gl pad"><div class="sw2"><span>${L("إخفاء آخر ظهور وحالة الاتصال","Hide last seen & online")}</span><span class="tg ${u.hideSeen?"on":""}" id="hs"></span></div></div>
  <div class="sec">${L("قفل المحادثات بكلمة سر","Chat lock")}</div>`+act("lk1","lock",L("تغيير كلمة سر القفل","Change lock password"),L("لقفل محادثة افتح معلوماتها واضغط قفل","Lock a chat from its info page"))+act("lk2","refresh",L("نسيت كلمة سر القفل","Forgot lock password"),L("يتطلب كلمة مرور حسابك ويمسح الأقفال","Needs your account password; clears locks"));
  $("hs").onclick=async e=>{const v=!e.target.classList.contains("on");try{await updateDoc(doc(db,"users",S.me.uid),{hideSeen:v});e.target.classList.toggle("on",v)}catch(x){toast(L("تعذر الحفظ","Save failed"))}};
  bind("[data-k=lk1]",()=>Lock.change());bind("[data-k=lk2]",async()=>{if(await Lock.reset()){toast("✔");S.refresh()}})},
 dev(){B().innerHTML=`<div class="gl devc"><div class="big">${ic("code",42)}</div><h2 style="margin:12px 0 2px">${DEV.name}</h2><p>${L("طالب بكلية الحاسبات","Computer Science student")}<br>${L("جامعة بنها","Benha University")}</p><p dir="ltr"><b style="color:#fff">${DEV.phone}</b></p>
  <div class="brow"><a class="btn" style="text-decoration:none;text-align:center" href="https://wa.me/${DEV.wa}" target="_blank" rel="noopener">${L("واتساب","WhatsApp")}</a><a class="btn g" style="text-decoration:none;text-align:center" href="tel:${DEV.phone}">${ic("phone",18)} ${L("اتصال","Call")}</a></div></div>
  <div class="gl pad" style="margin-top:12px;text-align:center"><b>${L("حاسبات ابب","Hasabat App")}</b> • ${L("الإصدار","Version")} ${VER}<small>${L("جميع الحقوق محفوظة للمطور محمد أحمد","All rights reserved to the developer Mohamed Ahmed")}</small></div>`}
};
const fxBlock=()=>`<div class="sec">${L("الحركة والمؤثرات","Motion & effects")}</div><div class="gl pad"><b>${L("شدة الحركة","Motion intensity")}</b><div class="seg" id="fxm">${[["full",L("كاملة","Full")],["low",L("مخففة","Reduced")],["off",L("بدون","Off")]].map(x=>`<button data-v="${x[0]}" class="${FX.motion===x[0]?"on":""}">${x[1]}</button>`).join("")}</div>
 <div class="sw2"><span>${L("المؤثرات الصوتية","Sound effects")}</span><span class="tg ${FX.sound?"on":""}" id="fxs"></span></div><div class="sw2"><span>${L("الاهتزاز عند التفاعل","Haptic feedback")}</span><span class="tg ${FX.haptic?"on":""}" id="fxh"></span></div>
 <b>${L("حجم الخط","Font size")}</b><div class="seg" id="fxf">${[[.9,"A-"],[1,"A"],[1.15,"A+"]].map(x=>`<button data-v="${x[0]}" class="${FX.font===x[0]?"on":""}">${x[1]}</button>`).join("")}</div>
 <b style="display:block;margin-top:10px">${L("شدة الإضاءة","Glow intensity")}</b><div class="seg" id="fxg">${[[.4,L("خفيفة","Low")],[1,L("متوسطة","Medium")],[1.6,L("قوية","High")]].map(x=>`<button data-v="${x[0]}" class="${FX.glow===x[0]?"on":""}">${x[1]}</button>`).join("")}</div>
 <small>${L("يحترم إعداد تقليل الحركة في نظام الهاتف","Respects the phone's reduce-motion setting")}</small></div><button class="btn g" id="fxr" style="margin-top:12px">${L("استعادة المظهر الافتراضي","Restore default look")}</button>`;
function fxBind(){const seg=(id,key,num)=>$(id).querySelectorAll("button").forEach(b=>b.onclick=async()=>{await setFx({[key]:num?+b.dataset.v:b.dataset.v});show("look")});seg("fxm","motion");seg("fxf","font",1);seg("fxg","glow",1);
 $("fxs").onclick=async()=>{await setFx({sound:!FX.sound});if(FX.sound)sfx("ok");show("look")};$("fxh").onclick=async()=>{await setFx({haptic:!FX.haptic});haptic(20);show("look")};
 $("fxr").onclick=async()=>{if(!confirm(L("استعادة المظهر الافتراضي (الخلفيات والألوان والحركة)؟","Restore default look (wallpapers, colors, motion)?")))return;await resetFx();for(const k of ["bgApp","bgChat","bubble"])await Local.kvDel(k);await Local.kvSet("theme","light");await applyPrefs();show("look");toast("✔")}}
function show(k,push){sub=k;$("settl").textContent=TT()[k];PAGES[k]();if(push)history.pushState({},"")}
export function openSettings(k="main"){$("set").classList.add("on");history.pushState({},"");show("main");if(k!=="main")show(k,true)}
export const settingsBack=()=>{if(sub!=="main"){show("main");return true}return false};
export const settingsRefresh=()=>{if($("set").classList.contains("on"))show(sub)};
export async function pullContacts(fromPage){if(!confirm(L("سيقرأ التطبيق جهات الاتصال من هاتفك ويطابق أرقامها مع المسجلين، وتُحفظ نسخة على السيرفر لمدة 3 أيام ثم تُمسح تلقائيًا. هل توافق؟","The app will read your phone contacts and match them with registered users. A server copy is kept for 3 days, then auto-deleted. Do you agree?")))return;
 const bl=$("pl");if(bl)bl.innerHTML='<div class="prog"><i></i></div>';const btn=$("pc");if(btn)btn.disabled=true;
 try{S.pb=await importContacts(S.me.uid,(d,n)=>{const i=document.querySelector("#pl .prog i");if(i){i.style.animation="none";i.style.width=Math.round(d/n*100)+"%"}});S.buildPb();let up=true;try{await syncUp(S.me.uid,S.pb)}catch(e){up=false}
  await Local.kvSet("pbSync",JSON.stringify({at:Date.now()}));toast(L(`تم تحميل ${S.pb.length} جهة — ${S.pb.filter(c=>c.uid).length} على التطبيق`,`${S.pb.length} loaded — ${S.pb.filter(c=>c.uid).length} on the app`)+(up?"":L(" (تعذر الحفظ على السيرفر)"," (server save failed)")));S.refresh()}
 catch(e){toast(e.message||L("تعذر السحب","Pull failed"))}
 if(bl)bl.innerHTML="";if(btn)btn.disabled=false}
