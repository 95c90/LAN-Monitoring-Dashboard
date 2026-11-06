import { execFile } from 'node:child_process';
import crypto from 'node:crypto';

export interface PingResult {
  online: boolean;
  rttMs: number | null;
}

const PING_TIMEOUT_MS = 1000;

function buildPingArgs(ipAddress: string): string[] {
  if (process.platform === 'win32') {
    return ['-n', '1', '-w', String(PING_TIMEOUT_MS), ipAddress];
  }
  return ['-c', '1', '-W', String(Math.ceil(PING_TIMEOUT_MS / 1000)), ipAddress];
}

function parseRoundTrip(output: string): number | null {
  const match = /[=<]\s*(\d+(?:\.\d+)?)\s*ms/i.exec(output);
  return match ? Number(match[1]) : null;
}

export function pingHost(ipAddress: string): Promise<PingResult> {
  return new Promise((resolve, reject) => {
    execFile(
      'ping',
      buildPingArgs(ipAddress),
      { windowsHide: true, timeout: PING_TIMEOUT_MS + 3000 },
      (error, stdout) => {
        if (error && typeof error.code !== 'number') {
          reject(error);
          return;
        }
        if (error) {
          resolve({ online: false, rttMs: null });
          return;
        }
        resolve({ online: true, rttMs: parseRoundTrip(stdout) });
      }
    );
  });
}

export function simulatePing(): PingResult {
  const online = crypto.randomInt(100) < 94;
  if (!online) return { online: false, rttMs: null };
  return { online: true, rttMs: Math.round((2 + crypto.randomInt(7000) / 100) * 10) / 10 };
}
