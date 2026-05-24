import React, { useEffect, useState, useCallback, useRef } from "react";
import { clippyApi, ClipboardItem } from "../clippyApi";
import { useWindow } from "../contexts/WindowContext";
import { useChat } from "../contexts/ChatContext";
import { useBubbleView } from "../contexts/BubbleViewContext";

interface ClipboardManagerProps {
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export const ClipboardManager: React.FC<ClipboardManagerProps> = ({
  onClose,
}) => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "text" | "image">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState(180);
  const { currentWindow } = useWindow();
  const { sendMessage } = useChat();
  const { setCurrentView } = useBubbleView();
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  const handleAiAction = useCallback(async (actionType: "summarize" | "translate" | "explain" | "fix", item: ClipboardItem) => {
    if (item.type !== "text") return;

    let prompt = "";
    if (actionType === "summarize") {
      prompt = `Por favor, resume este texto del portapapeles de forma clara y concisa:\n\n"${item.content}"`;
    } else if (actionType === "translate") {
      prompt = `Por favor, traduce el siguiente texto del portapapeles al español:\n\n"${item.content}"`;
    } else if (actionType === "explain") {
      prompt = `Por favor, analiza y explica detalladamente este fragmento de código, identificando si tiene algún error o cómo mejorarlo:\n\n\`\`\`\n${item.content}\n\`\`\``;
    } else if (actionType === "fix") {
      prompt = `Por favor, corrige la ortografía, gramática y mejora el estilo de redacción de este texto:\n\n"${item.content}"`;
    }

    setCurrentView("chat");
    sendMessage(prompt);
  }, [sendMessage, setCurrentView]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    // Minimum 120px, maximum 70% of container
    if (newWidth > 120 && newWidth < containerRect.width * 0.7) {
      setListWidth(newWidth);
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    currentWindow.document.removeEventListener("mousemove", handleMouseMove);
    currentWindow.document.removeEventListener("mouseup", stopResizing);
    currentWindow.document.body.style.cursor = "default";
  }, [handleMouseMove, currentWindow]);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;
      currentWindow.document.addEventListener("mousemove", handleMouseMove);
      currentWindow.document.addEventListener("mouseup", stopResizing);
      currentWindow.document.body.style.cursor = "col-resize";
    },
    [handleMouseMove, stopResizing, currentWindow],
  );

  useEffect(() => {
    const doc = currentWindow.document;
    return () => {
      doc.removeEventListener("mousemove", handleMouseMove);
      doc.removeEventListener("mouseup", stopResizing);
    };
  }, [handleMouseMove, stopResizing, currentWindow]);

  const loadHistory = useCallback(async () => {
    try {
      const history = await clippyApi.getClipboardHistory();
      setItems(history);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    clippyApi.onClipboardHistoryUpdated(loadHistory);
    return () => {
      clippyApi.offClipboardHistoryUpdated();
    };
  }, [loadHistory]);

  const loadImage = useCallback(
    async (item: ClipboardItem) => {
      if (item.type !== "image" || imageCache[item.id]) return;
      try {
        const dataUrl = await clippyApi.getClipboardImage(item.content);
        if (dataUrl) {
          setImageCache((prev) => ({ ...prev, [item.id]: dataUrl }));
        }
      } catch {
        // silently fail
      }
    },
    [imageCache],
  );

  const handleCopyItem = useCallback(
    async (item: ClipboardItem) => {
      if (item.type === "text") {
        await clippyApi.clipboardWriteSilent({ text: item.content });
      } else if (item.type === "image") {
        const dataUrl =
          imageCache[item.id] ||
          (await clippyApi.getClipboardImage(item.content));
        if (dataUrl) {
          await clippyApi.clipboardWriteSilent({ image: dataUrl as any });
        }
      }
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1200);
    },
    [imageCache],
  );

  const handleSelect = useCallback(
    (item: ClipboardItem) => {
      setSelectedId(item.id === selectedId ? null : item.id);
      if (item.type === "image") {
        loadImage(item);
      }

      // Auto-copy to clipboard on click (matches behavior for both text and images)
      handleCopyItem(item);
    },
    [selectedId, loadImage, handleCopyItem],
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await clippyApi.deleteClipboardItem(id);
      setSelectedId(null);
      loadHistory();
    },
    [loadHistory],
  );

  const handleClearAll = useCallback(async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    await clippyApi.clearClipboardHistory();
    setItems([]);
    setSelectedId(null);
    setImageCache({});
    setConfirmClear(false);
  }, [confirmClear]);

  const filtered =
    filter === "all" ? items : items.filter((i) => i.type === filter);
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div style={styles.container}>
      {/* Title Bar */}
      <div className="title-bar app-drag" style={styles.titleBar}>
        <div className="title-bar-text" style={styles.titleBarText}>
          📋 Clipboard History
        </div>
        <div className="title-bar-controls app-no-drag">
          <button aria-label="Close" onClick={onClose} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="window-body" style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Filter:</span>
          {(["all", "text", "image"] as const).map((f) => (
            <button
              key={f}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "text" ? "Text" : "Images"}
            </button>
          ))}
        </div>
        <div style={styles.toolbarActions}>
          <button
            style={{
              ...styles.actionBtn,
              ...(confirmClear ? styles.dangerBtn : {}),
            }}
            onClick={handleClearAll}
            title="Clear all history">
            {confirmClear ? "⚠️ Confirm?" : "🗑 Clear all"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.contentArea} ref={containerRef}>
        {/* List panel */}
        <div style={{ ...styles.listPanel, width: listWidth }}>
          {loading && <div style={styles.emptyState}>Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <div>No clipboard items yet.</div>
              <div style={styles.emptyHint}>
                Copy text or images to see them here.
              </div>
            </div>
          )}
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.listItem,
                ...(item.id === selectedId ? styles.listItemSelected : {}),
              }}
              title={
                item.type === "text"
                  ? "Click to copy text"
                  : "Click to preview image"
              }
              onClick={() => handleSelect(item)}>
              <div style={styles.listItemIcon}>
                {copiedId === item.id
                  ? "✅"
                  : item.type === "image"
                    ? "🖼"
                    : "📝"}
              </div>
              <div style={styles.listItemBody}>
                <div style={styles.listItemApp}>
                  <span style={styles.appBadge}>
                    {item.appName || "Unknown"}
                  </span>
                  <span style={styles.listItemDate}>
                    {formatDate(item.timestamp)}
                  </span>
                </div>
                <div style={styles.listItemPreview}>
                  {copiedId === item.id
                    ? "Copied!"
                    : item.type === "text"
                      ? truncate(item.preview || item.content, 80)
                      : "[Image]"}
                </div>
              </div>
              <div style={styles.listItemActions} className="item-actions">
                <button
                  style={styles.deleteBtn}
                  title="Delete"
                  onClick={(e) => handleDelete(item.id, e)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Resizer Handle */}
        <div style={styles.resizer} onMouseDown={startResizing} />

        {/* Detail panel */}
        <div style={styles.detailPanel}>
          {!selectedItem ? (
            <div style={styles.detailEmpty}>
              <div>Select an item to preview it.</div>
              <div
                style={{ fontSize: "10px", marginTop: "6px", color: "#999" }}>
                Text items are copied automatically on click.
              </div>
            </div>
          ) : (
            <div style={styles.detailContent}>
              <div style={styles.detailHeader}>
                <div style={styles.detailMeta}>
                  <span style={styles.appBadgeLarge}>
                    {selectedItem.appName || "Unknown"}
                  </span>
                  <span style={styles.detailDate}>
                    {formatDate(selectedItem.timestamp)}
                  </span>
                  <span style={styles.typeBadge}>
                    {selectedItem.type === "text" ? "Text" : "Image"}
                  </span>
                </div>
              </div>

              {selectedItem.type === "text" ? (
                <>
                  <div style={styles.textPreviewBox}>
                    <pre style={styles.textPre}>{selectedItem.content}</pre>
                  </div>
                  <div style={styles.aiActionsTitle}>✨ AI Assistant Actions</div>
                  <div style={styles.aiActionsContainer}>
                    <button
                      onClick={() => handleAiAction("summarize", selectedItem)}
                      title="Summarize text"
                      style={styles.aiBtn}>
                      ✨ Summarize
                    </button>
                    <button
                      onClick={() => handleAiAction("translate", selectedItem)}
                      title="Translate to Spanish"
                      style={styles.aiBtn}>
                      🌐 Translate
                    </button>
                    <button
                      onClick={() => handleAiAction("explain", selectedItem)}
                      title="Explain Code & Find Bugs"
                      style={styles.aiBtn}>
                      📝 Explain Code
                    </button>
                    <button
                      onClick={() => handleAiAction("fix", selectedItem)}
                      title="Fix Spelling & Grammar"
                      style={styles.aiBtn}>
                      ✍️ Fix Grammar
                    </button>
                  </div>
                  <div style={styles.detailActions}>
                    <button
                      style={styles.copyBtn}
                      onClick={() => handleCopyItem(selectedItem)}>
                      {copiedId === selectedItem.id
                        ? "✅ Copied!"
                        : "📋 Copy to clipboard"}
                    </button>
                    <button
                      style={styles.deleteBtnLarge}
                      onClick={(e) => handleDelete(selectedItem.id, e)}>
                      🗑 Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.imagePreviewBox}>
                    {imageCache[selectedItem.id] ? (
                      <img
                        src={imageCache[selectedItem.id]}
                        alt="Clipboard image"
                        style={styles.previewImage}
                      />
                    ) : (
                      <div style={styles.imageLoading}>Loading image...</div>
                    )}
                  </div>
                  <div style={styles.detailActions}>
                    <button
                      style={styles.copyBtn}
                      onClick={() => handleCopyItem(selectedItem)}>
                      {copiedId === selectedItem.id
                        ? "✅ Copied!"
                        : "📋 Copy to clipboard"}
                    </button>
                    <button
                      style={styles.deleteBtnLarge}
                      onClick={(e) => handleDelete(selectedItem.id, e)}>
                      🗑 Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={styles.statusBar}>
        <div style={styles.statusBarSection}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          {filter !== "all" ? ` (${filter})` : ""}
        </div>
        <div style={styles.statusBarSection}>
          {items.filter((i) => i.type === "text").length} text ·{" "}
          {items.filter((i) => i.type === "image").length} image
          {items.filter((i) => i.type === "image").length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
};

// ── Styles (Win95 aesthetic, matching the rest of Clippy) ──────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    background: "#c0c0c0",
    fontFamily: "var(--font, 'Pixelated MS Sans Serif', 'Tahoma', sans-serif)",
    fontSize: "11px",
  },
  titleBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  titleBarText: {
    fontSize: "11px",
    fontWeight: "bold",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 6px",
    borderBottom: "1px solid #808080",
    flexShrink: 0,
    gap: "4px",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
  },
  filterLabel: {
    marginRight: "4px",
    color: "#000",
  },
  filterBtn: {
    padding: "2px 8px",
    fontSize: "11px",
    cursor: "pointer",
  },
  filterBtnActive: {
    boxShadow: "inset 1px 1px 2px #808080",
    background: "#d0d0d0",
  },
  toolbarActions: {
    display: "flex",
    gap: "4px",
  },
  actionBtn: {
    padding: "2px 8px",
    fontSize: "11px",
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#ff8080",
    color: "#000",
  },
  contentArea: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
    borderTop: "1px solid #dfdfdf",
  },
  listPanel: {
    minWidth: "120px",
    overflowY: "auto",
    background: "#fff",
    border: "2px inset #ffffff",
    boxShadow: "inset 1px 1px #808080, inset -1px -1px #dfdfdf",
  },
  resizer: {
    width: "4px",
    cursor: "col-resize",
    background: "#c0c0c0",
    borderLeft: "1px solid #ffffff",
    borderRight: "1px solid #808080",
    flexShrink: 0,
    zIndex: 10,
  },
  emptyState: {
    padding: "20px 10px",
    textAlign: "center",
    color: "#666",
    fontSize: "11px",
  },
  emptyIcon: {
    fontSize: "28px",
    marginBottom: "8px",
  },
  emptyHint: {
    marginTop: "6px",
    color: "#999",
    fontSize: "10px",
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    padding: "5px 6px",
    borderBottom: "1px solid #e0e0e0",
    cursor: "pointer",
    gap: "5px",
    position: "relative",
  },
  listItemSelected: {
    background: "#000080",
    color: "#fff",
  },
  listItemIcon: {
    fontSize: "14px",
    flexShrink: 0,
    marginTop: "1px",
  },
  listItemBody: {
    flex: 1,
    overflow: "hidden",
    minWidth: 0,
  },
  listItemApp: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    marginBottom: "2px",
  },
  appBadge: {
    background: "#c0c0c0",
    border: "1px solid #808080",
    padding: "0px 3px",
    fontSize: "9px",
    fontWeight: "bold",
    color: "#000",
    flexShrink: 0,
    maxWidth: "80px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  listItemDate: {
    fontSize: "9px",
    color: "#888",
    flexShrink: 0,
  },
  listItemPreview: {
    fontSize: "10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "inherit",
  },
  listItemActions: {
    flexShrink: 0,
  },
  deleteBtn: {
    padding: "0 2px",
    fontSize: "10px",
    cursor: "pointer",
    minWidth: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "4px",
  },
  detailPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#c0c0c0",
  },
  detailEmpty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontSize: "11px",
    padding: "20px",
    textAlign: "center",
  },
  detailContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "6px",
    gap: "6px",
  },
  detailHeader: {
    borderBottom: "1px solid #808080",
    paddingBottom: "5px",
  },
  detailMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  appBadgeLarge: {
    background: "#ffffff",
    border: "1px inset #808080",
    padding: "1px 6px",
    fontSize: "10px",
    fontWeight: "bold",
    color: "#000",
  },
  detailDate: {
    fontSize: "10px",
    color: "#666",
  },
  typeBadge: {
    background: "#000080",
    color: "#fff",
    padding: "0px 4px",
    fontSize: "9px",
  },
  textPreviewBox: {
    flex: 1,
    overflow: "auto",
    background: "#fff",
    border: "2px inset #808080",
    padding: "4px",
  },
  textPre: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "inherit",
    fontSize: "11px",
    color: "#000",
  },
  imagePreviewBox: {
    flex: 1,
    overflow: "auto",
    background: "#fff",
    border: "2px inset #808080",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    imageRendering: "crisp-edges",
  },
  imageLoading: {
    color: "#666",
    fontSize: "11px",
  },
  detailActions: {
    display: "flex",
    gap: "6px",
    flexShrink: 0,
  },
  copyBtn: {
    padding: "3px 10px",
    fontSize: "11px",
    cursor: "pointer",
  },
  deleteBtnLarge: {
    padding: "3px 12px",
    fontSize: "11px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  aiActionsTitle: {
    fontWeight: "bold",
    color: "#000",
    marginTop: "4px",
    marginBottom: "2px",
    fontSize: "10px",
  },
  aiActionsContainer: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    padding: "4px",
    background: "#d0d0d0",
    border: "1px inset #fff",
    marginBottom: "4px",
    borderRadius: "2px",
  },
  aiBtn: {
    padding: "2px 6px",
    fontSize: "10px",
    cursor: "pointer",
    flex: "1 1 auto",
  },
  statusBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "2px solid #808080",
    background: "#c0c0c0",
    padding: "2px 8px",
    fontSize: "10px",
    color: "#000",
    flexShrink: 0,
  },
  statusBarSection: {
    padding: "1px 4px",
    border: "1px inset #808080",
    background: "#c0c0c0",
  },
};
