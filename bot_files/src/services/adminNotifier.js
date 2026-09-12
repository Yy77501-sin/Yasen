const { ADMIN_ID, ADMIN_IDS } = require("../config");
const { safeTelegramCall } = require("./telegramSafe");
const { logBotError } = require("./errorLogger");

let globalBotInstance = null;
const alertCooldowns = new Map();

function setAdminNotifierBot(bot) {
  globalBotInstance = bot;
}

/**
 * Sends an urgent alert message to all configured admins.
 * Includes a built-in throttle (cooldown) to avoid spamming the admin on repeated errors.
 *
 * @param {object|null} bot - Telegram bot instance (optional if set globally)
 * @param {string} text - HTML formatted alert text
 * @param {object} options - Options like alertKey and cooldownMs
 */
async function notifyAdminAlert(bot = null, text = "", options = {}) {
  const activeBot = bot || globalBotInstance;
  if (!activeBot) {
    return null;
  }

  const alertKey = options.alertKey || text.slice(0, 50);
  const cooldownMs = options.cooldownMs ?? 120000; // 2 minutes cooldown by default per alert key

  const now = Date.now();
  const lastAlert = alertCooldowns.get(alertKey);
  if (lastAlert && now - lastAlert < cooldownMs && !options.ignoreCooldown) {
    return null;
  }
  alertCooldowns.set(alertKey, now);

  const targetIds = Array.isArray(ADMIN_IDS) && ADMIN_IDS.length > 0 ? ADMIN_IDS : [ADMIN_ID];
  const validIds = targetIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0);

  if (!validIds.length) {
    return null;
  }

  const promises = validIds.map((adminId) =>
    safeTelegramCall("notifyAdminAlert", () =>
      activeBot.sendMessage(adminId, text, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      })
    ).catch((err) => {
      logBotError("notifyAdminAlert.send", err, { adminId });
      return null;
    })
  );

  return Promise.all(promises);
}

module.exports = {
  setAdminNotifierBot,
  notifyAdminAlert,
};
