// نظام الحركة والمؤثرات: تفضيلات الحركة/الصوت/الاهتزاز/الخط/الإضاءة (تُحفظ في SQLite)، تموّج الضغط، هياكل التحميل، الحالات الفارغة، مشغل الصوت بموجات
import {Local} from "./local-db.js";
import {ic,esc,toast} from "./ui.js";
export const FX={motion:"full",sound:false,haptic:true,font:1,glow:1,userMotion:false};
export function applyFx(){const r=document.documentElement;r.dataset.motion=FX.motion;r.style.setProperty("--fs",FX.font);r.style.setProperty("--glow",FX.glow)}
export async function loadFx(){try{Object.assign(FX,JSON.parse(await Local.kvGet("fx")||"{}"))}catch(e){}
 if(!FX.userMotion&&matchMedia("(prefers-reduced-motion: reduce)").matches)FX.motion="low"; // احترام إعداد النظام
 applyFx()}
export async function setFx(p){Object.assign(FX,p);if("motion" in p)FX.userMotion=true;await Local.kvSet("fx",JSON.stringify(FX));applyFx()}
export async function resetFx(){await Local.kvDel("fx");Object.assign(FX,{motion:"full",sound:false,haptic:true,font:1,glow:1,userMotion:false});applyFx()}
export const haptic=(ms=12)=>{if(FX.haptic&&navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}};
let ac;
export function sfx(kind){if(!FX.sound)return;const seq={send:[[660,0,.07]],recv:[[880,0,.08],[660,.09,.09]],ok:[[600,0,.07],[900,.08,.1]],err:[[300,0,.16]],alert:[[800,0,.1],[800,.15,.1]]}[kind];if(!seq)return;
 try{ac??=new(window.AudioContext||window.webkitAudioContext)();const t0=ac.currentTime;seq.forEach(([f,t,d])=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.setValueAtTime(.0001,t0+t);g.gain.exponentialRampToValueAtTime(.07,t0+t+.012);g.gain.exponentialRampToValueAtTime(.0001,t0+t+d);o.connect(g);g.connect(ac.destination);o.start(t0+t);o.stop(t0+t+d+.03)})}catch(e){}}
export function initRipple(){document.addEventListener("pointerdown",e=>{if(FX.motion==="off")return;const el=e.target.closest(".btn,.ib,.crow,.scard,.shb,.bnav button,.tile,.story,.arow,.abtn");if(!el||el.disabled)return;
 const r=el.getBoundingClientRect(),z=Math.max(r.width,r.height)*1.6,s=document.createElement("span");s.className="rpl";s.style.cssText=`width:${z}px;height:${z}px;left:${e.clientX-r.left-z/2}px;top:${e.clientY-r.top-z/2}px`;el.classList.add("rip");el.appendChild(s);setTimeout(()=>s.remove(),600);
 if(el.matches(".btn,.ib,.bnav button"))haptic(6)},{passive:true});
 document.addEventListener("visibilitychange",()=>document.querySelectorAll(".bgfx").forEach(b=>b.classList.toggle("paused",document.hidden)))}
export const skel=(n=6,kind="row")=>Array.from({length:n},(_,i)=>kind==="msg"?`<div class="sk skm ${i%2?"r":""}"></div>`:`<div class="skrow gl"><i class="sk av0"></i><div style="flex:1"><i class="sk l1"></i><i class="sk l2"></i></div></div>`).join("");
export function emptyEl(icon,title,sub,act){const e=document.createElement("div");e.className="empty0 gl";e.innerHTML=`<span class="eic">${ic(icon,34)}</span><b>${esc(title)}</b>${sub?`<small>${esc(sub)}</small>`:""}`;if(act){const b=document.createElement("button");b.className="btn s";b.textContent=act[0];b.onclick=act[1];e.append(b)}return e}
// مشغل الرسائل الصوتية: موجات (تتحرك أثناء التشغيل)، شريط تقدم قابل للنقر، مدة، سرعة. الصوت يُحفظ بالمعرّف فلا ينقطع عند إعادة رسم المحادثة
const AUD=new Map();
export const stopAudio=()=>{AUD.forEach(a=>a.pause());AUD.clear()};
export function voicePlayer(src,dur,id){const N=28,w=document.createElement("div");w.className="vp";let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;
 const bars=Array.from({length:N},()=>{h=(h*1664525+1013904223)>>>0;return 25+(h>>>24)%75});
 w.innerHTML=`<button class="vpb ib">${ic("play",18)}</button><div class="vpw">${bars.map(b=>`<i style="height:${b}%"></i>`).join("")}</div><small class="vpt"></small><button class="spd">1x</button>`;
 let a=AUD.get(id);if(!a){a=new Audio(src);a.preload="none";AUD.set(id,a)}
 const btn=w.querySelector(".vpb"),bs=[...w.querySelectorAll(".vpw i")],tm=w.querySelector(".vpt"),sp=w.querySelector(".spd"),fmt=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
 const sync=()=>{const p=a.duration?a.currentTime/a.duration:0,pl=!a.paused;bs.forEach((b,i)=>b.classList.toggle("on",p>0&&i/N<p));tm.textContent=fmt(a.currentTime>0?a.currentTime:(isFinite(a.duration)?a.duration:dur));w.classList.toggle("play",pl);btn.innerHTML=ic(pl?"pause":"play",18);sp.textContent=a.playbackRate+"x"};
 a.ontimeupdate=sync;a.onplay=sync;a.onpause=sync;a.onended=()=>{a.currentTime=0;sync()};
 btn.onclick=e=>{e.stopPropagation();if(a.paused){AUD.forEach(o=>{if(o!==a)o.pause()});a.play().catch(()=>toast("⚠ تعذر تشغيل الصوت"))}else a.pause()};
 w.querySelector(".vpw").onclick=e=>{e.stopPropagation();if(!a.duration)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;a.currentTime=(document.dir==="rtl"?1-x:x)*a.duration;sync()};
 sp.onclick=e=>{e.stopPropagation();a.playbackRate=a.playbackRate>=2?1:a.playbackRate+.5;sync()};
 sync();return w}
