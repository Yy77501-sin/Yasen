const fs = require("fs");
const path = require("path");
const { ADMIN_ID, ADMIN_IDS, USERS_EXPORT_PATH } = require("../config");
const { clearUserState, getUserState, setUserState } = require("../services/stateStore");
const {
  checkSmsProviderBalance,
  checkSmmProviderBalance,
} = require("../services/providerManagementService");
const {
  sendMainMenu,
  sendTransferHome,
  sendTransferConfirm,
  sendAdminPanel,
  sendServicePricesMenu,
  sendServiceToggleMenu,
} = require("../services/profileService");
const {
  sendStarsCheckout,
  createCryptoInvoiceForRub,
  sendCryptoInvoiceCheckout,
  createCryptomusPayment,
  sendCryptomusInvoiceCard,
  usdToRub,
} = require("../services/topupService");
const { safeTelegramCall } = require("../services/telegramSafe");
const { logBotError } = require("../services/errorLogger");
const { formatRuble, escapeHtml, getDisplayName } = require("../utils/formatters");
const { notifyAdmin } = require("./startHandler");
const { getUserLang } = require("../locales");
const { handleVirtualNumbersTextInput } = require("../services/virtualNumbersFlowService");
const { handleSocialBoostTextInput } = require("../services/serviceMenusService");
const { handleGameTopupTextInput } = require("../services/gameTopupFlowService");
const { handleProAccountsTextInput } = require("../services/proAccountsFlowService");
const { handleCloudServicesTextInput } = require("../services/cloudServicesFlowService");
const { handleDigitalServicesTextInput } = require("../services/digitalServicesFlowService");
const { handleTemporaryEmailTextInput } = require("../services/tempEmailFlowService");
const { fetchAndCacheSmmServices } = require("../services/smmCacheService");

function normalizeApiUrl(raw) {
  let url = String(raw || "").trim();
  url = url.replace(/^[<"'`]+|[>"'`]+$/g, "").trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return null;
    }
    return url;
  } catch (_) {
    return null;
  }
}

async function safeSendHtmlOrText(bot, chatId, htmlText, plainFallbackText, options = {}) {
  try {
    return await bot.sendMessage(chatId, htmlText, { parse_mode: "HTML", ...options });
  } catch (err) {
    try {
      const fallback = plainFallbackText || String(htmlText || "").replace(/<[^>]*>/g, "");
      const { parse_mode, ...safeOptions } = options;
      return await bot.sendMessage(chatId, fallback, safeOptions);
    } catch (innerErr) {
      logBotError("safeSendHtmlOrText", innerErr, { chatId });
      return null;
    }
  }
}

async function exportUsersList(bot, chatId, appStore) {
  try {
    fs.mkdirSync(path.dirname(USERS_EXPORT_PATH), { recursive: true });
    const content = appStore
      .getUsers()
      .map((user) => `${user.userId} | ${user.username || "-"} | ${user.firstName || "-"}`)
      .join("\n");
    fs.writeFileSync(USERS_EXPORT_PATH, content, "utf8");

    await safeTelegramCall("exportUsersList", () =>
      bot.sendDocument(chatId, USERS_EXPORT_PATH, {}, {
        filename: "vaultx-users.txt",
        contentType: "text/plain",
      })
    );
  } catch (error) {
    logBotError("exportUsersList", error, { chatId });
  }
}

async function handleReadyTelegramSearchInput(bot, msg, appStore) {
  try {
    const state = getUserState(msg.from.id);
    if (!state || state.name !== "TG_READY_SEARCH") {
      return false;
    }
    const text = String(msg.text || "").trim();
    if (text.toLowerCase() === "cancel") {
      clearUserState(msg.from.id);
      const user = appStore.findUserById(msg.from.id) || appStore.getOrCreateUser(msg.from);
      const { sendReadyTelegramMenu } = require("../services/telegramReadyService");
      await sendReadyTelegramMenu(bot, msg.chat.id, user, 0);
      return true;
    }
    clearUserState(msg.from.id);
    const user = appStore.findUserById(msg.from.id) || appStore.getOrCreateUser(msg.from);
    const { handleReadySearch } = require("../services/telegramReadyService");
    await handleReadySearch(bot, msg.chat.id, user, text);
    return true;
  } catch (error) {
    logBotError("handleReadyTelegramSearchInput", error, { userId: msg.from?.id });
    return false;
  }
}

async function handleTransferInput(bot, msg, appStore) {
  try {
    const state = getUserState(msg.from.id);
    if (!state || state.name !== "AWAITING_TRANSFER_PAYLOAD") {
      return false;
    }

    const sender = appStore.findUserById(msg.from.id) || appStore.getOrCreateUser(msg.from);
    const lang = getUserLang(sender);
    const text = String(msg.text || "").trim();

    if (text.toLowerCase() === "cancel") {
      clearUserState(msg.from.id);
      await safeTelegramCall("handleTransferInput.cancel", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "تم إلغاء عملية التحويل." : "Transfer has been canceled.")
      );
      await sendTransferHome(bot, msg.chat.id, sender);
      return true;
    }

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length !== 2) {
      await safeTelegramCall("handleTransferInput.invalidFormat", () =>
        bot.sendMessage(
          msg.chat.id,
          lang === "ar"
            ? "أرسل البيانات بهذا الشكل:\nالسطر الأول: آيدي المستلم\nالسطر الثاني: المبلغ"
            : "Send exactly two lines:\nLine 1: Receiver ID\nLine 2: Amount"
        )
      );
      return true;
    }

    const targetUserId = Number(lines[0]);
    const amount = Number(lines[1]);
    const receiver = appStore.findUserById(targetUserId);

    if (!receiver) {
      await safeTelegramCall("handleTransferInput.receiverMissing", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "هذا الآيدي غير مسجل في البوت." : "This user ID is not registered in the bot.")
      );
      return true;
    }

    if (Number(sender.userId) === Number(receiver.userId)) {
      await safeTelegramCall("handleTransferInput.selfTransfer", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "لا يمكنك التحويل إلى نفسك." : "You cannot transfer to yourself.")
      );
      return true;
    }

    if (!Number.isFinite(amount) || amount < 10) {
      await safeTelegramCall("handleTransferInput.invalidAmount", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "المبلغ غير صالح. الحد الأدنى 10 روبل." : "Invalid amount. Minimum is 10 RUB.")
      );
      return true;
    }

    if (Number(sender.balance || 0) < amount) {
      await safeTelegramCall("handleTransferInput.insufficient", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "رصيدك غير كافٍ." : "Insufficient balance.")
      );
      return true;
    }

    setUserState(sender.userId, "AWAITING_TRANSFER_CONFIRM", {
      targetUserId: receiver.userId,
      amount,
    });

    await safeTelegramCall("handleTransferInput.confirmPrompt", () =>
      sendTransferConfirm(bot, msg.chat.id, sender, {
        senderName: getDisplayName(sender),
        receiverName: getDisplayName(receiver),
        receiverId: receiver.userId,
        amount,
      })
    );

    return true;
  } catch (error) {
    logBotError("handleTransferInput", error, { userId: msg.from?.id });
    return false;
  }
}
async function handleTopupAmountInput(bot, msg, appStore) {
  try {
    const state = getUserState(msg.from.id);
    if (!state || (
      state.name !== "AWAITING_TOPUP_STARS_AMOUNT"
      && state.name !== "AWAITING_TOPUP_CRYPTO_AMOUNT"
      && state.name !== "AWAITING_TOPUP_CRYPTOMUS_USD"
    )) {
      return false;
    }
    const user = appStore.findUserById(msg.from.id) || appStore.getOrCreateUser(msg.from);
    const lang = getUserLang(user);

    if (msg.text.trim().toLowerCase() === "cancel") {
      clearUserState(msg.from.id);
      await safeTelegramCall("handleTopupAmountInput.cancel", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "تم إلغاء عملية الشحن." : "Top-up flow cancelled.")
      );
      return true;
    }

    if (!/^\d+(\.\d+)?$/.test(msg.text.trim())) {
      await safeTelegramCall("handleTopupAmountInput.invalidText", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "❌ أدخل رقماً صحيحاً للمبلغ." : "❌ Enter a valid numeric amount.")
      );
      return true;
    }

    const enteredAmount = Number(msg.text.trim());
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      await safeTelegramCall("handleTopupAmountInput.invalidAmount", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "❌ يجب أن يكون المبلغ أكبر من صفر." : "❌ Amount must be greater than zero.")
      );
      return true;
    }

    if (state.name === "AWAITING_TOPUP_STARS_AMOUNT") {
      clearUserState(msg.from.id);
      await sendStarsCheckout(bot, msg.chat.id, enteredAmount, lang);
      return true;
    }

    if (state.name === "AWAITING_TOPUP_CRYPTOMUS_USD") {
      const amountUsd = Number(enteredAmount.toFixed(2));
      const invoice = await createCryptomusPayment(amountUsd, msg.from.id);
      clearUserState(msg.from.id);

      appStore.addTransaction({
        type: "topup_cryptomus_pending",
        userId: msg.from.id,
        amountUsd,
        amount: usdToRub(amountUsd),
        cryptomusOrderId: invoice.orderId,
        cryptomusInvoiceId: invoice.invoiceId,
        method: "Cryptomus Hosted Checkout",
        serviceKey: "balance_topup",
        status: "pending",
      });

      await sendCryptomusInvoiceCard(bot, msg.chat.id, {
        amountUsd,
        payUrl: invoice.payUrl,
      }, { lang });
      return true;
    }

    const asset = String(state.asset || "").toUpperCase();
    if (!asset) {
      clearUserState(msg.from.id);
      await safeTelegramCall("handleTopupAmountInput.missingAsset", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "❌ لم يتم تحديد العملة." : "❌ Currency is not selected.")
      );
      return true;
    }

    const amountRub = Number(enteredAmount.toFixed(2));
    const invoice = await createCryptoInvoiceForRub(msg.from.id, amountRub, asset);
    clearUserState(msg.from.id);

    appStore.addTransaction({
      type: "topup_crypto_pending",
      userId: msg.from.id,
      amount: amountRub,
      cryptoAsset: invoice.asset,
      cryptoAssetAmount: invoice.amountAsset,
      cryptoInvoiceId: invoice.invoiceId,
      method: `Crypto Pay (${invoice.asset})`,
      serviceKey: "balance_topup",
      status: "pending",
      payload: invoice.payload,
    });

    await sendCryptoInvoiceCheckout(bot, msg.chat.id, {
      amountRub,
      amountAsset: invoice.amountAsset,
      asset: invoice.asset,
      payUrl: invoice.payUrl,
    }, { lang });

    return true;
  } catch (error) {
    logBotError("handleTopupAmountInput", error, { userId: msg.from?.id });
    const user = appStore.findUserById(msg.from.id) || appStore.getOrCreateUser(msg.from);
    const lang = getUserLang(user);
    const reason = String(error?.message || "");
    await safeTelegramCall("handleTopupAmountInput.replyError", () =>
      bot.sendMessage(
        msg.chat.id,
        lang === "ar"
          ? `تعذر إنشاء الفاتورة حالياً.${reason ? `\nسبب تقني: ${reason}` : ""}`
          : `Unable to create invoice right now.${reason ? `\nTechnical reason: ${reason}` : ""}`
      )
    );
    return false;
  }
}

async function handleCustomServiceRequest(bot, msg) {
  try {
    const state = getUserState(msg.from.id);
    if (!state || state.name !== "AWAITING_CUSTOM_SERVICE") {
      return false;
    }

    clearUserState(msg.from.id);

    await notifyAdmin(
      bot,
      [
        "<b>Custom Service Request</b>",
        `User ID: <code>${msg.from.id}</code>`,
        `Username: ${msg.from.username ? `@${escapeHtml(msg.from.username)}` : "ط؛ظٹط± ظ…ط­ط¯ط¯"}`,
        "",
        escapeHtml(msg.text),
      ].join("\n")
    );

    await safeTelegramCall("handleCustomServiceRequest.confirm", () =>
      bot.sendMessage(
        msg.chat.id,
        "âœ… طھظ… ط¥ط±ط³ط§ظ„ ط·ظ„ط¨ظƒ ط¥ظ„ظ‰ ط§ظ„ط¥ط¯ط§ط±ط© ط¨ظ†ط¬ط§ط­. ظٹط±ط¬ظ‰ ط§ظ„ط§ظ†طھط¸ط§ط± ظ„ط­ظٹظ† ظ…ط±ط§ط¬ط¹ط© ط·ظ„ط¨ظƒ ظˆط§ظ„طھظˆط§طµظ„ ظ…ط¹ظƒ."
      )
    );

    return true;
  } catch (error) {
    logBotError("handleCustomServiceRequest", error, { userId: msg.from?.id });
    return false;
  }
}

async function handleGiftCodeInput(bot, msg, appStore) {
  try {
    const state = getUserState(msg.from.id);
    if (!state || state.name !== "ACCOUNT_AWAIT_GIFT_CODE") {
      return false;
    }

    const user = appStore.findUserById(msg.from.id) || appStore.getOrCreateUser(msg.from);
    const lang = getUserLang(user);
    const code = String(msg.text || "").trim();

    if (!code) {
      await safeTelegramCall("handleGiftCodeInput.empty", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "أرسل كود الهدية بشكل صحيح." : "Please send a valid gift code.")
      );
      return true;
    }

    const result = appStore.redeemGiftCode(user.userId, code);
    if (!result.ok) {
      const reasonMapAr = {
        USER_NOT_FOUND: "المستخدم غير موجود.",
        INVALID_CODE: "الكود غير صالح.",
        NOT_FOUND: "الكود غير موجود أو منتهي.",
        ALREADY_REDEEMED: "تم استخدام هذا الكود سابقاً.",
        EXHAUSTED: "انتهت مرات استخدام هذا الكود.",
        INVALID_AMOUNT: "الكود غير صالح حالياً.",
      };
      const reasonMapEn = {
        USER_NOT_FOUND: "User not found.",
        INVALID_CODE: "Invalid code.",
        NOT_FOUND: "Code not found or expired.",
        ALREADY_REDEEMED: "This code was already redeemed.",
        EXHAUSTED: "Code usage limit reached.",
        INVALID_AMOUNT: "Code is invalid right now.",
      };

      await safeTelegramCall("handleGiftCodeInput.failed", () =>
        bot.sendMessage(
          msg.chat.id,
          lang === "ar" ? reasonMapAr[result.reason] || "تعذر استرداد الكود." : reasonMapEn[result.reason] || "Failed to redeem code."
        )
      );
      return true;
    }

    clearUserState(user.userId);
    const updatedUser = appStore.findUserById(user.userId) || user;

    await safeTelegramCall("handleGiftCodeInput.success", () =>
      bot.sendMessage(
        msg.chat.id,
        lang === "ar"
          ? `✅ تم استرداد الكود ${result.code} وإضافة ${result.amount} روبل إلى رصيدك.\n💰 رصيدك الحالي: ${formatRuble(updatedUser.balance)} RUB`
          : `✅ Code ${result.code} redeemed successfully. ${result.amount} RUB added.\n💰 Current balance: ${formatRuble(updatedUser.balance)} RUB`
      )
    );
    return true;
  } catch (error) {
    logBotError("handleGiftCodeInput", error, { userId: msg.from?.id });
    return false;
  }
}
async function handleAdminState(bot, msg, appStore) {
  try {
    const state = getUserState(msg.from.id);
    const isAdmin = (Array.isArray(ADMIN_IDS) && ADMIN_IDS.includes(Number(msg.from.id))) || msg.from.id === ADMIN_ID;
    if (!state || !isAdmin) {
      return false;
    }
    const adminLang = getUserLang(appStore.findUserById(msg.from.id));

    const textTrim = String(msg.text || "").trim();
    if (textTrim.toLowerCase() === "cancel" || textTrim === "الغاء" || textTrim === "إلغاء") {
      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.cancel", () => bot.sendMessage(msg.chat.id, "❌ تم إلغاء العملية."));
      await sendAdminPanel(bot, msg.chat.id, { lang: adminLang });
      return true;
    }

    if (state.name === "AWAITING_ADD_BALANCE_ID") {
      const targetUserId = Number(msg.text.trim());
      const target = appStore.findUserById(targetUserId);

      if (!target) {
        await safeTelegramCall("handleAdminState.addBalanceUserMissing", () => bot.sendMessage(msg.chat.id, "ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯."));
        return true;
      }

      setUserState(msg.from.id, "AWAITING_ADD_BALANCE_AMOUNT", { targetUserId });
      await safeTelegramCall("handleAdminState.askAddAmount", () => bot.sendMessage(msg.chat.id, "ط£ط±ط³ظ„ ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ط¢ظ†."));
      return true;
    }

    if (state.name === "AWAITING_ADD_BALANCE_AMOUNT") {
      const target = appStore.findUserById(state.targetUserId);
      const amount = Number(msg.text.trim());
      if (!target || !Number.isFinite(amount) || amount <= 0) {
        await safeTelegramCall("handleAdminState.invalidAddAmount", () => bot.sendMessage(msg.chat.id, "ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± طµط§ظ„ط­ط©."));
        return true;
      }

      appStore.addBalance(target.userId, amount);
      appStore.addTransaction({
        type: "admin_add_balance",
        userId: ADMIN_ID,
        targetUserId: target.userId,
        amount,
      });
      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.addDone", () => bot.sendMessage(msg.chat.id, "تمت إضافة الرصيد بنجاح."));
      await safeTelegramCall("handleAdminState.addNotifyUser", () => bot.sendMessage(target.userId, `تم شحن رصيدك بـ ${formatRuble(amount)} روبل`));
      await sendAdminPanel(bot, msg.chat.id, { lang: adminLang });
      return true;
    }

    if (state.name === "ADMIN_AWAITING_MY_BALANCE_AMOUNT") {
      const amount = Number(msg.text.trim());
      if (!Number.isFinite(amount) || amount <= 0) {
        await safeTelegramCall("handleAdminState.invalidMyAmount", () =>
          bot.sendMessage(msg.chat.id, "⚠️ يرجى إدخال مبلغ صحيح بالروبل (مثال: 500 أو 1000).")
        );
        return true;
      }

      appStore.addBalance(ADMIN_ID, amount);
      appStore.addTransaction({
        type: "admin_self_charge",
        userId: ADMIN_ID,
        targetUserId: ADMIN_ID,
        amount,
        createdAt: new Date().toISOString(),
      });

      const adminUser = appStore.findUserById(ADMIN_ID);
      const newBal = adminUser ? formatRuble(adminUser.balance || 0) : formatRuble(amount);

      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.myBalanceDone", () =>
        bot.sendMessage(
          msg.chat.id,
          `✅ <b>تم شحن رصيدك بنجاح!</b>\n\n💰 المبلغ المضاف: <b>${formatRuble(amount)} ₽</b>\n💳 رصيدك الحالي الآن: <b>${newBal} ₽</b>\n\n💡 يمكنك الآن تحويل الرصيد للمشترين من قسم (تحويل الرصيد) أو استخدامه مباشرة.`,
          { parse_mode: "HTML" }
        )
      );
      await sendAdminPanel(bot, msg.chat.id, { lang: adminLang });
      return true;
    }

    if (state.name === "ADMIN_AWAITING_DEDUCT_BALANCE_USER") {
      setUserState(msg.from.id, "ADMIN_AWAITING_DEDUCT_BALANCE_AMOUNT", { targetUserId: Number(msg.text.trim()) });
      await safeTelegramCall("handleAdminState.askDeductAmount", () => bot.sendMessage(msg.chat.id, "ط£ط±ط³ظ„ ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ط¢ظ†."));
      return true;
    }

    if (state.name === "ADMIN_AWAITING_DEDUCT_BALANCE_AMOUNT") {
      const target = appStore.findUserById(state.targetUserId);
      const amount = Number(msg.text.trim());
      if (!target || !Number.isFinite(amount) || amount <= 0) {
        await safeTelegramCall("handleAdminState.invalidDeductAmount", () => bot.sendMessage(msg.chat.id, "ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± طµط§ظ„ط­ط©."));
        return true;
      }

      appStore.deductBalance(target.userId, amount);
      appStore.addTransaction({
        type: "admin_deduct_balance",
        userId: ADMIN_ID,
        targetUserId: target.userId,
        amount,
      });
      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.deductDone", () => bot.sendMessage(msg.chat.id, "طھظ… ط®طµظ… ط§ظ„ط±طµظٹط¯ ط¨ظ†ط¬ط§ط­."));
      await safeTelegramCall("handleAdminState.deductNotifyUser", () => bot.sendMessage(target.userId, `طھظ… ط®طµظ… ${formatRuble(amount)} ط±ظˆط¨ظ„ ظ…ظ† ط±طµظٹط¯ظƒ`));
      await sendAdminPanel(bot, msg.chat.id, { lang: adminLang });
      return true;
    }

    if (state.name === "ADMIN_AWAITING_BROADCAST") {
      let successCount = 0;
      for (const user of appStore.getUsers()) {
        const result = await safeTelegramCall("handleAdminState.broadcastSend", () => bot.sendMessage(user.userId, msg.text));
        if (result) {
          successCount += 1;
        }
      }

      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.broadcastDone", () => bot.sendMessage(msg.chat.id, `طھظ… ط§ظ„ط¥ط±ط³ط§ظ„ ط¥ظ„ظ‰ ${successCount} ظ…ط³طھط®ط¯ظ….`));
      await sendAdminPanel(bot, msg.chat.id, { lang: adminLang });
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SERVICE_PRICE") {
      const amount = Number(msg.text.trim());
      if (!Number.isFinite(amount) || amount < 0) {
        await safeTelegramCall("handleAdminState.invalidServicePrice", () => bot.sendMessage(msg.chat.id, "ط§ظ„ط³ط¹ط± ط؛ظٹط± طµط§ظ„ط­."));
        return true;
      }

      appStore.updateServicePrice(state.serviceKey, amount);
      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.servicePriceDone", () => bot.sendMessage(msg.chat.id, "طھظ… طھط­ط¯ظٹط« ط§ظ„ط³ط¹ط± ط¨ظ†ط¬ط§ط­."));
      await sendServicePricesMenu(bot, msg.chat.id, appStore.getServices());
      return true;
    }

    if (state.name === "ADMIN_AWAITING_UPLOAD_DATA") {
      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.uploadDone", () => bot.sendMessage(msg.chat.id, "طھظ… ط§ط³طھظ„ط§ظ… ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ط¨ط¯ط¦ظٹط§ظ‹. ط³ظٹطھظ… ط±ط¨ط· JSON / Google Sheets ظ„ط§ط­ظ‚ط§ظ‹."));
      await sendAdminPanel(bot, msg.chat.id, { lang: adminLang });
      return true;
    }

    if (state.name === "ADMIN_TEMP_EMAIL_UPLOAD_INPUT") {
      const lang = adminLang;
      const sku = String(state.sku || "");
      const lines = String(msg.text || "").split("\n").map((line) => line.trim()).filter(Boolean);

      if (lines.length < 2) {
        await safeTelegramCall("handleAdminState.tempEmailUpload.invalidFormat", () =>
          bot.sendMessage(
            msg.chat.id,
            lang === "ar"
              ? "صيغة غير صحيحة. أرسل سطرين:\nالسطر الأول: الإيميل/اسم الحساب\nالسطر الثاني: كلمة المرور/الرمز"
              : "Invalid format. Send two lines:\nLine 1: email/account\nLine 2: password/code"
          )
        );
        return true;
      }

      const email = lines[0];
      const password = lines[1];
      if (!email || !password) {
        await safeTelegramCall("handleAdminState.tempEmailUpload.emptyValues", () =>
          bot.sendMessage(msg.chat.id, lang === "ar" ? "القيم المطلوبة غير مكتملة." : "Required values are missing.")
        );
        return true;
      }

      const saved = appStore.addTemporaryEmailAccount(sku, email, password, msg.from.id);
      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.tempEmailUpload.saved", () =>
        bot.sendMessage(
          msg.chat.id,
          lang === "ar"
            ? `✅ تم حفظ الحساب بنجاح.\n📧 ${saved.email}\n🆔 SKU: ${sku}`
            : `✅ Account saved successfully.\n📧 ${saved.email}\n🆔 SKU: ${sku}`
        )
      );
      await sendAdminPanel(bot, msg.chat.id, { lang: adminLang });
      return true;
    }

    // --- SMS Providers Management States ---
    if (state.name === "ADMIN_AWAITING_SMS_KEY") {
      const apiKey = textTrim;
      const providerKey = state.providerKey || "server1";
      if (!apiKey) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ الرجاء إرسال مفتاح صالح أو كتابة <code>Cancel</code> للإلغاء:",
          "⚠️ الرجاء إرسال مفتاح صالح أو كتابة Cancel للإلغاء:"
        );
        return true;
      }

      appStore.updateSmsProvider(providerKey, { apiKey });
      clearUserState(msg.from.id);

      const res = await checkSmsProviderBalance(providerKey, appStore);
      const maskedKey = apiKey.length > 8 ? "••••" + apiKey.slice(-6) : apiKey;

      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تم حفظ وتحديث مفتاح [${escapeHtml(res.name || providerKey)}] بنجاح!</b>\n\n` +
        `• <b>المفتاح المحفوظ:</b> <code>${escapeHtml(maskedKey)}</code>\n` +
        `• <b>فحص الاتصال:</b> ${escapeHtml(res.statusText)}\n` +
        `• <b>الرصيد المتوفر بالموقع:</b> <b>${escapeHtml(res.formatted)}</b>\n\n` +
        `<i>${res.success ? "🟢 الاتصال بالسيرفر يعمل بنجاح تام!" : "⚠️ تم حفظ المفتاح، ولكن لم يرجع السيرفر رصيداً. تأكد من صحة المفتاح والرابط."}</i>`,
        `✅ تم حفظ وتحديث مفتاح [${res.name || providerKey}] بنجاح!\nالمفتاح: ${maskedKey}\nفحص الاتصال: ${res.statusText}\nالرصيد: ${res.formatted}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 فحص الرصيد الآن", callback_data: `admin:test_sms:${providerKey}` }],
              [{ text: "📱 مزودو الأرقام (SMS)", callback_data: "admin:providers" }],
              [{ text: "🔙 لوحة الإدارة", callback_data: "admin:panel" }],
            ],
          },
        }
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMS_URL") {
      const baseUrl = normalizeApiUrl(textTrim);
      const providerKey = state.providerKey || "server1";
      if (!baseUrl) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ الرجاء إرسال رابط صالح لموقع الأرقام (مثال: <code>https://api.sms-activate.org/stubs/handler_api.php</code>) أو اكتب <code>Cancel</code> للإلغاء:",
          "⚠️ الرجاء إرسال رابط صالح لموقع الأرقام أو اكتب Cancel للإلغاء:"
        );
        return true;
      }

      appStore.updateSmsProvider(providerKey, { baseUrl });
      clearUserState(msg.from.id);

      const res = await checkSmsProviderBalance(providerKey, appStore);
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تم تحديث رابط الـ API لـ [${escapeHtml(res.name || providerKey)}] بنجاح!</b>\n\n` +
        `• <b>الرابط الجديد:</b> <code>${escapeHtml(baseUrl)}</code>\n` +
        `• <b>فحص الاتصال:</b> ${escapeHtml(res.statusText)}\n` +
        `• <b>الرصيد بالموقع:</b> <b>${escapeHtml(res.formatted)}</b>`,
        `✅ تم تحديث رابط الـ API لـ [${res.name || providerKey}] بنجاح!\nالرابط الجديد: ${baseUrl}\nفحص الاتصال: ${res.statusText}\nالرصيد: ${res.formatted}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 فحص الرصيد", callback_data: `admin:test_sms:${providerKey}` }],
              [{ text: "📱 مزودو الأرقام (SMS)", callback_data: "admin:providers" }],
              [{ text: "🔙 لوحة الإدارة", callback_data: "admin:panel" }],
            ],
          },
        }
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMS_EDIT_NAME") {
      const name = textTrim;
      const providerKey = state.providerKey || "server1";
      if (!name) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ الرجاء إرسال اسم صالح أو اكتب <code>Cancel</code> للإلغاء:",
          "⚠️ الرجاء إرسال اسم صالح أو اكتب Cancel للإلغاء:"
        );
        return true;
      }

      appStore.updateSmsProvider(providerKey, { name });
      clearUserState(msg.from.id);

      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تم تحديث اسم المزود إلى:</b> <b>${escapeHtml(name)}</b>`,
        `✅ تم تحديث اسم المزود إلى: ${name}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "⚙️ إعدادات المزود", callback_data: `admin:sms_manage:${providerKey}` }],
              [{ text: "📱 مزودو الأرقام (SMS)", callback_data: "admin:providers" }],
            ],
          },
        }
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMS_ADD_NAME") {
      const name = textTrim;
      if (!name) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ يرجى إرسال اسم صحيح للمزود الجديد (مثال: السيرفر 3 أو SMS-Activate):",
          "⚠️ يرجى إرسال اسم صحيح للمزود الجديد (مثال: السيرفر 3 أو SMS-Activate):"
        );
        return true;
      }

      setUserState(msg.from.id, "ADMIN_AWAITING_SMS_ADD_URL", { providerName: name, entityName: name });
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `🌐 <b>اسم المزود:</b> ${escapeHtml(name)}\n\n` +
        `أرسل الآن رابط الـ API (Base URL) الخاص بموقع الأرقام:\n` +
        `<i>مثال: https://api.sms-activate.org/stubs/handler_api.php</i>\n\n` +
        `<i>أو اكتب Cancel للإلغاء:</i>`,
        `🌐 اسم المزود: ${name}\n\nأرسل الآن رابط الـ API (Base URL) الخاص بموقع الأرقام:\nمثال: https://api.sms-activate.org/stubs/handler_api.php\n\nأو اكتب Cancel للإلغاء:`
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMS_ADD_URL") {
      const url = normalizeApiUrl(textTrim);
      if (!url) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ <b>الرابط غير صالح!</b>\nيرجى إرسال رابط موقع صحيح يبدأ بـ http:// أو https://\n<i>مثال: https://api.sms-activate.org/stubs/handler_api.php</i>\n\nأو اكتب <code>Cancel</code> للإلغاء:",
          "⚠️ الرابط غير صالح! يرجى إرسال رابط موقع صحيح أو اكتب Cancel للإلغاء:"
        );
        return true;
      }

      const provName = state.providerName || state.entityName || "مزود أرقام";
      setUserState(msg.from.id, "ADMIN_AWAITING_SMS_ADD_KEY", { providerName: provName, entityName: provName, url });
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `🔑 <b>المزود:</b> ${escapeHtml(provName)}\n` +
        `🌐 <b>الرابط:</b> <code>${escapeHtml(url)}</code>\n\n` +
        `أرسل الآن مفتاح الـ API (API Key) الخاص بهذا الموقع:\n\n` +
        `<i>أو اكتب Cancel للإلغاء:</i>`,
        `🔑 المزود: ${provName}\n🌐 الرابط: ${url}\n\nأرسل الآن مفتاح الـ API (API Key) الخاص بهذا الموقع:\n\nأو اكتب Cancel للإلغاء:`
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMS_ADD_KEY") {
      const key = textTrim;
      if (!key) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ يرجى إرسال مفتاح API صحيح أو كتابة <code>Cancel</code> للإلغاء:",
          "⚠️ يرجى إرسال مفتاح API صحيح أو كتابة Cancel للإلغاء:"
        );
        return true;
      }

      const existing = appStore.getSmsProviders();
      let targetKey = "server3";
      if (existing.server3 && existing.server3.apiKey) {
        if (!existing.server4 || !existing.server4.apiKey) {
          targetKey = "server4";
        } else {
          targetKey = `sms_${Date.now()}`;
        }
      }

      const provName = state.providerName || state.entityName || "مزود أرقام";
      const newSms = appStore.updateSmsProvider(targetKey, {
        key: targetKey,
        name: provName,
        baseUrl: state.url,
        apiKey: key,
        enabled: true,
      });

      clearUserState(msg.from.id);

      const res = await checkSmsProviderBalance(targetKey, appStore);
      const masked = key.length > 8 ? "••••" + key.slice(-6) : key;

      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تمت إضافة مزود الأرقام الافتراضية بنجاح!</b>\n\n` +
        `• <b>المزود:</b> ${escapeHtml(newSms.name)} [${targetKey}]\n` +
        `• <b>الرابط:</b> <code>${escapeHtml(newSms.baseUrl)}</code>\n` +
        `• <b>المفتاح:</b> <code>${escapeHtml(masked)}</code>\n` +
        `• <b>فحص الاتصال:</b> ${escapeHtml(res.statusText)}\n` +
        `• <b>الرصيد بالموقع:</b> <b>${escapeHtml(res.formatted)}</b>\n\n` +
        `<i>${res.success ? "🟢 الاتصال متصل وسيعمل في قسم الأرقام فوراً!" : "⚠️ تم الحفظ، تأكد من صحة الرابط والمفتاح."}</i>`,
        `✅ تمت إضافة مزود الأرقام الافتراضية بنجاح!\nالمزود: ${newSms.name} [${targetKey}]\nالرابط: ${newSms.baseUrl}\nالمفتاح: ${masked}\nفحص الاتصال: ${res.statusText}\nالرصيد: ${res.formatted}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 فحص الرصيد", callback_data: `admin:test_sms:${targetKey}` }],
              [{ text: "📱 مزودو الأرقام (SMS)", callback_data: "admin:providers" }],
              [{ text: "🔙 لوحة الإدارة", callback_data: "admin:panel" }],
            ],
          },
        }
      );
      return true;
    }

    // --- SMM Providers (بوت الرشق) Management States ---
    if (state.name === "ADMIN_AWAITING_SMM_NAME") {
      const name = textTrim;
      if (!name) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ يرجى إرسال اسم صحيح لموقع الرشق (مثال: SMM Peak أو عرب رشق) أو اكتب <code>Cancel</code> للإلغاء:",
          "⚠️ يرجى إرسال اسم صحيح لموقع الرشق أو اكتب Cancel للإلغاء:"
        );
        return true;
      }

      setUserState(msg.from.id, "ADMIN_AWAITING_SMM_URL", { providerName: name, entityName: name });
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `🌐 <b>اسم موقع الرشق:</b> ${escapeHtml(name)}\n\n` +
        `أرسل الآن رابط الـ API (API URL) لموقع الرشق:\n` +
        `<i>مثال: https://smmsite.com/api/v2</i>\n\n` +
        `<i>أو اكتب Cancel للإلغاء:</i>`,
        `🌐 اسم موقع الرشق: ${name}\n\nأرسل الآن رابط الـ API (API URL) لموقع الرشق:\nمثال: https://smmsite.com/api/v2\n\nأو اكتب Cancel للإلغاء:`
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMM_URL") {
      const url = normalizeApiUrl(textTrim);
      if (!url) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ <b>الرابط غير صالح!</b>\nيرجى إرسال رابط موقع صحيح (مثال: <code>https://smmsite.com/api/v2</code>)\nأو كتابة <code>Cancel</code> للإلغاء:",
          "⚠️ الرابط غير صالح! يرجى إرسال رابط موقع صحيح (مثال: https://smmsite.com/api/v2) أو كتابة Cancel للإلغاء:"
        );
        return true;
      }

      const provName = state.providerName || state.entityName || "موقع رشق";
      setUserState(msg.from.id, "ADMIN_AWAITING_SMM_KEY", { providerName: provName, entityName: provName, url });
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `🔑 <b>الموقع:</b> ${escapeHtml(provName)}\n` +
        `🌐 <b>الرابط:</b> <code>${escapeHtml(url)}</code>\n\n` +
        `أرسل الآن مفتاح الـ API (API Key) الخاص بموقع الرشق:\n\n` +
        `<i>أو اكتب Cancel للإلغاء:</i>`,
        `🔑 الموقع: ${provName}\n🌐 الرابط: ${url}\n\nأرسل الآن مفتاح الـ API (API Key) الخاص بموقع الرشق:\n\nأو اكتب Cancel للإلغاء:`
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMM_KEY") {
      const key = textTrim;
      if (!key) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ يرجى إرسال مفتاح API صحيح أو كتابة <code>Cancel</code> للإلغاء:",
          "⚠️ يرجى إرسال مفتاح API صحيح أو كتابة Cancel للإلغاء:"
        );
        return true;
      }

      const provName = state.providerName || state.entityName || "موقع رشق";
      const newProvider = appStore.addSmmProvider({
        name: provName,
        url: state.url,
        key,
      });

      clearUserState(msg.from.id);

      // Trigger automatic background fetching and caching of all SMM services from the new provider
      fetchAndCacheSmmServices(true, appStore).catch(() => {});

      const res = await checkSmmProviderBalance(newProvider);
      const masked = key.length > 8 ? "••••" + key.slice(-6) : key;

      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تمت إضافة موقع الرشق بنجاح!</b>\n\n` +
        `• <b>الموقع:</b> ${escapeHtml(newProvider.name)}\n` +
        `• <b>الرابط:</b> <code>${escapeHtml(newProvider.url)}</code>\n` +
        `• <b>المفتاح:</b> <code>${escapeHtml(masked)}</code>\n` +
        `• <b>فحص الاتصال:</b> ${escapeHtml(res.statusText)}\n` +
        `• <b>الرصيد بالموقع:</b> <b>${escapeHtml(res.formatted)}</b>\n\n` +
        `<i>${res.success ? "🟢 الموقع متصل بنجاح!" : "⚠️ تم الحفظ، تأكد من صحة الرابط والمفتاح."}</i>\n\n` +
        `💡 <i>يمكنك الآن الضغط على (مزامنة وسحب الخدمات) لسحب جميع الخدمات المتاحة بالموقع وتضمينها فوراً في البوت.</i>`,
        `✅ تمت إضافة موقع الرشق بنجاح!\nالموقع: ${newProvider.name}\nالرابط: ${newProvider.url}\nالمفتاح: ${masked}\nفحص الاتصال: ${res.statusText}\nالرصيد: ${res.formatted}\n\nيمكنك الآن الضغط على مزامنة وسحب الخدمات من لوحة التحكم.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 مزامنة وسحب الخدمات الآن", callback_data: "admin:smm_sync_now" }],
              [{ text: "🔍 فحص الرصيد", callback_data: `admin:smm_balance:${newProvider.id}` }],
              [{ text: "🚀 إدارة مواقع الرشق (SMM)", callback_data: "admin:smm_providers" }],
              [{ text: "🔙 لوحة الإدارة", callback_data: "admin:panel" }],
            ],
          },
        }
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMM_EDIT_NAME") {
      const name = textTrim;
      if (!name) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ يرجى إرسال اسم صالح أو كتابة <code>Cancel</code> للإلغاء:",
          "⚠️ يرجى إرسال اسم صالح أو كتابة Cancel للإلغاء:"
        );
        return true;
      }
      appStore.updateSmmProvider(state.providerId, { name });
      clearUserState(msg.from.id);
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تم تحديث اسم موقع الرشق إلى:</b> <b>${escapeHtml(name)}</b>`,
        `✅ تم تحديث اسم موقع الرشق إلى: ${name}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "⚙️ إعدادات المزود", callback_data: `admin:smm_manage:${state.providerId}` }],
              [{ text: "🚀 قائمة مواقع الرشق", callback_data: "admin:smm_providers" }],
            ],
          },
        }
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMM_EDIT_URL") {
      const url = normalizeApiUrl(textTrim);
      if (!url) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ يرجى إرسال رابط صالح يبدأ بـ http:// أو https:// أو كتابة <code>Cancel</code> للإلغاء:",
          "⚠️ يرجى إرسال رابط صالح أو كتابة Cancel للإلغاء:"
        );
        return true;
      }
      appStore.updateSmmProvider(state.providerId, { url });
      clearUserState(msg.from.id);
      const provider = appStore.getSmmProviderById(state.providerId);
      const res = await checkSmmProviderBalance(provider);
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تم تحديث رابط الـ API بنجاح!</b>\n\n` +
        `• <b>الرابط:</b> <code>${escapeHtml(url)}</code>\n` +
        `• <b>فحص الاتصال:</b> ${escapeHtml(res.statusText)}\n` +
        `• <b>الرصيد:</b> <b>${escapeHtml(res.formatted)}</b>`,
        `✅ تم تحديث رابط الـ API بنجاح!\nالرابط: ${url}\nفحص الاتصال: ${res.statusText}\nالرصيد: ${res.formatted}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 فحص الرصيد", callback_data: `admin:smm_balance:${state.providerId}` }],
              [{ text: "⚙️ إعدادات المزود", callback_data: `admin:smm_manage:${state.providerId}` }],
              [{ text: "🚀 قائمة مواقع الرشق", callback_data: "admin:smm_providers" }],
            ],
          },
        }
      );
      return true;
    }

    if (state.name === "ADMIN_AWAITING_SMM_EDIT_KEY") {
      const key = textTrim;
      if (!key) {
        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          "⚠️ يرجى إرسال مفتاح صالح أو كتابة <code>Cancel</code> للإلغاء:",
          "⚠️ يرجى إرسال مفتاح صالح أو كتابة Cancel للإلغاء:"
        );
        return true;
      }
      appStore.updateSmmProvider(state.providerId, { key });
      clearUserState(msg.from.id);
      const provider = appStore.getSmmProviderById(state.providerId);
      const res = await checkSmmProviderBalance(provider);
      const masked = key.length > 8 ? "••••" + key.slice(-6) : key;
      await safeSendHtmlOrText(
        bot,
        msg.chat.id,
        `✅ <b>تم تحديث مفتاح API لموقع الرشق بنجاح!</b>\n\n` +
        `• <b>المفتاح:</b> <code>${escapeHtml(masked)}</code>\n` +
        `• <b>فحص الاتصال:</b> ${escapeHtml(res.statusText)}\n` +
        `• <b>الرصيد:</b> <b>${escapeHtml(res.formatted)}</b>\n\n` +
        `<i>${res.success ? "🟢 الاتصال متصل بنجاح!" : "⚠️ تحقق من صحة المفتاح والرابط."}</i>`,
        `✅ تم تحديث مفتاح API لموقع الرشق بنجاح!\nالمفتاح: ${masked}\nفحص الاتصال: ${res.statusText}\nالرصيد: ${res.formatted}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 مزامنة وسحب الخدمات", callback_data: "admin:smm_sync_now" }],
              [{ text: "🔍 فحص الرصيد", callback_data: `admin:smm_balance:${state.providerId}` }],
              [{ text: "⚙️ إعدادات المزود", callback_data: `admin:smm_manage:${state.providerId}` }],
              [{ text: "🚀 قائمة مواقع الرشق", callback_data: "admin:smm_providers" }],
            ],
          },
        }
      );
      return true;
    }

    // --- TG Ready Providers Management States ---
    if (state.name === "ADMIN_AWAITING_TG_READY_KEY") {
      const apiKey = textTrim;
      const providerKey = state.providerKey || "tg_server1";
      if (!apiKey) {
        await safeSendHtmlOrText(bot, msg.chat.id, "⚠️ يرجى إرسال مفتاح صالح أو كتابة <code>Cancel</code> للإلغاء:", "⚠️ يرجى إرسال مفتاح صالح أو كتابة Cancel للإلغاء:");
        return true;
      }
      appStore.updateTgReadyProvider(providerKey, { apiKey });
      clearUserState(msg.from.id);
      const { buildSingleTgReadyProviderMenu } = require("../services/providerManagementService");
      const updated = appStore.getTgReadyProvider(providerKey);
      const menu = buildSingleTgReadyProviderMenu("ar", updated);
      await safeSendHtmlOrText(bot, msg.chat.id, `✅ <b>تم تحديث المفتاح لموقع الأرقام الجاهزة [${escapeHtml(updated?.name || providerKey)}] بنجاح!</b>\n\n` + menu.text, `✅ تم تحديث المفتاح لموقع الأرقام الجاهزة بنجاح!`, { reply_markup: menu.keyboard });
      return true;
    }

    if (state.name === "ADMIN_AWAITING_TG_READY_URL") {
      const baseUrl = normalizeApiUrl(textTrim);
      const providerKey = state.providerKey || "tg_server1";
      if (!baseUrl) {
        await safeSendHtmlOrText(bot, msg.chat.id, "⚠️ يرجى إرسال رابط صالح لموقع الأرقام الجاهزة أو كتابة <code>Cancel</code> للإلغاء:", "⚠️ يرجى إرسال رابط صالح لموقع الأرقام الجاهزة:");
        return true;
      }
      appStore.updateTgReadyProvider(providerKey, { baseUrl });
      clearUserState(msg.from.id);
      const { buildSingleTgReadyProviderMenu } = require("../services/providerManagementService");
      const updated = appStore.getTgReadyProvider(providerKey);
      const menu = buildSingleTgReadyProviderMenu("ar", updated);
      await safeSendHtmlOrText(bot, msg.chat.id, `✅ <b>تم تحديث رابط الـ API لموقع الأرقام الجاهزة [${escapeHtml(updated?.name || providerKey)}] بنجاح!</b>\n\n` + menu.text, `✅ تم تحديث الرابط بنجاح!`, { reply_markup: menu.keyboard });
      return true;
    }

    if (state.name === "ADMIN_AWAITING_TG_READY_NAME") {
      const name = textTrim;
      const providerKey = state.providerKey || "tg_server1";
      if (!name) {
        await safeSendHtmlOrText(bot, msg.chat.id, "⚠️ يرجى إرسال اسم صالح أو كتابة <code>Cancel</code> للإلغاء:", "⚠️ يرجى إرسال اسم صالح:");
        return true;
      }
      appStore.updateTgReadyProvider(providerKey, { name });
      clearUserState(msg.from.id);
      const { buildSingleTgReadyProviderMenu } = require("../services/providerManagementService");
      const updated = appStore.getTgReadyProvider(providerKey);
      const menu = buildSingleTgReadyProviderMenu("ar", updated);
      await safeSendHtmlOrText(bot, msg.chat.id, `✅ <b>تم تحديث الاسم بنجاح!</b>\n\n` + menu.text, `✅ تم تحديث الاسم بنجاح!`, { reply_markup: menu.keyboard });
      return true;
    }

    if (state.name === "ADMIN_AWAITING_TG_READY_ADD_NAME") {
      const name = textTrim;
      if (!name) {
        await safeSendHtmlOrText(bot, msg.chat.id, "⚠️ يرجى إرسال اسم صحيح لموقع الأرقام الجاهزة الجديد:", "⚠️ يرجى إرسال اسم صحيح لموقع الأرقام الجاهزة الجديد:");
        return true;
      }
      setUserState(msg.from.id, "ADMIN_AWAITING_TG_READY_ADD_URL", { providerName: name });
      await safeSendHtmlOrText(bot, msg.chat.id, `🌐 <b>اسم الموقع:</b> ${escapeHtml(name)}\n\nأرسل الآن رابط الـ API (Base URL) الخاص بموقع الأرقام الجاهزة:\n<i>مثال: https://api.grizzlysms.com/stubs/handler_api.php</i>\n\nأو اكتب Cancel للإلغاء:`, `أرسل رابط الـ API (Base URL):`);
      return true;
    }

    if (state.name === "ADMIN_AWAITING_TG_READY_ADD_URL") {
      const url = normalizeApiUrl(textTrim);
      if (!url) {
        await safeSendHtmlOrText(bot, msg.chat.id, "⚠️ يرجى إرسال رابط صالح لموقع الأرقام الجاهزة:", "⚠️ يرجى إرسال رابط صالح:");
        return true;
      }
      setUserState(msg.from.id, "ADMIN_AWAITING_TG_READY_ADD_KEY", { providerName: state.providerName, url });
      await safeSendHtmlOrText(bot, msg.chat.id, `🔑 <b>اسم الموقع:</b> ${escapeHtml(state.providerName)}\n🌐 <b>الرابط:</b> <code>${escapeHtml(url)}</code>\n\nأرسل الآن مفتاح الـ API (API Key) الخاص بموقع الأرقام الجاهزة:\n\nأو اكتب Cancel للإلغاء:`, `أرسل مفتاح الـ API:`);
      return true;
    }

    if (state.name === "ADMIN_AWAITING_TG_READY_ADD_KEY") {
      const key = textTrim;
      if (!key) {
        await safeSendHtmlOrText(bot, msg.chat.id, "⚠️ يرجى إرسال مفتاح API صحيح:", "⚠️ يرجى إرسال مفتاح API صحيح:");
        return true;
      }
      const added = appStore.addTgReadyProvider({
        name: state.providerName,
        baseUrl: state.url,
        apiKey: key,
      });
      clearUserState(msg.from.id);
      const { buildSingleTgReadyProviderMenu } = require("../services/providerManagementService");
      const menu = buildSingleTgReadyProviderMenu("ar", added);
      await safeSendHtmlOrText(bot, msg.chat.id, `✅ <b>تمت إضافة موقع أرقام تيليجرام الجاهزة بنجاح!</b>\n\n` + menu.text, `✅ تمت إضافة موقع أرقام تيليجرام الجاهزة بنجاح!`, { reply_markup: menu.keyboard });
      return true;
    }

    // --- Restore Backup File State ---
    if (state.name === "ADMIN_AWAITING_BACKUP_FILE") {
      let jsonContent = null;
      const axios = require("axios");

      if (msg.document) {
        try {
          const fileLink = await bot.getFileLink(msg.document.file_id);
          const fileRes = await axios.get(fileLink, { responseType: "text" });
          jsonContent = fileRes.data;
        } catch (dlErr) {
          logBotError("restoreBackup.download", dlErr);
        }
      } else if (textTrim && textTrim.startsWith("{")) {
        jsonContent = textTrim;
      }

      if (!jsonContent) {
        await safeSendHtmlOrText(bot, msg.chat.id, "⚠️ يرجى إرسال ملف النسخة الاحتياطية (ملف <code>.json</code>) لاستعادة كافة البيانات، أو اكتب <code>Cancel</code> للإلغاء:", "⚠️ يرجى إرسال ملف النسخة الاحتياطية (.json):");
        return true;
      }

      try {
        const parsed = typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;
        if (!parsed || (typeof parsed !== "object")) {
          throw new Error("تنسيق الملف غير صحيح.");
        }

        if (Array.isArray(parsed.users)) {
          appStore.users = parsed.users;
        }
        if (parsed.config && typeof parsed.config === "object") {
          appStore.config = {
            ...appStore.config,
            ...parsed.config,
          };
        }
        if (Array.isArray(parsed.transactions)) {
          appStore.transactions = parsed.transactions;
        }

        appStore.persistAll();
        clearUserState(msg.from.id);

        await safeSendHtmlOrText(
          bot,
          msg.chat.id,
          `✅ <b>تمت استعادة النسخة الاحتياطية وتأكيد كافة البيانات بنجاح!</b> 🚀\n\n` +
          `• <b>تاريخ النسخة:</b> <code>${parsed.exportedAt || "غير محدد"}</code>\n` +
          `• <b>المستخدمون المستردون:</b> <code>${(parsed.users || []).length}</code> مستخدم\n` +
          `• <b>المزودون والإعدادات:</b> تم تحديثها واستعادتها كلياً بنجاح! ✅`,
          `✅ تمت استعادة النسخة الاحتياطية بنجاح!`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🔙 لوحة الإدارة", callback_data: "admin:panel" }]],
            },
          }
        );
      } catch (parseErr) {
        logBotError("restoreBackup.parse", parseErr);
        await safeSendHtmlOrText(bot, msg.chat.id, `❌ فشل استعادة الملف: ${escapeHtml(parseErr.message)}\nيرجى التأكد من اختيار ملف النسخة الاحتياطية الصحيح (.json).`, `❌ فشل استعادة الملف.`);
      }
      return true;
    }

    return false;
  } catch (error) {
    logBotError("handleAdminState", error, { userId: msg.from?.id });
    return false;
  }
}

async function handleTextMessage(bot, msg, appStore) {
  try {
    const adminHandled = await handleAdminState(bot, msg, appStore);
    if (adminHandled) {
      return;
    }

    const virtualNumbersTextHandled = await handleVirtualNumbersTextInput(bot, msg, appStore);
    if (virtualNumbersTextHandled) {
      return;
    }

    const socialBoostHandled = await handleSocialBoostTextInput(bot, msg, appStore);
    if (socialBoostHandled) {
      return;
    }

    const gameTopupHandled = await handleGameTopupTextInput(bot, msg, appStore);
    if (gameTopupHandled) {
      return;
    }

    const proAccountsHandled = await handleProAccountsTextInput(bot, msg, appStore);
    if (proAccountsHandled) {
      return;
    }

    const cloudServicesHandled = await handleCloudServicesTextInput(bot, msg, appStore);
    if (cloudServicesHandled) {
      return;
    }

    const temporaryEmailsHandled = await handleTemporaryEmailTextInput(bot, msg, appStore);
    if (temporaryEmailsHandled) {
      return;
    }

    const digitalServicesHandled = await handleDigitalServicesTextInput(bot, msg, appStore);
    if (digitalServicesHandled) {
      return;
    }

    const giftCodeHandled = await handleGiftCodeInput(bot, msg, appStore);
    if (giftCodeHandled) {
      return;
    }

    const customServiceHandled = await handleCustomServiceRequest(bot, msg, appStore);
    if (customServiceHandled) {
      return;
    }

    const topupHandled = await handleTopupAmountInput(bot, msg, appStore);
    if (topupHandled) {
      return;
    }

    const transferHandled = await handleTransferInput(bot, msg, appStore);
    if (transferHandled) {
      return;
    }

    const tgReadySearchHandled = await handleReadyTelegramSearchInput(bot, msg, appStore);
    if (tgReadySearchHandled) {
      return;
    }

    return;
  } catch (error) {
    logBotError("handleTextMessage", error, { userId: msg.from?.id });
  }
}

module.exports = {
  handleTextMessage,
  exportUsersList,
};






