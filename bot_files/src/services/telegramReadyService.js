const { getServicePrices, requestNumber, getSmsStatus, setSmsStatus, extractPrice } = require("./grizzlyService");
const { getSmsProvider } = require("../constants/smsProviders");
const { logBotError } = require("./errorLogger");
const { safeTelegramCall } = require("./telegramSafe");

// Ruble to USD exchange rate for display and balance conversions
const RUB_PER_USD = 85;

// Comprehensive Country Catalog - Top 20 ordered exactly as user screenshot
const READY_COUNTRIES = [
  { id: "53", code: "SA", dialCode: "966", name_ar: "السعودية", name_en: "Saudi Arabia", flag: "🇸🇦", baseUsd: 0.90, defaultStock: 1250 },
  { id: "0", code: "RU", dialCode: "7", name_ar: "روسيا", name_en: "Russia", flag: "🇷🇺", baseUsd: 1.80, defaultStock: 4800 },
  { id: "86", code: "IT", dialCode: "39", name_ar: "إيطاليا", name_en: "Italy", flag: "🇮🇹", baseUsd: 1.00, defaultStock: 620 },
  { id: "54", code: "MX", dialCode: "52", name_ar: "المكسيك", name_en: "Mexico", flag: "🇲🇽", baseUsd: 0.60, defaultStock: 940 },
  { id: "2", code: "KZ", dialCode: "7", name_ar: "كازاخستان", name_en: "Kazakhstan", flag: "🇰🇿", baseUsd: 1.00, defaultStock: 1100 },
  { id: "30", code: "YE", dialCode: "967", name_ar: "اليمن", name_en: "Yemen", flag: "🇾🇪", baseUsd: 0.55, defaultStock: 350 },
  { id: "49", code: "LV", dialCode: "371", name_ar: "لاتفيا", name_en: "Latvia", flag: "🇱🇻", baseUsd: 1.40, defaultStock: 410 },
  { id: "117", code: "PT", dialCode: "351", name_ar: "البرتغال", name_en: "Portugal", flag: "🇵🇹", baseUsd: 1.70, defaultStock: 280 },
  { id: "11", code: "KG", dialCode: "996", name_ar: "قيرغيزستان", name_en: "Kyrgyzstan", flag: "🇰🇬", baseUsd: 1.20, defaultStock: 780 },
  { id: "143", code: "TJ", dialCode: "992", name_ar: "طاجيكستان", name_en: "Tajikistan", flag: "🇹🇯", baseUsd: 0.65, defaultStock: 520 },
  { id: "187", code: "US", dialCode: "1", name_ar: "أمريكا", name_en: "United States", flag: "🇺🇸", baseUsd: 0.33, defaultStock: 5300 },
  { id: "21", code: "EG", dialCode: "20", name_ar: "مصر", name_en: "Egypt", flag: "🇪🇬", baseUsd: 0.60, defaultStock: 1950 },
  { id: "47", code: "IQ", dialCode: "964", name_ar: "العراق", name_en: "Iraq", flag: "🇮🇶", baseUsd: 2.20, defaultStock: 640 },
  { id: "62", code: "TR", dialCode: "90", name_ar: "تركيا", name_en: "Turkey", flag: "🇹🇷", baseUsd: 1.00, defaultStock: 890 },
  { id: "70", code: "VE", dialCode: "58", name_ar: "فنزويلا", name_en: "Venezuela", flag: "🇻🇪", baseUsd: 1.20, defaultStock: 430 },
  { id: "33", code: "CO", dialCode: "57", name_ar: "كولومبيا", name_en: "Colombia", flag: "🇨🇴", baseUsd: 0.30, defaultStock: 1450 },
  { id: "78", code: "FR", dialCode: "33", name_ar: "فرنسا", name_en: "France", flag: "🇫🇷", baseUsd: 1.20, defaultStock: 760 },
  { id: "39", code: "AR", dialCode: "54", name_ar: "الأرجنتين", name_en: "Argentina", flag: "🇦🇷", baseUsd: 0.75, defaultStock: 820 },
  { id: "16", code: "GB", dialCode: "44", name_ar: "بريطانيا", name_en: "United Kingdom", flag: "🇬🇧", baseUsd: 0.50, defaultStock: 2100 },
  { id: "14", code: "HK", dialCode: "852", name_ar: "هونغ كونغ", name_en: "Hong Kong", flag: "🇭🇰", baseUsd: 1.20, defaultStock: 390 },

  // Page 2 and beyond
  { id: "174", code: "JO", dialCode: "962", name_ar: "الأردن", name_en: "Jordan", flag: "🇯🇴", baseUsd: 0.85, defaultStock: 320 },
  { id: "95", code: "AE", dialCode: "971", name_ar: "الإمارات", name_en: "UAE", flag: "🇦🇪", baseUsd: 1.50, defaultStock: 410 },
  { id: "146", code: "KW", dialCode: "965", name_ar: "الكويت", name_en: "Kuwait", flag: "🇰🇼", baseUsd: 1.60, defaultStock: 290 },
  { id: "161", code: "OM", dialCode: "968", name_ar: "عمان", name_en: "Oman", flag: "🇴🇲", baseUsd: 1.40, defaultStock: 240 },
  { id: "163", code: "QA", dialCode: "974", name_ar: "قطر", name_en: "Qatar", flag: "🇶🇦", baseUsd: 1.80, defaultStock: 190 },
  { id: "153", code: "LB", dialCode: "961", name_ar: "لبنان", name_en: "Lebanon", flag: "🇱🇧", baseUsd: 1.10, defaultStock: 260 },
  { id: "37", code: "MA", dialCode: "212", name_ar: "المغرب", name_en: "Morocco", flag: "🇲🇦", baseUsd: 0.70, defaultStock: 830 },
  { id: "58", code: "DZ", dialCode: "213", name_ar: "الجزائر", name_en: "Algeria", flag: "🇩🇿", baseUsd: 0.65, defaultStock: 740 },
  { id: "89", code: "TN", dialCode: "216", name_ar: "تونس", name_en: "Tunisia", flag: "🇹🇳", baseUsd: 0.70, defaultStock: 510 },
  { id: "98", code: "SD", dialCode: "249", name_ar: "السودان", name_en: "Sudan", flag: "🇸🇩", baseUsd: 0.80, defaultStock: 220 },
  { id: "43", code: "DE", dialCode: "49", name_ar: "ألمانيا", name_en: "Germany", flag: "🇩🇪", baseUsd: 1.10, defaultStock: 1300 },
  { id: "56", code: "ES", dialCode: "34", name_ar: "إسبانيا", name_en: "Spain", flag: "🇪🇸", baseUsd: 1.00, defaultStock: 950 },
  { id: "48", code: "NL", dialCode: "31", name_ar: "هولندا", name_en: "Netherlands", flag: "🇳🇱", baseUsd: 0.95, defaultStock: 870 },
  { id: "46", code: "SE", dialCode: "46", name_ar: "السويد", name_en: "Sweden", flag: "🇸🇪", baseUsd: 1.25, defaultStock: 480 },
  { id: "15", code: "PL", dialCode: "48", name_ar: "بولندا", name_en: "Poland", flag: "🇵🇱", baseUsd: 0.80, defaultStock: 920 },
  { id: "36", code: "CA", dialCode: "1", name_ar: "كندا", name_en: "Canada", flag: "🇨🇦", baseUsd: 0.45, defaultStock: 1800 },
  { id: "73", code: "BR", dialCode: "55", name_ar: "البرازيل", name_en: "Brazil", flag: "🇧🇷", baseUsd: 0.50, defaultStock: 1400 },
  { id: "22", code: "IN", dialCode: "91", name_ar: "الهند", name_en: "India", flag: "🇮🇳", baseUsd: 0.40, defaultStock: 3600 },
  { id: "66", code: "PK", dialCode: "92", name_ar: "باكستان", name_en: "Pakistan", flag: "🇵🇰", baseUsd: 0.45, defaultStock: 2200 },
  { id: "6", code: "ID", dialCode: "62", name_ar: "إندونيسيا", name_en: "Indonesia", flag: "🇮🇩", baseUsd: 0.35, defaultStock: 2900 },
  { id: "7", code: "MY", dialCode: "60", name_ar: "ماليزيا", name_en: "Malaysia", flag: "🇲🇾", baseUsd: 0.60, defaultStock: 1100 },
  { id: "4", code: "PH", dialCode: "63", name_ar: "الفلبين", name_en: "Philippines", flag: "🇵🇭", baseUsd: 0.40, defaultStock: 1600 },
  { id: "10", code: "VN", dialCode: "84", name_ar: "فيتنام", name_en: "Vietnam", flag: "🇻🇳", baseUsd: 0.55, defaultStock: 1350 },
  { id: "52", code: "TH", dialCode: "66", name_ar: "تايلاند", name_en: "Thailand", flag: "🇹🇭", baseUsd: 0.65, defaultStock: 890 },
  { id: "19", code: "NG", dialCode: "234", name_ar: "نيجيريا", name_en: "Nigeria", flag: "🇳🇬", baseUsd: 0.40, defaultStock: 1950 },
  { id: "8", code: "KE", dialCode: "254", name_ar: "كينيا", name_en: "Kenya", flag: "🇰🇪", baseUsd: 0.50, defaultStock: 870 },
  { id: "31", code: "ZA", dialCode: "27", name_ar: "جنوب أفريقيا", name_en: "South Africa", flag: "🇿🇦", baseUsd: 0.70, defaultStock: 640 },
  { id: "32", code: "RO", dialCode: "40", name_ar: "رومانيا", name_en: "Romania", flag: "🇷🇴", baseUsd: 0.85, defaultStock: 530 },
  { id: "82", code: "BE", dialCode: "32", name_ar: "بلجيكا", name_en: "Belgium", flag: "🇧🇪", baseUsd: 1.30, defaultStock: 380 },
  { id: "50", code: "AT", dialCode: "43", name_ar: "النمسا", name_en: "Austria", flag: "🇦🇹", baseUsd: 1.40, defaultStock: 340 },
  { id: "45", code: "HR", dialCode: "385", name_ar: "كرواتيا", name_en: "Croatia", flag: "🇭🇷", baseUsd: 1.10, defaultStock: 290 },
  { id: "63", code: "CZ", dialCode: "420", name_ar: "التشيك", name_en: "Czechia", flag: "🇨🇿", baseUsd: 1.15, defaultStock: 310 },
  { id: "84", code: "HU", dialCode: "36", name_ar: "المجر", name_en: "Hungary", flag: "🇭🇺", baseUsd: 1.05, defaultStock: 420 },
  { id: "83", code: "BG", dialCode: "359", name_ar: "بلغاريا", name_en: "Bulgaria", flag: "🇧🇬", baseUsd: 0.95, defaultStock: 360 },
  { id: "34", code: "EE", dialCode: "372", name_ar: "إستونيا", name_en: "Estonia", flag: "🇪🇪", baseUsd: 1.35, defaultStock: 270 },
  { id: "44", code: "LT", dialCode: "370", name_ar: "ليتوانيا", name_en: "Lithuania", flag: "🇱🇹", baseUsd: 1.20, defaultStock: 330 },
  { id: "35", code: "AZ", dialCode: "994", name_ar: "أذربيجان", name_en: "Azerbaijan", flag: "🇦🇿", baseUsd: 0.90, defaultStock: 450 },
  { id: "40", code: "UZ", dialCode: "998", name_ar: "أوزبكستان", name_en: "Uzbekistan", flag: "🇺🇿", baseUsd: 0.75, defaultStock: 610 },
  { id: "1", code: "UA", dialCode: "380", name_ar: "أوكرانيا", name_en: "Ukraine", flag: "🇺🇦", baseUsd: 0.85, defaultStock: 1400 },
  { id: "51", code: "BY", dialCode: "375", name_ar: "بيلاروسيا", name_en: "Belarus", flag: "🇧🇾", baseUsd: 0.90, defaultStock: 520 },
];

const ITEMS_PER_PAGE = 20;

/**
 * Get country prices with 30% profit margin and stock
 */
async function getReadyTelegramCountries() {
  let livePrices = null;
  try {
    livePrices = await getServicePrices("tg", "server2");
  } catch (_) {}

  return READY_COUNTRIES.map((c) => {
    let usdPrice = c.baseUsd;
    let stock = c.defaultStock;

    if (livePrices && typeof livePrices === "object") {
      const entry = livePrices[String(c.id)];
      const tgData = entry?.tg || entry;
      if (tgData) {
        const cost = Number(tgData.cost ?? tgData.price ?? 0);
        const count = Number(tgData.count ?? tgData.qty ?? tgData.stock ?? 0);
        if (cost > 0) {
          // Add 30% profit margin requested by user
          usdPrice = Number((cost * 1.30).toFixed(2));
        }
        if (count > 0) {
          stock = count;
        }
      }
    }

    const rubPrice = Math.max(15, Math.ceil(usdPrice * RUB_PER_USD));

    return {
      ...c,
      priceUsd: usdPrice,
      priceRub: rubPrice,
      stock,
    };
  });
}

/**
 * Build the Inline Keyboard for Telegram Ready Numbers matching screenshot
 */
function buildReadyKeyboard(countriesList, page = 0, totalPages = 1) {
  const keyboard = [];

  // 2 Columns of country buttons
  for (let i = 0; i < countriesList.length; i += 2) {
    const row = [];
    const c1 = countriesList[i];
    row.push({
      text: `${c1.flag}${c1.code}+${c1.dialCode} ¦ ${c1.priceUsd}$`,
      callback_data: `tg_ready:country:${c1.id}:${page}`,
    });

    if (i + 1 < countriesList.length) {
      const c2 = countriesList[i + 1];
      row.push({
        text: `${c2.flag}${c2.code}+${c2.dialCode} ¦ ${c2.priceUsd}$`,
        callback_data: `tg_ready:country:${c2.id}:${page}`,
      });
    }
    keyboard.push(row);
  }

  // Pagination Row: [1] 2 3 4 5 6 7
  const pageRow = [];
  const maxPages = Math.min(totalPages, 7);
  for (let p = 0; p < maxPages; p++) {
    pageRow.push({
      text: p === page ? `[${p + 1}]` : `${p + 1}`,
      callback_data: `tg_ready:page:${p}`,
    });
  }
  if (pageRow.length > 1) {
    keyboard.push(pageRow);
  }

  // Bottom action row: [ 🔙 رجوع ] [ 🔍 بحث ]
  keyboard.push([
    { text: "🔙 رجوع", callback_data: "menu:main" },
    { text: "🔍 بحث", callback_data: "tg_ready:search" },
  ]);

  return { inline_keyboard: keyboard };
}

/**
 * Send the main Telegram Ready Numbers catalog
 */
async function sendReadyTelegramMenu(bot, chatId, user, page = 0, options = {}) {
  const allCountries = await getReadyTelegramCountries();
  const totalPages = Math.ceil(allCountries.length / ITEMS_PER_PAGE);
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = allCountries.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

  const text = [
    `💠  <b>𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  |  𝐓𝐆 𝐋𝐢𝐨𝐧</b>  💠`,
    `• ⚡ <b>أرقام تيليجرام جاهزة مع كود فوري ومضمون</b> ⚡ •`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `✦ <b>تسليم فوري:</b> الكود يصل مباشرة عند الطلب`,
    `✦ <b>ضمان كامل:</b> تفعيل الحساب بنجاح 100%`,
    `✦ <b>الأسعار:</b> تشمل التكلفة + نسبة هامش الربح (30%)`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👇 <b>اختر الدولة التي تريد شراء رقم تيليجرام لها:</b>`,
  ].join("\n");

  const reply_markup = buildReadyKeyboard(slice, safePage, totalPages);

  if (options.messageId) {
    try {
      return await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: options.messageId,
        parse_mode: "HTML",
        reply_markup,
      });
    } catch (_) {
      // If edit fails (e.g. text unchanged), fallback to send
    }
  }

  return await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup,
  });
}

/**
 * Send Details for a specific country
 */
async function sendCountryDetails(bot, chatId, user, countryId, page = 0, options = {}) {
  const allCountries = await getReadyTelegramCountries();
  const country = allCountries.find((c) => String(c.id) === String(countryId)) || allCountries[0];

  const userBal = Number(user.balance || 0);
  const userBalUsd = (userBal / RUB_PER_USD).toFixed(2);

  const text = [
    `💠  <b>𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  |  𝐓𝐆 𝐋𝐢𝐨𝐧</b>  💠`,
    `• ⚡ <b>شراء رقم تيليجرام جاهز ومضمون</b> ⚡ •`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🌍 <b>الدولة:</b> ${country.flag} ${country.name_ar} (<code>+${country.dialCode}</code>)`,
    `📱 <b>الخدمة:</b> تيليجرام (Telegram) 🚀`,
    `💰 <b>السعر:</b> <code>${country.priceUsd}$</code> (أو <code>${country.priceRub} ₽</code>)`,
    `📦 <b>المخزون المتوفر:</b> ${country.stock} رقم متاح الآن`,
    `🛡️ <b>الضمان:</b> كود فوري وتلقائي 100% ⚡`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💳 <b>رصيدك الحالي:</b> <code>${userBal} ₽</code> (<code>${userBalUsd}$</code>)`,
    userBal < country.priceRub
      ? `\n⚠️ <i>رصيدك غير كافٍ، يرجى شحن حسابك أولاً لإتمام الشراء.</i>`
      : `\n✅ <i>سيتم خصم السعر من رصيدك فور الضغط على تأكيد الشراء.</i>`,
  ].join("\n");

  const keyboard = [
    [
      {
        text: `🛒 تأكيد شراء رقم تيليجرام (${country.priceUsd}$)`,
        callback_data: `tg_ready:buy:${country.id}:${page}`,
      },
    ],
    [{ text: "🔙 عودة لقائمة الدول", callback_data: `tg_ready:page:${page}` }],
  ];

  const reply_markup = { inline_keyboard: keyboard };

  if (options.messageId) {
    try {
      return await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: options.messageId,
        parse_mode: "HTML",
        reply_markup,
      });
    } catch (_) {}
  }

  return await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup,
  });
}

/**
 * Handle Country Search
 */
async function handleReadySearch(bot, chatId, user, queryText) {
  const allCountries = await getReadyTelegramCountries();
  const q = String(queryText || "").trim().toLowerCase().replace("+", "");

  const filtered = allCountries.filter(
    (c) =>
      c.name_ar.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
  );

  if (!filtered.length) {
    return await bot.sendMessage(
      chatId,
      `❌ لم يتم العثور على أي دولة تطابق: <b>${queryText}</b>\nيرجى المحاولة باسم الدولة (مثل: السعودية أو مصر) أو كود الاتصال (مثل: 966 أو 20).`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 عودة لقائمة الأرقام", callback_data: "tg_ready:page:0" }]],
        },
      }
    );
  }

  const text = [
    `💠  <b>نتائج البحث عن:</b> <i>${queryText}</i>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `اختر الدولة للشراء مباشرة:`,
  ].join("\n");

  const reply_markup = buildReadyKeyboard(filtered.slice(0, 20), 0, 1);
  return await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup,
  });
}

/**
 * Execute Purchase of a Ready Telegram Number
 */
async function executeReadyTelegramBuy(bot, chatId, user, countryId, page, appStore) {
  const allCountries = await getReadyTelegramCountries();
  const country = allCountries.find((c) => String(c.id) === String(countryId)) || allCountries[0];

  const currentUser = appStore.findUserById(user.userId) || user;
  const currentBal = Number(currentUser.balance || 0);

  if (currentBal < country.priceRub) {
    return await bot.sendMessage(
      chatId,
      [
        `❌ <b>عذراً، رصيدك الحالي غير كافٍ!</b>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `💰 سعر الرقم: <code>${country.priceUsd}$</code> (<code>${country.priceRub} ₽</code>)`,
        `💳 رصيدك الحالي: <code>${currentBal} ₽</code>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `يرجى شحن رصيدك لتتمكن من إتمام عملية الشراء بنجاح.`,
      ].join("\n"),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 شحن حسابي الآن", callback_data: "service:balance_topup" }],
            [{ text: "🔙 عودة لقائمة الدول", callback_data: `tg_ready:page:${page}` }],
          ],
        },
      }
    );
  }

  const waitMsg = await bot.sendMessage(
    chatId,
    `⏳ <b>جاري استخراج وتجهيز رقم تيليجرام لدولة ${country.flag} ${country.name_ar}...</b>`,
    { parse_mode: "HTML" }
  );

  // Try server providers in sequence: Server 2 (Grizzly) -> Server 1 (HeroSMS) -> Server 3 -> Server 4
  const providerCandidates = ["server2", "server1", "server3", "server4"];
  let chosenProvider = "server2";
  let responseText = null;

  for (const provKey of providerCandidates) {
    const prov = getSmsProvider(provKey);
    if (!prov || !prov.apiKey || !prov.apiKey.trim() || prov.enabled === false) {
      continue;
    }
    try {
      const res = await requestNumber("tg", country.id, provKey);
      if (res && res.includes("ACCESS_NUMBER")) {
        responseText = res;
        chosenProvider = provKey;
        break;
      }
    } catch (_) {}
  }

  // Parse response
  if (!responseText || !responseText.startsWith("ACCESS_NUMBER:")) {
    if (waitMsg && waitMsg.message_id) {
      try {
        await bot.deleteMessage(chatId, waitMsg.message_id);
      } catch (_) {}
    }

    return await bot.sendMessage(
      chatId,
      [
        `⚠️ <b>عذراً، نفد المخزون المؤقت لأرقام تيليجرام في دولة ${country.flag} ${country.name_ar}!</b>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `يرجى اختيار دولة أخرى أو المحاولة مجدداً بعد قليل.`,
      ].join("\n"),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 اختيار دولة أخرى", callback_data: `tg_ready:page:${page}` }],
            [{ text: "🔙 القائمة الرئيسية", callback_data: "menu:main" }],
          ],
        },
      }
    );
  }

  // Format: ACCESS_NUMBER:id:number
  const [, activationId, rawNumber] = responseText.split(":");
  const phoneNumber = String(rawNumber || "").replace(/[^0-9]/g, "");

  // Deduct balance and register transaction
  appStore.deductBalance(user.userId, country.priceRub);
  appStore.incrementTransactions(user.userId);
  const profitRub = Math.ceil(country.priceRub * 0.30);
  appStore.addProfit(profitRub);

  const purchaseTx = appStore.addTransaction({
    userId: user.userId,
    type: "tg_ready_purchase",
    amount: country.priceRub,
    currency: "RUB",
    status: "pending",
    details: {
      activationId,
      number: phoneNumber,
      countryId: country.id,
      countryName: country.name_ar,
      flag: country.flag,
      dialCode: country.dialCode,
      priceUsd: country.priceUsd,
      priceRub: country.priceRub,
      providerKey: chosenProvider,
      service: "tg",
    },
  });

  if (waitMsg && waitMsg.message_id) {
    try {
      await bot.deleteMessage(chatId, waitMsg.message_id);
    } catch (_) {}
  }

  const successText = [
    `💠  <b>𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  |  𝐓𝐆 𝐋𝐢𝐨𝐧</b>  💠`,
    `✅ <b>تم استخراج رقم تيليجرام جاهز بنجاح!</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🌍 <b>الدولة:</b> ${country.flag} ${country.name_ar} (<code>+${country.dialCode}</code>)`,
    `📞 <b>الرقم:</b> <code>+${phoneNumber}</code>`,
    `🔑 <b>كود التفعيل:</b> ⏳ <b>في انتظار وصول الكود...</b>`,
    `💰 <b>السعر:</b> <code>${country.priceUsd}$</code> (<code>${country.priceRub} ₽</code>)`,
    `⏱️ <b>الصلاحية:</b> 20 دقيقة`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💡 <i>قم بنسخ الرقم وأدخله في تطبيق تيليجرام لطلب كود الـ SMS. الكود سيصلك هنا تلقائياً دون الحاجة لأي إجراء!</i>`,
  ].join("\n");

  const orderMarkup = {
    inline_keyboard: [
      [
        { text: "📋 نسخ الرقم", callback_data: `tg_ready:copy:${phoneNumber}` },
        { text: "🔄 جلب الكود الآن", callback_data: `tg_ready:check:${chosenProvider}:${activationId}:${country.priceRub}` },
      ],
      [
        { text: "❌ إلغاء واسترجاع الرصيد", callback_data: `tg_ready:cancel:${chosenProvider}:${activationId}:${country.priceRub}` },
      ],
      [{ text: "🔙 القائمة الرئيسية", callback_data: "menu:main" }],
    ],
  };

  const sentOrderMsg = await bot.sendMessage(chatId, successText, {
    parse_mode: "HTML",
    reply_markup: orderMarkup,
  });

  // Start background poller for SMS
  startSmsPoller(bot, chatId, user.userId, chosenProvider, activationId, phoneNumber, country, sentOrderMsg.message_id, appStore);

  return true;
}

/**
 * Background SMS Polling Loop for TG Code
 */
function startSmsPoller(bot, chatId, userId, providerKey, activationId, phoneNumber, country, messageId, appStore) {
  let attempts = 0;
  const maxAttempts = 120; // 120 * 5s = 10 minutes

  const timer = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(timer);
      return;
    }

    try {
      const statusRes = await getSmsStatus(activationId, providerKey);
      const resText = String(statusRes || "").trim();

      if (resText.startsWith("STATUS_OK:")) {
        clearInterval(timer);
        const code = resText.split(":")[1]?.trim();

        // Update transaction status
        appStore.updateUserTransaction(userId, activationId, {
          status: "completed",
          code,
        });

        // Send alert with the Telegram Code
        await bot.sendMessage(
          chatId,
          [
            `🎉 <b>وصل كود تفعيل التيليجرام بنجاح!</b> ⚡`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `📞 <b>الرقم:</b> <code>+${phoneNumber}</code>`,
            `🔑 <b>كود التفعيل:</b> <code>${code}</code>`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `✅ <i>تم تفعيل الحساب بنجاح! شكراً لاستخدامك خدماتنا.</i>`,
          ].join("\n"),
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "⚡ شراء رقم تيليجرام آخر", callback_data: "tg_ready:page:0" }],
                [{ text: "🔙 القائمة الرئيسية", callback_data: "menu:main" }],
              ],
            },
          }
        );

        // Edit the original message to show code
        if (messageId) {
          try {
            await bot.editMessageText(
              [
                `💠  <b>𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  |  𝐓𝐆 𝐋𝐢𝐨𝐧</b>  💠`,
                `✅ <b>تم استلام كود التفعيل بنجاح!</b>`,
                `━━━━━━━━━━━━━━━━━━━━`,
                `🌍 <b>الدولة:</b> ${country.flag} ${country.name_ar}`,
                `📞 <b>الرقم:</b> <code>+${phoneNumber}</code>`,
                `🔑 <b>الكود:</b> <code>${code}</code> ✅`,
                `━━━━━━━━━━━━━━━━━━━━`,
                `<i>الحساب مفعل وجاهز للاستخدام.</i>`,
              ].join("\n"),
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "⚡ شراء رقم آخر", callback_data: "tg_ready:page:0" }],
                    [{ text: "🔙 القائمة الرئيسية", callback_data: "menu:main" }],
                  ],
                },
              }
            );
          } catch (_) {}
        }
      } else if (resText === "STATUS_CANCEL") {
        clearInterval(timer);
      }
    } catch (err) {
      logBotError("startSmsPoller", err, { activationId });
    }
  }, 5000);
}

/**
 * Handle Manual SMS Check
 */
async function handleCheckSms(bot, chatId, query, providerKey, activationId, priceRub, appStore) {
  try {
    const statusRes = await getSmsStatus(activationId, providerKey);
    const resText = String(statusRes || "").trim();

    if (resText.startsWith("STATUS_OK:")) {
      const code = resText.split(":")[1]?.trim();
      await safeTelegramCall("handleCheckSms.ok", () =>
        bot.answerCallbackQuery(query.id, {
          text: `🎉 وصل الكود: ${code}`,
          show_alert: true,
        })
      );
      await bot.sendMessage(
        chatId,
        `🔔 <b>كود التفعيل:</b> <code>${code}</code>`,
        { parse_mode: "HTML" }
      );
      return true;
    }

    if (resText === "STATUS_WAIT_CODE") {
      await safeTelegramCall("handleCheckSms.wait", () =>
        bot.answerCallbackQuery(query.id, {
          text: "⏳ لم يصل الكود بعد، يرجى طلب الكود من داخل تيليجرام والانتظار ثوانٍ.",
          show_alert: true,
        })
      );
      return true;
    }

    await safeTelegramCall("handleCheckSms.other", () =>
      bot.answerCallbackQuery(query.id, {
        text: `الحالة: ${resText}`,
        show_alert: false,
      })
    );
    return true;
  } catch (err) {
    await safeTelegramCall("handleCheckSms.err", () =>
      bot.answerCallbackQuery(query.id, {
        text: "تعذر التحقق حالياً، جاري المحاولة تلقائياً.",
        show_alert: false,
      })
    );
    return true;
  }
}

/**
 * Handle Cancel and Refund
 */
async function handleCancelSms(bot, chatId, query, providerKey, activationId, priceRub, appStore) {
  try {
    const refundAmount = Number(priceRub) || 0;
    try {
      await setSmsStatus(activationId, 8, providerKey); // 8 = cancel
    } catch (_) {}

    // Refund user balance
    appStore.addBalance(query.from.id, refundAmount);

    await safeTelegramCall("handleCancelSms.done", () =>
      bot.answerCallbackQuery(query.id, {
        text: `✅ تم إلغاء الرقم واسترجاع ${refundAmount} ₽ لرصيدك بنجاح!`,
        show_alert: true,
      })
    );

    await bot.sendMessage(
      chatId,
      `✅ <b>تم إلغاء الطلب واسترجاع المبلغ (${refundAmount} ₽) إلى رصيدك بنجاح.</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⚡ شراء رقم آخر", callback_data: "tg_ready:page:0" }],
            [{ text: "🔙 القائمة الرئيسية", callback_data: "menu:main" }],
          ],
        },
      }
    );
    return true;
  } catch (err) {
    logBotError("handleCancelSms", err, { activationId });
    return false;
  }
}

module.exports = {
  sendReadyTelegramMenu,
  sendCountryDetails,
  executeReadyTelegramBuy,
  handleReadySearch,
  handleCheckSms,
  handleCancelSms,
  getReadyTelegramCountries,
};
