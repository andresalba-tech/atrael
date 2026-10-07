import { describe, it, expect, vi } from "vitest";
import { readNdjsonStream } from "../services/streamReader";

function createMockStreamResponse(chunks) {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    body: {
      getReader: () => ({
        read: async () => {
          if (index < chunks.length) {
            const value = encoder.encode(chunks[index++]);
            return { value, done: false };
          }
          return { value: undefined, done: true };
        },
      }),
    },
  };
}

describe("streamReader", () => {
  it("dispatches tokens, thinking, progress, web and stats callbacks", async () => {
    const chunks = [
      JSON.stringify({ type: "thinking", content: "Reasoning..." }) + "\n",
      JSON.stringify({ type: "token", content: "Hello " }) + "\n",
      JSON.stringify({ type: "token", content: "world!" }) + "\n",
      JSON.stringify({ type: "progress", stage: "analyzing", current: 1, total: 2 }) + "\n",
      JSON.stringify({ type: "web", used: true }) + "\n",
      JSON.stringify({ type: "stats", tokensPerSecond: 45.2 }) + "\n",
    ];

    const response = createMockStreamResponse(chunks);
    const onThinking = vi.fn();
    const onToken = vi.fn();
    const onProgress = vi.fn();
    const onWebUsed = vi.fn();
    const onStats = vi.fn();

    await readNdjsonStream(response, {
      onThinking,
      onToken,
      onProgress,
      onWebUsed,
      onStats,
    });

    expect(onThinking).toHaveBeenCalledWith("Reasoning...");
    expect(onToken).toHaveBeenCalledWith("Hello ");
    expect(onToken).toHaveBeenCalledWith("world!");
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "analyzing" })
    );
    expect(onWebUsed).toHaveBeenCalled();
    expect(onStats).toHaveBeenCalledWith(
      expect.objectContaining({ tokensPerSecond: 45.2 })
    );
  });

  it("handles fragmented stream packets split across newlines correctly", async () => {
    // A single JSON line split across 3 stream packets
    const part1 = '{"type":"to';
    const part2 = 'ken","content"';
    const part3 = ':"assembled!"}\n';

    const response = createMockStreamResponse([part1, part2, part3]);
    const onToken = vi.fn();

    await readNdjsonStream(response, { onToken });

    expect(onToken).toHaveBeenCalledWith("assembled!");
  });

  it("throws an error when receiving a type error chunk", async () => {
    const chunks = [
      JSON.stringify({ type: "error", message: "Ollama out of memory" }) + "\n",
    ];

    const response = createMockStreamResponse(chunks);

    await expect(readNdjsonStream(response, {})).rejects.toThrow(
      "Ollama out of memory"
    );
  });

  it("processes final line remaining in buffer without trailing newline", async () => {
    // No trailing \n on last packet
    const chunks = [
      JSON.stringify({ type: "token", content: "final chunk without newline" }),
    ];

    const response = createMockStreamResponse(chunks);
    const onToken = vi.fn();

    await readNdjsonStream(response, { onToken });

    expect(onToken).toHaveBeenCalledWith("final chunk without newline");
  });
});
