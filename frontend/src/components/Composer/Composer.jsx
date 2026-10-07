import { AttachmentPreview } from "./AttachmentPreview";
import { getModePlaceholder } from "../../config/models";
import {
  SUPPORTED_DOCUMENT_EXTENSIONS,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "../../config/attachments";

export function Composer({
  input,
  setInput,
  onKeyDown,
  loading,
  mode,
  onSendMessage,
  onStopGeneration,
  attachments,
  selectedImage = attachments?.selectedImage,
  selectedDocument = attachments?.selectedDocument,
  uploadingDocument = attachments?.uploadingDocument,
  imageInputRef = attachments?.imageInputRef,
  documentInputRef = attachments?.documentInputRef,
  onImageChange = attachments?.handleImageChange,
  onDocumentChange = attachments?.handleDocumentChange,
  onRemoveImage = attachments?.removeImage,
  onRemoveDocument = attachments?.removeDocument,
}) {
  const isSendDisabled =
    uploadingDocument ||
    (!input.trim() && !selectedImage && !selectedDocument);

  const placeholder = selectedDocument
    ? "What should Atrael do with this document?"
    : selectedImage
    ? "Ask something about this image..."
    : getModePlaceholder(mode);

  return (
    <section className="composer">
      {/* ATTACHMENT PREVIEW */}
      <AttachmentPreview
        selectedImage={selectedImage}
        selectedDocument={selectedDocument}
        uploadingDocument={uploadingDocument}
        loading={loading}
        onRemoveImage={onRemoveImage}
        onRemoveDocument={onRemoveDocument}
      />

      {/* TEXT INPUT */}
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={3}
      />

      {/* BOTTOM BAR */}
      <div className="composer-bottom">
        <div className="composer-left">
          {/* IMAGE INPUT */}
          <input
            ref={imageInputRef}
            type="file"
            accept={SUPPORTED_IMAGE_MIME_TYPES.join(",")}
            onChange={onImageChange}
            className="hidden-file-input"
          />

          <button
            type="button"
            className="attachment-button"
            disabled={loading || uploadingDocument || !!selectedDocument}
            onClick={() => imageInputRef.current?.click()}
          >
            🖼 Image
          </button>

          {/* DOCUMENT INPUT */}
          <input
            ref={documentInputRef}
            type="file"
            accept={SUPPORTED_DOCUMENT_EXTENSIONS}
            onChange={onDocumentChange}
            className="hidden-file-input"
          />

          <button
            type="button"
            className="attachment-button"
            disabled={loading || uploadingDocument}
            onClick={() => documentInputRef.current?.click()}
          >
            📄 Document
          </button>
        </div>

        {/* CENTER HEATSINK & BUS LANES */}
        <div className="composer-center-circuits" aria-hidden="true">
          <svg
            className="bus-lane-svg"
            viewBox="0 0 160 20"
            preserveAspectRatio="none"
          >
            <path
              d="M0 10 L35 10 L45 3 L115 3 L125 10 L160 10"
              stroke="#ff2a55"
              strokeWidth="1.6"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M15 17 L50 17 L60 10 L100 10 L110 17 L145 17"
              stroke="#ff2a55"
              strokeWidth="1"
              fill="none"
              opacity="0.5"
            />
            <circle cx="45" cy="3" r="2.2" fill="#ff2a55" />
            <circle cx="115" cy="3" r="2.2" fill="#ff2a55" />
            <circle cx="60" cy="10" r="1.8" fill="#ff2a55" />
            <circle cx="100" cy="10" r="1.8" fill="#ff2a55" />
          </svg>
          <div className="heatsink-fins">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        {/* SEND / STOP (REACTOR CORE) */}
        <div className="composer-right">
          {loading ? (
            <button
              type="button"
              className="stop-button reactor-button stop"
              onClick={onStopGeneration}
              title="Stop generation"
              aria-label="Stop"
            >
              <span className="reactor-ring outer" />
              <span className="reactor-ring inner" />
              <span className="reactor-core stop-core">
                <span className="stop-square" />
              </span>
              <span className="reactor-label">Stop</span>
            </button>
          ) : (
            <button
              type="button"
              className="send-button reactor-button send"
              onClick={onSendMessage}
              disabled={isSendDisabled}
              title="Send prompt"
              aria-label="Send"
            >
              <span className="reactor-ring outer" />
              <span className="reactor-ring inner" />
              <span className="reactor-core send-core" />
              <span className="reactor-label">Send</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
