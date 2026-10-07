const DB_NAME = "atrael-local-db";
const DB_VERSION = 1;
const PROJECTS_STORE = "projects";
const CHATS_STORE = "chats";

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3050";

// Fallback en memoria cuando IndexedDB no está disponible (ej. entorno de tests jsdom)
const memoryStore = {
  projects: [],
  chats: [],
};

function hasIndexedDB() {
  return typeof indexedDB !== "undefined";
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
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

async function runTransaction(storeNames, mode, execute) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    try {
      result = execute(tx);
    } catch (err) {
      db.close();
      return reject(err);
    }

    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function mutateBackendStorage(mutator) {
  try {
    const currentRes = await fetch(`${API}/api/storage/conversations`);
    if (currentRes && typeof currentRes.json === "function") {
      const current = await currentRes.json();
      const { updatedProjects, updatedChats } = mutator(
        current?.projects || [],
        current?.chats || []
      );
      await fetch(`${API}/api/storage/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects: updatedProjects,
          chats: updatedChats,
        }),
      });
    }
  } catch (apiErr) {
    console.error("Backend storage sync fallback failed:", apiErr);
  }
}

// --------------------------------------------------
// SYNC WITH BACKEND STORAGE (AUTO-HEAL & DUAL BACKUP)
// --------------------------------------------------

export async function syncStorageToBackend() {
  if (!hasIndexedDB()) return;

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
  if (!hasIndexedDB()) return null;

  try {
    const res = await fetch(`${API}/api/storage/conversations`);
    if (!res || !res.ok || typeof res.json !== "function") return null;
    const data = await res.json();
    if (!data || !data.ok) return null;

    const { projects = [], chats = [] } = data;
    if (projects.length === 0 && chats.length === 0) return null;

    try {
      await runTransaction([PROJECTS_STORE, CHATS_STORE], "readwrite", (tx) => {
        const pStore = tx.objectStore(PROJECTS_STORE);
        const cStore = tx.objectStore(CHATS_STORE);
        for (const p of projects) {
          pStore.put(p);
        }
        for (const c of chats) {
          cStore.put(c);
        }
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

  if (!hasIndexedDB()) {
    memoryStore.projects.push(project);
    return project;
  }

  try {
    await runTransaction(PROJECTS_STORE, "readwrite", (tx) => {
      tx.objectStore(PROJECTS_STORE).put(project);
      return project;
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("Falling back to backend project creation:", err);
    memoryStore.projects.push(project);

    await mutateBackendStorage((projects, chats) => ({
      updatedProjects: [...projects, project],
      updatedChats: chats,
    }));
  }

  return project;
}

export async function getProjects() {
  if (!hasIndexedDB()) {
    return memoryStore.projects;
  }

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
      if (res && res.ok && typeof res.json === "function") {
        const data = await res.json();
        if (data && Array.isArray(data.projects) && data.projects.length > 0) {
          return data.projects;
        }
      }
    } catch (fetchErr) {
      console.error("Backend storage fallback also failed:", fetchErr);
    }
    return memoryStore.projects;
  }
}

export async function deleteProject(projectId) {
  memoryStore.projects = memoryStore.projects.filter((p) => p.id !== projectId);
  memoryStore.chats = memoryStore.chats.filter((c) => c.projectId !== projectId);

  if (!hasIndexedDB()) {
    return;
  }

  try {
    const chats = await getChatsByProjectLocal(projectId);
    await runTransaction([PROJECTS_STORE, CHATS_STORE], "readwrite", (tx) => {
      tx.objectStore(PROJECTS_STORE).delete(projectId);
      const chatsStore = tx.objectStore(CHATS_STORE);
      for (const chat of chats) {
        chatsStore.delete(chat.id);
      }
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("deleteProject falling back to backend:", err);
    await mutateBackendStorage((projects, chats) => ({
      updatedProjects: projects.filter((p) => p.id !== projectId),
      updatedChats: chats.filter((c) => c.projectId !== projectId),
    }));
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

  const updateMemory = () => {
    const existingIdx = memoryStore.chats.findIndex((c) => c.id === chat.id);
    if (existingIdx >= 0) {
      chat.createdAt = memoryStore.chats[existingIdx].createdAt;
      memoryStore.chats[existingIdx] = chat;
    } else {
      memoryStore.chats.push(chat);
    }
  };

  if (!hasIndexedDB()) {
    updateMemory();
    return chat;
  }

  try {
    await runTransaction(CHATS_STORE, "readwrite", (tx) => {
      const store = tx.objectStore(CHATS_STORE);

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
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("saveChat falling back to backend:", err);
    updateMemory();

    await mutateBackendStorage((projects, chats) => {
      const foundIdx = chats.findIndex((c) => c.id === chat.id);
      let updatedChats;
      if (foundIdx >= 0) {
        chat.createdAt = chats[foundIdx].createdAt;
        updatedChats = [...chats];
        updatedChats[foundIdx] = chat;
      } else {
        updatedChats = [...chats, chat];
      }
      return {
        updatedProjects: projects,
        updatedChats,
      };
    });
  }

  return chat;
}

export async function getChatsByProject(projectId) {
  if (!hasIndexedDB()) {
    return memoryStore.chats.filter((chat) => chat.projectId === projectId);
  }

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
      if (res && res.ok && typeof res.json === "function") {
        const data = await res.json();
        if (data && Array.isArray(data.chats)) {
          return data.chats.filter((chat) => chat.projectId === projectId);
        }
      }
    } catch (fetchErr) {
      console.error("Backend storage fallback also failed:", fetchErr);
    }
    return memoryStore.chats.filter((chat) => chat.projectId === projectId);
  }
}

export async function deleteChat(chatId) {
  memoryStore.chats = memoryStore.chats.filter((c) => c.id !== chatId);

  if (!hasIndexedDB()) {
    return;
  }

  try {
    await runTransaction(CHATS_STORE, "readwrite", (tx) => {
      tx.objectStore(CHATS_STORE).delete(chatId);
    });

    syncStorageToBackend().catch(() => {});
  } catch (err) {
    console.warn("deleteChat falling back to backend:", err);
    await mutateBackendStorage((projects, chats) => ({
      updatedProjects: projects,
      updatedChats: chats.filter((c) => c.id !== chatId),
    }));
  }
}