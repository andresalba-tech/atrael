export const AVAILABLE_MODELS = {
  local: {
    id: "local",
    assistantName: "Qwen",
    buttonText: "LOCAL",
    ariaLabel: "LOCAL · Qwen 3.5 4B",
    title: "Qwen 3.5 4B",
    ledClass: "led-blue",
  },
  atrael: {
    id: "atrael",
    assistantName: "Atrael",
    buttonText: "ATRAEL",
    ariaLabel: "ATRAEL · Qwen 27B",
    title: "Qwen 27B Uncensored",
    ledClass: "led-red",
  },
};

export const AVAILABLE_MODES = {
  fast: {
    id: "fast",
    buttonText: "FAST",
    ariaLabel: "FAST · 16K · instant",
    title: "16K · instant",
    placeholder: "Ask Atrael — FAST...",
  },
  quality: {
    id: "quality",
    buttonText: "QUALITY",
    ariaLabel: "QUALITY · 32K · reasoning",
    title: "32K · reasoning",
    placeholder: "Ask Atrael — QUALITY...",
  },
};

export const DEFAULT_MODEL = "local";
export const DEFAULT_MODE = "fast";

export function getAssistantName(modelId) {
  return AVAILABLE_MODELS[modelId]?.assistantName || AVAILABLE_MODELS.local.assistantName;
}

export function getModePlaceholder(modeId) {
  return AVAILABLE_MODES[modeId]?.placeholder || AVAILABLE_MODES.fast.placeholder;
}
