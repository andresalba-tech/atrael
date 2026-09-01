import {
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import serverModule from "../server.js";

import * as XLSX from "xlsx";

import JSZip from "jszip";

import {
  PDFDocument,
  StandardFonts,
} from "pdf-lib";

const { app } = serverModule;

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const uploadsDirectory =
  path.resolve(
    __dirname,
    "../local-data/uploads"
  );

describe("Document upload", () => {
  it("uploads, extracts and chunks a TXT file without leaving a temporary file", async () => {
    const beforeFiles =
      fs.existsSync(
        uploadsDirectory
      )
        ? fs.readdirSync(
            uploadsDirectory
          )
        : [];

    const text = `
PROJECT ORION

The project started in January 2026.

The development team has five members.

The total budget is 120,000 dollars.

The main technology is React.

The project deadline is October 15, 2026.

The main risk is insufficient testing before release.
`.trim();

    const response =
      await request(app)
        .post(
          "/api/files/upload"
        )
        .attach(
          "file",
          Buffer.from(
            text,
            "utf8"
          ),
          {
            filename:
              "orion-test.txt",

            contentType:
              "text/plain",
          }
        )
        .expect(200);

    expect(
      response.body.ok
    ).toBe(true);

    expect(
      response.body.name
    ).toBe(
      "orion-test.txt"
    );

    expect(
      response.body.type
    ).toBe("text");

    expect(
      response.body.documentId
    ).toBeTruthy();

    expect(
      response.body.words
    ).toBeGreaterThan(0);

    expect(
      response.body.chars
    ).toBeGreaterThan(0);

    expect(
      response.body.chunks
    ).toBeGreaterThanOrEqual(
      1
    );

    const afterFiles =
      fs.existsSync(
        uploadsDirectory
      )
        ? fs.readdirSync(
            uploadsDirectory
          )
        : [];

    expect(
      afterFiles.sort()
    ).toEqual(
      beforeFiles.sort()
    );

    await request(app)
      .delete(
        `/api/files/${response.body.documentId}`
      )
      .expect(200);
  });

  it("rejects unsupported file types and removes the temporary file", async () => {
    const beforeFiles =
        fs.existsSync(
        uploadsDirectory
        )
        ? fs.readdirSync(
            uploadsDirectory
            )
        : [];

    const response =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            Buffer.from(
            "fake executable content",
            "utf8"
            ),
            {
            filename:
                "malicious-test.exe",

            contentType:
                "application/octet-stream",
            }
        )
        .expect(400);

    expect(
        response.body.error
    ).toBe(
        "Unsupported file type: .exe"
    );

    const afterFiles =
        fs.existsSync(
        uploadsDirectory
        )
        ? fs.readdirSync(
            uploadsDirectory
            )
        : [];

    expect(
        afterFiles.sort()
    ).toEqual(
        beforeFiles.sort()
    );
  });

  it("rejects an empty TXT file and removes the temporary file", async () => {
    const beforeFiles =
        fs.existsSync(
        uploadsDirectory
        )
        ? fs.readdirSync(
            uploadsDirectory
            )
        : [];

    const response =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            Buffer.from(
            "",
            "utf8"
            ),
            {
            filename:
                "empty-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(400);

    expect(
        response.body.error
    ).toBe(
        "No readable text was found in this file."
    );

    const afterFiles =
        fs.existsSync(
        uploadsDirectory
        )
        ? fs.readdirSync(
            uploadsDirectory
            )
        : [];

    expect(
        afterFiles.sort()
    ).toEqual(
        beforeFiles.sort()
    );
  });

  it("returns 400 when no file is uploaded", async () => {
    const beforeFiles =
        fs.existsSync(
        uploadsDirectory
        )
        ? fs.readdirSync(
            uploadsDirectory
            )
        : [];

    const response =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .expect(400);

    expect(
        response.body
    ).toEqual({
        error:
        "No file received.",
    });

    const afterFiles =
        fs.existsSync(
        uploadsDirectory
        )
        ? fs.readdirSync(
            uploadsDirectory
            )
        : [];

    expect(
        afterFiles.sort()
    ).toEqual(
        beforeFiles.sort()
    );
  });

  it("removes an uploaded document from memory", async () => {
    const uploadResponse =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            Buffer.from(
            "This document exists only for the delete test.",
            "utf8"
            ),
            {
            filename:
                "delete-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    expect(
        documentId
    ).toBeTruthy();

    const deleteResponse =
        await request(app)
        .delete(
            `/api/files/${documentId}`
        )
        .expect(200);

    expect(
        deleteResponse.body
    ).toEqual({
        ok: true,
    });

    const analyzeResponse =
        await request(app)
        .post(
            "/api/document/analyze"
        )
        .send({
            documentId,

            instruction:
            "Summarize this document.",

            mode: "fast",

            model: "local",
        })
        .expect(404);

    expect(
        analyzeResponse.body
    ).toEqual({
        error:
        "Document not found. Upload it again.",
    });
  });

  it("uploads and parses a real XLSX spreadsheet", async () => {
    const workbook =
        XLSX.utils.book_new();

    const worksheet =
        XLSX.utils.aoa_to_sheet([
        [
            "Product",
            "Revenue",
        ],

        [
            "Laptop",
            5000,
        ],

        [
            "Mouse",
            1200,
        ],

        [
            "Keyboard",
            1800,
        ],
        ]);

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Sales"
    );

    const excelBuffer =
        XLSX.write(
        workbook,
        {
            type: "buffer",
            bookType: "xlsx",
        }
        );

    const response =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            excelBuffer,
            {
            filename:
                "sales-test.xlsx",

            contentType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
        )
        .expect(200);

    expect(
        response.body.ok
    ).toBe(true);

    expect(
        response.body.name
    ).toBe(
        "sales-test.xlsx"
    );

    expect(
        response.body.type
    ).toBe(
        "spreadsheet"
    );

    expect(
        response.body.documentId
    ).toBeTruthy();

    expect(
        response.body.chunks
    ).toBeGreaterThanOrEqual(
        1
    );

    expect(
        response.body.metadata.sheets
    ).toEqual([
        "Sales",
    ]);

    expect(
        response.body.words
    ).toBeGreaterThan(0);

    expect(
        response.body.chars
    ).toBeGreaterThan(0);

    await request(app)
        .delete(
        `/api/files/${response.body.documentId}`
        )
        .expect(200);
  });

  it("uploads and parses a real CSV file", async () => {
    const csv = [
        "Product,Revenue",
        "Laptop,5000",
        "Mouse,1200",
        "Keyboard,1800",
    ].join("\n");

    const response =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            Buffer.from(
            csv,
            "utf8"
            ),
            {
            filename:
                "sales-test.csv",

            contentType:
                "text/csv",
            }
        )
        .expect(200);

    expect(
        response.body.ok
    ).toBe(true);

    expect(
        response.body.name
    ).toBe(
        "sales-test.csv"
    );

    expect(
        response.body.type
    ).toBe(
        "csv"
    );

    expect(
        response.body.documentId
    ).toBeTruthy();

    expect(
        response.body.chunks
    ).toBeGreaterThanOrEqual(
        1
    );

    expect(
        response.body.metadata.sheets
    ).toHaveLength(1);

    expect(
        response.body.words
    ).toBeGreaterThan(0);

    expect(
        response.body.chars
    ).toBeGreaterThan(0);

    await request(app)
        .delete(
        `/api/files/${response.body.documentId}`
        )
        .expect(200);
  });

  it("uploads and parses a real DOCX file", async () => {
    const zip =
        new JSZip();

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`
    );

    zip.folder("_rels")
        .file(
        ".rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship
        Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        Target="word/document.xml"
    />
    </Relationships>`
        );

    zip.folder("word")
        .file(
        "document.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    >
    <w:body>
        <w:p>
        <w:r>
            <w:t>PROJECT ORION</w:t>
        </w:r>
        </w:p>

        <w:p>
        <w:r>
            <w:t>The total budget is 120,000 dollars.</w:t>
        </w:r>
        </w:p>

        <w:p>
        <w:r>
            <w:t>The main technology is React.</w:t>
        </w:r>
        </w:p>

        <w:p>
        <w:r>
            <w:t>The deadline is October 15, 2026.</w:t>
        </w:r>
        </w:p>

        <w:sectPr />
    </w:body>
    </w:document>`
        );

    const docxBuffer =
        await zip.generateAsync({
        type: "nodebuffer",
        });

    const response =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            docxBuffer,
            {
            filename:
                "orion-test.docx",

            contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
        )
        .expect(200);

    expect(
        response.body.ok
    ).toBe(true);

    expect(
        response.body.name
    ).toBe(
        "orion-test.docx"
    );

    expect(
        response.body.type
    ).toBe(
        "docx"
    );

    expect(
        response.body.documentId
    ).toBeTruthy();

    expect(
        response.body.words
    ).toBeGreaterThan(0);

    expect(
        response.body.chars
    ).toBeGreaterThan(0);

    expect(
        response.body.chunks
    ).toBeGreaterThanOrEqual(
        1
    );

    expect(
        response.body.metadata
    ).toHaveProperty(
        "warnings"
    );

    await request(app)
        .delete(
        `/api/files/${response.body.documentId}`
        )
        .expect(200);
  });

  it("uploads and parses a real PDF file", async () => {
    const pdfDocument =
        await PDFDocument.create();

    const page =
        pdfDocument.addPage([
        612,
        792,
        ]);

    const font =
        await pdfDocument.embedFont(
        StandardFonts.Helvetica
        );

    page.drawText(
        "PROJECT ORION",
        {
        x: 50,
        y: 730,
        size: 18,
        font,
        }
    );

    page.drawText(
        "The total budget is 120,000 dollars.",
        {
        x: 50,
        y: 690,
        size: 12,
        font,
        }
    );

    page.drawText(
        "The main technology is React.",
        {
        x: 50,
        y: 665,
        size: 12,
        font,
        }
    );

    page.drawText(
        "The deadline is October 15, 2026.",
        {
        x: 50,
        y: 640,
        size: 12,
        font,
        }
    );

    const pdfBytes =
        await pdfDocument.save({
            useObjectStreams: false,
        });

    const response =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            Buffer.from(
            pdfBytes
            ),
            {
            filename:
                "orion-test.pdf",

            contentType:
                "application/pdf",
            }
        )
        .expect(200);

    expect(
        response.body.ok
    ).toBe(true);

    expect(
        response.body.name
    ).toBe(
        "orion-test.pdf"
    );

    expect(
        response.body.type
    ).toBe(
        "pdf"
    );

    expect(
        response.body.documentId
    ).toBeTruthy();

    expect(
        response.body.words
    ).toBeGreaterThan(0);

    expect(
        response.body.chars
    ).toBeGreaterThan(0);

    expect(
        response.body.chunks
    ).toBeGreaterThanOrEqual(
        1
    );

    expect(
        response.body.metadata.pages
    ).toBe(1);

    await request(app)
        .delete(
        `/api/files/${response.body.documentId}`
        )
        .expect(200);
  });
});