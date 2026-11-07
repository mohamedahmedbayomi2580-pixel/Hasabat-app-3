# بناء Hasabat App على ويندوز 10 (ملف APK)

## مرة واحدة فقط: تثبيت الأدوات
الأسهل: شغّل `install-prereqs-windows.bat` (يثبت Node.js وJDK 17 وAndroid Studio عبر winget).
أو ثبّتهم يدويًا: Node.js LTS من nodejs.org، وJDK 17 (Temurin) من adoptium.net، وAndroid Studio من developer.android.com/studio.

بعد التثبيت:
1. افتح **Android Studio** مرة واحدة وأكمل معالج الإعداد الأول (ينزّل الـ SDK).
2. من Android Studio: More Actions ثم SDK Manager ثم تبويب SDK Tools ثم فعّل **Android SDK Command-line Tools** ثم Apply.
3. أغلق كل نوافذ CMD، وافتح جديدة، ثم شغّل `accept-android-licenses.bat` واكتب `y` لكل سؤال.

## بناء الـ APK
1. ضع كل ملفات المشروع في مجلد قصير بدون مسافات أو حروف عربية، مثل `C:\hasabat`.
2. (اختياري للإشعارات) ضع `google-services.json` في نفس المجلد (جذر المشروع). من Firebase Console ثم Add app ثم Android باسم الحزمة `com.hasabat.app`. من غيره الـ APK يعمل بدون إشعارات.
3. اضغط مرتين على **`build-apk-windows.bat`**. أول مرة تأخذ 5 إلى 15 دقيقة.
4. تجد الملف في `dist\Hasabat-App.apk`. انقله للموبايل وثبّته (فعّل "التثبيت من مصادر غير معروفة").

## نشر السيرفر (القواعد والدوال)
شغّل `deploy-firebase-windows.bat` (يطلب تسجيل الدخول بحساب Google صاحب المشروع). لازم يتنفذ مرة قبل تشغيل التطبيق، وأعد تنفيذه كلما تغيرت `firestore.rules` أو مجلد `functions`.

## لو حصل خطأ
- `JAVA_HOME`/Java: لازم JDK 17 تحديدًا (إصدار 21 أو 8 قد يفشل).
- `SDK location not found`: افتح Android Studio مرة، أو اضبط متغير `ANDROID_HOME` على `%LOCALAPPDATA%\Android\Sdk`.
- `licenses`: شغّل `accept-android-licenses.bat`.
- لإعادة بناء نظيف: احذف مجلدي `android` و`www` ثم أعد تشغيل `build-apk-windows.bat`.
- انسخ نص الخطأ كاملًا وأرسله.
