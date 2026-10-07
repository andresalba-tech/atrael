const MODELS = {
  local: {
    id: "local",
    label: "LOCAL",
    model: "qwen3.5:4b",
  },
  atrael: {
    id: "atrael",
    label: "ATRAEL",
    model: "tinyrick/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF:Q4_K_P",
  },
};

const MODES = {
  fast: {
    label: "FAST",
    think: false,
    numCtx: 16384,
    temperature: 0.4,
  },
  quality: {
    label: "QUALITY",
    think: true,
    numCtx: 32768,
    temperature: 0.3,
  },
};

function resolveModel(modelKey) {
  return MODELS[modelKey] || MODELS.local;
}

function resolveMode(modeKey) {
  return MODES[modeKey] || MODES.fast;
}

module.exports = {
  MODELS,
  MODES,
  resolveModel,
  resolveMode,
};
