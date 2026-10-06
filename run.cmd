@echo off
setlocal
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
  echo Git Bash was not found at "%GIT_BASH%". Install Git for Windows first.
  exit /b 1
)
pushd "%~dp0"
"%GIT_BASH%" run.sh
set "RUN_EXIT=%ERRORLEVEL%"
popd
exit /b %RUN_EXIT%
