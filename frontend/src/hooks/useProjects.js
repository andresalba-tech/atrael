import { useState, useEffect, useCallback } from "react";
import {
  createProject,
  getProjects,
  getChatsByProject,
  saveChat,
  deleteChat,
  deleteProject,
} from "../storage/chatDb";

export function useProjects({
  messages,
  setMessages,
  onResetSession,
}) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatTitle, setCurrentChatTitle] = useState("");

  // Initial load of projects
  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const storedProjects = await getProjects();
        if (cancelled) return;

        if (storedProjects.length === 0) {
          const defaultProject = await createProject("Main");
          if (cancelled) return;
          setProjects([defaultProject]);
          setSelectedProjectId(defaultProject.id);
        } else {
          setProjects(storedProjects);
          setSelectedProjectId(storedProjects[0].id);
        }
      } catch (error) {
        console.error("Could not load projects:", error);
      }
    };

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load chats whenever selectedProjectId changes
  useEffect(() => {
    let cancelled = false;

    const loadChats = async () => {
      if (!selectedProjectId) {
        setChats([]);
        return;
      }

      try {
        const storedChats = await getChatsByProject(selectedProjectId);
        if (cancelled) return;
        setChats(storedChats);
      } catch (error) {
        console.error("Could not load chats:", error);
      }
    };

    loadChats();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const handleCreateProject = useCallback(async () => {
    const name = window.prompt("Project name:");
    if (!name || !name.trim()) return;

    try {
      const project = await createProject(name);
      setProjects((current) => [...current, project]);
      setSelectedProjectId(project.id);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }, []);

  const handleSaveChat = useCallback(async () => {
    if (!selectedProjectId) {
      alert("Select a project first.");
      return;
    }

    if (messages.length === 0) {
      alert("There is no conversation to save.");
      return;
    }

    try {
      let title = currentChatTitle;

      if (!currentChatId) {
        title = window.prompt("Conversation name:");
        if (!title || !title.trim()) return;
      }

      const savedChat = await saveChat({
        id: currentChatId,
        projectId: selectedProjectId,
        title: title.trim(),
        messages: [...messages],
      });

      setCurrentChatId(savedChat.id);
      setCurrentChatTitle(savedChat.title);

      const storedChats = await getChatsByProject(selectedProjectId);
      setChats(storedChats);

      alert(currentChatId ? "Conversation updated." : "Conversation saved.");
    } catch (error) {
      console.error("Could not save chat:", error);
      alert(`Could not save chat: ${error.message}`);
    }
  }, [selectedProjectId, messages, currentChatTitle, currentChatId]);

  const handleOpenChat = useCallback(async (chat) => {
    await onResetSession?.();

    setMessages(chat.messages || []);
    setCurrentChatId(chat.id);
    setCurrentChatTitle(chat.title);
  }, [onResetSession, setMessages]);

  const handleDeleteChat = useCallback(async (chat) => {
    const confirmed = window.confirm(
      `Delete "${chat.title}"?\n\nThis conversation will be permanently deleted.`
    );
    if (!confirmed) return;

    try {
      await deleteChat(chat.id);

      if (currentChatId === chat.id) {
        await onResetSession?.();
        setCurrentChatId(null);
        setCurrentChatTitle("");
      }

      const updatedChats = await getChatsByProject(selectedProjectId);
      setChats(updatedChats);
    } catch (error) {
      console.error("Could not delete chat:", error);
      alert(`Could not delete conversation: ${error.message}`);
    }
  }, [currentChatId, onResetSession, selectedProjectId]);

  const handleDeleteProject = useCallback(async (project) => {
    const confirmed = window.confirm(
      `Delete project "${project.name}"?\n\nAll saved conversations inside this project will also be permanently deleted.`
    );
    if (!confirmed) return;

    try {
      const deletingCurrentProject = selectedProjectId === project.id;
      await deleteProject(project.id);
      const updatedProjects = await getProjects();
      setProjects(updatedProjects);

      if (deletingCurrentProject) {
        await onResetSession?.();
        setCurrentChatId(null);
        setCurrentChatTitle("");
        setChats([]);

        if (updatedProjects.length > 0) {
          setSelectedProjectId(updatedProjects[0].id);
        } else {
          const defaultProject = await createProject("Main");
          setProjects([defaultProject]);
          setSelectedProjectId(defaultProject.id);
        }
      }
    } catch (error) {
      console.error("Could not delete project:", error);
      alert(`Could not delete project: ${error.message}`);
    }
  }, [selectedProjectId, onResetSession]);

  const handleSelectProject = useCallback(async (projectId) => {
    if (projectId === selectedProjectId) return;

    if (messages.length > 0) {
      const confirmed = window.confirm(
        "Switch project?\n\nThe current chat will be cleared. Save it first if you want to keep it."
      );
      if (!confirmed) return;
    }

    await onResetSession?.();
    setCurrentChatId(null);
    setCurrentChatTitle("");
    setChats([]);
    setSelectedProjectId(projectId);
  }, [selectedProjectId, messages.length, onResetSession]);

  const handleNewChat = useCallback(async () => {
    await onResetSession?.();
    setCurrentChatId(null);
    setCurrentChatTitle("");
  }, [onResetSession]);

  return {
    projects,
    selectedProjectId,
    chats,
    currentChatId,
    currentChatTitle,
    handleCreateProject,
    handleSaveChat,
    handleOpenChat,
    handleDeleteChat,
    handleDeleteProject,
    handleSelectProject,
    handleNewChat,
  };
}
