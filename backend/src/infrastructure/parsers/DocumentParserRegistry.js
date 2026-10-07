const path = require("path");
const PdfParser = require("./PdfParser");
const DocxParser = require("./DocxParser");
const ExcelParser = require("./ExcelParser");
const TextParser = require("./TextParser");

/**
 * Registro de estrategias de parsing de documentos.
 * Cumple con el Principio de Abierto/Cerrado (OCP):
 * Abierto a registrar nuevos formatos sin modificar la lógica interna.
 */
class DocumentParserRegistry {
  constructor(parsers = []) {
    this.parsers = parsers;
  }

  register(parser) {
    this.parsers.push(parser);
    return this;
  }

  getParserFor(extension) {
    const ext = extension.toLowerCase();
    const parser = this.parsers.find((p) => p.supports(ext));
    if (!parser) {
      throw new Error(`Unsupported file type: ${ext}`);
    }
    return parser;
  }

  async extractFile(filePath, originalName) {
    const extension = path.extname(originalName).toLowerCase();
    const parser = this.getParserFor(extension);
    return parser.parse(filePath, originalName);
  }

  static createDefault() {
    const registry = new DocumentParserRegistry();
    registry.register(new TextParser());
    registry.register(new DocxParser());
    registry.register(new PdfParser());
    registry.register(new ExcelParser());
    return registry;
  }
}

module.exports = DocumentParserRegistry;
