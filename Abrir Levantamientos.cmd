@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'node.exe' -ArgumentList @('%~dp0iniciar.cjs','--stay') -WorkingDirectory '%~dp0' -WindowStyle Hidden"
if errorlevel 1 (
  echo No se pudo iniciar Levantamientos.
  pause
)
