import { getDocumentIcon } from "../../config/attachments";

export function AttachmentPreview({
  selectedImage,
  selectedDocument,
  uploadingDocument,
  loading,
  onRemoveImage,
  onRemoveDocument,
}) {
  const hasAttachment =
    Boolean(selectedImage || selectedDocument || uploadingDocument);

  return (
    <>
      {!hasAttachment && (
        <span className="sr-only">No file selected</span>
      )}

      {hasAttachment && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          {/* IMAGE CARD */}
          {selectedImage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
              }}
            >
              <img
                src={selectedImage.preview}
                alt="Selected"
                style={{
                  width: "42px",
                  height: "42px",
                  objectFit: "cover",
                  borderRadius: "6px",
                }}
              />

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedImage.name}
                </strong>

                <span
                  style={{
                    opacity: 0.6,
                    fontSize: "0.78rem",
                  }}
                >
                  Image ready
                </span>
              </div>

              <button
                type="button"
                className="remove-image-button"
                onClick={onRemoveImage}
                disabled={loading}
              >
                ✕
              </button>
            </div>
          )}

          {/* DOCUMENT CARD */}
          {selectedDocument && (
            <div
              className="selected-document"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
              }}
            >
              <div className="document-icon">
                {getDocumentIcon(selectedDocument.type)}
              </div>

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedDocument.name}
                </strong>

                <span
                  style={{
                    opacity: 0.6,
                    fontSize: "0.78rem",
                  }}
                >
                  <span>
                    {selectedDocument.words?.toLocaleString()} words
                  </span>
                  {" · "}
                  <span>{selectedDocument.chunks} chunks</span>
                </span>
              </div>

              <button
                type="button"
                className="remove-image-button"
                onClick={onRemoveDocument}
                disabled={loading}
              >
                ✕
              </button>
            </div>
          )}

          {/* DOCUMENT READING */}
          {uploadingDocument && (
            <div className="uploading-document">
              Reading document locally...
            </div>
          )}
        </div>
      )}
    </>
  );
}
