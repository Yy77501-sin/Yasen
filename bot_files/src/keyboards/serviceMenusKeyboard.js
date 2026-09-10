const { t } = require("../locales");

function chunkButtons(items, mapFn, perRow = 2) {
  const rows = [];
  for (let index = 0; index < items.length; index += perRow) {
    rows.push(items.slice(index, index + perRow).map((item, innerIndex) => mapFn(item, index + innerIndex)));
  }
  return rows;
}

function getVirtualNumbersKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: t(lang, "virtualNumbers_offerWhatsapp"), callback_data: "service_menu:virtual_numbers:offers:wa" },
        { text: t(lang, "virtualNumbers_offerTelegram"), callback_data: "service_menu:virtual_numbers:offers:tg" },
      ],
      [{ text: "🟢 WhatsApp", callback_data: "service_menu:virtual_numbers:app:WhatsApp" }],
      [{ text: "🔵 Telegram", callback_data: "service_menu:virtual_numbers:app:Telegram" }],
      [{ text: "🟣 Instagram", callback_data: "service_menu:virtual_numbers:app:Instagram" }],
      [{ text: "🔷 Facebook", callback_data: "service_menu:virtual_numbers:app:Facebook" }],
      [{ text: "⚫ Twitter", callback_data: "service_menu:virtual_numbers:app:Twitter" }],
      [
        { text: "🎵 TikTok", callback_data: "service_menu:virtual_numbers:app:TikTok" },
        { text: "🟡 Google", callback_data: "service_menu:virtual_numbers:app:Google" },
      ],
      [
        { text: "👻 Snap", callback_data: "service_menu:virtual_numbers:app:Snapchat" },
        { text: "🏷 Haraj", callback_data: "service_menu:virtual_numbers:app:Haraj" },
      ],
      [{ text: "💬 IMO", callback_data: "service_menu:virtual_numbers:app:IMO" }],
      [
        { text: "🟡 PayPal", callback_data: "service_menu:virtual_numbers:app:PayPal" },
        { text: "📞 Viber", callback_data: "service_menu:virtual_numbers:app:Viber" },
      ],
      [{ text: t(lang, "common_back_main"), callback_data: "menu:main" }],
    ],
  };
}

function getVirtualNumbersServerSelectionKeyboard(appName, lang = "ar") {
  return {
    inline_keyboard: [
      [{ text: t(lang, "virtualNumbers_server1"), callback_data: `service_menu:virtual_numbers:server:server1:app:${encodeURIComponent(appName)}` }],
      [{ text: t(lang, "virtualNumbers_server2"), callback_data: `service_menu:virtual_numbers:server:server2:app:${encodeURIComponent(appName)}` }],
      [{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }],
    ],
  };
}

function getVirtualNumbersProviderAppsKeyboard(apps, providerKey, pageIndex, totalPages, lang = "ar") {
  return {
    inline_keyboard: [
      ...apps.map((app) => ([{ text: app, callback_data: `service_menu:virtual_numbers:server:${providerKey}:app:${encodeURIComponent(app)}` }])),
      [{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }],
    ],
  };
}

function getVirtualNumbersCountriesKeyboard(appName, countries, pageIndex, totalPages, lang = "ar") {
  const encodedAppName = encodeURIComponent(appName);
  const rows = [];

  for (let index = 0; index < countries.length; index += 2) {
    rows.push(countries.slice(index, index + 2).map((country) => ({
      text: `${country.flag} ${lang === "ar" ? country.name_ar : country.name_en || country.name_ar} — ${country.sellPrice} RUB`,
      callback_data: `service_menu:virtual_numbers:country:${encodedAppName}:${country.id}:${pageIndex}`,
    })));
  }

  const navigationRow = [];
  if (pageIndex > 0) navigationRow.push({ text: t(lang, "common_previous"), callback_data: `service_menu:virtual_numbers:prices:${encodedAppName}:${pageIndex - 1}` });
  if (pageIndex < totalPages - 1) navigationRow.push({ text: t(lang, "common_next"), callback_data: `service_menu:virtual_numbers:prices:${encodedAppName}:${pageIndex + 1}` });
  if (navigationRow.length) rows.push(navigationRow);

  rows.push([{ text: t(lang, "common_back"), callback_data: "service:virtual_numbers" }]);
  return { inline_keyboard: rows };
}

function getVirtualNumberCountryDetailsKeyboard(appName, countryId, pageIndex, lang = "ar") {
  const encodedAppName = encodeURIComponent(appName);
  return {
    inline_keyboard: [
      [{ text: t(lang, "virtualNumbers_refresh_prices"), callback_data: `service_menu:virtual_numbers:country:${encodedAppName}:${countryId}:${pageIndex}` }],
      [{ text: t(lang, "common_back"), callback_data: `service_menu:virtual_numbers:prices:${encodedAppName}:${pageIndex}` }],
    ],
  };
}

function getSocialBoostPlatformsKeyboard(platforms, lang = "ar") {
  const byKey = Object.fromEntries(platforms.map((platform) => [platform.key, platform]));
  const rowsOrder = [
    ["instagram", "telegram"],
    ["tiktok", "facebook"],
    ["kwai", "threads"],
    ["whatsapp", "youtube"],
    ["twitter", "likee"],
  ];
  const rows = [];
  rowsOrder.forEach((pair) => {
    const buttons = pair
      .map((key) => byKey[key])
      .filter(Boolean)
      .map((platform) => ({
        text: `• ${lang === "ar" ? platform.label_ar : platform.label_en} ${platform.icon || ""}`.trim(),
        callback_data: `service_menu:social_boost:platform:${platform.key}`,
      }));
    if (buttons.length) {
      rows.push(buttons);
    }
  });

  return {
    inline_keyboard: [
      ...rows,
      [{ text: lang === "ar" ? "• ➡ الصفحة الرئيسية •" : "• ➡ Main Page •", callback_data: "menu:main" }],
    ],
  };
}

function getSocialBoostCategoriesKeyboard(platform, lang = "ar") {
  const categoryIconMap = {
    followers: "👥",
    members: "👥",
    views: "👁️",
    likes: "👍",
    likes_reactions: "👍",
    reactions: "💬",
    comments: "💬",
    comments_saves: "💾",
    saves: "💾",
    shares: "↪️",
    shares_comments: "↪️",
    subscribers: "🔔",
    likes_shares: "🔥",
    retweets: "🔁",
  };
  return {
    inline_keyboard: [
      ...platform.categories.map((category) => ([{
        text: `• ${lang === "ar" ? category.label_ar : category.label_en} ${categoryIconMap[category.key] || "📌"} •`,
        callback_data: `service_menu:social_boost:category:${platform.key}:${category.key}`,
      }])),
      [
        { text: lang === "ar" ? "• ✖ رجوع •" : "• ✖ Back •", callback_data: "service:social_boost" },
        { text: lang === "ar" ? "• 🏠 الصفحة الرئيسية •" : "• 🏠 Main Page •", callback_data: "menu:main" },
      ],
    ],
  };
}

function getSocialBoostServicesKeyboard(services, platformKey, categoryKey, lang = "ar") {
  return {
    inline_keyboard: [
      [{ text: lang === "ar" ? "• 🔮 نوع السيرفر وسعر العضو الواحد •" : "• 🔮 Server type & price per unit •", callback_data: "noop" }],
      ...services.map((service) => ([{ text: service.text, callback_data: service.callback_data }])),
      [
        { text: lang === "ar" ? "• ✖ رجوع •" : "• ✖ Back •", callback_data: `service_menu:social_boost:platform:${platformKey}` },
        { text: lang === "ar" ? "• 🏠 الصفحة الرئيسية •" : "• 🏠 Main Page •", callback_data: "menu:main" },
      ],
    ],
  };
}

function getSocialBoostServiceDetailsKeyboard(detailRows, backCallback, lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: lang === "ar" ? "👥 رشق متابعين" : "👥 Followers Boost", callback_data: "noop" },
        { text: lang === "ar" ? "⭐ - النوع" : "⭐ - Type", callback_data: "noop" },
      ],
      ...detailRows.map((row) => ([
        { text: String(row.value), callback_data: "noop" },
        { text: row.label, callback_data: "noop" },
      ])),
      [
        { text: lang === "ar" ? "✖ ☆ رجوع" : "✖ ☆ Back", callback_data: backCallback },
      ],
    ],
  };
}

function getProMainKeyboard(categories, lang = "ar") {
  return {
    inline_keyboard: [
      ...categories.map((category, index) => [{ text: category, callback_data: `service_menu:pro_accounts:category:${index}` }]),
      [{ text: t(lang, "common_back"), callback_data: "menu:main" }],
    ],
  };
}

function getProSubcategoryKeyboard(items, subcategoryKey, lang = "ar") {
  return {
    inline_keyboard: [
      ...chunkButtons(items, (item, index) => ({ text: item, callback_data: `service_menu:pro_accounts:item:${subcategoryKey}:${index}` })),
      [{ text: t(lang, "common_back"), callback_data: "service:pro_accounts" }],
    ],
  };
}

function getSocialAccountsCategoriesKeyboard(categories, lang = "ar") {
  return {
    inline_keyboard: [
      ...chunkButtons(categories, (category) => ({ text: category.label, callback_data: `service_menu:social_accounts:category:${category.key}` })),
      [{ text: t(lang, "common_back"), callback_data: "menu:main" }],
    ],
  };
}

function getSocialAccountsPlatformsKeyboard(platforms, categoryKey, lang = "ar") {
  return {
    inline_keyboard: [
      ...chunkButtons(platforms, (platform) => ({ text: platform, callback_data: `service_menu:social_accounts:platform:${categoryKey}:${encodeURIComponent(platform)}` })),
      [{ text: t(lang, "common_back"), callback_data: "service:social_accounts" }],
    ],
  };
}

function getCloudServicesKeyboard(items, lang = "ar") {
  return {
    inline_keyboard: [
      ...chunkButtons(items, (item, index) => ({ text: item, callback_data: `service_menu:cloud_services:item:${index}` })),
      [{ text: t(lang, "common_back"), callback_data: "menu:main" }],
    ],
  };
}

function getTemporaryEmailsKeyboard(items, lang = "ar") {
  return {
    inline_keyboard: [
      ...chunkButtons(items, (item, index) => ({ text: item, callback_data: `service_menu:temporary_emails:item:${index}` })),
      [{ text: t(lang, "common_back"), callback_data: "menu:main" }],
    ],
  };
}

function getTempEmailActionsKeyboard(lang = "ar") {
  return {
    inline_keyboard: [
      [
        { text: t(lang, "temporaryEmails_btn_refresh"), callback_data: "service_menu:temporary_emails:refresh" },
        { text: t(lang, "temporaryEmails_btn_switch"), callback_data: "service_menu:temporary_emails:switch" },
      ],
      [{ text: t(lang, "common_back"), callback_data: "service:temporary_emails" }],
    ],
  };
}

function getVirtualVisaKeyboard(items, lang = "ar") {
  return {
    inline_keyboard: [
      ...chunkButtons(items, (item, index) => ({ text: item, callback_data: `service_menu:virtual_visa:item:${index}` })),
      [{ text: t(lang, "common_back"), callback_data: "menu:main" }],
    ],
  };
}

function getGameTopupKeyboard(items, pageIndex, totalPages, lang = "ar") {
  const rows = [...chunkButtons(items, (item, index) => ({ text: item, callback_data: `service_menu:game_topup:item:${pageIndex}:${index}` }))];
  const navigationRow = [];
  if (pageIndex < totalPages - 1) navigationRow.push({ text: t(lang, "common_next"), callback_data: `service_menu:game_topup:page:${pageIndex + 1}` });
  if (pageIndex > 0) navigationRow.push({ text: t(lang, "common_previous"), callback_data: `service_menu:game_topup:page:${pageIndex - 1}` });
  if (navigationRow.length) rows.push(navigationRow);
  rows.push([{ text: t(lang, "common_back"), callback_data: "menu:main" }]);
  return { inline_keyboard: rows };
}

function getGameTopupCategoriesKeyboard(categories, lang = "ar") {
  const rows = categories.map((category) => ([
    {
      text: `${category.emoji} ${lang === "ar" ? category.name_ar : category.name_en}`,
      callback_data: `gt:cat:${category.key}`,
    },
  ]));

  rows.push([{ text: lang === "ar" ? "رجوع" : "Back", callback_data: "menu:main" }]);
  return { inline_keyboard: rows };
}

function getGameTopupGamesKeyboard(games, categoryKey, pageIndex, totalPages, lang = "ar") {
  const rows = chunkButtons(games, (game) => ({
    text: `${game.emoji} ${lang === "ar" ? game.name_ar : game.name_en}`,
    callback_data: `gt:g:${game.key}:${categoryKey}`,
  }));

  rows.push([{ text: lang === "ar" ? "رجوع" : "Back", callback_data: "service:game_topup" }]);
  return { inline_keyboard: rows };
}

function getGameTopupPackagesKeyboard(game, categoryKey, pageIndex, lang = "ar") {
  const rows = [
    [
      { text: lang === "ar" ? "🧩 الفئة" : "🧩 Package", callback_data: "noop" },
      { text: lang === "ar" ? "💰 السعر" : "💰 Price", callback_data: "noop" },
    ],
  ];

  game.packages.forEach((item, index) => {
    const callback = `gt:p:${game.key}:${index}:${categoryKey}`;
    rows.push([
      { text: lang === "ar" ? item.units_ar : item.units_en, callback_data: callback },
      { text: `${Number(item.priceRub).toFixed(2)} ₽`, callback_data: callback },
    ]);
  });

  rows.push([{ text: lang === "ar" ? "🛠️ شحن مخصص" : "🛠️ Custom Top-up", callback_data: `gt:c:${game.key}:${categoryKey}` }]);
  rows.push([{ text: lang === "ar" ? "رجوع" : "Back", callback_data: `gt:cat:${categoryKey}` }]);

  return { inline_keyboard: rows };
}

function getGameTopupRequestInfoKeyboard(rowsData, backCallback, lang = "ar") {
  return {
    inline_keyboard: [
      ...rowsData.map((row) => ([
        { text: row.left, callback_data: "noop" },
        { text: row.right, callback_data: "noop" },
      ])),
      [{ text: lang === "ar" ? "🔙 رجوع" : "🔙 Back", callback_data: backCallback }],
    ],
  };
}

function getOtherServicesKeyboard(items, lang = "ar") {
  return {
    inline_keyboard: [
      ...chunkButtons(items, (item, index) => ({ text: item, callback_data: `service_menu:other_services:item:${index}` })),
      [{ text: t(lang, "otherServices_custom"), callback_data: "service_menu:other_services:custom_request" }],
      [{ text: t(lang, "common_back"), callback_data: "menu:main" }],
    ],
  };
}

module.exports = {
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
  getGameTopupCategoriesKeyboard,
  getGameTopupGamesKeyboard,
  getGameTopupPackagesKeyboard,
  getGameTopupRequestInfoKeyboard,
  getOtherServicesKeyboard,
};
