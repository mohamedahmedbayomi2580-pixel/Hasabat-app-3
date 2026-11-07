// يُنفَّذ بعد cap add android: صلاحيات + أيقونة/لون/قناة الإشعارات الافتراضية + نسخ google-services.json لو موجود
const fs=require("fs"),path=require("path");
const R=path.join("android","app","src","main"),mf=path.join(R,"AndroidManifest.xml");
let x=fs.readFileSync(mf,"utf8"),changed=false,add="";
for(const p of ["POST_NOTIFICATIONS","RECORD_AUDIO","MODIFY_AUDIO_SETTINGS","READ_CONTACTS","VIBRATE"])if(!x.includes("android.permission."+p))add+=`    <uses-permission android:name="android.permission.${p}"/>\n`;
if(add){x=x.replace("</manifest>",add+"</manifest>");changed=true}
let mm="";for(const[n,k,v]of[["com.google.firebase.messaging.default_notification_icon","android:resource","@drawable/ic_stat"],["com.google.firebase.messaging.default_notification_color","android:resource","@color/hasabat_notif"],["com.google.firebase.messaging.default_notification_channel_id","android:value","msg_sv"]])if(!x.includes(n))mm+=`        <meta-data android:name="${n}" ${k}="${v}"/>\n`;
if(mm){x=x.replace("</application>",mm+"    </application>");changed=true}
if(changed)fs.writeFileSync(mf,x);
fs.mkdirSync(path.join(R,"res","drawable"),{recursive:true});fs.mkdirSync(path.join(R,"res","values"),{recursive:true});
fs.writeFileSync(path.join(R,"res","drawable","ic_stat.xml"),'<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFFFF" android:pathData="M21,12a8,8 0 0,1 -11.5,7.2L4,20l1,-4.5A8,8 0 1,1 21,12z"/></vector>');
fs.writeFileSync(path.join(R,"res","values","hasabat_colors.xml"),'<?xml version="1.0" encoding="utf-8"?><resources><color name="hasabat_notif">#FF7900</color></resources>');
console.log(changed?"manifest patched":"manifest already patched");
if(fs.existsSync("google-services.json")){fs.copyFileSync("google-services.json",path.join("android","app","google-services.json"));console.log("google-services.json copied (push enabled)")}
