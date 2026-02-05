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
 * Get CPU usage percentage by measuring over a short interval
 */
async function getCpuUsage(): Promise<number> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      const { stdout } = await execAsync(
        "top -l 1 -n 0 | grep 'CPU usage' | awk '{print $3}' | tr -d '%'"
      );
      const usage = parseFloat(stdout.trim());
      if (!isNaN(usage)) {
        return Math.round(usage * 10) / 10;
      }
    } else if (platform === "linux") {
      const { stdout } = await execAsync(
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | tr -d '%us,'"
      );
      const usage = parseFloat(stdout.trim());
      if (!isNaN(usage)) {
        return Math.round(usage * 10) / 10;
      }
    } else if (platform === "win32") {
      const { stdout } = await execAsync(
        "wmic cpu get loadpercentage /format:value"
      );
      const match = stdout.match(/LoadPercentage=(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  } catch (error) {
    // Fall back to interval method
  }

  return new Promise((resolve) => {
    const startMeasure = getCpuTimes();
    setTimeout(() => {
      const endMeasure = getCpuTimes();
      const idleDiff = endMeasure.idle - startMeasure.idle;
      const totalDiff = endMeasure.total - startMeasure.total;
      const usage = totalDiff > 0 ? 100 - (100 * idleDiff) / totalDiff : 0;
      resolve(Math.round(usage * 10) / 10);
    }, 100);
  });
}

function getCpuTimes(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type as keyof typeof cpu.times];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

/**
 * Get memory usage using platform-specific commands for accurate readings
 */
async function getMemoryUsage(): Promise<{ used: number; total: number }> {
  const platform = process.platform;
  const total = os.totalmem();

  try {
    if (platform === "darwin") {
      // macOS: Use vm_stat for accurate memory usage
      const { stdout } = await execAsync("vm_stat");
      const pageSize = 16384; // Default page size on modern macOS
      
      const parseValue = (line: string): number => {
        const match = line.match(/:\s*(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const lines = stdout.split("\n");
      let wired = 0, active = 0, compressed = 0;
      
      for (const line of lines) {
        if (line.includes("Pages wired down")) {
          wired = parseValue(line) * pageSize;
        } else if (line.includes("Pages active")) {
          active = parseValue(line) * pageSize;
        } else if (line.includes("Pages occupied by compressor")) {
          compressed = parseValue(line) * pageSize;
        }
      }
      
      const used = wired + active + compressed;
      if (used > 0) {
        return { used, total };
      }
    } else if (platform === "linux") {
      // Linux: Read from /proc/meminfo for accurate values
      const { stdout } = await execAsync("cat /proc/meminfo");
      const lines = stdout.split("\n");
      let memTotal = 0, memAvailable = 0;
      
      for (const line of lines) {
        if (line.startsWith("MemTotal:")) {
          memTotal = parseInt(line.split(/\s+/)[1], 10) * 1024;
        } else if (line.startsWith("MemAvailable:")) {
          memAvailable = parseInt(line.split(/\s+/)[1], 10) * 1024;
        }
      }
      
      if (memTotal > 0) {
        return { used: memTotal - memAvailable, total: memTotal };
      }
    } else if (platform === "win32") {
      // Windows: Use wmic for memory
      const { stdout } = await execAsync(
        "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /format:csv"
      );
      const lines = stdout.trim().split("\n");
      if (lines.length >= 2) {
        const parts = lines[1].split(",");
        const freeKB = parseInt(parts[1], 10);
        const totalKB = parseInt(parts[2], 10);
        return { used: (totalKB - freeKB) * 1024, total: totalKB * 1024 };
      }
    }
  } catch (error) {
    // Fall back to Node.js method
  }

  // Fallback
  const free = os.freemem();
  return { used: total - free, total };
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
      // df output: Filesystem 1K-blocks Used Available Capacity ...
      // On macOS APFS, "Used" column can be misleading, calculate from total - available
      const total = parseInt(parts[1], 10) * 1024;
      const available = parseInt(parts[3], 10) * 1024;
      const used = total - available;
      return { used, total };
    } else if (platform === "win32") {
      const { stdout } = await execAsync(
        'wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:csv'
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
  const memory = await getMemoryUsage();
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
