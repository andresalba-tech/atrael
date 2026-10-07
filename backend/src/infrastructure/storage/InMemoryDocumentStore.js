const IDocumentStore = require("../../domain/interfaces/IDocumentStore");

/**
 * Almacén en memoria para documentos procesados.
 * Cumple con SRP y DIP.
 */
class InMemoryDocumentStore extends IDocumentStore {
  constructor() {
    super();
    this.documents = new Map();
  }

  set(id, document) {
    this.documents.set(id, document);
  }

  get(id) {
    return this.documents.get(id);
  }

  has(id) {
    return this.documents.has(id);
  }

  delete(id) {
    return this.documents.delete(id);
  }

  cleanup(ttlMs = 6 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, document] of this.documents) {
      if (now - document.createdAt > ttlMs) {
        this.documents.delete(id);
      }
    }
  }

  startPeriodicCleanup(intervalMs = 30 * 60 * 1000, ttlMs = 6 * 60 * 60 * 1000) {
    const timer = setInterval(() => {
      this.cleanup(ttlMs);
    }, intervalMs);
    timer.unref();
    return timer;
  }
}

module.exports = InMemoryDocumentStore;
