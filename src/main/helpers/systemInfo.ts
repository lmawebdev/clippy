/**
 * System information utilities for getting CPU, RAM, and disk usage
 */

import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface SystemInfo {
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
  platform: string;
}

/**
 * Get CPU usage percentage
 */
async function getCpuUsage(): Promise<number> {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle) / total;

  return Math.round(usage * 10) / 10;
}

/**
 * Get memory usage
 */
function getMemoryUsage(): { used: number; total: number } {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;

  return { used, total };
}

/**
 * Get disk usage for the main disk
 */
async function getDiskUsage(): Promise<{ used: number; total: number }> {
  const platform = process.platform;

  try {
    if (platform === "darwin" || platform === "linux") {
      const { stdout } = await execAsync("df -k / | tail -1");
      const parts = stdout.split(/\s+/);
      const total = parseInt(parts[1], 10) * 1024;
      const used = parseInt(parts[2], 10) * 1024;
      return { used, total };
    } else if (platform === "win32") {
      const { stdout } = await execAsync(
        'wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:csv',
      );
      const lines = stdout.trim().split("\n");
      if (lines.length >= 2) {
        const parts = lines[1].split(",");
        const freeSpace = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);
        return { used: total - freeSpace, total };
      }
    }
  } catch (error) {
    // Return defaults on error
  }

  return { used: 0, total: 0 };
}

/**
 * Get all system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const cpuUsage = await getCpuUsage();
  const memory = getMemoryUsage();
  const disk = await getDiskUsage();

  return {
    cpuUsage,
    memoryUsed: memory.used,
    memoryTotal: memory.total,
    diskUsed: disk.used,
    diskTotal: disk.total,
    platform: process.platform,
  };
}
