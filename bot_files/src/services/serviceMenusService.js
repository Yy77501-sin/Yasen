const {
  getVirtualNumbersKeyboard,
  getVirtualNumbersServerSelectionKeyboard,
  getVirtualNumbersProviderAppsKeyboard,
  getVirtualNumbersCountriesKeyboard,
  getVirtualNumberCountryDetailsKeyboard,
  getSocialBoostPlatformsKeyboard,
  getSocialBoostCategoriesKeyboard,
  getSocialBoostServicesKeyboard,
  getSocialBoostServiceDetailsKeyboard,
  getProMainKeyboard,
  getProSubcategoryKeyboard,
  getSocialAccountsCategoriesKeyboard,
  getSocialAccountsPlatformsKeyboard,
  getCloudServicesKeyboard,
  getTemporaryEmailsKeyboard,
  getTempEmailActionsKeyboard,
  getVirtualVisaKeyboard,
  getGameTopupKeyboard,
  getOtherServicesKeyboard,
} = require("../keyboards/serviceMenusKeyboard");
const { sendOrEditMessage } = require("./profileService");
const { safeTelegramCall } = require("./telegramSafe");
const { logBotError } = require("./errorLogger");
const { getGrizzlyVirtualNumberCatalog, paginateVirtualNumberCountries, getServicePrices, extractPrice } = require("./grizzlyService");
const { getCachedSmmServiceById, createSmmOrder } = require("./smmCacheService");
const { smmServices, getPlatform, getCategory, getServiceInfo } = require("../constants/smmServices");
const { getUserLang, getArray, t } = require("../locales");
const { escapeHtml, formatRuble } = require("../utils/formatters");
const { getUserState, setUserState, clearUserState } = require("./stateStore");
const { buildVaultxServiceCard } = require("../utils/serviceHeroCards");

function buildCard(frame, title, lines, footer) {
  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    frame,
    title,
    ...lines,
    frame,
    footer,
  ].join("\n");
}

async function sendVirtualNumbersMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "virtual_numbers"),
    getVirtualNumbersKeyboard(lang),
    options.messageId,
    "sendVirtualNumbersMenu"
  );
}

async function sendVirtualNumbersServerSelectionMenu(bot, chatId, user, appName, options = {}) {
  const lang = getUserLang(user);
  const text = [`📱 <b>${t(lang, "virtualNumbers_choose_server_title")}</b>`, "", `${t(lang, "virtualNumbers_selected_app_label")} <b>${escapeHtml(appName)}</b>`].join("\n");
  return sendOrEditMessage(bot, chatId, text, getVirtualNumbersServerSelectionKeyboard(appName, lang), options.messageId, "sendVirtualNumbersServerSelectionMenu");
}

async function sendVirtualNumbersOffersMenu(bot, chatId, user, offerKey, options = {}) {
  const lang = getUserLang(user);
  const appName = offerKey === "wa" ? "WhatsApp" : "Telegram";
  const serviceCode = require("../constants/grizzly").getGrizzlyServiceCode(appName);
  if (!serviceCode) {
    return sendOrEditMessage(bot, chatId, t(lang, "virtualNumbers_offer_error"), { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] }, options.messageId, "sendVirtualNumbersOffersMenu.error");
  }

  const providerKeys = ["server1", "server2"];
  const entries = [];

  await Promise.all(providerKeys.map(async (providerKey) => {
    const prices = await getServicePrices(serviceCode, providerKey);
    if (!prices || typeof prices !== "object") return;

    Object.keys(prices).forEach((countryId) => {
      const apiPrice = extractPrice(prices, countryId, serviceCode);
      if (!Number.isFinite(apiPrice) || apiPrice <= 0) return;

      const finalPrice = Math.ceil(parseFloat(apiPrice) * 25 * 1.2);
      const countryData = require("../constants/grizzly").getGrizzlyCountryMeta(countryId);
      entries.push({
        providerKey,
        countryId,
        countryName: lang === "ar" ? countryData.name_ar : t(lang, `grizzly_country_${countryId}`) || countryData.name_ar,
        flag: countryData.flag,
        finalPrice,
      });
    });
  }));

  const cheapest = entries.sort((a, b) => a.finalPrice - b.finalPrice).slice(0, 6);
  const text = [`📈 <b>${t(lang, "virtualNumbers_offers_title").replace("{app}", appName)}</b>`, "", ...cheapest.map((item) => `${item.flag} ${item.countryName} — ${item.finalPrice} RUB — ${t(lang, item.providerKey === "server1" ? "virtualNumbers_server1" : "virtualNumbers_server2")}`)].join("\n");
  return sendOrEditMessage(bot, chatId, text || t(lang, "virtualNumbers_offer_empty"), { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] }, options.messageId, "sendVirtualNumbersOffersMenu");
}

async function sendVirtualNumbersProviderMenu(bot, chatId, user, providerKey, pageIndex, options = {}) {
  const lang = getUserLang(user);
  const topApps = getArray(lang, "virtualNumbers_topApps");
  const pages = [topApps, ...getArray(lang, "virtualNumbers_otherPages")];
  const safeIndex = Math.max(0, Math.min(pageIndex, pages.length - 1));
  const providerLabel = providerKey === "server1" ? t(lang, "virtualNumbers_server1") : t(lang, "virtualNumbers_server2");
  const text = `${t(lang, "virtualNumbers_inst")}\n\n${providerLabel}\n${safeIndex + 1}/${pages.length}`;
  return sendOrEditMessage(bot, chatId, text, getVirtualNumbersProviderAppsKeyboard(pages[safeIndex] || [], providerKey, safeIndex, pages.length, lang), options.messageId, "sendVirtualNumbersProviderMenu");
}

function buildVirtualNumbersCountriesText(lang, appName, countriesPage) {
  const lines = [
    `📱 <b>${t(lang, "grizzly_available_prices_title")}</b>`,
    "",
    `${t(lang, "grizzly_label_app")} : <b>${escapeHtml(appName)}</b>`,
    `${t(lang, "grizzly_label_page")} : ${countriesPage.pageIndex + 1}/${countriesPage.totalPages}`,
    `${t(lang, "grizzly_label_countries")} : ${countriesPage.totalItems}`,
  ];

  if (countriesPage.items.length) {
    lines.push("", t(lang, "grizzly_label_select_country"));
  }

  return lines.join("\n");
}

function buildVirtualNumberCountryDetailsText(lang, appName, country) {
  const countryLabel = lang === "ar" ? country.name_ar : t(lang, `grizzly_country_${country.id}`) || country.name_ar;
  return [
    `📱 <b>${t(lang, "grizzly_selected_title")}</b>`,
    "",
    `${t(lang, "grizzly_service_label")} : <b>${escapeHtml(appName)}</b>`,
    `${t(lang, "grizzly_label_country")} : ${country.flag} ${escapeHtml(countryLabel)}`,
    `${t(lang, "grizzly_label_stock")} : <b>${country.availableCount}</b>`,
    `${t(lang, "grizzly_label_supplier")} : <code>${country.supplierPrice} RUB</code>`,
    `${t(lang, "grizzly_label_final_price")} : <code>${country.sellPrice} RUB</code>`,
    "",
    t(lang, "grizzly_selected_note"),
  ].join("\n");
}

async function sendVirtualNumbersCountriesMenu(bot, chatId, user, appName, pageIndex, options = {}) {
  const lang = getUserLang(user);

  try {
    const catalog = await getGrizzlyVirtualNumberCatalog(appName, { baseMarkup: options.baseMarkup });

    if (!catalog.serviceCode) {
      const unsupportedText = lang === "ar"
        ? `📱 <b>Grizzly SMS</b>\n\nالتطبيق <b>${escapeHtml(appName)}</b> غير مدعوم حالياً ضمن خريطة الخدمات الحالية.`
        : `📱 <b>Grizzly SMS</b>\n\nThe app <b>${escapeHtml(appName)}</b> is not currently mapped to a Grizzly service code.`;
      return sendOrEditMessage(bot, chatId, unsupportedText, { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] }, options.messageId, "sendVirtualNumbersCountriesMenu.unsupported");
    }

    if (!catalog.countries.length) {
      const emptyText = lang === "ar"
        ? `📱 <b>${escapeHtml(appName)}</b>\n\nلا توجد أسعار متاحة حالياً من Grizzly لهذا التطبيق.`
        : `📱 <b>${escapeHtml(appName)}</b>\n\nThere are no currently available Grizzly prices for this app.`;
      return sendOrEditMessage(bot, chatId, emptyText, { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] }, options.messageId, "sendVirtualNumbersCountriesMenu.empty");
    }

    const countriesPage = paginateVirtualNumberCountries(catalog.countries, pageIndex);
    return sendOrEditMessage(bot, chatId, buildVirtualNumbersCountriesText(lang, appName, countriesPage), getVirtualNumbersCountriesKeyboard(appName, countriesPage.items, countriesPage.pageIndex, countriesPage.totalPages, lang), options.messageId, "sendVirtualNumbersCountriesMenu");
  } catch (error) {
    logBotError("sendVirtualNumbersCountriesMenu", error, { appName, userId: user?.userId });
    const errorText = lang === "ar"
      ? "تعذر جلب الأسعار من Grizzly حالياً. حاول مرة أخرى بعد قليل."
      : "Failed to load Grizzly prices right now. Please try again shortly.";
    return sendOrEditMessage(bot, chatId, errorText, { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]] }, options.messageId, "sendVirtualNumbersCountriesMenu.error");
  }
}

async function sendVirtualNumberCountryDetails(bot, chatId, user, appName, countryId, pageIndex, options = {}) {
  const lang = getUserLang(user);

  try {
    const catalog = await getGrizzlyVirtualNumberCatalog(appName, { baseMarkup: options.baseMarkup });
    const country = catalog.countries.find((item) => item.id === String(countryId));

    if (!country) {
      return sendVirtualNumbersCountriesMenu(bot, chatId, user, appName, pageIndex, options);
    }

    return sendOrEditMessage(bot, chatId, buildVirtualNumberCountryDetailsText(lang, appName, country), getVirtualNumberCountryDetailsKeyboard(appName, country.id, pageIndex, lang), options.messageId, "sendVirtualNumberCountryDetails");
  } catch (error) {
    logBotError("sendVirtualNumberCountryDetails", error, { appName, countryId, userId: user?.userId });
    return sendVirtualNumbersCountriesMenu(bot, chatId, user, appName, pageIndex, options);
  }
}

function getSocialBoostLabel(lang, item) {
  return lang === "ar" ? item.label_ar : item.label_en;
}

function getSocialBoostServiceName(lang, serviceInfo, cached) {
  return lang === "ar" ? cached?.nameAr || serviceInfo.service.name_ar : cached?.nameEn || serviceInfo.service.name_en;
}

function getSocialBoostFallback(lang, key) {
  if (key === "socialBoost_drop_default") return "0%";
  return lang === "ar" ? "غير معروف" : "Unknown";
}

function getSocialBoostMetricValue(lang, value, fallbackKey = "socialBoost_unknown") {
  if (value === null || value === undefined || value === "") return getSocialBoostFallback(lang, fallbackKey);
  return String(value);
}

function getSocialBoostQuality(lang, cached) {
  const mapAr = { high: "عالية", medium: "متوسطة", low: "منخفضة", fast: "سريعة" };
  const mapEn = { high: "High", medium: "Medium", low: "Low", fast: "Fast" };
  const map = lang === "ar" ? mapAr : mapEn;
  return map[cached?.quality] || map.medium;
}

function getSocialBoostRefill(lang, cached) {
  const yes = lang === "ar" ? "متاح" : "Available";
  const no = lang === "ar" ? "غير متاح" : "Unavailable";
  if (cached?.refill === true) return yes;
  if (cached?.refill === false) return no;
  if (cached?.refillStatus === "available") return yes;
  if (cached?.refillStatus === "unavailable") return no;
  return getSocialBoostMetricValue(lang, cached?.refillStatus);
}

function buildSocialBoostPlatformsText(lang) {
  if (lang === "ar") {
    return [
      "🔴 خدمة الرشق لجميع منصات التواصل الاجتماعي",
      "•────────────•",
      "✅ تساعدك في زيادة متابعين وتفاعلات صفحتك",
      "✅ خدمات متابعين، لايكات، مشاهدات",
      "✅ أسعار مناسبة وتفاوت حسب الجودة والسرعة",
      "•────────────•",
      "“ 🧑‍🎤 الرجاء اختيار البرنامج المراد الرشق منه: 🔴 ”",
    ].join("\n");
  }
  return [
    "🔴 Boost service for all social platforms",
    "•────────────•",
    "✅ Grow followers and engagement quickly",
    "✅ Followers, likes and views services",
    "✅ Fair pricing by quality and speed",
    "•────────────•",
    "“ 🧑‍🎤 Choose the app you want to boost: 🔴 ”",
  ].join("\n");
}

function buildSocialBoostCategoriesText(lang, platform) {
  if (lang === "ar") {
    return buildCard(
      "━━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ نـوع الـخـدمـــة الـمـطـلـوبـــة ❩ ♦️",
      [
        "💡 تختلف الخدمات المتاحة حسب المنصة المختارة.",
        "💡 نوفر زيادة للمتابعين، المشاهدات، والتفاعلات.",
        "💡 اختر نوع التفاعل الذي ترغب بإضافته لحسابك.",
      ],
      "⬇️ يرجى تحديد نوع الخدمة من القائمة أدناه ⬇️"
    );
  }
  return buildCard(
    "━━━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ REQUIRED SERVICE TYPE ❩ ♦️",
    [
      "💡 Available services vary by selected platform.",
      "💡 We provide followers, views, and engagement boosts.",
      "💡 Choose the interaction type you need for your account.",
    ],
    "⬇️ Please select the service type below ⬇️"
  );
}

function buildSocialBoostServicesText(lang, platform, category) {
  if (lang === "ar") {
    return buildCard(
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ جـــودة الـخـدمـــة والأسـعـــار ❩ ♦️",
      [
        "💡 باقات بضمان تعويض النقص وأخرى بدون ضمان.",
        "💡 الجودة العالية تضمن استقرار وسرعة التنفيذ.",
        "💡 السعر الموضح في الأزرار هو لكل 1 تفاعل.",
      ],
      "⬇️ يرجى اختيار جودة الخدمة المناسبة لميزانيتك ⬇️"
    );
  }
  return buildCard(
    "━━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ SERVICE QUALITY & PRICING ❩ ♦️",
    [
      "💡 Some packages include refill warranty and some do not.",
      "💡 Higher quality improves stability and delivery speed.",
      "💡 Price shown in buttons is for each 1 interaction.",
    ],
    "⬇️ Please select the quality tier for your budget ⬇️"
  );
}

function buildSocialBoostDetailText(lang, payload) {
  if (lang === "ar") {
    return buildCard(
      "━━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ تـفـاصـيـــل الـطـلـــب والـرابـــط ❩ ♦️",
      [
        `📌 الخدمة: ${escapeHtml(payload.serviceName)} | 💎 الجودة: ${escapeHtml(payload.quality)}`,
        `💰 السعر: ${escapeHtml(payload.pricePerOne)} لكل 1 | 🛑 الحد الأدنى: ${escapeHtml(String(payload.min))}`,
        "💡 تأكد أن الحساب (عام) وليس (خاص/Private).",
      ],
      "⬇️ يرجى أرسال رابط حسابك ⬇️"
    );
  }
  return buildCard(
    "━━━━━━━━━━━━━━━━━━━",
    "♦️ ❨ ORDER DETAILS & LINK ❩ ♦️",
    [
      `📌 Service: ${escapeHtml(payload.serviceName)} | 💎 Quality: ${escapeHtml(payload.quality)}`,
      `💰 Price: ${escapeHtml(payload.pricePerOne)} per 1 | 🛑 Min: ${escapeHtml(String(payload.min))}`,
      "💡 Make sure the account is Public (not Private).",
    ],
    "⬇️ Please send your account link ⬇️"
  );
}

async function sendSocialBoostMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "social_boost"),
    getSocialBoostPlatformsKeyboard(smmServices, lang),
    options.messageId,
    "sendSocialBoostMenu"
  );
}

async function sendSocialBoostCategoriesMenu(bot, chatId, user, platformKey, options = {}) {
  const lang = getUserLang(user);
  const platform = getPlatform(platformKey);

  if (!platform) {
    return sendOrEditMessage(bot, chatId, t(lang, "smm_invalid_platform"), { inline_keyboard: [[{ text: t(lang, "socialBoost_btn_back"), callback_data: "service:social_boost" }]] }, options.messageId, "sendSocialBoostCategoriesMenu.error");
  }

  return sendOrEditMessage(
    bot,
    chatId,
    buildSocialBoostCategoriesText(lang, platform),
    getSocialBoostCategoriesKeyboard(platform, lang),
    options.messageId,
    "sendSocialBoostCategoriesMenu"
  );
}

async function sendSocialBoostServicesMenu(bot, chatId, user, platformKey, categoryKey, options = {}) {
  const lang = getUserLang(user);
  const platform = getPlatform(platformKey);
  const category = getCategory(platformKey, categoryKey);

  if (!platform || !category) {
    return sendOrEditMessage(bot, chatId, t(lang, "smm_invalid_category"), { inline_keyboard: [[{ text: t(lang, "socialBoost_btn_back"), callback_data: `service_menu:social_boost:platform:${platformKey}` }]] }, options.messageId, "sendSocialBoostServicesMenu.error");
  }

  const serviceButtons = category.services.map((service) => {
    const serviceInfo = getServiceInfo(service.id);
    const cached = getCachedSmmServiceById(service.id);
    if (!serviceInfo || !cached) return null;

    const serviceName = getSocialBoostServiceName(lang, serviceInfo, cached);
    const unitPrice = cached.pricePerUnitRubFormatted || (Number.isFinite(cached.pricePerUnitRub) ? Number(cached.pricePerUnitRub).toFixed(4) : null);
    if (!unitPrice) return null;

    return {
      text: `🟢 ${serviceName} < ( ${unitPrice} ₽ )`,
      callback_data: `service_menu:social_boost:service:${platformKey}:${categoryKey}:${service.id}`,
    };
  }).filter(Boolean);

  if (!serviceButtons.length) {
    const emptyText = lang === "ar"
      ? "لا توجد خدمات مضافة لهذه الفئة بعد.\nيمكنك إضافتها لاحقًا من المزود."
      : "No services are configured for this category yet.\nYou can add them later.";
    return sendOrEditMessage(
      bot,
      chatId,
      emptyText,
      {
        inline_keyboard: [
          [{ text: lang === "ar" ? "• ✖ رجوع •" : "• ✖ Back •", callback_data: `service_menu:social_boost:platform:${platformKey}` }],
          [{ text: lang === "ar" ? "• 🏠 الصفحة الرئيسية •" : "• 🏠 Main Page •", callback_data: "menu:main" }],
        ],
      },
      options.messageId,
      "sendSocialBoostServicesMenu.empty"
    );
  }

  return sendOrEditMessage(bot, chatId, buildSocialBoostServicesText(lang, platform, category), getSocialBoostServicesKeyboard(serviceButtons, platformKey, categoryKey, lang), options.messageId, "sendSocialBoostServicesMenu");
}

async function sendSocialBoostServiceDetails(bot, chatId, user, platformKey, categoryKey, serviceId, options = {}) {
  const lang = getUserLang(user);
  const serviceInfo = getServiceInfo(serviceId);
  const cached = getCachedSmmServiceById(serviceId);

  if (!serviceInfo || !cached) {
    return sendOrEditMessage(bot, chatId, t(lang, "smm_service_not_found"), { inline_keyboard: [[{ text: t(lang, "socialBoost_btn_back"), callback_data: `service_menu:social_boost:category:${platformKey}:${categoryKey}` }]] }, options.messageId, "sendSocialBoostServiceDetails.error");
  }

  const serviceName = getSocialBoostServiceName(lang, serviceInfo, cached);
  const pricePer1000 = cached.pricePer1000RubFormatted
    || (Number.isFinite(cached.pricePer1000Rub) ? Number(cached.pricePer1000Rub).toFixed(4) : getSocialBoostFallback(lang, "socialBoost_unknown"));
  const unitPriceValue = Number(cached?.pricePerUnitRub || 0);
  const pricePerOne = Number.isFinite(unitPriceValue) && unitPriceValue > 0
    ? `${unitPriceValue.toFixed(4)} ₽`
    : "0.0000 ₽";
  const qualityLabel = getSocialBoostQuality(lang, cached);
  const minValue = Number(cached?.min || 0) || 0;
  const detailRows = [
    { label: lang === "ar" ? "💰 - السعر / 1k :" : "💰 - Price / 1k :", value: `${pricePer1000}` },
    { label: lang === "ar" ? "🚀 - السرعة :" : "🚀 - Speed :", value: getSocialBoostMetricValue(lang, cached.speed) },
    { label: lang === "ar" ? "🏁 - التعبئة :" : "🏁 - Refill :", value: getSocialBoostRefill(lang, cached) },
    { label: lang === "ar" ? "🛡 - الجودة :" : "🛡 - Quality :", value: getSocialBoostQuality(lang, cached) },
    { label: lang === "ar" ? "🌀 - النزول :" : "🌀 - Drop :", value: getSocialBoostMetricValue(lang, cached.dropRate, "socialBoost_drop_default") },
    { label: lang === "ar" ? "📍 - الحد الأدنى :" : "📍 - Min :", value: getSocialBoostMetricValue(lang, cached.min) },
    { label: lang === "ar" ? "🟢 - الحد الأقصى :" : "🟢 - Max :", value: getSocialBoostMetricValue(lang, cached.max) },
    { label: lang === "ar" ? "⏰ - الوقت :" : "⏰ - Time :", value: getSocialBoostMetricValue(lang, cached.startTime) },
  ];

  setUserState(user.userId, "SMM_AWAIT_LINK", { platformKey, categoryKey, serviceId: String(serviceId) });

  return sendOrEditMessage(
    bot,
    chatId,
    buildSocialBoostDetailText(lang, {
      serviceName,
      quality: qualityLabel,
      pricePerOne,
      min: minValue,
    }),
    getSocialBoostServiceDetailsKeyboard(detailRows, `service_menu:social_boost:category:${platformKey}:${categoryKey}`, lang),
    options.messageId,
    "sendSocialBoostServiceDetails"
  );
}

function isValidBoostLink(value) {
  const text = String(value || "").trim();
  return /^https?:\/\/\S+$/i.test(text) || /^@\w{3,}$/i.test(text);
}

function buildAwaitQuantityText(lang, payload) {
  if (lang === "ar") {
    return [
      `الحساب: ${payload.link}`,
      "",
      `🪴 يرجى إرسال عدد الأعضاء، تذكر أقل عدد للطلب ${payload.min} وأقصى عدد للطلب ${payload.max}`,
      "",
      `👤 سعر العضو الواحد: ${payload.unitPrice} 🪙`,
      "",
      `🏆 يمكنك رشق ${payload.max} 👥`,
    ].join("\n");
  }

  return [
    `Account: ${payload.link}`,
    "",
    `🪴 Send quantity. Min ${payload.min}, max ${payload.max}`,
    "",
    `👤 Unit price: ${payload.unitPrice} 🪙`,
    "",
    `🏆 Max available: ${payload.max} 👥`,
  ].join("\n");
}

function buildExecutionText(lang, payload) {
  if (lang === "ar") {
    return [
      "📋 ملخص العملية: 👇",
      "",
      `🕵🏻 النوع: ${payload.serviceName}`,
      `🪴 الحساب: ${payload.link}`,
      `📗 العدد المطلوب: [${payload.quantity}] ✅`,
      `🗼 الضمان: ${payload.refill}`,
      `💰 السعر: ${payload.total} 🪙`,
      `💳 رصيدك الآن: ${payload.currentBalance}`,
      `🏆 رصيدك بعد الخصم: ${payload.afterBalance}`,
      "",
      payload.statusLine,
    ].join("\n");
  }

  return [
    "📋 Order summary: 👇",
    "",
    `🕵🏻 Type: ${payload.serviceName}`,
    `🪴 Account: ${payload.link}`,
    `📗 Quantity: [${payload.quantity}] ✅`,
    `🗼 Refill: ${payload.refill}`,
    `💰 Price: ${payload.total} 🪙`,
    `💳 Current balance: ${payload.currentBalance}`,
    `🏆 Balance after charge: ${payload.afterBalance}`,
    "",
    payload.statusLine,
  ].join("\n");
}

async function handleSocialBoostTextInput(bot, msg, appStore) {
  try {
    const state = getUserState(msg.from.id);
    if (!state || !String(state.name || "").startsWith("SMM_AWAIT_")) {
      return false;
    }

    const user = appStore.getOrCreateUser(msg.from);
    const lang = getUserLang(user);
    const text = String(msg.text || "").trim();

    if (text.toLowerCase() === "cancel") {
      clearUserState(user.userId);
      await safeTelegramCall("handleSocialBoostTextInput.cancel", () =>
        bot.sendMessage(msg.chat.id, lang === "ar" ? "تم إلغاء العملية." : "Operation canceled.")
      );
      await sendSocialBoostMenu(bot, msg.chat.id, user);
      return true;
    }

    if (state.name === "SMM_AWAIT_LINK") {
      if (!isValidBoostLink(text)) {
        await safeTelegramCall("handleSocialBoostTextInput.invalidLink", () =>
          bot.sendMessage(msg.chat.id, lang === "ar" ? "❌ الرابط غير صالح، أرسل رابطًا عامًا صحيحًا." : "❌ Invalid link. Send a valid public link.")
        );
        return true;
      }

      const cached = getCachedSmmServiceById(state.serviceId);
      const min = Number(cached?.min || 10) || 10;
      const max = Number(cached?.max || 100000) || 100000;
      const unitPriceNum = Number(cached?.pricePerUnitRub || 0);
      const unitPrice = Number.isFinite(unitPriceNum) && unitPriceNum > 0 ? unitPriceNum.toFixed(4) : "0.0000";

      setUserState(user.userId, "SMM_AWAIT_QUANTITY", {
        platformKey: state.platformKey,
        categoryKey: state.categoryKey,
        serviceId: state.serviceId,
        link: text,
      });

      await safeTelegramCall("handleSocialBoostTextInput.awaitQty", () =>
        bot.sendMessage(msg.chat.id, buildAwaitQuantityText(lang, { link: text, min, max, unitPrice }), {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === "ar" ? "- رجوع" : "- Back", callback_data: `service_menu:social_boost:category:${state.platformKey}:${state.categoryKey}` }],
            ],
          },
        })
      );
      return true;
    }

    if (state.name === "SMM_AWAIT_QUANTITY") {
      if (!/^\d+$/.test(text)) {
        await safeTelegramCall("handleSocialBoostTextInput.invalidQtyType", () =>
          bot.sendMessage(msg.chat.id, lang === "ar" ? "❌ أرسل رقمًا صحيحًا فقط." : "❌ Send a valid number only.")
        );
        return true;
      }

      const quantity = Number(text);
      const cached = getCachedSmmServiceById(state.serviceId);
      const serviceInfo = getServiceInfo(state.serviceId);
      if (!cached || !serviceInfo) {
        clearUserState(user.userId);
        await safeTelegramCall("handleSocialBoostTextInput.missingService", () =>
          bot.sendMessage(msg.chat.id, lang === "ar" ? "الخدمة غير متاحة الآن." : "Service is unavailable now.")
        );
        return true;
      }

      const min = Number(cached.min || 1);
      const max = Number(cached.max || 100000);
      if (!Number.isFinite(quantity) || quantity < min || quantity > max) {
        await safeTelegramCall("handleSocialBoostTextInput.outOfRange", () =>
          bot.sendMessage(msg.chat.id, lang === "ar" ? `❌ العدد يجب أن يكون بين ${min} و ${max}.` : `❌ Quantity must be between ${min} and ${max}.`)
        );
        return true;
      }

      const unitPrice = Number(cached.pricePerUnitRub || 0);
      const total = Number((unitPrice * quantity).toFixed(4));
      const currentUser = appStore.findUserById(user.userId);
      const currentBalance = Number(currentUser?.balance || 0);
      const afterBalance = Number((currentBalance - total).toFixed(4));
      const serviceName = getSocialBoostServiceName(lang, serviceInfo, cached);
      const refill = getSocialBoostRefill(lang, cached);

      if (currentBalance < total) {
        await safeTelegramCall("handleSocialBoostTextInput.insufficient", () =>
          bot.sendMessage(
            msg.chat.id,
            buildExecutionText(lang, {
              serviceName,
              link: state.link,
              quantity,
              refill,
              total: formatRuble(total),
              currentBalance: formatRuble(currentBalance),
              afterBalance: formatRuble(afterBalance),
              statusLine: lang === "ar" ? "❌ للأسف لا يوجد لديك رصيد كافي 🥺" : "❌ Insufficient balance",
            }),
            {
              reply_markup: {
                inline_keyboard: [[{ text: lang === "ar" ? "- الغاء" : "- Cancel", callback_data: "social_boost:cancel" }]],
              },
            }
          )
        );
        return true;
      }

      const order = await createSmmOrder({
        serviceId: state.serviceId,
        link: state.link,
        quantity,
      });

      if (!order.success) {
        await safeTelegramCall("handleSocialBoostTextInput.providerError", () =>
          bot.sendMessage(
            msg.chat.id,
            buildExecutionText(lang, {
              serviceName,
              link: state.link,
              quantity,
              refill,
              total: formatRuble(total),
              currentBalance: formatRuble(currentBalance),
              afterBalance: formatRuble(currentBalance),
              statusLine: lang === "ar" ? "❌ فشل تنفيذ العملية من المزود، حاول مرة أخرى." : "❌ Provider failed to place order.",
            }),
            {
              reply_markup: {
                inline_keyboard: [[{ text: lang === "ar" ? "- الغاء" : "- Cancel", callback_data: "social_boost:cancel" }]],
              },
            }
          )
        );
        return true;
      }

      appStore.deductBalance(user.userId, total);
      appStore.incrementTransactions(user.userId);
      appStore.addProfit(total);
      appStore.addTransaction({
        type: "social_boost_order",
        userId: user.userId,
        serviceKey: "social_boost",
        platformKey: state.platformKey,
        categoryKey: state.categoryKey,
        serviceId: String(state.serviceId),
        link: state.link,
        quantity,
        amount: total,
        providerOrderId: String(order.orderId || ""),
      });

      const updated = appStore.findUserById(user.userId);
      clearUserState(user.userId);

      await safeTelegramCall("handleSocialBoostTextInput.success", () =>
        bot.sendMessage(
          msg.chat.id,
          buildExecutionText(lang, {
            serviceName,
            link: state.link,
            quantity,
            refill,
            total: formatRuble(total),
            currentBalance: formatRuble(currentBalance),
            afterBalance: formatRuble(updated?.balance || 0),
            statusLine: lang === "ar"
              ? `✅ تم تنفيذ العملية بنجاح | رقم الطلب: ${order.orderId}`
              : `✅ Order placed successfully | ID: ${order.orderId}`,
          }),
          {
            reply_markup: {
              inline_keyboard: [[{ text: lang === "ar" ? "- الصفحة الرئيسية" : "- Main Page", callback_data: "menu:main" }]],
            },
          }
        )
      );

      return true;
    }

    return false;
  } catch (error) {
    logBotError("handleSocialBoostTextInput", error, { userId: msg.from?.id });
    return false;
  }
}

async function sendProAccountsMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  const title = lang === "ar" ? "💎 حسابات Pro" : "💎 Pro Accounts";
  return sendOrEditMessage(bot, chatId, title, getProMainKeyboard(getArray(lang, "proAccounts_mainCategories"), lang), options.messageId, "sendProAccountsMenu");
}

async function sendProSubcategoryMenu(bot, chatId, user, subcategoryKey, options = {}) {
  const lang = getUserLang(user);
  const map = { ai: "proAccounts_ai", subscriptions: "proAccounts_subscriptions", verification: "proAccounts_verification" };
  const items = getArray(lang, map[subcategoryKey]);
  if (!items.length) return sendProAccountsMenu(bot, chatId, user, options);
  const title = lang === "ar" ? "💎 اختر القسم الفرعي" : "💎 Select Subcategory";
  return sendOrEditMessage(bot, chatId, title, getProSubcategoryKeyboard(items, subcategoryKey, lang), options.messageId, "sendProSubcategoryMenu");
}

async function sendSocialAccountsMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "social_accounts"),
    getSocialAccountsCategoriesKeyboard(getArray(lang, "socialAccounts_categories"), lang),
    options.messageId,
    "sendSocialAccountsMenu"
  );
}

async function sendSocialAccountsPlatformsMenu(bot, chatId, user, categoryKey, options = {}) {
  const lang = getUserLang(user);
  const title = lang === "ar" ? "👥 اختر المنصة" : "👥 Select Platform";
  return sendOrEditMessage(bot, chatId, title, getSocialAccountsPlatformsKeyboard(getArray(lang, "socialAccounts_platforms"), categoryKey, lang), options.messageId, "sendSocialAccountsPlatformsMenu");
}

async function sendServiceSelectionPlaceholder(bot, chatId, user, title, options = {}) {
  const lang = getUserLang(user);
  const text = [`<b>=== ${title} ===</b>`, "", t(lang, "common_placeholder_saved")].join("\n");
  const replyMarkup = { inline_keyboard: [[{ text: t(lang, "common_back"), callback_data: options.backCallback || "menu:main" }]] };

  if (options.messageId) {
    return safeTelegramCall("sendServiceSelectionPlaceholder.edit", () => bot.editMessageText(text, { chat_id: chatId, message_id: options.messageId, parse_mode: "HTML", reply_markup: replyMarkup }));
  }

  return safeTelegramCall("sendServiceSelectionPlaceholder.send", () => bot.sendMessage(chatId, text, { parse_mode: "HTML", reply_markup: replyMarkup }));
}

async function sendCloudServicesMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "cloud_services"),
    getCloudServicesKeyboard(getArray(lang, "cloudServices_items"), lang),
    options.messageId,
    "sendCloudServicesMenu"
  );
}

async function sendTemporaryEmailsMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "temporary_emails"),
    getTemporaryEmailsKeyboard(getArray(lang, "temporaryEmails_items"), lang),
    options.messageId,
    "sendTemporaryEmailsMenu"
  );
}

function buildMockTempEmailSession() {
  const token = Math.random().toString(36).slice(2, 8);
  const domains = ["1secmail.com", "vaultxmail.net", "tempmail.dev"];
  return { email: `test${token}@${domains[Math.floor(Math.random() * domains.length)]}`, refreshCount: 0, lastCode: null };
}

function buildTempEmailText(user, session, messages = []) {
  const lang = getUserLang(user);
  const lines = [`<b>${t(lang, "temporaryEmails_title")}</b>`, "", `${t(lang, "temporaryEmails_yourMail")} <code>${session.email}</code>`];
  if (messages.length) {
    lines.push("", `<b>${t(lang, "temporaryEmails_latest")}</b>`);
    for (const message of messages) {
      lines.push(`• From: ${message.from}`);
      lines.push(`• Subject: ${message.subject}`);
      lines.push(`• Code: <code>${message.code}</code>`);
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

async function sendTempEmailSession(bot, chatId, user, session, options = {}) {
  return sendOrEditMessage(bot, chatId, buildTempEmailText(user, session), getTempEmailActionsKeyboard(getUserLang(user)), options.messageId, "sendTempEmailSession");
}

function getMockTempEmailMessages(session) {
  session.refreshCount += 1;
  if (session.refreshCount % 2 !== 0) return [];
  const code = String(100000 + Math.floor(Math.random() * 900000));
  session.lastCode = code;
  return [{ from: "noreply@service.com", subject: "Verification Code", code }];
}

async function sendVirtualVisaMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "virtual_visa"),
    getVirtualVisaKeyboard(getArray(lang, "virtualVisa_items"), lang),
    options.messageId,
    "sendVirtualVisaMenu"
  );
}

async function sendGameTopupMenu(bot, chatId, user, pageIndex, options = {}) {
  const lang = getUserLang(user);
  const items = getArray(lang, "games_list");
  const totalPages = Math.ceil(items.length / 10);
  const safeIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
  const pageItems = items.slice(safeIndex * 10, safeIndex * 10 + 10);
  const text = `${lang === "ar" ? "🎮 شحن الألعاب" : "🎮 Game Top-up"}\n\n${safeIndex + 1}/${totalPages}`;
  return sendOrEditMessage(bot, chatId, text, getGameTopupKeyboard(pageItems, safeIndex, totalPages, lang), options.messageId, "sendGameTopupMenu");
}

async function sendOtherServicesMenu(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  const title = lang === "ar" ? "🧩 خدمات أخرى" : "🧩 Other Services";
  return sendOrEditMessage(bot, chatId, title, getOtherServicesKeyboard(getArray(lang, "otherServices_items"), lang), options.messageId, "sendOtherServicesMenu");
}

async function sendCustomServicePrompt(bot, chatId, user) {
  return safeTelegramCall("sendCustomServicePrompt", () => bot.sendMessage(chatId, t(getUserLang(user), "otherServices_prompt")));
}

module.exports = {
  sendVirtualNumbersMenu,
  sendVirtualNumbersProviderMenu,
  sendVirtualNumbersServerSelectionMenu,
  sendVirtualNumbersOffersMenu,
  sendVirtualNumbersCountriesMenu,
  sendVirtualNumberCountryDetails,
  sendSocialBoostMenu,
  sendSocialBoostCategoriesMenu,
  sendSocialBoostServicesMenu,
  sendSocialBoostServiceDetails,
  sendProAccountsMenu,
  sendProSubcategoryMenu,
  sendSocialAccountsMenu,
  sendSocialAccountsPlatformsMenu,
  sendServiceSelectionPlaceholder,
  sendCloudServicesMenu,
  sendTemporaryEmailsMenu,
  buildMockTempEmailSession,
  buildTempEmailText,
  sendTempEmailSession,
  getMockTempEmailMessages,
  sendVirtualVisaMenu,
  sendGameTopupMenu,
  sendOtherServicesMenu,
  sendCustomServicePrompt,
  handleSocialBoostTextInput,
};
