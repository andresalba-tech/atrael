/**
 * Servicio puro de partición y fragmentación de texto (Chunking).
 * Cumple con SRP.
 */
class TextChunkerService {
  /**
   * Divide un texto en bloques con solapamiento respetando saltos de párrafo, línea y oración.
   * @param {string} text
   * @param {number} maxChars
   * @param {overlap} overlap
   * @returns {string[]}
   */
  static chunk(text, maxChars = 6500, overlap = 350) {
    if (!text || typeof text !== "string") {
      return [];
    }

    const normalized = text
      .replace(/\r\n/g, "\n")
      .replace(/\u0000/g, "")
      .trim();

    if (!normalized) {
      return [];
    }

    const chunks = [];
    let start = 0;

    while (start < normalized.length) {
      let end = Math.min(start + maxChars, normalized.length);

      // Intenta no partir a la mitad de un párrafo o frase
      if (end < normalized.length) {
        const searchStart = Math.max(start, end - 900);
        const section = normalized.slice(searchStart, end);

        const paragraphBreak = section.lastIndexOf("\n\n");
        const lineBreak = section.lastIndexOf("\n");
        const sentenceBreak = Math.max(
          section.lastIndexOf(". "),
          section.lastIndexOf("? "),
          section.lastIndexOf("! ")
        );

        const bestBreak = Math.max(
          paragraphBreak,
          lineBreak,
          sentenceBreak
        );

        if (bestBreak > 150) {
          end = searchStart + bestBreak + 1;
        }
      }

      const chunk = normalized.slice(start, end).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      if (end >= normalized.length) {
        break;
      }

      start = Math.max(end - overlap, start + 1);
    }

    return chunks;
  }
}

module.exports = TextChunkerService;
