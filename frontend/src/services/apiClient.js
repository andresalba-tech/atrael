export const API =
  import.meta.env.VITE_API_URL || "http://localhost:3050";

/**
 * Upload a document file to the backend
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API}/api/files/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Upload failed.");
  }
  return data;
}

/**
 * Delete a document by ID from the backend
 */
export async function deleteDocument(documentId) {
  if (!documentId) return;
  return fetch(`${API}/api/files/${documentId}`, {
    method: "DELETE",
  }).catch(() => {});
}

/**
 * Send chat message stream request
 */
export async function sendChatStream({
  messages,
  mode,
  model,
  webAccess,
  signal,
}) {
  const response = await fetch(`${API}/api/chat`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      mode,
      model,
      webAccess,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response;
}

/**
 * Send document analyze stream request
 */
export async function sendDocumentAnalyzeStream({
  documentId,
  instruction,
  messages,
  mode,
  model,
  webAccess,
  signal,
}) {
  const payload = {
    documentId,
    instruction,
    ...(messages && messages.length > 0 ? { messages } : {}),
    mode,
    model,
    ...(webAccess ? { webAccess } : {}),
  };

  const response = await fetch(`${API}/api/document/analyze`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response;
}
