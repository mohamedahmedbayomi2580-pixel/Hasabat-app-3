@echo off
cd /d "%~dp0"
echo ===== Deploy rules + indexes + functions + website to Firebase =====
where node >nul 2>nul || (echo [X] Install Node.js first & pause & exit /b 1)
where firebase >nul 2>nul || call npm install -g firebase-tools
call npm install || goto :err
pushd functions
call npm install || (popd & goto :err)
popd
call firebase login
call firebase use hasabat-app-b2d8e || goto :err
call firebase deploy || goto :err
echo ===== DONE =====
pause
exit /b 0
:err
echo [X] FAILED. Copy the error text above and send it.
pause
exit /b 1
