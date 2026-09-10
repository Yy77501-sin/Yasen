const TEMP_EMAIL_GROUPS = {
  plus: {
    key: "plus",
    arName: "حسابات إيميل بلس",
    enName: "Plus Email Accounts",
    introAr: [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ حـسـابـــات إيـمـيـــل بـلـــس ❩ ♦️",
      "💡 إيميلات جاهزة وموثوقة (Outlook, Proton...).",
      "💡 حسابات نهائية تصبح ملكاً لك بالكامل.",
      "💡 ممتازة للتسجيل في المواقع التي ترفض الإيميل الوهمي.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى اختيار نوع مزود البريد المطلوب ⬇️",
    ].join("\n"),
    introEn: [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ P L U S  E M A I L  A C C O U N T S ❩ ♦️",
      "💡 Ready and trusted email accounts (Outlook, Proton...).",
      "💡 Permanent ownership after purchase.",
      "💡 Great for platforms that reject temporary mail.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ Please choose your preferred provider ⬇️",
    ].join("\n"),
    options: [
      { sku: "plus_outlook", arName: "Outlook", enName: "Outlook", price: 10 },
      { sku: "plus_protonmail", arName: "ProtonMail", enName: "ProtonMail", price: 10 },
      { sku: "plus_gmail", arName: "Gmail", enName: "Gmail", price: 5 },
    ],
  },
  business: {
    key: "business",
    arName: "إيميل الأعمال والطلاب",
    enName: "Business & Edu Email",
    introAr: [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ إيـمـيـــل الأعـمـــال والـطـــلاب ❩ ♦️",
      "💡 إيميلات احترافية بأسماء نطاقات رسمية.",
      "💡 تتوفر إيميلات جامعية للحصول على الخصومات.",
      "💡 تسليم فوري لبيانات الدخول (الإيميل وكلمة المرور).",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى تحديد فئة الإيميل الذي ترغب بشرائه ⬇️",
    ].join("\n"),
    introEn: [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ B U S I N E S S  &  E D U  E M A I L ❩ ♦️",
      "💡 Professional domain-based mailboxes.",
      "💡 Includes education emails for student discounts.",
      "💡 Instant delivery of login credentials.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ Please choose the email category ⬇️",
    ].join("\n"),
    options: [
      { sku: "business_edu", arName: "إيميل طالب Edu", enName: "Edu Student Email", price: 22 },
      { sku: "business_company", arName: "إيميل شركة احترافي", enName: "Professional Company Email", price: 28 },
    ],
  },
  permanent: {
    key: "permanent",
    arName: "الإيميل الدائم",
    enName: "Permanent Email",
    introAr: [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ نـوع الإيـمـيـــل الـدائـــم ❩ ♦️",
      "💡 احصل على إيميل دائم وموثوق لمشاريعك.",
      "💡 يمكنك اختيار إيميل جاهز للاستلام الفوري.",
      "💡 أو إنشاء إيميل مخصص بالاسم الذي تريده.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ يرجى تحديد نوع الإيميل الذي ترغب به ⬇️",
    ].join("\n"),
    introEn: [
      "💠  𝐕 𝐀 𝐔 𝐋 𝐓 - 𝐗  💠",
      "━━━━━━━━━━━━━━━━━━",
      "♦️ ❨ P E R M A N E N T  E M A I L  T Y P E ❩ ♦️",
      "💡 Get a permanent and trusted mailbox.",
      "💡 Choose a ready account for instant delivery.",
      "💡 Or create a custom email with your own name.",
      "━━━━━━━━━━━━━━━━━━",
      "⬇️ Please choose your preferred type ⬇️",
    ].join("\n"),
    options: [
      { sku: "permanent_custom", arName: "إيميل مخصص (باسمك)", enName: "Custom Email (Your Name)", price: 8, custom: true },
      { sku: "permanent_ready", arName: "إيميل جاهز (استلام فوري)", enName: "Ready Email (Instant Delivery)", price: 5 },
    ],
  },
};

const TEMP_EMAIL_ITEM_INDEX_TO_GROUP = {
  1: "business",
  2: "permanent",
  3: "plus",
};

function getTempEmailGroup(groupKey) {
  return TEMP_EMAIL_GROUPS[groupKey] || null;
}

function getTempEmailOptionBySku(sku) {
  for (const group of Object.values(TEMP_EMAIL_GROUPS)) {
    const found = group.options.find((option) => option.sku === sku);
    if (found) {
      return { ...found, groupKey: group.key, group };
    }
  }
  return null;
}

module.exports = {
  TEMP_EMAIL_GROUPS,
  TEMP_EMAIL_ITEM_INDEX_TO_GROUP,
  getTempEmailGroup,
  getTempEmailOptionBySku,
};
