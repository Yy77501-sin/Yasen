const { ADMIN_CHANNEL_ID, ADMIN_IDS } = require("../config");
const { sendOrEditMessage } = require("./profileService");
const { safeTelegramCall } = require("./telegramSafe");
const { logBotError } = require("./errorLogger");
const { getUserState, setUserState, clearUserState } = require("./stateStore");
const { getUserLang } = require("../locales");
const { escapeHtml } = require("../utils/formatters");

const FRAME = "━━━━━━━━━━━━━━━━━━━";

const DIGITAL_CATALOG = {
  telegram_bots: {
    name_ar: "برمجة بوتات تليجرام",
    name_en: "Telegram Bot Development",
    card_title_ar: "♦️ ❨ بـرمـجـــة الـبـوتـــات ❩ ♦️",
    card_title_en: "♦️ ❨ BOT DEVELOPMENT ❩ ♦️",
    lines_ar: [
      "💡 نبرمج لك بوتات تليجرام ذكية واحترافية (مثل VaultX).",
      "💡 بوتات للمتاجر، الإدارة، الرد الآلي، أو ربط الـ APIs.",
      "💡 أداء سريع بدون توقف مع لوحات تحكم متكاملة.",
    ],
    lines_en: [
      "💡 We build smart and professional Telegram bots (like VaultX).",
      "💡 Bots for stores, management, automation, and API integrations.",
      "💡 Fast stable performance with complete admin dashboards.",
    ],
    footer_ar: "⬇️ يرجى اختيار نوع البوت الذي ترغب في برمجته ⬇️",
    footer_en: "⬇️ Please select the bot type you need ⬇️",
    subcategories: [
      { key: "shop_bot", ar: "بوت متجر للبيع", en: "Store Bot" },
      { key: "group_bot", ar: "بوت إدارة مجموعات", en: "Group Management Bot" },
      { key: "custom_bot", ar: "فكرة بوت مخصصة", en: "Custom Bot Idea" },
    ],
  },
  web_dev: {
    name_ar: "تصميم وتطوير مواقع",
    name_en: "Web Design & Development",
    card_title_ar: "♦️ ❨ تـطـويـــر الـمـواقـــع ❩ ♦️",
    card_title_en: "♦️ ❨ WEB DEVELOPMENT ❩ ♦️",
    lines_ar: [
      "💡 نصمم ونبرمج مواقع إلكترونية عصرية وسريعة التصفح.",
      "💡 متاجر إلكترونية، صفحات هبوط، أو منصات أعمال.",
      "💡 تصميم متجاوب (Responsive) يعمل على جميع الشاشات.",
    ],
    lines_en: [
      "💡 We design and develop modern fast websites.",
      "💡 E-commerce stores, landing pages, and business platforms.",
      "💡 Fully responsive design for all screen sizes.",
    ],
    footer_ar: "⬇️ يرجى تحديد نوع الموقع الإلكتروني المطلوب ⬇️",
    footer_en: "⬇️ Please choose the required website type ⬇️",
    subcategories: [
      { key: "ecommerce", ar: "متجر إلكتروني", en: "E-commerce Store" },
      { key: "landing", ar: "موقع تعريفي/هبوط", en: "Landing / Portfolio Site" },
      { key: "business_platform", ar: "منصة أعمال مخصصة", en: "Custom Business Platform" },
    ],
  },
  app_dev: {
    name_ar: "تطوير تطبيقات",
    name_en: "Mobile App Development",
    card_title_ar: "♦️ ❨ تـطـويـــر الـتـطـبـيـقـات ❩ ♦️",
    card_title_en: "♦️ ❨ APP DEVELOPMENT ❩ ♦️",
    lines_ar: [
      "💡 برمجة تطبيقات ذكية للهواتف المحمولة.",
      "💡 تدعم أنظمة أندرويد (Android) و آيفون (iOS).",
      "💡 واجهات عصرية وأداء سريع مع رفعها للمتاجر.",
    ],
    lines_en: [
      "💡 Smart mobile app development services.",
      "💡 Supports Android and iOS platforms.",
      "💡 Modern UI with fast performance and store publishing.",
    ],
    footer_ar: "⬇️ يرجى تحديد بيئة التطبيق الذي ترغب ببرمجته ⬇️",
    footer_en: "⬇️ Please choose your target app platform ⬇️",
    subcategories: [
      { key: "android", ar: "تطبيق أندرويد", en: "Android App" },
      { key: "ios", ar: "تطبيق آيفون iOS", en: "iOS App" },
      { key: "both", ar: "تطبيق متكامل للنظامين", en: "Cross-platform App" },
    ],
  },
  graphic_design: {
    name_ar: "تصميم جرافيك",
    name_en: "Graphic Design",
    card_title_ar: "♦️ ❨ الـتـصـمـيـــم الإبـــداعـــي ❩ ♦️",
    card_title_en: "♦️ ❨ CREATIVE DESIGN ❩ ♦️",
    lines_ar: [
      "💡 نصنع لك هوية بصرية تميز علامتك التجارية في السوق.",
      "💡 تصميم شعارات، منشورات سوشيال ميديا، ومطبوعات.",
      "💡 لمسات احترافية تعكس رؤيتك بألوان عصرية وجذابة.",
    ],
    lines_en: [
      "💡 We build visual identities that elevate your brand.",
      "💡 Logos, social media creatives, and print materials.",
      "💡 Professional modern design crafted to your vision.",
    ],
    footer_ar: "⬇️ يرجى اختيار نوع التصميم الذي تحتاجه لمشروعك ⬇️",
    footer_en: "⬇️ Please choose the design type you need ⬇️",
    subcategories: [
      { key: "logo", ar: "تصميم شعار/لوجو", en: "Logo Design" },
      { key: "social_posts", ar: "بوستات سوشيال ميديا", en: "Social Media Posts" },
      { key: "uiux", ar: "تصميم واجهات UI/UX", en: "UI/UX Design" },
    ],
  },
  seo_marketing: {
    name_ar: "تسويق SEO",
    name_en: "SEO & Marketing",
    card_title_ar: "♦️ ❨ الـتـسـويـــق وتـصـدر الـبـحـث ❩ ♦️",
    card_title_en: "♦️ ❨ SEO & GROWTH MARKETING ❩ ♦️",
    lines_ar: [
      "💡 اجعل موقعك يتصدر النتائج الأولى في محركات البحث.",
      "💡 نقوم بتحسين الكلمات المفتاحية وزيادة الزيارات العضوية.",
      "💡 استراتيجيات تسويقية آمنة تضمن نمو أرباحك وعملائك.",
    ],
    lines_en: [
      "💡 Rank your website on top search results.",
      "💡 Keyword optimization and organic growth strategies.",
      "💡 Safe marketing plans focused on ROI and growth.",
    ],
    footer_ar: "⬇️ يرجى تحديد الخدمة التسويقية المناسبة لك ⬇️",
    footer_en: "⬇️ Please choose the right marketing service ⬇️",
    subcategories: [
      { key: "seo", ar: "تحسين محركات البحث SEO", en: "Search Engine Optimization" },
      { key: "ads", ar: "إدارة حملات إعلانية", en: "Ads Campaign Management" },
    ],
  },
  security: {
    name_ar: "خدمات حماية",
    name_en: "Security Services",
    card_title_ar: "♦️ ❨ خـدمـــات الـحـمـايـــة ❩ ♦️",
    card_title_en: "♦️ ❨ SECURITY SERVICES ❩ ♦️",
    lines_ar: [
      "💡 تأمين شامل لمشاريعك التقنية من الاختراقات.",
      "💡 فحص ثغرات المواقع، البوتات، والسيرفرات.",
      "💡 حلول متقدمة لصد هجمات حجب الخدمة (DDoS).",
    ],
    lines_en: [
      "💡 Full security hardening for digital projects.",
      "💡 Vulnerability testing for websites, bots, and servers.",
      "💡 Advanced mitigation against DDoS attacks.",
    ],
    footer_ar: "⬇️ يرجى اختيار نوع خدمة الحماية المطلوبة ⬇️",
    footer_en: "⬇️ Please choose the required security service ⬇️",
    subcategories: [
      { key: "secure_site", ar: "فحص وتأمين موقع", en: "Website Security Audit" },
      { key: "secure_vps", ar: "تأمين سيرفر VPS", en: "VPS Hardening" },
      { key: "recover_account", ar: "استرجاع حساب مخترق", en: "Compromised Account Recovery" },
    ],
  },
  custom: {
    name_ar: "طلب خدمة مخصصة",
    name_en: "Custom Service Request",
    card_title_ar: "♦️ ❨ طـلـــب خـدمـــة مـخـصـصـة ❩ ♦️",
    card_title_en: "♦️ ❨ CUSTOM SERVICE REQUEST ❩ ♦️",
    lines_ar: [
      "💡 هل لديك فكرة برمجية أو تقنية خارج الصندوق؟",
      "💡 فريقنا مستعد لتحليل فكرتك وتقديم الحل الأمثل.",
      "💡 استشارات، ربط واجهات (APIs)، أو برمجة خاصة.",
    ],
    lines_en: [
      "💡 Have a custom technical or software idea?",
      "💡 Our team can analyze and propose the best solution.",
      "💡 API integrations, consultancy, and custom development.",
    ],
    footer_ar: "⬇️ يرجى تحديد تصنيف فكرتك أو طلبك الخاص ⬇️",
    footer_en: "⬇️ Please choose your custom request category ⬇️",
    subcategories: [
      { key: "api_special", ar: "ربط API وبرمجة خاصة", en: "API Integration & Custom Development" },
      { key: "consulting", ar: "استشارة تقنية", en: "Technical Consulting" },
      { key: "other", ar: "أخرى", en: "Other" },
    ],
  },
};

const MAIN_ORDER = [
  "telegram_bots",
  "web_dev",
  "graphic_design",
  "seo_marketing",
  "app_dev",
  "security",
  "custom",
];

function txt(lang, ar, en) {
  return lang === "en" ? en : ar;
}

function buildCard(title, lines, footer) {
  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    FRAME,
    title,
    "",
    ...lines,
    FRAME,
    footer,
  ].join("\n");
}

function mainCard(lang) {
  return buildCard(
    lang === "en" ? "♦️ ❨ DIGITAL SERVICES ❩ ♦️" : "♦️ ❨ الـخـدمـــات الـرقـمـيـــة ❩ ♦️",
    lang === "en"
      ? [
        "💡 Turn your ideas into products with our technical team.",
        "💡 End-to-end digital solutions for people and businesses.",
        "💡 High quality delivery with ongoing technical support.",
      ]
      : [
        "💡 حول أفكارك إلى واقع مع فريقنا البرمجي والإبداعي.",
        "💡 نقدم حلولاً تقنية متكاملة تناسب الأفراد والشركات.",
        "💡 جودة عالية، تسليم في الموعد، ودعم فني مستمر.",
      ],
    lang === "en"
      ? "⬇️ Please choose the digital service field you need ⬇️"
      : "⬇️ يرجى اختيار مجال الخدمة التي تبحث عنها ⬇️"
  );
}

function detailsCard(lang) {
  return buildCard(
    lang === "en" ? "♦️ ❨ PROJECT DETAILS ❩ ♦️" : "♦️ ❨ تـفـاصـيـــل الـمـشـــروع ❩ ♦️",
    lang === "en"
      ? [
        "💡 To price your project accurately and deliver best quality.",
        "💡 Please send a clear summary of your idea and requirements.",
        "💡 Our team will review and reply to you shortly.",
      ]
      : [
        "💡 لكي نتمكن من تسعير مشروعك وتقديم أفضل جودة لك.",
        "💡 يرجى كتابة نبذة عن فكرتك أو متطلباتك بالتفصيل.",
        "💡 سيقوم فريقنا بمراجعة الطلب والتواصل معك قريباً.",
      ],
    lang === "en"
      ? "⬇️ Please send your project details in one message now ⬇️"
      : "⬇️ يرجى إرسال تفاصيل مشروعك في رسالة واحدة الآن ⬇️"
  );
}

function confirmationCard(lang) {
  return buildCard(
    lang === "en" ? "♦️ ❨ REQUEST RECEIVED ❩ ♦️" : "♦️ ❨ تـــم اسـتـلام طـلـبـــك ❩ ♦️",
    lang === "en"
      ? [
        "💡 Thank you! Your request was sent to the responsible team.",
        "💡 The project details will be reviewed for pricing and timeline.",
        "💡 You will receive a response here in the bot soon.",
      ]
      : [
        "💡 شكراً لك! تم إرسال طلبك إلى القسم المختص بنجاح.",
        "💡 ستتم مراجعة تفاصيل المشروع وتحديد التكلفة والمدة.",
        "💡 سيتم الرد عليك هنا عبر البوت في أقرب وقت ممكن.",
      ],
    lang === "en"
      ? "⬇️ You can return to main menu or browse other services ⬇️"
      : "⬇️ يمكنك العودة للقائمة الرئيسية أو تصفح باقي الخدمات ⬇️"
  );
}

function categoryLabel(lang, category) {
  return lang === "en" ? category.name_en : category.name_ar;
}

function subLabel(lang, sub) {
  return lang === "en" ? sub.en : sub.ar;
}

function mainKeyboard(lang) {
  const rows = MAIN_ORDER.map((key) => {
    const category = DIGITAL_CATALOG[key];
    return [{ text: categoryLabel(lang, category), callback_data: `ds:cat:${key}` }];
  });
  rows.push([{ text: txt(lang, "↩️ Back to Main Menu", "🔙 عودة للقائمة الرئيسية"), callback_data: "menu:main" }]);
  return { inline_keyboard: rows };
}

function categoryKeyboard(lang, categoryKey) {
  const category = DIGITAL_CATALOG[categoryKey];
  const rows = (category?.subcategories || []).map((item) => ([
    { text: subLabel(lang, item), callback_data: `ds:sub:${categoryKey}:${item.key}` },
  ]));
  rows.push([{ text: txt(lang, "🔙 Back", "🔙 رجوع"), callback_data: "service:other_services" }]);
  return { inline_keyboard: rows };
}

function cardForCategory(lang, categoryKey) {
  const category = DIGITAL_CATALOG[categoryKey];
  if (!category) return mainCard(lang);
  return buildCard(
    lang === "en" ? category.card_title_en : category.card_title_ar,
    lang === "en" ? category.lines_en : category.lines_ar,
    lang === "en" ? category.footer_en : category.footer_ar
  );
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

function buildAdminRequestText(user, lang, categoryName, subName, details) {
  const fullName = escapeHtml(user.firstName || "User");
  const username = user.username ? `@${escapeHtml(user.username)}` : "-";
  return [
    "🔴 <b>طلب خدمة رقمية جديد</b> 🔴",
    FRAME,
    `👤 العميل: ${fullName} (${username})`,
    `🆔 الآيدي: <code>${user.userId}</code>`,
    "",
    `📂 القسم الرئيسي: ${escapeHtml(categoryName)}`,
    `📌 الخدمة الفرعية: ${escapeHtml(subName)}`,
    "",
    "📝 وصف العميل للمشروع:",
    `"${escapeHtml(details)}"`,
    FRAME,
  ].join("\n");
}

async function sendDigitalServicesHome(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  clearUserState(user.userId);
  return sendOrEditMessage(
    bot,
    chatId,
    mainCard(lang),
    mainKeyboard(lang),
    options.messageId,
    "digital.home"
  );
}

async function sendCategoryMenu(bot, chatId, user, categoryKey, options = {}) {
  const lang = getUserLang(user);
  const category = DIGITAL_CATALOG[categoryKey];
  if (!category) {
    return sendDigitalServicesHome(bot, chatId, user, options);
  }

  setUserState(user.userId, "DIGITAL_CATEGORY_SELECTED", { categoryKey });

  return sendOrEditMessage(
    bot,
    chatId,
    cardForCategory(lang, categoryKey),
    categoryKeyboard(lang, categoryKey),
    options.messageId,
    "digital.category"
  );
}

async function sendDetailsPrompt(bot, chatId, user, categoryKey, subKey, options = {}) {
  const lang = getUserLang(user);
  const category = DIGITAL_CATALOG[categoryKey];
  const sub = category?.subcategories?.find((item) => item.key === subKey);
  if (!category || !sub) {
    return sendDigitalServicesHome(bot, chatId, user, options);
  }

  setUserState(user.userId, "DIGITAL_AWAIT_PROJECT_DETAILS", {
    categoryKey,
    subKey,
    categoryNameAr: category.name_ar,
    categoryNameEn: category.name_en,
    subNameAr: sub.ar,
    subNameEn: sub.en,
  });

  return sendOrEditMessage(
    bot,
    chatId,
    detailsCard(lang),
    {
      inline_keyboard: [
        [{ text: txt(lang, "🔙 Back", "🔙 رجوع"), callback_data: `ds:cat:${categoryKey}` }],
      ],
    },
    options.messageId,
    "digital.detailsPrompt"
  );
}

async function handleDigitalServicesCallback(bot, query, appStore) {
  try {
    const data = String(query.data || "");
    if (!data.startsWith("ds:") && data !== "service:other_services" && !data.startsWith("service_menu:other_services:")) {
      return false;
    }

    await safeTelegramCall("digital.cb.answer", () => bot.answerCallbackQuery(query.id));

    const user = appStore.getOrCreateUser(query.from);
    const lang = getUserLang(user);
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (data === "service:other_services") {
      await sendDigitalServicesHome(bot, chatId, user, { messageId });
      return true;
    }

    if (data.startsWith("service_menu:other_services:item:")) {
      const idx = Number(data.split(":")[3]);
      const indexMap = ["telegram_bots", "web_dev", "app_dev", "graphic_design", "security", "seo_marketing"];
      const categoryKey = indexMap[idx];
      if (!categoryKey) {
        await sendDigitalServicesHome(bot, chatId, user, { messageId });
        return true;
      }
      await sendCategoryMenu(bot, chatId, user, categoryKey, { messageId });
      return true;
    }

    if (data === "service_menu:other_services:custom_request") {
      await sendCategoryMenu(bot, chatId, user, "custom", { messageId });
      return true;
    }

    if (data.startsWith("ds:cat:")) {
      const categoryKey = data.split(":")[2];
      await sendCategoryMenu(bot, chatId, user, categoryKey, { messageId });
      return true;
    }

    if (data.startsWith("ds:sub:")) {
      const [, , categoryKey, subKey] = data.split(":");
      await sendDetailsPrompt(bot, chatId, user, categoryKey, subKey, { messageId });
      return true;
    }

    if (data.startsWith("ds:reply:")) {
      const targetUserId = Number(data.split(":")[2]);
      if (!isAdmin(query.from.id)) {
        await safeTelegramCall("digital.reply.notAdmin", () =>
          bot.answerCallbackQuery(query.id, {
            text: txt(lang, "Admins only", "هذا الزر للإدارة فقط"),
            show_alert: true,
          })
        );
        return true;
      }

      setUserState(query.from.id, "DIGITAL_ADMIN_AWAIT_REPLY", { targetUserId });
      await safeTelegramCall("digital.reply.prompt", () =>
        bot.sendMessage(query.from.id, "Enter the message you want to send to the user:")
      );
      return true;
    }

    if (data.startsWith("ds:userreply:")) {
      const adminId = Number(data.split(":")[2]);
      setUserState(user.userId, "DIGITAL_USER_AWAIT_REPLY_TO_ADMIN", { adminId });
      await safeTelegramCall("digital.userreply.prompt", () =>
        bot.sendMessage(chatId, txt(lang, "Please type your reply to admin in one message.", "يرجى كتابة ردك للإدارة في رسالة واحدة."))
      );
      return true;
    }

    return true;
  } catch (error) {
    logBotError("handleDigitalServicesCallback", error, { userId: query.from?.id, data: query.data });
    return true;
  }
}

async function handleDigitalServicesTextInput(bot, msg, appStore) {
  try {
    const user = appStore.getOrCreateUser(msg.from);
    const lang = getUserLang(user);
    const state = getUserState(user.userId);
    if (!state) return false;

    const text = String(msg.text || msg.caption || "").trim();
    const hasVoice = Boolean(msg.voice);
    if (!text && !hasVoice) return false;

    if (state.name === "DIGITAL_AWAIT_PROJECT_DETAILS") {
      const categoryName = lang === "en" ? state.categoryNameEn : state.categoryNameAr;
      const subName = lang === "en" ? state.subNameEn : state.subNameAr;
      const detailsText = text || txt(lang, "Voice note attached below.", "تم إرفاق رسالة صوتية بالأسفل.");

      const adminMessage = buildAdminRequestText(
        user,
        lang,
        categoryName,
        subName,
        detailsText
      );

      await safeTelegramCall("digital.forward.admin", () =>
        bot.sendMessage(ADMIN_CHANNEL_ID, adminMessage, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "💬 تواصل مع العميل / Reply to User", callback_data: `ds:reply:${user.userId}` }]],
          },
        })
      );

      if (hasVoice) {
        await safeTelegramCall("digital.forward.admin.voice", () =>
          bot.forwardMessage(ADMIN_CHANNEL_ID, msg.chat.id, msg.message_id)
        );
      }

      clearUserState(user.userId);
      await safeTelegramCall("digital.user.confirm", () =>
        bot.sendMessage(msg.chat.id, confirmationCard(lang), {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "🔙 العودة للقائمة الرئيسية", callback_data: "menu:main" }]],
          },
        })
      );
      return true;
    }

    if (state.name === "DIGITAL_ADMIN_AWAIT_REPLY") {
      if (!isAdmin(user.userId)) {
        clearUserState(user.userId);
        return true;
      }

      if (!text) {
        await safeTelegramCall("digital.admin.reply.requireText", () =>
          bot.sendMessage(msg.chat.id, "Please type your reply as text.")
        );
        return true;
      }

      const targetUserId = Number(state.targetUserId);
      await safeTelegramCall("digital.admin.sendReply", () =>
        bot.sendMessage(
          targetUserId,
          `📩 رسالة من الإدارة بخصوص طلبك:\n\n${text}`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "💬 رد على الإدارة", callback_data: `ds:userreply:${user.userId}` }]],
            },
          }
        )
      );

      clearUserState(user.userId);
      await safeTelegramCall("digital.admin.done", () =>
        bot.sendMessage(user.userId, "✅ Message sent to user.")
      );
      return true;
    }

    if (state.name === "DIGITAL_USER_AWAIT_REPLY_TO_ADMIN") {
      if (!text) {
        await safeTelegramCall("digital.user.reply.requireText", () =>
          bot.sendMessage(msg.chat.id, txt(lang, "Please type your reply as text.", "يرجى كتابة ردك كنص."))
        );
        return true;
      }

      const adminId = Number(state.adminId);
      await safeTelegramCall("digital.user.sendBack", () =>
        bot.sendMessage(
          adminId,
          [
            "📨 Reply from user",
            `👤 ${escapeHtml(user.firstName || "User")} (@${escapeHtml(user.username || "-")})`,
            `🆔 <code>${user.userId}</code>`,
            "",
            escapeHtml(text),
          ].join("\n"),
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "💬 تواصل مع العميل / Reply to User", callback_data: `ds:reply:${user.userId}` }]],
            },
          }
        )
      );

      clearUserState(user.userId);
      await safeTelegramCall("digital.user.reply.done", () =>
        bot.sendMessage(msg.chat.id, txt(lang, "✅ Your reply was delivered to admin.", "✅ تم إرسال ردك إلى الإدارة."))
      );
      return true;
    }

    return false;
  } catch (error) {
    logBotError("handleDigitalServicesTextInput", error, { userId: msg.from?.id });
    return false;
  }
}

module.exports = {
  sendDigitalServicesHome,
  handleDigitalServicesCallback,
  handleDigitalServicesTextInput,
};
