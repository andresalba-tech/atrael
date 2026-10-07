/**
 * Helper para inicializar y gestionar streams HTTP con formato NDJSON (SSE).
 * Cumple con DRY eliminando la duplicación de cabeceras, abort controllers y serialización.
 */
function initNdjsonStream(res) {
  const controller = new AbortController();

  res.on("close", () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  let headersFlushed = false;

  const ensureHeaders = () => {
    if (!headersFlushed) {
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      headersFlushed = true;
    }
  };

  const send = (data) => {
    ensureHeaders();
    if (!res.writableEnded) {
      res.write(JSON.stringify(data) + "\n");
    }
  };

  const sendError = (error) => {
    if (error.name === "AbortError") {
      return;
    }

    console.error(error);

    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }

    if (!res.writableEnded) {
      send({
        type: "error",
        message: error.message,
      });
      res.end();
    }
  };

  const end = () => {
    if (!res.writableEnded) {
      res.end();
    }
  };

  return {
    signal: controller.signal,
    send,
    sendError,
    end,
    ensureHeaders,
  };
}

module.exports = {
  initNdjsonStream,
};
