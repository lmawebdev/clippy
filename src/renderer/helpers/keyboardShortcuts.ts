/**
 * Mapping of app names (from monitor) to shortcut categories or specific logic
 */
// Add new categories if needed, or map existing ones.


// Add new categories if needed, or map existing ones.
// Let's verify categories in ShortcutCategory type.
// Existing: system, editing, navigation, screenshots, files, browser, terminal, accessibility, windows, productivity
// We need 'development' and 'communication'? Or map them to existing?
// Browser -> browser (ok)
// Terminal -> terminal (ok)
// Finder -> files (ok)
// VS Code -> 'development' (new)
// Slack -> 'communication' (new)

// Let's extend the type definition first.

import { KEYBOARD_SHORTCUTS, APP_SHORTCUTS_MAP, ShortcutCategory, KeyboardShortcut } from "./data/keyboardShortcuts";



/**
 * Get the current platform type
 */
export function getCurrentPlatform(): "mac" | "windows" | "linux" {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("win")) return "windows";
  return "linux";
}

/**
 * Get a random shortcut from the database, optionally filtered by app context
 */
export function getRandomShortcut(appName?: string): KeyboardShortcut {
  // If app name is provided and we have mapping
  if (appName && APP_SHORTCUTS_MAP[appName]) {
    const categories = APP_SHORTCUTS_MAP[appName];
    // Filter shortcuts by these categories
    const relevantShortcuts = KEYBOARD_SHORTCUTS.filter((s) =>
      categories.includes(s.category),
    );

    // 70% chance to show relevant shortcut if available
    if (relevantShortcuts.length > 0 && Math.random() < 0.7) {
      return relevantShortcuts[
        Math.floor(Math.random() * relevantShortcuts.length)
      ];
    }
  }

  const randomIndex = Math.floor(Math.random() * KEYBOARD_SHORTCUTS.length);
  return KEYBOARD_SHORTCUTS[randomIndex];
}

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(
  category: ShortcutCategory,
): KeyboardShortcut[] {
  return KEYBOARD_SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Format a shortcut for display based on current platform
 */
export function formatShortcutForPlatform(shortcut: KeyboardShortcut): string {
  const platform = getCurrentPlatform();
  const key = shortcut[platform];
  return `💡 ${shortcut.action}: ${key}`;
}
