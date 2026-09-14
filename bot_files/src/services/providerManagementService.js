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

  try {
    const response = await axios.get(baseUrl, {
      params: {
        api_key: apiKey,
        action: "getBalance",
      },
      timeout: 12000,
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
    logBotError("checkSmsProviderBalance", err, { providerKey, baseUrl });
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
  const smsChecks = ["server1", "server2"].map((key) => checkSmsProviderBalance(key, appStore));

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
 * Build SMS Providers Management Menu
 */
function buildSmsProvidersMenu(lang = "ar", appStore) {
  const p1 = appStore ? appStore.getSmsProvider("server1") : getSmsProvider("server1");
  const p2 = appStore ? appStore.getSmsProvider("server2") : getSmsProvider("server2");

  const lines = [
    "⚙️ <b>إدارة مزودي الأرقام الافتراضية (SMS)</b>",
    "────────────────────",
    `1️⃣ <b>${p1?.name || "السيرفر 1 (HeroSMS)"}</b>:`,
    `   • الحالة: ${p1?.enabled !== false ? "✅ مفعّل" : "❌ معطّل"}`,
    `   • الرابط: <code>${p1?.baseUrl ? p1.baseUrl.slice(0, 35) + "..." : "غير مضبوط"}</code>`,
    `   • المفتاح: <code>${p1?.apiKey ? "••••" + p1.apiKey.slice(-6) : "غير مدخل"}</code>`,
    "",
    `2️⃣ <b>${p2?.name || "السيرفر 2 (Grizzly)"}</b>:`,
    `   • الحالة: ${p2?.enabled !== false ? "✅ مفعّل" : "❌ معطّل"}`,
    `   • الرابط: <code>${p2?.baseUrl ? p2.baseUrl.slice(0, 35) + "..." : "غير مضبوط"}</code>`,
    `   • المفتاح: <code>${p2?.apiKey ? "••••" + p2.apiKey.slice(-6) : "غير مدخل"}</code>`,
    "────────────────────",
    "اضغط أدناه لتعديل المفتاح، الرابط، أو فحص الرصيد:",
  ];

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔍 فحص رصيد السيرفر 1", callback_data: "admin:test_sms:server1" },
        { text: "🔍 فحص رصيد السيرفر 2", callback_data: "admin:test_sms:server2" },
      ],
      [
        { text: `${p1?.enabled !== false ? "🔴 تعطيل" : "🟢 تفعيل"} سيرفر 1`, callback_data: "admin:toggle_sms:server1" },
        { text: `${p2?.enabled !== false ? "🔴 تعطيل" : "🟢 تفعيل"} سيرفر 2`, callback_data: "admin:toggle_sms:server2" },
      ],
      [
        { text: "🔑 تعديل مفتاح سيرفر 1", callback_data: "admin:edit_sms_key:server1" },
        { text: "🔑 تعديل مفتاح سيرفر 2", callback_data: "admin:edit_sms_key:server2" },
      ],
      [
        { text: "🌐 تعديل رابط سيرفر 1", callback_data: "admin:edit_sms_url:server1" },
        { text: "🌐 تعديل رابط سيرفر 2", callback_data: "admin:edit_sms_url:server2" },
      ],
      [
        { text: "📡 فحص جميع المزودين", callback_data: "admin:check_providers" },
        { text: "🔙 رجوع للوحة التحكم", callback_data: "admin:panel" },
      ],
    ],
  };

  return { text: lines.join("\n"), keyboard };
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
  buildSmmProvidersMenu,
  buildSingleSmmProviderMenu,
};
