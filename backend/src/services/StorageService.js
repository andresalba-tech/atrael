/**
 * Servicio de persistencia y sincronización de almacenamiento de conversaciones.
 * Cumple con SRP y DIP.
 */
class StorageService {
  /**
   * @param {import('../domain/interfaces/IConversationRepository')} conversationRepository
   */
  constructor(conversationRepository) {
    this.conversationRepository = conversationRepository;
  }

  async getConversations() {
    return this.conversationRepository.getConversations();
  }

  async syncConversations(projects, chats) {
    return this.conversationRepository.syncConversations(projects, chats);
  }
}

module.exports = StorageService;
