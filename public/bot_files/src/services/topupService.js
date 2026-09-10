const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const {
  ACTIVATIONS_CHANNEL_ID,
  CRYPTO_PAY_TOKEN,
  CRYPTOMUS_MERCHANT_ID,
  CRYPTOMUS_API_KEY,
  USD_TO_RUB_RATE,
  PUBLIC_BASE_URL,
} = require("../config");
const {
  getTopupHomeKeyboard,
  getSaudiTopupKeyboard,
  getYemenTopupKeyboard,
  getEgyptTopupKeyboard,
  getGlobalTopupKeyboard,
  getStarsPayKeyboard,
} = require("../keyboards/topupKeyboard");
const { sendOrEditMessage } = require("./profileService");
const { safeTelegramCall } = require("./telegramSafe");
const { formatRuble } = require("../utils/formatters");
const { t } = require("../locales");

const CRYPTO_PAY_BASE_URL = "https://pay.crypt.bot/api";
const CRYPTO_SUPPORTED_ASSETS = ["USDT", "TON", "TRX", "BTC", "ETH"];
const CRYPTO_ASSET_PRECISION = {
  USDT: 2,
  TON: 3,
  TRX: 2,
  BTC: 8,
  ETH: 8,
};

const CRYPTOMUS_API_BASE = "https://api.cryptomus.com";
const BOT_CONFIG_PATH = path.resolve(__dirname, "..", "..", "bot_config.json");

function loadBotTopupConfig() {
  try {
    const raw = fs.readFileSync(BOT_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.topup || {};
  } catch (_) {
    return {};
  }
}

function getGatewayMethodConfig(methodKey) {
  const cfg = loadBotTopupConfig();
  return cfg[String(methodKey || "").toLowerCase()] || null;
}

function buildPublicUrl(pathname, params = {}) {
  const base = String(PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") {
      query.set(k, String(v));
    }
  }
  const qs = query.toString();
  return `${base}${pathname}${qs ? `?${qs}` : ""}`;
}

function rubToUsd(amountRub) {
  return Number((Number(amountRub || 0) / Number(USD_TO_RUB_RATE || 30)).toFixed(2));
}

function usdToRub(amountUsd) {
  return Number((Number(amountUsd || 0) * Number(USD_TO_RUB_RATE || 30)).toFixed(2));
}

function localToRub(methodKey, amountLocal) {
  const amount = Number(amountLocal || 0);
  const method = String(methodKey || "").toLowerCase();
  const cfg = getGatewayMethodConfig(method);
  if (!cfg || !Number.isFinite(amount) || amount <= 0) return 0;

  if (method === "binance") {
    const rubPerUsd = Number(cfg.rub_per_unit || USD_TO_RUB_RATE || 30);
    return Number((amount * rubPerUsd).toFixed(2));
  }

  const localPerRub = Number(cfg.local_per_rub || 0);
  if (!Number.isFinite(localPerRub) || localPerRub <= 0) return 0;
  return Number((amount / localPerRub).toFixed(2));
}

function buildCryptoAssetKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: "USDT", callback_data: "topup:crypto:asset:USDT" },
        { text: "TON", callback_data: "topup:crypto:asset:TON" },
        { text: "TRX", callback_data: "topup:crypto:asset:TRX" },
      ],
      [
        { text: "BTC", callback_data: "topup:crypto:asset:BTC" },
        { text: "ETH", callback_data: "topup:crypto:asset:ETH" },
      ],
      [{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }],
    ],
  };
}

function buildCryptoInvoiceKeyboard(payUrl, lang = "ar") {
  return {
    inline_keyboard: [
      [{ text: lang === "ar" ? "💳 فتح رابط الدفع" : "💳 Open Payment Link", url: payUrl }],
      [{ text: lang === "ar" ? "↩️ رجوع" : "↩️ Back", callback_data: "service:balance_topup" }],
    ],
  };
}

function buildCryptomusPayKeyboard(payUrl, lang = "ar") {
  return {
    inline_keyboard: [
      [{ text: lang === "ar" ? "🔗 اضغط هنا للانتقال لصفحة الدفع" : "🔗 Pay Now", url: payUrl }],
      [{ text: lang === "ar" ? "↩️ رجوع" : "↩️ Back", callback_data: "service:balance_topup" }],
    ],
  };
}

function roundNumber(value, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.ceil(Number(value) * factor) / factor;
}

async function callCryptoPayApi(method, payload = {}) {
  if (!CRYPTO_PAY_TOKEN) {
    throw new Error("CRYPTO_PAY_TOKEN is missing");
  }

  const response = await axios.post(`${CRYPTO_PAY_BASE_URL}/${method}`, payload, {
    headers: {
      "Crypto-Pay-API-Token": CRYPTO_PAY_TOKEN,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  if (!response?.data?.ok) {
    const errName = response?.data?.error?.name || "unknown_error";
    throw new Error(`Crypto Pay API error: ${errName}`);
  }

  return response.data.result;
}

function findDirectRate(rates, source, target) {
  const direct = rates.find((item) => item.source === source && item.target === target);
  if (direct && Number(direct.rate) > 0) return Number(direct.rate);
  return null;
}

function resolveAssetToRubRate(rates, asset) {
  const directAssetRub = findDirectRate(rates, asset, "RUB");
  if (directAssetRub) return directAssetRub;

  const directRubAsset = findDirectRate(rates, "RUB", asset);
  if (directRubAsset) return 1 / directRubAsset;

  const assetUsdt = findDirectRate(rates, asset, "USDT");
  const usdtRub = findDirectRate(rates, "USDT", "RUB");
  if (assetUsdt && usdtRub) return assetUsdt * usdtRub;

  const assetUsd = findDirectRate(rates, asset, "USD");
  const usdRub = findDirectRate(rates, "USD", "RUB");
  if (assetUsd && usdRub) return assetUsd * usdRub;

  return null;
}

async function fetchCryptoExchangeRates() {
  const result = await callCryptoPayApi("getExchangeRates", {});
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rates)) return result.rates;
  return [];
}

async function convertRubToAssetAmount(amountRub, asset) {
  const rates = await fetchCryptoExchangeRates();
  const assetToRub = resolveAssetToRubRate(rates, asset);
  if (!assetToRub || !Number.isFinite(assetToRub) || assetToRub <= 0) {
    throw new Error(`Missing exchange rate for ${asset}/RUB`);
  }

  const precision = CRYPTO_ASSET_PRECISION[asset] || 6;
  return roundNumber(Number(amountRub) / assetToRub, precision);
}

async function convertAssetAmountToRub(amountAsset, asset) {
  const rates = await fetchCryptoExchangeRates();
  const assetToRub = resolveAssetToRubRate(rates, asset);
  if (!assetToRub || !Number.isFinite(assetToRub) || assetToRub <= 0) {
    throw new Error(`Missing exchange rate for ${asset}/RUB`);
  }

  return roundNumber(Number(amountAsset) * assetToRub, 2);
}

function cryptomusSignFromBodyString(rawBody, apiKey) {
  return crypto
    .createHash("md5")
    .update(Buffer.from(rawBody, "utf8").toString("base64") + String(apiKey || ""))
    .digest("hex");
}

async function createCryptomusPayment(amountUsd, userId) {
  if (!CRYPTOMUS_MERCHANT_ID || !CRYPTOMUS_API_KEY) {
    throw new Error("Cryptomus credentials are missing");
  }

  const normalizedUsd = Number(Number(amountUsd).toFixed(2));
  if (!Number.isFinite(normalizedUsd) || normalizedUsd <= 0) {
    throw new Error("Invalid USD amount");
  }

  const orderId = `vxcm_${Number(userId)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const bodyObj = {
    amount: String(normalizedUsd),
    currency: "USD",
    order_id: orderId,
  };
  const rawBody = JSON.stringify(bodyObj);
  const sign = cryptomusSignFromBodyString(rawBody, CRYPTOMUS_API_KEY);

  const response = await axios.post(`${CRYPTOMUS_API_BASE}/v1/payment`, bodyObj, {
    headers: {
      merchant: CRYPTOMUS_MERCHANT_ID,
      sign,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  if (!response?.data || response.data.state === 1) {
    throw new Error(`Cryptomus API error: ${response?.data?.message || "unknown_error"}`);
  }

  const result = response.data.result || response.data;
  const payUrl = result?.url || result?.payment_url;
  if (!payUrl) {
    throw new Error("Cryptomus payment URL is missing");
  }

  return {
    orderId,
    amountUsd: normalizedUsd,
    payUrl,
    invoiceId: String(result?.uuid || result?.invoice_uuid || ""),
    rawResult: result,
  };
}

function verifyCryptomusWebhookSignature(rawBody, signatureHeader) {
  if (!CRYPTOMUS_API_KEY) return false;
  if (!signatureHeader) return false;
  const expected = cryptomusSignFromBodyString(rawBody, CRYPTOMUS_API_KEY);
  return String(expected).toLowerCase() === String(signatureHeader).toLowerCase();
}

async function sendTopupHome(bot, chatId, options = {}) {
  const lang = options.lang || "ar";
  const balanceRub = Number(options.user?.balance || 0);
  const balanceUsd = rubToUsd(balanceRub);
  const text = lang === "ar"
    ? [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ الـمـحـفـظـــة والـرصـيـــد ❩ ♦️",
      `💵 رصيد المستخدم بالدولار: ${balanceUsd.toFixed(2)}$`,
      `💰 رصيد المستخدم بالروبل: ${formatRuble(balanceRub)}₽`,
      "💡 يمكنك شحن حسابك عبر بوابات الدفع الآمنة.",
      "💡 الرصيد لا يمتلك تاريخ صلاحية وسيبقى محفوظاً.",
      "━━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى اختيار طريقة الدفع لإيداع الرصيد ⬇️",
    ].join("\n")
    : [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ W A L L E T   &   B A L A N C E ❩ ♦️",
      `💵 User USD balance: ${balanceUsd.toFixed(2)}$`,
      `💰 User RUB balance: ${formatRuble(balanceRub)}₽`,
      "💡 Top up your account via secure payment gateways.",
      "💡 Balance does not expire and stays in your wallet.",
      "━━━━━━━━━━━━━━━━━━━",
      "⬇️ Please choose a payment method to deposit ⬇️",
    ].join("\n");

  return sendOrEditMessage(bot, chatId, text, getTopupHomeKeyboard(lang), options.messageId, "sendTopupHome");
}

async function sendCountryTopupMenu(bot, chatId, country, options = {}) {
  const lang = options.lang || "ar";
  const map = {
    saudi: { text: t(lang, "topup_country_saudi"), keyboard: getSaudiTopupKeyboard(lang) },
    yemen: { text: t(lang, "topup_country_yemen"), keyboard: getYemenTopupKeyboard(lang) },
    egypt: { text: t(lang, "topup_country_egypt"), keyboard: getEgyptTopupKeyboard(lang) },
    global: { text: t(lang, "topup_country_global"), keyboard: getGlobalTopupKeyboard(lang) },
  };

  if (!map[country]) {
    return sendTopupHome(bot, chatId, options);
  }

  return sendOrEditMessage(bot, chatId, map[country].text, map[country].keyboard, options.messageId, `sendCountryTopupMenu.${country}`);
}

async function sendStarsPrompt(bot, chatId, options = {}) {
  const lang = options.lang || "ar";
  const text = [t(lang, "topup_stars_title"), "", t(lang, "topup_stars_price"), "", t(lang, "topup_stars_prompt")].join("\n");

  return sendOrEditMessage(
    bot,
    chatId,
    text,
    { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }]] },
    options.messageId,
    "sendStarsPrompt"
  );
}

async function sendCryptoAssetPrompt(bot, chatId, options = {}) {
  const lang = options.lang || "ar";
  const text = lang === "ar"
    ? "🪙 اختر عملة الدفع عبر Crypto Pay:\n\nUSDT / TON / TRX / BTC / ETH"
    : "🪙 Choose your Crypto Pay currency:\n\nUSDT / TON / TRX / BTC / ETH";

  return sendOrEditMessage(
    bot,
    chatId,
    text,
    buildCryptoAssetKeyboard(lang),
    options.messageId,
    "sendCryptoAssetPrompt"
  );
}

async function sendCryptoAmountPrompt(bot, chatId, asset, options = {}) {
  const lang = options.lang || "ar";
  const text = lang === "ar"
    ? `💵 تم اختيار ${asset}\n\nأرسل مبلغ الشحن بالروبل (RUB).`
    : `💵 ${asset} selected\n\nSend top-up amount in RUB.`;

  return sendOrEditMessage(
    bot,
    chatId,
    text,
    { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "topup:auto:crypto" }]] },
    options.messageId,
    "sendCryptoAmountPrompt"
  );
}

async function sendCryptoInvoiceCheckout(bot, chatId, data, options = {}) {
  const lang = options.lang || "ar";
  const text = lang === "ar"
    ? [
      "✅ تم إنشاء فاتورة Crypto Pay",
      "",
      `💰 المبلغ: ${formatRuble(data.amountRub)} RUB`,
      `🪙 العملة: ${data.asset}`,
      `🔢 المطلوب دفعه: ${data.amountAsset} ${data.asset}`,
      "",
      "اضغط زر الدفع لإكمال العملية.",
    ].join("\n")
    : [
      "✅ Crypto Pay invoice created",
      "",
      `💰 Amount: ${formatRuble(data.amountRub)} RUB`,
      `🪙 Asset: ${data.asset}`,
      `🔢 To pay: ${data.amountAsset} ${data.asset}`,
      "",
      "Press the payment button to complete checkout.",
    ].join("\n");

  return safeTelegramCall("sendCryptoInvoiceCheckout", () =>
    bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: buildCryptoInvoiceKeyboard(data.payUrl, lang),
    })
  );
}

async function sendCryptomusUsdPrompt(bot, chatId, options = {}) {
  const lang = options.lang || "ar";
  const text = lang === "ar"
    ? [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ تـحـديـــد مـبـلـــغ الإيـــداع ❩ ♦️",
      "💡 الدفع يتم عبر بوابة Cryptomus العالمية والآمنة.",
      "💡 يمكنك الدفع بأي عملة رقمية (USDT, TRX, BTC...).",
      "💡 سيتم تحويل القيمة تلقائياً إلى رصيد في حسابك.",
      "━━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى إرسال المبلغ بالدولار ($) في رسالة الآن ⬇️",
    ].join("\n")
    : [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ D E P O S I T   A M O U N T ❩ ♦️",
      "💡 Payment is processed via secure Cryptomus gateway.",
      "💡 You can pay with any crypto coin and network.",
      "💡 Value will be converted to your wallet balance automatically.",
      "━━━━━━━━━━━━━━━━━━━",
      "⬇️ Please send the amount in USD ($) now ⬇️",
    ].join("\n");

  return sendOrEditMessage(
    bot,
    chatId,
    text,
    { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }]] },
    options.messageId,
    "sendCryptomusUsdPrompt"
  );
}

async function sendCryptomusInvoiceCard(bot, chatId, payload, options = {}) {
  const lang = options.lang || "ar";
  const text = lang === "ar"
    ? [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ فـاتـــورة الإيـــداع (الـكـريـبـتـو) ❩ ♦️",
      `💰 المبلغ المطلوب: ${payload.amountUsd.toFixed(2)}$`,
      "🔗 بوابة الدفع: Cryptomus (آمن وموثق)",
      "⏳ صلاحية الفاتورة: ساعة واحدة من الآن.",
      "━━━━━━━━━━━━━━━━━━━",
      "⚠️ الرصيد سيصل حسابك تلقائياً فور تأكيد شبكة البلوكتشين.",
      "⬇️ اضغط على الزر أدناه للانتقال لصفحة الدفع ⬇️",
    ].join("\n")
    : [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ C R Y P T O   D E P O S I T   I N V O I C E ❩ ♦️",
      `💰 Required amount: ${payload.amountUsd.toFixed(2)}$`,
      "🔗 Gateway: Cryptomus (Secure & Verified)",
      "⏳ Invoice validity: 1 hour.",
      "━━━━━━━━━━━━━━━━━━━",
      "⚠️ Balance will be added automatically after blockchain confirmation.",
      "⬇️ Tap the button below to open the payment page ⬇️",
    ].join("\n");

  return safeTelegramCall("sendCryptomusInvoiceCard", () =>
    bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: buildCryptomusPayKeyboard(payload.payUrl, lang),
      disable_web_page_preview: true,
    })
  );
}

async function sendGatewayWebAppLauncher(bot, chatId, methodKey, options = {}) {
  const lang = options.lang || "ar";
  const userId = Number(options.userId || 0);
  const method = String(methodKey || "").toLowerCase();
  const methodCfg = getGatewayMethodConfig(method);
  if (!methodCfg) {
    return sendPlaceholderTopupMethod(bot, chatId, method, options);
  }

  const webAppUrl = buildPublicUrl("/webapp/app", {
    method,
    lang,
    user_id: userId,
    screen: "payment",
    v: String(process.env.WEBAPP_VERSION || "2026-04-28-2"),
  });
  if (!webAppUrl) {
    throw new Error("PUBLIC_BASE_URL is missing for WebApp launch");
  }

  const methodLabel = lang === "ar"
    ? (methodCfg.title_ar || methodCfg.title_en || method)
    : (methodCfg.title_en || methodCfg.title_ar || method);

  const text = lang === "ar"
    ? [
      `💳 ${methodLabel}`,
      "",
      "✨ تم تفعيل الدفع الذكي عبر واجهة تفاعلية.",
      "اضغط الزر أدناه لفتح نافذة الدفع وإرسال بيانات العملية.",
    ].join("\n")
    : [
      `💳 ${methodLabel}`,
      "",
      "✨ Smart payment flow is enabled for this gateway.",
      "Tap the button below to open the payment web app.",
    ].join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: lang === "ar" ? "🚀 فتح واجهة الدفع" : "🚀 Open Payment Web App",
          web_app: { url: webAppUrl },
        },
      ],
      [{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }],
    ],
  };

  return sendOrEditMessage(bot, chatId, text, keyboard, options.messageId, `sendGatewayWebAppLauncher.${method}`);
}

async function createCryptoInvoiceForRub(userId, amountRub, asset) {
  const normalizedAsset = String(asset || "").toUpperCase();
  if (!CRYPTO_SUPPORTED_ASSETS.includes(normalizedAsset)) {
    throw new Error(`Unsupported crypto asset: ${asset}`);
  }

  const amountAsset = await convertRubToAssetAmount(amountRub, normalizedAsset);
  if (!Number.isFinite(amountAsset) || amountAsset <= 0) {
    throw new Error("Invalid converted crypto amount");
  }

  const payload = JSON.stringify({
    user_id: Number(userId),
    amount_rub: Number(amountRub),
    asset: normalizedAsset,
  });

  const invoice = await callCryptoPayApi("createInvoice", {
    asset: normalizedAsset,
    amount: String(amountAsset),
    payload,
  });

  const payUrl = invoice.bot_invoice_url || invoice.pay_url || invoice.mini_app_invoice_url || invoice.url || "";
  if (!payUrl) {
    throw new Error("Crypto Pay did not return a payment URL");
  }

  return {
    invoiceId: Number(invoice.invoice_id),
    payUrl,
    amountAsset,
    amountRub: Number(amountRub),
    asset: normalizedAsset,
    payload,
  };
}

async function sendStarsCheckout(bot, chatId, amountRub, lang = "ar") {
  const starsAmount = amountRub * 3;
  const text = [
    t(lang, "topup_checkout_title"),
    "",
    `${t(lang, "topup_checkout_amount")}: ${formatRuble(amountRub)} RUB`,
    `${t(lang, "topup_checkout_stars")}: ${formatRuble(starsAmount)}`,
    "",
    t(lang, "topup_checkout_hint"),
  ].join("\n");

  return safeTelegramCall("sendStarsCheckout", () =>
    bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: getStarsPayKeyboard(amountRub, lang),
    })
  );
}

async function sendPlaceholderTopupMethod(bot, chatId, methodTitle, options = {}) {
  const lang = options.lang || "ar";
  const text = [`💳 ${methodTitle}`, "", t(lang, "topup_method_placeholder")].join("\n");

  return sendOrEditMessage(
    bot,
    chatId,
    text,
    {
      inline_keyboard: [
        [{ text: t(lang, "common_back"), callback_data: "service:balance_topup" }],
        [{ text: t(lang, "common_home"), callback_data: "menu:main" }],
      ],
    },
    options.messageId,
    "sendPlaceholderTopupMethod"
  );
}

async function createStarsInvoice(bot, chatId, amountRub, lang = "ar") {
  const starsAmount = amountRub * 3;
  return safeTelegramCall("createStarsInvoice", () =>
    bot.sendInvoice(
      chatId,
      t(lang, "topup_invoice_title"),
      t(lang, "topup_invoice_desc").replace("{amount}", formatRuble(amountRub)),
      `topup_stars_${amountRub}`,
      "",
      "XTR",
      [{ label: "Telegram Stars", amount: starsAmount }]
    )
  );
}

async function notifyTopupChannel(bot, userId, amountRub, lang = "ar", method = "Telegram Stars") {
  return safeTelegramCall("notifyTopupChannel", () =>
    bot.sendMessage(
      ACTIVATIONS_CHANNEL_ID,
      [
        t(lang, "topup_notify_title"),
        "",
        `${t(lang, "topup_notify_user_id")}: <code>${userId}</code>`,
        `${t(lang, "topup_notify_amount")}: ${formatRuble(amountRub)} RUB`,
        `${t(lang, "topup_notify_method")}: ${method}`,
      ].join("\n"),
      {
        parse_mode: "HTML",
        disable_notification: true,
      }
    )
  );
}

module.exports = {
  CRYPTO_SUPPORTED_ASSETS,
  CRYPTOMUS_API_BASE,
  sendTopupHome,
  sendCountryTopupMenu,
  sendStarsPrompt,
  sendCryptoAssetPrompt,
  sendCryptoAmountPrompt,
  sendCryptomusUsdPrompt,
  sendCryptomusInvoiceCard,
  sendGatewayWebAppLauncher,
  sendCryptoInvoiceCheckout,
  sendStarsCheckout,
  sendPlaceholderTopupMethod,
  createStarsInvoice,
  createCryptoInvoiceForRub,
  createCryptomusPayment,
  verifyCryptomusWebhookSignature,
  getGatewayMethodConfig,
  localToRub,
  convertAssetAmountToRub,
  rubToUsd,
  usdToRub,
  notifyTopupChannel,
};
