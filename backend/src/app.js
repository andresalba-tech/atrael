const express = require("express");
const corsMiddleware = require("./presentation/middlewares/corsMiddleware");
const createHealthRoutes = require("./presentation/routes/healthRoutes");
const createStorageRoutes = require("./presentation/routes/storageRoutes");
const createDocumentRoutes = require("./presentation/routes/documentRoutes");
const createChatRoutes = require("./presentation/routes/chatRoutes");
const { createContainer } = require("./container");

/**
 * Fábrica de la aplicación Express.
 * Cumple con el Principio de Responsabilidad Única (SRP):
 * Solo se encarga de la configuración del pipeline HTTP de Express.
 */
function createApp(customContainer = null) {
  const container = customContainer || createContainer();
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: "25mb" }));

  app.use(createHealthRoutes(container.healthController));
  app.use(createStorageRoutes(container.storageController));
  app.use(createDocumentRoutes(container.documentController));
  app.use(createChatRoutes(container.chatController));

  // Timer periódico de limpieza para documentos en memoria (TTL de 6 horas)
  const cleanupTimer = container.documentStore.startPeriodicCleanup();

  return {
    app,
    container,
    cleanupTimer,
  };
}

module.exports = {
  createApp,
};
