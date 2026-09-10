const { ADMIN_ID, LOG_CHANNEL_ID } = require("../config");
const { getLanguageKeyboard } = require("../keyboards/languageKeyboard");
const { sendMainMenu } = require("../services/profileService");
const { setUserState, getUserState, clearUserState } = require("../services/stateStore");
const { safeTelegramCall } = require("../services/telegramSafe");
const { logBotError } = require("../services/errorLogger");
const { escapeHtml, getDisplayName, getDisplayUsername } = require("../utils/formatters");
const { getUserLang, t } = require("../locales");

function generateCaptchaCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

async function notifyAdmin(bot, text) {
  if (!ADMIN_ID) {
    return null;
  }

  return safeTelegramCall("notifyAdmin", () =>
    bot.sendMessage(ADMIN_ID, text, {
      parse_mode: "HTML",
      disable_notification: true,
    })
  );
}

async function sendLanguageMenu(bot, chatId, messageId) {
  try {
    const text = t("ar", "start_language_prompt");
    const payload = {
      parse_mode: "HTML",
      reply_markup: getLanguageKeyboard(),
    };

    if (messageId) {
      return await safeTelegramCall("sendLanguageMenu.edit", () =>
        bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          ...payload,
        })
      );
    }

    return await safeTelegramCall("sendLanguageMenu.send", () => bot.sendMessage(chatId, text, payload));
  } catch (error) {
    logBotError("sendLanguageMenu", error, { chatId, messageId });
    return null;
  }
}

async function sendCaptchaChallenge(bot, chatId, userId, lang = "ar") {
  try {
    const captchaCode = generateCaptchaCode();
    setUserState(userId, "AWAITING_CAPTCHA", { captchaCode });

    return await safeTelegramCall("sendCaptchaChallenge", () =>
      bot.sendMessage(
        chatId,
        [`<b>${t(lang, "start_captcha_title")}</b>`, "", `${t(lang, "start_captcha_prompt")} <code>${captchaCode}</code>`].join("\n"),
        { parse_mode: "HTML" }
      )
    );
  } catch (error) {
    logBotError("sendCaptchaChallenge", error, { chatId, userId });
    return null;
  }
}

async function logRegistration(bot, user) {
  try {
    const text = [
      "<b>=== New Verified User ===</b>",
      "",
      `👤 ${escapeHtml(getDisplayName(user))}`,
      `🆔 <code>${user.userId}</code>`,
      `🔗 ${escapeHtml(getDisplayUsername(user))}`,
    ].join("\n");

    await safeTelegramCall("logRegistration.channel", () =>
      bot.sendMessage(LOG_CHANNEL_ID, text, {
        parse_mode: "HTML",
        disable_notification: true,
      })
    );

    await notifyAdmin(
      bot,
      ["<b>New Registration</b>", `User: ${escapeHtml(getDisplayName(user))}`, `ID: <code>${user.userId}</code>`].join("\n")
    );
  } catch (error) {
    logBotError("logRegistration", error, { userId: user.userId });
  }
}

async function applyReferralReward(bot, user, appStore) {
  try {
    if (!user.invitedBy || user.referralRewarded) {
      return user;
    }

    const referrer = appStore.findUserById(user.invitedBy);
    if (!referrer) {
      return user;
    }

    appStore.addBalance(referrer.userId, 0.2);
    appStore.updateUser(user.userId, { referralRewarded: true });
    appStore.addTransaction({
      type: "referral_reward",
      userId: referrer.userId,
      targetUserId: user.userId,
      amount: 0.2,
      note: "New user captcha completed",
    });

    const refLang = getUserLang(referrer);
    await safeTelegramCall("applyReferralReward.notify", () =>
      bot.sendMessage(referrer.userId, [`<b>=== ${t(refLang, "btn_referral")} ===</b>`, "", t(refLang, "referral_reward_notice")].join("\n"), {
        parse_mode: "HTML",
      })
    );

    return appStore.findUserById(user.userId);
  } catch (error) {
    logBotError("applyReferralReward", error, { userId: user.userId });
    return user;
  }
}

async function handleStart(bot, msg, appStore) {
  try {
    const payload = msg.text.split(/\s+/)[1];
    const invitedBy = payload && /^\d+$/.test(payload) && Number(payload) !== msg.from.id ? payload : null;
    const user = appStore.getOrCreateUser(msg.from, { invitedBy });

    if (!user.language || !user.isVerified) {
      await sendLanguageMenu(bot, msg.chat.id);
      return;
    }

    if (payload && payload.startsWith("vn_buy_")) {
      const parts = payload.split("_");
      if (parts.length >= 5) {
        const serverKey = parts[2];
        const appKey = parts[3];
        const countryId = parts.slice(4).join("_");
        const lang = getUserLang(user);
        await safeTelegramCall("handleStart.vnBuyPayload", () =>
          bot.sendMessage(
            msg.chat.id,
            lang === "ar"
              ? "⚡ تم فتح الطلب من قناة التفعيلات\nاضغط للمتابعة بنفس السيرفر."
              : "⚡ Request opened from activations channel.\nTap to continue with the same server.",
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: lang === "ar" ? "🧩 متابعة الشراء" : "🧩 Continue Purchase", callback_data: `vnm:country:${serverKey}:${appKey}:${countryId}:0` }],
                  [{ text: t(lang, "common_back_main"), callback_data: "menu:main" }],
                ],
              },
            }
          )
        );
        return;
      }
    }

    clearUserState(user.userId);
    await sendMainMenu(bot, msg.chat.id, user);
  } catch (error) {
    logBotError("handleStart", error, { userId: msg.from?.id });
  }
}

async function handleLanguageSelection(bot, query, appStore) {
  try {
    const selectedLanguage = query.data === "setlang_en" ? "en" : "ar";
    const user = appStore.getOrCreateUser(query.from);
    const updatedUser = appStore.updateUser(user.userId, { language: selectedLanguage });

    await safeTelegramCall("handleLanguageSelection.answer", () =>
      bot.answerCallbackQuery(query.id, {
        text: t(selectedLanguage, selectedLanguage === "ar" ? "start_lang_saved_ar" : "start_lang_saved_en"),
      })
    );

    if (!updatedUser) {
      return;
    }

    if (!updatedUser.isVerified) {
      await sendCaptchaChallenge(bot, query.message.chat.id, updatedUser.userId, selectedLanguage);
      return;
    }

    await sendMainMenu(bot, query.message.chat.id, updatedUser, { messageId: query.message.message_id });
  } catch (error) {
    logBotError("handleLanguageSelection", error, { userId: query.from?.id });
  }
}

async function handleCaptchaInput(bot, msg, appStore) {
  try {
    const state = getUserState(msg.from.id);
    const user = appStore.findUserById(msg.from.id);

    if (!state || state.name !== "AWAITING_CAPTCHA" || !user) {
      return false;
    }

    const lang = getUserLang(user);

    if (msg.text.trim() !== state.captchaCode) {
      await safeTelegramCall("handleCaptchaInput.invalid", () => bot.sendMessage(msg.chat.id, t(lang, "start_captcha_invalid")));
      await sendCaptchaChallenge(bot, msg.chat.id, msg.from.id, lang);
      return true;
    }

    let updatedUser = appStore.updateUser(msg.from.id, { isVerified: true });
    clearUserState(msg.from.id);

    await safeTelegramCall("handleCaptchaInput.success", () =>
      bot.sendMessage(msg.chat.id, t(lang, "start_captcha_success"), { parse_mode: "HTML" })
    );

    if (!user.isVerified) {
      await logRegistration(bot, updatedUser);
      updatedUser = await applyReferralReward(bot, updatedUser, appStore);
    }

    await sendMainMenu(bot, msg.chat.id, updatedUser);
    return true;
  } catch (error) {
    logBotError("handleCaptchaInput", error, { userId: msg.from?.id });
    return false;
  }
}

module.exports = {
  handleStart,
  handleLanguageSelection,
  handleCaptchaInput,
  sendLanguageMenu,
  notifyAdmin,
};
