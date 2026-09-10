const { clearUserState } = require("../services/stateStore");
const { safeTelegramCall } = require("../services/telegramSafe");
const { logBotError } = require("../services/errorLogger");
const { sendMainMenu } = require("../services/profileService");
const { notifyAdmin } = require("./startHandler");
const { notifyTopupChannel } = require("../services/topupService");
const { formatRuble } = require("../utils/formatters");

async function handlePreCheckoutQuery(bot, query) {
  try {
    const isValid = typeof query.invoice_payload === "string" && query.invoice_payload.startsWith("topup_stars_");

    return safeTelegramCall("handlePreCheckoutQuery", () =>
      bot.answerPreCheckoutQuery(query.id, isValid, isValid ? {} : { error_message: "الطلب غير صالح." })
    );
  } catch (error) {
    logBotError("handlePreCheckoutQuery", error, { userId: query.from?.id });
    return null;
  }
}

async function handleSuccessfulPayment(bot, msg, appStore) {
  try {
    if (!msg.successful_payment) {
      return false;
    }

    const payment = msg.successful_payment;
    if (!payment.invoice_payload || !payment.invoice_payload.startsWith("topup_stars_")) {
      return false;
    }

    const amountRub = Number(payment.invoice_payload.replace("topup_stars_", ""));
    if (!Number.isFinite(amountRub) || amountRub <= 0) {
      return false;
    }

    clearUserState(msg.from.id);
    appStore.addBalance(msg.from.id, amountRub);
    appStore.addDeposit(msg.from.id, amountRub);
    const updatedUser = appStore.incrementTransactions(msg.from.id);
    appStore.addTransaction({
      type: "topup_stars",
      userId: msg.from.id,
      amount: amountRub,
      starsAmount: payment.total_amount,
      method: "Telegram Stars",
      serviceKey: "balance_topup",
    });

    await safeTelegramCall("handleSuccessfulPayment.successMessage", () =>
      bot.sendMessage(msg.chat.id, "✅ تم شحن حسابك بنجاح!")
    );

    await notifyTopupChannel(bot, msg.from.id, amountRub);
    await notifyAdmin(
      bot,
      [
        "<b>Top-up Success</b>",
        `User ID: <code>${msg.from.id}</code>`,
        `Amount: ${formatRuble(amountRub)} RUB`,
        "Method: Telegram Stars",
      ].join("\n")
    );

    await sendMainMenu(bot, msg.chat.id, updatedUser);
    return true;
  } catch (error) {
    logBotError("handleSuccessfulPayment", error, { userId: msg.from?.id });
    return false;
  }
}

module.exports = {
  handlePreCheckoutQuery,
  handleSuccessfulPayment,
};
