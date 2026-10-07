const {
  consumeOllamaStream,
  calculateOllamaStats,
} = require("./helpers/ollamaStreamReader");

/**
 * Servicio de orquestación de conversaciones de chat y streaming.
 * Cumple con SRP, DIP y DRY.
 */
class ChatService {
  /**
   * @param {import('../domain/interfaces/ILLMProvider')} llmProvider
   * @param {import('./PromptService')} promptService
   * @param {import('./WebSearchService')} webSearchService
   */
  constructor(llmProvider, promptService, webSearchService) {
    this.llmProvider = llmProvider;
    this.promptService = promptService;
    this.webSearchService = webSearchService;
  }

  async handleChatStream({
    messages,
    modelConfig,
    modeConfig,
    webAccess = false,
    signal,
    writeLine,
  }) {
    let webContext = "";
    let webUsed = false;

    if (webAccess) {
      const lastUserText =
        [...messages]
          .reverse()
          .find((message) => message.role === "user")?.content || "";

      const searchResult = await this.webSearchService.getWebSearchContext({
        messages,
        queryContextText: lastUserText,
        fallbackPurpose: "general",
      });

      webContext = searchResult.context;
      webUsed = searchResult.used;
    }

    const startedAt = performance.now();
    let firstTokenAt = null;

    const ollamaResponse = await this.llmProvider.streamChat({
      model: modelConfig.model,
      signal,
      think: modeConfig.think,
      numCtx: modeConfig.numCtx,
      temperature: modeConfig.temperature,
      messages: [
        {
          role: "system",
          content: [
            this.promptService.getSystemPrompt(modelConfig),
            webContext,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
        ...messages,
      ],
    });

    if (webUsed) {
      writeLine({
        type: "web",
        used: true,
      });
    }

    await consumeOllamaStream(ollamaResponse, (data) => {
      const thinking = data.message?.thinking;
      if (thinking) {
        writeLine({
          type: "thinking",
          content: thinking,
        });
      }

      const token = data.message?.content;
      if (token) {
        if (firstTokenAt === null) {
          firstTokenAt = performance.now();
        }

        writeLine({
          type: "token",
          content: token,
        });
      }

      if (data.done) {
        const stats = calculateOllamaStats(data);

        writeLine({
          type: "stats",
          document: false,
          model: modelConfig.model,
          modelVariant: modelConfig.label,
          mode: modeConfig.label,
          context: modeConfig.numCtx,
          ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
          tokensPerSecond: stats.tokensPerSecond,
          promptTokensPerSecond: stats.promptTokensPerSecond,
          generatedTokens: data.eval_count,
          promptTokens: data.prompt_eval_count,
        });
      }
    });
  }
}

module.exports = ChatService;
