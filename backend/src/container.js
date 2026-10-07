const FileProfileRepository = require("./infrastructure/profile/FileProfileRepository");
const OllamaLLMProvider = require("./infrastructure/llm/OllamaLLMProvider");
const DocumentParserRegistry = require("./infrastructure/parsers/DocumentParserRegistry");
const InMemoryDocumentStore = require("./infrastructure/storage/InMemoryDocumentStore");
const DuckDuckGoSearchProvider = require("./infrastructure/search/DuckDuckGoSearchProvider");
const FileConversationRepository = require("./infrastructure/storage/FileConversationRepository");

const PromptService = require("./services/PromptService");
const WebSearchService = require("./services/WebSearchService");
const ReductionService = require("./services/ReductionService");
const DocumentService = require("./services/DocumentService");
const ChatService = require("./services/ChatService");
const StorageService = require("./services/StorageService");

const HealthController = require("./presentation/controllers/HealthController");
const StorageController = require("./presentation/controllers/StorageController");
const DocumentController = require("./presentation/controllers/DocumentController");
const ChatController = require("./presentation/controllers/ChatController");

/**
 * Contenedor de Inversión de Dependencias (DIP) y Composition Root.
 * Enlaza todas las capas de dominio, infraestructura, servicios y presentación.
 */
function createContainer(overrides = {}) {
  // Infraestructura
  const profileRepository =
    overrides.profileRepository || new FileProfileRepository();
  const llmProvider = overrides.llmProvider || new OllamaLLMProvider();
  const parserRegistry =
    overrides.parserRegistry || DocumentParserRegistry.createDefault();
  const documentStore =
    overrides.documentStore || new InMemoryDocumentStore();
  const searchProvider =
    overrides.searchProvider || new DuckDuckGoSearchProvider();
  const conversationRepository =
    overrides.conversationRepository || new FileConversationRepository();

  // Servicios de Aplicación
  const promptService =
    overrides.promptService || new PromptService(profileRepository);
  const webSearchService =
    overrides.webSearchService ||
    new WebSearchService(searchProvider, llmProvider);
  const reductionService =
    overrides.reductionService ||
    new ReductionService(llmProvider, promptService);
  const documentService =
    overrides.documentService ||
    new DocumentService(
      documentStore,
      parserRegistry,
      llmProvider,
      promptService,
      reductionService,
      webSearchService
    );
  const chatService =
    overrides.chatService ||
    new ChatService(llmProvider, promptService, webSearchService);
  const storageService =
    overrides.storageService || new StorageService(conversationRepository);

  // Controladores de Presentación
  const healthController =
    overrides.healthController || new HealthController(llmProvider);
  const storageController =
    overrides.storageController || new StorageController(storageService);
  const documentController =
    overrides.documentController || new DocumentController(documentService);
  const chatController =
    overrides.chatController || new ChatController(chatService);

  return {
    profileRepository,
    llmProvider,
    parserRegistry,
    documentStore,
    searchProvider,
    conversationRepository,
    promptService,
    webSearchService,
    reductionService,
    documentService,
    chatService,
    storageService,
    healthController,
    storageController,
    documentController,
    chatController,
  };
}

module.exports = {
  createContainer,
};
