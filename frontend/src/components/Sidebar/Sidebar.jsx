import { RadarHud } from "./RadarHud";

export function Sidebar({
  projects,
  selectedProjectId,
  chats,
  currentChatId,
  loading,
  hasMessages,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onOpenChat,
  onDeleteChat,
  onNewChat,
  onSaveChat,
}) {
  return (
    <aside className="sidebar">
      {/* PROJECTS */}
      <section className="sidebar-block">
        <div className="sidebar-title">Projects</div>

        <button
          type="button"
          className="project-new"
          onClick={onCreateProject}
          disabled={loading}
        >
          + New Project
        </button>

        <div className="project-list">
          {projects.length === 0 ? (
            <div className="project-empty">No projects yet</div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={
                  selectedProjectId === project.id
                    ? "project-row active"
                    : "project-row"
                }
              >
                <button
                  type="button"
                  className="project-open"
                  onClick={() => onSelectProject(project.id)}
                  disabled={loading}
                  title={project.name}
                >
                  📁 {project.name}
                </button>

                <button
                  type="button"
                  className="project-delete"
                  onClick={() => onDeleteProject(project)}
                  disabled={loading}
                  title="Delete project"
                  aria-label={`Delete ${project.name}`}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CONVERSATIONS */}
      <section className="sidebar-block conversations-block">
        <div className="sidebar-title">Conversations</div>

        {!selectedProjectId ? (
          <div className="project-empty">Select a project</div>
        ) : chats.length === 0 ? (
          <div className="project-empty">No saved conversations</div>
        ) : (
          <div className="conversation-list">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={
                  currentChatId === chat.id
                    ? "conversation-row active"
                    : "conversation-row"
                }
              >
                <button
                  type="button"
                  className="conversation-open"
                  onClick={() => onOpenChat(chat)}
                  disabled={loading}
                  title={chat.title}
                >
                  💬 {chat.title}
                </button>

                <button
                  type="button"
                  className="conversation-delete"
                  onClick={() => onDeleteChat(chat)}
                  disabled={loading}
                  title="Delete conversation"
                  aria-label={`Delete ${chat.title}`}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="sidebar-chat-actions">
        <button
          type="button"
          className="project-new"
          onClick={onNewChat}
          disabled={loading}
        >
          + New Chat
        </button>

        <button
          type="button"
          className="save-chat-button"
          onClick={onSaveChat}
          disabled={loading || !hasMessages || !selectedProjectId}
        >
          💾 Save Chat
        </button>
      </div>

      {/* RADAR HUD TELEMETRY */}
      <RadarHud />
    </aside>
  );
}
