import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Atrael Unhandled Error Caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#0b0f14",
            color: "#e2e8f0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "Rajdhani, system-ui, sans-serif",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              width: "100%",
              backgroundColor: "#111822",
              border: "1px solid #ff2a55",
              boxShadow: "0 0 30px rgba(255, 42, 85, 0.25)",
              borderRadius: "8px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "Orbitron, sans-serif",
                color: "#ff2a55",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "2px",
                marginBottom: "12px",
              }}
            >
              ATRAEL // DIAGNOSTIC NOTICE
            </div>

            <p style={{ color: "#94a3b8", fontSize: "16px", marginBottom: "20px", lineHeight: "1.5" }}>
              The application encountered an unexpected runtime state. Your conversations and data are backed up and safe.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: "#070a0f",
                  border: "1px solid #1e293b",
                  borderRadius: "6px",
                  padding: "16px",
                  color: "#f87171",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  textAlign: "left",
                  maxHeight: "160px",
                  overflowY: "auto",
                  marginBottom: "24px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                backgroundColor: "#ff2a55",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "12px 28px",
                fontSize: "15px",
                fontWeight: 600,
                fontFamily: "Orbitron, sans-serif",
                letterSpacing: "1px",
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(255, 42, 85, 0.4)",
              }}
            >
              RELOAD ATRAEL
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
