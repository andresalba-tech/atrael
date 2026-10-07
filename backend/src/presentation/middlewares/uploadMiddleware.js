const fs = require("fs");
const multer = require("multer");
const { TEMP_DIR } = require("../../config/env");

fs.mkdirSync(TEMP_DIR, { recursive: true });

const uploadMiddleware = multer({
  dest: TEMP_DIR,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

module.exports = uploadMiddleware;
