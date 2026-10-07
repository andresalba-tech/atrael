import { ChatMessage } from "./ChatMessage";

export function ChatArea({
  messages,
  loading,
  thinking,
  speakingMessage,
  onReadAloud,
  onStopReading,
  bottomRef,
}) {
  return (
    <section className="chat">
      {messages.length === 0 && (
        <div className="empty cyber-empty">
          <div className="cyber-glow-orb" aria-hidden="true" />
          <h2 className="cyber-heading">Ask anything</h2>
          <p className="cyber-subtext">
            Chat, images, documents and spreadsheets.
          </p>
          <span className="privacy cyber-privacy">● 100% local</span>
        </div>
      )}

      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          message={message}
          index={index}
          speakingMessage={speakingMessage}
          onReadAloud={onReadAloud}
          onStopReading={onStopReading}
          loading={loading}
        />
      ))}

      {/* THINKING */}
      {loading && thinking && (
        <details className="thinking-panel">
          <summary>Model reasoning</summary>
          <div className="thinking-content">{thinking}</div>
        </details>
      )}

      <div ref={bottomRef} />
    </section>
  );
}
