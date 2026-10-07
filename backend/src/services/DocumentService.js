const fs = require("fs");
const crypto = require("crypto");
const TextChunkerService = require("./TextChunkerService");
const {
  consumeOllamaStream,
  calculateOllamaStats,
} = require("./helpers/ollamaStreamReader");

/**
 * Servicio de procesamiento y análisis de documentos.
 * Cumple con SRP, OCP y DIP.
 */
class DocumentService {
  /**
   * @param {import('../domain/interfaces/IDocumentStore')} documentStore
   * @param {import('../infrastructure/parsers/DocumentParserRegistry')} parserRegistry
   * @param {import('../domain/interfaces/ILLMProvider')} llmProvider
   * @param {import('./PromptService')} promptService
   * @param {import('./ReductionService')} reductionService
   * @param {import('./WebSearchService')} webSearchService
   */
  constructor(
    documentStore,
    parserRegistry,
    llmProvider,
    promptService,
    reductionService,
    webSearchService
  ) {
    this.documentStore = documentStore;
    this.parserRegistry = parserRegistry;
    this.llmProvider = llmProvider;
    this.promptService = promptService;
    this.reductionService = reductionService;
    this.webSearchService = webSearchService;
  }

  async processUpload(file) {
    const filePath = file.path;

    try {
      const extracted = await this.parserRegistry.extractFile(
        filePath,
        file.originalname
      );

      const text = extracted.text.trim();

      if (!text) {
        throw new Error("No readable text was found in this file.");
      }

      const chunks = TextChunkerService.chunk(text);
      const id = crypto.randomUUID();
      const words = text.split(/\s+/).filter(Boolean).length;

      const document = {
        id,
        name: file.originalname,
        mimeType: file.mimetype,
        type: extracted.type,
        text,
        chunks,
        words,
        chars: text.length,
        metadata: extracted.metadata,
        createdAt: Date.now(),
      };

      this.documentStore.set(id, document);

      await fs.promises.unlink(filePath).catch(() => {});

      return {
        ok: true,
        documentId: id,
        name: document.name,
        type: document.type,
        words: document.words,
        chars: document.chars,
        chunks: document.chunks.length,
        metadata: document.metadata,
      };
    } catch (error) {
      await fs.promises.unlink(filePath).catch(() => {});
      throw error;
    }
  }

  deleteDocument(documentId) {
    return this.documentStore.delete(documentId);
  }

  getDocument(documentId) {
    return this.documentStore.get(documentId);
  }

  async analyzeDocument({
    documentId,
    instruction,
    messages = [],
    modeConfig,
    modelConfig,
    webAccess = false,
    send,
    sendProgress,
    signal,
  }) {
    const document = this.getDocument(documentId);
    if (!document) {
      throw new Error("Document not found. Upload it again.");
    }

    if (!instruction || !instruction.trim()) {
      throw new Error("An instruction is required.");
    }

    const conversationContext =
      this.reductionService.formatConversationContext(messages);

    const analysisStart = performance.now();
    const findings = [];
    let webContext = "";

    if (webAccess) {
      const webMessages = [
        ...(Array.isArray(messages) ? messages : []),
        { role: "user", content: instruction },
      ];

      const searchResult = await this.webSearchService.getWebSearchContext({
        messages: webMessages,
        queryContextText: instruction,
        fallbackPurpose: "document",
      });

      webContext = searchResult.context;
      if (searchResult.used) {
        send({
          type: "web",
          used: true,
        });
      }
    }

    // MAP: Analizar cada chunk
    for (let i = 0; i < document.chunks.length; i++) {
      sendProgress({
        stage: "analyzing",
        current: i + 1,
        total: document.chunks.length,
        percent: Math.round(((i + 1) / document.chunks.length) * 100),
      });

      const chunk = document.chunks[i];
      const result = await this.llmProvider.chat({
        model: modelConfig.model,
        signal,
        numCtx: 4096,
        think: false,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: this.promptService.getDocumentSystemPrompt(modelConfig.model),
          },
          {
            role: "user",
            content: `
PREVIOUS CONVERSATION CONTEXT:

${conversationContext || "No previous conversation context."}

IMPORTANT:

The previous conversation is context for understanding references
in the current task such as "the second one", "that point",
"explain it", or similar follow-up language.

Document facts must still come from the supplied document material.

USER TASK:

${instruction}

DOCUMENT:
${document.name}

CHUNK:
${i + 1} of ${document.chunks.length}

Analyze ONLY this chunk for information that helps answer the user's task.

Requirements:

- Use only the supplied text.
- Preserve important evidence.
- Preserve PAGE, SHEET, ROW, section and CHUNK references.
- Capture contradictions, patterns, facts, definitions, numbers, or other relevant evidence.
- Do not attempt the final document-wide conclusion yet.
- Be concise.
- If the chunk is genuinely irrelevant to the task, output exactly:

NO_RELEVANT_FINDINGS

DOCUMENT CHUNK:

[CHUNK ${i + 1}]

${chunk}
`,
          },
        ],
      });

      if (result.trim() !== "NO_RELEVANT_FINDINGS") {
        findings.push(`[CHUNK ${i + 1}]\n${result}`);
      }
    }

    // REDUCE
    sendProgress({
      stage: "preparing-final-answer",
    });

    let consolidated;
    if (findings.length === 0) {
      consolidated =
        "No relevant findings were identified in the document chunks.";
    } else {
      consolidated = await this.reductionService.reduceFindings({
        model: modelConfig.model,
        findings,
        instruction,
        conversationContext,
        signal,
        sendProgress,
      });
    }

    // FINAL SYNTHESIS
    sendProgress({
      stage: "writing-final-answer",
    });

    const finalStart = performance.now();
    let firstTokenAt = null;

    const finalResponse = await this.llmProvider.streamChat({
      model: modelConfig.model,
      signal,
      think: modeConfig.think,
      numCtx: modeConfig.numCtx,
      temperature: modeConfig.temperature,
      messages: [
        {
          role: "system",
          content: [
            this.promptService.getDocumentSystemPrompt(modelConfig.model),
            webContext,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
        {
          role: "user",
          content: `
You have completed a document-wide analysis.

PREVIOUS CONVERSATION CONTEXT:

${conversationContext || "No previous conversation context."}

The previous conversation may be used to understand follow-up
references in the current task such as:

- "the second one"
- "that point"
- "explain it"
- "compare it with the previous one"

The previous conversation is context only.

It is NOT independent evidence about the document.

DOCUMENT:
${document.name}

USER TASK:
${instruction}

Below are consolidated findings from the entire document.

Produce the final answer to the user's task.

Requirements:

- Base claims about the document only on the consolidated document findings.
- If web context is available, use it only for external or current information relevant to the user's task.
- Clearly distinguish document evidence from external web information.
- Use previous conversation context only to understand the user's intent.
- Do not invent evidence.
- Integrate findings across the entire document.
- Preserve useful PAGE, SHEET, ROW and CHUNK references.
- Clearly distinguish conclusions from direct evidence.
- If the document does not support a conclusion, say so.
- Use clear Markdown.

CONSOLIDATED FINDINGS:

${consolidated}
`,
        },
      ],
    });

    await consumeOllamaStream(finalResponse, (data) => {
      const thinking = data.message?.thinking;
      if (thinking) {
        send({
          type: "thinking",
          content: thinking,
        });
      }

      const token = data.message?.content;
      if (token) {
        if (firstTokenAt === null) {
          firstTokenAt = performance.now();
        }

        send({
          type: "token",
          content: token,
        });
      }

      if (data.done) {
        const stats = calculateOllamaStats(data);

        send({
          type: "stats",
          document: true,
          model: modelConfig.model,
          modelVariant: modelConfig.label,
          mode: modeConfig.label,
          chunksProcessed: document.chunks.length,
          relevantChunks: findings.length,
          elapsedMs: performance.now() - analysisStart,
          finalTtftMs: firstTokenAt ? firstTokenAt - finalStart : null,
          tokensPerSecond: stats.tokensPerSecond,
          generatedTokens: data.eval_count,
        });
      }
    });
  }
}

module.exports = DocumentService;
