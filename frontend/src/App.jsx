import { useCallback } from "react";
import "./App.css";

import { useSpeech } from "./hooks/useSpeech";
import { useAttachments } from "./hooks/useAttachments";
import { useChat } from "./hooks/useChat";
import { useProjects } from "./hooks/useProjects";

import { Header } from "./components/Header/Header";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ChatArea } from "./components/Chat/ChatArea";
import { DocumentProgressBar } from "./components/Chat/DocumentProgressBar";
import { StatsBar } from "./components/Chat/StatsBar";
import { Composer } from "./components/Composer/Composer";

function App() {
  const { speakingMessage, readAloud, stopReading } = useSpeech();

  const attachments = useAttachments();

  const {
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
  } = useChat({
    attachments,
    stopReading,
  });

  const handleResetSession = useCallback(async () => {
    await clearChat();
  }, [clearChat]);

  const {
    projects,
    selectedProjectId,
    chats,
    currentChatId,
    handleCreateProject,
    handleSaveChat,
    handleOpenChat,
    handleDeleteChat,
    handleDeleteProject,
    handleSelectProject,
    handleNewChat,
  } = useProjects({
    messages,
    setMessages,
    onResetSession: handleResetSession,
  });

  return (
    <div className="cockpit-chassis">
      <div className="chassis-bolt top-left" aria-hidden="true" />
      <div className="chassis-bolt top-right" aria-hidden="true" />
      <div className="chassis-bolt bottom-left" aria-hidden="true" />
      <div className="chassis-bolt bottom-right" aria-hidden="true" />

      <main className="app">
        <Header
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          mode={mode}
          setMode={setMode}
          webAccess={webAccess}
          setWebAccess={setWebAccess}
          loading={loading}
          clearChat={clearChat}
        />

        <section className="workspace">
          <Sidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            chats={chats}
            currentChatId={currentChatId}
            loading={loading}
            hasMessages={messages.length > 0}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onOpenChat={handleOpenChat}
            onDeleteChat={handleDeleteChat}
            onNewChat={handleNewChat}
            onSaveChat={handleSaveChat}
          />

          <section className="main-panel">
            <ChatArea
              messages={messages}
              loading={loading}
              thinking={thinking}
              speakingMessage={speakingMessage}
              onReadAloud={readAloud}
              onStopReading={stopReading}
              bottomRef={bottomRef}
            />

            {loading && (
              <DocumentProgressBar documentProgress={attachments.documentProgress} />
            )}

            <StatsBar stats={stats} />

            <Composer
              attachments={attachments}
              input={input}
              setInput={setInput}
              onKeyDown={handleKeyDown}
              loading={loading}
              mode={mode}
              onSendMessage={sendMessage}
              onStopGeneration={stopGeneration}
            />
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;