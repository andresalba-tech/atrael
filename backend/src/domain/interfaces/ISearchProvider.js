/**
 * Interfaz base para motores de búsqueda web.
 * Cumple con OCP y DIP.
 */
class ISearchProvider {
  /**
   * Ejecuta una búsqueda web devolviendo una lista de resultados normalizados.
   * @param {string} query
   * @param {number} limit
   * @param {boolean} recent
   * @returns {Promise<Array<{ title: string, url: string, snippet: string }>>}
   */
  async search(query, limit = 5, recent = false) {
    throw new Error("Method search() must be implemented.");
  }
}

module.exports = ISearchProvider;
