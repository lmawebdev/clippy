import { useState, useRef, useContext } from "react";

import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { ANIMATION_KEYS_BRACKETS } from "../clippy-animation-helpers";
import { useChat } from "../contexts/ChatContext";
import { electronAi } from "../clippyApi";
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAbortMessage = () => {
    electronAi.abortRequest(lastRequestUUID);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setStreamingMessageContent("");
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

        let systemPrompt = settings.systemPrompt;

        // Dynamic injection of animation list
        if (systemPrompt.includes("[LIST OF ANIMATIONS]")) {
          systemPrompt = systemPrompt.replace(
            "[LIST OF ANIMATIONS]",
            ANIMATION_KEYS_BRACKETS.join(", "),
          );
        } else {
          // If the placeholder is missing (e.g. user edited it or stale settings),
          // we append the instructions and list to ensure the AI knows what to do.
          systemPrompt += `\n\nIMPORTANT: You have access to the following animations: ${ANIMATION_KEYS_BRACKETS.join(", ")}. At the end of your response, you MUST include exactly one tag from this list, e.g. "Hello! [Greeting]".`;
        }

        // Force "At the end" instruction if it seems missing or if we suspect old prompt
        if (!systemPrompt.includes("At the end of your response")) {
          systemPrompt += `\n\nREMINDER: Put the animation tag (e.g. [Greeting]) at the VERY END of your message.`;
        }

        console.log("Final System Prompt for External API:", systemPrompt);

        // Stream from External Service
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const stream = ExternalLLMService.streamResponse(
          settings.externalApiProvider as ExternalApiProvider,
          settings.externalApiKey,
          settings.externalModelId || "gpt-4o",
          apiMessages,
          systemPrompt,
          controller.signal,
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
      abortControllerRef.current = null;
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

  // Regex to find [TagName] anywhere in the string
  const regex = /\[([a-zA-Z0-9\s_]+)\]/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const possibleKey = match[1];
    if (ANIMATION_KEYS_BRACKETS.includes(`[${possibleKey}]`)) {
      animationKey = possibleKey; // Take the latest one found
    }
  }

  if (animationKey) {
    // Remove tag and potential trailing punctuation/whitespace
    text = text.replace(
      new RegExp(`\\s*\\[${animationKey}\\]\\s*[\\.\\!\\?]*$`, "g"),
      "",
    );
    // Safety: remove it if it appears elsewhere too
    text = text.replace(new RegExp(`\\[${animationKey}\\]`, "g"), "");
    text = text.trim();
  }

  return { text, animationKey };
}
