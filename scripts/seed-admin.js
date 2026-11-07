// ADMIN_USER=240075 ADMIN_PASS=... GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/seed-admin.js
const admin=require("../functions/node_modules/firebase-admin");admin.initializeApp({projectId:"hasabat-app-b2d8e"});
(async()=>{const {ADMIN_USER:u,ADMIN_PASS:p}=process.env;if(!u||!p||p.length<6)throw Error("set ADMIN_USER and ADMIN_PASS (6+ chars)");
 const email=`${u}@admin.hasabat.app`;let r;
 try{r=await admin.auth().getUserByEmail(email);await admin.auth().updateUser(r.uid,{password:p})}catch(e){r=await admin.auth().createUser({email,password:p})}
 await admin.firestore().doc(`admins/${r.uid}`).set({mustChange:true});console.log("ADMIN READY:",email,r.uid)})().catch(e=>{console.error(e.message);process.exit(1)});
