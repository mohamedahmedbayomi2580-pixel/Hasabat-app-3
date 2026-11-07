# Hasabat App
## نشر الموقع والسيرفر
npm i && cd functions && npm i && cd .. && firebase login && firebase use hasabat-app-b2d8e && firebase deploy
(فعّل Authentication Email/Password وFirestore وFunctions بخطة Blaze). أنشئ الأدمن: ADMIN_USER=.. ADMIN_PASS=.. GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/seed-admin.js
## APK من GitHub
1. ارفع المشروع على GitHub (فرع main).
2. Firebase Console → Add app → Android → اسم الحزمة com.hasabat.app → نزّل google-services.json.
3. حوّله: base64 -w0 google-services.json → GitHub → Settings → Secrets → Actions → اسمه GOOGLE_SERVICES_JSON.
4. تبويب Actions → Build APK → Run workflow → حمّل hasabat-apk من Artifacts.
## إشعارات المتصفح: ضع مفتاح VAPID في src/notifications.js
## ملاحظات: الرسائل غير مشفرة E2EE؛ حذف السيرفر لا يحذف نسخة الطرف الآخر؛ الحالات صور مضغوطة ونصوص (الفيديو يحتاج Storage).
## تفعيل الأدمن (طريقتان)
**بالسكربت:** ADMIN_USER=240075 ADMIN_PASS=كلمة_مؤقتة GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/seed-admin.js
**بدون سكربت (من الموقع):** 1) Firebase Console → Authentication → Add user: البريد 240075@admin.hasabat.app وكلمة مرور 6 أحرف فأكثر. 2) انسخ الـ UID. 3) Firestore → Start collection `admins` → Document ID = الـ UID → حقل mustChange (boolean) = true.
ثم افتح /admin.html وادخل باسم المستخدم 240075 (سيُطلب تغيير كلمة المرور).
## البحث: بالرقم أو اسم المستخدم (بداية الاسم)، ويعمل أوفلاين على جهات الاتصال المحفوظة. رقم الهاتف فريد (مجموعة phones).
## قفل المحادثات: كلمة سر محلية على الجهاز (🔒 داخل المحادثة). نسيانها → زر 🔒 في القائمة ثم "نسيت" (يطلب كلمة مرور الحساب).
## ملاحظات إضافية
- الرسائل تُحذف من السيرفر بعد 24 ساعة من الإرسال (بعد استلامها) وتبقى على الهاتف في SQLite. الرسائل غير المستلمة تبقى حتى تُفتح.
- الرسائل الصوتية (حتى 60 ثانية) تُخزَّن داخل الرسالة نفسها وتُحذف معها من السيرفر وتبقى محليًا.
- الفهارس: `firebase deploy --only firestore:indexes` ثم انتظر اكتمال بنائها.
- Functions: لو قاعدة Firestore في منطقة غير us-central1 (مثل eur3) أضف `setGlobalOptions({region:"..."})` في functions/index.js بنفس منطقة القاعدة.
