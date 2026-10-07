/**
 * Interfaz base para repositorios de perfil del creador.
 * Cumple con DIP y SRP.
 */
class IProfileRepository {
  /**
   * Obtiene el texto del perfil del creador.
   * @returns {string}
   */
  getProfile() {
    throw new Error("Method getProfile() must be implemented.");
  }
}

module.exports = IProfileRepository;
