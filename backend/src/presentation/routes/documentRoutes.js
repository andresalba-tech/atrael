const express = require("express");
const uploadMiddleware = require("../middlewares/uploadMiddleware");

function createDocumentRoutes(documentController) {
  const router = express.Router();

  router.post(
    "/api/files/upload",
    uploadMiddleware.single("file"),
    (req, res) => documentController.uploadFile(req, res)
  );

  router.delete("/api/files/:documentId", (req, res) =>
    documentController.deleteFile(req, res)
  );

  router.post("/api/document/analyze", (req, res) =>
    documentController.analyzeDocument(req, res)
  );

  return router;
}

module.exports = createDocumentRoutes;
