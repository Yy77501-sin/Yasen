const { safeTelegramCall } = require("./telegramSafe");
const { getUserLang } = require("../locales");
const { escapeHtml, getDisplayName } = require("../utils/formatters");
const { getUserState, setUserState, clearUserState } = require("./stateStore");
const {
  TEMP_EMAIL_ITEM_INDEX_TO_GROUP,
  getTempEmailGroup,
  getTempEmailOptionBySku,
} = require("../constants/tempEmailCatalog");

const MAX_LIST_SIZE = 5;

function labelByLang(lang, option) {
  return lang === "ar" ? option.arName : option.enName;
}

function buildListCard(lang) {
  if (lang === "ar") {
    return [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ قـائـمـــة الإيـمـيـلـات الـجـاهـــزة ❩ ♦️",
      "💡 تصفح قائمة الإيميلات المتوفرة لدينا حالياً.",
      "💡 جميع هذه الحسابات جاهزة للتسليم الفوري.",
      "💡 اضغط على (تحديث) لرؤية خيارات أخرى.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى الضغط على الإيميل الذي يعجبك ⬇️",
    ].join("\n");
  }

  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    "━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ R E A D Y  E M A I L  L I S T ❩ ♦️",
    "💡 Browse currently available email accounts.",
    "💡 All entries are ready for instant delivery.",
    "💡 Press refresh to show more options.",
    "━━━━━━━━━━━━━━━━━━",
    "⬇️ Tap any email to continue ⬇️",
  ].join("\n");
}

function buildConfirmCard(lang, email, price) {
  if (lang === "ar") {
    return [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ تـأكـيـــد اخـتـيـــار الإيـمـيـــل ❩ ♦️",
      `📧 الإيميل المختار: ${escapeHtml(email)}`,
      `💰 سعر الحساب الدائم: ${price}$`,
      "💡 سيتم خصم الرصيد وتسليمك كلمة المرور فوراً.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى التأكيد لاستلام بيانات الدخول ⬇️",
    ].join("\n");
  }

  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    "━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ E M A I L  S E L E C T I O N  C O N F I R M A T I O N ❩ ♦️",
    `📧 Selected email: ${escapeHtml(email)}`,
    `💰 Permanent account price: ${price}$`,
    "💡 Balance will be charged and password delivered instantly.",
    "━━━━━━━━━━━━━━━━━━",
    "⬇️ Please confirm to receive login credentials ⬇️",
  ].join("\n");
}

function buildDeliveryCard(lang, email, password) {
  if (lang === "ar") {
    return [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ تـــم تـسـلـيـــم الإيـمـيـــل ❩ ♦️",
      "💡 مبروك! تمت عملية الشراء بنجاح تام.",
      `📧 الإيميل: ${escapeHtml(email)}`,
      `🔑 كلمة المرور: <code>${escapeHtml(password)}</code>`,
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    "━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ E M A I L  D E L I V E R E D ❩ ♦️",
    "💡 Purchase completed successfully.",
    `📧 Email: ${escapeHtml(email)}`,
    `🔑 Password: <code>${escapeHtml(password)}</code>`,
    "━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

function buildCustomPromptCard(lang) {
  if (lang === "ar") {
    return [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ إنـشـــاء إيـمـيـــل مـخـصـص ❩ ♦️",
      "💡 احصل على إيميل دائم بالاسم الذي تختاره.",
      "💡 الإيميل سيكون على نطاقنا (vaultx.net@).",
      "💡 يرجى كتابة الاسم باللغة الإنجليزية فقط.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ أرسل الاسم المطلوب للإيميل في رسالة الآن ⬇️",
    ].join("\n");
  }

  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    "━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ C R E A T E  C U S T O M  E M A I L ❩ ♦️",
    "💡 Get a permanent mailbox with your chosen name.",
    "💡 Domain will be under vaultx.net.",
    "💡 Use English letters, numbers, dot or underscore only.",
    "━━━━━━━━━━━━━━━━━━",
    "⬇️ Send your desired email name now ⬇️",
  ].join("\n");
}

function buildCustomConfirmCard(lang, localName, price) {
  const email = `${localName}@vaultx.net`;
  if (lang === "ar") {
    return [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ تـأكـيـــد إنـشـــاء الإيـمـيـــل ❩ ♦️",
      `📧 الإيميل المطلوب: ${escapeHtml(email)}`,
      `🟢 الحالة: متاح | 💰 السعر: ${price}$`,
      "💡 سيتم إنشاء الإيميل فوراً بعد التأكيد والخصم.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى مراجعة الطلب والضغط على تأكيد ⬇️",
    ].join("\n");
  }

  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    "━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ C O N F I R M  E M A I L  C R E A T I O N ❩ ♦️",
    `📧 Requested email: ${escapeHtml(email)}`,
    `🟢 Status: Available | 💰 Price: ${price}$`,
    "💡 Email will be created instantly after confirmation.",
    "━━━━━━━━━━━━━━━━━━",
    "⬇️ Review your request and confirm ⬇️",
  ].join("\n");
}

function buildNoStockText(lang, option) {
  if (lang === "ar") {
    return `لا توجد حسابات متوفرة حالياً لخيار ${option.arName}.\nيرجى المحاولة لاحقاً.`;
  }
  return `No stock is available now for ${option.enName}.\nPlease try again later.`;
}

function buildGroupKeyboard(group, lang) {
  const buttons = group.options.map((option) => [{
    text: `${labelByLang(lang, option)} - ${option.price}$`,
    callback_data: `te:opt:${option.sku}`,
  }]);
  return {
    inline_keyboard: [
      ...buttons,
      [{ text: lang === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: "service:temporary_emails" }],
    ],
  };
}

function buildListKeyboard(lang, option, accounts, offset) {
  const listButtons = accounts.map((account) => ([{
    text: `${account.email}`,
    callback_data: `te:pick:${option.sku}:${account.id}:${offset}`,
  }]));

  return {
    inline_keyboard: [
      ...listButtons,
      [
        { text: lang === "ar" ? "🔄 تحديث وعرض المزيد" : "🔄 Refresh & More", callback_data: `te:list:${option.sku}:${offset + MAX_LIST_SIZE}` },
        { text: lang === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: `te:group:${option.groupKey}` },
      ],
    ],
  };
}

function buildConfirmKeyboard(lang, option, accountId, offset) {
  return {
    inline_keyboard: [
      [{ text: lang === "ar" ? "✅ تأكيد واستلام الرمز" : "✅ Confirm & Receive", callback_data: `te:confirm:${option.sku}:${accountId}` }],
      [{ text: lang === "ar" ? "❌ إلغاء ورجوع" : "❌ Cancel & Back", callback_data: `te:list:${option.sku}:${offset}` }],
    ],
  };
}

function buildCustomConfirmKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: lang === "ar" ? "✅ تأكيد وإنشاء الإيميل" : "✅ Confirm & Create", callback_data: "te:create:confirm" }],
      [{ text: lang === "ar" ? "❌ إلغاء وتغيير الاسم" : "❌ Cancel & Rename", callback_data: "te:create:cancel" }],
    ],
  };
}

function randomPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function normalizeCustomName(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidCustomName(value) {
  return /^[a-z0-9._-]{3,30}$/.test(value);
}

async function editOrSend(bot, query, text, replyMarkup) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  return safeTelegramCall("temporaryEmails.editOrSend", () =>
    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    })
  );
}

function getPagedAccounts(allAccounts, offset) {
  if (!allAccounts.length) return [];
  const safeOffset = ((Number(offset) || 0) % allAccounts.length + allAccounts.length) % allAccounts.length;
  const paged = [];
  for (let i = 0; i < Math.min(MAX_LIST_SIZE, allAccounts.length); i += 1) {
    paged.push(allAccounts[(safeOffset + i) % allAccounts.length]);
  }
  return paged;
}

async function openGroupMenu(bot, query, lang, groupKey) {
  const group = getTempEmailGroup(groupKey);
  if (!group) return false;

  const text = lang === "ar" ? group.introAr : group.introEn;
  await editOrSend(bot, query, text, buildGroupKeyboard(group, lang));
  return true;
}

async function openOptionList(bot, query, appStore, lang, sku, offset = 0) {
  const option = getTempEmailOptionBySku(sku);
  if (!option || option.custom) return false;

  const allAccounts = appStore.getTemporaryEmailAccounts(option.sku);
  if (!allAccounts.length) {
    await editOrSend(bot, query, buildNoStockText(lang, option), {
      inline_keyboard: [[{ text: lang === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: `te:group:${option.groupKey}` }]],
    });
    return true;
  }

  const page = getPagedAccounts(allAccounts, Number(offset) || 0);
  await editOrSend(bot, query, buildListCard(lang), buildListKeyboard(lang, option, page, Number(offset) || 0));
  return true;
}

async function openConfirmForAccount(bot, query, appStore, lang, sku, accountId, offset) {
  const option = getTempEmailOptionBySku(sku);
  if (!option || option.custom) return false;

  const account = appStore.getTemporaryEmailAccounts(sku).find((row) => String(row.id) === String(accountId));
  if (!account) {
    return openOptionList(bot, query, appStore, sku, offset);
  }

  await editOrSend(bot, query, buildConfirmCard(lang, account.email, option.price), buildConfirmKeyboard(lang, option, accountId, offset));
  return true;
}

async function confirmAccountPurchase(bot, query, appStore, lang, user, sku, accountId) {
  const option = getTempEmailOptionBySku(sku);
  if (!option || option.custom) return false;

  const account = appStore.getTemporaryEmailAccounts(sku).find((row) => String(row.id) === String(accountId));
  if (!account) {
    await safeTelegramCall("temporaryEmails.confirm.missing", () =>
      bot.answerCallbackQuery(query.id, { text: lang === "ar" ? "هذا الحساب لم يعد متاحاً." : "This account is no longer available.", show_alert: true })
    );
    return openOptionList(bot, query, appStore, lang, sku, 0);
  }

  if (Number(user.balance || 0) < Number(option.price)) {
    await safeTelegramCall("temporaryEmails.confirm.insufficient", () =>
      bot.answerCallbackQuery(query.id, { text: lang === "ar" ? "رصيدك غير كافٍ." : "Insufficient balance.", show_alert: true })
    );
    return true;
  }

  const removed = appStore.consumeTemporaryEmailAccount(sku, accountId);
  if (!removed) {
    await safeTelegramCall("temporaryEmails.confirm.race", () =>
      bot.answerCallbackQuery(query.id, { text: lang === "ar" ? "تم بيع هذا الحساب قبل لحظات." : "This account was already sold.", show_alert: true })
    );
    return openOptionList(bot, query, appStore, lang, sku, 0);
  }

  appStore.deductBalance(user.userId, option.price);
  appStore.incrementTransactions(user.userId);
  appStore.addTransaction({
    type: "temporary_email_purchase",
    userId: user.userId,
    amount: Number(option.price),
    serviceKey: "temporary_emails",
    emailSku: sku,
    deliveredEmail: removed.email,
    status: "completed",
  });

  await editOrSend(bot, query, buildDeliveryCard(lang, removed.email, removed.password), {
    inline_keyboard: [[{ text: lang === "ar" ? "🔙 العودة للقسم" : "🔙 Back to Section", callback_data: "service:temporary_emails" }]],
  });
  return true;
}

async function startCustomEmailFlow(bot, query, lang) {
  const userId = query.from.id;
  setUserState(userId, "TEMP_EMAIL_AWAIT_CUSTOM_NAME", {});

  await editOrSend(bot, query, buildCustomPromptCard(lang), {
    inline_keyboard: [[{ text: lang === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: "te:group:permanent" }]],
  });
  return true;
}

async function confirmCustomEmailCreate(bot, query, appStore, lang) {
  const state = getUserState(query.from.id);
  if (!state || state.name !== "TEMP_EMAIL_AWAIT_CUSTOM_CONFIRM") {
    return false;
  }

  const option = getTempEmailOptionBySku("permanent_custom");
  const user = appStore.getOrCreateUser(query.from);
  const localName = String(state.localName || "");

  if (!option || !localName) return false;

  if (Number(user.balance || 0) < Number(option.price)) {
    await safeTelegramCall("temporaryEmails.custom.insufficient", () =>
      bot.answerCallbackQuery(query.id, { text: lang === "ar" ? "رصيدك غير كافٍ." : "Insufficient balance.", show_alert: true })
    );
    return true;
  }

  const email = `${localName}@vaultx.net`;
  const password = randomPassword(10);

  appStore.deductBalance(user.userId, option.price);
  appStore.incrementTransactions(user.userId);
  appStore.addTransaction({
    type: "temporary_email_custom_create",
    userId: user.userId,
    amount: Number(option.price),
    serviceKey: "temporary_emails",
    emailSku: option.sku,
    deliveredEmail: email,
    status: "completed",
  });

  clearUserState(query.from.id);
  await editOrSend(bot, query, buildDeliveryCard(lang, email, password), {
    inline_keyboard: [[{ text: lang === "ar" ? "🔙 العودة للقسم" : "🔙 Back to Section", callback_data: "service:temporary_emails" }]],
  });
  return true;
}

async function handleTemporaryEmailCallback(bot, query, appStore) {
  const data = String(query.data || "");
  const user = appStore.getOrCreateUser(query.from);
  const lang = getUserLang(user);

  if (data.startsWith("service_menu:temporary_emails:item:")) {
    const itemIndex = Number(data.split(":")[3]);
    const groupKey = TEMP_EMAIL_ITEM_INDEX_TO_GROUP[itemIndex];
    if (!groupKey) {
      return false;
    }
    return openGroupMenu(bot, query, lang, groupKey);
  }

  if (!data.startsWith("te:")) {
    return false;
  }

  if (data.startsWith("te:group:")) {
    const groupKey = data.split(":")[2];
    return openGroupMenu(bot, query, lang, groupKey);
  }

  if (data.startsWith("te:opt:")) {
    const sku = data.split(":")[2];
    const option = getTempEmailOptionBySku(sku);
    if (!option) return true;
    if (option.custom) {
      return startCustomEmailFlow(bot, query, lang);
    }
    return openOptionList(bot, query, appStore, lang, sku, 0);
  }

  if (data.startsWith("te:list:")) {
    const [, , sku, offsetRaw] = data.split(":");
    return openOptionList(bot, query, appStore, lang, sku, Number(offsetRaw) || 0);
  }

  if (data.startsWith("te:pick:")) {
    const [, , sku, accountId, offsetRaw] = data.split(":");
    return openConfirmForAccount(bot, query, appStore, lang, sku, accountId, Number(offsetRaw) || 0);
  }

  if (data.startsWith("te:confirm:")) {
    const [, , sku, accountId] = data.split(":");
    return confirmAccountPurchase(bot, query, appStore, lang, user, sku, accountId);
  }

  if (data === "te:create:cancel") {
    clearUserState(query.from.id);
    return openGroupMenu(bot, query, lang, "permanent");
  }

  if (data === "te:create:confirm") {
    return confirmCustomEmailCreate(bot, query, appStore, lang);
  }

  return false;
}

async function handleTemporaryEmailTextInput(bot, msg, appStore) {
  const state = getUserState(msg.from.id);
  if (!state) return false;

  if (state.name !== "TEMP_EMAIL_AWAIT_CUSTOM_NAME") {
    return false;
  }

  const user = appStore.getOrCreateUser(msg.from);
  const lang = getUserLang(user);
  const localName = normalizeCustomName(msg.text);

  if (!isValidCustomName(localName)) {
    await safeTelegramCall("temporaryEmails.custom.invalidName", () =>
      bot.sendMessage(
        msg.chat.id,
        lang === "ar"
          ? "الاسم غير صالح. استخدم أحرف إنجليزية أو أرقام فقط (3 إلى 30)."
          : "Invalid name. Use English letters/numbers only (3 to 30)."
      )
    );
    return true;
  }

  setUserState(msg.from.id, "TEMP_EMAIL_AWAIT_CUSTOM_CONFIRM", { localName });
  const option = getTempEmailOptionBySku("permanent_custom");
  await safeTelegramCall("temporaryEmails.custom.confirmPrompt", () =>
    bot.sendMessage(msg.chat.id, buildCustomConfirmCard(lang, localName, option?.price || 8), {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: buildCustomConfirmKeyboard(lang),
    })
  );
  return true;
}

function buildAdminUploadRootText(lang) {
  if (lang === "ar") {
    return [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ رفـــع بـيـانـــات الـخـدمـــات ❩ ♦️",
      "💡 اختر القسم المطلوب لرفع البيانات المخزنة محلياً.",
      "💡 سيتم حفظ كل حساب وربطه بالخدمة المحددة.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ اختر القسم من الأزرار أدناه ⬇️",
    ].join("\n");
  }

  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    "━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ U P L O A D  S E R V I C E  D A T A ❩ ♦️",
    "💡 Select the section for local stock upload.",
    "💡 Each account will be linked to its exact service.",
    "━━━━━━━━━━━━━━━━━━",
    "⬇️ Choose a section from the buttons below ⬇️",
  ].join("\n");
}

function buildAdminUploadInputText(lang, option) {
  if (lang === "ar") {
    return [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ رفـــع حـســـاب جـديـــد ❩ ♦️",
      `📌 الخدمة المختارة: ${option.arName} (${option.price}$)`,
      "💡 أرسل البيانات في سطرين بنفس الترتيب:",
      "السطر الأول: اسم الحساب / الإيميل",
      "السطر الثاني: رمز الحساب / كلمة المرور",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ أرسل البيانات الآن في رسالة واحدة ⬇️",
    ].join("\n");
  }

  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    "━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ U P L O A D  N E W  A C C O U N T ❩ ♦️",
    `📌 Selected service: ${option.enName} (${option.price}$)`,
    "💡 Send data using exactly two lines:",
    "Line 1: Account username/email",
    "Line 2: Account password/code",
    "━━━━━━━━━━━━━━━━━━",
    "⬇️ Send account data now in one message ⬇️",
  ].join("\n");
}

function getTempEmailUploadOptions() {
  const skus = [
    "plus_outlook",
    "plus_protonmail",
    "plus_gmail",
    "business_edu",
    "business_company",
    "permanent_ready",
  ];
  return skus.map((sku) => getTempEmailOptionBySku(sku)).filter(Boolean);
}

module.exports = {
  handleTemporaryEmailCallback,
  handleTemporaryEmailTextInput,
  buildAdminUploadRootText,
  buildAdminUploadInputText,
  getTempEmailUploadOptions,
  getTempEmailGroup,
  getTempEmailOptionBySku,
};
