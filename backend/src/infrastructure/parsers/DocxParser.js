const mammoth = require("mammoth");
const IDocumentParser = require("../../domain/interfaces/IDocumentParser");

class DocxParser extends IDocumentParser {
  supports(extension) {
    return extension === ".docx";
  }

  async parse(filePath, originalName) {
    const result = await mammoth.extractRawText({
      path: filePath,
    });

    return {
      text: result.value,
      type: "docx",
      metadata: {
        warnings: result.messages || [],
      },
    };
  }
}

module.exports = DocxParser;
