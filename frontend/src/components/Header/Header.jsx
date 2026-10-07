import { AVAILABLE_MODELS, AVAILABLE_MODES } from "../../config/models";

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
        {/* MODEL SELECTORS */}
        {Object.values(AVAILABLE_MODELS).map((modelItem) => (
          <button
            key={modelItem.id}
            type="button"
            className={`tactical-button model-button clear-button ${
              selectedModel === modelItem.id ? "active" : ""
            }`}
            onClick={() => setSelectedModel(modelItem.id)}
            disabled={loading}
            aria-label={modelItem.ariaLabel}
            title={modelItem.title}
          >
            <span className={`button-led ${modelItem.ledClass}`} />
            <span className="button-text">{modelItem.buttonText}</span>
          </button>
        ))}

        {/* MODE SELECTORS */}
        {Object.values(AVAILABLE_MODES).map((modeItem) => (
          <button
            key={modeItem.id}
            type="button"
            className={`tactical-button mode-button clear-button ${
              mode === modeItem.id ? "active" : ""
            }`}
            onClick={() => setMode(modeItem.id)}
            disabled={loading}
            aria-label={modeItem.ariaLabel}
            title={modeItem.title}
          >
            <span className="button-glyph">⚡</span>
            <span className="button-text">{modeItem.buttonText}</span>
          </button>
        ))}

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
