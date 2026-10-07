import { describe, it, expect, vi } from "vitest";
import ReductionService from "../src/services/ReductionService.js";

describe("ReductionService", () => {
  const mockLLM = {
    chat: vi.fn(),
  };
  const mockPromptService = {
    getDocumentSystemPrompt: vi.fn().mockReturnValue("SYSTEM PROMPT"),
  };

  const createService = () => new ReductionService(mockLLM, mockPromptService);

  describe("calculateTotalLength", () => {
    it("returns 0 for empty or non-array inputs", () => {
      const service = createService();
      expect(service.calculateTotalLength([])).toBe(0);
      expect(service.calculateTotalLength(null)).toBe(0);
      expect(service.calculateTotalLength(undefined)).toBe(0);
    });

    it("calculates length including separator characters accurately", () => {
      const service = createService();
      // ["abc", "def"] with separator length 2 ("\n\n"): 3 + 3 + 2 = 8
      expect(service.calculateTotalLength(["abc", "def"], 2)).toBe(8);
      // single item: length 5
      expect(service.calculateTotalLength(["hello"], 2)).toBe(5);
    });
  });

  describe("groupByCharacterLimit", () => {
    it("groups items without exceeding max character threshold", () => {
      const service = createService();
      const items = ["Item A ".repeat(10), "Item B ".repeat(10), "Item C ".repeat(10)];
      const groups = service.groupByCharacterLimit(items, 150);

      expect(groups.length).toBeGreaterThanOrEqual(2);
      groups.forEach((group) => {
        const total = service.calculateTotalLength(group);
        expect(total).toBeLessThanOrEqual(200);
      });
    });

    it("returns empty array for empty items", () => {
      const service = createService();
      expect(service.groupByCharacterLimit([])).toEqual([]);
    });
  });

  describe("formatConversationContext", () => {
    it("returns empty string for empty or non-array messages", () => {
      const service = createService();
      expect(service.formatConversationContext([])).toBe("");
      expect(service.formatConversationContext(null)).toBe("");
    });

    it("filters out invalid roles and formats valid conversation turns", () => {
      const service = createService();
      const messages = [
        { role: "system", content: "ignore" },
        { role: "user", content: "What is Atrael?" },
        { role: "assistant", content: "Atrael is a local AI." },
        { role: "unknown", content: "ignore" },
      ];

      const context = service.formatConversationContext(messages);
      expect(context).toContain("[USER]\nWhat is Atrael?");
      expect(context).toContain("[ASSISTANT]\nAtrael is a local AI.");
      expect(context).not.toContain("ignore");
    });

    it("truncates older messages when total exceeds maxChars", () => {
      const service = createService();
      const messages = [
        { role: "user", content: "Old message ".repeat(50) },
        { role: "assistant", content: "Recent response" },
      ];

      const context = service.formatConversationContext(messages, 100);
      expect(context).toContain("Recent response");
    });
  });

  describe("reduceFindings", () => {
    it("returns findings directly when total length is under 8500 chars (0 LLM calls)", async () => {
      const service = createService();
      mockLLM.chat.mockReset();

      const findings = ["Finding 1: Some evidence.", "Finding 2: Another fact."];
      const sendProgress = vi.fn();

      const result = await service.reduceFindings({
        model: "test-model",
        findings,
        instruction: "Analyze document",
        conversationContext: "",
        signal: null,
        sendProgress,
      });

      expect(mockLLM.chat).not.toHaveBeenCalled();
      expect(result).toBe("Finding 1: Some evidence.\n\nFinding 2: Another fact.");
    });

    it("executes reduction rounds when findings exceed 8500 chars", async () => {
      const service = createService();
      mockLLM.chat.mockReset();
      mockLLM.chat.mockResolvedValue("Consolidated summary of this chunk group.");

      // Create findings totaling > 8500 chars
      const findings = Array.from({ length: 15 }, (_, i) => `Finding ${i + 1}: ${"Long evidence piece. ".repeat(40)}`);
      const sendProgress = vi.fn();

      const result = await service.reduceFindings({
        model: "test-model",
        findings,
        instruction: "Summarize findings",
        conversationContext: "Context",
        signal: null,
        sendProgress,
      });

      expect(mockLLM.chat).toHaveBeenCalled();
      expect(sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: "consolidating",
          round: 1,
        })
      );
      expect(result).toContain("REDUCTION ROUND");
    });
  });
});
