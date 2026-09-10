require("dotenv").config();
const http = require("http");
const TelegramBot = require("node-telegram-bot-api");
const {
  BOT_TOKEN,
  ADMIN_CHANNEL_ID,
  PUBLIC_BASE_URL,
  TELEGRAM_WEBAPP_URL,
} = require("./config");
const { AppStore } = require("./services/appStore");
const { logBotError } = require("./services/errorLogger");
const { safeTelegramCall } = require("./services/telegramSafe");
const { isNetworkPermissionError } = require("./utils/network");
const {
  requestNumber,
  getSmsStatus,
  cancelNumber,
  getGrizzlyVirtualNumberCatalog,
  getServicePrices,
  getProviderCountries,
} = require("./services/grizzlyService");
const { getSmsProvider } = require("./constants/smsProviders");
const { getGrizzlyServiceCode, getGrizzlyCountryMeta } = require("./constants/grizzly");
const { t, getUserLang } = require("./locales");
const {
  fetchAndCachePrices,
  getCachedCountries,
  grizzlyCountries,
} = require("./services/grizzlyCacheService");
const { smmServices, getPlatform, getCategory, getServiceInfo } = require("./constants/smmServices");
const { fetchAndCacheSmmServices, getCachedSmmServiceById, createSmmOrder } = require("./services/smmCacheService");
const { getGameTopupCatalog, getGamesByCategory, getGameByKey } = require("./services/gameTopupCatalogService");
const { executeGameTopupOrder } = require("./services/gameTopupProviderService");
const {
  handleStart,
  handleLanguageSelection,
  handleCaptchaInput,
} = require("./handlers/startHandler");
const { handleAdminCommand } = require("./handlers/adminHandler");
const { handleTextMessage } = require("./handlers/messageHandler");
const { handleCallbackQuery } = require("./handlers/callbackHandler");
const { handleVirtualNumbersCallback } = require("./services/virtualNumbersFlowService");
const { handlePreCheckoutQuery, handleSuccessfulPayment } = require("./handlers/paymentHandler");
const {
  notifyTopupChannel,
  convertAssetAmountToRub,
  verifyCryptomusWebhookSignature,
  usdToRub,
} = require("./services/topupService");
const {
  setupBotCommands,
  handleMenuCommand,
  handleAccountCommand,
  handleAddFundsCommand,
  handleSupportCommand,
  handleSettingsCommand,
  handleAppCommand,
} = require("./services/commandService");
const {
  handleGatewayWebAppData,
  processSmsWebhook,
  isSmsWebhookAuthorized,
  renderGatewayWebAppPage,
  startBinanceEmailWatcher,
} = require("./services/topupVerificationService");
const { handleVaultXWebAppData } = require("./services/webAppBridgeService");
const {
  renderVaultXWebAppPage,
  getWebAppProfile,
  getWebAppTransactions,
} = require("./services/webAppUiService");

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing. Add it to your environment before starting the bot.");
}

const telegramProxyUrl = String(process.env.TELEGRAM_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "").trim();
const telegramBaseApiUrl = String(process.env.TELEGRAM_BASE_API_URL || "").trim();
const botOptions = {
  polling: {
    autoStart: true,
    params: { timeout: 20 },
    interval: 800,
  },
  request: {
    forever: true,
  },
};
if (telegramProxyUrl) {
  botOptions.request.proxy = telegramProxyUrl;
}
if (telegramBaseApiUrl) {
  botOptions.baseApiUrl = telegramBaseApiUrl;
}

const bot = new TelegramBot(BOT_TOKEN, botOptions);
const appStore = new AppStore();
const appContext = {
  botUsername: "VaultX",
};
let pollingRestartTimer = null;
let pollingRestartDelayMs = 5000;

function resolveVaultXWebAppUrl() {
  const version = String(process.env.WEBAPP_VERSION || "2026-04-28-2");
  const explicit = String(TELEGRAM_WEBAPP_URL || "").trim();
  if (explicit) {
    const hasQuery = explicit.includes("?");
    return `${explicit}${hasQuery ? "&" : "?"}v=${encodeURIComponent(version)}`;
  }
  const base = String(PUBLIC_BASE_URL || "").trim();
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}/webapp/app?lang=ar&v=${encodeURIComponent(version)}`;
}

function isLikelyMojibake(value) {
  const text = String(value || "");
  if (!text) return false;
  return /[ØÙÚÛÜÝÞß]|ط|ظ|ðŸ|�/.test(text);
}

const USD_TO_RUB_RATE = Number(process.env.USD_TO_RUB_RATE || 30);

async function handleCryptoWebhookEvent(event) {
  const invoiceId = Number(event?.invoice_id);
  const status = String(event?.status || "").toLowerCase();
  if (!Number.isFinite(invoiceId) || status !== "paid") {
    return { ok: true, ignored: true };
  }

  const duplicate = appStore.transactions.find((tx) =>
    tx.type === "topup_crypto_paid" && Number(tx.cryptoInvoiceId) === invoiceId
  );
  if (duplicate) {
    return { ok: true, duplicate: true };
  }

  const payloadRaw = String(event?.payload || "");
  let payloadData = null;
  try {
    payloadData = JSON.parse(payloadRaw);
  } catch (_) {
    payloadData = null;
  }

  const payloadUserId = Number(payloadData?.user_id);
  const pendingTx = appStore.transactions.find((tx) =>
    tx.type === "topup_crypto_pending" && Number(tx.cryptoInvoiceId) === invoiceId
  );

  const userId = Number.isFinite(payloadUserId)
    ? payloadUserId
    : Number(pendingTx?.userId || 0);

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error(`Webhook payload user_id missing for invoice ${invoiceId}`);
  }

  const paidAsset = String(event?.paid_asset || event?.asset || pendingTx?.cryptoAsset || "").toUpperCase();
  const paidAmountRaw = Number(event?.paid_amount || event?.amount || pendingTx?.cryptoAssetAmount || 0);

  if (!paidAsset || !Number.isFinite(paidAmountRaw) || paidAmountRaw <= 0) {
    throw new Error(`Invalid paid asset/amount for invoice ${invoiceId}`);
  }

  let creditedRub = 0;
  try {
    creditedRub = await convertAssetAmountToRub(paidAmountRaw, paidAsset);
  } catch (_) {
    creditedRub = Number(payloadData?.amount_rub || pendingTx?.amount || 0);
  }

  if (!Number.isFinite(creditedRub) || creditedRub <= 0) {
    throw new Error(`Invalid converted RUB amount for invoice ${invoiceId}`);
  }

  appStore.addBalance(userId, creditedRub);
  appStore.addDeposit(userId, creditedRub);
  const updatedUser = appStore.incrementTransactions(userId);

  appStore.addTransaction({
    type: "topup_crypto_paid",
    userId,
    amount: creditedRub,
    method: `Crypto Pay (${paidAsset})`,
    cryptoAsset: paidAsset,
    cryptoPaidAmount: paidAmountRaw,
    cryptoInvoiceId: invoiceId,
    serviceKey: "balance_topup",
    externalPayload: payloadRaw,
  });

  if (pendingTx && pendingTx.id) {
    appStore.updateTransactionById(pendingTx.id, {
      status: "paid",
      paidAt: new Date().toISOString(),
      paidAsset,
      paidAmount: paidAmountRaw,
      paidRub: creditedRub,
    });
  }

  const lang = getUserLang(updatedUser || appStore.findUserById(userId) || { language: "ar" });
  await safeTelegramCall("cryptoWebhook.notifyUser", () =>
    bot.sendMessage(
      userId,
      lang === "ar"
        ? `âœ… طھظ… ط´ط­ظ† ط±طµظٹط¯ظƒ ط¨ظ†ط¬ط§ط­ ط¹ط¨ط± Crypto Pay\nًں’° ط§ظ„ظ…ط¨ظ„ط؛: ${creditedRub} RUB`
        : `âœ… Your balance has been topped up via Crypto Pay\nًں’° Amount: ${creditedRub} RUB`
    )
  );

  await notifyTopupChannel(bot, userId, creditedRub, lang, `Crypto Pay (${paidAsset})`);

  await safeTelegramCall("cryptoWebhook.notifyAdmin", () =>
    bot.sendMessage(
      ADMIN_CHANNEL_ID,
      [
        "<b>Crypto Top-up Success</b>",
        `User ID: <code>${userId}</code>`,
        `Invoice ID: <code>${invoiceId}</code>`,
        `Paid: ${paidAmountRaw} ${paidAsset}`,
        `Credited: ${creditedRub} RUB`,
      ].join("\n"),
      { parse_mode: "HTML", disable_notification: true }
    )
  );

  return { ok: true };
}

async function handleCryptomusWebhookEvent(rawBody, parsedPayload) {
  const signature = parsedPayload?.__signature || "";
  if (!verifyCryptomusWebhookSignature(rawBody, signature)) {
    throw new Error("Invalid Cryptomus webhook signature");
  }

  const data = parsedPayload?.payload || parsedPayload?.result || parsedPayload;
  const status = String(data?.status || "").toLowerCase();
  if (status !== "paid" && status !== "paid_over") {
    return { ok: true, ignored: true };
  }

  const orderId = String(data?.order_id || "");
  const invoiceUuid = String(data?.uuid || data?.invoice_uuid || "");

  if (!orderId) {
    throw new Error("Cryptomus order_id is missing");
  }

  const duplicate = appStore.transactions.find((tx) =>
    tx.type === "topup_cryptomus_paid"
      && (String(tx.cryptomusOrderId || "") === orderId
        || (invoiceUuid && String(tx.cryptomusInvoiceId || "") === invoiceUuid))
  );
  if (duplicate) {
    return { ok: true, duplicate: true };
  }

  let userId = 0;
  const pendingTx = appStore.transactions.find((tx) =>
    tx.type === "topup_cryptomus_pending" && String(tx.cryptomusOrderId || "") === orderId
  );

  if (pendingTx?.userId) {
    userId = Number(pendingTx.userId);
  } else {
    const pieces = orderId.split("_");
    if (pieces.length >= 2) {
      userId = Number(pieces[1]);
    }
  }

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error(`Cannot resolve user from order_id: ${orderId}`);
  }

  const amountUsd = Number(data?.amount || data?.payment_amount_usd || pendingTx?.amountUsd || 0);
  const amountRub = Number.isFinite(amountUsd) && amountUsd > 0
    ? usdToRub(amountUsd)
    : Number(pendingTx?.amount || 0);

  if (!Number.isFinite(amountRub) || amountRub <= 0) {
    throw new Error(`Invalid converted amount from Cryptomus webhook for order ${orderId}`);
  }

  appStore.addBalance(userId, amountRub);
  appStore.addDeposit(userId, amountRub);
  const updatedUser = appStore.incrementTransactions(userId);

  appStore.addTransaction({
    type: "topup_cryptomus_paid",
    userId,
    amount: amountRub,
    amountUsd: amountUsd > 0 ? amountUsd : undefined,
    method: "Cryptomus Hosted Checkout",
    cryptomusOrderId: orderId,
    cryptomusInvoiceId: invoiceUuid || undefined,
    serviceKey: "balance_topup",
    externalPayload: rawBody,
  });

  if (pendingTx?.id) {
    appStore.updateTransactionById(pendingTx.id, {
      status: "paid",
      paidAt: new Date().toISOString(),
      paidUsd: amountUsd > 0 ? amountUsd : undefined,
      paidRub: amountRub,
    });
  }

  const lang = getUserLang(updatedUser || appStore.findUserById(userId) || { language: "ar" });
  await safeTelegramCall("cryptomusWebhook.notifyUser", () =>
    bot.sendMessage(
      userId,
      lang === "ar"
        ? `✅ تم شحن رصيدك بنجاح عبر Cryptomus\n💰 المبلغ: ${amountRub} RUB`
        : `✅ Your balance has been topped up via Cryptomus\n💰 Amount: ${amountRub} RUB`
    )
  );

  await notifyTopupChannel(bot, userId, amountRub, lang, "Cryptomus Hosted Checkout");

  await safeTelegramCall("cryptomusWebhook.notifyAdmin", () =>
    bot.sendMessage(
      ADMIN_CHANNEL_ID,
      [
        "<b>Cryptomus Top-up Success</b>",
        `User ID: <code>${userId}</code>`,
        `Order ID: <code>${orderId}</code>`,
        amountUsd > 0 ? `Amount: ${amountUsd} USD` : null,
        `Credited: ${amountRub} RUB`,
      ].filter(Boolean).join("\n"),
      { parse_mode: "HTML", disable_notification: true }
    )
  );

  return { ok: true };
}

const renderPort = Number(process.env.PORT || 0);
if (Number.isFinite(renderPort) && renderPort > 0) {
  const readJsonBody = (req) => new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });

  http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", "http://localhost");
      req.query = Object.fromEntries(requestUrl.searchParams.entries());

      if (req.method === "GET" && requestUrl.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("I am alive");
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/webapp/recharge") {
        renderGatewayWebAppPage(req, res);
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/webapp/app") {
        renderVaultXWebAppPage(req, res, appStore);
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/webapp/profile") {
        const userId = Number(req.query?.user_id || 0);
        const profile = getWebAppProfile(appStore, userId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, profile }));
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/webapp/transactions") {
        const userId = Number(req.query?.user_id || 0);
        const limit = Number(req.query?.limit || 10);
        const transactions = getWebAppTransactions(appStore, userId, limit);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, transactions }));
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/webapp/referral-stats") {
        const userId = Number(req.query?.user_id || 0);
        const totalInvites = appStore.users.filter((u) => Number(u.invitedBy || 0) === userId).length;
        const activeUsers = appStore.users.filter((u) => Number(u.invitedBy || 0) === userId && Number(u.transactionsCount || 0) > 0).length;
        const totalEarnings = Number(appStore.transactions
          .filter((tx) => tx.type === "referral_reward" && Number(tx.userId || 0) === userId)
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
          .toFixed(2));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, stats: { totalInvites, activeUsers, totalEarnings } }));
        return;
      }
      if (req.method === "POST" && requestUrl.pathname === "/webapp/transfer") {
        try {
          const payload = await readJsonBody(req);
          const userId = Number(payload?.user_id || 0);
          const targetId = Number(payload?.target_id || 0);
          const currency = String(payload?.currency || "RUB").toUpperCase();
          const amount = Number(payload?.amount || 0);
          const sender = appStore.findUserById(userId);
          const receiver = appStore.findUserById(targetId);
          if (!sender || !receiver || !Number.isFinite(amount) || amount <= 0) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "invalid_transfer_data" }));
            return;
          }

          if (currency === "USD") {
            const senderUsd = Number(sender.usdBalance || Number((Number(sender.balance || 0) / 30).toFixed(2)));
            if (senderUsd < amount) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "insufficient_balance" }));
              return;
            }
            appStore.deductUsdBalance(sender.userId, amount);
            appStore.addUsdBalance(receiver.userId, amount);
          } else {
            if (Number(sender.balance || 0) < amount) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "insufficient_balance" }));
              return;
            }
            appStore.deductBalance(sender.userId, amount);
            appStore.addBalance(receiver.userId, amount);
          }

          appStore.addTransaction({
            type: "transfer_out",
            userId: sender.userId,
            targetUserId: receiver.userId,
            amount,
            currency,
            status: "completed",
          });
          appStore.addTransaction({
            type: "transfer_in",
            userId: receiver.userId,
            sourceUserId: sender.userId,
            amount,
            currency,
            status: "completed",
          });

          await safeTelegramCall("webapp.transfer.notify.receiver", () =>
            bot.sendMessage(
              receiver.userId,
              currency === "USD"
                ? `💸 You received ${amount} USD from user ${sender.userId}`
                : `💸 You received ${amount} RUB from user ${sender.userId}`
            )
          );

          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          logBotError("http.webapp.transfer", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "transfer_failed" }));
        }
        return;
      }
      if (req.method === "POST" && requestUrl.pathname === "/webapp/convert") {
        try {
          const payload = await readJsonBody(req);
          const userId = Number(payload?.user_id || 0);
          const from = String(payload?.from || "RUB").toUpperCase();
          const to = String(payload?.to || "USD").toUpperCase();
          const amount = Number(payload?.amount || 0);
          const user = appStore.findUserById(userId);
          if (!user || !Number.isFinite(amount) || amount <= 0 || from === to) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "invalid_convert_data" }));
            return;
          }

          if (from === "RUB" && to === "USD") {
            if (Number(user.balance || 0) < amount) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "insufficient_balance" }));
              return;
            }
            const usdAmount = Number((amount / Number(USD_TO_RUB_RATE || 30)).toFixed(2));
            appStore.deductBalance(user.userId, amount);
            appStore.addUsdBalance(user.userId, usdAmount);
            appStore.addTransaction({ type: "wallet_convert", userId, from, to, amount, convertedAmount: usdAmount, status: "completed" });
          } else if (from === "USD" && to === "RUB") {
            const userUsd = Number(user.usdBalance || Number((Number(user.balance || 0) / Number(USD_TO_RUB_RATE || 30)).toFixed(2)));
            if (userUsd < amount) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "insufficient_balance" }));
              return;
            }
            const rubAmount = Number((amount * Number(USD_TO_RUB_RATE || 30)).toFixed(2));
            appStore.deductUsdBalance(user.userId, amount);
            appStore.addBalance(user.userId, rubAmount);
            appStore.addTransaction({ type: "wallet_convert", userId, from, to, amount, convertedAmount: rubAmount, status: "completed" });
          } else {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "unsupported_convert_pair" }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          logBotError("http.webapp.convert", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "convert_failed" }));
        }
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/webapp/virtual-numbers/apps") {
        const apps = [
          "WhatsApp",
          "Telegram",
          "Instagram",
          "Facebook",
          "Twitter",
          "TikTok",
          "Google",
          "Snapchat",
          "Viber",
          "Discord",
        ];
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, apps }));
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/webapp/virtual-numbers/countries") {
        try {
          const appName = String(req.query?.app || "WhatsApp");
          const serviceCode = getGrizzlyServiceCode(appName);
          const [p1Raw, p2Raw, p1Countries, p2Countries] = await Promise.all([
            getServicePrices(serviceCode, "server1", { forceRefresh: true }),
            getServicePrices(serviceCode, "server2", { forceRefresh: true }),
            getProviderCountries("server1"),
            getProviderCountries("server2"),
          ]);
          const map = new Map();
          const pushFrom = (raw, providerKey, countriesMap) => {
            Object.entries(raw || {}).forEach(([countryId, entry]) => {
              const pack = entry?.[serviceCode] && typeof entry[serviceCode] === "object" ? entry[serviceCode] : entry;
              const supplierPrice = Number(pack?.cost ?? pack?.price);
              const availableCount = Number(pack?.count ?? pack?.qty ?? pack?.stock ?? 0);
              if (!Number.isFinite(supplierPrice) || supplierPrice <= 0) return;
              if (!Number.isFinite(availableCount) || availableCount <= 0) return;
              const sellPrice = Math.ceil(parseFloat(supplierPrice) * 25 * 1.2);
              const countryMeta = getGrizzlyCountryMeta(countryId);
              const providerCountryName = String((countriesMap || {})[String(countryId)] || "").trim();
              const safeProviderCountryName = ""; // keep names consistent with main bot mapping
              const safeMetaEn = isLikelyMojibake(countryMeta?.name_en) ? "" : String(countryMeta?.name_en || "").trim();
              const safeMetaAr = isLikelyMojibake(countryMeta?.name_ar) ? "" : String(countryMeta?.name_ar || "").trim();
              const countryName = safeProviderCountryName || safeMetaEn || safeMetaAr || `Country ${countryId}`;
              const previous = map.get(String(countryId)) || {
                id: String(countryId),
                name: countryName,
                name_en: safeMetaEn || countryName,
                name_ar: safeMetaAr || countryName,
                flag: countryMeta?.flag || "🌍",
                options: [],
                availableCount: 0,
              };
              previous.options.push({ providerKey, sellPrice, availableCount });
              previous.availableCount += Math.max(0, Math.floor(availableCount));
              map.set(String(countryId), previous);
            });
          };
          pushFrom(p1Raw, "server1", p1Countries);
          pushFrom(p2Raw, "server2", p2Countries);
          const countries = [...map.values()].map((c) => ({
            ...c,
            options: c.options.sort((a, b) => Number(a.sellPrice) - Number(b.sellPrice)),
            minSellPrice: c.options.length ? Number(c.options[0].sellPrice) : 0,
          })).sort((a, b) => Number(a.minSellPrice) - Number(b.minSellPrice));
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, app: appName, countries }));
        } catch (error) {
          logBotError("http.webapp.vn.countries", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "failed_to_load_countries" }));
        }
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/webapp/virtual-numbers/status") {
        try {
          const activationId = String(req.query?.activation_id || "");
          const providerKey = String(req.query?.provider_key || "server2");
          const statusRaw = await getSmsStatus(activationId, providerKey);
          const statusText = String(statusRaw || "").trim();
          let status = "pending";
          let code = "";
          if (statusText.startsWith("STATUS_OK")) {
            status = "received";
            code = String(statusText.split(":")[1] || "");
          } else if (statusText.startsWith("STATUS_CANCEL")) {
            status = "cancelled";
          } else if (!statusText || statusText.startsWith("ERROR")) {
            status = "error";
          }
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, status, code, raw: statusText }));
        } catch (error) {
          logBotError("http.webapp.vn.status", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "status_failed" }));
        }
        return;
      }
      if (req.method === "POST" && requestUrl.pathname === "/webapp/virtual-numbers/buy") {
        try {
          const payload = await readJsonBody(req);
          const userId = Number(payload?.user_id || 0);
          const appName = String(payload?.app || "WhatsApp");
          const countryId = String(payload?.country_id || "");
          const selectedProvider = String(payload?.provider_key || "").trim();
          const selectedPrice = Number(payload?.price_rub || 0);

          const user = appStore.findUserById(userId);
          if (!user) {
            res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "user_not_found" }));
            return;
          }

          const serviceCode = getGrizzlyServiceCode(appName);
          const [cat1, cat2] = await Promise.all([
            getGrizzlyVirtualNumberCatalog(appName, { providerKey: "server1" }),
            getGrizzlyVirtualNumberCatalog(appName, { providerKey: "server2" }),
          ]);
          let options = []
            .concat(cat1.countries || [], cat2.countries || [])
            .filter((x) => String(x.id) === countryId);
          if (selectedProvider) {
            options = options.filter((x) => String(x.providerKey) === selectedProvider);
          }
          if (Number.isFinite(selectedPrice) && selectedPrice > 0) {
            options = options.filter((x) => Number(x.sellPrice) === selectedPrice);
          }
          options = options.sort((a, b) => Number(a.sellPrice) - Number(b.sellPrice));

          if (!options.length) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "country_not_available" }));
            return;
          }

          const chosen = options[0];
          const price = Number(chosen.sellPrice || 0);
          if (!Number.isFinite(price) || price <= 0 || Number(user.balance || 0) < price) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "insufficient_balance", need: price, balance: Number(user.balance || 0) }));
            return;
          }

          let acquired = null;
          for (const option of options) {
            const response = await requestNumber(serviceCode, countryId, option.providerKey || "server2");
            const text = String(response || "").trim();
            if (text && text.includes("ACCESS_NUMBER")) {
              const [, activationId, number] = text.split(":");
              acquired = {
                activationId: String(activationId || ""),
                number: String(number || ""),
                providerKey: option.providerKey || "server2",
                price: Number(option.sellPrice || 0),
                countryName: option.name_ar || option.name_en || chosen.name_ar || "",
                flag: option.flag || chosen.flag || "🌍",
              };
              break;
            }
          }

          if (!acquired) {
            res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "provider_no_number" }));
            return;
          }

          appStore.deductBalance(user.userId, acquired.price);
          appStore.incrementTransactions(user.userId);
          appStore.addTransaction({
            type: "virtual_number_purchase",
            userId: user.userId,
            serviceKey: "virtual_numbers",
            appName,
            countryId,
            providerKey: acquired.providerKey,
            activationId: acquired.activationId,
            number: acquired.number,
            amount: acquired.price,
            status: "pending",
          });

          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            ok: true,
            order: {
              app: appName,
              country_id: countryId,
              country_name: acquired.countryName,
              flag: acquired.flag,
              provider_key: acquired.providerKey,
              activation_id: acquired.activationId,
              number: acquired.number,
              price_rub: acquired.price,
            },
          }));
        } catch (error) {
          logBotError("http.webapp.vn.buy", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "buy_failed" }));
        }
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/webapp/social-boost/platforms") {
        const lang = String(req.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
        const platforms = smmServices.map((p) => ({
          key: p.key,
          name: lang === "ar" ? p.label_ar : p.label_en,
          icon: p.icon,
        }));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, platforms }));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/webapp/social-boost/categories") {
        const lang = String(req.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
        const platformKey = String(req.query?.platform || "");
        const platform = getPlatform(platformKey);
        if (!platform) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "platform_not_found" }));
          return;
        }
        const categories = (platform.categories || []).map((c) => ({
          key: c.key,
          name: lang === "ar" ? c.label_ar : c.label_en,
        }));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, categories }));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/webapp/social-boost/services") {
        const lang = String(req.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
        const platformKey = String(req.query?.platform || "");
        const categoryKey = String(req.query?.category || "");
        const category = getCategory(platformKey, categoryKey);
        if (!category) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "category_not_found" }));
          return;
        }
        const services = (category.services || []).map((s) => {
          const serviceInfo = getServiceInfo(s.id);
          const cached = getCachedSmmServiceById(s.id);
          const unit = Number(cached?.pricePerUnitRub || 0);
          return {
            id: String(s.id),
            name: lang === "ar" ? (cached?.nameAr || serviceInfo?.service?.name_ar || s.name_ar) : (cached?.nameEn || serviceInfo?.service?.name_en || s.name_en),
            pricePerUnitRub: Number.isFinite(unit) ? Number(unit.toFixed(4)) : 0,
            min: Number(cached?.min || 0),
            max: Number(cached?.max || 0),
          };
        }).filter((x) => x.pricePerUnitRub > 0);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, services }));
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/webapp/social-boost/order") {
        try {
          const payload = await readJsonBody(req);
          const userId = Number(payload?.user_id || 0);
          const serviceId = String(payload?.service_id || "");
          const link = String(payload?.link || "").trim();
          const quantity = Number(payload?.quantity || 0);
          const user = appStore.findUserById(userId);
          const cached = getCachedSmmServiceById(serviceId);
          if (!user || !cached || !link || !Number.isFinite(quantity)) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "invalid_payload" }));
            return;
          }
          const min = Number(cached.min || 1);
          const max = Number(cached.max || 100000);
          if (quantity < min || quantity > max) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "invalid_quantity", min, max }));
            return;
          }
          const total = Number((Number(cached.pricePerUnitRub || 0) * quantity).toFixed(4));
          if (Number(user.balance || 0) < total) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "insufficient_balance", need: total, balance: Number(user.balance || 0) }));
            return;
          }
          const order = await createSmmOrder({ serviceId, link, quantity });
          if (!order?.success) {
            res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "provider_failed" }));
            return;
          }
          appStore.deductBalance(userId, total);
          appStore.incrementTransactions(userId);
          appStore.addProfit(total);
          appStore.addTransaction({
            type: "social_boost_order",
            userId,
            serviceKey: "social_boost",
            serviceId,
            link,
            quantity,
            amount: total,
            providerOrderId: String(order.orderId || ""),
          });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, order_id: String(order.orderId || ""), charged_rub: total }));
        } catch (error) {
          logBotError("http.webapp.smm.order", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "order_failed" }));
        }
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/webapp/game-topup/categories") {
        const lang = String(req.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
        const catalog = await getGameTopupCatalog();
        const categories = (catalog.categories || []).map((c) => ({ key: c.key, emoji: c.emoji, name: lang === "ar" ? c.name_ar : c.name_en }));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, categories }));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/webapp/game-topup/games") {
        const lang = String(req.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
        const categoryKey = String(req.query?.category || "");
        const catalog = await getGameTopupCatalog();
        const games = getGamesByCategory(catalog, categoryKey).map((g) => ({ key: g.key, emoji: g.emoji, name: lang === "ar" ? g.name_ar : g.name_en }));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, games }));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/webapp/game-topup/packages") {
        const lang = String(req.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
        const gameKey = String(req.query?.game || "");
        const catalog = await getGameTopupCatalog();
        const game = getGameByKey(catalog, gameKey);
        if (!game) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "game_not_found" }));
          return;
        }
        const packages = (game.packages || []).map((p, i) => ({
          index: i,
          label: lang === "ar" ? p.units_ar : p.units_en,
          priceRub: Number((Number(p.priceRub || 0) * USD_TO_RUB_RATE).toFixed(2)),
        }));
        const custom = game.custom ? {
          min: Number(game.custom.min || 0),
          max: Number(game.custom.max || 0),
          unitLabel: lang === "ar" ? game.custom.unitLabelAr : game.custom.unitLabelEn,
          unitPriceRub: Number((Number(game.custom.unitPriceRub || 0) * USD_TO_RUB_RATE).toFixed(4)),
        } : null;
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, game: { key: game.key, name: lang === "ar" ? game.name_ar : game.name_en, emoji: game.emoji }, packages, custom }));
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/webapp/game-topup/order") {
        try {
          const payload = await readJsonBody(req);
          const userId = Number(payload?.user_id || 0);
          const gameKey = String(payload?.game_key || "");
          const playerId = String(payload?.player_id || "").trim();
          const user = appStore.findUserById(userId);
          const catalog = await getGameTopupCatalog();
          const game = getGameByKey(catalog, gameKey);
          if (!user || !game || !playerId) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "invalid_payload" }));
            return;
          }

          let totalRub = 0;
          let packageItem = null;
          let quantity = null;
          let packageLabel = "";
          if (payload?.package_index !== undefined && payload?.package_index !== null && String(payload.package_index) !== "") {
            packageItem = game.packages[Number(payload.package_index)];
            if (!packageItem) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "invalid_package" }));
              return;
            }
            totalRub = Number((Number(packageItem.priceRub || 0) * USD_TO_RUB_RATE).toFixed(2));
            packageLabel = packageItem.units_ar || packageItem.units_en || "Package";
          } else {
            const customQuantity = Number(payload?.custom_quantity || 0);
            if (!game.custom || !Number.isFinite(customQuantity) || customQuantity <= 0) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "invalid_custom_quantity" }));
              return;
            }
            const min = Number(game.custom.min || 0);
            const max = Number(game.custom.max || 0);
            if (customQuantity < min || customQuantity > max) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "custom_quantity_out_of_range", min, max }));
              return;
            }
            quantity = customQuantity;
            totalRub = Number((Number(game.custom.unitPriceRub || 0) * customQuantity * USD_TO_RUB_RATE).toFixed(2));
            packageLabel = `${customQuantity} ${game.custom.unitLabelAr || game.custom.unitLabelEn || "Units"}`;
          }

          if (Number(user.balance || 0) < totalRub) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "insufficient_balance", need: totalRub, balance: Number(user.balance || 0) }));
            return;
          }

          const order = await executeGameTopupOrder({ game, playerId, packageItem, quantity });
          if (!order?.success) {
            res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "provider_failed" }));
            return;
          }

          appStore.deductBalance(userId, totalRub);
          appStore.incrementTransactions(userId);
          appStore.addProfit(totalRub);
          appStore.addTransaction({
            type: "game_topup_order",
            serviceKey: "game_topup",
            userId,
            amount: totalRub,
            gameKey: game.key,
            gameNameAr: game.name_ar,
            gameNameEn: game.name_en,
            playerId,
            packageLabel,
            quantity: quantity || null,
            providerOrderId: String(order.orderId || ""),
            provider: order.provider,
            providerStatus: order.status,
          });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, order_id: String(order.orderId || ""), charged_rub: totalRub, package_label: packageLabel }));
        } catch (error) {
          logBotError("http.webapp.game.order", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "order_failed" }));
        }
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/crypto-webhook") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 2 * 1024 * 1024) {
            req.destroy();
          }
        });

        req.on("end", async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const event = parsed?.payload || parsed;
            const result = await handleCryptoWebhookEvent(event);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, ...result }));
          } catch (error) {
            logBotError("http.crypto_webhook", error, { body });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "invalid webhook payload" }));
          }
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/cryptomus-webhook") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 2 * 1024 * 1024) {
            req.destroy();
          }
        });

        req.on("end", async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const signature = req.headers?.sign || req.headers?.Sign || req.headers?.SIGN || "";
            const payloadWithSignature = { ...parsed, __signature: String(signature || "") };
            const result = await handleCryptomusWebhookEvent(body || "{}", payloadWithSignature);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, ...result }));
          } catch (error) {
            logBotError("http.cryptomus_webhook", error, { body });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "invalid cryptomus webhook payload" }));
          }
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/webhook/sms") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 2 * 1024 * 1024) {
            req.destroy();
          }
        });

        req.on("end", async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            if (!isSmsWebhookAuthorized(req, parsed)) {
              res.writeHead(401, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
              return;
            }

            const result = await processSmsWebhook(bot, appStore, parsed);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, ...result }));
          } catch (error) {
            logBotError("http.sms_webhook", error, { body });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "invalid sms payload" }));
          }
        });
        return;
      }

      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("OK");
    } catch (error) {
      logBotError("http.server", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
    }
  }).listen(renderPort, "0.0.0.0", () => {
    console.log(`[web] health endpoint listening on :${renderPort}`);
  });
}

function buildVerifyUrl(serviceCode, number) {
  const normalizedNumber = String(number || "").replace(/[^\d+]/g, "");
  if (serviceCode === "tg") {
    return `https://t.me/+${normalizedNumber.replace(/^\+/, "")}`;
  }
  return `https://wa.me/${normalizedNumber.replace(/^\+/, "")}`;
}

function formatActivationDateTime(value) {
  const date = new Date(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} | ${hh}:${min}`;
}

function getExpiryDateTime(value, minutes = 20) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return formatActivationDateTime(date);
}

function buildAppDisplayName(lang, serviceCode) {
  const appMap = {
    wa: lang === "ar" ? "ظˆط§طھط³ط§ط¨" : "WhatsApp",
    tg: lang === "ar" ? "طھظٹظ„ظٹط¬ط±ط§ظ…" : "Telegram",
  };
  return appMap[serviceCode] || serviceCode;
}

function buildProviderDisplayName(providerKey) {
  return getSmsProvider(providerKey).name || providerKey;
}

function buildOrderReceipt(lang, { activationId, number, countryLabel, appDisplayName, providerName, finalPriceRub, createdAt, codeLabel }) {
  const lines = [
    `â‍– ${t(lang, "virtualNumbers_receipt_activation")} : ${activationId} ًں›ژ`,
    `â‍– ${t(lang, "virtualNumbers_receipt_country")} : ${countryLabel} â€¢`,
    `â‍– ${t(lang, "virtualNumbers_receipt_number")} : <code>+${number}</code> âکژï¸ڈâ€¢`,
    `â‍– ${t(lang, "virtualNumbers_receipt_code")} : ${codeLabel}`,
    `â‍– ${t(lang, "virtualNumbers_receipt_status")} : ${t(lang, "virtualNumbers_receipt_code_pending")} ًں”ژ â€¢`,
    `â‍– ${t(lang, "virtualNumbers_receipt_app")} : ${appDisplayName}`,
    `â‍– ${t(lang, "virtualNumbers_receipt_provider")} : ${providerName} ًں§­ â€¢`,
    `â‍– ${t(lang, "virtualNumbers_receipt_price")} : â‚½ ${finalPriceRub} ًںڈ· â€¢`,
    "",
    `â‍– ${t(lang, "virtualNumbers_receipt_created")} : ${formatActivationDateTime(createdAt)}   ًں“­â€¢`,
    `â‍– ${t(lang, "virtualNumbers_receipt_expires")} : ${getExpiryDateTime(createdAt)}  ًں“«â€¢`,
  ];
  return lines.join("\n");
}

function buildSmsReceivedText(lang, { number, code, password = t(lang, "virtualNumbers_sms_received_password") }) {
  return [`âœ… ${t(lang, "virtualNumbers_sms_received_number")} : <code>+${number}</code>`,
    `ًں’¬ ${t(lang, "virtualNumbers_sms_received_code")} : <code>${code}</code>`,
    `ًں”گ ${t(lang, "virtualNumbers_sms_received_password")} : <code>${password}</code>`,
    "",
    t(lang, "virtualNumbers_copy_prompt"),
  ].join("\n");
}

// cache is managed by grizzlyCacheService and SMM cache service
fetchAndCachePrices();
fetchAndCacheSmmServices();
setInterval(fetchAndCachePrices, 24 * 60 * 60 * 1000);
setInterval(fetchAndCacheSmmServices, 24 * 60 * 60 * 1000);

bot.onText(/\/start(?:\s+(.+))?/, async (msg) => {
  try {
    appStore.incrementRequestCount();
    await handleStart(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.onText.start", error, { userId: msg.from?.id });
  }
});

bot.onText(/\/menu/, async (msg) => {
  try {
    appStore.incrementRequestCount();
    await handleMenuCommand(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.onText.menu", error, { userId: msg.from?.id });
  }
});

bot.onText(/\/account/, async (msg) => {
  try {
    appStore.incrementRequestCount();
    await handleAccountCommand(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.onText.account", error, { userId: msg.from?.id });
  }
});

bot.onText(/\/addfunds/, async (msg) => {
  try {
    appStore.incrementRequestCount();
    await handleAddFundsCommand(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.onText.addfunds", error, { userId: msg.from?.id });
  }
});

bot.onText(/\/support/, async (msg) => {
  try {
    appStore.incrementRequestCount();
    await handleSupportCommand(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.onText.support", error, { userId: msg.from?.id });
  }
});

bot.onText(/\/settings/, async (msg) => {
  try {
    appStore.incrementRequestCount();
    await handleSettingsCommand(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.onText.settings", error, { userId: msg.from?.id });
  }
});

bot.on("callback_query", async (query) => {
  try {
    appStore.incrementRequestCount();
    if (query.data && query.data.startsWith("setlang_")) {
      await handleLanguageSelection(bot, query, appStore);
      return;
    }

    const virtualNumbersHandled = await handleVirtualNumbersCallback(bot, query, appStore);
    if (virtualNumbersHandled) {
      return;
    }

    const chatId = query.message?.chat?.id;
    const messageId = query.message?.message_id;
    const user = appStore.getOrCreateUser(query.from);
    const lang = getUserLang(user);

    // Part A: display from daily cache for virtual numbers app item
    if (query.data && query.data.startsWith("menu_virtual_numbers_wa")) {
      const parts = query.data.split(":");
      const page = Math.max(0, Number(parts[1] ?? 0));

      const availableCountries = getCachedCountries("wa").filter((country) => Boolean(grizzlyCountries[country.countryId]));
      if (!Array.isArray(availableCountries) || availableCountries.length === 0) {
        await safeTelegramCall("callback_query.virtual_numbers.empty", () =>
          bot.answerCallbackQuery(query.id, { text: t(lang, "virtualNumbers_loading_prices"), show_alert: true })
        );
        return;
      }

      const pageSize = 36;
      const totalPages = Math.max(1, Math.ceil(availableCountries.length / pageSize));
      const currentPage = Math.min(page, totalPages - 1);
      const pageItems = availableCountries.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

      const keyboard = [];
      let currentRow = [];

      pageItems.forEach((country, index) => {
        const finalPriceRub = Number(country.priceRub ?? 0);

        const countryData = grizzlyCountries[country.countryId];
        const countryName = lang === "ar" ? countryData.name_ar : t(lang, `grizzly_country_${country.countryId}`) || countryData.name_ar;
        const buttonText = `â‚½${finalPriceRub} : ${countryData.flag} ${countryName} ًںڑ€`;
        const callbackData = `buy_num_wa_${country.countryId}_${finalPriceRub}`;

        currentRow.push({ text: buttonText, callback_data: callbackData });

        if (currentRow.length === 2 || index === pageItems.length - 1) {
          keyboard.push(currentRow);
          currentRow = [];
        }
      });

      const paginationRow = [];
      if (currentPage > 0) {
        paginationRow.push({ text: t(lang, "common_previous"), callback_data: `menu_virtual_numbers_wa:${currentPage - 1}` });
      }
      if (currentPage < totalPages - 1) {
        paginationRow.push({ text: t(lang, "common_next"), callback_data: `menu_virtual_numbers_wa:${currentPage + 1}` });
      }
      if (paginationRow.length) keyboard.push(paginationRow);

      keyboard.push([{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]);

      await safeTelegramCall("callback_query.virtual_numbers.menu", () =>
        bot.editMessageText(
          `${t(lang, "virtualNumbers_choose_country_title")} (${t(lang, "virtualNumbers_page_counter").replace("{current}", String(currentPage + 1)).replace("{total}", String(totalPages))})`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard: keyboard },
          }
        )
      );

      return;
    }

    // Part B: purchase action
    if (query.data && query.data.startsWith("buy_num_")) {
      const user = appStore.getOrCreateUser(query.from);
      const parts = query.data.split("_");
      const providerKey = parts.length >= 6 ? parts[2] : "server2";
      const serviceCode = parts.length >= 6 ? parts[3] : parts[2];
      const countryId = parts.length >= 6 ? parts[4] : parts[3];
      const priceRaw = parts.length >= 6 ? parts[5] : parts[4];
      const price = Number(priceRaw);

      await safeTelegramCall("callback_query.buy_num.toast", () =>
        bot.answerCallbackQuery(query.id, { text: t(lang, "virtualNumbers_buy_trying"), show_alert: false })
      );

      if (!Number.isFinite(price) || price <= 0) {
        await safeTelegramCall("callback_query.buy_num.invalid", () =>
          bot.sendMessage(chatId, t(lang, "virtualNumbers_invalid_price"))
        );
        return;
      }

      const currentUser = appStore.findUserById(user.userId);
      if (!currentUser || currentUser.balance < price) {
        await safeTelegramCall("callback_query.buy_num.insufficient", () =>
          bot.sendMessage(chatId, t(lang, "virtualNumbers_insufficient_balance"))
        );
        return;
      }

      const result = await requestNumber(serviceCode, countryId, providerKey);
      if (!result || /^(BAD_|ERROR)/i.test(result)) {
        await safeTelegramCall("callback_query.buy_num.failed", () =>
          bot.sendMessage(chatId, t(lang, "virtualNumbers_failed"))
        );
        return;
      }

      if (result === "NO_NUMBERS" || result === "NO_BALANCE") {
        await safeTelegramCall("callback_query.buy_num.known_failure", () =>
          bot.sendMessage(chatId, t(lang, "virtualNumbers_no_numbers_available"))
        );
        return;
      }

      if (!String(result).includes("ACCESS_NUMBER")) {
        await safeTelegramCall("callback_query.buy_num.unknown", () =>
          bot.sendMessage(chatId, t(lang, "virtualNumbers_api_error"))
        );
        return;
      }

      const [, activationId, number] = String(result).split(":");
      appStore.deductBalance(currentUser.userId, price);
      const countryMeta = grizzlyCountries[countryId] || { name_ar: "ط¯ظˆظ„ط© ط£ط®ط±ظ‰", flag: "ًںŒچ" };
      const countryLabel = countryId === "random"
        ? t(lang, "virtualNumbers_country_random")
        : `${lang === "ar" ? countryMeta.name_ar : t(lang, `grizzly_country_${countryId}`) || countryMeta.name_ar} ${countryMeta.flag}`;
      const purchaseTx = appStore.addTransaction({
        type: "virtual_number_purchase",
        userId: currentUser.userId,
        amount: price,
        providerKey,
        serviceCode,
        countryId,
        activationId,
        number,
        countryLabel,
      });

      const serviceName = buildAppDisplayName(lang, serviceCode);
      const verifyUrl = buildVerifyUrl(serviceCode, number);
      const purchaseText = buildOrderReceipt(lang, {
        activationId,
        number,
        countryLabel: purchaseTx.countryLabel || `${countryMeta.name_ar} ${countryMeta.flag}`,
        appDisplayName: serviceName,
        providerName: buildProviderDisplayName(providerKey),
        finalPriceRub: price,
        createdAt: purchaseTx.createdAt,
        codeLabel: t(lang, "virtualNumbers_receipt_code_pending"),
      });

      await safeTelegramCall("callback_query.buy_num.success", () =>
        bot.editMessageText(purchaseText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: t(lang, "virtualNumbers_change_number"), callback_data: `change_num_${providerKey}_${activationId}_${price}_${serviceCode}_${countryId}` }],
              [{ text: t(lang, "virtualNumbers_request_code"), callback_data: `checksms_${providerKey}_${activationId}` }],
              [{ text: t(lang, "virtualNumbers_verify_number"), url: verifyUrl }],
              [{ text: t(lang, "virtualNumbers_cancel_order"), callback_data: `cancelnum_${providerKey}_${activationId}_${price}` }],
            ],
          },
        })
      );

      return;
    }

    if (query.data && query.data.startsWith("change_num_")) {
      const user = appStore.getOrCreateUser(query.from);
      const [, , providerKey, activationId, priceRaw, serviceCode, countryId] = query.data.split("_");
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

      const currentUser = appStore.findUserById(user.userId);
      if (!currentUser || currentUser.balance < price) {
        await safeTelegramCall("callback_query.change_num.insufficient", () =>
          bot.sendMessage(chatId, t(lang, "virtualNumbers_change_number_error_balance"))
        );
        return;
      }

      const result = await requestNumber(serviceCode, countryId, providerKey);
      if (!result || /^(NO_|BAD_|ERROR)/i.test(result) || !String(result).includes("ACCESS_NUMBER")) {
        await safeTelegramCall("callback_query.change_num.failed", () =>
          bot.sendMessage(chatId, t(lang, "virtualNumbers_change_number_failed"))
        );
        return;
      }

      const [, newActivationId, number] = String(result).split(":");
      appStore.deductBalance(currentUser.userId, price);
      const countryMeta = grizzlyCountries[countryId] || { name_ar: "ط¯ظˆظ„ط© ط£ط®ط±ظ‰", flag: "ًںŒچ" };
      const purchaseTx = appStore.addTransaction({
        type: "virtual_number_purchase",
        userId: currentUser.userId,
        amount: price,
        providerKey,
        serviceCode,
        countryId,
        activationId: newActivationId,
        number,
        countryLabel: `${lang === "ar" ? countryMeta.name_ar : t(lang, `grizzly_country_${countryId}`) || countryMeta.name_ar} ${countryMeta.flag}`,
      });

      const verifyUrl = buildVerifyUrl(serviceCode, number);
      const purchaseText = buildOrderReceipt(lang, {
        activationId: newActivationId,
        number,
        countryLabel: purchaseTx.countryLabel,
        appDisplayName: buildAppDisplayName(lang, serviceCode),
        providerName: buildProviderDisplayName(providerKey),
        finalPriceRub: price,
        createdAt: purchaseTx.createdAt,
        codeLabel: t(lang, "virtualNumbers_receipt_code_pending"),
      });

      await safeTelegramCall("callback_query.change_num.success", () =>
        bot.editMessageText(purchaseText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: t(lang, "virtualNumbers_change_number"), callback_data: `change_num_${providerKey}_${newActivationId}_${price}_${serviceCode}_${countryId}` }],
              [{ text: t(lang, "virtualNumbers_request_code"), callback_data: `checksms_${providerKey}_${newActivationId}` }],
              [{ text: t(lang, "virtualNumbers_verify_number"), url: verifyUrl }],
              [{ text: t(lang, "virtualNumbers_cancel_order"), callback_data: `cancelnum_${providerKey}_${newActivationId}_${price}` }],
            ],
          },
        })
      );
      return;
    }

    // Part C: checksms and cancelnum handlers
    if (query.data && query.data.startsWith("checksms_")) {
      const parts = query.data.split("_");
      const providerKey = parts.length >= 3 ? parts[1] : "server2";
      const activationId = parts.length >= 3 ? parts[2] : parts[1];
      const status = await getSmsStatus(activationId, providerKey);

      if (!status || status.startsWith("STATUS_WAIT_CODE")) {
        await safeTelegramCall("callback_query.checksms.wait", () =>
          bot.answerCallbackQuery(query.id, { text: t(lang, "virtualNumbers_waiting_code"), show_alert: true })
        );
        return;
      }

      if (status.startsWith("STATUS_OK")) {
        const code = status.split(":")[1] || "";
        const purchaseTx = appStore.getLatestTransactionByActivationId(activationId);
        const serviceCode = purchaseTx?.serviceCode || "wa";
        const verifyUrl = buildVerifyUrl(serviceCode, purchaseTx?.number || "");
        const newText = buildSmsReceivedText(lang, {
          number: String(purchaseTx?.number || ""),
          code: String(code),
        });

        await safeTelegramCall("callback_query.checksms.ok", () =>
          bot.editMessageText(newText, {
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
        return;
      }

      await safeTelegramCall("callback_query.checksms.unknown", () =>
        bot.answerCallbackQuery(query.id, { text: t(lang, "virtualNumbers_status_unknown"), show_alert: true })
      );
      return;
    }

    if (query.data && query.data.startsWith("cancelnum_")) {
      const user = appStore.getOrCreateUser(query.from);
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

      await safeTelegramCall("callback_query.cancelnum.done", () =>
        bot.editMessageText(t(lang, "virtualNumbers_cancelled_refund").replace("{price}", String(price)), {
          chat_id: chatId,
          message_id: messageId,
        })
      );
      return;
    }

    await handleCallbackQuery(bot, query, appStore, appContext);
  } catch (error) {
    logBotError("bot.on.callback_query", error, { userId: query.from?.id, data: query.data });
    await safeTelegramCall("bot.on.callback_query.alert", () =>
      bot.answerCallbackQuery(query.id, {
        text: "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھظ†ظپظٹط° ط§ظ„ط·ظ„ط¨.",
        show_alert: true,
      })
    );
  }
});

bot.on("pre_checkout_query", async (query) => {
  try {
    appStore.incrementRequestCount();
    await handlePreCheckoutQuery(bot, query);
  } catch (error) {
    logBotError("bot.on.pre_checkout_query", error, { userId: query.from?.id });
  }
});

bot.on("message", async (msg) => {
  try {
    appStore.incrementRequestCount();
    const paymentHandled = await handleSuccessfulPayment(bot, msg, appStore);
    if (paymentHandled) {
      return;
    }

    if (msg.web_app_data?.data) {
      const webAppHandled = await handleGatewayWebAppData(bot, msg, appStore);
      if (webAppHandled) {
        return;
      }
      const vaultWebAppHandled = await handleVaultXWebAppData(bot, msg, appStore);
      if (vaultWebAppHandled) {
        return;
      }
    }

    if (!msg.text) {
      return;
    }

    if (msg.text.startsWith("/start")) {
      return;
    }

    const captchaHandled = await handleCaptchaInput(bot, msg, appStore);
    if (captchaHandled) {
      return;
    }

    const adminHandled = await handleAdminCommand(bot, msg, appStore);
    if (adminHandled) {
      return;
    }

    await handleTextMessage(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.on.message", error, { userId: msg.from?.id });
    await safeTelegramCall("bot.on.message.reply", () =>
      bot.sendMessage(msg.chat.id, "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط·ظ„ط¨.")
    );
  }
});

bot.on("polling_error", (error) => {
  try {
    logBotError("polling_error", error);
    if (isNetworkPermissionError(error)) {
      if (!pollingRestartTimer) {
        pollingRestartTimer = setTimeout(async () => {
          pollingRestartTimer = null;
          try {
            await bot.stopPolling({ cancel: false });
          } catch (_) {}
          try {
            await bot.startPolling();
            pollingRestartDelayMs = 5000;
          } catch (restartError) {
            logBotError("polling_restart", restartError);
            pollingRestartDelayMs = Math.min(pollingRestartDelayMs * 2, 60000);
          }
        }, pollingRestartDelayMs);
      }
    }
  } catch (innerError) {
    console.error("Fatal polling logger failure:", innerError.message);
  }
});

bot.onText(/\/app/, async (msg) => {
  try {
    appStore.incrementRequestCount();
    await handleAppCommand(bot, msg, appStore);
  } catch (error) {
    logBotError("bot.onText.app", error, { userId: msg.from?.id });
  }
});

async function bootstrap() {
  try {
    const botInfo = await bot.getMe();
    appContext.botUsername = botInfo.username;
    await setupBotCommands(bot);
    startBinanceEmailWatcher(bot, appStore);
    const webAppUrl = resolveVaultXWebAppUrl();
    if (webAppUrl) {
      await safeTelegramCall("bootstrap.setChatMenuButton", () =>
        bot.setChatMenuButton({
          menu_button: {
            type: "web_app",
            text: "VaultX Pro",
            web_app: { url: webAppUrl },
          },
        })
      );
      await safeTelegramCall("bootstrap.sendProAppLaunch", () =>
        bot.sendMessage(
          ADMIN_CHANNEL_ID,
          "VaultX Pro menu button configured.",
          {
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [[{ text: "Open VaultX Pro", web_app: { url: webAppUrl } }]],
            },
          }
        )
      );
    } else {
      console.log("[webapp] PUBLIC_BASE_URL/TELEGRAM_WEBAPP_URL is missing, menu button was not configured.");
    }
    console.log(`Telegram bot is running as @${botInfo.username}`);
    if (telegramProxyUrl) {
      console.log("[telegram] proxy is enabled");
    }
    if (telegramBaseApiUrl) {
      console.log(`[telegram] custom base API URL: ${telegramBaseApiUrl}`);
    }
  } catch (error) {
    logBotError("bootstrap", error);
    console.log("Telegram bot is running...");
  }
}

bootstrap();

console.log("ًں¤– VaultX Bot is running and Grizzly cache is loaded...");

