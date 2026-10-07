import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAssistantName } from "../../config/models";

export function ChatMessage({
  message,
  index,
  speakingMessage,
  onReadAloud,
  onStopReading,
  loading,
}) {
  const isSpeaking = speakingMessage === index;

  return (
    <div className={`message ${message.role}`}>
      {/* ROLE */}
      <div className="role">
        {message.role === "user"
          ? "You"
          : getAssistantName(message.model)}

        {message.role === "assistant" && message.webUsed && (
          <span className="web-badge">🌐 WEB</span>
        )}
      </div>

      {/* CONTENT */}
      <div className="content">
        {message.documentName && (
          <div className="message-document">📄 {message.documentName}</div>
        )}

        {/* READ ALOUD */}
        {message.role === "assistant" && message.content && (
          <div className="message-actions">
            {isSpeaking ? (
              <button
                className="read-aloud-button active"
                onClick={onStopReading}
              >
                ■ Stop
              </button>
            ) : (
              <button
                className="read-aloud-button"
                onClick={() => onReadAloud(message.content, index)}
              >
                🔊 Read aloud
              </button>
            )}
          </div>
        )}

        {/* IMAGE IN MESSAGE */}
        {message.imagePreview && (
          <div className="message-image-container">
            <img
              src={message.imagePreview}
              alt="Uploaded"
              className="message-image"
            />
          </div>
        )}

        {/* MESSAGE TEXT */}
        {message.role === "assistant" ? (
          message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children, ...rest }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...rest}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : loading ? (
            <span className="thinking-dot">●</span>
          ) : null
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}
