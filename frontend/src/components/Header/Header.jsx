
export function Header({
  selectedModel,
  setSelectedModel,
  mode,
  setMode,
  webAccess,
  setWebAccess,
  loading,
  clearChat,
}) {
  return (
    <header className="header">
      <div className="brand-cluster">
        <div className="brand-title-row">
          <h1 className="brand-title">Atrael</h1>
          <div className="devil-emblem" aria-hidden="true">
            <img
              src="/Atrael-Icon.png"
              alt="Atrael Emblem"
              className="devil-mask-img"
            />
          </div>
        </div>

        <div className="local-status">
          <span className="status-dot" />
          <span className="status-label">LOCAL AI</span>
          <svg
            className="heartbeat-line"
            viewBox="0 0 54 14"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 7 L16 7 L19 2 L23 13 L26 4 L29 9 L32 7 L54 7"
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.6"
            />
          </svg>
        </div>
      </div>

      <div className="header-right">
        {/* MODEL TOGGLE */}
        <button
          type="button"
          className={`tactical-button model-button clear-button ${selectedModel}`}
          onClick={() =>
            setSelectedModel((current) =>
              current === "local" ? "atrael" : "local"
            )
          }
          disabled={loading}
          aria-label={
            selectedModel === "local"
              ? "LOCAL · Qwen 3.5 4B · click to switch to Atrael"
              : "ATRAEL · Qwen 27B · click to switch to Local"
          }
          title={
            selectedModel === "local"
              ? "Qwen 3.5 4B · click to switch to Atrael"
              : "Qwen 27B Uncensored · click to switch to Local"
          }
        >
          <span
            className={`button-led ${
              selectedModel === "local" ? "led-blue" : "led-red"
            }`}
          />
          <span className="button-text">
            {selectedModel === "local" ? "LOCAL" : "ATRAEL"}
          </span>
        </button>

        {/* MODE TOGGLE */}
        <button
          type="button"
          className="tactical-button mode-button clear-button"
          onClick={() =>
            setMode((current) => (current === "fast" ? "quality" : "fast"))
          }
          disabled={loading}
          aria-label={
            mode === "fast"
              ? "FAST · 16K · instant · click for Quality"
              : "QUALITY · 32K · reasoning · click for Fast"
          }
          title={
            mode === "fast"
              ? "16K · instant · click for Quality"
              : "32K · reasoning · click for Fast"
          }
        >
          <span className="button-glyph">⚡</span>
          <span className="button-text">
            {mode === "fast" ? "FAST" : "QUALITY"}
          </span>
        </button>

        {/* WEB */}
        <button
          type="button"
          className={`tactical-button web-button clear-button ${
            webAccess ? "active" : ""
          }`}
          onClick={() => setWebAccess((current) => !current)}
          disabled={loading}
          aria-pressed={webAccess}
          title={webAccess ? "Internet search enabled" : "Local only"}
        >
          <span className="button-glyph">{webAccess ? "🌐" : "🔒"}</span>
          <span className="button-text">
            {webAccess ? "WEB ON" : "WEB OFF"}
          </span>
        </button>

        {/* CLEAR */}
        <button
          type="button"
          className="tactical-button clear-button clear-chat-btn"
          onClick={clearChat}
          disabled={loading}
          aria-label="Clear Chat"
        >
          <span className="button-glyph" aria-hidden="true">
            🗑
          </span>
          <span className="button-text">Clear Chat</span>
        </button>
      </div>
    </header>
  );
}
