const { logBotError } = require("./errorLogger");

async function safeTelegramCall(scope, fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    logBotError(scope, error);
    return fallback;
  }
}

module.exports = {
  safeTelegramCall,
};
