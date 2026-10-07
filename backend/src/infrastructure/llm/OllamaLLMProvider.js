const ILLMProvider = require("../../domain/interfaces/ILLMProvider");
const { OLLAMA_URL, OLLAMA_NUM_THREAD, DEFAULT_MODEL } = require("../../config/env");

/**
 * Proveedor concreto de LLM para Ollama local.
 * Cumple con DIP e ISP.
 */
class OllamaLLMProvider extends ILLMProvider {
  constructor(baseUrl = OLLAMA_URL, numThread = OLLAMA_NUM_THREAD) {
    super();
    this.baseUrl = baseUrl;
    this.numThread = numThread;
  }

  async getTags() {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error("Ollama is not responding");
    }
    return response.json();
  }

  async chat({
    model = DEFAULT_MODEL,
    messages,
    signal,
    numCtx = 4096,
    think = false,
    temperature = 0.2,
  }) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        think,
        keep_alive: "30m",
        options: {
          num_ctx: numCtx,
          temperature,
          num_thread: this.numThread,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = await response.json();
    return data.message?.content || "";
  }

  async streamChat({
    model,
    messages,
    signal,
    think = false,
    numCtx = 16384,
    temperature = 0.4,
    keepAlive = "30m",
  }) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        think,
        keep_alive: keepAlive,
        options: {
          num_ctx: numCtx,
          temperature,
          num_predict: -1,
          num_thread: this.numThread,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    return response;
  }
}

module.exports = OllamaLLMProvider;
