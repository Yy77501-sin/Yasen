const { getBotCommands, getUserLang, t } = require("../locales");
const { sendMainMenu, sendAccountMenu, sendSettingsMenu } = require("./profileService");
const { sendTopupHome } = require("./topupService");
const { safeTelegramCall } = require("./telegramSafe");
const { PUBLIC_BASE_URL, TELEGRAM_WEBAPP_URL } = require("../config");

function resolveWebAppUrl(lang = "ar") {
  const version = String(process.env.WEBAPP_VERSION || "2026-04-28-2");
  const explicit = String(TELEGRAM_WEBAPP_URL || "").trim();
  if (explicit) {
    const hasQuery = explicit.includes("?");
    return `${explicit}${hasQuery ? "&" : "?"}v=${encodeURIComponent(version)}`;
  }
  const base = String(PUBLIC_BASE_URL || "").trim();
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}/webapp/app?lang=${lang === "en" ? "en" : "ar"}&v=${encodeURIComponent(version)}`;
}

async function setupBotCommands(bot) {
  await safeTelegramCall("setupBotCommands.default", () => bot.setMyCommands(getBotCommands("en")));
  await safeTelegramCall("setupBotCommands.en", () => bot.setMyCommands(getBotCommands("en"), { language_code: "en" }));
  await safeTelegramCall("setupBotCommands.ar", () => bot.setMyCommands(getBotCommands("ar"), { language_code: "ar" }));
}

async function handleMenuCommand(bot, msg, appStore) {
  const user = appStore.getOrCreateUser(msg.from);
  await sendMainMenu(bot, msg.chat.id, user);
}

async function handleAccountCommand(bot, msg, appStore) {
  const user = appStore.getOrCreateUser(msg.from);
  await sendAccountMenu(bot, msg.chat.id, user);
}

async function handleAddFundsCommand(bot, msg, appStore) {
  const user = appStore.getOrCreateUser(msg.from);
  await sendTopupHome(bot, msg.chat.id, { lang: getUserLang(user), user });
}

async function handleSettingsCommand(bot, msg, appStore) {
  const user = appStore.getOrCreateUser(msg.from);
  await sendSettingsMenu(bot, msg.chat.id, { lang: getUserLang(user) });
}

async function handleSupportCommand(bot, msg, appStore) {
  const user = appStore.getOrCreateUser(msg.from);
  const lang = getUserLang(user);

  await safeTelegramCall("handleSupportCommand", () =>
    bot.sendMessage(msg.chat.id, t(lang, "support_text"), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: t(lang, "btn_support"), url: "https://t.me/Engineeer000" }]],
      },
    })
  );
}

async function handleAppCommand(bot, msg, appStore) {
  const user = appStore.getOrCreateUser(msg.from);
  const lang = getUserLang(user);
  const url = resolveWebAppUrl(lang);
  if (!url) {
    await safeTelegramCall("handleAppCommand.missingUrl", () =>
      bot.sendMessage(
        msg.chat.id,
        lang === "ar"
          ? "رابط تطبيق VaultX Pro غير مضبوط بعد. أضف PUBLIC_BASE_URL أو TELEGRAM_WEBAPP_URL."
          : "VaultX Pro URL is not configured yet. Set PUBLIC_BASE_URL or TELEGRAM_WEBAPP_URL."
      )
    );
    return;
  }

  await safeTelegramCall("handleAppCommand.send", () =>
    bot.sendMessage(
      msg.chat.id,
      lang === "ar" ? "🚀 افتح تطبيق VaultX Pro من الزر أدناه:" : "🚀 Open VaultX Pro from the button below:",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🚀 VaultX Pro App", web_app: { url } }]],
        },
      }
    )
  );
}

module.exports = {
  setupBotCommands,
  handleMenuCommand,
  handleAccountCommand,
  handleAddFundsCommand,
  handleSupportCommand,
  handleSettingsCommand,
  handleAppCommand,
};
