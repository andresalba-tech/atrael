import { useState, useRef, useEffect, useCallback } from "react";
import { sendChatStream, sendDocumentAnalyzeStream } from "../services/apiClient";
import { readNdjsonStream } from "../services/streamReader";
import { DEFAULT_MODEL, DEFAULT_MODE } from "../config/models";

export function useChat({
  attachments,
  selectedImage = attachments?.selectedImage,
  setSelectedImage = attachments?.setSelectedImage,
  selectedDocument = attachments?.selectedDocument,
  uploadingDocument = attachments?.uploadingDocument,
  documentProgress = attachments?.documentProgress,
  setDocumentProgress = attachments?.setDocumentProgress,
  clearAttachments = attachments?.clearAttachments,
  stopReading,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [thinking, setThinking] = useState("");
  const [webAccess, setWebAccess] = useState(false);

  const abortControllerRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: loading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, thinking, loading, documentProgress]);

  const handleStreamCallbacks = useCallback(
    (customProgress = null) => ({
      onThinking: (chunk) => setThinking((c) => c + chunk),
      onToken: (chunk) => {
        setMessages((current) => {
          const updated = [...current];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + chunk,
            };
          }
          return updated;
        });
      },
      onProgress: customProgress || setDocumentProgress,
      onWebUsed: () => {
        setMessages((current) => {
          const updated = [...current];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              webUsed: true,
            };
          }
          return updated;
        });
      },
      onStats: setStats,
    }),
    [setDocumentProgress]
  );

  const sendNormalMessage = useCallback(
    async (text) => {
      const content =
        text ||
        `Analyze this image carefully.\nDescribe what you see and transcribe any visible text.`;

      const userMessage = {
        role: "user",
        content,
        ...(selectedImage
          ? {
              images: [selectedImage.base64],
              imagePreview: selectedImage.preview,
              imageName: selectedImage.name,
            }
          : {}),
      };

      const conversation = [...messages, userMessage];

      setMessages([
        ...conversation,
        {
          role: "assistant",
          content: "",
          model: selectedModel,
        },
      ]);

      const apiMessages = conversation.map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.images?.length ? { images: message.images } : {}),
      }));

      setSelectedImage(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await sendChatStream({
        messages: apiMessages,
        mode,
        model: selectedModel,
        webAccess,
        signal: controller.signal,
      });

      await readNdjsonStream(response, handleStreamCallbacks());
    },
    [handleStreamCallbacks, messages, mode, selectedImage, selectedModel, setSelectedImage, webAccess]
  );

  const sendDocumentMessage = useCallback(
    async (text) => {
      const instruction = text || "Summarize this document comprehensively.";

      const userMessage = {
        role: "user",
        content: instruction,
        documentName: selectedDocument.name,
      };

      const previousMessages = messages
        .filter(
          (message) =>
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim()
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      setMessages((current) => [
        ...current,
        userMessage,
        {
          role: "assistant",
          content: "",
          model: selectedModel,
        },
      ]);

      setDocumentProgress({
        stage: "starting",
        current: 0,
        total: selectedDocument.chunks,
      });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await sendDocumentAnalyzeStream({
        documentId: selectedDocument.documentId,
        instruction,
        messages: previousMessages,
        mode,
        model: selectedModel,
        webAccess,
        signal: controller.signal,
      });

      await readNdjsonStream(
        response,
        handleStreamCallbacks(setDocumentProgress)
      );

      setDocumentProgress(null);
    },
    [handleStreamCallbacks, messages, mode, selectedDocument, selectedModel, setDocumentProgress, webAccess]
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();

    if (loading || uploadingDocument) {
      return;
    }

    if (!text && !selectedImage && !selectedDocument) {
      return;
    }

    setInput("");
    setStats(null);
    setThinking("");
    setLoading(true);
    setDocumentProgress(null);

    try {
      if (selectedDocument) {
        await sendDocumentMessage(text);
      } else {
        await sendNormalMessage(text);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error(error);

      setMessages((current) => {
        const updated = [...current];
        if (updated.length > 0) {
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            ...updated[lastIndex],
            role: "assistant",
            content: `⚠️ ${error.message}`,
          };
        }
        return updated;
      });
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [
    input,
    loading,
    selectedDocument,
    selectedImage,
    sendDocumentMessage,
    sendNormalMessage,
    setDocumentProgress,
    uploadingDocument,
  ]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setDocumentProgress(null);
  }, [setDocumentProgress]);

  const clearChat = useCallback(async () => {
    stopGeneration();
    stopReading?.();
    await clearAttachments();

    setMessages([]);
    setInput("");
    setThinking("");
    setStats(null);
    setDocumentProgress(null);
  }, [clearAttachments, stopGeneration, stopReading, setDocumentProgress]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    stats,
    mode,
    setMode,
    selectedModel,
    setSelectedModel,
    thinking,
    webAccess,
    setWebAccess,
    bottomRef,
    sendMessage,
    stopGeneration,
    clearChat,
    handleKeyDown,
  };
}
