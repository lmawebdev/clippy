import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";

export interface BubbleQueueItem {
  id: string;
  text: string;
  mode: string;
  duration: number;
  animation?: string;
}
import { Message } from "../components/Message";
import { clippyApi, electronAi } from "../clippyApi";
import { SharedStateContext } from "./SharedStateContext";
import { areAnyModelsReadyOrDownloading } from "../../helpers/model-helpers";
import { WelcomeMessageContent } from "../components/WelcomeMessageContent";
import { ChatRecord, MessageRecord } from "../../types/interfaces";
import { useDebugState } from "./DebugContext";
import { ANIMATION_KEYS_BRACKETS } from "../clippy-animation-helpers";
import { ErrorLoadModelMessageContent } from "../components/ErrorLoadModelMessageContent";
import { ExternalLLMService, ExternalApiProvider } from "../api/external-llm";

import type {
  LanguageModelPrompt,
  LanguageModelCreateOptions,
  LanguageModelPromptRole,
  LanguageModelPromptType,
} from "@electron/llm";

type ClippyNamedStatus =
  | "welcome"
  | "idle"
  | "responding"
  | "thinking"
  | "goodbye";

export type ChatContextType = {
  messages: Message[];
  addMessage: (message: Message) => Promise<void>;
  setMessages: (messages: Message[]) => void;
  animationKey: string;
  setAnimationKey: (animationKey: string) => void;
  status: ClippyNamedStatus;
  setStatus: (status: ClippyNamedStatus) => void;
  isModelLoaded: boolean;
  isLoadingModel: boolean;
  modelError: string | null;
  isChatWindowOpen: boolean;
  setIsChatWindowOpen: (isChatWindowOpen: boolean) => void;
  chatRecords: Record<string, ChatRecord>;
  currentChatRecord: ChatRecord;
  selectChat: (chatId: string) => void;
  startNewChat: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  deleteAllChats: () => Promise<void>;
  loadModel: (initialPrompts?: LanguageModelPrompt[]) => Promise<void>;
  unloadModel: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  streamingMessageContent: string;
  abortMessage: () => void;
  bubbleQueue: BubbleQueueItem[];
  enqueueBubbleMessage: (text: string, mode?: string, duration?: number, animation?: string) => void;
  dismissBubbleItem: (id: string) => void;
  showBubbleMessage: (text: string, mode?: string, duration?: number, animation?: string) => void;
};

export const ChatContext = createContext<ChatContextType | undefined>(
  undefined,
);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatRecord, setCurrentChatRecord] = useState<ChatRecord>({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preview: "",
  });
  const [chatRecords, setChatRecords] = useState<Record<string, ChatRecord>>(
    {},
  );
  const [animationKey, setAnimationKey] = useState<string>("");
  const [status, setStatus] = useState<ClippyNamedStatus>("welcome");
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const { settings, models } = useContext(SharedStateContext);
  const debug = useDebugState();
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const [hasPerformedStartupCheck, setHasPerformedStartupCheck] =
    useState(false);

  const [streamingMessageContent, setStreamingMessageContent] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestUUID = useRef<string>(crypto.randomUUID());

  const getSystemPrompt = useCallback(() => {
    return settings.systemPrompt.replace(
      "[LIST OF ANIMATIONS]",
      ANIMATION_KEYS_BRACKETS.join(", "),
    );
  }, [settings.systemPrompt]);

  const addMessage = useCallback(
    async (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    },
    [currentChatRecord, messages],
  );

  const selectChat = useCallback(
    async (chatId: string) => {
      try {
        const chatWithMessages = await clippyApi.getChatWithMessages(chatId);

        if (chatWithMessages) {
          setMessages(chatWithMessages.messages);
          setCurrentChatRecord(chatWithMessages.chat);
        }

        await loadModel(
          messagesToInitialPrompts(chatWithMessages?.messages || []),
        );
      } catch (error) {
        console.error(error);
      }
    },
    [currentChatRecord, messages],
  );

  const startNewChat = useCallback(async () => {
    // No need if there are no messages, we'll just keep the current chat
    // and update the timestamps
    if (messages.length === 0) {
      setCurrentChatRecord({
        ...currentChatRecord,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return;
    }

    const newChatRecord = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preview: "",
    };

    setCurrentChatRecord(newChatRecord);
    setChatRecords((prevChatRecords) => ({
      ...prevChatRecords,
      [currentChatRecord.id]: currentChatRecord, // Ensure the old one is updated in the list
      [newChatRecord.id]: newChatRecord,
    }));
    setMessages([]);
  }, [currentChatRecord, messages]);

  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const loadModel = useCallback(
    async (initialPrompts: LanguageModelPrompt[] = []) => {
      if (isLoadingModel) return;

      setIsModelLoaded(false);
      setIsLoadingModel(true);
      setModelError(null);

      // Ensure initialPrompts is an array (defensive programming)
      const prompts = Array.isArray(initialPrompts) ? initialPrompts : [];

      const options: LanguageModelCreateOptions = {
        modelAlias: settings.selectedModel,
        systemPrompt: getSystemPrompt(),
        topK: settings.topK,
        temperature: settings.temperature,
        initialPrompts: prompts,
      };

      console.log("Loading model with options:", options);

      try {
        if (settings.useExternalApi) {
          // If using external API, we need to ensure any local model is stopped
          try {
            await electronAi.destroy();
          } catch (e) {
            // ignore
          }

          const provider = settings.externalApiProvider;
          const key = settings.externalApiKey;

          if (!key) {
            throw new Error(
              "External API Key is missing. Please check settings.",
            );
          }

          console.log(`Using External API: ${provider}`);
          setIsModelLoaded(true);
          setStatus("idle");
        } else {
          await electronAi.create(options);
          setIsModelLoaded(true);
          setStatus("idle");
        }
      } catch (error) {
        console.error(error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setModelError(errorMessage);

        addMessage({
          id: crypto.randomUUID(),
          children: <ErrorLoadModelMessageContent error={error} />,
          sender: "clippy",
          createdAt: Date.now(),
        });
      } finally {
        setIsLoadingModel(false);
      }
    },
    [
      isLoadingModel,
      settings.selectedModel,
      settings.systemPrompt,
      settings.topK,
      settings.temperature,
      settings.useExternalApi,
      settings.externalApiProvider,
      settings.externalApiKey,
      messages,
    ],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      await clippyApi.deleteChat(chatId);

      setChatRecords((prevChatRecords) => {
        const newChatRecords = { ...prevChatRecords };
        delete newChatRecords[chatId];
        return newChatRecords;
      });

      if (currentChatRecord.id === chatId) {
        await startNewChat();
      }
    },
    [currentChatRecord.id],
  );

  const deleteAllChats = useCallback(async () => {
    await clippyApi.deleteAllChats();

    setChatRecords({});
    setMessages([]);
    startNewChat();
  }, []);

  // Update the chat record in the database whenever messages change
  useEffect(() => {
    const updatedChatRecord = {
      ...currentChatRecord,
      updatedAt: Date.now(),
      preview: currentChatRecord.preview || getPreviewFromMessages(messages),
    };

    const chatWithMessages = {
      chat: updatedChatRecord,
      messages: messages.map(messageRecordFromMessage),
    };

    setCurrentChatRecord(updatedChatRecord);

    clippyApi.writeChatWithMessages(chatWithMessages).catch((error) => {
      console.error(error);
    });
  }, [messages]);

  // Load the model when the selected model changes
  // or when the system prompt, topK, or temperature change
  // Unload model function
  const unloadModel = useCallback(async () => {
    try {
      // Always try to destroy local model just in case?
      // Or checking if we were in external mode?
      // Safest is to try destroy if not external, or just try destroy and catch error?
      // electron-llm throws if no model loaded?

      // If we are "loaded" but in external mode, we just flip the switch.
      // But if we switched MODES, we might have a local model loaded.

      // Attempt to destroy local model regardless, to be safe.
      try {
        await electronAi.destroy();
      } catch (e) {
        // ignore
      }
      setIsModelLoaded(false);
    } catch (error) {
      console.error("Error unloading model:", error);
    }
  }, []);

  const abortMessage = useCallback(() => {
    electronAi.abortRequest(lastRequestUUID.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setStreamingMessageContent("");
  }, [setStatus]);

  const sendMessage = useCallback(async (message: string) => {
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
          systemPrompt += `\n\nIMPORTANT: You have access to the following animations: ${ANIMATION_KEYS_BRACKETS.join(", ")}. At the end of your response, you MUST include exactly one tag from this list, e.g. "Hello! [Greeting]".`;
        }

        if (!systemPrompt.includes("At the end of your response")) {
          systemPrompt += `\n\nREMINDER: Put the animation tag (e.g. [Greeting]) at the VERY END of your message.`;
        }

        console.log("Final System Prompt for External API:", systemPrompt);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const stream = ExternalLLMService.streamResponse(
          settings.externalApiProvider as ExternalApiProvider,
          settings.externalApiKey,
          settings.externalModelId || "gpt-4o",
          apiMessages,
          systemPrompt,
          controller.signal,
          settings.externalApiCustomBaseUrl,
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
            fullContent += chunk;
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
      } else {
        // --- Local Model Mode ---
        const requestUUID = crypto.randomUUID();
        lastRequestUUID.current = requestUUID;

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
    } finally {
      setStreamingMessageContent("");
      setStatus("idle");
      abortControllerRef.current = null;
    }
  }, [
    status,
    messages,
    addMessage,
    settings.useExternalApi,
    settings.externalApiKey,
    settings.externalApiProvider,
    settings.externalModelId,
    settings.systemPrompt,
    setAnimationKey,
    setStatus,
  ]);

  const prevUseExternalApi = useState(settings.useExternalApi); // Capture initial state
  // We use a ref to track the previous value across renders
  const prevUseExternalRef = useRef(settings.useExternalApi);

  // Load the model when the selected model changes (if autoLoad is enabled)
  useEffect(() => {
    if (debug?.simulateDownload) {
      setIsModelLoaded(true);
      return;
    }

    // Detect explicit toggle of External API
    if (prevUseExternalRef.current !== settings.useExternalApi) {
      prevUseExternalRef.current = settings.useExternalApi;

      if (settings.useExternalApi) {
        loadModel();
      } else if (settings.modelAutoLoad) {
        loadModel();
      } else {
        // If switching back to local and autoload is off, unload everything
        electronAi.destroy().catch(() => {});
        setIsModelLoaded(false);
      }
      return;
    }

    // If external API is enabled, always try to "load" (validate) it.
    // External APIs don't consume significant local resources, so we can always enable them if configured.
    if (settings.useExternalApi) {
      loadModel();
      return;
    }

    // Only auto-load if modelAutoLoad is enabled
    if (settings.modelAutoLoad && settings.selectedModel) {
      loadModel();
    } else if (!settings.selectedModel && isModelLoaded) {
      electronAi
        .destroy()
        .then(() => {
          setIsModelLoaded(false);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, [
    settings.modelAutoLoad,
    settings.selectedModel,
    settings.systemPrompt,
    settings.topK,
    settings.temperature,
    settings.useExternalApi,
    settings.externalApiKey,
  ]);

  // If selectedModel is undefined or not available, set it to the first downloaded model
  useEffect(() => {
    if (
      !settings.selectedModel ||
      !models[settings.selectedModel] ||
      !models[settings.selectedModel].downloaded
    ) {
      const downloadedModel = Object.values(models).find(
        (model) => model.downloaded,
      );

      if (downloadedModel) {
        clippyApi.setState("settings.selectedModel", downloadedModel.name);
      }
    }
  }, [models]);

  // At app startup, initially load the chat records from the main process
  useEffect(() => {
    clippyApi.getChatRecords().then((chatRecords) => {
      setChatRecords(chatRecords);
    });
  }, []);

  // At app startup, check if any models are ready. If none are, kick off a download
  // for our smallest model and tell the user about it.
  useEffect(() => {
    if (
      messages.length > 0 ||
      Object.keys(models).length === 0 ||
      areAnyModelsReadyOrDownloading(models)
    ) {
      return;
    }

    if (hasPerformedStartupCheck) {
      return;
    }

    setHasPerformedStartupCheck(true);

    addMessage({
      id: crypto.randomUUID(),
      children: <WelcomeMessageContent />,
      content: "Welcome to Clippy!",
      sender: "clippy",
      createdAt: Date.now(),
    });

    const downloadModelIfNoneReady = async () => {
      await clippyApi.downloadModelByName("Gemma 3 (1B)");

      setTimeout(async () => {
        await clippyApi.updateModelState();
      }, 500);
    };

    void downloadModelIfNoneReady();
  }, [models]);

  // Subscribe to the main process's newChat event
  useEffect(() => {
    clippyApi.offNewChat();
    clippyApi.onNewChat(async () => {
      await startNewChat();
    });

    return () => {
      clippyApi.offNewChat();
    };
  }, [startNewChat]);

  // Subscribe to load/unload model events from menu
  useEffect(() => {
    clippyApi.offLoadModel();
    clippyApi.onLoadModel(() => {
      loadModel();
    });

    clippyApi.offUnloadModel();
    clippyApi.onUnloadModel(() => {
      unloadModel();
    });

    return () => {
      clippyApi.offLoadModel();
      clippyApi.offUnloadModel();
    };
  }, [loadModel, unloadModel]);

  // Handle show/toggle events from main process (menu/shortcuts)
  useEffect(() => {
    clippyApi.offShowChatWindow();
    clippyApi.onShowChatWindow(() => {
      setIsChatWindowOpen(true);
    });

    clippyApi.offToggleChatWindow();
    clippyApi.onToggleChatWindow(() => {
      setIsChatWindowOpen((prev) => !prev);
    });

    return () => {
      clippyApi.offShowChatWindow();
      clippyApi.offToggleChatWindow();
    };
  }, []);

  const [bubbleQueue, setBubbleQueue] = useState<BubbleQueueItem[]>([]);

  const enqueueBubbleMessage = useCallback((text: string, mode = "custom", duration = 8, animation?: string) => {
    const id = crypto.randomUUID();
    setBubbleQueue(prev => [...prev, { id, text, mode, duration, animation }]);
  }, []);

  const dismissBubbleItem = useCallback((id: string) => {
    setBubbleQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const showBubbleMessage = useCallback((text: string, mode = "custom", duration = 8, animation?: string) => {
    enqueueBubbleMessage(text, mode, duration, animation);
  }, [enqueueBubbleMessage]);

  const value = {
    chatRecords,
    currentChatRecord,
    selectChat,
    deleteChat,
    deleteAllChats,
    startNewChat,
    messages,
    addMessage,
    setMessages,
    animationKey,
    setAnimationKey,
    status,
    setStatus,
    isModelLoaded,
    isLoadingModel,
    modelError,
    isChatWindowOpen,
    setIsChatWindowOpen,
    loadModel,
    unloadModel,
    sendMessage,
    streamingMessageContent,
    abortMessage,
    bubbleQueue,
    enqueueBubbleMessage,
    dismissBubbleItem,
    showBubbleMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }

  return context;
}

function messageRecordFromMessage(message: Message): MessageRecord {
  return {
    id: message.id,
    content: message.content,
    sender: message.sender,
    createdAt: message.createdAt,
  };
}

function getPreviewFromMessages(messages: Message[]): string {
  if (messages.length === 0) {
    return "";
  }

  if (messages[0].sender === "clippy") {
    return "Welcome to Clippy!";
  }

  // Remove newlines and limit to 100 characters
  return messages[0].content.replace(/\n/g, " ").substring(0, 100);
}

function messagesToInitialPrompts(messages: Message[]): LanguageModelPrompt[] {
  return messages.map((message) => ({
    role:
      message.sender === "clippy"
        ? ("assistant" as LanguageModelPromptRole)
        : ("user" as LanguageModelPromptRole),
    type: "text" as LanguageModelPromptType,
    content: message.content || "",
  }));
}

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
