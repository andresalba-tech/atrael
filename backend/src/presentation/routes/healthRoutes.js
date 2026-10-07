const express = require("express");

function createHealthRoutes(healthController) {
  const router = express.Router();
  router.get("/api/health", (req, res) => healthController.check(req, res));
  return router;
}

module.exports = createHealthRoutes;
