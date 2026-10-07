/**
 * Controlador HTTP para persistencia de conversaciones y proyectos.
 * Cumple con SRP.
 */
class StorageController {
  /**
   * @param {import('../../services/StorageService')} storageService
   */
  constructor(storageService) {
    this.storageService = storageService;
  }

  async getConversations(req, res) {
    try {
      const data = await this.storageService.getConversations();
      res.json({
        ok: true,
        projects: data.projects,
        chats: data.chats,
      });
    } catch (error) {
      console.error("Storage read error:", error);
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }

  async syncConversations(req, res) {
    try {
      const { projects = [], chats = [] } = req.body;

      if (!Array.isArray(projects) || !Array.isArray(chats)) {
        return res.status(400).json({
          ok: false,
          error: "projects and chats must be arrays",
        });
      }

      const result = await this.storageService.syncConversations(projects, chats);

      res.json({
        ok: true,
        count: {
          projects: result.projectsCount,
          chats: result.chatsCount,
        },
      });
    } catch (error) {
      console.error("Storage sync error:", error);
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
}

module.exports = StorageController;
