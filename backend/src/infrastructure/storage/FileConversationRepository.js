const fs = require("fs");
const path = require("path");
const IConversationRepository = require("../../domain/interfaces/IConversationRepository");
const { CONVERSATIONS_FILE } = require("../../config/env");

/**
 * Repositorio de persistencia en disco de proyectos y conversaciones (JSON).
 * Cumple con SRP y DIP.
 */
class FileConversationRepository extends IConversationRepository {
  constructor(filePath = CONVERSATIONS_FILE) {
    super();
    this.filePath = filePath;
    this.ensureDirectory();
  }

  ensureDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async getConversations() {
    if (!fs.existsSync(this.filePath)) {
      return {
        projects: [],
        chats: [],
      };
    }

    const raw = await fs.promises.readFile(this.filePath, "utf8");
    const data = JSON.parse(raw);

    return {
      projects: Array.isArray(data.projects) ? data.projects : [],
      chats: Array.isArray(data.chats) ? data.chats : [],
    };
  }

  async syncConversations(projects, chats) {
    if (!Array.isArray(projects) || !Array.isArray(chats)) {
      throw new Error("projects and chats must be arrays");
    }

    const payload = JSON.stringify(
      {
        projects,
        chats,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    );

    const tempFile = `${this.filePath}.tmp`;
    await fs.promises.writeFile(tempFile, payload, "utf8");
    await fs.promises.rename(tempFile, this.filePath);

    return {
      projectsCount: projects.length,
      chatsCount: chats.length,
    };
  }
}

module.exports = FileConversationRepository;
