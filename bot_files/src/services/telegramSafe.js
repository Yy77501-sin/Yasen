const { logBotError } = require("./errorLogger");

function isIgnorableTelegramError(error) {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("chat not found") ||
    msg.includes("bot was blocked by the user") ||
    msg.includes("user is deactivated") ||
    msg.includes("bot is not a member of the channel") ||
    msg.includes("have no rights to send a message") ||
    msg.includes("message is not modified") ||
    msg.includes("query is too old") ||
    msg.includes("message to edit not found")
  );
}

async function safeTelegramCall(scope, fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    if (isIgnorableTelegramError(error)) {
      return fallback;
    }
    logBotError(scope, error);
    return fallback;
  }
}

module.exports = {
  safeTelegramCall,
  isIgnorableTelegramError,
};

