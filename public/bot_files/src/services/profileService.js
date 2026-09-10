const {
  getMainMenuKeyboard,
  getBackToMainMenuKeyboard,
  getAccountMenuKeyboard,
  getBackToAccountKeyboard,
  getReferralMenuKeyboard,
  getBackToReferralKeyboard,
  getTransferMenuKeyboard,
  getTransferConfirmKeyboard,
  getSettingsMenuKeyboard,
  getChannelsKeyboard,
  getAdminPanelKeyboard,
  getServicesManagementKeyboard,
} = require("../keyboards/mainMenuKeyboard");
const { escapeHtml, formatRuble, getDisplayName } = require("../utils/formatters");
const { safeTelegramCall } = require("./telegramSafe");
const { getUserLang, t } = require("../locales");
const { getVipTier } = require("../utils/vip");

const FRAME = "━━━━━━━━━━━━━━━━━━━";

function vaultCard(title, lines, footer) {
  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    FRAME,
    title,
    ...lines,
    FRAME,
    footer,
  ].join("\n");
}

async function sendOrEditMessage(bot, chatId, text, replyMarkup, messageId, scope) {
  const payload = {
    parse_mode: "HTML",
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
  };

  if (messageId) {
    return safeTelegramCall(scope || "editMessageText", () =>
      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        ...payload,
      })
    );
  }

  return safeTelegramCall(scope || "sendMessage", () => bot.sendMessage(chatId, text, payload));
}

function buildMainMenuText(user) {
  const lang = getUserLang(user);
  const header = lang === "ar" ? "القائمة الرئيسية" : "Main Menu";

  return [
    `<b>${header}</b>`,
    "",
    `👤 ${escapeHtml(getDisplayName(user))}`,
    `🆔 <code>${user.userId}</code>`,
    `💰 ${formatRuble(user.balance)}`,
    `🏅 ${escapeHtml(getVipTier(user.totalDeposits))}`,
  ].join("\n");
}

function buildAccountText(user) {
  const lang = getUserLang(user);
  const username = user.username ? `@${escapeHtml(user.username)}` : (lang === "ar" ? "غير متوفر" : "Not set");

  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ الـمـلـــف الـشـخـصـــي ❩ ♦️",
      [
        `👤 الاسم: ${escapeHtml(getDisplayName(user))}`,
        `🔖 المعرف: ${username}`,
        `🆔 الآيدي: <code>${user.userId}</code>`,
        `💰 الرصيد الحالي: ${formatRuble(user.balance)} روبل`,
      ],
      "⬇️ يرجى تحديد الخيار لإدارة حسابك ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ P E R S O N A L  P R O F I L E ❩ ♦️",
    [
      `👤 Name: ${escapeHtml(getDisplayName(user))}`,
      `🔖 Username: ${username}`,
      `🆔 ID: <code>${user.userId}</code>`,
      `💰 Current Balance: ${formatRuble(user.balance)} RUB`,
    ],
    "⬇️ Please choose an option to manage your account ⬇️"
  );
}

function buildHistoryText(lang, transactions) {
  const body = transactions.length
    ? transactions
      .slice(0, 5)
      .map((tx, index) => {
        const status = String(tx.status || (lang === "ar" ? "مكتملة" : "Completed"));
        const service = String(tx.serviceKey || tx.type || "-");
        const amount = Number(tx.amount || 0);
        return `${index + 1}️⃣ ${escapeHtml(service)} - ${formatRuble(amount)} ${lang === "ar" ? "روبل" : "RUB"} - ${escapeHtml(status)}`;
      })
      .join("\n")
    : (lang === "ar" ? "لا توجد عمليات حالياً." : "No operations found yet.");

  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ سـجـــل عـمـلـيـاتـــي ❩ ♦️",
      [
        "💡 يعرض هذا السجل آخر 5 عمليات قمت بها.",
        "💡 للحصول على تفاصيل أقدم، تواصل مع الدعم.",
        body,
      ],
      "⬇️ يمكنك متابعة حالة طلباتك الحالية من هنا ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ M Y  O P E R A T I O N S  L O G ❩ ♦️",
    [
      "💡 This section shows your latest 5 operations.",
      "💡 For older records, contact support.",
      body,
    ],
    "⬇️ You can track your current requests here ⬇️"
  );
}

function buildVipInfoText(user) {
  const lang = getUserLang(user);
  return [
    `<b>${t(lang, "account_vip_title")}</b>`,
    "",
    t(lang, "account_vip_body"),
    "",
    `🏅 ${escapeHtml(getVipTier(user.totalDeposits))}`,
  ].join("\n");
}

function buildReferralText(lang, user, botUsername) {
  const link = `https://t.me/${botUsername}?start=${user.userId}`;

  if (lang === "ar") {
    return [
      vaultCard(
        "♦️ ❨ نـظـــام الإحـالـــة والـربـــح ❩ ♦️",
        [
          "💡 اربح (0.5 روبل) فور دخول أي شخص عبر رابطك.",
          "💡 ستحصل على (5%) من إجمالي مشترياته مدى الحياة.",
          "💡 ضاعف أرباحك بمشاركة الرابط في المجموعات والقنوات.",
        ],
        "⬇️ يرجى اختيار الإجراء المطلوب من القائمة أدناه ⬇️"
      ),
      "",
      `🔗 رابطك الخاص: <code>${link}</code>`,
      "📋 يمكنك نسخ الرابط ومشاركته مباشرة.",
    ].join("\n");
  }

  return [
    vaultCard(
      "♦️ ❨ R E F E R R A L  &  E A R N I N G S ❩ ♦️",
      [
        "💡 Earn 0.5 RUB when someone joins via your link.",
        "💡 Get 5% from their total purchases for life.",
        "💡 Share your link in groups/channels to grow profits.",
      ],
      "⬇️ Please choose an action from the menu below ⬇️"
    ),
    "",
    `🔗 Your referral link: <code>${link}</code>`,
    "📋 Copy and share it directly.",
  ].join("\n");
}

function buildReferralStatsText(lang, payload) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ إحـصـائـيـــات فـريـقـــك ❩ ♦️",
      [
        `👥 إجمالي الدعوات: ${payload.totalInvites} مستخدم.`,
        `🛍️ المستخدمين النشطين (قاموا بالشراء): ${payload.activeUsers} مستخدم.`,
        `💰 إجمالي الأرباح المكتسبة: ${payload.totalEarnings} روبل.`,
      ],
      "⬇️ استمر في النشر لزيادة أرباحك اليومية ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ Y O U R  T E A M  S T A T S ❩ ♦️",
    [
      `👥 Total invites: ${payload.totalInvites} users.`,
      `🛍️ Active users (purchased): ${payload.activeUsers} users.`,
      `💰 Total earnings: ${payload.totalEarnings} RUB.`,
    ],
    "⬇️ Keep sharing to increase your daily earnings ⬇️"
  );
}

function buildSettingsText(lang) {
  return [`<b>${t(lang, "settings_title")}</b>`, "", t(lang, "settings_body")].join("\n");
}

function buildChannelsText(lang) {
  return [`<b>${t(lang, "channels_title")}</b>`, "", t(lang, "channels_body")].join("\n");
}

function buildPublicStatsText(lang, stats) {
  return [
    `<b>${t(lang, "stats_title")}</b>`,
    "",
    `${t(lang, "stats_users")}: ${stats.totalUsers}`,
    `${t(lang, "stats_transactions")}: ${stats.totalTransactions}`,
    `${t(lang, "stats_services")}: ${stats.activeServices}`,
  ].join("\n");
}

function buildTransferText(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ تـحـويـــل الـرصـيـــد ❩ ♦️",
      [
        "💡 خدمة تتيح لك إرسال الرصيد لأصدقائك داخل البوت.",
        "💡 التحويل فوري، والحد الأدنى للتحويل هو (10 روبل).",
        "💡 لا يمكن التراجع عن الحوالة بعد تأكيدها.",
      ],
      "⬇️ يرجى اختيار الإجراء المطلوب ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ B A L A N C E  T R A N S F E R ❩ ♦️",
    [
      "💡 Send balance to your friends inside the bot.",
      "💡 Transfer is instant. Minimum amount is 10 RUB.",
      "💡 This operation cannot be reversed after confirmation.",
    ],
    "⬇️ Please choose the required action ⬇️"
  );
}

function buildTransferPromptText(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ بـيـانـات الـمـسـتـلـــم ( 1 / 2 ) ❩ ♦️",
      [
        "💡 يرجى التأكد من الآيدي (ID) بشكل دقيق جداً.",
        "💡 أي خطأ في الرقم قد يرسل الرصيد لشخص آخر.",
        "💡 الآيدي يتكون من أرقام فقط (مثال: 123456789).",
        "💡 السطر الأول: آيدي المستخدم",
        "💡 السطر الثاني: عدد العملات",
      ],
      "⬇️ أرسل الآيدي الخاص بالمستلم والمبلغ في رسالة ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ R E C E I V E R  D A T A  ( 1 / 2 ) ❩ ♦️",
    [
      "💡 Verify the receiver ID carefully.",
      "💡 Any mistake may send balance to another user.",
      "💡 ID must contain digits only (example: 123456789).",
      "💡 Line 1: User ID",
      "💡 Line 2: Amount",
    ],
    "⬇️ Send receiver ID and amount in one message ⬇️"
  );
}

function buildTransferConfirmText(lang, payload) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ تـأكـيـــد الـحـوالـــة ❩ ♦️",
      [
        `📤 من حسابك: ${escapeHtml(payload.senderName)}`,
        `📥 إلى حساب: ${escapeHtml(payload.receiverName)} (ID: ${payload.receiverId})`,
        `💵 المبلغ المراد تحويله: ${payload.amount} روبل`,
      ],
      "⬇️ يرجى المراجعة والضغط على تأكيد لإرسال الحوالة ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ T R A N S F E R  C O N F I R M A T I O N ❩ ♦️",
    [
      `📤 From: ${escapeHtml(payload.senderName)}`,
      `📥 To: ${escapeHtml(payload.receiverName)} (ID: ${payload.receiverId})`,
      `💵 Amount: ${payload.amount} RUB`,
    ],
    "⬇️ Please review and confirm to send the transfer ⬇️"
  );
}

function buildTransferHistoryText(lang, transfers) {
  const body = transfers.length
    ? transfers.slice(0, 10).map((tx, index) => {
      const directionAr = tx.type === "transfer_out" ? "إرسال" : "استلام";
      const directionEn = tx.type === "transfer_out" ? "Sent" : "Received";
      const direction = lang === "ar" ? directionAr : directionEn;
      const date = tx.createdAt || "-";
      return `${index + 1}. ${direction} - ${formatRuble(tx.amount || 0)} ${lang === "ar" ? "روبل" : "RUB"} - ${date}`;
    }).join("\n")
    : (lang === "ar" ? "لا توجد حوالات حتى الآن." : "No transfer records yet.");

  if (lang === "ar") {
    return vaultCard("♦️ ❨ سـجـــل الـحـوالـــات ❩ ♦️", [body], "⬇️ يمكنك بدء تحويل جديد في أي وقت ⬇️");
  }

  return vaultCard("♦️ ❨ T R A N S F E R  H I S T O R Y ❩ ♦️", [body], "⬇️ You can start a new transfer at any time ⬇️");
}

function buildNotificationText(lang, enabled) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ إعـــدادات الإشـعـــارات ❩ ♦️",
      [
        `🔔 حالة إشعارات العروض: ${enabled ? "مفعلة" : "متوقفة"}`,
        "💡 يمكنك تفعيل أو إيقاف رسائل العروض في أي وقت.",
      ],
      "⬇️ اختر الإجراء المناسب ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ N O T I F I C A T I O N  S E T T I N G S ❩ ♦️",
    [
      `🔔 Promotional alerts: ${enabled ? "Enabled" : "Disabled"}`,
      "💡 You can turn promotional messages on/off anytime.",
    ],
    "⬇️ Choose the required action ⬇️"
  );
}

function buildGiftPromptText(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ اسـتـــرداد كـــود هـديـــة ❩ ♦️",
      [
        "💡 أدخل كود الهدية كما وصلك تماماً.",
        "💡 في حال نجاح الكود سيتم إضافة الرصيد فوراً.",
      ],
      "⬇️ أرسل كود الهدية الآن ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ R E D E E M  G I F T  C O D E ❩ ♦️",
    [
      "💡 Enter the gift code exactly as provided.",
      "💡 Successful redemption adds balance instantly.",
    ],
    "⬇️ Send your gift code now ⬇️"
  );
}

function buildAdminPanelText(lang) {
  return [`<b>${t(lang, "admin_title")}</b>`, "", t(lang, "admin_panel_body")].join("\n");
}

module.exports = {
  sendOrEditMessage,
  sendMainMenu: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(bot, chatId, buildMainMenuText(user), getMainMenuKeyboard(getUserLang(user)), options.messageId, "sendMainMenu"),
  sendAccountMenu: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(bot, chatId, buildAccountText(user), getAccountMenuKeyboard(getUserLang(user)), options.messageId, "sendAccountMenu"),
  sendAccountProfile: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(bot, chatId, buildAccountText(user), getBackToMainMenuKeyboard(getUserLang(user)), options.messageId, "sendAccountProfile"),
  sendTransactionHistory: (bot, chatId, user, transactions, options = {}) =>
    sendOrEditMessage(bot, chatId, buildHistoryText(getUserLang(user), transactions), getBackToAccountKeyboard(getUserLang(user)), options.messageId, "sendTransactionHistory"),
  sendVipInfo: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(bot, chatId, buildVipInfoText(user), getBackToMainMenuKeyboard(getUserLang(user)), options.messageId, "sendVipInfo"),
  sendReferralMenu: (bot, chatId, user, botUsername, options = {}) =>
    sendOrEditMessage(bot, chatId, buildReferralText(getUserLang(user), user, botUsername), getReferralMenuKeyboard(getUserLang(user)), options.messageId, "sendReferralMenu"),
  sendReferralStats: (bot, chatId, user, stats, options = {}) =>
    sendOrEditMessage(bot, chatId, buildReferralStatsText(getUserLang(user), stats), getBackToReferralKeyboard(getUserLang(user)), options.messageId, "sendReferralStats"),
  sendTransferHome: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(bot, chatId, buildTransferText(getUserLang(user)), getTransferMenuKeyboard(getUserLang(user)), options.messageId, "sendTransferHome"),
  sendTransferPrompt: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(
      bot,
      chatId,
      buildTransferPromptText(getUserLang(user)),
      { inline_keyboard: [[{ text: getUserLang(user) === "ar" ? "🔙 عودة" : "🔙 Back", callback_data: "transfer:cancel" }]] },
      options.messageId,
      "sendTransferPrompt"
    ),
  sendTransferConfirm: (bot, chatId, user, payload, options = {}) =>
    sendOrEditMessage(bot, chatId, buildTransferConfirmText(getUserLang(user), payload), getTransferConfirmKeyboard(getUserLang(user)), options.messageId, "sendTransferConfirm"),
  sendTransferHistory: (bot, chatId, user, transfers, options = {}) =>
    sendOrEditMessage(bot, chatId, buildTransferHistoryText(getUserLang(user), transfers), { inline_keyboard: [[{ text: getUserLang(user) === "ar" ? "🔙 العودة للتحويل" : "🔙 Back to Transfer", callback_data: "action:transfer_balance" }]] }, options.messageId, "sendTransferHistory"),
  sendNotificationSettings: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(
      bot,
      chatId,
      buildNotificationText(getUserLang(user), Boolean(user.notifyPromotions !== false)),
      {
        inline_keyboard: [
          [{ text: getUserLang(user) === "ar" ? "✅ تفعيل الإشعارات" : "✅ Enable Notifications", callback_data: "account:notify:on" }],
          [{ text: getUserLang(user) === "ar" ? "🚫 إيقاف الإشعارات" : "🚫 Disable Notifications", callback_data: "account:notify:off" }],
          [{ text: getUserLang(user) === "ar" ? "🔙 العودة لحسابي" : "🔙 Back to My Account", callback_data: "menu:account" }],
        ],
      },
      options.messageId,
      "sendNotificationSettings"
    ),
  sendGiftCodePrompt: (bot, chatId, user, options = {}) =>
    sendOrEditMessage(bot, chatId, buildGiftPromptText(getUserLang(user)), getBackToAccountKeyboard(getUserLang(user)), options.messageId, "sendGiftCodePrompt"),
  sendSettingsMenu: (bot, chatId, options = {}) =>
    sendOrEditMessage(bot, chatId, buildSettingsText(options.lang || "ar"), getSettingsMenuKeyboard(options.lang || "ar"), options.messageId, "sendSettingsMenu"),
  sendChannelsMenu: (bot, chatId, options = {}) =>
    sendOrEditMessage(bot, chatId, buildChannelsText(options.lang || "ar"), getChannelsKeyboard(options.lang || "ar"), options.messageId, "sendChannelsMenu"),
  sendPublicStats: (bot, chatId, stats, options = {}) =>
    sendOrEditMessage(bot, chatId, buildPublicStatsText(options.lang || "ar", stats), getBackToMainMenuKeyboard(options.lang || "ar"), options.messageId, "sendPublicStats"),
  sendTransferInstructions: (bot, chatId, options = {}) =>
    sendOrEditMessage(bot, chatId, buildTransferText(options.lang || "ar"), getBackToMainMenuKeyboard(options.lang || "ar"), options.messageId, "sendTransferInstructions"),
  sendAdminPanel: (bot, chatId, options = {}) =>
    sendOrEditMessage(bot, chatId, buildAdminPanelText(options.lang || "ar"), getAdminPanelKeyboard(options.lang || "ar"), options.messageId, "sendAdminPanel"),
  sendServiceToggleMenu: (bot, chatId, services, options = {}) =>
    sendOrEditMessage(bot, chatId, `<b>${t(options.lang || "ar", "admin_btn_manage_services")}</b>`, getServicesManagementKeyboard(services, "toggle", options.lang || "ar"), options.messageId, "sendServiceToggleMenu"),
  sendServicePricesMenu: (bot, chatId, services, options = {}) =>
    sendOrEditMessage(bot, chatId, `<b>${t(options.lang || "ar", "admin_btn_edit_prices")}</b>`, getServicesManagementKeyboard(services, "price", options.lang || "ar"), options.messageId, "sendServicePricesMenu"),
};
