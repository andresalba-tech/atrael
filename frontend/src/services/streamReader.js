/**
 * Parses NDJSON stream from a Response object and triggers appropriate callbacks.
 */
export async function readNdjsonStream(
  response,
  { onToken, onThinking, onProgress, onWebUsed, onStats } = {}
) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processLine = (line) => {
    if (!line.trim()) return;

    const data = JSON.parse(line);

    if (data.type === "thinking") {
      onThinking?.(data.content);
    } else if (data.type === "token") {
      onToken?.(data.content);
    } else if (data.type === "progress") {
      onProgress?.(data);
    } else if (data.type === "web" && data.used) {
      onWebUsed?.();
    } else if (data.type === "stats") {
      onStats?.(data);
    } else if (data.type === "error") {
      throw new Error(data.message);
    }
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
