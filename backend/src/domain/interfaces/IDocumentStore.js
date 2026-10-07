/**
 * Interfaz base para el almacén de documentos en memoria / persistencia.
 * Cumple con SRP y DIP.
 */
class IDocumentStore {
  set(id, document) {
    throw new Error("Method set() must be implemented.");
  }

  get(id) {
    throw new Error("Method get() must be implemented.");
  }

  has(id) {
    throw new Error("Method has() must be implemented.");
  }

  delete(id) {
    throw new Error("Method delete() must be implemented.");
  }

  cleanup(ttlMs) {
    throw new Error("Method cleanup() must be implemented.");
  }
}

module.exports = IDocumentStore;
