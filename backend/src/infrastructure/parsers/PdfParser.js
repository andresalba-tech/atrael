const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const IDocumentParser = require("../../domain/interfaces/IDocumentParser");

class PdfParser extends IDocumentParser {
  supports(extension) {
    return extension === ".pdf";
  }

  async parse(filePath, originalName) {
    const buffer = await fs.promises.readFile(filePath);
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      const text = result.pages
        .map((page) => `\n[PAGE ${page.num}]\n${page.text}`)
        .join("\n");

      return {
        text,
        type: "pdf",
        metadata: {
          pages: result.total,
        },
      };
    } finally {
      await parser.destroy();
    }
  }
}

module.exports = PdfParser;
