const { safeTelegramCall } = require("./telegramSafe");
const { getBackToMainMenuKeyboard } = require("../keyboards/mainMenuKeyboard");

async function sendPlaceholderReply(bot, chatId, title, messageId) {
  const text = [
    `<b>=== ${title} ===</b>`,
    "",
    "جاري برمجة هذا القسم...",
  ].join("\n");

  if (messageId) {
    return safeTelegramCall("placeholder.edit", () =>
      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: getBackToMainMenuKeyboard(),
      })
    );
  }

  return safeTelegramCall("placeholder.send", () =>
    bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: getBackToMainMenuKeyboard(),
    })
  );
}

module.exports = {
  sendPlaceholderReply,
};
