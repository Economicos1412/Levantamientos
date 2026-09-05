@echo off
cd /d "%~dp0"
node "%~dp0iniciar.cjs" --stop
if errorlevel 1 pause
