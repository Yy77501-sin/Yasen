const { ImapFlow } = require("imapflow");
const { logBotError } = require("./errorLogger");
const { safeTelegramCall } = require("./telegramSafe");
const { getUserLang } = require("../locales");
const {
  GMAIL_IMAP_USER,
  GMAIL_IMAP_APP_PASSWORD,
  BINANCE_EMAIL_FROM,
  SMS_WEBHOOK_TOKEN,
} = require("../config");
const { localToRub, notifyTopupChannel, getGatewayMethodConfig } = require("./topupService");

function normalizeMethod(method) {
  const v = String(method || "").trim().toLowerCase();
  if (["binance", "jeeb", "vodafone"].includes(v)) return v;
  return "";
}

function normalizeTxId(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

function parseNumber(raw) {
  const text = String(raw || "").replace(/,/g, ".");
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findPendingGatewayTransaction(appStore, method, txId, amountLocal = 0) {
  const normalizedMethod = normalizeMethod(method);
  const normalizedTx = normalizeTxId(txId);
  if (!normalizedMethod || !normalizedTx) return null;

  const candidates = [...(appStore.transactions || [])]
    .reverse()
    .filter((tx) => tx.type === "topup_gateway_pending" && tx.status === "pending")
    .filter((tx) => normalizeMethod(tx.gatewayMethod) === normalizedMethod)
    .filter((tx) => normalizeTxId(tx.gatewayTxId) === normalizedTx);

  if (!candidates.length) return null;
  if (amountLocal <= 0) return candidates[0];

  const withAmount = candidates.find((tx) => {
    const expected = Number(tx.gatewayAmountLocal || 0);
    return Math.abs(expected - amountLocal) <= 0.01;
  });
  return withAmount || candidates[0];
}

async function finalizeGatewayTopup(bot, appStore, pendingTx, source = "auto") {
  if (!pendingTx || pendingTx.status !== "pending") return null;

  const userId = Number(pendingTx.userId || 0);
  const method = normalizeMethod(pendingTx.gatewayMethod);
  const amountLocal = Number(pendingTx.gatewayAmountLocal || 0);
  const amountRub = Number(pendingTx.amount || localToRub(method, amountLocal) || 0);

  if (!Number.isFinite(userId) || userId <= 0 || !method || !Number.isFinite(amountRub) || amountRub <= 0) {
    return null;
  }

  appStore.addBalance(userId, amountRub);
  appStore.addDeposit(userId, amountRub);
  const updatedUser = appStore.incrementTransactions(userId);

  appStore.updateTransactionById(pendingTx.id, {
    status: "paid",
    paidAt: new Date().toISOString(),
    verifySource: source,
  });

  appStore.addTransaction({
    type: "topup_gateway_paid",
    userId,
    amount: amountRub,
    amountLocal,
    gatewayMethod: method,
    gatewayTxId: pendingTx.gatewayTxId,
    serviceKey: "balance_topup",
    method: `${method.toUpperCase()} Gateway`,
    status: "completed",
    verifySource: source,
  });

  const lang = getUserLang(updatedUser || appStore.findUserById(userId) || { language: "ar" });
  await safeTelegramCall("finalizeGatewayTopup.notifyUser", () =>
    bot.sendMessage(
      userId,
      lang === "ar"
        ? `✅ تم تأكيد الدفع وإضافة ${amountRub} RUB إلى رصيدك.`
        : `✅ Payment confirmed. ${amountRub} RUB has been added to your balance.`
    )
  );

  await notifyTopupChannel(bot, userId, amountRub, lang, `${method.toUpperCase()} Gateway`);
  return { userId, amountRub, method };
}

function extractTxId(text) {
  const raw = String(text || "");
  const patterns = [
    /(?:tx|trx|transaction|trans(?:action)?\s*id|pay\s*id|ref(?:erence)?|رقم\s*العملية|مرجع)\s*[:#-]?\s*([a-z0-9-]{4,})/i,
    /\b([a-z]{2,}[0-9]{4,}|[0-9]{6,}|[a-z0-9-]{8,})\b/i,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1]) return m[1];
  }
  return "";
}

function extractAmount(text) {
  const raw = String(text || "");
  const matches = [...raw.matchAll(/(\d+(?:[\.,]\d{1,2})?)/g)].map((m) => parseNumber(m[1]));
  if (!matches.length) return 0;
  const positives = matches.filter((n) => n > 0);
  return positives.length ? Math.max(...positives) : 0;
}

function detectMethodFromSms(payload) {
  const explicit = normalizeMethod(payload?.method);
  if (explicit) return explicit;

  const hay = `${payload?.sender || ""} ${payload?.text || ""}`.toLowerCase();
  if (hay.includes("vodafone")) return "vodafone";
  if (hay.includes("جيب") || hay.includes("jeeb")) return "jeeb";
  return "";
}

function isSmsWebhookAuthorized(req, payload = {}) {
  if (!SMS_WEBHOOK_TOKEN) {
    return true;
  }

  const headerToken = String(
    req?.headers?.["x-webhook-token"] || req?.headers?.["x-sms-token"] || ""
  ).trim();
  const queryToken = String(req?.query?.token || "").trim();
  const bodyToken = String(payload?.token || "").trim();
  const validToken = String(SMS_WEBHOOK_TOKEN || "").trim();

  return [headerToken, queryToken, bodyToken].some((token) => token && token === validToken);
}

async function processSmsWebhook(bot, appStore, payload) {
  const method = detectMethodFromSms(payload);
  if (!method || method === "binance") {
    return { ok: true, ignored: true };
  }

  const text = String(payload?.text || payload?.sms || "");
  const txId = extractTxId(text);
  const amount = extractAmount(text);
  const pendingTx = findPendingGatewayTransaction(appStore, method, txId, amount);
  if (!pendingTx) {
    return { ok: true, matched: false };
  }

  const done = await finalizeGatewayTopup(bot, appStore, pendingTx, "sms");
  return { ok: true, matched: Boolean(done), ...done };
}

async function handleGatewayWebAppData(bot, msg, appStore) {
  try {
    const raw = String(msg?.web_app_data?.data || "").trim();
    if (!raw) return false;

    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      return false;
    }

    if (String(payload?.type || "") !== "gateway_topup") {
      return false;
    }

    const method = normalizeMethod(payload.method);
    const txId = String(payload.tx_id || "").trim();
    const amountLocal = parseNumber(payload.amount_local);

    if (!method || !txId || !Number.isFinite(amountLocal) || amountLocal <= 0) {
      await safeTelegramCall("handleGatewayWebAppData.invalid", () =>
        bot.sendMessage(msg.chat.id, "❌ بيانات الدفع غير مكتملة.")
      );
      return true;
    }

    const amountRub = localToRub(method, amountLocal);
    if (!Number.isFinite(amountRub) || amountRub <= 0) {
      await safeTelegramCall("handleGatewayWebAppData.invalidRate", () =>
        bot.sendMessage(msg.chat.id, "❌ تعذر احتساب قيمة الرصيد.")
      );
      return true;
    }

    const duplicate = findPendingGatewayTransaction(appStore, method, txId, amountLocal);
    if (duplicate) {
      await safeTelegramCall("handleGatewayWebAppData.duplicate", () =>
        bot.sendMessage(msg.chat.id, "✅ تم استلام هذه العملية مسبقاً وهي قيد التحقق.")
      );
      return true;
    }

    appStore.addTransaction({
      type: "topup_gateway_pending",
      userId: msg.from.id,
      amount: amountRub,
      gatewayMethod: method,
      gatewayTxId: txId,
      gatewayAmountLocal: amountLocal,
      serviceKey: "balance_topup",
      status: "pending",
      source: "webapp",
    });

    await safeTelegramCall("handleGatewayWebAppData.ack", () =>
      bot.sendMessage(
        msg.chat.id,
        method === "binance"
          ? "✅ تم استلام طلبك. جاري التحقق من عملية Binance تلقائياً عبر البريد."
          : "✅ تم استلام طلبك. جاري التحقق التلقائي من رسالة التحويل."
      )
    );

    return true;
  } catch (error) {
    logBotError("handleGatewayWebAppData", error, { userId: msg.from?.id });
    return false;
  }
}

function parseBinanceEmailText(text) {
  const txId = extractTxId(text);
  const amount = extractAmount(text);
  return {
    txId,
    amountUsd: amount,
  };
}

function renderGatewayWebAppPage(req, res) {
  const lang = String(req?.query?.lang || "ar").toLowerCase() === "en" ? "en" : "ar";
  const method = normalizeMethod(req?.query?.method);
  const userId = Number(req?.query?.user_id || 0);
  const cfg = getGatewayMethodConfig(method);

  if (!cfg) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Unknown payment method");
    return;
  }

  const title = lang === "ar" ? (cfg.title_ar || cfg.title_en || method) : (cfg.title_en || cfg.title_ar || method);
  const accountId = String(cfg.account_id || "");
  const currency = String(cfg.local_currency || "").toUpperCase();
  const rubPerUnit = Number(cfg.rub_per_unit || 0);
  const localPerRub = Number(cfg.local_per_rub || 0);

  const toRubScript = method === "binance"
    ? `return amount * ${Number.isFinite(rubPerUnit) && rubPerUnit > 0 ? rubPerUnit : 30};`
    : `return amount / ${Number.isFinite(localPerRub) && localPerRub > 0 ? localPerRub : 1};`;

  const i18n = {
    ar: {
      heading: "تأكيد الدفع",
      amount: `المبلغ (${currency})`,
      txid: "رقم العملية",
      copy: "نسخ",
      copied: "تم النسخ",
      account: "رقم الحساب",
      converted: "الرصيد المتوقع (RUB)",
      hint: "اكتب المبلغ ورقم العملية بدقة ثم اضغط تأكيد.",
      submit: "تأكيد الدفع",
      processing: "جارٍ المعالجة...",
      invalid: "تحقق من المبلغ ورقم العملية.",
    },
    en: {
      heading: "Payment Confirmation",
      amount: `Amount (${currency})`,
      txid: "Transaction ID",
      copy: "Copy",
      copied: "Copied",
      account: "Account",
      converted: "Expected Credit (RUB)",
      hint: "Enter amount and transaction ID accurately, then confirm.",
      submit: "Confirm Payment",
      processing: "Processing...",
      invalid: "Please check amount and transaction ID.",
    },
  }[lang];

  const html = `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <title>${escapeHtml(title)} - VaultX</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root { --bg:#05070d; --card:rgba(17,28,45,.62); --line:rgba(140,170,220,.26); --text:#e9f1ff; --muted:#a7b4cf; --primary:#5da8ff; --ok:#6ee7b7; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; font-family:"Cairo",system-ui,sans-serif; color:var(--text); background:radial-gradient(circle at 15% 0%, #172845 0%, transparent 36%),radial-gradient(circle at 85% 100%, #1b3456 0%, transparent 42%),var(--bg); display:grid; place-items:center; padding:12px; }
    .wrap { width:min(420px,100%); }
    .card { border:1px solid var(--line); background:var(--card); backdrop-filter:blur(10px); border-radius:18px; padding:16px; box-shadow:0 14px 40px rgba(0,0,0,.35); }
    h1 { margin:0 0 10px; font-size:20px; }
    .muted { color:var(--muted); font-size:13px; margin-bottom:12px; }
    .row { display:flex; gap:8px; align-items:center; }
    .row + .row { margin-top:10px; }
    label { font-size:13px; color:var(--muted); display:block; margin:10px 0 6px; }
    input { width:100%; background:rgba(7,14,25,.7); border:1px solid rgba(140,170,220,.34); border-radius:12px; color:var(--text); padding:12px; outline:none; font:inherit; }
    input:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(93,168,255,.2); }
    .account { font-weight:700; letter-spacing:.3px; overflow-wrap:anywhere; flex:1; }
    button { border:0; border-radius:12px; padding:11px 14px; font:inherit; font-weight:700; color:#031126; background:linear-gradient(180deg,#7ec0ff,#4b95f0); cursor:pointer; }
    .copy { background:rgba(93,168,255,.18); color:var(--text); border:1px solid rgba(140,170,220,.34); min-width:90px; }
    .ghost { margin-top:12px; width:100%; display:inline-flex; justify-content:center; align-items:center; gap:8px; }
    .spin { width:16px; height:16px; border:2px solid rgba(3,17,38,.25); border-top-color:#031126; border-radius:50%; animation:spin .8s linear infinite; display:none; }
    .ghost.loading .spin { display:inline-block; }
    .meta { margin-top:10px; color:var(--ok); font-weight:700; font-size:14px; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${escapeHtml(title)} · ${escapeHtml(i18n.heading)}</h1>
      <div class="muted">${escapeHtml(i18n.hint)}</div>

      <label>${escapeHtml(i18n.account)}</label>
      <div class="row">
        <div class="account" id="accountId">${escapeHtml(accountId)}</div>
        <button class="copy" id="copyBtn" type="button">${escapeHtml(i18n.copy)}</button>
      </div>

      <label for="amount">${escapeHtml(i18n.amount)}</label>
      <input id="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" />

      <label for="txid">${escapeHtml(i18n.txid)}</label>
      <input id="txid" autocomplete="off" placeholder="TX123456..." />

      <div class="meta" id="rubValue">${escapeHtml(i18n.converted)}: 0.00 RUB</div>

      <button class="ghost" id="confirmBtn" type="button">
        <span class="spin" id="spinner"></span>
        <span id="confirmLabel">${escapeHtml(i18n.submit)}</span>
      </button>
    </div>
  </div>

  <script>
    const method = ${JSON.stringify(method)};
    const lang = ${JSON.stringify(lang)};
    const userId = ${JSON.stringify(userId)};
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tg) { tg.expand(); tg.ready(); }

    const amountInput = document.getElementById("amount");
    const txInput = document.getElementById("txid");
    const rubValue = document.getElementById("rubValue");
    const copyBtn = document.getElementById("copyBtn");
    const confirmBtn = document.getElementById("confirmBtn");
    const confirmLabel = document.getElementById("confirmLabel");

    const labels = {
      copied: ${JSON.stringify(i18n.copied)},
      processing: ${JSON.stringify(i18n.processing)},
      invalid: ${JSON.stringify(i18n.invalid)},
      converted: ${JSON.stringify(i18n.converted)},
    };

    function toRub(amount) { ${toRubScript} }
    function parseAmount(v) {
      const n = Number(String(v || "").replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) return 0;
      return n;
    }
    function refreshRub() {
      const amount = parseAmount(amountInput.value);
      const rub = amount > 0 ? toRub(amount) : 0;
      rubValue.textContent = labels.converted + ": " + rub.toFixed(2) + " RUB";
    }

    amountInput.addEventListener("input", refreshRub);
    refreshRub();

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(document.getElementById("accountId").innerText.trim());
        const original = copyBtn.textContent;
        copyBtn.textContent = labels.copied + " ✓";
        setTimeout(() => { copyBtn.textContent = original; }, 1200);
      } catch (_) {}
    });

    confirmBtn.addEventListener("click", () => {
      const amount = parseAmount(amountInput.value);
      const txid = String(txInput.value || "").trim();
      if (!amount || !txid) {
        if (tg && tg.showAlert) tg.showAlert(labels.invalid);
        return;
      }
      confirmBtn.classList.add("loading");
      confirmLabel.textContent = labels.processing;
      const payload = {
        type: "gateway_topup",
        method,
        amount_local: Number(amount.toFixed(2)),
        amount_rub: Number(toRub(amount).toFixed(2)),
        tx_id: txid,
        local_currency: ${JSON.stringify(currency)},
        user_id: userId || null,
      };
      if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(payload));
        setTimeout(() => tg.close && tg.close(), 400);
      }
    });
  </script>
</body>
</html>`;

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function pollBinanceEmailsAndMatch(bot, appStore) {
  if (!GMAIL_IMAP_USER || !GMAIL_IMAP_APP_PASSWORD) return;

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: GMAIL_IMAP_USER,
      pass: GMAIL_IMAP_APP_PASSWORD,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxOpen("INBOX");

    const unseen = await client.search({ seen: false });
    for (const seq of unseen) {
      const msg = await client.fetchOne(seq, { envelope: true, source: true });
      const fromAddress = String(msg?.envelope?.from?.[0]?.address || "").toLowerCase();
      if (!fromAddress.includes(BINANCE_EMAIL_FROM)) {
        await client.messageFlagsAdd(seq, ["\\Seen"]);
        continue;
      }

      const source = String(msg?.source || "");
      const { txId, amountUsd } = parseBinanceEmailText(source);
      const pendingTx = findPendingGatewayTransaction(appStore, "binance", txId, amountUsd);
      if (pendingTx) {
        await finalizeGatewayTopup(bot, appStore, pendingTx, "email");
      }

      await client.messageFlagsAdd(seq, ["\\Seen"]);
    }
  } catch (error) {
    logBotError("pollBinanceEmailsAndMatch", error);
  } finally {
    try { await client.logout(); } catch (_) {}
  }
}

function startBinanceEmailWatcher(bot, appStore) {
  if (!GMAIL_IMAP_USER || !GMAIL_IMAP_APP_PASSWORD) {
    return;
  }

  setInterval(() => {
    pollBinanceEmailsAndMatch(bot, appStore).catch((error) => {
      logBotError("startBinanceEmailWatcher.interval", error);
    });
  }, 60 * 1000);
}

module.exports = {
  handleGatewayWebAppData,
  processSmsWebhook,
  isSmsWebhookAuthorized,
  renderGatewayWebAppPage,
  startBinanceEmailWatcher,
};
