/**
 * Tip content providers for generating various types of tips
 */

import {
  formatShortcutForPlatform,
  getRandomShortcut,
} from "./keyboardShortcuts";
import { clippyApi } from "../clippyApi";
import type { SettingsState } from "../../sharedState";

export type TipType =
  | "time"
  | "system"
  | "shortcut"
  | "greeting"
  | "productivity";

export interface Tip {
  type: TipType;
  content: string;
  icon: string;
}

/**
 * Productivity tips and motivational messages
 */
const PRODUCTIVITY_TIPS = [
  "💪 ¡Pequeños pasos llevan a grandes logros!",
  "🎯 Enfócate en una tarea a la vez para máxima productividad.",
  "☕ ¿Llevas mucho tiempo? Toma un descanso de 5 minutos.",
  "🌟 ¡Lo estás haciendo genial! Sigue así.",
  "📝 Escribe tus tareas del día para mantenerte organizado.",
  "🧘 Recuerda estirar y relajar los hombros.",
  "💡 Prueba la técnica Pomodoro: 25 min trabajo, 5 min descanso.",
  "🌈 ¡Un día productivo comienza con una mente positiva!",
  "🔋 Mantén tu espacio de trabajo ordenado = mente ordenada.",
  "🎵 La música instrumental puede ayudar a concentrarse.",
  "📱 Silencia las notificaciones durante tareas importantes.",
  "🌿 Las plantas en el escritorio mejoran el ambiente.",
  "💤 Dormir bien = trabajar mejor. ¡No lo olvides!",
  "🎮 ¡Date una recompensa después de completar una tarea difícil!",
  "📚 Aprender algo nuevo cada día mantiene la mente activa.",
];

/**
 * Get greeting based on current time of day
 */
function getGreetingByTimeOfDay(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "☀️ ¡Buenos días! Espero que tengas un día productivo.";
  } else if (hour >= 12 && hour < 14) {
    return "🍽️ ¡Buen mediodía! ¿Ya has comido?";
  } else if (hour >= 14 && hour < 19) {
    return "🌤️ ¡Buenas tardes! ¿Cómo va el día?";
  } else if (hour >= 19 && hour < 22) {
    return "🌙 ¡Buenas noches! Es hora de relajarse un poco.";
  } else {
    return "🌟 ¡Hola noctámbulo! Recuerda descansar.";
  }
}

/**
 * Get time tip with formatted time
 */
function getTimeTip(format: "12h" | "24h"): Tip {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: format === "12h",
    timeZoneName: "short",
  };

  const timeStr = now.toLocaleTimeString(undefined, options);
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return {
    type: "time",
    content: `🕐 Son las ${timeStr}\n📅 ${dateStr}`,
    icon: "🕐",
  };
}

/**
 * Get system info tip
 */
async function getSystemTip(): Promise<Tip> {
  try {
    const info = await clippyApi.getSystemInfo();

    if (!info) {
      return {
        type: "system",
        content: "💻 Sistema funcionando correctamente",
        icon: "💻",
      };
    }

    const cpuStr = `CPU: ${info.cpuUsage.toFixed(1)}%`;
    const ramUsedGB = (info.memoryUsed / 1024 / 1024 / 1024).toFixed(1);
    const ramTotalGB = (info.memoryTotal / 1024 / 1024 / 1024).toFixed(1);
    const ramStr = `RAM: ${ramUsedGB}/${ramTotalGB} GB`;

    const diskUsedGB = (info.diskUsed / 1024 / 1024 / 1024).toFixed(0);
    const diskTotalGB = (info.diskTotal / 1024 / 1024 / 1024).toFixed(0);
    const diskStr = `Disco: ${diskUsedGB}/${diskTotalGB} GB`;

    return {
      type: "system",
      content: `💻 ${cpuStr} | ${ramStr} | ${diskStr}`,
      icon: "💻",
    };
  } catch (error) {
    return {
      type: "system",
      content: "💻 Sistema funcionando correctamente",
      icon: "💻",
    };
  }
}

/**
 * Get shortcut tip
 */
function getShortcutTip(): Tip {
  const shortcut = getRandomShortcut();
  return {
    type: "shortcut",
    content: formatShortcutForPlatform(shortcut),
    icon: "⌨️",
  };
}

/**
 * Get greeting tip
 */
function getGreetingTip(): Tip {
  return {
    type: "greeting",
    content: getGreetingByTimeOfDay(),
    icon: "👋",
  };
}

/**
 * Get productivity tip
 */
function getProductivityTip(): Tip {
  const randomIndex = Math.floor(Math.random() * PRODUCTIVITY_TIPS.length);
  return {
    type: "productivity",
    content: PRODUCTIVITY_TIPS[randomIndex],
    icon: "💡",
  };
}

/**
 * Get available tip types based on settings
 */
function getEnabledTipTypes(settings: SettingsState): TipType[] {
  const types: TipType[] = [];

  if (settings.tipBubbleShowTime) types.push("time");
  if (settings.tipBubbleShowSystem) types.push("system");
  if (settings.tipBubbleShowShortcuts) types.push("shortcut");
  if (settings.tipBubbleShowGreeting) types.push("greeting");
  if (settings.tipBubbleShowProductivity) types.push("productivity");

  return types;
}

/**
 * Get a random tip based on enabled settings
 */
export async function getRandomTip(settings: SettingsState): Promise<Tip | null> {
  const enabledTypes = getEnabledTipTypes(settings);

  if (enabledTypes.length === 0) {
    return null;
  }

  const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];

  switch (randomType) {
    case "time":
      return getTimeTip(settings.tipBubbleTimeFormat);
    case "system":
      return getSystemTip();
    case "shortcut":
      return getShortcutTip();
    case "greeting":
      return getGreetingTip();
    case "productivity":
      return getProductivityTip();
    default:
      return getShortcutTip();
  }
}

/**
 * Convert interval setting to milliseconds
 */
export function intervalToMs(interval: string): number {
  switch (interval) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "10m":
      return 10 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "silent":
      return 0;
    default:
      return 5 * 60 * 1000;
  }
}
