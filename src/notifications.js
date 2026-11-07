// إشعارات الدفع: أندرويد (FCM عبر Capacitor) + المتصفح (Web Push). التوكنات تُحفظ في users/{uid}/tokens ولا يقرأها غير صاحبها
import {Capacitor} from "@capacitor/core";
import {PushNotifications as P} from "@capacitor/push-notifications";
import {db,app} from "./firebase-config.js";
import {doc,setDoc,deleteDoc} from "firebase/firestore";
import {S} from "./ui.js";
const VAPID=""; // مفتاح Web Push من Firebase → Project settings → Cloud Messaging (للمتصفح فقط)
let token=null,owner=null,inited=false;
// قنوات أندرويد الأربع: السيرفر يختار القناة حسب إعدادات المستخدم (صوت/اهتزاز)
const CH=[["msg_sv","رسائل (صوت واهتزاز)",4,true],["msg_s","رسائل (صوت)",4,false],["msg_v","رسائل (اهتزاز)",2,true],["msg_q","رسائل (صامتة)",2,false]];
const save=async(t,me)=>{token=t;owner=me.uid;await setDoc(doc(db,"users",me.uid,"tokens",t),{at:Date.now(),p:Capacitor.getPlatform()})};
export async function pushState(){if(Capacitor.isNativePlatform()){if(!__PUSH__)return"nofirebase";try{return(await P.checkPermissions()).receive}catch(e){return"unsupported"}}
 return"Notification" in window&&VAPID?(Notification.permission==="default"?"prompt":Notification.permission):"unsupported"}
async function webInit(me){if(!("Notification" in window)||!VAPID||await Notification.requestPermission()!=="granted")return;
 const {getMessaging,getToken,onMessage}=await import("firebase/messaging"),m=getMessaging(app);
 await save(await getToken(m,{vapidKey:VAPID,serviceWorkerRegistration:await navigator.serviceWorker.register("firebase-messaging-sw.js")}),me);
 onMessage(m,x=>S.onPush?.(x.data||{},x.notification?.title||"",x.notification?.body||""))}
export async function requestPush(){try{if(Capacitor.isNativePlatform()){if(!__PUSH__)return;const r=await P.requestPermissions();if(r.receive==="granted")await P.register()}else await webInit(S.me)}catch(e){console.warn("push",e)}}
export async function initNotifications(me){if(inited)return;inited=true;
 try{if(Capacitor.isNativePlatform()){if(!__PUSH__)return;
   for(const[id,name,imp,vib]of CH)await P.createChannel({id,name,description:"Hasabat App",importance:imp,visibility:1,vibration:vib,lights:true,lightColor:"#FF7900"}).catch(()=>{});
   await P.addListener("registration",t=>save(t.value,me));
   await P.addListener("registrationError",e=>console.warn("push registration",e));
   await P.addListener("pushNotificationReceived",n=>S.onPush?.(n.data||{},n.title||"",n.body||"")); // التطبيق مفتوح
   await P.addListener("pushNotificationActionPerformed",a=>{const c=a.notification?.data?.cid;if(c)S.openChatById?.(c)}); // الضغط على الإشعار
   let p=(await P.checkPermissions()).receive;if(p==="prompt"||p==="prompt-with-rationale")p=(await P.requestPermissions()).receive;
   if(p==="granted")await P.register()}
  else await webInit(me)}catch(e){console.warn("push",e)}}
export async function unregisterPush(){if(token&&owner)await deleteDoc(doc(db,"users",owner,"tokens",token))}
