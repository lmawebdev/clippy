import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { useChat } from "../contexts/ChatContext";
import { VintageSpinner } from "./Spinner95";

export type ChatProps = {
  style?: React.CSSProperties;
};

export function Chat({ style }: ChatProps) {
  const {
    status,
    messages,
    sendMessage,
    streamingMessageContent,
    abortMessage,
  } = useChat();

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
      <ChatInput onSend={sendMessage} onAbort={abortMessage} />
    </div>
  );
}
