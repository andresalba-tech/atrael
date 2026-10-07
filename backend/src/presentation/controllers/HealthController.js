const { DEFAULT_MODEL } = require("../../config/env");
const { MODES } = require("../../config/models");

/**
 * Controlador para estado del sistema y conectividad con Ollama.
 * Cumple con SRP.
 */
class HealthController {
  /**
   * @param {import('../../domain/interfaces/ILLMProvider')} llmProvider
   */
  constructor(llmProvider) {
    this.llmProvider = llmProvider;
  }

  async check(req, res) {
    try {
      const data = await this.llmProvider.getTags();

      res.json({
        ok: true,
        ollama: "connected",
        model: DEFAULT_MODEL,
        modes: MODES,
        installedModels: data.models?.map((model) => model.name) || [],
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
}

module.exports = HealthController;
