const fs = require("fs");
const IDocumentParser = require("../../domain/interfaces/IDocumentParser");

class TextParser extends IDocumentParser {
  supports(extension) {
    return extension === ".txt" || extension === ".md";
  }

  async parse(filePath, originalName) {
    const text = await fs.promises.readFile(filePath, "utf8");
    return {
      text,
      type: "text",
      metadata: {},
    };
  }
}

module.exports = TextParser;
