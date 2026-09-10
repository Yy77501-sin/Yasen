const { sendOrEditMessage } = require("./profileService");
const { getUserLang } = require("../locales");
const { getUserState, setUserState, clearUserState } = require("./stateStore");
const { escapeHtml } = require("../utils/formatters");
const { logBotError } = require("./errorLogger");
const { safeTelegramCall } = require("./telegramSafe");
const { buildVaultxServiceCard } = require("../utils/serviceHeroCards");

const FRAME = "━━━━━━━━━━━━━━━━━━━";

function vaultCard(title, lines, footer) {
  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    FRAME,
    title,
    ...lines,
    FRAME,
    footer,
  ].join("\n");
}

const TEXTS = {
  ar: {
    home: "☁️ <b>قسم الخدمات السحابية</b>\n━━━━━━━━━━━━━━\nاختر الخدمة التي تحتاجها من القائمة التالية:",
    vpsOs: vaultCard(
      "♦️ ❨ خـــوادم V P S (الـنـظـام) ❩ ♦️",
      [
        "💡 خوادم سحابية ذات أداء عالي واستقرار تام.",
        "💡 تحكم كامل (Root/Admin) بخادمك الخاص.",
        "💡 اختر النظام المتوافق مع برمجياتك وبيئة عملك.",
      ],
      "⬇️ يرجى تحديد نظام التشغيل المطلوب للسيرفر ⬇️"
    ),
    vpsLocation: vaultCard(
      "♦️ ❨ خـــوادم V P S (الـمـوقـع) ❩ ♦️",
      [
        "💡 موقع السيرفر يؤثر على سرعة الاستجابة (Ping).",
        "💡 اختر أقرب موقع جغرافي لعملائك أو لمشروعك.",
        "💡 جميع مراكز البيانات لدينا محمية ضد هجمات DDoS.",
      ],
      "⬇️ يرجى تحديد موقع السيرفر (الدولة) من القائمة ⬇️"
    ),
    vpsPlans: "🚀 <b>مواصفات السيرفر</b>\n(النظام: {os}، الموقع: {location})\nاختر الباقة المناسبة لاحتياجاتك:",
    domainPrompt: vaultCard(
      "♦️ ❨ حـجـــز نـطـــاق جـديـــد ❩ ♦️",
      [
        "💡 ابدأ بحجز اسم النطاق (Domain) لمشروعك.",
        "💡 يجب أن يكون باللغة الإنجليزية وبدون مسافات.",
        "💡 يرجى كتابة الامتداد معه (مثل: vaultx.com).",
      ],
      "⬇️ يرجى كتابة اسم النطاق وإرساله في رسالة الآن ⬇️"
    ),
    domainAvailable: vaultCard(
      "♦️ ❨ مـــدة حـجـــز الـنـطـــاق ❩ ♦️",
      [
        "💡 النطاق <code>{domain}</code> الذي أدخلته متاح وقابل للتسجيل!",
        "💡 كلما زادت مدة الحجز حصلت على خصم أكبر.",
        "💡 النطاق سيكون ملكاً لك بالكامل بلوحة تحكم.",
      ],
      "⬇️ يرجى اختيار مدة حجز النطاق من القائمة أدناه ⬇️"
    ),
    hostingType: vaultCard(
      "♦️ ❨ اسـتـضـافـــة الـمـواقـــع ❩ ♦️",
      [
        "💡 استضافات سريعة ومحمية تدعم أحدث التقنيات.",
        "💡 لوحة تحكم cPanel لسهولة إدارة ملفاتك.",
        "💡 نسخ احتياطي تلقائي لضمان أمان بياناتك.",
      ],
      "⬇️ يرجى اختيار نوع الاستضافة المناسب لمشروعك ⬇️"
    ),
    hostingPlans: "📦 <b>خطط الاستضافة ({type})</b>",
    hostingDomainMode: "🔗 <b>إعداد النطاق (Domain)</b>\nكيف تريد ربط استضافتك؟",
    hostingAskDomain: "🌐 أرسل اسم النطاق الذي تريد ربطه بالاستضافة.",
    vpnType: vaultCard(
      "♦️ ❨ خـدمـــات V P N الـخـاصـة ❩ ♦️",
      [
        "💡 تصفح الإنترنت بأمان وبدون أي قيود أو حجب.",
        "💡 ستحصل على مفتاح سيرفر خاص بك (غير مشترك).",
        "💡 اتصال مشفر وسريع جداً ممتاز للألعاب والتصفح.",
      ],
      "⬇️ يرجى اختيار بروتوكول اتصال الـ VPN المطلوب ⬇️"
    ),
    vpnDuration: "⏳ <b>اختر مدة اشتراك الـ VPN</b>",
    invoiceTitle: "🧾 <b>فاتورة تأكيد الطلب</b>",
    invoiceService: "🏷️ نوع الخدمة",
    invoiceSpec: "🚀 التفاصيل",
    invoiceDuration: "⏳ المدة",
    invoiceTotal: "💰 الإجمالي المطلوب",
    invoiceBalance: "💵 رصيدك الحالي",
    invoiceNote: "⚠️ ملاحظة: سيتم تجهيز طلبك خلال (15 - 60 دقيقة) وإرسال البيانات إليك هنا.",
    success: "✅ تم تأكيد الطلب وخصم الرصيد بنجاح.\nسيتم تجهيز الطلب وإرساله لك هنا قريباً.",
    insufficient: "❌ رصيدك الحالي غير كافٍ لإتمام الطلب.",
    invalidDomain: "❌ اسم النطاق غير صالح. أرسل نطاقاً مثل: example.com",
    cancelled: "❌ تم إلغاء الطلب.",
    back: "🔙 عودة",
    backMain: "🔙 عودة للقائمة الرئيسية",
    confirm: "✅ تأكيد الخصم وإتمام الطلب",
    cancelOrder: "❌ إلغاء الطلب",
    chooseService: "☁️ الخدمات السحابية",
    vps: "🖥️ خوادم VPS",
    domains: "🌐 حجز نطاقات",
    hosting: "☁️ استضافة مواقع",
    vpn: "🌍 خدمات VPN",
    linux: "🐧 Linux (Ubuntu / CentOS)",
    windows: "🪟 Windows Server",
    de: "🇩🇪 ألمانيا (أوروبا)",
    us: "🇺🇸 أمريكا (نيويورك)",
    sg: "🇸🇬 سنغافورة (آسيا)",
    uk: "🇬🇧 بريطانيا (لندن)",
    vpsStarter: "📦 البداية: 1GB RAM | 1 vCPU ➖ 5$ / شهر",
    vpsBusiness: "💼 الأعمال: 2GB RAM | 2 vCPU ➖ 10$ / شهر",
    vpsAdvanced: "🔥 المتقدمة: 4GB RAM | 2 vCPU ➖ 20$ / شهر",
    oneYear: "سنة واحدة ➖ 12$",
    twoYears: "سنتين (خصم 10%) ➖ 21$",
    domainReset: "🔙 إلغاء وإدخال نطاق آخر",
    wpType: "WordPress (مُحسنة للمدونات والمتاجر)",
    sharedType: "Shared Hosting (اقتصادية للمواقع العادية)",
    wpStart: "خطة الانطلاق: 10GB مساحة | 1 موقع ➖ 3$ / شهر",
    wpGrowth: "خطة النمو: 50GB مساحة | 5 مواقع ➖ 7$ / شهر",
    shStart: "خطة البداية: 5GB مساحة | 1 موقع ➖ 2$ / شهر",
    shGrowth: "خطة الأعمال: 20GB مساحة | 3 مواقع ➖ 5$ / شهر",
    haveDomain: "لدي نطاق سأقوم بربطه ⚙️",
    needDomain: "أريد حجز نطاق جديد 🛒",
    wg: "🛡️ WireGuard (سريع وممتاز للألعاب)",
    outline: "👻 Outline (ممتاز لتجاوز الحجب القوي)",
    month1: "شهر واحد ➖ 3$",
    month3: "3 أشهر ➖ 8$",
    year1: "سنة ➖ 25$",
  },
  en: {
    home: "☁️ <b>Cloud Services Section</b>\n━━━━━━━━━━━━━━\nChoose the service you need:",
    vpsOs: vaultCard(
      "♦️ ❨ V P S SERVERS (OS) ❩ ♦️",
      [
        "💡 High-performance cloud servers with stable uptime.",
        "💡 Full Root/Admin control over your private server.",
        "💡 Pick the OS that matches your stack and workflow.",
      ],
      "⬇️ Please choose the server operating system ⬇️"
    ),
    vpsLocation: vaultCard(
      "♦️ ❨ V P S SERVERS (LOCATION) ❩ ♦️",
      [
        "💡 Server location directly affects response latency (Ping).",
        "💡 Choose the nearest region to your audience or project.",
        "💡 All datacenters are protected against DDoS attacks.",
      ],
      "⬇️ Please choose the server location (country) ⬇️"
    ),
    vpsPlans: "🚀 <b>Server Specs</b>\n(OS: {os}, Location: {location})\nChoose your plan:",
    domainPrompt: vaultCard(
      "♦️ ❨ REGISTER A NEW DOMAIN ❩ ♦️",
      [
        "💡 Start by reserving your project domain name.",
        "💡 Use English letters only, with no spaces.",
        "💡 Include extension (example: vaultx.com).",
      ],
      "⬇️ Send the domain name now in one message ⬇️"
    ),
    domainAvailable: vaultCard(
      "♦️ ❨ DOMAIN REGISTRATION DURATION ❩ ♦️",
      [
        "💡 Domain <code>{domain}</code> is available for registration.",
        "💡 Longer duration gives better discount options.",
        "💡 Domain ownership stays fully under your control.",
      ],
      "⬇️ Please choose the registration period below ⬇️"
    ),
    hostingType: vaultCard(
      "♦️ ❨ WEB HOSTING ❩ ♦️",
      [
        "💡 Fast and secure hosting with latest technologies.",
        "💡 cPanel access for easy file and domain management.",
        "💡 Automated backups to protect your data.",
      ],
      "⬇️ Please choose the hosting type for your project ⬇️"
    ),
    hostingPlans: "📦 <b>Hosting Plans ({type})</b>",
    hostingDomainMode: "🔗 <b>Domain Setup</b>\nHow do you want to connect your hosting?",
    hostingAskDomain: "🌐 Send the domain name you want to connect.",
    vpnType: vaultCard(
      "♦️ ❨ PRIVATE CLOUD V P N ❩ ♦️",
      [
        "💡 Browse securely with no restrictions or blocking.",
        "💡 Get a private server key dedicated to your account.",
        "💡 Encrypted high-speed connection for gaming and browsing.",
      ],
      "⬇️ Please choose the required VPN protocol ⬇️"
    ),
    vpnDuration: "⏳ <b>Choose VPN duration</b>",
    invoiceTitle: "🧾 <b>Order Confirmation Invoice</b>",
    invoiceService: "🏷️ Service Type",
    invoiceSpec: "🚀 Details",
    invoiceDuration: "⏳ Duration",
    invoiceTotal: "💰 Total",
    invoiceBalance: "💵 Current Balance",
    invoiceNote: "⚠️ Note: Your order will be prepared within (15 - 60 minutes) and sent here.",
    success: "✅ Order confirmed and balance deducted successfully.\nYour order will be prepared and sent here shortly.",
    insufficient: "❌ Your current balance is not enough for this order.",
    invalidDomain: "❌ Invalid domain. Send one like: example.com",
    cancelled: "❌ Order cancelled.",
    back: "🔙 Back",
    backMain: "🔙 Back to Main Menu",
    confirm: "✅ Confirm & Deduct Balance",
    cancelOrder: "❌ Cancel Order",
    chooseService: "☁️ Cloud Services",
    vps: "🖥️ VPS Servers",
    domains: "🌐 Domain Registration",
    hosting: "☁️ Web Hosting",
    vpn: "🌍 VPN Services",
    linux: "🐧 Linux (Ubuntu / CentOS)",
    windows: "🪟 Windows Server",
    de: "🇩🇪 Germany (Europe)",
    us: "🇺🇸 USA (New York)",
    sg: "🇸🇬 Singapore (Asia)",
    uk: "🇬🇧 UK (London)",
    vpsStarter: "📦 Starter: 1GB RAM | 1 vCPU ➖ 5$ / month",
    vpsBusiness: "💼 Business: 2GB RAM | 2 vCPU ➖ 10$ / month",
    vpsAdvanced: "🔥 Advanced: 4GB RAM | 2 vCPU ➖ 20$ / month",
    oneYear: "1 Year ➖ 12$",
    twoYears: "2 Years (10% Off) ➖ 21$",
    domainReset: "🔙 Cancel and enter another domain",
    wpType: "WordPress (Optimized for blogs/stores)",
    sharedType: "Shared Hosting (Budget for regular sites)",
    wpStart: "Starter Plan: 10GB storage | 1 website ➖ 3$ / month",
    wpGrowth: "Growth Plan: 50GB storage | 5 websites ➖ 7$ / month",
    shStart: "Starter Plan: 5GB storage | 1 website ➖ 2$ / month",
    shGrowth: "Business Plan: 20GB storage | 3 websites ➖ 5$ / month",
    haveDomain: "I have a domain to connect ⚙️",
    needDomain: "I need a new domain 🛒",
    wg: "🛡️ WireGuard (Fast and great for gaming)",
    outline: "👻 Outline (Great for strong censorship bypass)",
    month1: "1 Month ➖ 3$",
    month3: "3 Months ➖ 8$",
    year1: "1 Year ➖ 25$",
  },
};

const VPS_PLANS = {
  starter: { key: "starter", price: 5, spec: "1GB RAM | 1 vCPU", durationAr: "شهر واحد", durationEn: "1 Month" },
  business: { key: "business", price: 10, spec: "2GB RAM | 2 vCPU", durationAr: "شهر واحد", durationEn: "1 Month" },
  advanced: { key: "advanced", price: 20, spec: "4GB RAM | 2 vCPU", durationAr: "شهر واحد", durationEn: "1 Month" },
};

const DOMAIN_DURATIONS = {
  y1: { key: "y1", price: 12, labelAr: "سنة واحدة", labelEn: "1 Year" },
  y2: { key: "y2", price: 21, labelAr: "سنتين", labelEn: "2 Years" },
};

const HOSTING_PLANS = {
  wordpress: {
    start: { key: "start", price: 3, spec: "10GB مساحة | 1 موقع", durationAr: "شهر واحد", durationEn: "1 Month" },
    growth: { key: "growth", price: 7, spec: "50GB مساحة | 5 مواقع", durationAr: "شهر واحد", durationEn: "1 Month" },
  },
  shared: {
    start: { key: "start", price: 2, spec: "5GB مساحة | 1 موقع", durationAr: "شهر واحد", durationEn: "1 Month" },
    growth: { key: "growth", price: 5, spec: "20GB مساحة | 3 مواقع", durationAr: "شهر واحد", durationEn: "1 Month" },
  },
};

const VPN_DURATIONS = {
  m1: { key: "m1", price: 3, labelAr: "شهر واحد", labelEn: "1 Month" },
  m3: { key: "m3", price: 8, labelAr: "3 أشهر", labelEn: "3 Months" },
  y1: { key: "y1", price: 25, labelAr: "سنة واحدة", labelEn: "1 Year" },
};

function txt(lang) {
  return TEXTS[lang] || TEXTS.ar;
}

function langOf(user) {
  return getUserLang(user);
}

function invoiceText(lang, payload, balance) {
  const t = txt(lang);
  return [
    t.invoiceTitle,
    "━━━━━━━━━━━━━━",
    `${t.invoiceService}: ${escapeHtml(payload.service)}`,
    `${t.invoiceSpec}: ${escapeHtml(payload.spec)}`,
    `${t.invoiceDuration}: ${escapeHtml(payload.duration)}`,
    "━━━━━━━━━━━━━━",
    `${t.invoiceTotal}: ${payload.price}$`,
    `${t.invoiceBalance}: ${Number(balance || 0)}$`,
    "",
    t.invoiceNote,
  ].join("\n");
}

function keyboard(rows) {
  return { inline_keyboard: rows };
}

async function sendCloudServicesHome(bot, chatId, user, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  clearUserState(user.userId);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "cloud_services"),
    keyboard([
      [{ text: t.vps, callback_data: "cloud:vps:os" }],
      [{ text: t.domains, callback_data: "cloud:domain:start" }],
      [{ text: t.hosting, callback_data: "cloud:hosting:type" }],
      [{ text: t.vpn, callback_data: "cloud:vpn:type" }],
      [{ text: t.backMain, callback_data: "menu:main" }],
    ]),
    options.messageId,
    "cloud.home"
  );
}

async function sendVpsOsMenu(bot, chatId, user, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  return sendOrEditMessage(
    bot,
    chatId,
    t.vpsOs,
    keyboard([
      [{ text: t.linux, callback_data: "cloud:vps:os:linux" }],
      [{ text: t.windows, callback_data: "cloud:vps:os:windows" }],
      [{ text: t.back, callback_data: "service:cloud_services" }],
    ]),
    options.messageId,
    "cloud.vps.os"
  );
}

async function sendVpsLocationMenu(bot, chatId, user, osKey, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  setUserState(user.userId, "CLOUD_VPS_OS_SELECTED", { osKey });
  return sendOrEditMessage(
    bot,
    chatId,
    t.vpsLocation,
    keyboard([
      [
        { text: t.de, callback_data: "cloud:vps:loc:de" },
        { text: t.us, callback_data: "cloud:vps:loc:us" },
      ],
      [
        { text: t.sg, callback_data: "cloud:vps:loc:sg" },
        { text: t.uk, callback_data: "cloud:vps:loc:uk" },
      ],
      [{ text: t.back, callback_data: "cloud:vps:os" }],
    ]),
    options.messageId,
    "cloud.vps.location"
  );
}

async function sendVpsPlansMenu(bot, chatId, user, osKey, locKey, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  const osLabel = osKey === "linux" ? t.linux : t.windows;
  const locLabel = t[locKey] || locKey;
  setUserState(user.userId, "CLOUD_VPS_LOCATION_SELECTED", { osKey, locKey });

  return sendOrEditMessage(
    bot,
    chatId,
    t.vpsPlans.replace("{os}", osLabel).replace("{location}", locLabel),
    keyboard([
      [{ text: t.vpsStarter, callback_data: "cloud:vps:plan:starter" }],
      [{ text: t.vpsBusiness, callback_data: "cloud:vps:plan:business" }],
      [{ text: t.vpsAdvanced, callback_data: "cloud:vps:plan:advanced" }],
      [{ text: t.back, callback_data: "cloud:vps:loc" }],
    ]),
    options.messageId,
    "cloud.vps.plans"
  );
}

async function sendDomainInputPrompt(bot, chatId, user, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  setUserState(user.userId, "CLOUD_AWAIT_DOMAIN", {});
  return sendOrEditMessage(
    bot,
    chatId,
    t.domainPrompt,
    keyboard([[{ text: t.back, callback_data: "service:cloud_services" }]]),
    options.messageId,
    "cloud.domain.prompt"
  );
}

async function sendDomainDurationMenu(bot, chatId, user, domainName, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  setUserState(user.userId, "CLOUD_DOMAIN_SELECTED", { domainName });
  return sendOrEditMessage(
    bot,
    chatId,
    t.domainAvailable.replace("{domain}", escapeHtml(domainName)),
    keyboard([
      [{ text: t.oneYear, callback_data: "cloud:domain:dur:y1" }],
      [{ text: t.twoYears, callback_data: "cloud:domain:dur:y2" }],
      [{ text: t.domainReset, callback_data: "cloud:domain:start" }],
    ]),
    options.messageId,
    "cloud.domain.duration"
  );
}

async function sendHostingTypeMenu(bot, chatId, user, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  return sendOrEditMessage(
    bot,
    chatId,
    t.hostingType,
    keyboard([
      [{ text: t.wpType, callback_data: "cloud:hosting:type:wordpress" }],
      [{ text: t.sharedType, callback_data: "cloud:hosting:type:shared" }],
      [{ text: t.back, callback_data: "service:cloud_services" }],
    ]),
    options.messageId,
    "cloud.hosting.type"
  );
}

async function sendHostingPlansMenu(bot, chatId, user, typeKey, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  setUserState(user.userId, "CLOUD_HOSTING_TYPE_SELECTED", { typeKey });
  const title = t.hostingPlans.replace("{type}", typeKey === "wordpress" ? "WordPress" : "Shared Hosting");
  const rows = typeKey === "wordpress"
    ? [
      [{ text: t.wpStart, callback_data: "cloud:hosting:plan:start" }],
      [{ text: t.wpGrowth, callback_data: "cloud:hosting:plan:growth" }],
    ]
    : [
      [{ text: t.shStart, callback_data: "cloud:hosting:plan:start" }],
      [{ text: t.shGrowth, callback_data: "cloud:hosting:plan:growth" }],
    ];

  rows.push([{ text: t.back, callback_data: "cloud:hosting:type" }]);

  return sendOrEditMessage(bot, chatId, title, keyboard(rows), options.messageId, "cloud.hosting.plans");
}

async function sendHostingDomainMode(bot, chatId, user, typeKey, planKey, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  setUserState(user.userId, "CLOUD_HOSTING_PLAN_SELECTED", { typeKey, planKey });
  return sendOrEditMessage(
    bot,
    chatId,
    t.hostingDomainMode,
    keyboard([
      [{ text: t.haveDomain, callback_data: "cloud:hosting:domain:have" }],
      [{ text: t.needDomain, callback_data: "cloud:domain:start" }],
      [{ text: t.back, callback_data: "cloud:hosting:type:" + typeKey }],
    ]),
    options.messageId,
    "cloud.hosting.domainMode"
  );
}

async function askHostingDomain(bot, chatId, user, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  const state = getUserState(user.userId);
  setUserState(user.userId, "CLOUD_AWAIT_HOSTING_DOMAIN", {
    typeKey: state?.typeKey,
    planKey: state?.planKey,
  });
  return sendOrEditMessage(
    bot,
    chatId,
    t.hostingAskDomain,
    keyboard([[{ text: t.back, callback_data: "cloud:hosting:type:" + (state?.typeKey || "wordpress") }]]),
    options.messageId,
    "cloud.hosting.askDomain"
  );
}

async function sendVpnTypeMenu(bot, chatId, user, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  return sendOrEditMessage(
    bot,
    chatId,
    t.vpnType,
    keyboard([
      [{ text: t.wg, callback_data: "cloud:vpn:type:wg" }],
      [{ text: t.outline, callback_data: "cloud:vpn:type:outline" }],
      [{ text: t.back, callback_data: "service:cloud_services" }],
    ]),
    options.messageId,
    "cloud.vpn.type"
  );
}

async function sendVpnDurationMenu(bot, chatId, user, vpnType, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  setUserState(user.userId, "CLOUD_VPN_TYPE_SELECTED", { vpnType });
  return sendOrEditMessage(
    bot,
    chatId,
    t.vpnDuration,
    keyboard([
      [
        { text: t.month1, callback_data: "cloud:vpn:dur:m1" },
        { text: t.month3, callback_data: "cloud:vpn:dur:m3" },
      ],
      [{ text: t.year1, callback_data: "cloud:vpn:dur:y1" }],
      [{ text: t.back, callback_data: "cloud:vpn:type" }],
    ]),
    options.messageId,
    "cloud.vpn.duration"
  );
}

async function sendInvoice(bot, chatId, user, payload, options = {}) {
  const lang = langOf(user);
  const t = txt(lang);
  const balance = Number(user.balance || 0);
  setUserState(user.userId, "CLOUD_INVOICE", { payload });

  return sendOrEditMessage(
    bot,
    chatId,
    invoiceText(lang, payload, balance),
    keyboard([
      [{ text: t.confirm, callback_data: "cloud:confirm" }],
      [{ text: t.cancelOrder, callback_data: "cloud:cancel" }],
      [{ text: t.back, callback_data: payload.backCallback }],
    ]),
    options.messageId,
    "cloud.invoice"
  );
}

function normalizeDomain(text) {
  return String(text || "").trim().toLowerCase();
}

function isValidDomain(domain) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain);
}

async function handleCloudServicesCallback(bot, query, appStore) {
  try {
    if (!query.data || (!query.data.startsWith("cloud:") && query.data !== "service:cloud_services" && !query.data.startsWith("service_menu:cloud_services:item:"))) {
      return false;
    }

    await safeTelegramCall("cloud.callback.answer", () => bot.answerCallbackQuery(query.id));

    const user = appStore.getOrCreateUser(query.from);
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const lang = langOf(user);
    const t = txt(lang);

    if (query.data === "service:cloud_services") {
      await sendCloudServicesHome(bot, chatId, user, { messageId });
      return true;
    }

    if (query.data.startsWith("service_menu:cloud_services:item:")) {
      const index = Number(query.data.split(":")[3]);
      if (index === 0) {
        await sendHostingTypeMenu(bot, chatId, user, { messageId });
      } else if (index === 1) {
        await sendDomainInputPrompt(bot, chatId, user, { messageId });
      } else if (index === 2) {
        await sendVpsOsMenu(bot, chatId, user, { messageId });
      } else if (index === 4) {
        await sendVpnTypeMenu(bot, chatId, user, { messageId });
      } else {
        await sendCloudServicesHome(bot, chatId, user, { messageId });
      }
      return true;
    }

    if (query.data === "cloud:vps:os") {
      await sendVpsOsMenu(bot, chatId, user, { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:vps:os:")) {
      const osKey = query.data.split(":")[3];
      await sendVpsLocationMenu(bot, chatId, user, osKey, { messageId });
      return true;
    }

    if (query.data === "cloud:vps:loc") {
      const state = getUserState(user.userId);
      await sendVpsLocationMenu(bot, chatId, user, state?.osKey || "linux", { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:vps:loc:")) {
      const locKey = query.data.split(":")[3];
      const state = getUserState(user.userId);
      await sendVpsPlansMenu(bot, chatId, user, state?.osKey || "linux", locKey, { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:vps:plan:")) {
      const planKey = query.data.split(":")[3];
      const state = getUserState(user.userId);
      const plan = VPS_PLANS[planKey];
      const osLabel = t[state?.osKey || "linux"] || t.linux;
      const locLabel = t[state?.locKey || "de"] || t.de;
      await sendInvoice(bot, chatId, user, {
        service: "VPS",
        spec: `${osLabel} - ${locLabel} | ${plan.spec}`,
        duration: lang === "ar" ? plan.durationAr : plan.durationEn,
        price: plan.price,
        backCallback: "cloud:vps:loc",
      }, { messageId });
      return true;
    }

    if (query.data === "cloud:domain:start") {
      await sendDomainInputPrompt(bot, chatId, user, { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:domain:dur:")) {
      const durKey = query.data.split(":")[3];
      const state = getUserState(user.userId);
      const duration = DOMAIN_DURATIONS[durKey];
      const domainName = state?.domainName || "-";
      await sendInvoice(bot, chatId, user, {
        service: "Domain",
        spec: domainName,
        duration: lang === "ar" ? duration.labelAr : duration.labelEn,
        price: duration.price,
        backCallback: "cloud:domain:start",
      }, { messageId });
      return true;
    }

    if (query.data === "cloud:hosting:type") {
      await sendHostingTypeMenu(bot, chatId, user, { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:hosting:type:")) {
      const typeKey = query.data.split(":")[3];
      await sendHostingPlansMenu(bot, chatId, user, typeKey, { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:hosting:plan:")) {
      const planKey = query.data.split(":")[3];
      const state = getUserState(user.userId);
      const typeKey = state?.typeKey || "wordpress";
      await sendHostingDomainMode(bot, chatId, user, typeKey, planKey, { messageId });
      return true;
    }

    if (query.data === "cloud:hosting:domain:have") {
      await askHostingDomain(bot, chatId, user, { messageId });
      return true;
    }

    if (query.data === "cloud:vpn:type") {
      await sendVpnTypeMenu(bot, chatId, user, { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:vpn:type:")) {
      const vpnType = query.data.split(":")[3];
      await sendVpnDurationMenu(bot, chatId, user, vpnType, { messageId });
      return true;
    }

    if (query.data.startsWith("cloud:vpn:dur:")) {
      const durKey = query.data.split(":")[3];
      const duration = VPN_DURATIONS[durKey];
      const state = getUserState(user.userId);
      const vpnLabel = state?.vpnType === "outline" ? t.outline : t.wg;
      await sendInvoice(bot, chatId, user, {
        service: "VPN",
        spec: vpnLabel,
        duration: lang === "ar" ? duration.labelAr : duration.labelEn,
        price: duration.price,
        backCallback: "cloud:vpn:type",
      }, { messageId });
      return true;
    }

    if (query.data === "cloud:confirm") {
      const state = getUserState(user.userId);
      const payload = state?.payload;
      if (!payload) {
        await sendCloudServicesHome(bot, chatId, user, { messageId });
        return true;
      }

      const currentUser = appStore.findUserById(user.userId);
      if (!currentUser || Number(currentUser.balance || 0) < Number(payload.price)) {
        await safeTelegramCall("cloud.confirm.insufficient", () =>
          bot.answerCallbackQuery(query.id, { text: t.insufficient, show_alert: true })
        );
        return true;
      }

      appStore.deductBalance(user.userId, Number(payload.price));
      appStore.incrementTransactions(user.userId);
      appStore.addTransaction({
        type: "cloud_service_order",
        serviceKey: "cloud_services",
        userId: user.userId,
        amount: Number(payload.price),
        details: payload,
        status: "pending",
      });

      clearUserState(user.userId);
      await sendOrEditMessage(
        bot,
        chatId,
        t.success,
        keyboard([[{ text: t.backMain, callback_data: "menu:main" }]]),
        messageId,
        "cloud.confirm.success"
      );
      return true;
    }

    if (query.data === "cloud:cancel") {
      clearUserState(user.userId);
      await sendOrEditMessage(
        bot,
        chatId,
        t.cancelled,
        keyboard([[{ text: t.backMain, callback_data: "menu:main" }]]),
        messageId,
        "cloud.cancel"
      );
      return true;
    }

    return false;
  } catch (error) {
    logBotError("handleCloudServicesCallback", error, { userId: query.from?.id, data: query.data });
    return true;
  }
}

async function handleCloudServicesTextInput(bot, msg, appStore) {
  try {
    const user = appStore.getOrCreateUser(msg.from);
    const lang = langOf(user);
    const t = txt(lang);
    const state = getUserState(user.userId);
    if (!state) {
      return false;
    }

    const text = String(msg.text || "").trim();
    if (!text) {
      return false;
    }

    if (state.name === "CLOUD_AWAIT_DOMAIN") {
      const domainName = normalizeDomain(text);
      if (!isValidDomain(domainName)) {
        await safeTelegramCall("cloud.domain.invalid", () => bot.sendMessage(msg.chat.id, t.invalidDomain));
        return true;
      }
      await sendDomainDurationMenu(bot, msg.chat.id, user, domainName);
      return true;
    }

    if (state.name === "CLOUD_AWAIT_HOSTING_DOMAIN") {
      const domainName = normalizeDomain(text);
      if (!isValidDomain(domainName)) {
        await safeTelegramCall("cloud.hosting.domain.invalid", () => bot.sendMessage(msg.chat.id, t.invalidDomain));
        return true;
      }
      const typeKey = state.typeKey || "wordpress";
      const planKey = state.planKey || "start";
      const plan = HOSTING_PLANS[typeKey][planKey];
      await sendInvoice(bot, msg.chat.id, user, {
        service: "Web Hosting",
        spec: `${typeKey === "wordpress" ? "WordPress" : "Shared Hosting"} | ${plan.spec} | ${domainName}`,
        duration: lang === "ar" ? plan.durationAr : plan.durationEn,
        price: plan.price,
        backCallback: `cloud:hosting:type:${typeKey}`,
      });
      return true;
    }

    return false;
  } catch (error) {
    logBotError("handleCloudServicesTextInput", error, { userId: msg.from?.id });
    return false;
  }
}

module.exports = {
  sendCloudServicesHome,
  handleCloudServicesCallback,
  handleCloudServicesTextInput,
};
