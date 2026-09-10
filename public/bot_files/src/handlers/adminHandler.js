const { ADMIN_ID } = require("../config");
const { sendAdminPanel } = require("../services/profileService");
const { logBotError } = require("../services/errorLogger");
const { getUserLang } = require("../locales");

async function handleAdminCommand(bot, msg, appStore) {
  try {
    if (msg.text !== "/admin") {
      return false;
    }

    if (msg.from.id !== ADMIN_ID) {
      return true;
    }

    const user = appStore.findUserById(msg.from.id) || { language: "ar" };
    await sendAdminPanel(bot, msg.chat.id, { lang: getUserLang(user) });
    return true;
  } catch (error) {
    logBotError("handleAdminCommand", error, { userId: msg.from?.id });
    return false;
  }
}

module.exports = {
  handleAdminCommand,
};
