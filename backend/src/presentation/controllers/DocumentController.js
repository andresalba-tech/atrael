const { resolveModel, resolveMode } = require("../../config/models");
const { initNdjsonStream } = require("../helpers/streamResponseHelper");

/**
 * Controlador HTTP para subida, borrado y análisis RAG de documentos.
 * Cumple con SRP y DRY.
 */
class DocumentController {
  /**
   * @param {import('../../services/DocumentService')} documentService
   */
  constructor(documentService) {
    this.documentService = documentService;
  }

  async uploadFile(req, res) {
    if (!req.file) {
      return res.status(400).json({
        error: "No file received.",
      });
    }

    try {
      const result = await this.documentService.processUpload(req.file);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        error: error.message,
      });
    }
  }

  deleteFile(req, res) {
    const { documentId } = req.params;
    this.documentService.deleteDocument(documentId);
    res.json({ ok: true });
  }

  async analyzeDocument(req, res) {
    const {
      documentId,
      instruction,
      messages = [],
      mode = "fast",
      model = "local",
      webAccess = false,
    } = req.body;

    const document = this.documentService.getDocument(documentId);
    if (!document) {
      return res.status(404).json({
        error: "Document not found. Upload it again.",
      });
    }

    if (!instruction || !instruction.trim()) {
      return res.status(400).json({
        error: "An instruction is required.",
      });
    }

    const modeConfig = resolveMode(mode);
    const modelConfig = resolveModel(model);

    const stream = initNdjsonStream(res);
    stream.ensureHeaders();

    const sendProgress = (progress) => {
      stream.send({
        type: "progress",
        ...progress,
      });
    };

    try {
      await this.documentService.analyzeDocument({
        documentId,
        instruction,
        messages,
        modeConfig,
        modelConfig,
        webAccess,
        send: stream.send,
        sendProgress,
        signal: stream.signal,
      });

      stream.end();
    } catch (error) {
      stream.sendError(error);
    }
  }
}

module.exports = DocumentController;
