import {
  useEffect,
  useRef,
  useState,
} from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "./App.css";

import {
  createProject,
  getProjects,
  getChatsByProject,
  saveChat,
  deleteChat,
  deleteProject,
} from "./storage/chatDb";

const API =
  "http://localhost:3001";

function App() {
  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    stats,
    setStats,
  ] = useState(null);

  const [
    mode,
    setMode,
  ] = useState("fast");

  const [
    selectedModel,
    setSelectedModel,
  ] = useState("local");

  const [
    thinking,
    setThinking,
  ] = useState("");

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(null);

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState(null);

  const [
    uploadingDocument,
    setUploadingDocument,
  ] = useState(false);

  const [
    documentProgress,
    setDocumentProgress,
  ] = useState(null);

  const [
    speakingMessage,
    setSpeakingMessage,
  ] = useState(null);
  
  const [
    availableVoices,
    setAvailableVoices,
  ] = useState([]);

  const [webAccess, setWebAccess] =
  useState(false);

  const [
    projects,
    setProjects,
  ] = useState([]);

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState(null);

  const [
    chats,
    setChats,
  ] = useState([]);

  const [
    currentChatId,
    setCurrentChatId,
  ] = useState(null);

  const [
    currentChatTitle,
    setCurrentChatTitle,
  ] = useState("");

  const abortControllerRef =
    useRef(null);

  const bottomRef =
    useRef(null);

  const imageInputRef =
    useRef(null);

  const documentInputRef =
    useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices =
        window.speechSynthesis.getVoices();
  
      setAvailableVoices(
        voices.filter(
          (voice) =>
            voice.localService
        )
      );
    };
  
    loadVoices();
  
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices
    );
  
    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices
      );
  
      window.speechSynthesis.cancel();
    };
  }, []);

  // ------------------------------------------------
  // AUTO SCROLL
  // ------------------------------------------------

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior:
        loading
          ? "auto"
          : "smooth",

      block: "end",
    });
  }, [
    messages,
    thinking,
    loading,
    documentProgress,
  ]);

  // ------------------------------------------------
  // IMAGE
  // ------------------------------------------------

  const handleImageChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (
      !validTypes.includes(
        file.type
      )
    ) {
      alert(
        "Use PNG, JPG, JPEG or WEBP."
      );

      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      alert(
        "Image must be smaller than 8 MB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const dataUrl =
        reader.result;

      const base64 =
        dataUrl.split(
          ","
        )[1];

      setSelectedImage({
        name:
          file.name,

        preview:
          dataUrl,

        base64,
      });
    };

    reader.readAsDataURL(
      file
    );
  };

  const removeImage = () => {
    setSelectedImage(
      null
    );
  };

  // ------------------------------------------------
  // DOCUMENT UPLOAD
  // ------------------------------------------------

const handleDocumentChange =
  async (event) => {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    const previousDocument =
      selectedDocument;

    setUploadingDocument(
      true
    );

    setDocumentProgress(
      null
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      // First upload the new document.
      // Do NOT delete the current document yet.
      const response =
        await fetch(
          `${API}/api/files/upload`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Upload failed."
        );
      }

      // The new document is valid and safely stored.
      // Now the previous document can be removed.
      if (
        previousDocument
      ) {
        await fetch(
          `${API}/api/files/${previousDocument.documentId}`,
          {
            method:
              "DELETE",
          }
        ).catch(
          () => {}
        );
      }

      setSelectedDocument(
        data
      );

      setSelectedImage(
        null
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error.message
      );
    } finally {
      setUploadingDocument(
        false
      );
    }
  };

  const removeDocument =
    async () => {
      if (
        selectedDocument
      ) {
        await fetch(
          `${API}/api/files/${selectedDocument.documentId}`,
          {
            method:
              "DELETE",
          }
        ).catch(
          () => {}
        );
      }

      setSelectedDocument(
        null
      );

      setDocumentProgress(
        null
      );
    };

  // ------------------------------------------------
  // PROCESS NDJSON STREAM
  // ------------------------------------------------

  const readStream =
    async (
      response,
      {
        onProgress,
      } = {}
    ) => {
      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";

      const processLine = (
        line
      ) => {
        if (!line.trim()) {
          return;
        }

        const data =
          JSON.parse(line);

        if (
          data.type ===
          "thinking"
        ) {
          setThinking(
            (current) =>
              current +
              data.content
          );
        }

        if (
          data.type ===
          "token"
        ) {
          setMessages(
            (current) => {
              const updated = [
                ...current,
              ];

              const lastIndex =
                updated.length -
                1;

              updated[
                lastIndex
              ] = {
                ...updated[
                  lastIndex
                ],

                content:
                  updated[
                    lastIndex
                  ].content +
                  data.content,
              };

              return updated;
            }
          );
        }

        if (
          data.type ===
          "progress"
        ) {
          onProgress?.(
            data
          );
        }

        if (
          data.type ===
            "web" &&
          data.used
        ) {
          setMessages(
            (current) => {
              const updated = [
                ...current,
              ];

              const lastIndex =
                updated.length - 1;

              if (
                lastIndex >= 0
              ) {
                updated[
                  lastIndex
                ] = {
                  ...updated[
                    lastIndex
                  ],

                  webUsed: true,
                };
              }

              return updated;
            }
          );
        }

        if (
          data.type ===
          "stats"
        ) {
          setStats(
            data
          );
        }

        if (
          data.type ===
          "error"
        ) {
          throw new Error(
            data.message
          );
        }
      };

      while (true) {
        const {
          value,
          done,
        } =
          await reader.read();

        if (done) {
          break;
        }

        buffer +=
          decoder.decode(
            value,
            {
              stream:
                true,
            }
          );

        const lines =
          buffer.split(
            "\n"
          );

        buffer =
          lines.pop() ||
          "";

        for (
          const line of lines
        ) {
          processLine(
            line
          );
        }
      }

      if (
        buffer.trim()
      ) {
        processLine(
          buffer
        );
      }
    };

  // ------------------------------------------------
  // NORMAL CHAT / IMAGE CHAT
  // ------------------------------------------------

  const sendNormalMessage =
    async (text) => {
      const content =
        text ||
        `Analyze this image carefully.
Describe what you see and transcribe any visible text.`;

      const userMessage = {
        role: "user",

        content,

        ...(selectedImage
          ? {
              images: [
                selectedImage
                  .base64,
              ],

              imagePreview:
                selectedImage
                  .preview,

              imageName:
                selectedImage
                  .name,
            }
          : {}),
      };

      const conversation =
        [
          ...messages,
          userMessage,
        ];

      setMessages([
        ...conversation,

        {
          role:
            "assistant",

          content: "",

          model:
            selectedModel,
        },
      ]);

      const apiMessages =
        conversation.map(
          (message) => ({
            role:
              message.role,

            content:
              message.content,

            ...(message
              .images
              ?.length
              ? {
                  images:
                    message.images,
                }
              : {}),
          })
        );

      setSelectedImage(
        null
      );

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      const response =
        await fetch(
          `${API}/api/chat`,
          {
            method:
              "POST",

            signal:
              controller.signal,

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                messages:
                  apiMessages,

                mode,

                model:
                  selectedModel,

                webAccess,
              }),
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          await response.text()
        );
      }

      await readStream(
        response
      );
    };

  // ------------------------------------------------
  // LARGE DOCUMENT
  // ------------------------------------------------

  const sendDocumentMessage =
    async (text) => {
      const instruction =
        text ||
        "Summarize this document comprehensively.";

      const userMessage = {
        role: "user",

        content:
          instruction,

        documentName:
          selectedDocument.name,
      };

      const previousMessages =
      messages
        .filter(
          (message) =>
            (
              message.role ===
                "user" ||
              message.role ===
                "assistant"
            ) &&
            typeof message.content ===
              "string" &&
            message.content.trim()
        )
        .map(
          (message) => ({
            role:
              message.role,

            content:
              message.content,
          })
        );

      setMessages(
        (current) => [
          ...current,

          userMessage,

          {
            role:
              "assistant",

            content: "",

            model:
              selectedModel,
          },
        ]
      );

      setDocumentProgress({
        stage:
          "starting",

        current: 0,

        total:
          selectedDocument.chunks,
      });

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      const response =
        await fetch(
          `${API}/api/document/analyze`,
          {
            method:
              "POST",

            signal:
              controller.signal,

            headers: {
              "Content-Type":
                "application/json",
            },

          body:
            JSON.stringify({
              documentId:
                selectedDocument.documentId,

              instruction,

              messages:
                previousMessages,

              mode,

              model:
                selectedModel,

              webAccess,
            }),
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          await response.text()
        );
      }

      await readStream(
        response,
        {
          onProgress:
            setDocumentProgress,
        }
      );

      setDocumentProgress(
        null
      );
    };

  // ------------------------------------------------
  // SEND
  // ------------------------------------------------

  const sendMessage =
    async () => {
      const text =
        input.trim();

      if (
        loading ||
        uploadingDocument
      ) {
        return;
      }

      if (
        !text &&
        !selectedImage &&
        !selectedDocument
      ) {
        return;
      }

      setInput("");
      setStats(null);
      setThinking("");
      setLoading(true);
      setDocumentProgress(
        null
      );

      try {
        if (
          selectedDocument
        ) {
          await sendDocumentMessage(
            text
          );
        } else {
          await sendNormalMessage(
            text
          );
        }
      } catch (error) {
        if (
          error.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          error
        );

        setMessages(
          (current) => {
            const updated = [
              ...current,
            ];

            if (
              updated.length >
              0
            ) {
              const lastIndex =
                updated.length -
                1;

              updated[
                lastIndex
              ] = {
                ...updated[
                  lastIndex
                ],

                role:
                  "assistant",

                content:
                  `⚠️ ${error.message}`,
              };
            }

            return updated;
          }
        );
      } finally {
        abortControllerRef.current =
          null;

        setLoading(false);
      }
    };

  // ------------------------------------------------
  // STOP
  // ------------------------------------------------

  const stopGeneration =
    () => {
      abortControllerRef
        .current
        ?.abort();

      abortControllerRef.current =
        null;

      setLoading(false);

      setDocumentProgress(
        null
      );
    };

  // ------------------------------------------------
  // CLEAR
  // ------------------------------------------------

const clearChat =
  async () => {
    stopGeneration();
    stopReading();

    if (
      selectedDocument
    ) {
      await fetch(
        `${API}/api/files/${selectedDocument.documentId}`,
        {
          method: "DELETE",
        }
      ).catch(() => {});
    }

    setMessages([]);
    setInput("");

    setSelectedImage(
      null
    );

    setSelectedDocument(
      null
    );

    setThinking("");
    setStats(null);

    setDocumentProgress(
      null
    );

    // DO NOT change:
    // currentChatId
    // currentChatTitle
  };

  // ------------------------------------------------
  // ENTER
  // ------------------------------------------------

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  // ------------------------------------------------
  // PROGRESS
  // ------------------------------------------------

  const progressPercent =
    documentProgress
      ?.percent ??
    (documentProgress
      ?.current &&
    documentProgress
      ?.total
      ? Math.round(
          (documentProgress.current /
            documentProgress.total) *
            100
        )
      : 0);

  const cleanTextForSpeech = (
    text
  ) => {
    return text
      .replace(
        /```[\s\S]*?```/g,
        " Code block omitted. "
      )
      .replace(
        /`([^`]+)`/g,
        "$1"
      )
      .replace(
        /!\[[^\]]*\]\([^)]+\)/g,
        ""
      )
      .replace(
        /\[([^\]]+)\]\([^)]+\)/g,
        "$1"
      )
      .replace(
        /#{1,6}\s?/g,
        ""
      )
      .replace(
        /[*_~>|]/g,
        ""
      )
      .replace(
        /\n{2,}/g,
        ". "
      )
      .replace(
        /\n/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  };
  
  const selectLocalVoice = (
    text
  ) => {
    if (
      availableVoices.length ===
      0
    ) {
      return null;
    }
  
    const spanishHints =
      /\b(el|la|los|las|que|para|con|una|un|por|como|esto|esta|puede|tiene)\b/i;
  
    const appearsSpanish =
      spanishHints.test(text);
  
    const preferredLanguage =
      appearsSpanish
        ? "es"
        : "en";
  
    return (
      availableVoices.find(
        (voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith(
              preferredLanguage
            ) &&
          voice.name
            ?.toLowerCase()
            .includes(
              "microsoft"
            )
      ) ||
      availableVoices.find(
        (voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith(
              preferredLanguage
            )
      ) ||
      availableVoices[0]
    );
  };
  
  const readAloud = (
    text,
    index
  ) => {
    window.speechSynthesis.cancel();
  
    if (
      speakingMessage === index
    ) {
      setSpeakingMessage(
        null
      );
  
      return;
    }
  
    const cleanText =
      cleanTextForSpeech(
        text
      );
  
    if (!cleanText) {
      return;
    }
  
    const utterance =
      new SpeechSynthesisUtterance(
        cleanText
      );
  
    const voice =
      selectLocalVoice(
        cleanText
      );
  
    if (voice) {
      utterance.voice =
        voice;
  
      utterance.lang =
        voice.lang;
    }
  
    utterance.rate =
      1;
  
    utterance.pitch =
      0.9;
  
    utterance.volume =
      1;
  
    utterance.onstart =
      () => {
        setSpeakingMessage(
          index
        );
      };
  
    utterance.onend =
      () => {
        setSpeakingMessage(
          null
        );
      };
  
    utterance.onerror =
      () => {
        setSpeakingMessage(
          null
        );
      };
  
    window.speechSynthesis.speak(
      utterance
    );
  };
  
  const stopReading =
    () => {
      window.speechSynthesis.cancel();
  
      setSpeakingMessage(
        null
      );
    };

  useEffect(() => {
    let cancelled = false;

    const loadProjects =
      async () => {
        try {
          const storedProjects =
            await getProjects();

          if (cancelled) {
            return;
          }

          setProjects(
            storedProjects
          );

          if (
            storedProjects.length >
            0
          ) {
            setSelectedProjectId(
              storedProjects[0].id
            );
          }
        } catch (error) {
          console.error(
            "Could not load projects:",
            error
          );
        }
      };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadChats =
      async () => {
        if (!selectedProjectId) {
          setChats([]);
          return;
        }

        try {
          const storedChats =
            await getChatsByProject(
              selectedProjectId
            );

          if (cancelled) {
            return;
          }

          setChats(
            storedChats
          );
        } catch (error) {
          console.error(
            "Could not load chats:",
            error
          );
        }
      };

    loadChats();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const handleCreateProject =
  async () => {
    const name =
      window.prompt(
        "Project name:"
      );

    if (
      !name ||
      !name.trim()
    ) {
      return;
    }

    try {
      const project =
        await createProject(
          name
        );

      setProjects(
        (current) => [
          ...current,
          project,
        ]
      );

      setSelectedProjectId(
        project.id
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error.message
      );
    }
  };

const handleSaveChat =
  async () => {
    if (!selectedProjectId) {
      alert(
        "Select a project first."
      );

      return;
    }

    if (
      messages.length === 0
    ) {
      alert(
        "There is no conversation to save."
      );

      return;
    }

    try {
      let title =
        currentChatTitle;

      // FIRST SAVE:
      // ask for the conversation name.
      if (!currentChatId) {
        title =
          window.prompt(
            "Conversation name:"
          );

        if (
          !title ||
          !title.trim()
        ) {
          return;
        }
      }

      const savedChat =
        await saveChat({
          id:
            currentChatId,

          projectId:
            selectedProjectId,

          title:
            title.trim(),

          messages:
            [...messages],
        });

      // From this moment this is an existing chat.
      setCurrentChatId(
        savedChat.id
      );

      setCurrentChatTitle(
        savedChat.title
      );

      // Reload sidebar from IndexedDB.
      const storedChats =
        await getChatsByProject(
          selectedProjectId
        );

      setChats(
        storedChats
      );

      // IMPORTANT:
      // visible confirmation that the save happened.
      alert(
        currentChatId
          ? "Conversation updated."
          : "Conversation saved."
      );
    } catch (error) {
      console.error(
        "Could not save chat:",
        error
      );

      alert(
        `Could not save chat: ${error.message}`
      );
    }
  };

  const handleOpenChat =
  async (chat) => {
    stopGeneration();
    stopReading();

    if (
      selectedDocument
    ) {
      await removeDocument();
    }

    setSelectedImage(
      null
    );

    setMessages(
      chat.messages || []
    );

    setCurrentChatId(
      chat.id
    );

    setCurrentChatTitle(
      chat.title
    );

    setInput("");

    setThinking("");

    setStats(null);

    setDocumentProgress(
      null
    );
  };

  const handleDeleteChat =
  async (chat) => {
    const confirmed =
      window.confirm(
        `Delete "${chat.title}"?\n\nThis conversation will be permanently deleted.`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteChat(
        chat.id
      );

      // If the deleted chat is currently open,
      // leave the user in a new empty temporary chat.
      if (
        currentChatId ===
        chat.id
      ) {
        await clearChat();

        setCurrentChatId(
          null
        );

        setCurrentChatTitle(
          ""
        );
      }

      const updatedChats =
        await getChatsByProject(
          selectedProjectId
        );

      setChats(
        updatedChats
      );
    } catch (error) {
      console.error(
        "Could not delete chat:",
        error
      );

      alert(
        `Could not delete conversation: ${error.message}`
      );
    }
  };

  const handleDeleteProject =
  async (project) => {
    const confirmed =
      window.confirm(
        `Delete project "${project.name}"?\n\nAll saved conversations inside this project will also be permanently deleted.`
      );

    if (!confirmed) {
      return;
    }

    try {
      const deletingCurrentProject =
        selectedProjectId ===
        project.id;

      await deleteProject(
        project.id
      );

      const updatedProjects =
        await getProjects();

      setProjects(
        updatedProjects
      );

      // If the project currently open was deleted,
      // leave Atrael in a clean temporary chat.
      if (
        deletingCurrentProject
      ) {
        await clearChat();

        setCurrentChatId(
          null
        );

        setCurrentChatTitle(
          ""
        );

        setChats([]);

        // Select another project if one exists.
        if (
          updatedProjects.length >
          0
        ) {
          setSelectedProjectId(
            updatedProjects[0].id
          );
        } else {
          setSelectedProjectId(
            null
          );
        }
      }
    } catch (error) {
      console.error(
        "Could not delete project:",
        error
      );

      alert(
        `Could not delete project: ${error.message}`
      );
    }
  };

  const handleSelectProject =
  async (projectId) => {
    if (
      projectId ===
      selectedProjectId
    ) {
      return;
    }

    if (
      messages.length > 0
    ) {
      const confirmed =
        window.confirm(
          "Switch project?\n\nThe current chat will be cleared. Save it first if you want to keep it."
        );

      if (!confirmed) {
        return;
      }
    }

    await clearChat();

    // The previous conversation
    // must no longer be active.
    setCurrentChatId(
      null
    );

    setCurrentChatTitle(
      ""
    );

    setChats([]);

    // Now enter the new project.
    setSelectedProjectId(
      projectId
    );
  };

  // ------------------------------------------------
  // UI
  // ------------------------------------------------

  const handleNewChat =
  async () => {
    await clearChat();

    setCurrentChatId(
      null
    );

    setCurrentChatTitle(
      ""
    );
  };

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>Andres Alba&apos;s Atrael</h1>

          <div className="local-status">
            <span className="status-dot" />
            LOCAL AI
          </div>
        </div>

        <div className="header-right">
          {/* MODEL */}
          <button
            type="button"
            className="clear-button"
            onClick={() =>
              setSelectedModel(
                (current) =>
                  current === "local"
                    ? "atrael"
                    : "local"
              )
            }
            disabled={loading}
            title={
              selectedModel === "local"
                ? "Qwen 3.5 4B · click to switch to Atrael"
                : "Qwen 27B Uncensored · click to switch to Local"
            }
          >
            {selectedModel === "local"
              ? "💻 LOCAL"
              : "😈 ATRAEL"}
          </button>

          {/* MODE */}
          <button
            type="button"
            className="clear-button"
            onClick={() =>
              setMode(
                (current) =>
                  current === "fast"
                    ? "quality"
                    : "fast"
              )
            }
            disabled={loading}
            title={
              mode === "fast"
                ? "4K · instant · click for Quality"
                : "8K · reasoning · click for Fast"
            }
          >
            {mode === "fast"
              ? "⚡ FAST"
              : "🧠 QUALITY"}
          </button>

          {/* WEB */}
          <button
            type="button"
            className="clear-button"
            onClick={() =>
              setWebAccess(
                (current) => !current
              )
            }
            disabled={loading}
            aria-pressed={webAccess}
            title={
              webAccess
                ? "Internet search enabled"
                : "Local only"
            }
          >
            {webAccess
              ? "🌐 WEB ON"
              : "🔒 WEB OFF"}
          </button>

          {/* CLEAR */}
          <button
            type="button"
            className="clear-button"
            onClick={clearChat}
            disabled={loading}
          >
            Clear Chat
          </button>
        </div>
      </header>

      <section className="workspace">
        {/* ========================================= */}
        {/* LEFT SIDEBAR                            */}
        {/* ONLY PROJECTS + CONVERSATIONS           */}
        {/* ========================================= */}

        <aside className="sidebar">
          {/* PROJECTS */}
          <section className="sidebar-block">
            <div className="sidebar-title">
              Projects
            </div>

            <button
              type="button"
              className="project-new"
              onClick={
                handleCreateProject
              }
              disabled={loading}
            >
              + New Project
            </button>

            <div className="project-list">
              {projects.length === 0 ? (
                <div className="project-empty">
                  No projects yet
                </div>
              ) : (
                projects.map(
                  (project) => (
                    <div
                      key={project.id}
                      className={
                        selectedProjectId ===
                        project.id
                          ? "project-row active"
                          : "project-row"
                      }
                    >
                      <button
                        type="button"
                        className="project-open"
                        onClick={() =>
                          handleSelectProject(
                            project.id
                          )
                        }
                        disabled={loading}
                        title={project.name}
                      >
                        📁 {project.name}
                      </button>

                      <button
                        type="button"
                        className="project-delete"
                        onClick={() =>
                          handleDeleteProject(
                            project
                          )
                        }
                        disabled={loading}
                        title="Delete project"
                        aria-label={`Delete ${project.name}`}
                      >
                        🗑
                      </button>
                    </div>
                  )
                )
              )}
            </div>

          </section>

          {/* CONVERSATIONS */}
          <section className="sidebar-block conversations-block">
            <div className="sidebar-title">
              Conversations
            </div>

            {!selectedProjectId ? (
              <div className="project-empty">
                Select a project
              </div>
            ) : chats.length === 0 ? (
              <div className="project-empty">
                No saved conversations
              </div>
            ) : (
              <div className="conversation-list">
                {chats.map(
                  (chat) => (
                    <div
                      key={chat.id}
                      className={
                        currentChatId ===
                        chat.id
                          ? "conversation-row active"
                          : "conversation-row"
                      }
                    >
                      <button
                        type="button"
                        className="conversation-open"
                        onClick={() =>
                          handleOpenChat(
                            chat
                          )
                        }
                        disabled={loading}
                        title={chat.title}
                      >
                        💬 {chat.title}
                      </button>

                      <button
                        type="button"
                        className="conversation-delete"
                        onClick={() =>
                          handleDeleteChat(
                            chat
                          )
                        }
                        disabled={loading}
                        title="Delete conversation"
                        aria-label={`Delete ${chat.title}`}
                      >
                        🗑
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <div className="sidebar-chat-actions">
            <button
              type="button"
              className="project-new"
              onClick={handleNewChat}
              disabled={loading}
            >
              + New Chat
            </button>

            <button
              type="button"
              className="save-chat-button"
              onClick={handleSaveChat}
              disabled={
                loading ||
                messages.length === 0 ||
                !selectedProjectId
              }
            >
              💾 Save Chat
            </button>
          </div>

        </aside>

        {/* ========================================= */}
        {/* MAIN PANEL                              */}
        {/* ========================================= */}

        <section className="main-panel">
          {/* CHAT */}
          <section className="chat">
            {messages.length ===
              0 && (
              <div className="empty">
                <h2>
                  Ask anything
                </h2>

                <p>
                  Chat, images,
                  documents and
                  spreadsheets.
                </p>

                <span className="privacy">
                  ● 100% local
                </span>
              </div>
            )}

            {messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={index}
                  className={`message ${message.role}`}
                >
                  {/* ROLE */}
                  <div className="role">
                    {message.role ===
                    "user"
                      ? "You"
                      : "Atrael"}

                    {message.role ===
                        "assistant" &&
                      message.webUsed && (
                        <span className="web-badge">
                          🌐 WEB
                        </span>
                      )}
                  </div>

                  {/* CONTENT */}
                  <div className="content">
                    {message.documentName && (
                      <div className="message-document">
                        📄{" "}
                        {
                          message.documentName
                        }
                      </div>
                    )}

                    {/* READ ALOUD */}
                    {message.role ===
                      "assistant" &&
                      message.content && (
                        <div className="message-actions">
                          {speakingMessage ===
                          index ? (
                            <button
                              className="read-aloud-button active"
                              onClick={
                                stopReading
                              }
                            >
                              ■ Stop
                            </button>
                          ) : (
                            <button
                              className="read-aloud-button"
                              onClick={() =>
                                readAloud(
                                  message.content,
                                  index
                                )
                              }
                            >
                              🔊 Read aloud
                            </button>
                          )}
                        </div>
                      )}

                    {/* IMAGE IN MESSAGE */}
                    {message.imagePreview && (
                      <div className="message-image-container">
                        <img
                          src={
                            message.imagePreview
                          }
                          alt="Uploaded"
                          className="message-image"
                        />
                      </div>
                    )}

                    {/* MESSAGE TEXT */}
                    {message.role ===
                    "assistant" ? (
                      message.content ? (
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                          components={{
                            a: ({
                              node,
                              ...props
                            }) => (
                              <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ),
                          }}
                        >
                          {
                            message.content
                          }
                        </ReactMarkdown>
                      ) : loading ? (
                        <span className="thinking-dot">
                          ●
                        </span>
                      ) : null
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              )
            )}

            {/* THINKING */}
            {loading &&
              thinking && (
                <details className="thinking-panel">
                  <summary>
                    Model reasoning
                  </summary>

                  <div className="thinking-content">
                    {thinking}
                  </div>
                </details>
              )}

            <div ref={bottomRef} />
          </section>

          {/* ========================================= */}
          {/* DOCUMENT PROGRESS                       */}
          {/* No longer in sidebar                    */}
          {/* ========================================= */}

          {loading &&
            documentProgress && (
              <section
                className="document-progress"
                style={{
                  marginBottom:
                    "10px",
                }}
              >
                <div className="document-progress-header">
                  <strong>
                    {documentProgress.stage ===
                      "analyzing" &&
                      "Analyzing document"}

                    {documentProgress.stage ===
                      "consolidating" &&
                      "Consolidating findings"}

                    {documentProgress.stage ===
                      "preparing-final-answer" &&
                      "Preparing final answer"}

                    {documentProgress.stage ===
                      "writing-final-answer" &&
                      "Writing final answer"}

                    {documentProgress.stage ===
                      "starting" &&
                      "Starting analysis"}
                  </strong>

                  {documentProgress.total && (
                    <span>
                      {
                        documentProgress.current
                      }{" "}
                      /{" "}
                      {
                        documentProgress.total
                      }
                    </span>
                  )}
                </div>

                {documentProgress.stage ===
                  "analyzing" && (
                  <>
                    <div className="progress-track">
                      <div
                        className="progress-value"
                        style={{
                          width: `${progressPercent}%`,
                        }}
                      />
                    </div>

                    <div className="progress-percent">
                      {
                        progressPercent
                      }
                      %
                    </div>
                  </>
                )}
              </section>
            )}

          {/* ========================================= */}
          {/* STATS                                   */}
          {/* ========================================= */}

          {stats && (
            <section className="stats">
              <span className="speed">
                ⚡{" "}
                {stats.tokensPerSecond?.toFixed(
                  1
                ) || "—"}{" "}
                tok/s
              </span>

              {stats.document ? (
                <>
                  <span>
                    Chunks:{" "}
                    {
                      stats.chunksProcessed
                    }
                  </span>

                  <span>
                    Relevant:{" "}
                    {
                      stats.relevantChunks
                    }
                  </span>

                  <span>
                    Total:{" "}
                    {(
                      stats.elapsedMs /
                      1000
                    ).toFixed(
                      1
                    )}
                    s
                  </span>

                  <span>
                    {stats.mode}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    First token:{" "}
                    {stats.ttftMs
                      ? (
                          stats.ttftMs /
                          1000
                        ).toFixed(
                          2
                        )
                      : "—"}
                    s
                  </span>

                  <span>
                    Prompt:{" "}
                    {
                      stats.promptTokens
                    }
                  </span>

                  <span>
                    Generated:{" "}
                    {
                      stats.generatedTokens
                    }
                  </span>

                  <span>
                    Context:{" "}
                    {stats.context}
                  </span>

                  <span>
                    {stats.mode}
                  </span>
                </>
              )}
            </section>
          )}

          {/* ========================================= */}
          {/* COMPOSER                                */}
          {/* ========================================= */}

          <section className="composer">
            {/* SELECTED IMAGE / DOCUMENT */}

            {(selectedImage ||
              selectedDocument ||
              uploadingDocument) && (
              <div
                style={{
                  display:
                    "flex",

                  flexDirection:
                    "column",

                  gap:
                    "8px",

                  marginBottom:
                    "10px",
                }}
              >
                {/* IMAGE CARD */}

                {selectedImage && (
                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        "10px",

                      padding:
                        "8px 10px",

                      border:
                        "1px solid rgba(255,255,255,0.12)",

                      borderRadius:
                        "8px",
                    }}
                  >
                    <img
                      src={
                        selectedImage.preview
                      }
                      alt="Selected"
                      style={{
                        width:
                          "42px",

                        height:
                          "42px",

                        objectFit:
                          "cover",

                        borderRadius:
                          "6px",
                      }}
                    />

                    <div
                      style={{
                        minWidth:
                          0,

                        flex:
                          1,
                      }}
                    >
                      <strong
                        style={{
                          display:
                            "block",

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          selectedImage.name
                        }
                      </strong>

                      <span
                        style={{
                          opacity:
                            0.6,

                          fontSize:
                            "0.78rem",
                        }}
                      >
                        Image ready
                      </span>
                    </div>

                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={
                        removeImage
                      }
                      disabled={
                        loading
                      }
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* DOCUMENT CARD */}

                {selectedDocument && (
                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        "10px",

                      padding:
                        "8px 10px",

                      border:
                        "1px solid rgba(255,255,255,0.12)",

                      borderRadius:
                        "8px",
                    }}
                  >
                    <div className="document-icon">
                      {selectedDocument.type ===
                        "spreadsheet" ||
                      selectedDocument.type ===
                        "csv"
                        ? "📊"
                        : "📄"}
                    </div>

                    <div
                      style={{
                        minWidth:
                          0,

                        flex:
                          1,
                      }}
                    >
                      <strong
                        style={{
                          display:
                            "block",

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          selectedDocument.name
                        }
                      </strong>

                      <span
                        style={{
                          opacity:
                            0.6,

                          fontSize:
                            "0.78rem",
                        }}
                      >
                        {selectedDocument.words?.toLocaleString()}{" "}
                        words ·{" "}
                        {
                          selectedDocument.chunks
                        }{" "}
                        chunks
                      </span>
                    </div>

                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={
                        removeDocument
                      }
                      disabled={
                        loading
                      }
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* DOCUMENT READING */}

                {uploadingDocument && (
                  <div className="uploading-document">
                    Reading document
                    locally...
                  </div>
                )}
              </div>
            )}

            {/* TEXT INPUT */}

            <textarea
              value={input}
              onChange={(
                event
              ) =>
                setInput(
                  event.target
                    .value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder={
                selectedDocument
                  ? "What should Atrael do with this document?"
                  : selectedImage
                    ? "Ask something about this image..."
                    : mode ===
                        "fast"
                      ? "Ask Atrael — FAST..."
                      : "Ask Atrael — QUALITY..."
              }
              rows={3}
            />

            {/* BOTTOM BAR */}

            <div className="composer-bottom">
              <div className="composer-left">
                {/* IMAGE INPUT */}

                <input
                  ref={
                    imageInputRef
                  }
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={
                    handleImageChange
                  }
                  className="hidden-file-input"
                />

                <button
                  type="button"
                  className="attachment-button"
                  disabled={
                    loading ||
                    uploadingDocument ||
                    !!selectedDocument
                  }
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                >
                  🖼 Image
                </button>

                {/* DOCUMENT INPUT */}

                <input
                  ref={
                    documentInputRef
                  }
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"
                  onChange={
                    handleDocumentChange
                  }
                  className="hidden-file-input"
                />

                <button
                  type="button"
                  className="attachment-button"
                  disabled={
                    loading ||
                    uploadingDocument
                  }
                  onClick={() =>
                    documentInputRef.current?.click()
                  }
                >
                  📄 Document
                </button>
              </div>

              {/* SEND / STOP */}

              {loading ? (
                <button
                  className="stop-button"
                  onClick={
                    stopGeneration
                  }
                >
                  ■ Stop
                </button>
              ) : (
                <button
                  className="send-button"
                  onClick={
                    sendMessage
                  }
                  disabled={
                    uploadingDocument ||
                    (!input.trim() &&
                      !selectedImage &&
                      !selectedDocument)
                  }
                >
                  Send
                </button>
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

export default App;