/**
 * Interfaz base para almacenamiento y sincronización de conversaciones y proyectos.
 * Cumple con SRP y DIP.
 */
class IConversationRepository {
  /**
   * Lee las conversaciones y proyectos guardados.
   * @returns {Promise<{ projects: Array, chats: Array }>}
   */
  async getConversations() {
    throw new Error("Method getConversations() must be implemented.");
  }

  /**
   * Sincroniza y guarda las conversaciones y proyectos en almacenamiento persistente.
   * @param {Array} projects
   * @param {Array} chats
   * @returns {Promise<{ projectsCount: number, chatsCount: number }>}
   */
  async syncConversations(projects, chats) {
    throw new Error("Method syncConversations() must be implemented.");
  }
}

module.exports = IConversationRepository;
