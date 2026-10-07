const path = require("path");

const PORT = process.env.PORT || 3050;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_NUM_THREAD = parseInt(process.env.OLLAMA_NUM_THREAD || "8", 10);
const DEFAULT_MODEL = "qwen3.5:4b";

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const TEMP_DIR = path.join(ROOT_DIR, "local-data", "uploads");
const CONVERSATIONS_FILE = path.join(ROOT_DIR, "local-data", "conversations.json");
const CREATOR_PROFILE_PATH = path.join(ROOT_DIR, "creator-profile.md");

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5180",
  "http://127.0.0.1:5180",
]);

module.exports = {
  PORT,
  OLLAMA_URL,
  OLLAMA_NUM_THREAD,
  DEFAULT_MODEL,
  TEMP_DIR,
  CONVERSATIONS_FILE,
  CREATOR_PROFILE_PATH,
  ALLOWED_ORIGINS,
};
