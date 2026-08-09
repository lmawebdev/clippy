import { useCallback, useState } from "react";

import { clippyApi } from "../clippyApi";
import { Chat } from "./Chat";
import { Settings } from "./Settings";
import { useBubbleView } from "../contexts/BubbleViewContext";
import { Chats } from "./Chats";
import { useChat } from "../contexts/ChatContext";
import { ClipboardManager } from "./ClipboardManager";
import { Reminders } from "./Reminders";

export function Bubble() {
  const { currentView, setCurrentView } = useBubbleView();
  const { startNewChat } = useChat();
  const [isMaximized, setIsMaximized] = useState(false);

  const containerStyle = {
    width: "calc(100% - 6px)",
    height: "calc(100% - 6px)",
    margin: 0,
    overflow: "hidden",
  };

  const chatStyle = {
    padding: "15px",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "flex-end",
    minHeight: "calc(100% - 35px)",
    overflowAnchor: "none" as const,
  };

  const scrollAnchoredAtBottomStyle = {
    display: "flex",
    flexDirection: "column-reverse" as const,
  };

  let content = null;

  if (currentView === "chat") {
    content = <Chat style={chatStyle} />;
  } else if (currentView.startsWith("settings")) {
    content = <Settings onClose={() => setCurrentView("chat")} />;
  } else if (currentView === "chats") {
    content = <Chats onClose={() => setCurrentView("chat")} />;
  } else if (currentView === "clipboard") {
    content = <ClipboardManager onClose={() => setCurrentView("chat")} />;
  } else if (currentView === "reminders") {
    content = <Reminders onClose={() => setCurrentView("chat")} />;
  }

  const handleClipboardClick = useCallback(() => {
    if (currentView === "clipboard") {
      setCurrentView("chat");
    } else {
      setCurrentView("clipboard");
    }
  }, [setCurrentView, currentView]);

  const handleChatsClick = useCallback(() => {
    if (currentView === "chats") {
      setCurrentView("chat");
    } else {
      setCurrentView("chats");
    }
  }, [setCurrentView, currentView]);

  const handleRemindersClick = useCallback(() => {
    if (currentView === "reminders") {
      setCurrentView("chat");
    } else {
      setCurrentView("reminders");
    }
  }, [setCurrentView, currentView]);

  const handleSettingsClick = useCallback(() => {
    if (currentView.startsWith("settings")) {
      setCurrentView("chat");
    } else {
      setCurrentView("settings");
    }
  }, [setCurrentView, currentView]);

  // ClipboardManager manages its own layout (title bar + body)
  if (currentView === "clipboard") {
    return (
      <div className="bubble-container window" style={containerStyle}>
        {content}
      </div>
    );
  }

  const titleText =
    currentView === "chats"
      ? "Chat History"
      : currentView === "reminders"
        ? "Reminders"
        : currentView.startsWith("settings")
          ? "Settings"
          : "Chat with Clippy";

  return (
    <div className="bubble-container window" style={containerStyle}>
      <div className="app-drag title-bar">
        <div className="title-bar-text">{titleText}</div>
        <div className="title-bar-controls app-no-drag">
          <button
            style={{
              marginRight: "8px",
              paddingLeft: "8px",
              paddingRight: "8px",
            }}
            onClick={() => {
              startNewChat();
              setCurrentView("chat");
            }}>
            New Chat
          </button>
          <button
            style={{
              marginRight: "8px",
              paddingLeft: "8px",
              paddingRight: "8px",
            }}
            onClick={handleChatsClick}>
            Chats
          </button>
          <button
            style={{
              marginRight: "8px",
              paddingLeft: "8px",
              paddingRight: "8px",
            }}
            onClick={handleClipboardClick}>
            📋
          </button>
          <button
            style={{
              marginRight: "8px",
              paddingLeft: "8px",
              paddingRight: "8px",
            }}
            onClick={handleRemindersClick}>
            ⏰
          </button>
          <button
            style={{
              marginRight: "8px",
              paddingLeft: "8px",
              paddingRight: "8px",
            }}
            onClick={handleSettingsClick}>
            Settings
          </button>
          <button
            aria-label="Minimize"
            onClick={() => clippyApi.minimizeChatWindow()}></button>
          <button
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={() => {
              clippyApi.maximizeChatWindow();
              setIsMaximized(!isMaximized);
            }}></button>
          <button
            aria-label="Close"
            onClick={() => clippyApi.toggleChatWindow()}></button>
        </div>
      </div>
      <div
        className="window-content"
        style={currentView === "chat" ? scrollAnchoredAtBottomStyle : {}}>
        {content}
      </div>
    </div>
  );
}
