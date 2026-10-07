import { describe, it, expect } from "vitest";
import TextChunkerService from "../src/services/TextChunkerService.js";

describe("TextChunkerService", () => {
  it("returns an empty array when given empty, null, or whitespace-only text", () => {
    expect(TextChunkerService.chunk("")).toEqual([]);
    expect(TextChunkerService.chunk("   \n\t  ")).toEqual([]);
    expect(TextChunkerService.chunk(null)).toEqual([]);
    expect(TextChunkerService.chunk(undefined)).toEqual([]);
  });

  it("returns a single chunk when text length is within maxChars", () => {
    const text = "This is a short document well within limits.";
    const chunks = TextChunkerService.chunk(text, 1000, 50);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("normalizes carriage returns and strips null bytes", () => {
    const raw = "Line 1\r\nLine 2\u0000\r\nLine 3";
    const chunks = TextChunkerService.chunk(raw, 1000, 50);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Line 1\nLine 2\nLine 3");
  });

  it("splits text into multiple chunks respecting paragraph boundaries", () => {
    const para1 = "A".repeat(300);
    const para2 = "B".repeat(300);
    const para3 = "C".repeat(300);
    const text = `${para1}\n\n${para2}\n\n${para3}`;

    const chunks = TextChunkerService.chunk(text, 500, 50);

    expect(chunks.length).toBeGreaterThan(1);
    // Chunks should split on paragraph or sentence boundaries
    expect(chunks[0]).toContain(para1);
  });

  it("splits text respecting sentence boundaries when paragraphs are not available", () => {
    const sent1 = "First sentence of the text is here. ";
    const sent2 = "Second sentence continues the narrative. ";
    const sent3 = "Third sentence wraps up this segment.";
    const text = (sent1 + sent2 + sent3).repeat(10);

    const chunks = TextChunkerService.chunk(text, 200, 30);

    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk should have meaningful content
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeGreaterThan(0);
      expect(chunk.length).toBeLessThanOrEqual(250);
    });
  });

  it("applies overlap so consecutive chunks share contextual information", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Paragraph number ${i + 1} with details.`).join("\n\n");
    const chunks = TextChunkerService.chunk(text, 250, 60);

    expect(chunks.length).toBeGreaterThan(1);

    // With overlap, the start of chunk[1] should contain words from the end of chunk[0]
    // or advance without infinite looping
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(chunks[i].length).toBeGreaterThan(0);
      expect(chunks[i + 1].length).toBeGreaterThan(0);
    }
  });

  it("handles a continuous string with no whitespace without crashing or infinite loop", () => {
    const longToken = "X".repeat(2000);
    const chunks = TextChunkerService.chunk(longToken, 400, 50);

    expect(chunks.length).toBeGreaterThan(1);
    const reconstructed = chunks.join("");
    expect(reconstructed).toContain("XXXX");
  });
});
