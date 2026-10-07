import { exec } from "node:child_process";

export function shutdown() {
  exec("shutdown /s /t 0");
}

export function restart() {
  exec("shutdown /r /t 0");
}

export function sleep() {
  exec(
    'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState(0, $false, $false)"'
  );
}

export function lock() {
  exec("rundll32.exe user32.dll,LockWorkStation");
}

export function hibernate() {
  exec("shutdown /h");
}

export function cancelShutdown() {
  exec("shutdown /a");
}