/**
 * Interfaz / Contrato base para proveedores de LLM.
 * Cumple con el Principio de Segregación de Interfaces (ISP) e Inversión de Dependencias (DIP).
 */
class ILLMProvider {
  /**
   * Ejecuta una llamada de chat no bloqueante (no-streaming).
   */
  async chat(params) {
    throw new Error("Method chat() must be implemented.");
  }

  /**
   * Ejecuta una llamada de chat con streaming (ReadableStream/NDJSON).
   */
  async streamChat(params) {
    throw new Error("Method streamChat() must be implemented.");
  }

  /**
   * Consulta el estado y modelos disponibles del proveedor.
   */
  async getTags() {
    throw new Error("Method getTags() must be implemented.");
  }
}

module.exports = ILLMProvider;
