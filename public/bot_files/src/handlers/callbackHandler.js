const { ADMIN_ID } = require("../config");
const { SERVICE_KEYS } = require("../constants/menu");
const { getArray, t, getUserLang } = require("../locales");
const { escapeHtml } = require("../utils/formatters");
const { sendPlaceholderReply } = require("../services/menuService");
const {
  sendMainMenu,
  sendAccountMenu,
  sendAccountProfile,
  sendTransactionHistory,
  sendVipInfo,
  sendReferralMenu,
  sendReferralStats,
  sendSettingsMenu,
  sendChannelsMenu,
  sendPublicStats,
  sendTransferHome,
  sendTransferPrompt,
  sendTransferConfirm,
  sendTransferHistory,
  sendNotificationSettings,
  sendGiftCodePrompt,
  sendAdminPanel,
  sendServicePricesMenu,
  sendServiceToggleMenu,
} = require("../services/profileService");
const {
  sendTopupHome,
  sendCountryTopupMenu,
  sendStarsPrompt,
  sendCryptoAssetPrompt,
  sendCryptoAmountPrompt,
  sendCryptomusUsdPrompt,
  sendGatewayWebAppLauncher,
  sendPlaceholderTopupMethod,
  createStarsInvoice,
} = require("../services/topupService");
const {
  sendVirtualNumbersMenu,
  sendVirtualNumbersServerSelectionMenu,
  sendVirtualNumbersOffersMenu,
  sendSocialBoostMenu,
  sendSocialBoostCategoriesMenu,
  sendSocialBoostServicesMenu,
  sendSocialBoostServiceDetails,
  sendSocialAccountsMenu,
  sendSocialAccountsPlatformsMenu,
  sendServiceSelectionPlaceholder,
  sendCloudServicesMenu,
  sendTemporaryEmailsMenu,
  buildMockTempEmailSession,
  buildTempEmailText,
  sendTempEmailSession,
  getMockTempEmailMessages,
  sendVirtualVisaMenu,
  sendOtherServicesMenu,
  sendCustomServicePrompt,
} = require("../services/serviceMenusService");
const { sendProAccountsHome, handleProAccountsCallback } = require("../services/proAccountsFlowService");
const { sendCloudServicesHome, handleCloudServicesCallback } = require("../services/cloudServicesFlowService");
const { handleDigitalServicesCallback } = require("../services/digitalServicesFlowService");
const {
  sendGameTopupCategoriesMenu,
  sendGameTopupGamesMenu,
  sendGameTopupPackagesMenu,
  startGameTopupIdInput,
  handleGameTopupCallback,
} = require("../services/gameTopupFlowService");
const { sendGrizzlyCountriesMenu, sendGrizzlyCountryDetails } = require("../services/grizzlyMenuService");
const { requestNumber, getSmsStatus, cancelNumber } = require("../services/grizzlyService");
const { getTempEmailActionsKeyboard } = require("../keyboards/serviceMenusKeyboard");
const { setUserState, getUserState, clearUserState } = require("../services/stateStore");
const { safeTelegramCall } = require("../services/telegramSafe");
const { getRecentErrors, logBotError } = require("../services/errorLogger");
const { sendLanguageMenu } = require("./startHandler");
const { exportUsersList } = require("./messageHandler");
const {
  handleTemporaryEmailCallback,
  buildAdminUploadRootText,
  buildAdminUploadInputText,
  getTempEmailGroup,
  getTempEmailOptionBySku,
} = require("../services/tempEmailFlowService");

function resolveGrizzlyAppLabel(lang, serviceCode) {
  const { getGrizzlyServiceCode } = require("../constants/grizzly");
  const topApps = getArray(lang, "virtualNumbers_topApps");
  const otherPages = getArray(lang, "virtualNumbers_otherPages");
  const otherApps = Array.isArray(otherPages) ? otherPages.flat() : [];
  const allApps = [...topApps, ...otherApps];
  return allApps.find((label) => getGrizzlyServiceCode(label) === serviceCode) || serviceCode || "Grizzly";
}

function buildVerifyUrl(serviceCode, number) {
  const normalizedNumber = String(number || "").replace(/[^\d+]/g, "");
  if (serviceCode === "tg") {
    return `https://t.me/+${normalizedNumber.replace(/^\+/, "")}`;
  }
  return `https://wa.me/${normalizedNumber.replace(/^\+/, "")}`;
}

function buildPurchaseReceipt(lang, { number, countryData, countryId, appName, finalPriceRub, statusLine }) {
  const countryLabel = lang === "ar"
    ? countryData.name_ar
    : t(lang, `grizzly_country_${countryId}`) || countryData.name_ar;

  return [
    lang === "ar" ? "لقد تم طلب الرقم بنجاح ✅" : "The number has been ordered successfully ✅",
    "",
    `${t(lang, "virtualNumbers_receipt_number")} : <code>+${number}</code>`,
    `${t(lang, "virtualNumbers_receipt_country")} : ${countryLabel} ${countryData.flag}`,
    `${t(lang, "virtualNumbers_receipt_app")} : ${appName}`,
    `${t(lang, "virtualNumbers_receipt_price")} : ${finalPriceRub}.00₽`,
    "---------------------------",
    `${t(lang, "virtualNumbers_receipt_status")} : ${statusLine}`,
    "---------------------------",
    lang === "ar"
      ? "* لديك 20 دقيقة لإلغاء الرقم قبل الحذف"
      : "* You have 20 minutes to cancel the number before deletion",
  ].join("\n");
}

async function ensureAdmin(bot, query) {
  if (query.from.id === ADMIN_ID) {
    return true;
  }

  await safeTelegramCall("ensureAdmin", () =>
    bot.answerCallbackQuery(query.id, {
      text: "❌ ليست لديك صلاحية",
      show_alert: true,
    })
  );
  return false;
}

async function handleAdminCallbacks(bot, query, appStore) {
  try {
    if (!(await ensureAdmin(bot, query))) {
      return true;
    }

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const services = appStore.getServices();

    switch (query.data) {
      case "admin:panel":
        await sendAdminPanel(bot, chatId, { messageId, lang: getUserLang(appStore.findUserById(query.from.id)) });
        return true;

      case "admin:view_users": {
        const users = appStore.getUsers();
        const lastTen = users.slice(-10).reverse();
        const text = [
          "<b>=== المستخدمون ===</b>",
          "",
          `الإجمالي: ${users.length}`,
          "",
          ...lastTen.map((user) => `• <code>${user.userId}</code> | ${user.firstName || user.username || "-"}`),
        ].join("\n");

        await safeTelegramCall("handleAdminCallbacks.viewUsers", () =>
          bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📄 Export Users", callback_data: "admin:export_users" }],
                [{ text: "رجوع", callback_data: "admin:panel" }],
              ],
            },
          })
        );
        return true;
      }

      case "admin:export_users":
        await exportUsersList(bot, chatId, appStore);
        return true;

      case "admin:add_balance":
        setUserState(ADMIN_ID, "AWAITING_ADD_BALANCE_ID");
        await safeTelegramCall("handleAdminCallbacks.addBalance", () =>
          bot.sendMessage(chatId, "أرسل User ID أولًا. للإلغاء: Cancel")
        );
        return true;

      case "admin:deduct_balance":
        setUserState(ADMIN_ID, "ADMIN_AWAITING_DEDUCT_BALANCE_USER");
        await safeTelegramCall("handleAdminCallbacks.deductBalance", () =>
          bot.sendMessage(chatId, "أرسل User ID أولًا. للإلغاء: Cancel")
        );
        return true;

      case "admin:broadcast":
        setUserState(ADMIN_ID, "ADMIN_AWAITING_BROADCAST");
        await safeTelegramCall("handleAdminCallbacks.broadcast", () =>
          bot.sendMessage(chatId, "أرسل نص البرودكاست الآن. للإلغاء: Cancel")
        );
        return true;

      case "admin:earnings": {
        const stats = appStore.getEarningsStats();
        await safeTelegramCall("handleAdminCallbacks.earnings", () =>
          bot.editMessageText(
            [
              "<b>=== الأرباح ===</b>",
              "",
              `إجمالي الأرباح: ${stats.totalProfits} RUB`,
              `أرباح اليوم: ${stats.todayProfits} RUB`,
              `إجمالي عدد العمليات: ${stats.totalTransactions}`,
            ].join("\n"),
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: [[{ text: "رجوع", callback_data: "admin:panel" }]] },
            }
          )
        );
        return true;
      }

      case "admin:edit_prices":
        await sendServicePricesMenu(bot, chatId, services, { messageId });
        return true;

      case "admin:manage_services":
        await sendServiceToggleMenu(bot, chatId, services, { messageId });
        return true;

      case "admin:upload_data":
        clearUserState(ADMIN_ID);
        await safeTelegramCall("handleAdminCallbacks.uploadMenu", () =>
          bot.editMessageText(buildAdminUploadRootText(getUserLang(appStore.findUserById(query.from.id))), {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: getUserLang(appStore.findUserById(query.from.id)) === "ar" ? "📧 قسم إيميلات مؤقتة" : "📧 Temporary Emails Section", callback_data: "adte:root" }],
                [{ text: getUserLang(appStore.findUserById(query.from.id)) === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: "admin:panel" }],
              ],
            },
          })
        );
        return true;

      case "admin:bot_errors": {
        const recent = getRecentErrors(5);
        const text = recent.length
          ? recent.map((item, index) => `${index + 1}. ${item.scope} | ${item.message}`).join("\n")
          : "لا توجد أخطاء مسجلة.";
        await safeTelegramCall("handleAdminCallbacks.botErrors", () =>
          bot.editMessageText(`<b>=== آخر الأخطاء ===</b>\n\n${text}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "رجوع", callback_data: "admin:panel" }]] },
          })
        );
        return true;
      }

      case "admin:detailed_stats": {
        const stats = appStore.getDetailedStats();
        const serviceName = stats.mostUsedServiceKey
          ? services[stats.mostUsedServiceKey]?.name || stats.mostUsedServiceKey
          : "لا يوجد";
        await safeTelegramCall("handleAdminCallbacks.detailedStats", () =>
          bot.editMessageText(
            [
              "<b>=== Detailed Stats ===</b>",
              "",
              `Total users: ${stats.totalUsers}`,
              `Total requests: ${stats.totalRequests}`,
              `Most used service: ${serviceName}`,
            ].join("\n"),
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: [[{ text: "رجوع", callback_data: "admin:panel" }]] },
            }
          )
        );
        return true;
      }

      default:
        if (query.data === "adte:root") {
          const lang = getUserLang(appStore.findUserById(query.from.id));
          await safeTelegramCall("handleAdminCallbacks.adteRoot", () =>
            bot.editMessageText(
              lang === "ar"
                ? "اختر نوع خدمة الإيميلات المؤقتة لإدارة المخزون:"
                : "Choose temporary email service type to manage stock:",
              {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: lang === "ar" ? "📭 إيميل مجاني" : "📭 Free Email", callback_data: "adte:group:free" }],
                    [{ text: lang === "ar" ? "💼 إيميل أعمال" : "💼 Business Email", callback_data: "adte:group:business" }],
                    [{ text: lang === "ar" ? "🆔 إيميل دائم" : "🆔 Permanent Email", callback_data: "adte:group:permanent" }],
                    [{ text: lang === "ar" ? "➕ إيميل بلس" : "➕ Plus Email", callback_data: "adte:group:plus" }],
                    [{ text: lang === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: "admin:upload_data" }],
                  ],
                },
              }
            )
          );
          return true;
        }

        if (query.data === "adte:group:free") {
          await safeTelegramCall("handleAdminCallbacks.adteFreeInfo", () =>
            bot.answerCallbackQuery(query.id, {
              text: getUserLang(appStore.findUserById(query.from.id)) === "ar"
                ? "إيميل مجاني لا يحتاج رفع بيانات."
                : "Free email does not require stock upload.",
              show_alert: true,
            })
          );
          return true;
        }

        if (query.data.startsWith("adte:group:")) {
          const groupKey = query.data.split(":")[2];
          const group = getTempEmailGroup(groupKey);
          if (!group) return true;
          const lang = getUserLang(appStore.findUserById(query.from.id));
          const rows = group.options.map((option) => ([{
            text: `${lang === "ar" ? option.arName : option.enName} - ${option.price}$`,
            callback_data: `adte:sku:${option.sku}`,
          }]));
          rows.push([{ text: lang === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: "adte:root" }]);

          await safeTelegramCall("handleAdminCallbacks.adteGroupOptions", () =>
            bot.editMessageText(
              lang === "ar"
                ? "اختر الخيار الذي تريد رفع حسابات له:"
                : "Choose the option you want to upload accounts for:",
              {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: rows },
              }
            )
          );
          return true;
        }

        if (query.data.startsWith("adte:sku:")) {
          const sku = query.data.split(":")[2];
          const option = getTempEmailOptionBySku(sku);
          if (!option) return true;

          const lang = getUserLang(appStore.findUserById(query.from.id));
          if (option.custom) {
            await safeTelegramCall("handleAdminCallbacks.adteCustomInfo", () =>
              bot.answerCallbackQuery(query.id, {
                text: lang === "ar"
                  ? "الإيميل المخصص لا يحتاج مخزون مرفوع."
                  : "Custom email does not require uploaded stock.",
                show_alert: true,
              })
            );
            return true;
          }

          setUserState(ADMIN_ID, "ADMIN_TEMP_EMAIL_UPLOAD_INPUT", { sku });
          await safeTelegramCall("handleAdminCallbacks.adteSkuPrompt", () =>
            bot.sendMessage(chatId, buildAdminUploadInputText(lang, option), {
              parse_mode: "HTML",
              disable_web_page_preview: true,
              reply_markup: {
                inline_keyboard: [[{ text: lang === "ar" ? "❌ إلغاء" : "❌ Cancel", callback_data: "admin:panel" }]],
              },
            })
          );
          return true;
        }

        if (query.data.startsWith("admin:edit_price:")) {
          const serviceKey = query.data.split(":")[2];
          setUserState(ADMIN_ID, "ADMIN_AWAITING_SERVICE_PRICE", { serviceKey });
          await safeTelegramCall("handleAdminCallbacks.editPricePrompt", () =>
            bot.sendMessage(chatId, `أرسل السعر الجديد للخدمة: ${services[serviceKey]?.name || serviceKey}`)
          );
          return true;
        }

        if (query.data.startsWith("admin:toggle_service:")) {
          const serviceKey = query.data.split(":")[2];
          appStore.toggleService(serviceKey);
          await sendServiceToggleMenu(bot, chatId, appStore.getServices(), { messageId });
          return true;
        }

        return false;
    }
  } catch (error) {
    logBotError("handleAdminCallbacks", error, { userId: query.from?.id, data: query.data });
    return true;
  }
}

async function handleCallbackQuery(bot, query, appStore, appContext) {
  try {
    if (query.data.startsWith("admin:") || query.data.startsWith("adte:")) {
      return await handleAdminCallbacks(bot, query, appStore);
    }

    if (query.data.startsWith("setlang_")) {
      return false;
    }

    const proHandled = await handleProAccountsCallback(bot, query, appStore);
    if (proHandled) {
      return true;
    }

    const cloudHandled = await handleCloudServicesCallback(bot, query, appStore);
    if (cloudHandled) {
      return true;
    }

    const digitalHandled = await handleDigitalServicesCallback(bot, query, appStore);
    if (digitalHandled) {
      return true;
    }

    const gameTopupHandled = await handleGameTopupCallback(bot, query, appStore);
    if (gameTopupHandled) {
      return true;
    }

    const tempEmailsHandled = await handleTemporaryEmailCallback(bot, query, appStore);
    if (tempEmailsHandled) {
      return true;
    }

    await safeTelegramCall("handleCallbackQuery.answer", () => bot.answerCallbackQuery(query.id));
    if (query.data === "noop") {
      return true;
    }
    const user = appStore.getOrCreateUser(query.from);
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const socialCategoryLabels = getArray(getUserLang(user), "socialAccounts_categories").reduce((acc, item) => {
      if (item && item.key) {
        acc[item.key] = item.label;
      }
      return acc;
    }, {});
    const socialBoostKeyMap = {
      instagram: "instagram",
      "إنستجرام": "instagram",
      tiktok: "tiktok",
      "تيك توك": "tiktok",
      youtube: "youtube",
      "يوتيوب": "youtube",
      telegram: "telegram",
      "تيليجرام": "telegram",
      facebook: "facebook",
      "فيسبوك": "facebook",
      kwai: "kwai",
      "كواي": "kwai",
      threads: "threads",
      "ثريدز": "threads",
      whatsapp: "whatsapp",
      "واتساب": "whatsapp",
      likee: "likee",
      "لايكي": "likee",
      twitter: "twitter",
      "تويتر/x": "twitter",
      "تويتر": "twitter",
      snapchat: "snapchat",
      "سناب شات": "snapchat",
      twitch: "twitch",
      "تويتش": "twitch",
      linkedin: "linkedin",
      "لينكدإن": "linkedin",
    };

    switch (query.data) {
      case "menu:main":
        clearUserState(user.userId);
        if (String(query.message?.text || "").includes(t(getUserLang(user), "mainMenu_header"))) {
          return true;
        }
        await sendMainMenu(bot, chatId, user, { messageId });
        return true;

      case "menu:account":
        await sendAccountMenu(bot, chatId, user, { messageId });
        return true;

      case "account:vip_info":
        await sendVipInfo(bot, chatId, user, { messageId });
        return true;

      case "account:profile":
        await sendAccountProfile(bot, chatId, user, { messageId });
        return true;

      case "account:history":
        await sendTransactionHistory(bot, chatId, user, appStore.getRecentTransactionsForUser(user.userId, 5), { messageId });
        return true;

      case "account:notifications":
        await sendNotificationSettings(bot, chatId, user, { messageId });
        return true;

      case "account:notify:on":
        appStore.updateUser(user.userId, { notifyPromotions: true });
        await sendNotificationSettings(bot, chatId, appStore.findUserById(user.userId) || user, { messageId });
        return true;

      case "account:notify:off":
        appStore.updateUser(user.userId, { notifyPromotions: false });
        await sendNotificationSettings(bot, chatId, appStore.findUserById(user.userId) || user, { messageId });
        return true;

      case "account:gift_redeem":
        setUserState(user.userId, "ACCOUNT_AWAIT_GIFT_CODE");
        await sendGiftCodePrompt(bot, chatId, user, { messageId });
        return true;

      case "menu:referral":
        await sendReferralMenu(bot, chatId, user, appContext.botUsername, { messageId });
        return true;

      case "referral:link":
        await sendReferralMenu(bot, chatId, user, appContext.botUsername, { messageId });
        return true;

      case "referral:team_stats": {
        const referrals = (appStore.getUsers() || []).filter((entry) => Number(entry.invitedBy) === Number(user.userId));
        const activeUsers = referrals.filter((entry) => Number(entry.transactionsCount || 0) > 0).length;
        const txs = appStore.transactions || [];
        const totalEarnings = txs
          .filter((tx) => Number(tx.userId) === Number(user.userId) && (tx.type === "referral_reward" || tx.type === "referral_commission"))
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        await sendReferralStats(bot, chatId, user, {
          totalInvites: referrals.length,
          activeUsers,
          totalEarnings: Number(totalEarnings.toFixed(2)),
        }, { messageId });
        return true;
      }

      case "referral:earnings": {
        const txs = appStore.transactions || [];
        const totalEarnings = txs
          .filter((tx) => Number(tx.userId) === Number(user.userId) && (tx.type === "referral_reward" || tx.type === "referral_commission"))
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        await sendReferralStats(bot, chatId, user, {
          totalInvites: (appStore.getUsers() || []).filter((entry) => Number(entry.invitedBy) === Number(user.userId)).length,
          activeUsers: (appStore.getUsers() || []).filter((entry) => Number(entry.invitedBy) === Number(user.userId) && Number(entry.transactionsCount || 0) > 0).length,
          totalEarnings: Number(totalEarnings.toFixed(2)),
        }, { messageId });
        return true;
      }

      case "menu:settings":
        await sendSettingsMenu(bot, chatId, { messageId, lang: getUserLang(user) });
        return true;

      case "menu:channels":
        await sendChannelsMenu(bot, chatId, { messageId, lang: getUserLang(user) });
        return true;

      case "menu:public_stats":
        await sendPublicStats(bot, chatId, appStore.getPublicStats(), { messageId, lang: getUserLang(user) });
        return true;

      case "menu:change_language":
        await sendLanguageMenu(bot, chatId, messageId);
        return true;

      case "action:transfer_balance":
        clearUserState(user.userId);
        await sendTransferHome(bot, chatId, user, { messageId });
        return true;

      case "transfer:start":
        setUserState(user.userId, "AWAITING_TRANSFER_PAYLOAD");
        await sendTransferPrompt(bot, chatId, user, { messageId });
        return true;

      case "transfer:history": {
        const transfers = (appStore.transactions || [])
          .filter((tx) => (tx.type === "transfer_out" || tx.type === "transfer_in")
            && (Number(tx.userId) === Number(user.userId) || Number(tx.targetUserId) === Number(user.userId)))
          .slice(-10)
          .reverse();
        await sendTransferHistory(bot, chatId, user, transfers, { messageId });
        return true;
      }

      case "transfer:cancel":
        clearUserState(user.userId);
        await sendTransferHome(bot, chatId, user, { messageId });
        return true;

      case "transfer:confirm": {
        const transferState = getUserState(user.userId);
        if (!transferState || transferState.name !== "AWAITING_TRANSFER_CONFIRM") {
          await safeTelegramCall("transfer.confirm.missing", () =>
            bot.answerCallbackQuery(query.id, {
              text: getUserLang(user) === "ar" ? "انتهت الجلسة، ابدأ تحويلًا جديدًا." : "Session expired. Start a new transfer.",
              show_alert: true,
            })
          );
          return true;
        }

        const sender = appStore.findUserById(user.userId);
        const receiver = appStore.findUserById(transferState.targetUserId);
        const amount = Number(transferState.amount || 0);

        if (!sender || !receiver || !Number.isFinite(amount) || amount < 10) {
          clearUserState(user.userId);
          await sendTransferHome(bot, chatId, user, { messageId });
          return true;
        }

        if (Number(sender.balance || 0) < amount) {
          await safeTelegramCall("transfer.confirm.insufficient", () =>
            bot.answerCallbackQuery(query.id, {
              text: getUserLang(user) === "ar" ? "رصيدك غير كافٍ." : "Insufficient balance.",
              show_alert: true,
            })
          );
          return true;
        }

        appStore.deductBalance(sender.userId, amount);
        appStore.addBalance(receiver.userId, amount);
        appStore.incrementTransactions(sender.userId);
        appStore.incrementTransactions(receiver.userId);
        appStore.addTransaction({
          type: "transfer_out",
          userId: sender.userId,
          targetUserId: receiver.userId,
          amount,
          status: "completed",
        });
        appStore.addTransaction({
          type: "transfer_in",
          userId: receiver.userId,
          targetUserId: sender.userId,
          amount,
          status: "completed",
        });

        clearUserState(user.userId);

        await safeTelegramCall("transfer.confirm.sender", () =>
          bot.editMessageText(
            getUserLang(user) === "ar"
              ? `✅ تم تحويل ${amount} روبل بنجاح إلى المستخدم <code>${receiver.userId}</code>.`
              : `✅ ${amount} RUB transferred successfully to <code>${receiver.userId}</code>.`,
            { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
          )
        );

        await safeTelegramCall("transfer.confirm.receiver", () =>
          bot.sendMessage(
            receiver.userId,
            getUserLang(receiver) === "ar"
              ? `📥 تم استلام ${amount} روبل من ${escapeHtml(sender.firstName || sender.username || "User")}.`
              : `📥 You received ${amount} RUB from ${escapeHtml(sender.firstName || sender.username || "User")}.`,
            { parse_mode: "HTML" }
          )
        );
        return true;
      }

      default:
        if (query.data.startsWith("buynum_") || query.data.startsWith("buy_num_")) {
          const lang = getUserLang(user);
          const parts = query.data.split("_");
          const isNewFormat = query.data.startsWith("buy_num_");
          const providerKey = isNewFormat && parts.length >= 6 ? parts[2] : "server2";
          const serviceCode = isNewFormat ? (parts.length >= 6 ? parts[3] : parts[2]) : parts[1];
          const countryId = isNewFormat ? (parts.length >= 6 ? parts[4] : parts[3]) : parts[2];
          const priceRaw = isNewFormat ? (parts.length >= 6 ? parts[5] : parts[4]) : parts[3];
          const price = Number(priceRaw);
          const countryMeta = require("../constants/grizzly").getGrizzlyCountryMeta(countryId);
          const appName = resolveGrizzlyAppLabel(lang, serviceCode);

          if (!Number.isFinite(price) || price <= 0) {
            await safeTelegramCall("handleCallbackQuery.buyNum.invalidPrice", () =>
              bot.answerCallbackQuery(query.id, {
                text: t(lang, "grizzly_no_numbers"),
                show_alert: true,
              })
            );
            return true;
          }

          const currentUser = appStore.findUserById(user.userId);
          if (!currentUser || currentUser.balance < price) {
            await safeTelegramCall("handleCallbackQuery.buyNum.insufficient", () =>
              bot.sendMessage(chatId, t(lang, "grizzly_buy_insufficient"))
            );
            return true;
          }

          const response = await requestNumber(serviceCode, countryId, providerKey);
          if (!response || /^(BAD_|ERROR)/i.test(response)) {
            await safeTelegramCall("handleCallbackQuery.buyNum.noNumbers", () =>
              bot.sendMessage(chatId, t(lang, "grizzly_no_numbers"))
            );
            return true;
          }

          if (response.includes("ACCESS_NUMBER")) {
            const [, activationId, number] = String(response).split(":");
            appStore.deductBalance(currentUser.userId, price);
            appStore.addTransaction({
              type: "virtual_number_purchase",
              userId: currentUser.userId,
              amount: price,
              providerKey,
              serviceCode,
              countryId,
              activationId,
              number,
            });

            const verifyUrl = buildVerifyUrl(serviceCode, number);
            const message = buildPurchaseReceipt(lang, {
              number: String(number || ""),
              countryData: countryMeta,
              countryId,
              appName,
              finalPriceRub: price,
              statusLine: lang === "ar" ? "بانتظار وصول الكود ⏳" : "Waiting for the code ⏳",
            });

            const replyMarkup = {
              inline_keyboard: [
                [{ text: t(lang, "virtualNumbers_refresh_messages"), callback_data: `checksms_${providerKey}_${activationId}` }],
                [{ text: t(lang, "virtualNumbers_cancel_order"), callback_data: `cancelnum_${providerKey}_${activationId}_${price}` }],
                [{ text: t(lang, "virtualNumbers_verify_number"), url: verifyUrl }],
              ],
            };

            await safeTelegramCall("handleCallbackQuery.buyNum.success", () =>
              bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: replyMarkup,
              })
            );
            return true;
          } else if (response === "NO_NUMBERS" || response === "NO_BALANCE") {
            await safeTelegramCall("handleCallbackQuery.buyNum.knownFailure", () =>
              bot.sendMessage(chatId, t(lang, "grizzly_no_numbers"))
            );
            return true;
          } else {
            await safeTelegramCall("handleCallbackQuery.buyNum.unknown", () =>
              bot.sendMessage(chatId, t(lang, "grizzly_no_numbers"))
            );
            return true;
          }
        }

        if (query.data.startsWith("checksms_")) {
          const lang = getUserLang(user);
          const parts = query.data.split("_");
          const providerKey = parts.length >= 3 ? parts[1] : "server2";
          const activationId = parts.length >= 3 ? parts[2] : parts[1];
          const status = await getSmsStatus(activationId, providerKey);

          if (!status || status.startsWith("STATUS_WAIT_CODE")) {
            await safeTelegramCall("handleCallbackQuery.checkSms.wait", () =>
              bot.answerCallbackQuery(query.id, {
                text: t(lang, "grizzly_status_wait"),
                show_alert: true,
              })
            );
            return true;
          }

          if (status.startsWith("STATUS_OK")) {
            const code = status.split(":")[1] || "";
            const purchaseTx = appStore.getLatestTransactionByActivationId(activationId);
            const serviceCode = purchaseTx?.serviceCode || "wa";
            const countryData = require("../constants/grizzly").getGrizzlyCountryMeta(purchaseTx?.countryId);
            const appName = resolveGrizzlyAppLabel(lang, serviceCode);
            const verifyUrl = buildVerifyUrl(serviceCode, purchaseTx?.number || "");
            const text = buildPurchaseReceipt(lang, {
              number: String(purchaseTx?.number || ""),
              countryData,
              countryId: purchaseTx?.countryId,
              appName,
              finalPriceRub: Number(purchaseTx?.amount || 0),
              statusLine: lang === "ar"
                ? `الكود هو <code>${String(code)}</code> ✅`
                : `The code is <code>${String(code)}</code> ✅`,
            });
            await safeTelegramCall("handleCallbackQuery.checkSms.ok", () =>
              bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: t(lang, "virtualNumbers_verify_number"), url: verifyUrl }],
                  ],
                },
              })
            );
            return true;
          }

          await safeTelegramCall("handleCallbackQuery.checkSms.unknown", () =>
            bot.answerCallbackQuery(query.id, {
              text: t(lang, "grizzly_status_wait"),
              show_alert: true,
            })
          );
          return true;
        }

        if (query.data.startsWith("cancelnum_")) {
          const lang = getUserLang(user);
          const parts = query.data.split("_");
          const providerKey = parts.length >= 4 ? parts[1] : "server2";
          const activationId = parts.length >= 4 ? parts[2] : parts[1];
          const priceRaw = parts.length >= 4 ? parts[3] : parts[2];
          const price = Number(priceRaw);

          await cancelNumber(activationId, providerKey);

          if (Number.isFinite(price) && price > 0) {
            appStore.addBalance(user.userId, price);
            appStore.addTransaction({
              type: "virtual_number_refund",
              userId: user.userId,
              amount: price,
              providerKey,
              activationId,
            });
          }

          const text = t(lang, "grizzly_cancel_refund").replace("{price}", String(price || 0));
          await safeTelegramCall("handleCallbackQuery.cancelNum.done", () =>
            bot.editMessageText(text, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
            })
          );
          return true;
        }

        if (query.data === "service:balance_topup") {
          clearUserState(user.userId);
          await sendTopupHome(bot, chatId, { messageId, lang: getUserLang(user), user });
          return true;
        }

        if (query.data === "service:virtual_numbers") {
          await sendVirtualNumbersMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:social_boost") {
          clearUserState(user.userId);
          await sendSocialBoostMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "social_boost:cancel") {
          clearUserState(user.userId);
          await sendSocialBoostMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:pro_accounts") {
          await sendProAccountsHome(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:social_accounts") {
          await sendSocialAccountsMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:cloud_services") {
          await sendCloudServicesHome(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:temporary_emails") {
          await sendTemporaryEmailsMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:virtual_visa") {
          await sendVirtualVisaMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:game_topup") {
          clearUserState(user.userId);
          await sendGameTopupCategoriesMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data === "service:other_services") {
          await sendOtherServicesMenu(bot, chatId, user, { messageId });
          return true;
        }

        if (query.data.startsWith("service_menu:social_boost:platform:")) {
          clearUserState(user.userId);
          const platformKey = query.data.split(":")[3];
          await sendSocialBoostCategoriesMenu(bot, chatId, user, platformKey, { messageId });
          return true;
        }

        if (query.data.startsWith("service_menu:social_boost:category:")) {
          clearUserState(user.userId);
          const [, , , platformKey, categoryKey] = query.data.split(":");
          await sendSocialBoostServicesMenu(bot, chatId, user, platformKey, categoryKey, { messageId });
          return true;
        }

        if (query.data.startsWith("service_menu:social_boost:service:")) {
          const [, , , platformKey, categoryKey, serviceId] = query.data.split(":");
          await sendSocialBoostServiceDetails(bot, chatId, user, platformKey, categoryKey, serviceId, { messageId });
          return true;
        }

        if (query.data.startsWith("service_menu:social_boost:app:")) {
          const appName = decodeURIComponent(query.data.split(":").slice(3).join(":"));
          const normalized = appName.toLowerCase();
          const appKey = socialBoostKeyMap[normalized] || socialBoostKeyMap[normalized.replace(/[^a-z0-9]/g, "")];
          if (!appKey) {
            await sendSocialBoostMenu(bot, chatId, user, { messageId });
            return true;
          }

          await sendSocialBoostCategoriesMenu(bot, chatId, user, appKey, { messageId });
          return true;
        }

        if (query.data.startsWith("social_boost_service:")) {
          await sendSocialBoostMenu(bot, chatId, user, { messageId });
          return true;
        }
        if (query.data.startsWith("service_menu:social_accounts:category:")) {
          const categoryKey = query.data.split(":")[3];
          await sendSocialAccountsPlatformsMenu(bot, chatId, user, categoryKey, { messageId });
          return true;
        }

        if (query.data.startsWith("service_menu:social_accounts:platform:")) {
          const [, , , categoryKey, ...platformParts] = query.data.split(":");
          const platformName = decodeURIComponent(platformParts.join(":"));
          const categoryTitle = socialCategoryLabels[categoryKey] || categoryKey;
          await sendServiceSelectionPlaceholder(bot, chatId, user, `${categoryTitle} | ${platformName}`, {
            messageId,
            backCallback: `service_menu:social_accounts:category:${categoryKey}`,
          });
          return true;
        }

        if (query.data.startsWith("service_menu:cloud_services:item:")) {
          const itemName = getArray(getUserLang(user), "cloudServices_items")[Number(query.data.split(":")[3])];
          if (!itemName) {
            await sendCloudServicesMenu(bot, chatId, user, { messageId });
            return true;
          }
          await sendServiceSelectionPlaceholder(bot, chatId, user, `Cloud Services | ${itemName}`, {
            messageId,
            backCallback: "service:cloud_services",
          });
          return true;
        }

        if (query.data.startsWith("service_menu:temporary_emails:item:")) {
          const itemIndex = Number(query.data.split(":")[3]);
          const itemName = getArray(getUserLang(user), "temporaryEmails_items")[itemIndex];
          if (!itemName) {
            await sendTemporaryEmailsMenu(bot, chatId, user, { messageId });
            return true;
          }

          if (itemIndex === 0) {
            const session = buildMockTempEmailSession();
            setUserState(user.userId, "TEMP_EMAIL_SESSION", { ...session });
            await sendTempEmailSession(bot, chatId, user, session, { messageId });
            return true;
          }

          await sendServiceSelectionPlaceholder(bot, chatId, user, `Temporary Emails | ${itemName}`, {
            messageId,
            backCallback: "service:temporary_emails",
          });
          return true;
        }

        if (query.data === "service_menu:temporary_emails:refresh") {
          const tempState = getUserState(user.userId);
          if (!tempState || tempState.name !== "TEMP_EMAIL_SESSION") {
            const session = buildMockTempEmailSession();
            setUserState(user.userId, "TEMP_EMAIL_SESSION", { ...session });
            await sendTempEmailSession(bot, chatId, user, session, { messageId });
            return true;
          }

          const messages = getMockTempEmailMessages(tempState);
          setUserState(user.userId, "TEMP_EMAIL_SESSION", { ...tempState });

          if (!messages.length) {
            await safeTelegramCall("handleCallbackQuery.tempEmailEmpty", () =>
              bot.answerCallbackQuery(query.id, {
                text: t(getUserLang(user), "temporaryEmails_noNew"),
                show_alert: true,
              })
            );
            return true;
          }

          await safeTelegramCall("handleCallbackQuery.tempEmailRefresh", () =>
              bot.editMessageText(buildTempEmailText(user, tempState, messages), {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: getTempEmailActionsKeyboard(getUserLang(user)),
              })
            );
          return true;
        }

        if (query.data === "service_menu:temporary_emails:switch") {
          const session = buildMockTempEmailSession();
          setUserState(user.userId, "TEMP_EMAIL_SESSION", { ...session });
          await sendTempEmailSession(bot, chatId, user, session, { messageId });
          return true;
        }

        if (query.data.startsWith("service_menu:virtual_visa:item:")) {
          const itemName = getArray(getUserLang(user), "virtualVisa_items")[Number(query.data.split(":")[3])];
          if (!itemName) {
            await sendVirtualVisaMenu(bot, chatId, user, { messageId });
            return true;
          }
          await sendServiceSelectionPlaceholder(bot, chatId, user, `Virtual Visa | ${itemName}`, {
            messageId,
            backCallback: "service:virtual_visa",
          });
          return true;
        }

        if (query.data.startsWith("gt:cat:")) {
          const parts = query.data.split(":");
          const categoryKey = String(parts[2] || "");
          await sendGameTopupGamesMenu(bot, chatId, user, categoryKey, { messageId });
          return true;
        }

        if (query.data.startsWith("gt:g:")) {
          const parts = query.data.split(":");
          const gameKey = String(parts[2] || "");
          const categoryKey = String(parts[3] || "");
          await sendGameTopupPackagesMenu(bot, chatId, user, gameKey, categoryKey, { messageId });
          return true;
        }

        if (query.data.startsWith("gt:p:")) {
          const parts = query.data.split(":");
          const gameKey = String(parts[2] || "");
          const packageIndex = Number(parts[3] || 0);
          const categoryKey = String(parts[4] || "");
          await startGameTopupIdInput(bot, chatId, user, {
            gameKey,
            packageIndex,
            categoryKey,
            isCustom: false,
          }, { messageId });
          return true;
        }

        if (query.data.startsWith("gt:c:")) {
          const parts = query.data.split(":");
          const gameKey = String(parts[2] || "");
          const categoryKey = String(parts[3] || "");
          await startGameTopupIdInput(bot, chatId, user, {
            gameKey,
            categoryKey,
            isCustom: true,
          }, { messageId });
          return true;
        }

        if (query.data === "service_menu:other_services:custom_request") {
          setUserState(user.userId, "AWAITING_CUSTOM_SERVICE");
          await sendCustomServicePrompt(bot, chatId, user);
          return true;
        }

        if (query.data.startsWith("service_menu:other_services:item:")) {
          const itemName = getArray(getUserLang(user), "otherServices_items")[Number(query.data.split(":")[3])];
          if (!itemName) {
            await sendOtherServicesMenu(bot, chatId, user, { messageId });
            return true;
          }
          await sendServiceSelectionPlaceholder(bot, chatId, user, `Other Services | ${itemName}`, {
            messageId,
            backCallback: "service:other_services",
          });
          return true;
        }

        if (query.data.startsWith("topup:country:")) {
          const country = query.data.split(":")[2];
          await sendCountryTopupMenu(bot, chatId, country, { messageId, lang: getUserLang(user), user });
          return true;
        }

        if (query.data === "topup:auto:stars") {
          setUserState(user.userId, "AWAITING_TOPUP_STARS_AMOUNT");
          await sendStarsPrompt(bot, chatId, { messageId, lang: getUserLang(user) });
          return true;
        }

        if (query.data === "topup:auto:crypto") {
          clearUserState(user.userId);
          await sendCryptoAssetPrompt(bot, chatId, { messageId, lang: getUserLang(user) });
          return true;
        }

        if (query.data === "topup:auto:cryptomus") {
          setUserState(user.userId, "AWAITING_TOPUP_CRYPTOMUS_USD");
          await sendCryptomusUsdPrompt(bot, chatId, { messageId, lang: getUserLang(user) });
          return true;
        }

        if (query.data === "topup:auto:binance" || query.data === "topup:auto:jeeb" || query.data === "topup:auto:vodafone") {
          const method = query.data.split(":")[2];
          await sendGatewayWebAppLauncher(bot, chatId, method, {
            messageId,
            lang: getUserLang(user),
            userId: user.userId,
          });
          return true;
        }

        if (query.data.startsWith("topup:crypto:asset:")) {
          const asset = String(query.data.split(":")[3] || "").toUpperCase();
          if (!asset) {
            await safeTelegramCall("handleCallbackQuery.invalidCryptoAsset", () =>
              bot.answerCallbackQuery(query.id, {
                text: "عملة غير صالحة.",
                show_alert: true,
              })
            );
            return true;
          }

          setUserState(user.userId, "AWAITING_TOPUP_CRYPTO_AMOUNT", { asset });
          await sendCryptoAmountPrompt(bot, chatId, asset, { messageId, lang: getUserLang(user) });
          return true;
        }

        if (query.data.startsWith("topup:stars:pay:")) {
          const amountRub = Number(query.data.split(":")[3]);
          if (!Number.isFinite(amountRub) || amountRub <= 0) {
            await safeTelegramCall("handleCallbackQuery.invalidStarsAmount", () =>
              bot.answerCallbackQuery(query.id, {
                text: "قيمة الشحن غير صالحة.",
                show_alert: true,
              })
            );
            return true;
          }

          await createStarsInvoice(bot, chatId, amountRub);
          return true;
        }

        if (query.data.startsWith("topup:auto:") || query.data.startsWith("topup:placeholder:")) {
          const methodMap = {
            "topup:auto:binance": "Binance Pay",
            "topup:auto:vodafone": "Vodafone Cash",
            "topup:auto:jeeb": "محفظة جيب",
            "topup:placeholder:stc_pay": "STC Pay",
            "topup:placeholder:mobily_pay": "Mobily Pay",
            "topup:placeholder:saudi_bank": "تحويل بنكي",
            "topup:placeholder:saudi_local": "تحويل محلي",
            "topup:placeholder:sabafon": "سبأفون",
            "topup:placeholder:you": "YOU",
            "topup:placeholder:kurimi": "كريمي",
            "topup:placeholder:yemen_local": "تحويل محلي",
            "topup:placeholder:egypt_vodafone": "Vodafone Cash",
            "topup:placeholder:orange_cash": "Orange Cash",
            "topup:placeholder:etisalat_cash": "Etisalat Cash",
            "topup:placeholder:egypt_bank": "تحويل بنكي",
            "topup:placeholder:payeer": "Payeer",
            "topup:placeholder:perfect_money": "Perfect Money",
            "topup:placeholder:global_crypto": "Crypto",
            "topup:placeholder:webmoney": "WebMoney",
          };

          await sendPlaceholderTopupMethod(bot, chatId, methodMap[query.data] || "طريقة دفع", { messageId });
          return true;
        }

        if (query.data.startsWith("service:")) {
          const serviceKey = query.data.split(":")[1];
          const services = appStore.getServices();

          if (!SERVICE_KEYS.includes(serviceKey) || !services[serviceKey]) {
            await sendPlaceholderReply(bot, chatId, getUserLang(user) === "ar" ? "قسم غير معروف" : "Unknown section", messageId);
            return true;
          }

          const isEnabled = services[serviceKey].enabled !== false;
          if (!isEnabled) {
            await safeTelegramCall("handleCallbackQuery.serviceDisabled", () =>
              bot.editMessageText(
                `<b>${getUserLang(user) === "ar" ? "الخدمة تحت الصيانة" : "Service under maintenance"}</b>`,
                {
                  chat_id: chatId,
                  message_id: messageId,
                  parse_mode: "HTML",
                  reply_markup: { inline_keyboard: [[{ text: t(getUserLang(user), "common_back"), callback_data: "menu:main" }]] },
                }
              )
            );
            return true;
          }

          await sendPlaceholderReply(bot, chatId, services[serviceKey].name, messageId);
          return true;
        }

        return false;
    }
  } catch (error) {
    logBotError("handleCallbackQuery", error, { userId: query.from?.id, data: query.data });
    return false;
  }
}

module.exports = {
  handleCallbackQuery,
};






