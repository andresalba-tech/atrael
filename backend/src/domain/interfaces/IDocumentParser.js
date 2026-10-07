/**
 * Interfaz base para estrategias de parsing de documentos.
 * Cumple con el Principio de Abierto/Cerrado (OCP) y Sustitución de Liskov (LSP).
 */
class IDocumentParser {
  /**
   * Determina si la extensión es compatible con este extractor.
   * @param {string} extension Ej: ".pdf"
   * @returns {boolean}
   */
  supports(extension) {
    throw new Error("Method supports() must be implemented.");
  }

  /**
   * Extrae el texto y metadatos del archivo.
   * @param {string} filePath Ruta física temporal del archivo.
   * @param {string} originalName Nombre original del archivo subido.
   * @returns {Promise<{ text: string, type: string, metadata: object }>}
   */
  async parse(filePath, originalName) {
    throw new Error("Method parse() must be implemented.");
  }
}

module.exports = IDocumentParser;
