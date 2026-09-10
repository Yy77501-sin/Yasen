const { escapeHtml } = require("./formatters");

const FRAME = "━━━━━━━━━━━━━━━━━━";

const CARDS = {
  ar: {
    virtual_numbers: {
      title: "♦️ ❨ الأرقـــام الـوهـمـيـــة ❩ ♦️",
      lines: [
        "💡 احصل على أرقام دولية لتفعيل حساباتك.",
        "💡 جميع الأرقام آمنة وتعمل بشكل فوري.",
        "💡 تصلك رسالة التفعيل (SMS) مباشرة هنا.",
      ],
      footer: "⬇️ يرجى اختيار الدولة التي ترغب بشراء رقم منها ⬇️",
    },
    game_topup: {
      title: "♦️ ❨ شـحـــن الألـعـــاب ❩ ♦️",
      lines: [
        "💡 اشحن حسابك في أشهر الألعاب عبر الـ ID.",
        "💡 أسعارنا منافسة ومناسبة لجميع الباقات.",
        "💡 التنفيذ فوري وموثوق 100% وبدون تأخير.",
      ],
      footer: "⬇️ يرجى اختيار اللعبة التي تود شحنها من القائمة ⬇️",
    },
    social_boost: {
      title: "♦️ ❨ دعـــم وتـكـبـيـر الـحـسـابـات ❩ ♦️",
      lines: [
        "💡 خدمات متكاملة لدعم وتكبير حساباتك.",
        "💡 زيادة المتابعين والمشاهدات بجودة عالية.",
        "💡 تتوفر لدينا خيارات الضمان والتعويض.",
      ],
      footer: "⬇️ يرجى تحديد المنصة لترويج حسابك عليها ⬇️",
    },
    pro_accounts: {
      title: "♦️ ❨ الاشـتـراكـــات الـمـمـيـــزة ❩ ♦️",
      lines: [
        "💡 وصول كامل لأشهر المنصات الترفيهية.",
        "💡 نوفر أقوى أدوات الذكاء الاصطناعي.",
        "💡 اشتراكات رسمية مع ضمان طوال الفترة.",
      ],
      footer: "⬇️ يرجى اختيار الفئة لاستعراض التطبيقات المتاحة ⬇️",
    },
    social_accounts: {
      title: "♦️ ❨ الـحـسـابـــات الـجـاهـــزة ❩ ♦️",
      lines: [
        "💡 شراء حسابات جاهزة وموثقة للاستخدام.",
        "💡 تشمل مختلف وسائل التواصل الاجتماعي.",
        "💡 يتم تسليم بيانات الدخول فوراً بعد الدفع.",
      ],
      footer: "⬇️ يرجى اختيار المنصة لاستعراض الحسابات ⬇️",
    },
    cloud_services: {
      title: "♦️ ❨ الـخـــدمـــات الـسـحـابـيـــة ❩ ♦️",
      lines: [
        "💡 بنية تحتية رقمية متكاملة لمشروعك.",
        "💡 تشمل الاستضافات، النطاقات، والخوادم.",
        "💡 أداء فائق ومستقر يناسب كافة الأعمال.",
      ],
      footer: "⬇️ يرجى تحديد الخدمة السحابية لإعدادها ⬇️",
    },
    virtual_visa: {
      title: "♦️ ❨ الـبـطـاقـــات الافـتـراضـيـــة ❩ ♦️",
      lines: [
        "💡 بطاقات دفع رقمية (VCC) صالحة للشراء.",
        "💡 تدعم تفعيل الباي بال والمتاجر العالمية.",
        "💡 آمنة تماماً وتحمي بياناتك البنكية.",
      ],
      footer: "⬇️ يرجى اختيار نوع البطاقة والرصيد المطلوب ⬇️",
    },
    temporary_emails: {
      title: "♦️ ❨ الـبـريـــد الـمـؤقـــت ❩ ♦️",
      lines: [
        "💡 أنشئ صناديق بريد إلكتروني سريعة.",
        "💡 ممتازة لتخطي التسجيلات الوهمية.",
        "💡 احمِ بريدك الأساسي من الرسائل المزعجة.",
      ],
      footer: "⬇️ يرجى الضغط أدناه لتوليد بريد إلكتروني جديد ⬇️",
    },
    balance_topup: {
      title: "♦️ ❨ الـمـحـفـظـــة والـرصـيـــد ❩ ♦️",
      lines: [
        "💡 رصيدك الحالي متاح للاستخدام الفوري: {balance}$",
        "💡 يمكنك شحن حسابك عبر بوابات الدفع الآمنة.",
        "💡 الرصيد لا يمتلك تاريخ صلاحية وسيبقى محفوظاً.",
      ],
      footer: "⬇️ يرجى اختيار طريقة الدفع لإيداع الرصيد ⬇️",
    },
  },
  en: {
    virtual_numbers: {
      title: "♦️ ❨ VIRTUAL NUMBERS ❩ ♦️",
      lines: [
        "💡 Get international numbers for account activation.",
        "💡 All numbers are secure and delivered instantly.",
        "💡 Activation SMS arrives directly inside the bot.",
      ],
      footer: "⬇️ Please choose the country to buy a number from ⬇️",
    },
    game_topup: {
      title: "♦️ ❨ GAME TOP-UP ❩ ♦️",
      lines: [
        "💡 Top up popular games using your game ID.",
        "💡 Competitive pricing across all packages.",
        "💡 Fast and trusted execution with no delay.",
      ],
      footer: "⬇️ Please choose the game you want to top up ⬇️",
    },
    social_boost: {
      title: "♦️ ❨ SOCIAL ACCOUNT BOOST ❩ ♦️",
      lines: [
        "💡 Complete services to boost your accounts.",
        "💡 Followers and views with high quality.",
        "💡 Refill and compensation options available.",
      ],
      footer: "⬇️ Please choose the platform to promote on ⬇️",
    },
    pro_accounts: {
      title: "♦️ ❨ PREMIUM SUBSCRIPTIONS ❩ ♦️",
      lines: [
        "💡 Full access to top entertainment platforms.",
        "💡 Powerful AI tools are available.",
        "💡 Official subscriptions with full warranty.",
      ],
      footer: "⬇️ Please choose a category to view apps ⬇️",
    },
    social_accounts: {
      title: "♦️ ❨ READY ACCOUNTS ❩ ♦️",
      lines: [
        "💡 Buy ready-to-use verified accounts.",
        "💡 Covers major social media platforms.",
        "💡 Login details delivered instantly after payment.",
      ],
      footer: "⬇️ Please choose a platform to view accounts ⬇️",
    },
    cloud_services: {
      title: "♦️ ❨ CLOUD SERVICES ❩ ♦️",
      lines: [
        "💡 Complete digital infrastructure for your project.",
        "💡 Hosting, domains, and cloud servers included.",
        "💡 High and stable performance for all needs.",
      ],
      footer: "⬇️ Please choose a cloud service to configure ⬇️",
    },
    virtual_visa: {
      title: "♦️ ❨ VIRTUAL CARDS ❩ ♦️",
      lines: [
        "💡 Virtual cards (VCC) for secure online payments.",
        "💡 Supports PayPal and global marketplaces.",
        "💡 Fully secure and protects your banking data.",
      ],
      footer: "⬇️ Please choose card type and required balance ⬇️",
    },
    temporary_emails: {
      title: "♦️ ❨ TEMP MAIL ❩ ♦️",
      lines: [
        "💡 Generate quick temporary mailboxes.",
        "💡 Perfect for temporary verifications.",
        "💡 Protect your primary email from spam.",
      ],
      footer: "⬇️ Tap below to generate a new email address ⬇️",
    },
    balance_topup: {
      title: "♦️ ❨ WALLET & BALANCE ❩ ♦️",
      lines: [
        "💡 Your current balance is ready to use: {balance}$",
        "💡 Top up securely through trusted gateways.",
        "💡 Balance never expires and stays in your wallet.",
      ],
      footer: "⬇️ Please choose a payment method to deposit ⬇️",
    },
  },
};

function applyVars(text, vars) {
  return Object.entries(vars || {}).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    text
  );
}

function buildVaultxServiceCard(lang, key, vars = {}) {
  const pack = (CARDS[lang] || CARDS.ar)[key] || CARDS.ar[key];
  if (!pack) return "";

  const lines = (pack.lines || []).map((line) => applyVars(line, vars));
  return [
    "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
    FRAME,
    pack.title,
    "",
    ...lines,
    FRAME,
    pack.footer,
  ].join("\n");
}

module.exports = {
  buildVaultxServiceCard,
};

