import React, { useCallback } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { clippyApi } from "../clippyApi";

type RetentionPolicy = "forever" | "7d" | "30d" | "6m" | "1y";

const RETENTION_OPTIONS: { value: RetentionPolicy; label: string }[] = [
  { value: "forever", label: "Keep forever" },
  { value: "7d", label: "Delete after 7 days" },
  { value: "30d", label: "Delete after 30 days" },
  { value: "6m", label: "Delete after 6 months" },
  { value: "1y", label: "Delete after 1 year" },
];

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "5px",
  lineHeight: "1.4",
};

export const SettingsClipboard: React.FC = () => {
  const { settings } = useSharedState();

  const retentionPolicy =
    (settings?.clipboardRetentionPolicy as RetentionPolicy) ?? "forever";
  const saveImages = settings?.clipboardSaveImages ?? true;

  const handleRetentionChange = useCallback((value: RetentionPolicy) => {
    clippyApi.setState("settings.clipboardRetentionPolicy", value);
  }, []);

  const handleSaveImagesChange = useCallback((checked: boolean) => {
    clippyApi.setState("settings.clipboardSaveImages", checked);
  }, []);

  const handleClearHistory = useCallback(async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all clipboard history? This cannot be undone.",
      )
    ) {
      await clippyApi.clearClipboardHistory();
    }
  }, []);

  return (
    <div style={{ padding: "4px 0" }}>
      {/* About */}
      <fieldset style={{ marginBottom: "8px" }}>
        <legend>About</legend>
        <p style={{ margin: "4px 0 0" }}>
          Clippy records everything you copy — text and images. Access your
          history via the <strong>📋</strong> button in the chat window, or from
          Clippy's right-click menu.
        </p>
      </fieldset>

      {/* Retention Policy */}
      <fieldset style={{ marginBottom: "8px" }}>
        <legend>Retention Policy</legend>
        <p style={{ margin: "4px 0 8px", color: "#555" }}>
          How long to keep clipboard items before auto-deleting them.
        </p>
        {RETENTION_OPTIONS.map((option) => (
          <div key={option.value} style={row}>
            <input
              type="radio"
              id={`retention-${option.value}`}
              name="retentionPolicy"
              value={option.value}
              checked={retentionPolicy === option.value}
              onChange={() => handleRetentionChange(option.value)}
            />
            <label htmlFor={`retention-${option.value}`}>{option.label}</label>
          </div>
        ))}
      </fieldset>

      {/* Images */}
      <fieldset style={{ marginBottom: "8px" }}>
        <legend>Images</legend>
        <div style={{ padding: "4px 0 2px" }}>
          <div style={row}>
            <input
              type="checkbox"
              id="saveImages"
              checked={saveImages}
              onChange={(e) => handleSaveImagesChange(e.target.checked)}
            />
            <label htmlFor="saveImages">
              Save copied images and screenshots
            </label>
          </div>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: "10px" }}>
            Images are stored locally in your user data folder.
          </p>
        </div>
      </fieldset>

      {/* Clear History */}
      <fieldset>
        <legend>Clear History</legend>
        <p style={{ margin: "4px 0 8px", color: "#555" }}>
          Immediately delete all history items, including saved images.
        </p>
        <button onClick={handleClearHistory}>🗑 Clear All History Now</button>
      </fieldset>
    </div>
  );
};
