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
  | "productivity"
  | "weather"
  | "health"
  | "didyouknow";

export interface Tip {
  type: TipType;
  content: string;
  icon: string;
}

const HEALTH_TIPS = [
  "👀 Regla 20-20-20: Cada 20 min, mira a 20 pies (6m) por 20 seg.",
  "💧 ¡Hidrátate! Tu cerebro necesita agua para funcionar bien.",
  "🧘‍♀️ Endereza la espalda. Tu 'yo' del futuro te lo agradecerá.",
  "🚶‍♂️ Levántate y camina un poco. El sedentarismo mata la creatividad.",
  "🌬️ Respira profundo 3 veces. Oxigena tu mente.",
  "👁️ Parpadea. Cuando miramos pantallas, parpadeamos menos.",
  "👐 Estira las muñecas y los dedos para prevenir el túnel carpiano.",
  "🌑 Si es de noche, activa el modo oscuro o Night Shift.",
];

const DID_YOU_KNOW_TIPS = [
  "🤓 El primer 'bug' de computadora fue una polilla real atrapada en un relé.",
  "💾 El primer disco duro de 1GB pesaba más de 200kg (1980).",
  "🖱️ El primer mouse estaba hecho de madera.",
  "⌨️ QWERTY se diseñó para que las máquinas de escribir no se atascaran.",
  "🌐 La primera webcam se usó para vigilar una cafetera en Cambridge.",
  "🐧 Linux alimenta al 100% de las 500 supercomputadoras más rápidas.",
  "🍎 El logo original de Apple mostraba a Isaac Newton bajo un árbol.",
  "📧 El primer email fue enviado por Ray Tomlinson a sí mismo en 1971.",
];

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
function getShortcutTip(activeApp?: string): Tip {
  const shortcut = getRandomShortcut(activeApp);
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
 * Get health tip
 */
function getHealthTip(): Tip {
  const randomIndex = Math.floor(Math.random() * HEALTH_TIPS.length);
  return {
    type: "health",
    content: HEALTH_TIPS[randomIndex],
    icon: "🧘",
  };
}

/**
 * Get 'Did you know' tip
 */
function getDidYouKnowTip(): Tip {
  const randomIndex = Math.floor(Math.random() * DID_YOU_KNOW_TIPS.length);
  return {
    type: "didyouknow",
    content: DID_YOU_KNOW_TIPS[randomIndex],
    icon: "🧠",
  };
}

/**
 * WMO Weather Code to emoji and description mapping
 */
const WMO_WEATHER_CODES: Record<
  number,
  { emoji: string; description: string }
> = {
  0: { emoji: "☀️", description: "Despejado" },
  1: { emoji: "🌤️", description: "Mayormente despejado" },
  2: { emoji: "⛅", description: "Parcialmente nublado" },
  3: { emoji: "☁️", description: "Nublado" },
  45: { emoji: "🌫️", description: "Niebla" },
  48: { emoji: "🌫️", description: "Niebla helada" },
  51: { emoji: "🌧️", description: "Llovizna ligera" },
  53: { emoji: "🌧️", description: "Llovizna moderada" },
  55: { emoji: "🌧️", description: "Llovizna densa" },
  56: { emoji: "🌧️", description: "Llovizna helada" },
  57: { emoji: "🌧️", description: "Llovizna helada densa" },
  61: { emoji: "🌧️", description: "Lluvia ligera" },
  63: { emoji: "🌧️", description: "Lluvia moderada" },
  65: { emoji: "🌧️", description: "Lluvia intensa" },
  66: { emoji: "🌧️", description: "Lluvia helada" },
  67: { emoji: "🌧️", description: "Lluvia helada intensa" },
  71: { emoji: "🌨️", description: "Nieve ligera" },
  73: { emoji: "🌨️", description: "Nieve moderada" },
  75: { emoji: "🌨️", description: "Nieve intensa" },
  77: { emoji: "🌨️", description: "Copos de nieve" },
  80: { emoji: "🌦️", description: "Chubascos ligeros" },
  81: { emoji: "🌦️", description: "Chubascos moderados" },
  82: { emoji: "🌦️", description: "Chubascos intensos" },
  85: { emoji: "🌨️", description: "Chubascos de nieve" },
  86: { emoji: "🌨️", description: "Chubascos de nieve intensos" },
  95: { emoji: "⛈️", description: "Tormenta" },
  96: { emoji: "⛈️", description: "Tormenta con granizo" },
  99: { emoji: "⛈️", description: "Tormenta con granizo intenso" },
};

/**
 * Get weather info from Open-Meteo API
 */
async function getWeatherTip(settings: SettingsState): Promise<Tip> {
  try {
    const { weatherLatitude, weatherLongitude, weatherLocationName } = settings;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLatitude}&longitude=${weatherLongitude}&current=temperature_2m,weather_code`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Weather API error");
    }

    const data = await response.json();
    const temp = Math.round(data.current.temperature_2m);
    const weatherCode = data.current.weather_code;
    const weather = WMO_WEATHER_CODES[weatherCode] || {
      emoji: "🌡️",
      description: "Desconocido",
    };

    return {
      type: "weather",
      content: `${weather.emoji} ${temp}°C - ${weather.description}\n📍 ${weatherLocationName}`,
      icon: weather.emoji,
    };
  } catch (error) {
    return {
      type: "weather",
      content: "🌡️ No se pudo obtener el clima",
      icon: "🌡️",
    };
  }
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
  if (settings.tipBubbleShowWeather) types.push("weather");
  if (settings.tipBubbleShowHealth) types.push("health");
  if (settings.tipBubbleShowDidYouKnow) types.push("didyouknow");

  return types;
}

/**
 * Get a random tip based on enabled settings
 */
export async function getRandomTip(
  settings: SettingsState,
  activeApp?: string,
): Promise<Tip | null> {
  const enabledTypes = getEnabledTipTypes(settings);

  if (enabledTypes.length === 0) {
    return null;
  }

  // If specific app is active and supports shortcuts, increase shortcut probability
  let randomType: TipType;

  // Simple heuristic: 40% chance to show shortcut if app context is available
  // and shortcuts are enabled
  if (activeApp && settings.tipBubbleShowShortcuts && Math.random() < 0.4) {
    randomType = "shortcut";
  } else {
    randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
  }

  switch (randomType) {
    case "time":
      return getTimeTip(settings.tipBubbleTimeFormat);
    case "system":
      return getSystemTip();
    case "shortcut":
      return getShortcutTip(activeApp);
    case "greeting":
      return getGreetingTip();
    case "productivity":
      return getProductivityTip();
    case "weather":
      return getWeatherTip(settings);
    case "health":
      return getHealthTip();
    case "didyouknow":
      return getDidYouKnowTip();
    default:
      return getShortcutTip(activeApp);
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
