const DB_NAME = "atrael-local-db";
const DB_VERSION = 1;
const PROJECTS_STORE = "projects";
const CHATS_STORE = "chats";

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3050";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB is not supported in this environment."));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projects = db.createObjectStore(PROJECTS_STORE, {
          keyPath: "id",
        });
        projects.createIndex("createdAt", "createdAt");
      }

      if (!db.objectStoreNames.contains(CHATS_STORE)) {
        const chats = db.createObjectStore(CHATS_STORE, {
          keyPath: "id",
        });
        chats.createIndex("projectId", "projectId");
        chats.createIndex("updatedAt", "updatedAt");
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

// --------------------------------------------------
// SYNC WITH BACKEND STORAGE (AUTO-HEAL & DUAL BACKUP)
// --------------------------------------------------

export async function syncStorageToBackend() {
  try {
    const projects = await getProjectsLocal();
    const chats = await getAllChatsLocal();
    await fetch(`${API}/api/storage/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects, chats }),
    });
  } catch (err) {
    console.warn("Storage sync to backend deferred:", err?.message || err);
  }
}

export async function syncStorageFromBackend() {
  try {
    const res = await fetch(`${API}/api/storage/conversations`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok) return null;

    const { projects = [], chats = [] } = data;
    if (projects.length === 0 && chats.length === 0) return null;

    try {
      const db = await openDatabase();
      await new Promise((resolve, reject) => {
        const tx = db.transaction([PROJECTS_STORE, CHATS_STORE], "readwrite");
        const pStore = tx.objectStore(PROJECTS_STORE);
        const cStore = tx.objectStore(CHATS_STORE);

        for (const p of projects) {
          pStore.put(p);
        }
        for (const c of chats) {
          cStore.put(c);
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch (idbErr) {
      console.warn("Could not save synced backend data to IndexedDB:", idbErr?.message || idbErr);
    }

    return { projects, chats };
  } catch (err) {
    console.warn("Could not sync from backend:", err?.message || err);
    return null;
  }
}

// --------------------------------------------------
// INTERNAL LOCAL HELPERS
// --------------------------------------------------

async function getProjectsLocal() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS_STORE, "readonly");
    const request = transaction.objectStore(PROJECTS_STORE).getAll();

    request.onsuccess = () => {
      const projects = request.result.sort((a, b) => a.createdAt - b.createdAt);
      db.close();
      resolve(projects);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function getAllChatsLocal() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHATS_STORE, "readonly");
    const request = transaction.objectStore(CHATS_STORE).getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function getChatsByProjectLocal(projectId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHATS_STORE, "readonly");
    const request = transaction
      .objectStore(CHATS_STORE)
      .index("projectId")
      .getAll(projectId);

    request.onsuccess = () => {
      const chats = request.result.sort((a, b) => b.updatedAt - a.updatedAt);
      db.close();
      resolve(chats);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// --------------------------------------------------
// PROJECTS API
// --------------------------------------------------

export async function createProject(name) {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error("Project name is required.");
  }

  const project = {
    id: createId("project"),
    name: cleanName,
    createdAt: Date.now(),
  };

  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PROJECTS_STORE, "readwrite");
      transaction.objectStore(PROJECTS_STORE).put(project);

      transaction.oncomplete = () => {
        db.close();
        resolve(project);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("Falling back to backend project creation:", err);
    try {
      const currentRes = await fetch(`${API}/api/storage/conversations`);
      const current = await currentRes.json();
      const updatedProjects = [...(current.projects || []), project];
      await fetch(`${API}/api/storage/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: updatedProjects, chats: current.chats || [] }),
      });
    } catch (apiErr) {
      console.error("Backend fallback failed:", apiErr);
    }
  }

  return project;
}

export async function getProjects() {
  try {
    let projects = await getProjectsLocal();

    if (!projects || projects.length === 0) {
      const restored = await syncStorageFromBackend();
      if (restored && restored.projects && restored.projects.length > 0) {
        projects = await getProjectsLocal();
      }
    }

    return projects || [];
  } catch (error) {
    console.warn("IndexedDB getProjects failed, falling back to backend storage:", error);
    try {
      const res = await fetch(`${API}/api/storage/conversations`);
      if (res.ok) {
        const data = await res.json();
        return data.projects || [];
      }
    } catch (fetchErr) {
      console.error("Backend storage fallback also failed:", fetchErr);
    }
    return [];
  }
}

export async function deleteProject(projectId) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE, CHATS_STORE], "readwrite");
      transaction.objectStore(PROJECTS_STORE).delete(projectId);

      const chatsStore = transaction.objectStore(CHATS_STORE);
      const projectIndex = chatsStore.index("projectId");
      const request = projectIndex.openCursor(IDBKeyRange.only(projectId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("deleteProject falling back to backend:", err);
    try {
      const currentRes = await fetch(`${API}/api/storage/conversations`);
      const current = await currentRes.json();
      const updatedProjects = (current.projects || []).filter((p) => p.id !== projectId);
      const updatedChats = (current.chats || []).filter((c) => c.projectId !== projectId);
      await fetch(`${API}/api/storage/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: updatedProjects, chats: updatedChats }),
      });
    } catch (apiErr) {
      console.error("Backend deleteProject fallback failed:", apiErr);
    }
  }
}

// --------------------------------------------------
// CHATS API
// --------------------------------------------------

export async function saveChat({ id, projectId, title, messages }) {
  if (!projectId) {
    throw new Error("A project is required.");
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("There is nothing to save.");
  }

  const now = Date.now();
  const safeMessages = messages.map((message) => ({
    role: message.role,
    content: message.content || "",
    model: message.model || null,
    webUsed: Boolean(message.webUsed),
    documentName: message.documentName || null,
  }));

  const chat = {
    id: id || createId("chat"),
    projectId,
    title: title.trim() || "Untitled chat",
    messages: safeMessages,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(CHATS_STORE, "readwrite");
      const store = transaction.objectStore(CHATS_STORE);

      if (id) {
        const existingRequest = store.get(id);
        existingRequest.onsuccess = () => {
          if (existingRequest.result) {
            chat.createdAt = existingRequest.result.createdAt;
          }
          store.put(chat);
        };
      } else {
        store.put(chat);
      }

      transaction.oncomplete = () => {
        db.close();
        resolve(chat);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("saveChat falling back to backend:", err);
    try {
      const currentRes = await fetch(`${API}/api/storage/conversations`);
      const current = await currentRes.json();
      const existingIdx = (current.chats || []).findIndex((c) => c.id === chat.id);
      let updatedChats;
      if (existingIdx >= 0) {
        chat.createdAt = current.chats[existingIdx].createdAt;
        updatedChats = [...current.chats];
        updatedChats[existingIdx] = chat;
      } else {
        updatedChats = [...(current.chats || []), chat];
      }
      await fetch(`${API}/api/storage/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: current.projects || [], chats: updatedChats }),
      });
    } catch (apiErr) {
      console.error("Backend saveChat fallback failed:", apiErr);
    }
  }

  return chat;
}

export async function getChatsByProject(projectId) {
  try {
    let chats = await getChatsByProjectLocal(projectId);

    if (!chats || chats.length === 0) {
      const restored = await syncStorageFromBackend();
      if (restored) {
        chats = await getChatsByProjectLocal(projectId);
      }
    }

    return chats || [];
  } catch (error) {
    console.warn("IndexedDB getChatsByProject failed, falling back to backend storage:", error);
    try {
      const res = await fetch(`${API}/api/storage/conversations`);
      if (res.ok) {
        const data = await res.json();
        return (data.chats || []).filter((chat) => chat.projectId === projectId);
      }
    } catch (fetchErr) {
      console.error("Backend storage fallback also failed:", fetchErr);
    }
    return [];
  }
}

export async function deleteChat(chatId) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(CHATS_STORE, "readwrite");
      transaction.objectStore(CHATS_STORE).delete(chatId);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("deleteChat falling back to backend:", err);
    try {
      const currentRes = await fetch(`${API}/api/storage/conversations`);
      const current = await currentRes.json();
      const updatedChats = (current.chats || []).filter((c) => c.id !== chatId);
      await fetch(`${API}/api/storage/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: current.projects || [], chats: updatedChats }),
      });
    } catch (apiErr) {
      console.error("Backend deleteChat fallback failed:", apiErr);
    }
  }
}