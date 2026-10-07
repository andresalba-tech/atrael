const { createApp } = require("./src/app");
const { PORT, DEFAULT_MODEL } = require("./src/config/env");

const { app } = createApp();

function startServer() {
  return app.listen(PORT, "127.0.0.1", () => {
    console.log("");
    console.log("Atrael backend running");
    console.log(`http://localhost:${PORT}`);
    console.log("");
    console.log(`Default model: ${DEFAULT_MODEL}`);
    console.log("FAST    → 16K / thinking OFF");
    console.log("QUALITY → 32K / thinking ON");
    console.log("");
    console.log("Local document support:");
    console.log("PDF DOCX TXT MD XLSX XLS CSV");
    console.log("");
  });
}

// Running directly:
// node server.js
if (require.main === module) {
  startServer();
}

// Imported by tests:
// require("./server")
module.exports = {
  app,
  startServer,
};