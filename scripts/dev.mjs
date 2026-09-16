import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const args of [
  ['server/index.mjs'],
  [resolve('node_modules/expo/bin/cli'), 'start', '--offline', '--port', '8081'],
]) {
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
