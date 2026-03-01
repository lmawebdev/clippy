import { exec } from "child_process";

/**
 * Get the name of the currently active application.
 * - macOS: uses lsappinfo (no Accessibility permissions needed)
 * - Windows: uses PowerShell matching MainWindowHandle (avoids self-detection bug)
 * - Linux: uses xdotool + xprop (requires xdotool installed)
 */
export function getActiveAppName(): Promise<string> {
  return new Promise((resolve) => {

    // ─── macOS ────────────────────────────────────────────────────────────────
    if (process.platform === "darwin") {
      const cmd = `lsappinfo info -only LSDisplayName,CFBundleName \`lsappinfo front\``;

      exec(cmd, (error, stdout) => {
        if (error) { resolve("Unknown"); return; }

        const output = stdout.toString();
        let match = output.match(/"LSDisplayName"="([^"]+)"/);
        if (!match) match = output.match(/"CFBundleName"="([^"]+)"/);

        resolve(match?.[1] ?? "Unknown");
      });

    // ─── Windows ──────────────────────────────────────────────────────────────
    } else if (process.platform === "win32") {
      /**
       * Key fix: instead of GetWindowThreadProcessId (which grabs the PowerShell
       * process itself), we match all processes by their MainWindowHandle.
       * We also use -EncodedCommand to avoid shell escaping issues entirely.
       */
      const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class WinApi {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
          }
"@
        $hwnd = [WinApi]::GetForegroundWindow()
        $proc = Get-Process | Where-Object { $_.MainWindowHandle -eq $hwnd } | Select-Object -First 1
        if ($proc) {
          $name = $proc.MainModule.FileVersionInfo.ProductName
          if ([string]::IsNullOrWhiteSpace($name)) { $name = $proc.ProcessName }
          Write-Output $name.Trim()
        } else {
          Write-Output "Unknown"
        }
      `;

      // Encode script as Base64 to avoid all quoting/escaping issues
      const encoded = Buffer.from(script, "utf16le").toString("base64");
      const cmd = `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`;

      exec(cmd, (error, stdout) => {
        if (error) { resolve("Unknown"); return; }
        const name = stdout.toString().trim();
        resolve(name || "Unknown");
      });

    // ─── Linux ────────────────────────────────────────────────────────────────
    } else if (process.platform === "linux") {
      /**
       * Requires: xdotool (sudo apt install xdotool / sudo pacman -S xdotool)
       * Gets the active window ID, then uses xprop to extract WM_CLASS (app name).
       * Falls back to _NET_WM_NAME (window title) if WM_CLASS is unavailable.
       */
      const cmd = `xprop -id $(xdotool getactivewindow) WM_CLASS _NET_WM_NAME 2>/dev/null`;

      exec(cmd, { env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ":0" } }, (error, stdout) => {
        if (error) { resolve("Unknown"); return; }

        const output = stdout.toString();

        // WM_CLASS returns: WM_CLASS(STRING) = "instance", "ClassName"
        // The second value is the human-readable app name
        const classMatch = output.match(/WM_CLASS\(STRING\)\s*=\s*"[^"]*",\s*"([^"]+)"/);
        if (classMatch?.[1]) {
          resolve(classMatch[1]);
          return;
        }

        // Fallback: _NET_WM_NAME = "Window Title"
        const nameMatch = output.match(/_NET_WM_NAME\(UTF8_STRING\)\s*=\s*"([^"]+)"/);
        resolve(nameMatch?.[1] ?? "Unknown");
      });

    // ─── Other ────────────────────────────────────────────────────────────────
    } else {
      resolve("Unknown");
    }
  });
}
