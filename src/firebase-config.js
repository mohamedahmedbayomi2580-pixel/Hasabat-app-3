import {initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager} from "firebase/firestore";
const cfg={apiKey:"AIzaSyANcZHBad6zu31FEyW3rrfGD_rKvbQido8",authDomain:"hasabat-app-b2d8e.firebaseapp.com",projectId:"hasabat-app-b2d8e",storageBucket:"hasabat-app-b2d8e.firebasestorage.app",messagingSenderId:"73805113413",appId:"1:73805113413:web:501dd38a74128dada61b2c"};
export const app=initializeApp(cfg),auth=getAuth(app);
// كاش دائم: يعمل بدون إنترنت وتُرسَل الكتابات المعلقة تلقائيًا عند عودة الاتصال
export const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
