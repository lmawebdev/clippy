import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export type ClipboardItemType = "text" | "image";
export type ClipboardRetentionPolicy = "forever" | "7d" | "30d" | "6m" | "1y";

export interface ClipboardItem {
  id: string;
  type: ClipboardItemType;
  content: string; // For text: the text. For images: relative path to the saved image file.
  appName: string;
  timestamp: number;
  preview?: string; // For text: first 200 chars. For image: same as content (path).
}

const STORE_FILE = "clipboard-history.json";
const IMAGES_DIR = "clipboard-images";

function getStorePath(): string {
  return path.join(app.getPath("userData"), STORE_FILE);
}

function getImagesDir(): string {
  return path.join(app.getPath("userData"), IMAGES_DIR);
}

function ensureImagesDir(): string {
  const dir = getImagesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function loadHistory(): ClipboardItem[] {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(raw) as ClipboardItem[];
  } catch {
    return [];
  }
}

function saveHistory(items: ClipboardItem[]): void {
  const storePath = getStorePath();
  fs.writeFileSync(storePath, JSON.stringify(items, null, 2), "utf-8");
}

export function getClipboardHistory(): ClipboardItem[] {
  return loadHistory();
}

export function addClipboardItem(
  item: Omit<ClipboardItem, "id" | "timestamp">,
): ClipboardItem {
  const history = loadHistory();

  // Deduplication: if an item with the same type and content exists, remove it
  // so the new one (with current timestamp) effectively "moves" to the top.
  const existingIndex = history.findIndex(
    (h) => h.type === item.type && h.content === item.content,
  );
  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  const newItem: ClipboardItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  };
  history.unshift(newItem); // Add to the front
  // Cap history at 500 items
  const capped = history.slice(0, 500);
  saveHistory(capped);
  return newItem;
}

export function deleteClipboardItem(id: string): void {
  const history = loadHistory();
  const item = history.find((h) => h.id === id);
  // If it's an image, delete the file too
  if (item && item.type === "image") {
    const imgPath = path.join(getImagesDir(), item.content);
    if (fs.existsSync(imgPath)) {
      try {
        fs.unlinkSync(imgPath);
      } catch {
        // Silently fail
      }
    }
  }
  const updated = history.filter((h) => h.id !== id);
  saveHistory(updated);
}

export function clearClipboardHistory(): void {
  // Delete all image files
  const dir = getImagesDir();
  if (fs.existsSync(dir)) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        fs.unlinkSync(path.join(dir, file));
      }
    } catch {
      // Silently fail
    }
  }
  saveHistory([]);
}

export function pruneByRetentionPolicy(policy: ClipboardRetentionPolicy): void {
  if (policy === "forever") return;

  const now = Date.now();
  let cutoffMs = 0;

  if (policy === "7d") cutoffMs = 7 * 24 * 60 * 60 * 1000;
  else if (policy === "30d") cutoffMs = 30 * 24 * 60 * 60 * 1000;
  else if (policy === "6m") cutoffMs = 6 * 30 * 24 * 60 * 60 * 1000;
  else if (policy === "1y") cutoffMs = 365 * 24 * 60 * 60 * 1000;

  const history = loadHistory();
  const toDelete = history.filter((h) => now - h.timestamp > cutoffMs);

  // Delete image files for pruned image items
  for (const item of toDelete) {
    if (item.type === "image") {
      const imgPath = path.join(getImagesDir(), item.content);
      if (fs.existsSync(imgPath)) {
        try {
          fs.unlinkSync(imgPath);
        } catch {
          // Silently fail
        }
      }
    }
  }

  const updated = history.filter((h) => now - h.timestamp <= cutoffMs);
  saveHistory(updated);
}

export function saveImageToStore(nativeImageDataUrl: string): string {
  const dir = ensureImagesDir();
  const filename = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
  const imgPath = path.join(dir, filename);

  // nativeImageDataUrl is "data:image/png;base64,..."
  const base64Data = nativeImageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  fs.writeFileSync(imgPath, buffer);
  return filename; // Store the filename (relative to imagesDir)
}

export function getImagePath(filename: string): string {
  return path.join(getImagesDir(), filename);
}
