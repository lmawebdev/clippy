import { exec } from "child_process";

/**
 * Get the name of the currently active application (macOS only).
 * This uses lsappinfo to avoid requiring Accessibility permissions
 * that are needed for osascript/System Events.
 */
export function getActiveAppName(): Promise<string> {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") {
      resolve("Unknown");
      return;
    }

    // macOS only command to get frontmost application name using lsappinfo
    // This avoids triggering "System Events" automation permission prompts
    const cmd = `lsappinfo info -only LSDisplayName,CFBundleName \`lsappinfo front\``;

    exec(cmd, (error, stdout) => {
      if (error) {
        resolve("Unknown");
        return;
      }

      // Parse output format: "LSDisplayName"="Name" or "CFBundleName"="Name"
      const output = stdout.toString();
      let match = output.match(/"LSDisplayName"="([^"]+)"/);
      if (!match) {
        match = output.match(/"CFBundleName"="([^"]+)"/);
      }

      if (match && match[1]) {
        resolve(match[1]);
      } else {
        resolve("Unknown");
      }
    });
  });
}
