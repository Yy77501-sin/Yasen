const { safeTelegramCall } = require("./telegramSafe");
const { t } = require("../locales");
const { fetchAndCacheSmmServices } = require("./smmCacheService");

/**
 * Builds the SMS Providers (Server 1 & Server 2) management text and keyboard.
 */
function buildSmsProvidersMenu(lang, appStore) {
  const providers = appStore.getSmsProviders();
  const s1 = providers.server1 || { key: "server1", name: "السيرفر 1 (HeroSMS)", baseUrl: "", apiKey: "", enabled: true };
  const s2 = providers.server2 || { key: "server2", name: "السيرفر 2 (Grizzly)", baseUrl: "", apiKey: "", enabled: true };

  const mask = (val) => {
    if (!val) return lang === "ar" ? "غير محدد" : "Not set";
    if (val.length <= 8) return "••••••••";
    return val.slice(0, 4) + "••••" + val.slice(-4);
  };

  const text = [
    "💠  <b>لوحة إدارة المزودين والمفاتيح (SMS)</b>  💠",
    "━━━━━━━━━━━━━━━━━━━",
    `📡 <b>${s1.name || "السيرفر 1"}</b> [${s1.enabled ? "✅ مفعل" : "❌ معطل"}]`,
    `🔗 الرابط: <code>${s1.baseUrl || "افتراضي (HeroSMS)"}</code>`,
    `🔑 المفتاح: <code>${mask(s1.apiKey)}</code>`,
    "",
    `📡 <b>${s2.name || "السيرفر 2"}</b> [${s2.enabled ? "✅ مفعل" : "❌ معطل"}]`,
    `🔗 الرابط: <code>${s2.baseUrl || "افتراضي (Grizzly)"}</code>`,
    `🔑 المفتاح: <code>${mask(s2.apiKey)}</code>`,
    "━━━━━━━━━━━━━━━━━━━",
    "اضغط على الزر لتعديل المفتاح أو الرابط أو تبديل الحالة:",
  ].join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: `✏️ مفتاح سيرفر 1`, callback_data: "admin:edit_sms_key:server1" },
        { text: `🔗 رابط سيرفر 1`, callback_data: "admin:edit_sms_url:server1" },
      ],
      [
        { text: s1.enabled ? "🔴 تعطيل سيرفر 1" : "🟢 تفعيل سيرفر 1", callback_data: "admin:toggle_sms:server1" },
      ],
      [
        { text: `✏️ مفتاح سيرفر 2`, callback_data: "admin:edit_sms_key:server2" },
        { text: `🔗 رابط سيرفر 2`, callback_data: "admin:edit_sms_url:server2" },
      ],
      [
        { text: s2.enabled ? "🔴 تعطيل سيرفر 2" : "🟢 تفعيل سيرفر 2", callback_data: "admin:toggle_sms:server2" },
      ],
      [{ text: "🔙 رجوع للوحة الإدارة", callback_data: "admin:panel" }],
    ],
  };

  return { text, keyboard };
}

/**
 * Builds the SMM Providers & Sites management text and keyboard.
 */
function buildSmmProvidersMenu(lang, appStore) {
  const providers = appStore.getSmmProviders();

  const mask = (val) => {
    if (!val) return lang === "ar" ? "غير محدد" : "Not set";
    if (val.length <= 8) return "••••••••";
    return val.slice(0, 4) + "••••" + val.slice(-4);
  };

  const lines = [
    "💠  <b>لوحة إدارة مواقع الرشق (SMM Providers)</b>  💠",
    "━━━━━━━━━━━━━━━━━━━",
    providers.length === 0
      ? "⚠️ لا توجد مواقع رشق مضافة حالياً. يمكنك إضافة مزود جديد الآن."
      : `عدد المزودين المضافين: <b>${providers.length}</b>`,
  ];

  if (providers.length > 0) {
    lines.push("");
    providers.forEach((p, idx) => {
      lines.push(`${idx + 1}. <b>${p.name}</b> [${p.enabled ? "✅ نشط" : "❌ متوقف"}]`);
      lines.push(`   🔗 <code>${p.url || "غير محدد"}</code>`);
      lines.push(`   🔑 <code>${mask(p.key)}</code>`);
    });
  }

  lines.push("━━━━━━━━━━━━━━━━━━━");
  lines.push("اختر عملية للإدارة أو التعديل أو المزامنة التلقائية:");

  const providerButtons = providers.map((p) => [
    { text: `⚙️ ${p.name} (${p.enabled ? "✅" : "❌"})`, callback_data: `admin:smm_manage:${p.id}` },
  ]);

  const keyboard = {
    inline_keyboard: [
      [{ text: "➕ إضافة مزود رشق جديد", callback_data: "admin:smm_add" }],
      [{ text: "🔄 مزامنة الأسعار والخدمات الآن", callback_data: "admin:smm_sync_now" }],
      ...providerButtons,
      [{ text: "🔙 رجوع للوحة الإدارة", callback_data: "admin:panel" }],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

/**
 * Single SMM provider details and action buttons (Edit key, Edit URL, Edit name, Toggle, Delete).
 */
function buildSingleSmmProviderMenu(lang, provider) {
  const mask = (val) => {
    if (!val) return lang === "ar" ? "غير محدد" : "Not set";
    if (val.length <= 8) return "••••••••";
    return val.slice(0, 4) + "••••" + val.slice(-4);
  };

  const text = [
    `💠  <b>إدارة مزود الرشق: ${provider.name}</b>  💠`,
    "━━━━━━━━━━━━━━━━━━━",
    `🆔 المعرف: <code>${provider.id}</code>`,
    `🏷️ الاسم: <b>${provider.name}</b>`,
    `🔗 الرابط (API URL): <code>${provider.url || "غير محدد"}</code>`,
    `🔑 المفتاح (API Key): <code>${mask(provider.key)}</code>`,
    `⚡ الحالة: ${provider.enabled ? "✅ مفعل ونشط" : "❌ معطل مؤقتاً"}`,
    "━━━━━━━━━━━━━━━━━━━",
  ].join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✏️ تعديل الاسم", callback_data: `admin:smm_edit_name:${provider.id}` },
        { text: "🔗 تعديل الرابط", callback_data: `admin:smm_edit_url:${provider.id}` },
      ],
      [
        { text: "🔑 تعديل المفتاح", callback_data: `admin:smm_edit_key:${provider.id}` },
        { text: provider.enabled ? "🔴 إيقاف المزود" : "🟢 تفعيل المزود", callback_data: `admin:smm_toggle:${provider.id}` },
      ],
      [
        { text: "🗑️ حذف هذا المزود", callback_data: `admin:smm_delete_confirm:${provider.id}` },
      ],
      [{ text: "🔙 رجوع لقائمة مزودي الرشق", callback_data: "admin:smm_providers" }],
    ],
  };

  return { text, keyboard };
}

module.exports = {
  buildSmsProvidersMenu,
  buildSmmProvidersMenu,
  buildSingleSmmProviderMenu,
};
