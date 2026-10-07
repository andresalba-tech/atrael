const cors = require("cors");
const { ALLOWED_ORIGINS } = require("../../config/env");

const corsMiddleware = cors({
  origin(origin, callback) {
    // Permitir requests sin origin (tests, curl, herramientas locales)
    if (!origin) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
});

module.exports = corsMiddleware;
