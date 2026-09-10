const smmServices = [
  {
    key: "instagram",
    label_ar: "انستقرام",
    label_en: "Instagram",
    icon: "📸",
    categories: [
      {
        key: "followers",
        label_ar: "رشق متابعين",
        label_en: "Followers",
        services: [
          { id: "10143", name_ar: "متابعين انستقرام جودة عالية", name_en: "Instagram Followers High Quality" },
          { id: "8946", name_ar: "متابعين انستقرام حسابات مختلطة", name_en: "Instagram Followers Mixed Accounts" },
          { id: "8784", name_ar: "متابعين انستقرام حسابات قديمة", name_en: "Instagram Followers Old Accounts" },
          { id: "6557", name_ar: "متابعين انستقرام الأرخص عالميًا", name_en: "Instagram Followers Cheapest Worldwide" },
        ],
      },
      {
        key: "views",
        label_ar: "رشق مشاهدات",
        label_en: "Views",
        services: [
          { id: "6454", name_ar: "مشاهدات فيديو انستقرام", name_en: "Instagram Video Views" },
          { id: "3528", name_ar: "مشاهدات ريلز انستقرام", name_en: "Instagram Reels Views" },
          { id: "312", name_ar: "مشاهدات ستوري انستقرام", name_en: "Instagram Story Views" },
        ],
      },
      {
        key: "likes",
        label_ar: "رشق لايكات",
        label_en: "Likes",
        services: [
          { id: "10066", name_ar: "لايكات انستقرام مضمونة", name_en: "Instagram Likes Guaranteed" },
          { id: "4343", name_ar: "لايكات انستقرام بدون ضمان", name_en: "Instagram Likes No Guarantee" },
          { id: "8464", name_ar: "لايكات انستقرام الأرخص", name_en: "Instagram Likes Cheapest" },
        ],
      },
      {
        key: "saves",
        label_ar: "حفظ فيديوهات انستا",
        label_en: "Saves",
        services: [{ id: "805", name_ar: "حفظ تلقائي للمنشورات", name_en: "Instagram Auto Saves" }],
      },
      {
        key: "shares",
        label_ar: "مشاركة فيديوهات انستا",
        label_en: "Shares",
        services: [],
      },
      {
        key: "comments",
        label_ar: "تعليقات انستقرام",
        label_en: "Comments",
        services: [{ id: "8565", name_ar: "تعليقات انستقرام مخصصة", name_en: "Instagram Custom Comments" }],
      },
    ],
  },
  {
    key: "telegram",
    label_ar: "تيليجرام",
    label_en: "Telegram",
    icon: "✈️",
    categories: [
      {
        key: "members",
        label_ar: "رشق أعضاء",
        label_en: "Members",
        services: [
          { id: "3584", name_ar: "أعضاء تليجرام قناة/مجموعة", name_en: "Telegram Members Channel/Group" },
          { id: "7348", name_ar: "أعضاء تليجرام استهداف عربي", name_en: "Telegram Members Arab Targeting" },
        ],
      },
      {
        key: "views",
        label_ar: "رشق مشاهدات",
        label_en: "Views",
        services: [
          { id: "8811", name_ar: "مشاهدات منشور محدد", name_en: "Telegram Post Views" },
          { id: "10032", name_ar: "مشاهدات آخر منشور", name_en: "Telegram Last Post Views" },
        ],
      },
      {
        key: "reactions",
        label_ar: "تفاعلات",
        label_en: "Reactions",
        services: [
          { id: "8612", name_ar: "تفاعلات إيجابية + مشاهدات", name_en: "Telegram Positive Reactions + Views" },
          { id: "8613", name_ar: "تفاعلات سلبية + مشاهدات", name_en: "Telegram Negative Reactions + Views" },
        ],
      },
    ],
  },
  {
    key: "tiktok",
    label_ar: "تيك توك",
    label_en: "TikTok",
    icon: "🎵",
    categories: [
      { key: "followers", label_ar: "رشق متابعين", label_en: "Followers", services: [] },
      { key: "views", label_ar: "رشق مشاهدات", label_en: "Views", services: [] },
      { key: "likes", label_ar: "رشق لايكات", label_en: "Likes", services: [] },
      { key: "comments", label_ar: "تعليقات", label_en: "Comments", services: [] },
      { key: "shares", label_ar: "مشاركات", label_en: "Shares", services: [] },
    ],
  },
  {
    key: "facebook",
    label_ar: "فيسبوك",
    label_en: "Facebook",
    icon: "📘",
    categories: [
      {
        key: "followers",
        label_ar: "رشق متابعين",
        label_en: "Followers",
        services: [
          { id: "9548", name_ar: "متابعين فيسبوك صفحات", name_en: "Facebook Page Followers" },
          { id: "10045", name_ar: "متابعين فيسبوك حساب شخصي", name_en: "Facebook Profile Followers" },
        ],
      },
      {
        key: "views",
        label_ar: "رشق مشاهدات",
        label_en: "Views",
        services: [
          { id: "9572", name_ar: "مشاهدات ريلز فيسبوك", name_en: "Facebook Reels Views" },
          { id: "9604", name_ar: "مشاهدات فيديو فيسبوك", name_en: "Facebook Video Views" },
        ],
      },
      {
        key: "likes_reactions",
        label_ar: "لايكات وتفاعلات",
        label_en: "Likes & Reactions",
        services: [
          { id: "10098", name_ar: "لايكات منشور فيسبوك", name_en: "Facebook Post Likes" },
          { id: "8240", name_ar: "تفاعلات عشوائية فيسبوك", name_en: "Facebook Random Reactions" },
        ],
      },
      {
        key: "shares_comments",
        label_ar: "مشاركات وتعليقات",
        label_en: "Shares & Comments",
        services: [
          { id: "9977", name_ar: "مشاركات منشورات فيسبوك", name_en: "Facebook Post Shares" },
          { id: "9052", name_ar: "تعليقات فيسبوك", name_en: "Facebook Comments" },
        ],
      },
    ],
  },
  {
    key: "kwai",
    label_ar: "كواي",
    label_en: "Kwai",
    icon: "🎞",
    categories: [
      { key: "followers", label_ar: "رشق متابعين", label_en: "Followers", services: [] },
      { key: "views", label_ar: "رشق مشاهدات", label_en: "Views", services: [] },
      { key: "likes", label_ar: "رشق لايكات", label_en: "Likes", services: [] },
    ],
  },
  {
    key: "threads",
    label_ar: "ثريدز",
    label_en: "Threads",
    icon: "🧵",
    categories: [
      { key: "followers", label_ar: "رشق متابعين", label_en: "Followers", services: [] },
      { key: "likes", label_ar: "رشق لايكات", label_en: "Likes", services: [] },
      { key: "comments", label_ar: "تعليقات", label_en: "Comments", services: [] },
    ],
  },
  {
    key: "whatsapp",
    label_ar: "واتساب",
    label_en: "WhatsApp",
    icon: "🟢",
    categories: [
      {
        key: "members",
        label_ar: "رشق أعضاء القنوات",
        label_en: "Channel Members",
        services: [
          { id: "9278", name_ar: "أعضاء قناة واتساب عشوائي", name_en: "WhatsApp Channel Members Random" },
          { id: "9280", name_ar: "أعضاء قناة واتساب عرب", name_en: "WhatsApp Channel Members Arab" },
        ],
      },
      {
        key: "reactions",
        label_ar: "تفاعلات القنوات",
        label_en: "Channel Reactions",
        services: [
          { id: "9290", name_ar: "تفاعلات واتساب عشوائية", name_en: "WhatsApp Random Reactions" },
        ],
      },
      { key: "views", label_ar: "رشق مشاهدات", label_en: "Views", services: [] },
    ],
  },
  {
    key: "youtube",
    label_ar: "يوتيوب",
    label_en: "YouTube",
    icon: "▶️",
    categories: [
      {
        key: "subscribers",
        label_ar: "رشق مشتركين",
        label_en: "Subscribers",
        services: [
          { id: "2122", name_ar: "مشتركين يوتيوب الأرخص عالميًا", name_en: "YouTube Subscribers Cheapest" },
          { id: "3519", name_ar: "مشتركين يوتيوب ضمان 30 يوم", name_en: "YouTube Subscribers 30D Guarantee" },
        ],
      },
      {
        key: "views",
        label_ar: "رشق مشاهدات",
        label_en: "Views",
        services: [
          { id: "903", name_ar: "مشاهدات يوتيوب ضمان مدى الحياة", name_en: "YouTube Views Lifetime" },
          { id: "1728", name_ar: "مشاهدات يوتيوب ترند", name_en: "YouTube Trending Views" },
        ],
      },
      {
        key: "likes_shares",
        label_ar: "لايكات ومشاركات",
        label_en: "Likes & Shares",
        services: [
          { id: "9534", name_ar: "لايكات فيديو يوتيوب", name_en: "YouTube Video Likes" },
          { id: "8622", name_ar: "مشاركات يوتيوب", name_en: "YouTube Shares" },
        ],
      },
      {
        key: "comments",
        label_ar: "تعليقات",
        label_en: "Comments",
        services: [
          { id: "7676", name_ar: "تعليقات يوتيوب عشوائية", name_en: "YouTube Random Comments" },
          { id: "7679", name_ar: "تعليقات يوتيوب عربية", name_en: "YouTube Arabic Comments" },
        ],
      },
    ],
  },
  {
    key: "twitter",
    label_ar: "تويتر",
    label_en: "Twitter",
    icon: "🐦",
    categories: [
      { key: "followers", label_ar: "رشق متابعين", label_en: "Followers", services: [] },
      { key: "views", label_ar: "رشق مشاهدات", label_en: "Views", services: [] },
      { key: "likes", label_ar: "رشق لايكات", label_en: "Likes", services: [] },
      { key: "retweets", label_ar: "ريتويت", label_en: "Retweets", services: [] },
      { key: "comments", label_ar: "تعليقات", label_en: "Comments", services: [] },
    ],
  },
  {
    key: "likee",
    label_ar: "لايكي",
    label_en: "Likee",
    icon: "💚",
    categories: [
      { key: "followers", label_ar: "رشق متابعين", label_en: "Followers", services: [] },
      { key: "views", label_ar: "رشق مشاهدات", label_en: "Views", services: [] },
      { key: "likes", label_ar: "رشق لايكات", label_en: "Likes", services: [] },
      { key: "comments", label_ar: "تعليقات", label_en: "Comments", services: [] },
    ],
  },
];

const selectedServiceIds = smmServices.flatMap((platform) =>
  platform.categories.flatMap((category) => category.services.map((service) => String(service.id)))
);

function getPlatform(platformKey) {
  return smmServices.find((platform) => platform.key === platformKey) || null;
}

function getCategory(platformKey, categoryKey) {
  const platform = getPlatform(platformKey);
  if (!platform) return null;
  return platform.categories.find((category) => category.key === categoryKey) || null;
}

function getServiceInfo(serviceId) {
  const id = String(serviceId);
  for (const platform of smmServices) {
    for (const category of platform.categories) {
      const service = category.services.find((item) => String(item.id) === id);
      if (service) {
        return {
          platform,
          category,
          service,
        };
      }
    }
  }
  return null;
}

module.exports = {
  smmServices,
  selectedServiceIds,
  getPlatform,
  getCategory,
  getServiceInfo,
};
