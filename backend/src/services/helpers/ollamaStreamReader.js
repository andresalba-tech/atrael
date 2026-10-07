/**
 * Helper para consumir streams NDJSON emitidos por Ollama y calcular métricas de telemetría.
 * Cumple con DRY unificando el loop de lectura y las fórmulas de velocidad de tokens.
 */
async function consumeOllamaStream(ollamaResponse, onLine) {
  const reader = ollamaResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processLine = (line) => {
    if (!line.trim()) return;
    const data = JSON.parse(line);
    onLine(data);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer.trim()) {
    processLine(buffer);
  }
}

function calculateOllamaStats(data) {
  const evalSeconds =
    data.eval_duration > 0 ? data.eval_duration / 1_000_000_000 : 0;

  const promptSeconds =
    data.prompt_eval_duration > 0
      ? data.prompt_eval_duration / 1_000_000_000
      : 0;

  const tokensPerSecond =
    evalSeconds > 0 ? data.eval_count / evalSeconds : 0;

  const promptTokensPerSecond =
    promptSeconds > 0 ? data.prompt_eval_count / promptSeconds : 0;

  return {
    evalSeconds,
    promptSeconds,
    tokensPerSecond,
    promptTokensPerSecond,
  };
}

module.exports = {
  consumeOllamaStream,
  calculateOllamaStats,
};
