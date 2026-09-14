const axios = require("axios");
const { getSmsProvider } = require("../constants/smsProviders");
const { getAxiosNetworkOptions } = require("../utils/network");
const { logBotError } = require("./errorLogger");

const smmProxyUrl = String(process.env.SMM_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "").trim();
const smmNetworkOptions = getAxiosNetworkOptions(smmProxyUrl);

/**
 * Check SMS Provider (Grizzly / HeroSMS / Server 1 / Server 2) Connection and Balance
 */
async function checkSmsProviderBalance(providerKey, appStore) {
  let provider = null;
  if (appStore && typeof appStore.getSmsProvider === "function") {
    provider = appStore.getSmsProvider(providerKey);
  }
  if (!provider) {
    provider = getSmsProvider(providerKey);
  }

  const name = provider?.name || (providerKey === "server1" ? "HeroSMS" : "Grizzly");
  const baseUrl = provider?.baseUrl || "";
  const apiKey = provider?.apiKey || "";

  if (!baseUrl || !apiKey) {
    return {
      success: false,
      key: providerKey,
      name,
      balance: "0.00",
      currency: "RUB",
      formatted: "غير مضبوط (مفتاح أو رابط مفقود)",
      statusText: "⚠️ غير مهيأ",
      raw: null,
      error: "missing_credentials",
    };
  }

  // Check if provider is 5SIM or 5sim.net
  const is5sim = baseUrl.toLowerCase().includes("5sim") || String(name).toLowerCase().includes("5sim") || providerKey === "server4";
  if (is5sim) {
    try {
      const profileUrl = baseUrl.includes("/v1/")
        ? (baseUrl.endsWith("/profile") ? baseUrl : `${baseUrl.replace(/\/+$/, "")}/user/profile`)
        : "https://5sim.net/v1/user/profile";

      const fiveSimRes = await axios.get(profileUrl, {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        timeout: 12000,
      });

      if (fiveSimRes?.data && (fiveSimRes.data.balance !== undefined || fiveSimRes.data.email !== undefined)) {
        const balanceVal = String(fiveSimRes.data.balance ?? "0");
        const email = fiveSimRes.data.email ? ` (${fiveSimRes.data.email})` : "";
        return {
          success: true,
          key: providerKey,
          name: name || "5SIM",
          balance: balanceVal,
          currency: "RUB",
          formatted: `${balanceVal} ₽${email}`,
          statusText: "متصل بنجاح ✅",
          raw: fiveSimRes.data,
        };
      }
    } catch (fiveErr) {
      if (fiveErr?.response?.status === 401 || fiveErr?.response?.status === 403) {
        return {
          success: false,
          key: providerKey,
          name,
          balance: "0.00",
          currency: "RUB",
          formatted: "مفتاح API غير صالح (401 Unauthorized) ❌",
          statusText: "مفتاح خاطئ ❌",
          raw: null,
          error: "unauthorized",
        };
      }
      // If 5sim direct failed, proceed to try standard handler_api
    }
  }

  // Normalize baseUrl for standard SMS-Activate/Grizzly protocol
  let requestUrl = baseUrl.trim();
  if (!requestUrl.includes("/stubs/handler_api.php") && !requestUrl.includes("/api/") && !requestUrl.includes(".php")) {
    requestUrl = requestUrl.replace(/\/+$/, "") + "/stubs/handler_api.php";
  }

  try {
    const response = await axios.get(requestUrl, {
      params: {
        api_key: apiKey.trim(),
        action: "getBalance",
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      timeout: 15000,
    });

    const data = String(response?.data || "").trim();

    // Standard SMS Provider protocol: ACCESS_BALANCE:123.45
    if (data.startsWith("ACCESS_BALANCE:")) {
      const balanceVal = data.split(":")[1]?.trim() || "0";
      return {
        success: true,
        key: providerKey,
        name,
        balance: balanceVal,
        currency: "RUB",
        formatted: `${balanceVal} ₽`,
        statusText: "متصل بنجاح ✅",
        raw: data,
      };
    }

    if (data === "BAD_KEY") {
      return {
        success: false,
        key: providerKey,
        name,
        balance: "0.00",
        currency: "RUB",
        formatted: "مفتاح API غير صالح ❌",
        statusText: "مفتاح خاطئ ❌",
        raw: data,
        error: "bad_key",
      };
    }

    // Try parsing as JSON if provider returned JSON
    try {
      const json = typeof response.data === "object" ? response.data : JSON.parse(data);
      if (json && (json.balance !== undefined || json.rub !== undefined || json.value !== undefined)) {
        const balanceVal = String(json.balance || json.rub || json.value || "0");
        return {
          success: true,
          key: providerKey,
          name,
          balance: balanceVal,
          currency: json.currency || "RUB",
          formatted: `${balanceVal} ${json.currency || "₽"}`,
          statusText: "متصل بنجاح ✅",
          raw: json,
        };
      }
    } catch (_) {}

    return {
      success: false,
      key: providerKey,
      name,
      balance: "0.00",
      currency: "RUB",
      formatted: `استجابة غير متوقعة (${data.slice(0, 30)})`,
      statusText: "خطأ بالاستجابة ⚠️",
      raw: data,
      error: "unexpected_response",
    };
  } catch (err) {
    logBotError("checkSmsProviderBalance", err, { providerKey, baseUrl: requestUrl });
    return {
      success: false,
      key: providerKey,
      name,
      balance: "0.00",
      currency: "RUB",
      formatted: "فشل الاتصال بالموقع (مهلة أو شبكة)",
      statusText: "تعذر الاتصال ❌",
      raw: null,
      error: err.message,
    };
  }
}

/**
 * Check SMM Provider (v2 standard panel API) Connection and Balance
 */
async function checkSmmProviderBalance(provider) {
  const name = provider?.name || "SMM Provider";
  const url = String(provider?.url || "").trim();
  const key = String(provider?.key || "").trim();

  if (!url || !key) {
    return {
      success: false,
      id: provider?.id,
      name,
      balance: "0.00",
      currency: "USD",
      formatted: "غير مضبوط (مفتاح أو رابط مفقود)",
      statusText: "⚠️ غير مهيأ",
      raw: null,
      error: "missing_credentials",
    };
  }

  // SMM panels standard v2: POST { key, action: 'balance' }
  try {
    const postBody = new URLSearchParams();
    postBody.append("key", key);
    postBody.append("action", "balance");

    const response = await axios.post(url, postBody.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 12000,
      ...smmNetworkOptions,
    });

    const data = response?.data;

    if (data && (data.balance !== undefined || data.funds !== undefined)) {
      const balanceVal = String(data.balance !== undefined ? data.balance : data.funds);
      const currency = String(data.currency || "USD");
      return {
        success: true,
        id: provider?.id,
        name,
        balance: balanceVal,
        currency,
        formatted: `${balanceVal} ${currency}`,
        statusText: "متصل بنجاح ✅",
        raw: data,
      };
    }

    if (data && data.error) {
      return {
        success: false,
        id: provider?.id,
        name,
        balance: "0.00",
        currency: "USD",
        formatted: `خطأ من الموقع: ${data.error}`,
        statusText: "خطأ بالمفتاح ❌",
        raw: data,
        error: data.error,
      };
    }
  } catch (postErr) {
    // Try GET fallback
    try {
      const getResponse = await axios.get(url, {
        params: { key, action: "balance" },
        timeout: 12000,
        ...smmNetworkOptions,
      });
      const data = getResponse?.data;
      if (data && (data.balance !== undefined || data.funds !== undefined)) {
        const balanceVal = String(data.balance !== undefined ? data.balance : data.funds);
        const currency = String(data.currency || "USD");
        return {
          success: true,
          id: provider?.id,
          name,
          balance: balanceVal,
          currency,
          formatted: `${balanceVal} ${currency}`,
          statusText: "متصل بنجاح ✅",
          raw: data,
        };
      }
      if (data && data.error) {
        return {
          success: false,
          id: provider?.id,
          name,
          balance: "0.00",
          currency: "USD",
          formatted: `خطأ من الموقع: ${data.error}`,
          statusText: "خطأ بالمفتاح ❌",
          raw: data,
          error: data.error,
        };
      }
    } catch (getErr) {
      logBotError("checkSmmProviderBalance", getErr, { name, url });
    }
  }

  return {
    success: false,
    id: provider?.id,
    name,
    balance: "0.00",
    currency: "USD",
    formatted: "تعذر الاتصال بالموقع (مهلة أو عنوان غير صحيح)",
    statusText: "فشل الاتصال ❌",
    raw: null,
    error: "network_or_parse_failure",
  };
}

/**
 * Check All Configured Providers (SMS & SMM) Concurrently
 */
async function checkAllProviders(appStore) {
  let smsKeys = ["server1", "server2"];
  if (appStore && typeof appStore.getSmsProviders === "function") {
    smsKeys = Object.keys(appStore.getSmsProviders());
    if (!smsKeys.includes("server1")) smsKeys.unshift("server1");
    if (!smsKeys.includes("server2")) smsKeys.splice(1, 0, "server2");
  }
  const smsChecks = smsKeys.map((key) => checkSmsProviderBalance(key, appStore));

  let smmProviders = [];
  if (appStore && typeof appStore.getSmmProviders === "function") {
    smmProviders = appStore.getSmmProviders();
  }

  // Also include default SMM if defined in environment and not already in store
  const envSmmUrl = process.env.SMM_API_URL;
  const envSmmKey = process.env.SMM_API_KEY;
  if (envSmmUrl && envSmmKey && !smmProviders.some((p) => p.url === envSmmUrl)) {
    smmProviders = [
      ...smmProviders,
      { id: "smm_env_default", name: "SMM Provider (الرئيسي)", url: envSmmUrl, key: envSmmKey, enabled: true },
    ];
  }

  const smmChecks = smmProviders.map((p) => checkSmmProviderBalance(p));

  const [smsResults, smmResults] = await Promise.all([
    Promise.all(smsChecks),
    Promise.all(smmChecks),
  ]);

  return {
    sms: smsResults,
    smm: smmResults,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format Full Provider Check & Balance Report for Admin
 */
async function buildProviderCheckReport(lang = "ar", appStore) {
  const results = await checkAllProviders(appStore);

  const lines = [
    "📡 <b>تقرير فحص مزودي الخدمات والأرصدة</b> 📡",
    "────────────────────",
    "",
    "📱 <b>مزودو الأرقام الافتراضية (SMS):</b>",
  ];

  results.sms.forEach((item, idx) => {
    const isLast = idx === results.sms.length - 1;
    const branch = isLast ? "└" : "├";
    lines.push(`${branch} ${item.success ? "🟢" : "🔴"} <b>${item.name}:</b>`);
    lines.push(`   • الحالة: ${item.statusText}`);
    lines.push(`   • الرصيد بالموقع: <b>${item.formatted}</b>`);
  });

  lines.push("");
  lines.push("🚀 <b>مواقع وسيرفرات الرشق (SMM):</b>");

  if (!results.smm.length) {
    lines.push("   ⚠️ لا توجد مواقع رشق مضافة حالياً.");
    lines.push("   (يمكنك إضافة موقع جديد عبر زر: إضافة مزود رشق)");
  } else {
    results.smm.forEach((item, idx) => {
      const isLast = idx === results.smm.length - 1;
      const branch = isLast ? "└" : "├";
      lines.push(`${branch} ${item.success ? "🟢" : "🔴"} <b>${item.name}:</b>`);
      lines.push(`   • الحالة: ${item.statusText}`);
      lines.push(`   • الرصيد بالموقع: <b>${item.formatted}</b>`);
    });
  }

  lines.push("");
  lines.push("────────────────────");
  lines.push("💡 <i>تم فحص الاتصال وقراءة الأرصدة الحقيقية مباشرة من API كل موقع.</i>");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔄 إعادة الفحص وتحديث الأرصدة", callback_data: "admin:check_providers" },
      ],
      [
        { text: "📱 مزودو الأرقام (SMS)", callback_data: "admin:providers" },
        { text: "🚀 مزودو الرشق (SMM)", callback_data: "admin:smm_providers" },
      ],
      [
        { text: "🔙 رجوع للوحة التحكم", callback_data: "admin:panel" },
      ],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

/**
 * Build Single SMS Provider Details & Control Menu
 */
function buildSingleSmsProviderMenu(lang = "ar", provider) {
  const isDefault = provider.key === "server1" || provider.key === "server2";
  const maskedKey = provider.apiKey ? "••••" + provider.apiKey.slice(-6) : "غير مدخل ⚠️";

  const lines = [
    `⚙️ <b>إعدادات مزود الأرقام: ${provider.name || provider.key}</b>`,
    "────────────────────",
    `• <b>المعرف:</b> <code>${provider.key}</code>`,
    `• <b>الحالة:</b> ${provider.enabled !== false ? "✅ مفعّل" : "❌ معطّل"}`,
    `• <b>الرابط (Base URL):</b>\n<code>${provider.baseUrl || "غير مضبوط"}</code>`,
    `• <b>مفتاح API:</b> <code>${maskedKey}</code>`,
    "────────────────────",
    "اضغط على الإجراء المطلوب:",
  ];

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔍 فحص رصيد هذا السيرفر الآن", callback_data: `admin:test_sms:${provider.key}` },
      ],
      [
        { text: `${provider.enabled !== false ? "🔴 تعطيل السيرفر" : "🟢 تفعيل السيرفر"}`, callback_data: `admin:toggle_sms:${provider.key}` },
      ],
      [
        { text: "🔑 تعديل مفتاح API", callback_data: `admin:edit_sms_key:${provider.key}` },
        { text: "🌐 تعديل رابط API", callback_data: `admin:edit_sms_url:${provider.key}` },
      ],
      [
        { text: "✏️ تعديل اسم السيرفر", callback_data: `admin:edit_sms_name:${provider.key}` },
        ...(isDefault ? [] : [{ text: "🗑️ حذف المزود", callback_data: `admin:delete_sms:${provider.key}` }]),
      ],
      [
        { text: "🔙 رجوع لقائمة مزودي الأرقام", callback_data: "admin:providers" },
      ],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

/**
 * Build SMS Providers Management Menu
 */
function buildSmsProvidersMenu(lang = "ar", appStore) {
  let providersObj = {};
  if (appStore && typeof appStore.getSmsProviders === "function") {
    providersObj = appStore.getSmsProviders();
  }

  // Ensure server1 and server2 exist
  if (!providersObj.server1) {
    providersObj.server1 = getSmsProvider("server1");
  }
  if (!providersObj.server2) {
    providersObj.server2 = getSmsProvider("server2");
  }

  const providers = Object.values(providersObj);

  const lines = [
    "⚙️ <b>إدارة مزودي وسيرفرات الأرقام الافتراضية (SMS)</b>",
    "────────────────────",
    "يمكنك إضافة وإدارة مفاتيح مواقع الأرقام (HeroSMS، Grizzly، وغيرها).",
    "",
    `📊 <b>عدد السيرفرات المتاحة:</b> ${providers.length}`,
    "",
  ];

  providers.forEach((p, idx) => {
    const isConfigured = Boolean(p.apiKey && p.apiKey.trim());
    const statusIcon = p.enabled !== false ? (isConfigured ? "🟢" : "🟡") : "🔴";
    const masked = isConfigured ? "••••" + p.apiKey.slice(-6) : "مفتاح مفقود ⚠️";
    lines.push(`${idx + 1}️⃣ ${statusIcon} <b>${p.name || p.key}:</b>`);
    lines.push(`   • الحالة: ${p.enabled !== false ? "✅ مفعّل" : "❌ معطّل"}`);
    lines.push(`   • المفتاح: <code>${masked}</code>`);
    lines.push(`   • الرابط: <code>${p.baseUrl ? p.baseUrl.slice(0, 32) + "..." : "غير مضبوط"}</code>`);
    lines.push("");
  });

  lines.push("────────────────────");
  lines.push("💡 <i>اضغط لتعديل أي سيرفر، فحص رصيده، أو إضافة مزود جديد:</i>");

  const rows = [];

  // Control buttons for all servers (HeroSMS, Grizzly, 5SIM, etc.)
  providers.forEach((p) => {
    rows.push([
      { text: `⚙️ إعدادات: ${p.name || p.key}`, callback_data: `admin:sms_manage:${p.key}` },
      { text: "🔍 فحص الرصيد", callback_data: `admin:test_sms:${p.key}` },
    ]);
  });

  // Action buttons
  rows.push([
    { text: "➕ إضافة مزود أرقام جديد (سيرفر إضافي)", callback_data: "admin:sms_add" },
  ]);
  rows.push([
    { text: "📡 فحص جميع المزودين والأرصدة", callback_data: "admin:check_providers" },
    { text: "🚀 مزودو الرشق (SMM)", callback_data: "admin:smm_providers" },
  ]);
  rows.push([
    { text: "🔙 رجوع للوحة التحكم", callback_data: "admin:panel" },
  ]);

  return { text: lines.join("\n"), keyboard: { inline_keyboard: rows } };
}

/**
 * Build SMM Providers Management Menu
 */
function buildSmmProvidersMenu(lang = "ar", appStore) {
  let providers = [];
  if (appStore && typeof appStore.getSmmProviders === "function") {
    providers = appStore.getSmmProviders();
  }

  // Include default env provider if exists
  const envUrl = process.env.SMM_API_URL;
  const envKey = process.env.SMM_API_KEY;
  if (envUrl && envKey && !providers.some((p) => p.url === envUrl)) {
    providers = [
      { id: "smm_env_default", name: "مزود الرشق الرئيسي (.env)", url: envUrl, key: envKey, enabled: true },
      ...providers,
    ];
  }

  const lines = [
    "🚀 <b>إدارة مواقع وسيرفرات الرشق (SMM)</b>",
    "────────────────────",
    "يمكنك إضافة عدة مواقع وسيرفرات رشق، وسيقوم البوت بسحب جميع الخدمات والأسعار منها تلقائياً وتوزيعها داخل أزرار الرشق حسب المنصة والفئة!",
    "",
    `📊 <b>عدد المزودين المضافين:</b> ${providers.length}`,
  ];

  if (providers.length > 0) {
    lines.push("");
    lines.push("<b>قائمة المزودين:</b>");
    providers.forEach((p, idx) => {
      lines.push(`${idx + 1}. <b>${p.name}</b> [${p.enabled !== false ? "✅ مفعّل" : "❌ معطّل"}]`);
    });
  }

  lines.push("────────────────────");

  const rows = [];

  // Provider selection buttons
  providers.forEach((p) => {
    rows.push([
      {
        text: `⚙️ إعدادات: ${p.name}`,
        callback_data: `admin:smm_manage:${p.id}`,
      },
      {
        text: "🔍 فحص الرصيد",
        callback_data: `admin:smm_balance:${p.id}`,
      },
    ]);
  });

  // Action buttons
  rows.push([
    { text: "➕ إضافة موقع رشق جديد", callback_data: "admin:smm_add" },
    { text: "🔄 مزامنة وسحب جميع الخدمات الآن", callback_data: "admin:smm_sync_now" },
  ]);

  rows.push([
    { text: "📡 فحص جميع المزودين والأرصدة", callback_data: "admin:check_providers" },
    { text: "🔙 رجوع للوحة التحكم", callback_data: "admin:panel" },
  ]);

  return { text: lines.join("\n"), keyboard: { inline_keyboard: rows } };
}

/**
 * Build Single SMM Provider Details & Control Menu
 */
function buildSingleSmmProviderMenu(lang = "ar", provider) {
  const lines = [
    `⚙️ <b>إعدادات المزود: ${provider.name}</b>`,
    "────────────────────",
    `• <b>الحالة:</b> ${provider.enabled !== false ? "✅ مفعّل" : "❌ معطّل"}`,
    `• <b>الرابط:</b> <code>${provider.url || "غير محدد"}</code>`,
    `• <b>المفتاح:</b> <code>${provider.key ? "••••" + provider.key.slice(-6) : "غير محدد"}</code>`,
    "────────────────────",
  ];

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔍 فحص رصيد هذا الموقع الآن", callback_data: `admin:smm_balance:${provider.id}` },
      ],
      [
        { text: `${provider.enabled !== false ? "🔴 تعطيل المزود" : "🟢 تفعيل المزود"}`, callback_data: `admin:smm_toggle:${provider.id}` },
      ],
      [
        { text: "✏️ تعديل الاسم", callback_data: `admin:smm_edit_name:${provider.id}` },
        { text: "🌐 تعديل الرابط", callback_data: `admin:smm_edit_url:${provider.id}` },
      ],
      [
        { text: "🔑 تعديل المفتاح", callback_data: `admin:smm_edit_key:${provider.id}` },
        { text: "🗑️ حذف المزود", callback_data: `admin:smm_delete_confirm:${provider.id}` },
      ],
      [
        { text: "🔙 رجوع لقائمة مزودي الرشق", callback_data: "admin:smm_providers" },
      ],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

module.exports = {
  checkSmsProviderBalance,
  checkSmmProviderBalance,
  checkAllProviders,
  buildProviderCheckReport,
  buildSmsProvidersMenu,
  buildSingleSmsProviderMenu,
  buildSmmProvidersMenu,
  buildSingleSmmProviderMenu,
};
