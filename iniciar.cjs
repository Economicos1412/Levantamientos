const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = __dirname;
const url = 'http://localhost:4178/';
const config = path.join(root, 'dist', 'server', 'wrangler.json');
const state = path.join(root, '.local');
const pidFile = path.join(state, 'server.json');
const logFile = path.join(state, 'servidor.log');
fs.mkdirSync(state, { recursive: true });
const psQuote = value => "'" + value.replaceAll("'", "''") + "'";

async function running() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const html = await response.text();
    if (response.ok && html.includes('<title>Levantamientos</title>')) return true;
    throw new Error('El puerto 4178 está ocupado por otro programa.');
  } catch (error) {
    if (error.message.includes('ocupado')) throw error;
    return false;
  }
}

function stop() {
  if (!fs.existsSync(pidFile)) { console.log('Levantamientos ya está detenido.'); return; }
  const saved = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
  if (!Number.isInteger(saved.pid) || saved.pid < 1) throw new Error('No se pudo identificar el proceso de Levantamientos.');
  // Verify the recorded process still belongs to this exact application before stopping its tree.
  const command = `$taskApp = Get-CimInstance Win32_Process -Filter 'ProcessId = ${saved.pid}'; if ($taskApp -and $taskApp.Name -eq 'node.exe' -and $taskApp.CommandLine.Contains(${psQuote(config)})) { & taskkill.exe /PID ${saved.pid} /T /F | Out-Null; exit $LASTEXITCODE }; if ($taskApp) { exit 2 }`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('No se detuvo ningún proceso porque no se pudo verificar que perteneciera a Levantamientos.');
  fs.unlinkSync(pidFile);
  console.log('Levantamientos se detuvo. Tus registros siguen guardados.');
}

async function main() {
  if (process.argv.includes('--stop')) { stop(); return; }
  if (!(await running())) {
    const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    if (!fs.existsSync(wrangler) || !fs.existsSync(config)) throw new Error('Faltan archivos de la aplicación. Conserva completa la carpeta Levantamientos.');
    const log = fs.openSync(logFile, 'a');
    const child = spawn(process.execPath, [wrangler, 'dev', '--config', config, '--ip', '127.0.0.1', '--port', '4178', '--persist-to', path.join(root, '.wrangler', 'state')], {
      cwd: root, windowsHide: true, detached: true, stdio: ['ignore', log, log],
      env: { ...process.env, WRANGLER_WRITE_LOGS: 'false', WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: path.join(root, '.wrangler', 'logs') },
    });
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.unref();
    fs.closeSync(log);
    fs.writeFileSync(pidFile, JSON.stringify({ pid: child.pid, createdAt: new Date().toISOString(), url }));
    let ready = false;
    for (let i = 0; i < 45; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await running()) { ready = true; break; }
    }
    if (!ready) throw new Error('Levantamientos no pudo iniciar. Revisa .local/servidor.log dentro de la carpeta de la aplicación.');
  }
  console.log('Levantamientos está listo en ' + url);
  if (!process.argv.includes('--no-browser')) {
    const browser = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process ${psQuote(url)}`], { windowsHide: true, detached: true, stdio: 'ignore' });
    browser.unref();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
