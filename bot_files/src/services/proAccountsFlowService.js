const { PRO_ACCOUNTS_CHANNEL_ID, ADMIN_IDS } = require("../config");
const { sendOrEditMessage } = require("./profileService");
const { safeTelegramCall } = require("./telegramSafe");
const { logBotError } = require("./errorLogger");
const { getUserLang } = require("../locales");
const { setUserState, getUserState, clearUserState } = require("./stateStore");
const { escapeHtml } = require("../utils/formatters");
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

const PRO_TEXTS = {
  ar: {
    mainMenu: "✨ مرحباً بك في قسم حسابات Pro!\n🔒 اشتراكات رسمية وآمنة 100%\n🛡️ ضمان كامل طوال فترة الاشتراك\n⬇️ يرجى اختيار القسم المطلوب:",
    appSelection: "📂 القسم المختار: {category}\n🎯 اختر التطبيق لتفعيل اشتراكك:",
    planSelection: "📱 التطبيق: {app}\n🏷️ يرجى تحديد خطة الاشتراك المناسبة:",
    durationSelection: "⏳ الخطة: {plan}\n💳 اختر المدة (الأسعار موضحة بالجدول أدناه):",
    activationMethod: "⚙️ خيارات التفعيل:\n👤 على حسابك الشخصي (آمن ومُشفر)\n🆕 حساب جديد (جاهز للاستخدام الفوري)",
    inputPrompt: "📥 إدخال البيانات:\n📧 يرجى إرسال الإيميل وكلمة المرور برسالة واحدة متصلة.",
    urlPrompt: "🔗 للتحقق من الأهلية:\n🌐 يرجى إرسال رابط حسابك (URL) المراد توثيقه.",
    finalReceipt: "🧾 ملخص الطلب:\n🔹 الخدمة: {app} - {plan}\n⏳ المدة: {duration}\n⚙️ الطريقة: {method}\n💰 الإجمالي: {price}\n\n⚠️ <b>يتم التنفيذ يدوياً للأمان (1-12 ساعة).</b>",
    priceHeader: "💰 السعر",
    durationHeader: "⏳ المدة",
    methodPersonal: "👤 على حسابك",
    methodNew: "🆕 حساب جديد",
    methodPersonalLabel: "على حسابي الشخصي",
    methodNewLabel: "حساب جديد",
    confirm: "✅ تأكيد وإتمام الطلب",
    back: "🔙 رجوع",
    backMain: "🏠 الرئيسية",
    cancelOrder: "❌ إلغاء الطلب",
    cancelled: "تم إلغاء الطلب.",
    invalidInput: "المدخل غير صالح، حاول مجدداً.",
    missingFlow: "انتهت الجلسة، ابدأ من قسم حسابات Pro مرة أخرى.",
    insufficient: "رصيدك غير كافٍ لتنفيذ هذا الطلب.",
    confirmSent: "✅ تم استلام طلبك وإرساله للإدارة. سيتم التنفيذ خلال 1-12 ساعة.",
    adminButton: "✅ تم التنفيذ / Executed",
    executedBy: "✅ تم التنفيذ بواسطة @{admin}",
    userExecuted: "✅ تم تنفيذ طلب حسابات Pro الخاص بك بنجاح.",
    adminNoPermission: "هذا الزر للإدارة فقط.",
  },
  en: {
    mainMenu: "✨ Welcome to the Pro Accounts Section!\n🔒 100% Official & Safe Subscriptions\n🛡️ Full Warranty During Subscription\n⬇️ Please select a category:",
    appSelection: "📂 Category: {category}\n🎯 Choose the app for your subscription:",
    planSelection: "📱 App: {app}\n🏷️ Please select the appropriate plan:",
    durationSelection: "⏳ Plan: {plan}\n💳 Choose duration (Prices in table below):",
    activationMethod: "⚙️ Activation Options:\n👤 On your personal account (Encrypted)\n🆕 New Account (Ready to use)",
    inputPrompt: "📥 Data Input:\n📧 Please send your Email and Password in a single message.",
    urlPrompt: "🔗 Eligibility Check:\n🌐 Please send your account URL.",
    finalReceipt: "🧾 Order Summary:\n🔹 Service: {app} - {plan}\n⏳ Duration: {duration}\n⚙️ Method: {method}\n💰 Total: {price}\n\n⚠️ <b>Manual secure execution (1-12 hours).</b>",
    priceHeader: "💰 Price",
    durationHeader: "⏳ Duration",
    methodPersonal: "👤 Personal Account",
    methodNew: "🆕 New Account",
    methodPersonalLabel: "Personal Account",
    methodNewLabel: "New Account",
    confirm: "✅ Confirm & Place Order",
    back: "🔙 Back",
    backMain: "🏠 Main Menu",
    cancelOrder: "❌ Cancel Order",
    cancelled: "Order canceled.",
    invalidInput: "Invalid input, try again.",
    missingFlow: "Session expired. Start again from Pro Accounts.",
    insufficient: "Insufficient balance for this order.",
    confirmSent: "✅ Your order is submitted to admin. Execution time: 1-12 hours.",
    adminButton: "✅ تم التنفيذ / Executed",
    executedBy: "✅ Executed by @{admin}",
    userExecuted: "✅ Your Pro Accounts order has been completed.",
    adminNoPermission: "This button is for admins only.",
  },
};

const PRO_CATALOG = [
  {
    key: "ai_tools",
    name_ar: "🧠 أدوات الذكاء الاصطناعي",
    name_en: "🧠 AI Tools",
    inputMode: "credentials",
    apps: [
      {
        key: "chatgpt",
        name_ar: "تشات جي بي تي",
        name_en: "ChatGPT",
        plans: [
          {
            key: "plus",
            name_ar: "بلس",
            name_en: "Plus",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 22 },
              { key: "3m", label_ar: "3 أشهر", label_en: "3 Months", price: 60 },
            ],
          },
          {
            key: "team",
            name_ar: "فريق",
            name_en: "Team",
            durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 30 }],
          },
        ],
      },
      {
        key: "gemini",
        name_ar: "جيمناي",
        name_en: "Gemini",
        plans: [
          {
            key: "advanced",
            name_ar: "أدفانسد",
            name_en: "Advanced",
            durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 20 }],
          },
        ],
      },
      {
        key: "midjourney",
        name_ar: "ميدجورني",
        name_en: "Midjourney",
        plans: [
          { key: "basic", name_ar: "أساسي", name_en: "Basic", durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 10 }] },
          { key: "standard", name_ar: "قياسي", name_en: "Standard", durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 30 }] },
          { key: "pro", name_ar: "برو", name_en: "Pro", durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 60 }] },
        ],
      },
    ],
  },
  {
    key: "entertainment",
    name_ar: "🎬 الترفيه والمنصات",
    name_en: "🎬 Entertainment",
    inputMode: "credentials",
    apps: [
      {
        key: "netflix",
        name_ar: "نتفليكس",
        name_en: "Netflix",
        plans: [
          { key: "basic", name_ar: "أساسي", name_en: "Basic", durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 5 }] },
          {
            key: "premium",
            name_ar: "بريميوم",
            name_en: "Premium",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 12 },
              { key: "3m", label_ar: "3 أشهر", label_en: "3 Months", price: 32 },
            ],
          },
        ],
      },
      {
        key: "spotify",
        name_ar: "سبوتيفاي",
        name_en: "Spotify",
        plans: [
          {
            key: "individual",
            name_ar: "فردي",
            name_en: "Individual",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 4 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 35 },
            ],
          },
          { key: "family", name_ar: "عائلي", name_en: "Family", durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 7 }] },
        ],
      },
      {
        key: "shahid",
        name_ar: "شاهد VIP",
        name_en: "Shahid VIP",
        plans: [
          { key: "entertainment", name_ar: "ترفيه", name_en: "Entertainment", durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 8 }] },
          {
            key: "sports",
            name_ar: "رياضة",
            name_en: "Sports",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 12 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 110 },
            ],
          },
        ],
      },
      {
        key: "youtube_premium",
        name_ar: "يوتيوب بريميوم",
        name_en: "YouTube Premium",
        plans: [
          {
            key: "individual",
            name_ar: "فردي",
            name_en: "Individual",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 5 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 45 },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "design_creation",
    name_ar: "🎨 التصميم والمونتاج",
    name_en: "🎨 Design & Creation",
    inputMode: "credentials",
    apps: [
      {
        key: "canva",
        name_ar: "كانفا",
        name_en: "Canva",
        plans: [
          {
            key: "pro",
            name_ar: "برو",
            name_en: "Pro",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 4 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 25 },
            ],
          },
          { key: "teams", name_ar: "فرق", name_en: "Teams", durations: [{ key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 15 }] },
        ],
      },
      {
        key: "adobe_cc",
        name_ar: "أدوبي كرييتف كلاود",
        name_en: "Adobe Creative Cloud",
        plans: [
          {
            key: "all_apps",
            name_ar: "كل التطبيقات",
            name_en: "All Apps",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 25 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 180 },
            ],
          },
        ],
      },
      {
        key: "capcut",
        name_ar: "كاب كات",
        name_en: "CapCut",
        plans: [
          {
            key: "pro",
            name_ar: "برو",
            name_en: "Pro",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 8 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 75 },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "verification_badges",
    name_ar: "✔️ شارات التوثيق",
    name_en: "✔️ Verification Badges",
    inputMode: "url",
    apps: [
      {
        key: "telegram_premium",
        name_ar: "تيليجرام مميز",
        name_en: "Telegram Premium",
        plans: [
          {
            key: "premium",
            name_ar: "مميز",
            name_en: "Premium",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 4 },
              { key: "3m", label_ar: "3 أشهر", label_en: "3 Months", price: 12 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 35 },
            ],
          },
        ],
      },
      {
        key: "x_twitter",
        name_ar: "إكس / تويتر",
        name_en: "X / Twitter",
        plans: [
          { key: "basic", name_ar: "أساسي", name_en: "Basic", durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 3 }] },
          {
            key: "premium",
            name_ar: "بريميوم",
            name_en: "Premium",
            durations: [
              { key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 8 },
              { key: "1y", label_ar: "سنة واحدة", label_en: "1 Year", price: 84 },
            ],
          },
        ],
      },
      {
        key: "meta_verified",
        name_ar: "إنستجرام",
        name_en: "Meta Verified / Instagram",
        plans: [
          {
            key: "monthly_verification",
            name_ar: "توثيق شهري",
            name_en: "Monthly Verification",
            durations: [{ key: "1m", label_ar: "شهر واحد", label_en: "1 Month", price: 15 }],
          },
        ],
      },
    ],
  },
];

function getTexts(lang) {
  return PRO_TEXTS[lang] || PRO_TEXTS.ar;
}

function getPlanCard(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ تـحـديـــد نـوع الـخـطـــة ❩ ♦️",
      [
        "💡 التطبيق المختار يوفر باقات وخططاً متعددة.",
        "💡 تختلف الميزات والصلاحيات حسب الخطة المطلوبة.",
        "💡 يرجى مراجعة الخيارات لتحديد الأنسب لاحتياجك.",
      ],
      "⬇️ يرجى اختيار نوع الباقة أو الخطة من القائمة ⬇️"
    );
  }
  return vaultCard(
    "♦️ ❨ SELECT PLAN TYPE ❩ ♦️",
    [
      "💡 The selected app provides multiple plans.",
      "💡 Features and permissions differ by selected plan.",
      "💡 Review options to choose what fits your needs.",
    ],
    "⬇️ Please choose the package/plan from the list ⬇️"
  );
}

function getDurationCard(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ مـــدة الاشـتـــراك والـسـعـــر ❩ ♦️",
      [
        "💡 تختلف الأسعار باختلاف مدة الاشتراك المطلوبة.",
        "💡 الاشتراكات الطويلة توفر لك خصومات ممتازة.",
        "💡 الأسعار شاملة لضمان VaultX طوال فترة الاستخدام.",
      ],
      "⬇️ يرجى الضغط على المدة والسعر المناسب لك ⬇️"
    );
  }
  return vaultCard(
    "♦️ ❨ DURATION & PRICE ❩ ♦️",
    [
      "💡 Prices vary depending on subscription duration.",
      "💡 Longer durations provide better discounts.",
      "💡 Prices include VaultX warranty during usage.",
    ],
    "⬇️ Please press the suitable duration and price ⬇️"
  );
}

function getMethodCard(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ خـيـــارات تـفـعـيـــل الـحـســـاب ❩ ♦️",
      [
        "💡 يمكننا تفعيل الاشتراك على حسابك الشخصي.",
        "💡 أو تسليمك حساباً جديداً جاهزاً للاستخدام.",
        "💡 جميع الخيارات آمنة ومضمونة بنسبة 100%.",
      ],
      "⬇️ يرجى اختيار طريقة الاستلام والتفعيل المفضلة ⬇️"
    );
  }
  return vaultCard(
    "♦️ ❨ ACTIVATION OPTIONS ❩ ♦️",
    [
      "💡 We can activate subscription on your personal account.",
      "💡 Or deliver a new ready-to-use account.",
      "💡 All options are safe and 100% guaranteed.",
    ],
    "⬇️ Please choose your preferred activation method ⬇️"
  );
}

function getCredentialsCard(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ إدخـــال بـيـانـات الـحـسـاب ❩ ♦️",
      [
        "💡 لتفعيل الاشتراك، يرجى تزويدنا ببيانات الدخول.",
        "💡 بياناتك مشفرة وتستخدم لغرض التفعيل فقط.",
        "💡 يرجى التأكد من صحة الإيميل وكلمة المرور جيداً.",
      ],
      "⬇️ يرجى إرسال الإيميل والباسورد في رسالة الآن ⬇️"
    );
  }
  return vaultCard(
    "♦️ ❨ ACCOUNT DATA INPUT ❩ ♦️",
    [
      "💡 To activate, please send your login credentials.",
      "💡 Your data is encrypted and used for activation only.",
      "💡 Make sure email and password are correct.",
    ],
    "⬇️ Please send email and password in one message ⬇️"
  );
}

function getUrlCard(lang) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ إرســـال رابـــط الـحـســـاب ❩ ♦️",
      [
        "💡 لخدمات التوثيق، لا نطلب كلمة المرور أبداً.",
        "💡 نحتاج فقط لرابط حسابك للتحقق من الأهلية للتوثيق.",
        "💡 تأكد أن الحساب عام (Public) وليس خاصاً.",
      ],
      "⬇️ يرجى إرسال رابط حسابك (URL) في رسالة الآن ⬇️"
    );
  }
  return vaultCard(
    "♦️ ❨ SEND ACCOUNT URL ❩ ♦️",
    [
      "💡 For verification services, we never ask for password.",
      "💡 We only need your account URL for eligibility check.",
      "💡 Ensure account visibility is Public.",
    ],
    "⬇️ Please send your account URL now ⬇️"
  );
}

function getCategoryAppsCard(lang, category) {
  const key = category?.key;
  if (lang === "ar") {
    if (key === "ai_tools") {
      return vaultCard(
        "♦️ ❨ أدوات الـذكـــاء الاصـطـنـاعـي ❩ ♦️",
        [
          "💡 أقوى نماذج الذكاء الاصطناعي بين يديك.",
          "💡 إنجاز المهام، البرمجة، وتوليد الصور باحترافية.",
          "💡 حسابات بريميوم رسمية بدون انقطاع.",
        ],
        "⬇️ يرجى اختيار الأداة التي ترغب بالاشتراك بها ⬇️"
      );
    }
    if (key === "entertainment") {
      return vaultCard(
        "♦️ ❨ الـتـرفـيـــه والـمـنـصـــات ❩ ♦️",
        [
          "💡 استمتع بمشاهدة أفلامك ومسلسلاتك المفضلة.",
          "💡 جودة بث عالية (4K) وبدون إعلانات مزعجة.",
          "💡 اشتراكات آمنة ومضمونة طوال فترة الاستخدام.",
        ],
        "⬇️ يرجى اختيار منصة الترفيه التي تود الاشتراك بها ⬇️"
      );
    }
    if (key === "verification_badges") {
      return vaultCard(
        "♦️ ❨ شـــارات الـتـوثـيـــق ❩ ♦️",
        [
          "💡 نوفر خطط توثيق رسمية للمنصات الأكثر استخداماً.",
          "💡 تفعيل آمن ومتابعة دقيقة حتى اكتمال الطلب.",
          "💡 سرعة تنفيذ وجودة عالية مع دعم مباشر.",
        ],
        "⬇️ يرجى اختيار المنصة التي تريد توثيقها ⬇️"
      );
    }
  } else {
    if (key === "ai_tools") {
      return vaultCard(
        "♦️ ❨ A I TOOLS ❩ ♦️",
        [
          "💡 Access top AI models in one place.",
          "💡 Coding, writing, and image generation at pro level.",
          "💡 Official premium subscriptions with stable access.",
        ],
        "⬇️ Please select the AI tool you want to subscribe to ⬇️"
      );
    }
    if (key === "entertainment") {
      return vaultCard(
        "♦️ ❨ ENTERTAINMENT PLATFORMS ❩ ♦️",
        [
          "💡 Enjoy your favorite movies and series.",
          "💡 High-quality streaming with no annoying ads.",
          "💡 Safe subscriptions with full period warranty.",
        ],
        "⬇️ Please select the entertainment platform ⬇️"
      );
    }
    if (key === "verification_badges") {
      return vaultCard(
        "♦️ ❨ VERIFICATION BADGES ❩ ♦️",
        [
          "💡 Official badge plans for major social platforms.",
          "💡 Secure activation flow with direct order tracking.",
          "💡 Fast execution and premium support quality.",
        ],
        "⬇️ Please select the platform to verify ⬇️"
      );
    }
  }

  const texts = getTexts(lang);
  return applyTemplate(texts.appSelection, { category: escapeHtml(getLabel(lang, category)) });
}

function getLabel(lang, item) {
  return lang === "ar" ? item.name_ar : item.name_en;
}

function chunk(items, perRow = 2) {
  const rows = [];
  for (let index = 0; index < items.length; index += perRow) {
    rows.push(items.slice(index, index + perRow));
  }
  return rows;
}

function uniqueBy(items, keySelector) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = keySelector(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findCategory(categoryKey) {
  return PRO_CATALOG.find((item) => item.key === categoryKey) || null;
}

function findApp(category, appKey) {
  return category?.apps?.find((item) => item.key === appKey) || null;
}

function findPlan(app, planKey) {
  return app?.plans?.find((item) => item.key === planKey) || null;
}

function findDuration(plan, durationKey) {
  return plan?.durations?.find((item) => item.key === durationKey) || null;
}

function buildCategoryKeyboard(lang) {
  const rows = PRO_CATALOG.map((category) => ([{
    text: getLabel(lang, category),
    callback_data: `pro:cat:${category.key}`,
  }]));
  rows.push([{ text: getTexts(lang).backMain, callback_data: "menu:main" }]);
  return { inline_keyboard: rows };
}

function buildAppsKeyboard(lang, category) {
  const apps = uniqueBy(category.apps, (item) => item.key);
  const rows = chunk(apps, 2).map((row) => row.map((app) => ({
    text: getLabel(lang, app),
    callback_data: `pro:app:${category.key}:${app.key}`,
  })));
  rows.push([{ text: getTexts(lang).back, callback_data: "service:pro_accounts" }]);
  return { inline_keyboard: rows };
}

function buildPlansKeyboard(lang, category, app) {
  const plans = uniqueBy(app.plans, (item) => item.key);
  const rows = chunk(plans, 2).map((row) => row.map((plan) => ({
    text: getLabel(lang, plan),
    callback_data: `pro:plan:${category.key}:${app.key}:${plan.key}`,
  })));
  rows.push([{ text: getTexts(lang).back, callback_data: "pro:back:apps" }]);
  return { inline_keyboard: rows };
}

function buildDurationsKeyboard(lang, category, app, plan) {
  const texts = getTexts(lang);
  const rows = [[
    { text: texts.priceHeader, callback_data: "noop" },
    { text: texts.durationHeader, callback_data: "noop" },
  ]];

  const durations = uniqueBy(plan.durations, (item) => item.key);
  for (const duration of durations) {
    const callback = `pro:dur:${category.key}:${app.key}:${plan.key}:${duration.key}`;
    rows.push([
      { text: `${duration.price}$`, callback_data: callback },
      { text: lang === "ar" ? duration.label_ar : duration.label_en, callback_data: callback },
    ]);
  }

  rows.push([{ text: texts.back, callback_data: "pro:back:plans" }]);
  return { inline_keyboard: rows };
}

function buildMethodKeyboard(lang, route) {
  const texts = getTexts(lang);
  const suffix = route
    ? `:${route.categoryKey}:${route.appKey}:${route.planKey}:${route.durationKey}`
    : "";
  return {
    inline_keyboard: [
      [{ text: texts.methodPersonal, callback_data: `pro:meth:personal${suffix}` }],
      [{ text: texts.methodNew, callback_data: `pro:meth:new${suffix}` }],
      [{ text: texts.back, callback_data: "pro:back:durations" }],
    ],
  };
}

function buildSummaryKeyboard(lang) {
  const texts = getTexts(lang);
  return {
    inline_keyboard: [
      [{ text: texts.confirm, callback_data: "pro:confirm" }],
      [{ text: texts.cancelOrder, callback_data: "pro:cancel" }],
    ],
  };
}

function buildAdminExecuteKeyboard(orderId, userId) {
  return {
    inline_keyboard: [[{ text: "✅ تم التنفيذ / Executed", callback_data: `pro:exec:${orderId}:${userId}` }]],
  };
}

function applyTemplate(text, data) {
  return Object.entries(data).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), text);
}

function buildSummaryText(lang, draft) {
  if (lang === "ar") {
    return vaultCard(
      "♦️ ❨ فـاتـــورة تـأكـيـــد الـطـلـــب ❩ ♦️",
      [
        `🔹 الخدمة: ${escapeHtml(draft.appName)} - ${escapeHtml(draft.planName)} | ⏳ المدة: ${escapeHtml(draft.durationLabel)}`,
        `⚙️ التفعيل: ${escapeHtml(draft.methodLabel)} | 💰 الإجمالي المطلوب: ${draft.price}$`,
        "⚠️ يتم التنفيذ يدوياً للأمان (يستغرق 1 إلى 12 ساعة).",
      ],
      "⬇️ يرجى مراجعة طلبك والضغط على تأكيد لإتمامه ⬇️"
    );
  }

  return vaultCard(
    "♦️ ❨ ORDER CONFIRMATION INVOICE ❩ ♦️",
    [
      `🔹 Service: ${escapeHtml(draft.appName)} - ${escapeHtml(draft.planName)} | ⏳ Duration: ${escapeHtml(draft.durationLabel)}`,
      `⚙️ Activation: ${escapeHtml(draft.methodLabel)} | 💰 Total: ${draft.price}$`,
      "⚠️ Manual secure execution (takes 1 to 12 hours).",
    ],
    "⬇️ Please review your request and press confirm ⬇️"
  );
}

function getProState(userId) {
  const state = getUserState(userId);
  if (!state || !String(state.name || "").startsWith("PRO_")) {
    return null;
  }
  return state;
}

function setFlowState(userId, data) {
  setUserState(userId, "PRO_FLOW", data);
}

async function sendProAccountsHome(bot, chatId, user, options = {}) {
  const lang = getUserLang(user);
  clearUserState(user.userId);
  return sendOrEditMessage(
    bot,
    chatId,
    buildVaultxServiceCard(lang, "pro_accounts"),
    buildCategoryKeyboard(lang),
    options.messageId,
    "sendProAccountsHome"
  );
}

async function sendAppsMenu(bot, chatId, user, categoryKey, options = {}) {
  const lang = getUserLang(user);
  const category = findCategory(categoryKey);
  if (!category) {
    return sendProAccountsHome(bot, chatId, user, options);
  }

  setFlowState(user.userId, { categoryKey });

  return sendOrEditMessage(
    bot,
    chatId,
    getCategoryAppsCard(lang, category),
    buildAppsKeyboard(lang, category),
    options.messageId,
    "sendProAccounts.apps"
  );
}

async function sendPlansMenu(bot, chatId, user, categoryKey, appKey, options = {}) {
  const lang = getUserLang(user);
  const texts = getTexts(lang);
  const state = getProState(user.userId);
  const category = findCategory(categoryKey || state?.categoryKey);
  const app = findApp(category, appKey);

  if (!category || !app) {
    return sendProAccountsHome(bot, chatId, user, options);
  }

  setFlowState(user.userId, { categoryKey: category.key, appKey: app.key });

  return sendOrEditMessage(
    bot,
    chatId,
    getPlanCard(lang),
    buildPlansKeyboard(lang, category, app),
    options.messageId,
    "sendProAccounts.plans"
  );
}

async function sendDurationsMenu(bot, chatId, user, categoryKey, appKey, planKey, options = {}) {
  const lang = getUserLang(user);
  const texts = getTexts(lang);
  const state = getProState(user.userId);
  const category = findCategory(categoryKey || state?.categoryKey);
  const app = findApp(category, appKey || state?.appKey);
  const plan = findPlan(app, planKey);

  if (!category || !app || !plan) {
    return sendProAccountsHome(bot, chatId, user, options);
  }

  setFlowState(user.userId, { categoryKey: category.key, appKey: app.key, planKey: plan.key });

  return sendOrEditMessage(
    bot,
    chatId,
    getDurationCard(lang),
    buildDurationsKeyboard(lang, category, app, plan),
    options.messageId,
    "sendProAccounts.durations"
  );
}

function buildDraft(lang, category, app, plan, duration, method, userInput) {
  const texts = getTexts(lang);
  const methodLabel = method === "personal" ? texts.methodPersonalLabel : texts.methodNewLabel;

  return {
    categoryKey: category.key,
    categoryName: getLabel(lang, category),
    appKey: app.key,
    appName: getLabel(lang, app),
    planKey: plan.key,
    planName: getLabel(lang, plan),
    durationKey: duration.key,
    durationLabel: lang === "ar" ? duration.label_ar : duration.label_en,
    price: duration.price,
    method,
    methodLabel,
    userInput: userInput || "",
    inputMode: category.inputMode,
  };
}

async function sendActivationStep(bot, chatId, user, categoryKey, appKey, planKey, durationKey, options = {}) {
  const lang = getUserLang(user);
  const texts = getTexts(lang);
  const state = getProState(user.userId);
  const category = findCategory(categoryKey || state?.categoryKey);
  const app = findApp(category, appKey || state?.appKey);
  const plan = findPlan(app, planKey || state?.planKey);
  const duration = findDuration(plan, durationKey);

  if (!category || !app || !plan || !duration) {
    return sendProAccountsHome(bot, chatId, user, options);
  }

  const baseFlow = {
    categoryKey: category.key,
    appKey: app.key,
    planKey: plan.key,
    durationKey: duration.key,
  };

  if (category.inputMode === "url") {
    setUserState(user.userId, "PRO_AWAIT_URL", baseFlow);
    return sendOrEditMessage(
      bot,
      chatId,
      getUrlCard(lang),
      { inline_keyboard: [[{ text: texts.back, callback_data: "pro:back:durations" }]] },
      options.messageId,
      "sendProAccounts.awaitUrl"
    );
  }

  setFlowState(user.userId, baseFlow);
  return sendOrEditMessage(
    bot,
    chatId,
    getMethodCard(lang),
    buildMethodKeyboard(lang, baseFlow),
    options.messageId,
    "sendProAccounts.methods"
  );
}

async function sendSummary(bot, chatId, user, draft, options = {}) {
  const lang = getUserLang(user);
  setUserState(user.userId, "PRO_READY_CONFIRM", { draft });

  return sendOrEditMessage(
    bot,
    chatId,
    buildSummaryText(lang, draft),
    buildSummaryKeyboard(lang),
    options.messageId,
    "sendProAccounts.summary"
  );
}

async function handleMethodSelection(bot, query, appStore, method) {
  const user = appStore.getOrCreateUser(query.from);
  const lang = getUserLang(user);
  const texts = getTexts(lang);
  const state = getProState(user.userId);
  const parts = String(query.data || "").split(":");
  const routeCategoryKey = parts[3];
  const routeAppKey = parts[4];
  const routePlanKey = parts[5];
  const routeDurationKey = parts[6];

  const category = findCategory(routeCategoryKey || state?.categoryKey);
  const app = findApp(category, routeAppKey || state?.appKey);
  const plan = findPlan(app, routePlanKey || state?.planKey);
  const duration = findDuration(plan, routeDurationKey || state?.durationKey);

  if (!category || !app || !plan || !duration) {
    await sendProAccountsHome(bot, query.message.chat.id, user, { messageId: query.message.message_id });
    return true;
  }

  if (method === "personal") {
    setUserState(user.userId, "PRO_AWAIT_CREDENTIALS", {
      categoryKey: category.key,
      appKey: app.key,
      planKey: plan.key,
      durationKey: duration.key,
      method,
    });

    await sendOrEditMessage(
      bot,
      query.message.chat.id,
      getCredentialsCard(lang),
      { inline_keyboard: [[{ text: texts.back, callback_data: `pro:back:methods:${category.key}:${app.key}:${plan.key}:${duration.key}` }]] },
      query.message.message_id,
      "sendProAccounts.awaitCredentials"
    );
    return true;
  }

  const draft = buildDraft(lang, category, app, plan, duration, method);
  await sendSummary(bot, query.message.chat.id, user, draft, { messageId: query.message.message_id });
  return true;
}

async function confirmOrder(bot, query, appStore) {
  const user = appStore.getOrCreateUser(query.from);
  const lang = getUserLang(user);
  const texts = getTexts(lang);
  const state = getProState(user.userId);
  const draft = state?.draft;

  if (!draft) {
    await safeTelegramCall("pro.confirm.missing", () =>
      bot.answerCallbackQuery(query.id, { text: texts.missingFlow, show_alert: true })
    );
    return true;
  }

  const freshUser = appStore.findUserById(user.userId);
  if (!freshUser || Number(freshUser.balance || 0) < Number(draft.price)) {
    await safeTelegramCall("pro.confirm.insufficient", () =>
      bot.answerCallbackQuery(query.id, { text: texts.insufficient, show_alert: true })
    );
    return true;
  }

  appStore.deductBalance(user.userId, Number(draft.price));
  appStore.incrementTransactions(user.userId);
  const tx = appStore.addTransaction({
    type: "pro_accounts_order",
    serviceKey: "pro_accounts",
    userId: user.userId,
    amount: Number(draft.price),
    status: "pending",
    proOrder: {
      ...draft,
    },
  });

  const adminText = [
    "🧾 <b>Pro Accounts Order</b>",
    "",
    `👤 User: ${escapeHtml(user.firstName || user.username || "User")}`,
    `🆔 User ID: <code>${user.userId}</code>`,
    `📱 App: ${escapeHtml(draft.appName)}`,
    `🏷️ Plan: ${escapeHtml(draft.planName)}`,
    `⏳ Duration: ${escapeHtml(draft.durationLabel)}`,
    `⚙️ Method: ${escapeHtml(draft.methodLabel)}`,
    `💵 Total: ${draft.price}$`,
    draft.inputMode === "url"
      ? `🔗 URL: <code>${escapeHtml(draft.userInput || "-")}</code>`
      : `🔐 Credentials: <code>${escapeHtml(draft.userInput || "-")}</code>`,
    "",
    `🧷 Order ID: <code>${tx.id}</code>`,
  ].join("\n");

  await safeTelegramCall("pro.confirm.forwardAdmin", () =>
    bot.sendMessage(PRO_ACCOUNTS_CHANNEL_ID, adminText, {
      parse_mode: "HTML",
      reply_markup: buildAdminExecuteKeyboard(tx.id, user.userId),
    })
  );

  clearUserState(user.userId);

  await safeTelegramCall("pro.confirm.userDone", () =>
    bot.editMessageText(texts.confirmSent, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: [[{ text: texts.backMain, callback_data: "menu:main" }]] },
    })
  );

  return true;
}

async function cancelOrder(bot, query, appStore) {
  const user = appStore.getOrCreateUser(query.from);
  const lang = getUserLang(user);
  const texts = getTexts(lang);
  clearUserState(user.userId);
  await safeTelegramCall("pro.cancel.userDone", () =>
    bot.editMessageText(texts.cancelled, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: [[{ text: texts.backMain, callback_data: "menu:main" }]] },
    })
  );
  return true;
}

async function handleAdminExecution(bot, query, appStore) {
  const isAdmin = ADMIN_IDS.includes(Number(query.from.id));
  if (!isAdmin) {
    await safeTelegramCall("pro.exec.forbidden", () =>
      bot.answerCallbackQuery(query.id, {
        text: PRO_TEXTS.en.adminNoPermission,
        show_alert: true,
      })
    );
    return true;
  }

  const parts = String(query.data || "").split(":");
  const orderId = parts[2];
  const userId = Number(parts[3]);
  if (!orderId || !Number.isFinite(userId)) {
    return true;
  }

  const tx = appStore.getTransactionById(orderId);
  if (!tx) {
    return true;
  }

  const user = appStore.findUserById(userId);
  const userLang = getUserLang(user || {});
  const adminTag = query.from.username ? `@${query.from.username}` : String(query.from.id);
  const currentText = String(query.message?.text || query.message?.caption || "");
  const executedLine = applyTemplate(getTexts(userLang).executedBy, { admin: adminTag.replace(/^@/, "") });
  const updatedText = currentText.includes(executedLine) ? currentText : `${currentText}\n\n${executedLine}`;

  appStore.updateTransactionById(orderId, {
    status: "executed",
    executedAt: new Date().toISOString(),
    executedBy: {
      id: Number(query.from.id),
      username: query.from.username || "",
      firstName: query.from.first_name || "",
    },
  });

  await safeTelegramCall("pro.exec.editAdmin", () =>
    bot.editMessageText(updatedText, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    })
  );

  if (user) {
    await safeTelegramCall("pro.exec.notifyUser", () =>
      bot.sendMessage(user.userId, getTexts(userLang).userExecuted)
    );
  }

  return true;
}

async function handleProAccountsCallback(bot, query, appStore) {
  try {
    if (!query.data || (!query.data.startsWith("pro:") && !query.data.startsWith("service_menu:pro_accounts:"))) {
      return false;
    }

    await safeTelegramCall("pro.callback.answer", () => bot.answerCallbackQuery(query.id));

    const user = appStore.getOrCreateUser(query.from);
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    let data = String(query.data);
    if (data.startsWith("service_menu:pro_accounts:category:")) {
      const idx = Number(data.split(":")[3]);
      const categoryMap = ["ai_tools", "entertainment", "verification_badges"];
      data = `pro:cat:${categoryMap[idx] || "ai_tools"}`;
    } else if (data.startsWith("service_menu:pro_accounts:item:")) {
      data = "service:pro_accounts";
    }

    if (data.startsWith("pro:exec:")) {
      return handleAdminExecution(bot, query, appStore);
    }

    if (data === "service:pro_accounts") {
      return sendProAccountsHome(bot, chatId, user, { messageId }).then(() => true);
    }

    if (data.startsWith("pro:cat:")) {
      return sendAppsMenu(bot, chatId, user, data.split(":")[2], { messageId }).then(() => true);
    }

    if (data.startsWith("pro:app:")) {
      const parts = data.split(":");
      return sendPlansMenu(bot, chatId, user, parts[2], parts[3], { messageId }).then(() => true);
    }

    if (data.startsWith("pro:plan:")) {
      const parts = data.split(":");
      return sendDurationsMenu(bot, chatId, user, parts[2], parts[3], parts[4], { messageId }).then(() => true);
    }

    if (data.startsWith("pro:dur:")) {
      const parts = data.split(":");
      return sendActivationStep(bot, chatId, user, parts[2], parts[3], parts[4], parts[5], { messageId }).then(() => true);
    }

    if (data === "pro:meth:personal" || data.startsWith("pro:meth:personal:")) {
      return handleMethodSelection(bot, query, appStore, "personal");
    }

    if (data === "pro:meth:new" || data.startsWith("pro:meth:new:")) {
      return handleMethodSelection(bot, query, appStore, "new");
    }

    if (data === "pro:confirm") {
      return confirmOrder(bot, query, appStore);
    }

    if (data === "pro:cancel") {
      return cancelOrder(bot, query, appStore);
    }

    if (data === "pro:back:apps") {
      const state = getProState(user.userId);
      return sendAppsMenu(bot, chatId, user, state?.categoryKey, { messageId }).then(() => true);
    }

    if (data === "pro:back:plans") {
      const state = getProState(user.userId);
      return sendPlansMenu(bot, chatId, user, state?.categoryKey, state?.appKey, { messageId }).then(() => true);
    }

    if (data === "pro:back:durations") {
      const state = getProState(user.userId);
      return sendDurationsMenu(bot, chatId, user, state?.categoryKey, state?.appKey, state?.planKey, { messageId }).then(() => true);
    }

    if (data === "pro:back:methods" || data.startsWith("pro:back:methods:")) {
      const state = getProState(user.userId);
      if (!state) return sendProAccountsHome(bot, chatId, user, { messageId }).then(() => true);
      const routeParts = data.split(":");
      const routeCategoryKey = routeParts[3];
      const routeAppKey = routeParts[4];
      const routePlanKey = routeParts[5];
      const routeDurationKey = routeParts[6];

      if (state.name === "PRO_AWAIT_CREDENTIALS") {
        setFlowState(user.userId, {
          categoryKey: routeCategoryKey || state.categoryKey,
          appKey: routeAppKey || state.appKey,
          planKey: routePlanKey || state.planKey,
          durationKey: routeDurationKey || state.durationKey,
        });
      }

      const categoryKey = routeCategoryKey || state.categoryKey || state?.draft?.categoryKey;
      const appKey = routeAppKey || state.appKey || state?.draft?.appKey;
      const planKey = routePlanKey || state.planKey || state?.draft?.planKey;
      const durationKey = routeDurationKey || state.durationKey || state?.draft?.durationKey;
      return sendActivationStep(bot, chatId, user, categoryKey, appKey, planKey, durationKey, { messageId }).then(() => true);
    }

    return true;
  } catch (error) {
    logBotError("handleProAccountsCallback", error, { userId: query.from?.id, data: query.data });
    return true;
  }
}

async function handleProAccountsTextInput(bot, msg, appStore) {
  try {
    const user = appStore.getOrCreateUser(msg.from);
    const lang = getUserLang(user);
    const texts = getTexts(lang);
    const state = getProState(user.userId);

    if (!state) {
      return false;
    }

    const value = String(msg.text || "").trim();
    if (!value) {
      return false;
    }

    if (value.toLowerCase() === "cancel" || value === "إلغاء") {
      clearUserState(user.userId);
      await safeTelegramCall("pro.text.cancel", () => bot.sendMessage(msg.chat.id, texts.cancelled));
      return true;
    }

    if (state.name === "PRO_AWAIT_CREDENTIALS") {
      const category = findCategory(state.categoryKey);
      const app = findApp(category, state.appKey);
      const plan = findPlan(app, state.planKey);
      const duration = findDuration(plan, state.durationKey);
      if (!category || !app || !plan || !duration) {
        clearUserState(user.userId);
        await safeTelegramCall("pro.text.credentials.missing", () => bot.sendMessage(msg.chat.id, texts.missingFlow));
        return true;
      }

      const draft = buildDraft(lang, category, app, plan, duration, "personal", value);
      await sendSummary(bot, msg.chat.id, user, draft);
      return true;
    }

    if (state.name === "PRO_AWAIT_URL") {
      if (!/^https?:\/\/\S+$/i.test(value)) {
        await safeTelegramCall("pro.text.url.invalid", () => bot.sendMessage(msg.chat.id, texts.invalidInput));
        return true;
      }

      const category = findCategory(state.categoryKey);
      const app = findApp(category, state.appKey);
      const plan = findPlan(app, state.planKey);
      const duration = findDuration(plan, state.durationKey);

      if (!category || !app || !plan || !duration) {
        clearUserState(user.userId);
        await safeTelegramCall("pro.text.url.missing", () => bot.sendMessage(msg.chat.id, texts.missingFlow));
        return true;
      }

      const draft = buildDraft(lang, category, app, plan, duration, "new", value);
      draft.methodLabel = lang === "ar" ? "إرسال رابط للتحقق" : "URL Verification";
      await sendSummary(bot, msg.chat.id, user, draft);
      return true;
    }

    return false;
  } catch (error) {
    logBotError("handleProAccountsTextInput", error, { userId: msg.from?.id });
    return false;
  }
}

module.exports = {
  sendProAccountsHome,
  handleProAccountsCallback,
  handleProAccountsTextInput,
};
