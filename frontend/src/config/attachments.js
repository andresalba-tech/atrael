export const SUPPORTED_DOCUMENT_EXTENSIONS =
  ".pdf,.docx,.txt,.md,.xlsx,.xls,.csv";

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export function isSupportedImageMime(mimeType) {
  return SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType);
}

export function getDocumentIcon(documentType) {
  return documentType === "spreadsheet" || documentType === "csv" ? "📊" : "📄";
}
