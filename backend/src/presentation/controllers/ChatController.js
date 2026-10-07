const { resolveModel, resolveMode } = require("../../config/models");
const { initNdjsonStream } = require("../helpers/streamResponseHelper");

/**
 * Controlador HTTP para conversaciones de chat y streaming en tiempo real.
 * Cumple con SRP y DRY.
 */
class ChatController {
  /**
   * @param {import('../../services/ChatService')} chatService
   */
  constructor(chatService) {
    this.chatService = chatService;
  }

  async chat(req, res) {
    const {
      messages,
      mode = "fast",
      model = "local",
      webAccess = false,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "messages is required",
      });
    }

    const modeConfig = resolveMode(mode);
    const modelConfig = resolveModel(model);

    const stream = initNdjsonStream(res);

    try {
      await this.chatService.handleChatStream({
        messages,
        modelConfig,
        modeConfig,
        webAccess,
        signal: stream.signal,
        writeLine: stream.send,
      });

      stream.end();
    } catch (error) {
      stream.sendError(error);
    }
  }
}

module.exports = ChatController;
