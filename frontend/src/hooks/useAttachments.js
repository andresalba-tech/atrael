import { useState, useCallback, useRef } from "react";
import { uploadDocument, deleteDocument } from "../services/apiClient";
import {
  isSupportedImageMime,
  MAX_IMAGE_SIZE_BYTES,
} from "../config/attachments";

export function useAttachments() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentProgress, setDocumentProgress] = useState(null);

  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const handleImageChange = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!isSupportedImageMime(file.type)) {
      alert("Use PNG, JPG, JPEG or WEBP.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert("Image must be smaller than 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      setSelectedImage({
        name: file.name,
        preview: dataUrl,
        base64,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleDocumentChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const previousDocument = selectedDocument;
    setUploadingDocument(true);
    setDocumentProgress(null);

    try {
      const data = await uploadDocument(file);

      // Previous document safely deleted once new document is uploaded
      if (previousDocument) {
        await deleteDocument(previousDocument.documentId);
      }

      setSelectedDocument(data);
      setSelectedImage(null);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setUploadingDocument(false);
    }
  }, [selectedDocument]);

  const removeDocument = useCallback(async () => {
    if (selectedDocument) {
      await deleteDocument(selectedDocument.documentId);
    }
    setSelectedDocument(null);
    setDocumentProgress(null);
  }, [selectedDocument]);

  const clearAttachments = useCallback(async () => {
    if (selectedDocument) {
      await deleteDocument(selectedDocument.documentId);
    }
    setSelectedImage(null);
    setSelectedDocument(null);
    setDocumentProgress(null);
  }, [selectedDocument]);

  return {
    selectedImage,
    setSelectedImage,
    selectedDocument,
    setSelectedDocument,
    uploadingDocument,
    documentProgress,
    setDocumentProgress,
    imageInputRef,
    documentInputRef,
    handleImageChange,
    removeImage,
    handleDocumentChange,
    removeDocument,
    clearAttachments,
  };
}
