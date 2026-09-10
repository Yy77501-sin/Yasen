const fs = require("fs");
const path = require("path");
const { ADMIN_ID, USERS_EXPORT_PATH } = require("../config");
const { clearUserState, getUserState, setUserState } = require("../services/stateStore");
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
    if (!state || msg.from.id !== ADMIN_ID) {
      return false;
    }
    const adminLang = getUserLang(appStore.findUserById(msg.from.id));

    if (msg.text.trim().toLowerCase() === "cancel") {
      clearUserState(msg.from.id);
      await safeTelegramCall("handleAdminState.cancel", () => bot.sendMessage(msg.chat.id, "طھظ… ط¥ظ„ط؛ط§ط، ط§ظ„ط¹ظ…ظ„ظٹط©."));
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
      await safeTelegramCall("handleAdminState.addDone", () => bot.sendMessage(msg.chat.id, "طھظ…طھ ط¥ط¶ط§ظپط© ط§ظ„ط±طµظٹط¯ ط¨ظ†ط¬ط§ط­."));
      await safeTelegramCall("handleAdminState.addNotifyUser", () => bot.sendMessage(target.userId, `طھظ… ط´ط­ظ† ط±طµظٹط¯ظƒ ط¨ظ€ ${formatRuble(amount)} ط±ظˆط¨ظ„`));
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

    return false;
  } catch (error) {
    logBotError("handleAdminState", error, { userId: msg.from?.id });
    return false;
  }
}

async function handleTextMessage(bot, msg, appStore) {
  try {
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

    const adminHandled = await handleAdminState(bot, msg, appStore);
    if (adminHandled) {
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

    return;
  } catch (error) {
    logBotError("handleTextMessage", error, { userId: msg.from?.id });
  }
}

module.exports = {
  handleTextMessage,
  exportUsersList,
};






