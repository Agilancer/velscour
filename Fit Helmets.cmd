@echo off
cd /d "%~dp0"
set "FITTER_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%FITTER_PY%" (
  "%FITTER_PY%" tools\helmet_fit_server.py
) else (
  py -3 tools\helmet_fit_server.py
)
if errorlevel 1 pause
