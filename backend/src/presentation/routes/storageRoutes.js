const express = require("express");

function createStorageRoutes(storageController) {
  const router = express.Router();
  router.get("/api/storage/conversations", (req, res) =>
    storageController.getConversations(req, res)
  );
  router.post("/api/storage/sync", (req, res) =>
    storageController.syncConversations(req, res)
  );
  return router;
}

module.exports = createStorageRoutes;
