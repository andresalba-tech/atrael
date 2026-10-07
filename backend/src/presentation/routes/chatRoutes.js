const express = require("express");

function createChatRoutes(chatController) {
  const router = express.Router();
  router.post("/api/chat", (req, res) => chatController.chat(req, res));
  return router;
}

module.exports = createChatRoutes;
