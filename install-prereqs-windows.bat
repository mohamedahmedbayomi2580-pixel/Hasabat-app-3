@echo off
echo ===== Installing Node.js LTS + JDK 17 + Android Studio (needs Windows 10 21H1+ with winget) =====
where winget >nul 2>nul || (echo [X] winget not found. Install "App Installer" from Microsoft Store, or install the 3 tools manually (see BUILD-WINDOWS.md). & pause & exit /b 1)
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
winget install -e --id EclipseAdoptium.Temurin.17.JDK --accept-package-agreements --accept-source-agreements
winget install -e --id Google.AndroidStudio --accept-package-agreements --accept-source-agreements
echo.
echo DONE. Next: 1) Open Android Studio once and finish its setup wizard (it downloads the SDK).
echo 2) In Android Studio: More Actions - SDK Manager - SDK Tools - tick "Android SDK Command-line Tools" - Apply.
echo 3) Close this window, open a NEW one, and run accept-android-licenses.bat then build-apk-windows.bat
pause
