const path = require("path");
const XLSX = require("xlsx");
const IDocumentParser = require("../../domain/interfaces/IDocumentParser");

function columnName(index) {
  let result = "";
  let number = index;

  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }

  return result;
}

class ExcelParser extends IDocumentParser {
  supports(extension) {
    return (
      extension === ".xlsx" ||
      extension === ".xls" ||
      extension === ".csv"
    );
  }

  async parse(filePath, originalName) {
    const extension = path.extname(originalName).toLowerCase();
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
    });

    const output = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      output.push(`\n[SHEET: ${sheetName}]\n`);

      if (rows.length === 0) {
        output.push("[EMPTY SHEET]\n");
        continue;
      }

      const firstRow = rows[0] || [];
      const headers = firstRow.map((value, index) => {
        const text = String(value ?? "").trim();
        return text || `Column ${columnName(index + 1)}`;
      });

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const fields = [];
        const maxColumns = Math.max(headers.length, row.length);

        for (let columnIndex = 0; columnIndex < maxColumns; columnIndex++) {
          const value = row[columnIndex];
          if (value === "" || value === null || value === undefined) {
            continue;
          }

          const header =
            headers[columnIndex] || `Column ${columnName(columnIndex + 1)}`;
          fields.push(`${header}: ${value}`);
        }

        if (fields.length > 0) {
          output.push(`Row ${rowIndex + 1}: ${fields.join(" | ")}`);
        }
      }
    }

    return {
      text: output.join("\n"),
      type: extension === ".csv" ? "csv" : "spreadsheet",
      metadata: {
        sheets: workbook.SheetNames,
      },
    };
  }
}

module.exports = ExcelParser;
