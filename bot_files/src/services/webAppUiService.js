const fs = require("fs");
const path = require("path");
const { getGatewayMethodConfig } = require("./topupService");

const TEMPLATE_PATH = path.resolve(__dirname, "..", "webapp", "vaultx-app.html");

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function getLevelFromTransactions(count) {
  const n = Number(count || 0);
  if (n >= 100) return "Legend";
  if (n >= 50) return "Elite";
  if (n >= 20) return "Pro";
  if (n >= 8) return "Active";
  return "Newbie";
}

function buildWebAppUserSnapshot(user) {
  const normalized = user || {};
  const txCount = Number(normalized.transactionsCount || 0);
  const balanceRub = Number(normalized.balance || 0);
  const usdBalance = Number(normalized.usdBalance || 0);
  return {
    id: Number(normalized.userId || 0),
    firstName: normalized.firstName || "User",
    username: normalized.username || "",
    balanceRub,
    balanceUsd: Number.isFinite(usdBalance) && usdBalance > 0 ? usdBalance : Number((balanceRub / 30).toFixed(2)),
    level: getLevelFromTransactions(txCount),
    xp: Math.min(100, txCount * 5),
  };
}

function getWebAppProfile(appStore, userId) {
  const user = appStore.findUserById(Number(userId));
  if (!user) {
    return buildWebAppUserSnapshot({
      userId: Number(userId) || 0,
      firstName: "Guest",
      username: "",
      balance: 0,
      transactionsCount: 0,
    });
  }
  return buildWebAppUserSnapshot(user);
}

function getWebAppTransactions(appStore, userId, limit = 10) {
  const list = appStore.getRecentTransactionsForUser(Number(userId), Number(limit || 10));
  return list.map((tx) => ({
    id: String(tx.id || ""),
    type: String(tx.type || tx.serviceKey || "transaction"),
    serviceKey: String(tx.serviceKey || ""),
    amount: Number(tx.amount || 0),
    status: String(tx.status || "completed"),
    createdAt: String(tx.createdAt || ""),
  }));
}

function renderVaultXWebAppPage(req, res, appStore) {
  const lang = String(req?.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
  const initialScreen = String(req?.query?.screen || "dashboard").toLowerCase();
  const initialMethod = String(req?.query?.method || "").toLowerCase();
  const userId = Number(req?.query?.user_id || 0);
  const user = appStore.findUserById(userId) || null;

  const paymentMethods = ["binance", "jeeb", "vodafone"]
    .map((key) => {
      const cfg = getGatewayMethodConfig(key) || {};
      return {
        key,
        title_ar: cfg.title_ar || key,
        title_en: cfg.title_en || key,
        account_id: cfg.account_id || "",
        local_currency: cfg.local_currency || (key === "binance" ? "USD" : key === "jeeb" ? "YER" : "EGP"),
        rub_per_unit: Number(cfg.rub_per_unit || 0),
        local_per_rub: Number(cfg.local_per_rub || 0),
      };
    });

  const bootstrap = {
    lang,
    initialScreen,
    initialMethod,
    user: buildWebAppUserSnapshot(user || {
      userId,
      firstName: "Guest",
      username: "",
      balance: 0,
      transactionsCount: 0,
    }),
    methods: paymentMethods,
  };

  let template = "";
  try {
    template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  } catch (_) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("WebApp template not found");
    return;
  }

  const html = template
    .replace(/__LANG__/g, lang)
    .replace(/__DIR__/g, lang === "ar" ? "rtl" : "ltr")
    .replace("__BOOTSTRAP_JSON__", safeJson(bootstrap));

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(html);
}

module.exports = {
  renderVaultXWebAppPage,
  getWebAppProfile,
  getWebAppTransactions,
};
