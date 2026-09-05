@echo off
cd /d "%~dp0"
node "%~dp0iniciar.cjs"
if errorlevel 1 pause
