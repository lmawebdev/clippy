import { BrowserWindow } from "electron";
import { IpcMessages } from "../ipc-messages";
import { getMainWindow } from "./windows";
import { getActiveAppName as getActiveApp } from "./helpers/activeApp";

// Mapping of application names to Clippy animations
const APP_ANIMATION_MAP: Record<string, string> = {
  // --- Browsers -> Searching ---
  "Google Chrome": "Searching",
  "Google Chrome Canary": "Searching",
  Safari: "Searching",
  "Safari Technology Preview": "Searching",
  Firefox: "Searching",
  "Firefox Developer Edition": "Searching",
  "Firefox Nightly": "Searching",
  "Microsoft Edge": "Searching",
  "Microsoft Edge Beta": "Searching",
  "Microsoft Edge Dev": "Searching",
  "Microsoft Edge Canary": "Searching",
  Arc: "Searching",
  Brave: "Searching",
  "Brave Browser": "Searching",
  Opera: "Searching",
  "Opera GX": "Searching",
  Vivaldi: "Searching",
  Orion: "Searching",
  "Tor Browser": "Searching",
  Waterfox: "Searching",
  LibreWolf: "Searching",
  SigmaOS: "Searching",
  Min: "Searching",
  Sidekick: "Searching",

  // --- Music/Audio -> Hearing 1 ---
  Spotify: "Hearing 1",
  Music: "Hearing 1",
  "Apple Music": "Hearing 1",
  Podcasts: "Hearing 1",
  "YouTube Music": "Hearing 1",
  Tidal: "Hearing 1",
  Deezer: "Hearing 1",
  SoundCloud: "Hearing 1",
  VLC: "Hearing 1",
  IINA: "Hearing 1",
  "QuickTime Player": "Hearing 1",
  Elmedia: "Hearing 1",
  Infuse: "Hearing 1",
  GarageBand: "Hearing 1",
  "Logic Pro": "Hearing 1",
  Audacity: "Hearing 1",
  Ableton: "Hearing 1",
  "Ableton Live 11 Suite": "Hearing 1",
  "FL Studio": "Hearing 1",
  "Bitwig Studio": "Hearing 1",
  Reaper: "Hearing 1",

  // --- Communication -> SendMail ---
  Slack: "SendMail",
  Discord: "SendMail",
  "Microsoft Teams": "SendMail",
  "Microsoft Teams (classic)": "SendMail",
  Zoom: "SendMail",
  "Zoom.us": "SendMail",
  WhatsApp: "SendMail",
  "WhatsApp Legacy": "SendMail",
  Telegram: "SendMail",
  Signal: "SendMail",
  Messenger: "SendMail",
  Skype: "SendMail",
  WeChat: "SendMail",
  Viber: "SendMail",
  Line: "SendMail",
  Mattermost: "SendMail",
  "Rocket.Chat": "SendMail",
  Element: "SendMail",
  Caprine: "SendMail",
  Ferdium: "SendMail",
  Rambox: "SendMail",
  Franz: "SendMail",
  BlueBubbles: "SendMail",
  Texts: "SendMail",
  Beeper: "SendMail",

  // --- Productivity/Office -> Writing ---
  Notion: "Writing",
  Evernote: "Writing",
  Obsidian: "Writing",
  Roam: "Writing",
  Logseq: "Writing",
  Craft: "Writing",
  Bear: "Writing",
  Ulysses: "Writing",
  Scrivener: "Writing",
  Notes: "Writing",
  "Microsoft Word": "Writing",
  Word: "Writing",
  "Microsoft Excel": "Writing",
  Excel: "Writing",
  "Microsoft PowerPoint": "Writing",
  PowerPoint: "Writing",
  "Microsoft OneNote": "Writing",
  OneNote: "Writing",
  Pages: "Writing",
  Numbers: "Writing",
  Keynote: "Writing",
  LibreOffice: "Writing",
  OpenOffice: "Writing",
  Typora: "Writing",
  iaWriter: "Writing",
  "iA Writer": "Writing",
  Joplin: "Writing",
  UpNote: "Writing",
  StandardNotes: "Writing",
  "Standard Notes": "Writing",
  Simplenote: "Writing",
  Anytype: "Writing",
  Reflect: "Writing",
  Heptabase: "Writing",
  Tana: "Writing",

  // --- Task Management -> Alert/Check ---
  Reminders: "Alert",
  "Microsoft To Do": "Alert",
  Things: "Alert",
  "Things 3": "Alert",
  Todoist: "Alert",
  TickTick: "Alert",
  OmniFocus: "Alert",
  Sorted: "Alert",
  "Sorted³": "Alert",
  GoodTask: "Alert",
  TaskPaper: "Alert",
  Calendar: "Alert",
  "Google Calendar": "Alert",
  Fantastical: "Alert",
  Cron: "Alert",
  Morgen: "Alert",
  Amie: "Alert",

  // --- Development -> GetTechy/Processing ---
  Code: "GetTechy", // VS Code
  "Visual Studio Code": "GetTechy",
  "Visual Studio Code - Insiders": "GetTechy",
  Cursor: "GetTechy",
  Windsurf: "GetTechy",
  Zed: "GetTechy",
  Atom: "GetTechy",
  Sublime: "GetTechy",
  "Sublime Text": "GetTechy",
  TextEdit: "Writing",
  BBEdit: "GetTechy",
  TextMate: "GetTechy",
  Nova: "GetTechy",
  Espresso: "GetTechy",
  Vim: "GetTechy",
  Neovim: "GetTechy",
  MacVim: "GetTechy",
  Emacs: "GetTechy",
  Xcode: "GetTechy",
  "Android Studio": "GetTechy",
  IntelliJ: "GetTechy",
  "IntelliJ IDEA": "GetTechy",
  "IntelliJ IDEA Ultimate": "GetTechy",
  "IntelliJ IDEA CE": "GetTechy",
  PyCharm: "GetTechy",
  "PyCharm Professional": "GetTechy",
  "PyCharm CE": "GetTechy",
  WebStorm: "GetTechy",
  PhpStorm: "GetTechy",
  GoLand: "GetTechy",
  Rider: "GetTechy",
  RubyMine: "GetTechy",
  AppCode: "GetTechy",
  CLion: "GetTechy",
  Fleet: "GetTechy",
  Docker: "Processing",
  "Docker Desktop": "Processing",
  Podman: "Processing",
  "Podman Desktop": "Processing",
  OrbStack: "Processing",
  Postman: "Processing",
  Insomnia: "Processing",
  Paw: "Processing",
  RapidAPI: "Processing",
  TablePlus: "Processing",
  SequelAce: "Processing",
  "Sequel Ace": "Processing",
  DBeaver: "Processing",
  DataGrip: "Processing",
  MongoDBCompass: "Processing",
  "MongoDB Compass": "Processing",
  RedisInsight: "Processing",
  Terminal: "Processing",
  iTerm2: "Processing",
  Hyper: "Processing",
  Warp: "Processing",
  Ghostty: "Processing",
  Alacritty: "Processing",
  Kitty: "Processing",
  WezTerm: "Processing",
  Rio: "Processing",
  Tabby: "Processing",
  Fig: "Processing",

  // --- Design -> GetArtsy ---
  Preview: "GetArtsy",
  Photos: "GetArtsy",
  Photoshop: "GetArtsy",
  "Adobe Photoshop": "GetArtsy",
  "Adobe Photoshop 2024": "GetArtsy",
  Illustrator: "GetArtsy",
  "Adobe Illustrator": "GetArtsy",
  InDesign: "GetArtsy",
  "Adobe InDesign": "GetArtsy",
  "Adobe XD": "GetArtsy",
  Lightroom: "GetArtsy",
  "Adobe Lightroom": "GetArtsy",
  "Premiere Pro": "GetArtsy",
  "Adobe Premiere Pro": "GetArtsy",
  "After Effects": "GetArtsy",
  "Adobe After Effects": "GetArtsy",
  Figma: "GetArtsy",
  Sketch: "GetArtsy",
  Blender: "GetArtsy",
  Cinema4D: "GetArtsy",
  Maya: "GetArtsy",
  Canva: "GetArtsy",
  GIMP: "GetArtsy",
  Krita: "GetArtsy",
  Inkscape: "GetArtsy",
  Affinity: "GetArtsy",
  "Affinity Photo": "GetArtsy",
  "Affinity Designer": "GetArtsy",
  "Affinity Publisher": "GetArtsy",
  Pixelmator: "GetArtsy",
  "Pixelmator Pro": "GetArtsy",
  Aseprite: "GetArtsy",
  Rive: "GetArtsy",
  Spline: "GetArtsy",
  Linearity: "GetArtsy",
  "Linearity Curve": "GetArtsy",
  Principle: "GetArtsy",
  Origami: "GetArtsy",
  "Origami Studio": "GetArtsy",
  Framer: "GetArtsy",

  // --- Mail -> SendMail ---
  Mail: "SendMail",
  Outlook: "SendMail",
  "Microsoft Outlook": "SendMail",
  Thunderbird: "SendMail",
  Spark: "SendMail",
  "Spark Desktop": "SendMail",
  Airmail: "SendMail",
  Superhuman: "SendMail",
  Edison: "SendMail",
  "Edison Mail": "SendMail",
  Canary: "SendMail",
  "Canary Mail": "SendMail",
  Mimestream: "SendMail",
  Postbox: "SendMail",
  Hey: "SendMail",
  ProtonMail: "SendMail",
  "Proton Mail": "SendMail",
  Tutanota: "SendMail",

  // --- System/Utilities -> GetWizardy/Processing ---
  "Activity Monitor": "Processing",
  "System Settings": "GetWizardy",
  Settings: "GetWizardy",
  "System Preferences": "GetWizardy",
  Finder: "Searching",
  System: "LookRight",
  Trash: "EmptyTrash",
  "1Password": "GetWizardy",
  Bitwarden: "GetWizardy",
  LastPass: "GetWizardy",
  KeePassXC: "GetWizardy",
  Dashlane: "GetWizardy",
  Enpass: "GetWizardy",
  Alfred: "Searching",
  Raycast: "Searching",
  Spotlight: "Searching",
  BetterTouchTool: "GetWizardy",
  Rectangle: "GetWizardy",
  Magnet: "GetWizardy",
  Amethyst: "GetWizardy",
  Yabai: "GetWizardy",
  Hammerspoon: "GetWizardy",
  Karabiner: "GetWizardy",
  "Karabiner-Elements": "GetWizardy",
  Shortcuts: "GetWizardy",
  Automator: "GetWizardy",
  "Disk Utility": "Processing",
  Console: "Processing",
  Homebrew: "Processing",
};

let previousApp = "";
let monitorInterval: NodeJS.Timeout | null = null;
const CHECK_INTERVAL_MS = 2000;

export function startMonitor() {
  if (monitorInterval) return;

  // Only run on macOS for now as per plan
  if (process.platform !== "darwin") {
    console.warn("External app monitoring is only supported on macOS for now.");
    return;
  }

  monitorInterval = setInterval(async () => {
    const currentApp = await getActiveApp();

    if (currentApp && currentApp !== previousApp) {
      previousApp = currentApp;

      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        // Always notify renderer of app change for context-aware tips
        win.webContents.send(IpcMessages.ACTIVE_APP_UPDATE, currentApp);
      }

      // Check if we have an animation for this app
      // We also handle partial matches or case sensitivity if needed, but osascript usually returns proper Name

      // Direct match check
      let animationKey = APP_ANIMATION_MAP[currentApp];

      // If no direct match, could check for partials (e.g. "Google Chrome Helper" -> "Google Chrome")
      // But usually "name of active app" is the main name.

      if (animationKey) {
        if (win && !win.isDestroyed()) {
          console.log(
            `[Monitor] Detected ${currentApp}, triggering ${animationKey}`,
          );
          win.webContents.send(
            IpcMessages.EXTERNAL_APP_TRIGGER,
            animationKey,
            currentApp,
          );
        }
      }
    }
  }, CHECK_INTERVAL_MS);
}

export function stopMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
