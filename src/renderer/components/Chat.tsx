import { useState } from "react";

import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { ANIMATION_KEYS_BRACKETS } from "../clippy-animation-helpers";
import { useChat } from "../contexts/ChatContext";
import { electronAi } from "../clippyApi";
import { useContext } from "react";
import { SharedStateContext } from "../contexts/SharedStateContext";
import { ExternalLLMService, ExternalApiProvider } from "../api/external-llm";
import { VintageSpinner } from "./Spinner95";

export type ChatProps = {
  style?: React.CSSProperties;
};

export function Chat({ style }: ChatProps) {
  const { setAnimationKey, setStatus, status, messages, addMessage } =
    useChat();
  const { settings } = useContext(SharedStateContext);
  const [streamingMessageContent, setStreamingMessageContent] =
    useState<string>("");
  const [lastRequestUUID, setLastRequestUUID] = useState<string>(
    crypto.randomUUID(),
  );

  const handleAbortMessage = () => {
    electronAi.abortRequest(lastRequestUUID);
  };

  const handleSendMessage = async (message: string) => {
    if (status !== "idle") {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: message,
      sender: "user",
      createdAt: Date.now(),
    };

    await addMessage(userMessage);
    setStreamingMessageContent("");
    setStatus("thinking");

    try {
      if (settings.useExternalApi) {
        // --- External API Mode ---
        if (!settings.externalApiKey) {
          throw new Error("Missing API Key");
        }

        // Prepare messages
        const apiMessages = messages.map((m) => ({
          role:
            m.sender === "clippy" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));
        // Add the new user message
        apiMessages.push({ role: "user", content: message });

        let fullContent = "";
        let filteredContent = "";
        let hasSetAnimationKey = false;

        const systemPrompt = settings.systemPrompt.replace(
          "[LIST OF ANIMATIONS]",
          ANIMATION_KEYS_BRACKETS.join(", "),
        );

        // Stream from External Service
        const stream = ExternalLLMService.streamResponse(
          settings.externalApiProvider as ExternalApiProvider,
          settings.externalApiKey,
          settings.externalModelId || "gpt-4o",
          apiMessages,
          systemPrompt,
        );

        for await (const chunk of stream) {
          if (fullContent === "") {
            setStatus("responding");
          }

          if (!hasSetAnimationKey) {
            const { text, animationKey } = filterMessageContent(
              fullContent + chunk,
            );

            filteredContent = text;
            fullContent = fullContent + chunk;

            if (animationKey) {
              setAnimationKey(animationKey);
              hasSetAnimationKey = true;
            }
          } else {
            filteredContent += chunk;
            fullContent += chunk; // Track full content mainly for debug matches?
          }

          setStreamingMessageContent(filteredContent);
        }

        // Finalize message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          content: filteredContent,
          sender: "clippy",
          createdAt: Date.now(),
        };

        addMessage(assistantMessage);
      } else {
        // --- Local Model Mode (Existing Logic) ---
        const requestUUID = crypto.randomUUID();
        setLastRequestUUID(requestUUID);

        const response = await window.electronAi.promptStreaming(message, {
          requestUUID,
        });

        let fullContent = "";
        let filteredContent = "";
        let hasSetAnimationKey = false;

        for await (const chunk of response) {
          if (fullContent === "") {
            setStatus("responding");
          }

          if (!hasSetAnimationKey) {
            const { text, animationKey } = filterMessageContent(
              fullContent + chunk,
            );

            filteredContent = text;
            fullContent = fullContent + chunk;

            if (animationKey) {
              setAnimationKey(animationKey);
              hasSetAnimationKey = true;
            }
          } else {
            filteredContent += chunk;
          }

          setStreamingMessageContent(filteredContent);
        }

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          content: filteredContent,
          sender: "clippy",
          createdAt: Date.now(),
        };

        addMessage(assistantMessage);
      }
    } catch (error) {
      console.error(error);
      // Optional: Add error message to chat?
    } finally {
      setStreamingMessageContent("");
      setStatus("idle");
    }
  };

  return (
    <div style={style} className="chat-container">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      {status === "responding" && (
        <Message
          message={{
            id: "streaming",
            content: streamingMessageContent,
            sender: "clippy",
            createdAt: Date.now(),
          }}
        />
      )}
      {status === "thinking" && (
        <div
          style={{
            padding: "10px",
            display: "flex",
            alignItems: "center",
            color: "#666",
            fontSize: "0.9em",
          }}>
          <VintageSpinner />
          <span>Thinking...</span>
        </div>
      )}
      <ChatInput onSend={handleSendMessage} onAbort={handleAbortMessage} />
    </div>
  );
}

/**
 * Filter the message content to get the text and animation key
 *
 * @param content - The content of the message
 * @returns The text and animation key
 */
function filterMessageContent(content: string): {
  text: string;
  animationKey: string;
} {
  let text = content;
  let animationKey = "";

  if (content === "[") {
    text = "";
  } else if (/^\[[A-Za-z]*$/m.test(content)) {
    text = content.replace(/^\[[A-Za-z]*$/m, "").trim();
  } else {
    // Check for animation keys in brackets
    for (const key of ANIMATION_KEYS_BRACKETS) {
      if (content.startsWith(key)) {
        animationKey = key.slice(1, -1);
        text = content.slice(key.length).trim();
        break;
      }
    }
  }

  return { text, animationKey };
}
