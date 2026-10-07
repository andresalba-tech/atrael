/**
 * Servicio de reducción jerárquica y preparación de contexto de conversación.
 * Cumple con SRP y DIP.
 */
class ReductionService {
  /**
   * @param {import('../domain/interfaces/ILLMProvider')} llmProvider
   * @param {import('./PromptService')} promptService
   */
  constructor(llmProvider, promptService) {
    this.llmProvider = llmProvider;
    this.promptService = promptService;
  }

  groupByCharacterLimit(items, maxChars = 8500) {
    const groups = [];
    let current = "";
    let currentItems = [];

    for (const item of items) {
      if (current.length + item.length > maxChars && currentItems.length > 0) {
        groups.push(currentItems);
        current = "";
        currentItems = [];
      }

      currentItems.push(item);
      current += "\n\n" + item;
    }

    if (currentItems.length > 0) {
      groups.push(currentItems);
    }

    return groups;
  }

  formatConversationContext(messages = [], maxChars = 6000) {
    if (!Array.isArray(messages)) {
      return "";
    }

    const validMessages = messages
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim()
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    const selected = [];
    let usedChars = 0;

    for (let i = validMessages.length - 1; i >= 0; i--) {
      const message = validMessages[i];
      const entry = `[${message.role.toUpperCase()}]\n` + message.content;

      if (selected.length > 0 && usedChars + entry.length > maxChars) {
        break;
      }

      if (selected.length === 0 && entry.length > maxChars) {
        selected.unshift(entry.slice(entry.length - maxChars));
        break;
      }

      selected.unshift(entry);
      usedChars += entry.length + 2;
    }

    return selected.join("\n\n");
  }

  calculateTotalLength(items, separatorLength = 2) {
    if (!items || items.length === 0) return 0;
    return (
      items.reduce((acc, item) => acc + (item ? item.length : 0), 0) +
      Math.max(0, items.length - 1) * separatorLength
    );
  }

  async reduceFindings({
    model,
    findings,
    instruction,
    conversationContext,
    signal,
    sendProgress,
  }) {
    let items = findings.filter(Boolean);
    let round = 1;

    while (this.calculateTotalLength(items) > 8500) {
      const groups = this.groupByCharacterLimit(items, 8000);
      const nextRound = [];

      for (let i = 0; i < groups.length; i++) {
        sendProgress({
          stage: "consolidating",
          round,
          current: i + 1,
          total: groups.length,
        });

        const material = groups[i].join("\n\n");
        const summary = await this.llmProvider.chat({
          model,
          signal,
          numCtx: 4096,
          think: false,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: this.promptService.getDocumentSystemPrompt(model),
            },
            {
              role: "user",
              content: `
PREVIOUS CONVERSATION CONTEXT:

${conversationContext || "No previous conversation context."}

The user's original task is:

${instruction}

Below are findings generated from multiple sections of the document.

Compress and consolidate them so they can be passed to another analysis stage.

IMPORTANT:
- Do not invent anything.
- Do not discard findings relevant to the user's task.
- Preserve PAGE, SHEET, ROW and CHUNK references.
- Merge duplicates.
- Preserve disagreements and contradictions.
- Keep the output concise.

FINDINGS:

${material}
`,
            },
          ],
        });

        nextRound.push(`[REDUCTION ROUND ${round} GROUP ${i + 1}]\n${summary}`);
      }

      items = nextRound;
      round++;
    }

    return items.join("\n\n");
  }
}

module.exports = ReductionService;
