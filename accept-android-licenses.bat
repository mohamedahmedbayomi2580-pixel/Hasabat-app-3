@echo off
if "%ANDROID_HOME%"=="" if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not exist "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (echo [X] Command-line Tools missing. Android Studio - SDK Manager - SDK Tools - Android SDK Command-line Tools. & pause & exit /b 1)
echo Type y and press Enter for every question:
call "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
pause
