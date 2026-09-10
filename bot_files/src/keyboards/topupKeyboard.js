const { t } = require("../locales");

function getTopupHomeKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: lang === "ar" ? "🇸🇦 السعودية" : "🇸🇦 Saudi Arabia", callback_data: "topup:country:saudi" },
        { text: lang === "ar" ? "🇾🇪 اليمن" : "🇾🇪 Yemen", callback_data: "topup:country:yemen" },
      ],
      [
        { text: lang === "ar" ? "🇪🇬 مصر" : "🇪🇬 Egypt", callback_data: "topup:country:egypt" },
        { text: lang === "ar" ? "🌍 عالمي" : "🌍 Global", callback_data: "topup:country:global" },
      ],
      [
        { text: "💸 Binance Pay", callback_data: "topup:auto:binance" },
        { text: lang === "ar" ? "⭐ نجوم تليجرام" : "⭐ Telegram Stars", callback_data: "topup:auto:stars" },
      ],
      [
        {
          text: lang === "ar" ? "💎 الدفع مقابل العملات الرقمية" : "💎 Pay With Crypto",
          callback_data: "topup:auto:cryptomus",
        },
      ],
      [
        { text: "📱 Vodafone Cash", callback_data: "topup:auto:vodafone" },
        { text: lang === "ar" ? "📲 محفظة جيب" : "📲 Jeeb Wallet", callback_data: "topup:auto:jeeb" },
      ],
      [{ text: lang === "ar" ? "🪙 Crypto / عملات رقمية" : "🪙 Crypto / Digital Coins", callback_data: "topup:auto:crypto" }],
      [{ text: lang === "ar" ? "🔙 Back / رجوع" : "🔙 Back / رجوع", callback_data: "menu:main" }],
    ],
  };
}

function getSaudiTopupKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: "💳 STC Pay", callback_data: "topup:placeholder:stc_pay" },
        { text: "📱 Mobily Pay", callback_data: "topup:placeholder:mobily_pay" },
      ],
      [
        { text: lang === "ar" ? "🏦 تحويل بنكي" : "🏦 Bank Transfer", callback_data: "topup:placeholder:saudi_bank" },
        { text: lang === "ar" ? "💰 تحويل محلي" : "💰 Local Transfer", callback_data: "topup:placeholder:saudi_local" },
      ],
      [{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }],
    ],
  };
}

function getYemenTopupKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: lang === "ar" ? "📱 سبأفون" : "📱 Sabafon", callback_data: "topup:placeholder:sabafon" },
        { text: "📲 YOU", callback_data: "topup:placeholder:you" },
      ],
      [
        { text: lang === "ar" ? "💰 كريمي" : "💰 Kuraimi", callback_data: "topup:placeholder:kurimi" },
        { text: lang === "ar" ? "🏦 تحويل محلي" : "🏦 Local Transfer", callback_data: "topup:placeholder:yemen_local" },
      ],
      [{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }],
    ],
  };
}

function getEgyptTopupKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: "📱 Vodafone Cash", callback_data: "topup:placeholder:egypt_vodafone" },
        { text: "🟠 Orange Cash", callback_data: "topup:placeholder:orange_cash" },
      ],
      [
        { text: "💳 Etisalat Cash", callback_data: "topup:placeholder:etisalat_cash" },
        { text: lang === "ar" ? "🏦 تحويل بنكي" : "🏦 Bank Transfer", callback_data: "topup:placeholder:egypt_bank" },
      ],
      [{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }],
    ],
  };
}

function getGlobalTopupKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: "💸 Payeer", callback_data: "topup:placeholder:payeer" },
        { text: "💳 Perfect Money", callback_data: "topup:placeholder:perfect_money" },
      ],
      [
        { text: "🪙 Crypto", callback_data: "topup:placeholder:global_crypto" },
        { text: "🌐 WebMoney", callback_data: "topup:placeholder:webmoney" },
      ],
      [{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }],
    ],
  };
}

function getStarsPayKeyboard(amountRub, lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: t(lang, "topup_pay_now"), callback_data: `topup:stars:pay:${amountRub}` },
        { text: t(lang, "common_back"), callback_data: "topup:auto:stars" },
      ],
    ],
  };
}

module.exports = {
  getTopupHomeKeyboard,
  getSaudiTopupKeyboard,
  getYemenTopupKeyboard,
  getEgyptTopupKeyboard,
  getGlobalTopupKeyboard,
  getStarsPayKeyboard,
};
