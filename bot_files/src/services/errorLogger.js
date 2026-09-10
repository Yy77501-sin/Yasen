const fs = require("fs");
const { BOT_ERRORS_PATH } = require("../config");

const botErrors = [];
const recentErrorMap = new Map();
const DEDUPE_WINDOW_MS = 30 * 1000;

function loadExistingErrors() {
  try {
    if (!fs.existsSync(BOT_ERRORS_PATH)) {
      return;
    }

    const parsed = JSON.parse(fs.readFileSync(BOT_ERRORS_PATH, "utf8") || "[]");
    if (Array.isArray(parsed)) {
      botErrors.push(...parsed);
    }
  } catch (error) {
    console.error("Failed to load bot errors:", error.message);
  }
}

function persistErrors() {
  try {
    fs.writeFileSync(BOT_ERRORS_PATH, JSON.stringify(botErrors.slice(-200), null, 2), "utf8");
  } catch (error) {
    console.error("Failed to persist bot errors:", error.message);
  }
}

function logBotError(scope, error, meta = {}) {
  const message = error?.message || String(error);
  const dedupeKey = `${scope}::${message}`;
  const now = Date.now();
  const existing = recentErrorMap.get(dedupeKey);
  if (existing && now - existing < DEDUPE_WINDOW_MS) {
    return null;
  }
  recentErrorMap.set(dedupeKey, now);

  const entry = {
    scope,
    message,
    stack: error?.stack || null,
    meta,
    createdAt: new Date().toISOString(),
  };

  botErrors.push(entry);
  persistErrors();
  console.error(`[${scope}]`, entry.message);
  return entry;
}

function getRecentErrors(limit = 5) {
  return botErrors.slice(-limit).reverse();
}

loadExistingErrors();

module.exports = {
  botErrors,
  logBotError,
  getRecentErrors,
};
