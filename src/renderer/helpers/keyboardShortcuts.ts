/**
 * Comprehensive keyboard shortcuts database for Windows, macOS, and Linux
 */

export interface KeyboardShortcut {
  action: string;
  description: string;
  mac: string;
  windows: string;
  linux: string;
  category: ShortcutCategory;
}

export type ShortcutCategory =
  | "system"
  | "editing"
  | "navigation"
  | "screenshots"
  | "files"
  | "browser"
  | "terminal"
  | "accessibility"
  | "windows"
  | "productivity";

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // System shortcuts
  {
    action: "Copiar",
    description: "Copia el texto o elemento seleccionado",
    mac: "⌘ + C",
    windows: "Ctrl + C",
    linux: "Ctrl + C",
    category: "system",
  },
  {
    action: "Pegar",
    description: "Pega el contenido del portapapeles",
    mac: "⌘ + V",
    windows: "Ctrl + V",
    linux: "Ctrl + V",
    category: "system",
  },
  {
    action: "Cortar",
    description: "Corta el texto o elemento seleccionado",
    mac: "⌘ + X",
    windows: "Ctrl + X",
    linux: "Ctrl + X",
    category: "system",
  },
  {
    action: "Deshacer",
    description: "Deshace la última acción",
    mac: "⌘ + Z",
    windows: "Ctrl + Z",
    linux: "Ctrl + Z",
    category: "system",
  },
  {
    action: "Rehacer",
    description: "Rehace la última acción deshecha",
    mac: "⌘ + Shift + Z",
    windows: "Ctrl + Y",
    linux: "Ctrl + Shift + Z",
    category: "system",
  },
  {
    action: "Seleccionar todo",
    description: "Selecciona todo el contenido",
    mac: "⌘ + A",
    windows: "Ctrl + A",
    linux: "Ctrl + A",
    category: "system",
  },
  {
    action: "Buscar",
    description: "Abre el diálogo de búsqueda",
    mac: "⌘ + F",
    windows: "Ctrl + F",
    linux: "Ctrl + F",
    category: "system",
  },
  {
    action: "Guardar",
    description: "Guarda el documento actual",
    mac: "⌘ + S",
    windows: "Ctrl + S",
    linux: "Ctrl + S",
    category: "system",
  },
  {
    action: "Imprimir",
    description: "Abre el diálogo de impresión",
    mac: "⌘ + P",
    windows: "Ctrl + P",
    linux: "Ctrl + P",
    category: "system",
  },
  {
    action: "Cerrar ventana",
    description: "Cierra la ventana actual",
    mac: "⌘ + W",
    windows: "Alt + F4",
    linux: "Alt + F4",
    category: "system",
  },
  {
    action: "Forzar cierre",
    description: "Fuerza el cierre de la aplicación",
    mac: "⌘ + Option + Esc",
    windows: "Ctrl + Alt + Delete",
    linux: "Ctrl + Alt + Delete",
    category: "system",
  },
  {
    action: "Bloquear pantalla",
    description: "Bloquea la pantalla del ordenador",
    mac: "⌘ + Control + Q",
    windows: "Win + L",
    linux: "Super + L",
    category: "system",
  },

  // Editing shortcuts
  {
    action: "Negrita",
    description: "Aplica formato de negrita",
    mac: "⌘ + B",
    windows: "Ctrl + B",
    linux: "Ctrl + B",
    category: "editing",
  },
  {
    action: "Cursiva",
    description: "Aplica formato de cursiva",
    mac: "⌘ + I",
    windows: "Ctrl + I",
    linux: "Ctrl + I",
    category: "editing",
  },
  {
    action: "Subrayado",
    description: "Aplica formato de subrayado",
    mac: "⌘ + U",
    windows: "Ctrl + U",
    linux: "Ctrl + U",
    category: "editing",
  },
  {
    action: "Buscar y reemplazar",
    description: "Abre buscar y reemplazar",
    mac: "⌘ + Option + F",
    windows: "Ctrl + H",
    linux: "Ctrl + H",
    category: "editing",
  },
  {
    action: "Ir al inicio",
    description: "Ir al inicio del documento",
    mac: "⌘ + ↑",
    windows: "Ctrl + Home",
    linux: "Ctrl + Home",
    category: "editing",
  },
  {
    action: "Ir al final",
    description: "Ir al final del documento",
    mac: "⌘ + ↓",
    windows: "Ctrl + End",
    linux: "Ctrl + End",
    category: "editing",
  },
  {
    action: "Eliminar palabra",
    description: "Elimina la palabra anterior",
    mac: "Option + Delete",
    windows: "Ctrl + Backspace",
    linux: "Ctrl + Backspace",
    category: "editing",
  },

  // Navigation shortcuts
  {
    action: "Cambiar aplicación",
    description: "Cambia entre aplicaciones abiertas",
    mac: "⌘ + Tab",
    windows: "Alt + Tab",
    linux: "Alt + Tab",
    category: "navigation",
  },
  {
    action: "Cambiar ventana",
    description: "Cambia entre ventanas de la misma app",
    mac: "⌘ + `",
    windows: "Alt + Esc",
    linux: "Alt + `",
    category: "navigation",
  },
  {
    action: "Minimizar ventana",
    description: "Minimiza la ventana actual",
    mac: "⌘ + M",
    windows: "Win + D",
    linux: "Super + D",
    category: "navigation",
  },
  {
    action: "Mostrar escritorio",
    description: "Muestra el escritorio",
    mac: "F11",
    windows: "Win + D",
    linux: "Super + D",
    category: "navigation",
  },
  {
    action: "Escritorio siguiente",
    description: "Ir al siguiente escritorio virtual",
    mac: "Control + →",
    windows: "Win + Ctrl + →",
    linux: "Super + Page Down",
    category: "navigation",
  },
  {
    action: "Escritorio anterior",
    description: "Ir al escritorio virtual anterior",
    mac: "Control + ←",
    windows: "Win + Ctrl + ←",
    linux: "Super + Page Up",
    category: "navigation",
  },
  {
    action: "Mission Control",
    description: "Ver todas las ventanas abiertas",
    mac: "Control + ↑",
    windows: "Win + Tab",
    linux: "Super",
    category: "navigation",
  },
  {
    action: "Nueva ventana",
    description: "Abre una nueva ventana",
    mac: "⌘ + N",
    windows: "Ctrl + N",
    linux: "Ctrl + N",
    category: "navigation",
  },

  // Screenshots
  {
    action: "Captura pantalla completa",
    description: "Captura toda la pantalla",
    mac: "⌘ + Shift + 3",
    windows: "Win + PrtScn",
    linux: "PrtScn",
    category: "screenshots",
  },
  {
    action: "Captura selección",
    description: "Captura una selección de la pantalla",
    mac: "⌘ + Shift + 4",
    windows: "Win + Shift + S",
    linux: "Shift + PrtScn",
    category: "screenshots",
  },
  {
    action: "Captura ventana",
    description: "Captura solo la ventana actual",
    mac: "⌘ + Shift + 4 + Space",
    windows: "Alt + PrtScn",
    linux: "Alt + PrtScn",
    category: "screenshots",
  },
  {
    action: "Grabar pantalla",
    description: "Inicia grabación de pantalla",
    mac: "⌘ + Shift + 5",
    windows: "Win + G",
    linux: "Ctrl + Alt + Shift + R",
    category: "screenshots",
  },

  // Files & Finder/Explorer
  {
    action: "Abrir explorador",
    description: "Abre el explorador de archivos",
    mac: "⌘ + Space (Finder)",
    windows: "Win + E",
    linux: "Super + E",
    category: "files",
  },
  {
    action: "Nueva carpeta",
    description: "Crea una nueva carpeta",
    mac: "⌘ + Shift + N",
    windows: "Ctrl + Shift + N",
    linux: "Ctrl + Shift + N",
    category: "files",
  },
  {
    action: "Eliminar archivo",
    description: "Mueve archivo a la papelera",
    mac: "⌘ + Delete",
    windows: "Delete",
    linux: "Delete",
    category: "files",
  },
  {
    action: "Eliminar permanente",
    description: "Elimina archivo permanentemente",
    mac: "⌘ + Option + Delete",
    windows: "Shift + Delete",
    linux: "Shift + Delete",
    category: "files",
  },
  {
    action: "Renombrar",
    description: "Renombra el archivo seleccionado",
    mac: "Enter",
    windows: "F2",
    linux: "F2",
    category: "files",
  },
  {
    action: "Ver información",
    description: "Muestra información del archivo",
    mac: "⌘ + I",
    windows: "Alt + Enter",
    linux: "Ctrl + I",
    category: "files",
  },
  {
    action: "Vista previa rápida",
    description: "Vista previa del archivo",
    mac: "Space",
    windows: "Alt + P",
    linux: "Space",
    category: "files",
  },

  // Browser shortcuts
  {
    action: "Nueva pestaña",
    description: "Abre una nueva pestaña",
    mac: "⌘ + T",
    windows: "Ctrl + T",
    linux: "Ctrl + T",
    category: "browser",
  },
  {
    action: "Cerrar pestaña",
    description: "Cierra la pestaña actual",
    mac: "⌘ + W",
    windows: "Ctrl + W",
    linux: "Ctrl + W",
    category: "browser",
  },
  {
    action: "Reabrir pestaña",
    description: "Reabre última pestaña cerrada",
    mac: "⌘ + Shift + T",
    windows: "Ctrl + Shift + T",
    linux: "Ctrl + Shift + T",
    category: "browser",
  },
  {
    action: "Siguiente pestaña",
    description: "Ir a la siguiente pestaña",
    mac: "⌘ + Option + →",
    windows: "Ctrl + Tab",
    linux: "Ctrl + Tab",
    category: "browser",
  },
  {
    action: "Pestaña anterior",
    description: "Ir a la pestaña anterior",
    mac: "⌘ + Option + ←",
    windows: "Ctrl + Shift + Tab",
    linux: "Ctrl + Shift + Tab",
    category: "browser",
  },
  {
    action: "Actualizar página",
    description: "Recarga la página actual",
    mac: "⌘ + R",
    windows: "F5",
    linux: "F5",
    category: "browser",
  },
  {
    action: "Forzar actualización",
    description: "Recarga sin caché",
    mac: "⌘ + Shift + R",
    windows: "Ctrl + Shift + R",
    linux: "Ctrl + Shift + R",
    category: "browser",
  },
  {
    action: "Historial",
    description: "Abre el historial",
    mac: "⌘ + Y",
    windows: "Ctrl + H",
    linux: "Ctrl + H",
    category: "browser",
  },
  {
    action: "Marcadores",
    description: "Muestra los marcadores",
    mac: "⌘ + Option + B",
    windows: "Ctrl + Shift + O",
    linux: "Ctrl + Shift + O",
    category: "browser",
  },
  {
    action: "Agregar marcador",
    description: "Añade página a marcadores",
    mac: "⌘ + D",
    windows: "Ctrl + D",
    linux: "Ctrl + D",
    category: "browser",
  },
  {
    action: "Modo privado",
    description: "Nueva ventana privada/incógnito",
    mac: "⌘ + Shift + N",
    windows: "Ctrl + Shift + N",
    linux: "Ctrl + Shift + N",
    category: "browser",
  },
  {
    action: "DevTools",
    description: "Abre herramientas de desarrollador",
    mac: "⌘ + Option + I",
    windows: "F12",
    linux: "F12",
    category: "browser",
  },
  {
    action: "Ir a URL",
    description: "Foco en la barra de direcciones",
    mac: "⌘ + L",
    windows: "Ctrl + L",
    linux: "Ctrl + L",
    category: "browser",
  },

  // Terminal shortcuts
  {
    action: "Abrir terminal",
    description: "Abre una nueva terminal",
    mac: "⌘ + Space → Terminal",
    windows: "Win + X → Terminal",
    linux: "Ctrl + Alt + T",
    category: "terminal",
  },
  {
    action: "Nueva pestaña terminal",
    description: "Nueva pestaña en terminal",
    mac: "⌘ + T",
    windows: "Ctrl + Shift + T",
    linux: "Ctrl + Shift + T",
    category: "terminal",
  },
  {
    action: "Limpiar terminal",
    description: "Limpia la pantalla del terminal",
    mac: "⌘ + K",
    windows: "Cls + Enter",
    linux: "Ctrl + L",
    category: "terminal",
  },
  {
    action: "Cancelar comando",
    description: "Cancela el comando actual",
    mac: "Control + C",
    windows: "Ctrl + C",
    linux: "Ctrl + C",
    category: "terminal",
  },
  {
    action: "Historial comandos",
    description: "Buscar en historial de comandos",
    mac: "Control + R",
    windows: "Ctrl + R",
    linux: "Ctrl + R",
    category: "terminal",
  },
  {
    action: "Autocompletar",
    description: "Autocompleta comandos/rutas",
    mac: "Tab",
    windows: "Tab",
    linux: "Tab",
    category: "terminal",
  },

  // Accessibility shortcuts
  {
    action: "Zoom in",
    description: "Ampliar zoom",
    mac: "⌘ + +",
    windows: "Ctrl + +",
    linux: "Ctrl + +",
    category: "accessibility",
  },
  {
    action: "Zoom out",
    description: "Reducir zoom",
    mac: "⌘ + -",
    windows: "Ctrl + -",
    linux: "Ctrl + -",
    category: "accessibility",
  },
  {
    action: "Restablecer zoom",
    description: "Restablece zoom al 100%",
    mac: "⌘ + 0",
    windows: "Ctrl + 0",
    linux: "Ctrl + 0",
    category: "accessibility",
  },
  {
    action: "Pantalla completa",
    description: "Activa/desactiva pantalla completa",
    mac: "Control + ⌘ + F",
    windows: "F11",
    linux: "F11",
    category: "accessibility",
  },
  {
    action: "Lector de pantalla",
    description: "Activa el lector de pantalla",
    mac: "⌘ + F5",
    windows: "Win + Ctrl + Enter",
    linux: "Super + Alt + S",
    category: "accessibility",
  },
  {
    action: "Alto contraste",
    description: "Activa modo alto contraste",
    mac: "⌘ + Option + Control + 8",
    windows: "Alt + Shift + PrtScn",
    linux: "Super + Alt + G",
    category: "accessibility",
  },

  // Window management
  {
    action: "Maximizar ventana",
    description: "Maximiza la ventana actual",
    mac: "Control + ⌘ + F",
    windows: "Win + ↑",
    linux: "Super + ↑",
    category: "windows",
  },
  {
    action: "Ventana a la izquierda",
    description: "Ajusta ventana a la mitad izquierda",
    mac: "Control + Option + ←",
    windows: "Win + ←",
    linux: "Super + ←",
    category: "windows",
  },
  {
    action: "Ventana a la derecha",
    description: "Ajusta ventana a la mitad derecha",
    mac: "Control + Option + →",
    windows: "Win + →",
    linux: "Super + →",
    category: "windows",
  },
  {
    action: "Minimizar todo",
    description: "Minimiza todas las ventanas",
    mac: "⌘ + Option + M",
    windows: "Win + M",
    linux: "Super + D",
    category: "windows",
  },

  // Productivity shortcuts
  {
    action: "Spotlight/Búsqueda",
    description: "Búsqueda rápida del sistema",
    mac: "⌘ + Space",
    windows: "Win + S",
    linux: "Super",
    category: "productivity",
  },
  {
    action: "Emojis",
    description: "Abre selector de emojis",
    mac: "Control + ⌘ + Space",
    windows: "Win + .",
    linux: "Ctrl + .",
    category: "productivity",
  },
  {
    action: "Portapapeles",
    description: "Ver historial del portapapeles",
    mac: "⌘ + Shift + V",
    windows: "Win + V",
    linux: "Ctrl + Shift + V",
    category: "productivity",
  },
  {
    action: "Configuración",
    description: "Abre la configuración del sistema",
    mac: "⌘ + ,",
    windows: "Win + I",
    linux: "Super + I",
    category: "productivity",
  },
  {
    action: "Centro de notificaciones",
    description: "Abre las notificaciones",
    mac: "Click en fecha/hora",
    windows: "Win + N",
    linux: "Super + M",
    category: "productivity",
  },
  {
    action: "Ejecutar comando",
    description: "Diálogo de ejecutar",
    mac: "⌘ + Space",
    windows: "Win + R",
    linux: "Alt + F2",
    category: "productivity",
  },
];

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
 * Get a random shortcut from the database
 */
export function getRandomShortcut(): KeyboardShortcut {
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
