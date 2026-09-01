const DB_NAME =
  "atrael-local-db";

const DB_VERSION =
  1;

const PROJECTS_STORE =
  "projects";

const CHATS_STORE =
  "chats";

function openDatabase() {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              PROJECTS_STORE
            )
          ) {
            const projects =
              db.createObjectStore(
                PROJECTS_STORE,
                {
                  keyPath:
                    "id",
                }
              );

            projects.createIndex(
              "createdAt",
              "createdAt"
            );
          }

          if (
            !db.objectStoreNames.contains(
              CHATS_STORE
            )
          ) {
            const chats =
              db.createObjectStore(
                CHATS_STORE,
                {
                  keyPath:
                    "id",
                }
              );

            chats.createIndex(
              "projectId",
              "projectId"
            );

            chats.createIndex(
              "updatedAt",
              "updatedAt"
            );
          }
        };

      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };
    }
  );
}

function createId(
  prefix
) {
  return `${prefix}-${crypto.randomUUID()}`;
}

// --------------------------------------------------
// PROJECTS
// --------------------------------------------------

export async function createProject(
  name
) {
  const cleanName =
    name.trim();

  if (!cleanName) {
    throw new Error(
      "Project name is required."
    );
  }

  const db =
    await openDatabase();

  const project = {
    id:
      createId(
        "project"
      ),

    name:
      cleanName,

    createdAt:
      Date.now(),
  };

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          PROJECTS_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          PROJECTS_STORE
        )
        .put(
          project
        );

      transaction.oncomplete =
        () => {
          db.close();

          resolve(
            project
          );
        };

      transaction.onerror =
        () => {
          db.close();

          reject(
            transaction.error
          );
        };
    }
  );
}

export async function getProjects() {
  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          PROJECTS_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            PROJECTS_STORE
          )
          .getAll();

      request.onsuccess =
        () => {
          const projects =
            request.result.sort(
              (
                a,
                b
              ) =>
                a.createdAt -
                b.createdAt
            );

          db.close();

          resolve(
            projects
          );
        };

      request.onerror =
        () => {
          db.close();

          reject(
            request.error
          );
        };
    }
  );
}

export async function deleteProject(
  projectId
) {
  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          [
            PROJECTS_STORE,
            CHATS_STORE,
          ],
          "readwrite"
        );

      transaction
        .objectStore(
          PROJECTS_STORE
        )
        .delete(
          projectId
        );

      const chatsStore =
        transaction
          .objectStore(
            CHATS_STORE
          );

      const projectIndex =
        chatsStore.index(
          "projectId"
        );

      const request =
        projectIndex
          .openCursor(
            IDBKeyRange.only(
              projectId
            )
          );

      request.onsuccess =
        () => {
          const cursor =
            request.result;

          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };

      transaction.oncomplete =
        () => {
          db.close();

          resolve();
        };

      transaction.onerror =
        () => {
          db.close();

          reject(
            transaction.error
          );
        };
    }
  );
}

// --------------------------------------------------
// CHATS
// --------------------------------------------------

export async function saveChat({
  id,
  projectId,
  title,
  messages,
}) {
  if (!projectId) {
    throw new Error(
      "A project is required."
    );
  }

  if (
    !Array.isArray(
      messages
    ) ||
    messages.length === 0
  ) {
    throw new Error(
      "There is nothing to save."
    );
  }

  const db =
    await openDatabase();

  const now =
    Date.now();

  const safeMessages =
    messages.map(
      (message) => ({
        role:
          message.role,

        content:
          message.content ||
          "",

        model:
          message.model ||
          null,

        webUsed:
          Boolean(
            message.webUsed
          ),

        documentName:
          message.documentName ||
          null,
      })
    );

  const chat = {
    id:
      id ||
      createId(
        "chat"
      ),

    projectId,

    title:
      title.trim() ||
      "Untitled chat",

    messages:
      safeMessages,

    createdAt:
      now,

    updatedAt:
      now,
  };

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          CHATS_STORE,
          "readwrite"
        );

      const store =
        transaction
          .objectStore(
            CHATS_STORE
          );

      if (id) {
        const existingRequest =
          store.get(
            id
          );

        existingRequest.onsuccess =
          () => {
            if (
              existingRequest.result
            ) {
              chat.createdAt =
                existingRequest
                  .result
                  .createdAt;
            }

            store.put(
              chat
            );
          };
      } else {
        store.put(
          chat
        );
      }

      transaction.oncomplete =
        () => {
          db.close();

          resolve(
            chat
          );
        };

      transaction.onerror =
        () => {
          db.close();

          reject(
            transaction.error
          );
        };
    }
  );
}

export async function getChatsByProject(
  projectId
) {
  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          CHATS_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            CHATS_STORE
          )
          .index(
            "projectId"
          )
          .getAll(
            projectId
          );

      request.onsuccess =
        () => {
          const chats =
            request.result.sort(
              (
                a,
                b
              ) =>
                b.updatedAt -
                a.updatedAt
            );

          db.close();

          resolve(
            chats
          );
        };

      request.onerror =
        () => {
          db.close();

          reject(
            request.error
          );
        };
    }
  );
}

export async function deleteChat(
  chatId
) {
  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          CHATS_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          CHATS_STORE
        )
        .delete(
          chatId
        );

      transaction.oncomplete =
        () => {
          db.close();

          resolve();
        };

      transaction.onerror =
        () => {
          db.close();

          reject(
            transaction.error
          );
        };
    }
  );
}