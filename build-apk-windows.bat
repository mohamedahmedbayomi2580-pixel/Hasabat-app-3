@echo off
setlocal
cd /d "%~dp0"
echo ===== Hasabat App - Android APK builder (Windows 10) =====
where node >nul 2>nul || (echo [X] Node.js not found. Install Node.js LTS from https://nodejs.org & pause & exit /b 1)
where java >nul 2>nul || (echo [X] Java JDK 17 not found. Run install-prereqs-windows.bat or install Temurin 17 & pause & exit /b 1)
java -version 2>&1 | findstr /C:"version \"17" >nul || echo [!] WARNING: JDK 17 is required. Another Java version may fail the build.
if "%ANDROID_HOME%"=="" if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if "%ANDROID_HOME%"=="" (echo [X] Android SDK not found. Install Android Studio and open it once. & pause & exit /b 1)
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
echo Android SDK: %ANDROID_HOME%
if exist google-services.json (set "PUSH_ENABLED=true") else (set "PUSH_ENABLED=false")
echo Push notifications: %PUSH_ENABLED%
echo.
echo [1/6] npm install
call npm install || goto :err
echo [2/6] build web files
call npm run build || goto :err
echo [3/6] add Android platform
if not exist android (call npx cap add android || goto :err)
echo [4/6] patch permissions
node scripts\patch-android.js || goto :err
echo [5/6] sync
call npx cap sync android || goto :err
echo [6/6] gradle assembleDebug (first run downloads Gradle, may take 5-15 minutes)
pushd android
call gradlew.bat assembleDebug
if errorlevel 1 (popd & goto :err)
popd
if not exist dist mkdir dist
copy /Y android\app\build\outputs\apk\debug\app-debug.apk dist\Hasabat-App.apk >nul
echo.
echo ===== DONE =====  APK: %cd%\dist\Hasabat-App.apk
explorer dist
pause
exit /b 0
:err
echo.
echo [X] BUILD FAILED. Copy the error text above and send it.
pause
exit /b 1
