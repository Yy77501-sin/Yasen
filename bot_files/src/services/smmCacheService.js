const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { selectedServiceIds, getServiceInfo: getCuratedServiceInfo } = require("../constants/smmServices");
const { logBotError } = require("./errorLogger");
const { getAxiosNetworkOptions } = require("../utils/network");

const CACHE_FILE = path.join(__dirname, "..", "..", "smm_cache.json");
const { SMM_API_URL, SMM_API_KEY, USD_TO_RUB_RATE = 30 } = process.env;
const smmProxyUrl = String(process.env.SMM_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "").trim();
const smmNetworkOptions = getAxiosNetworkOptions(smmProxyUrl);

function parseApiUrls(raw) {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getSmmApiUrls() {
  const urls = parseApiUrls(process.env.SMM_API_URL || SMM_API_URL);
  return urls.length ? urls : [];
}

function normalizeApiResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.services)) return data.services;
  return [];
}

function loadCacheFile() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.services) ? parsed.services : [];
  } catch (error) {
    return [];
  }
}

function findMetaValue(text, patterns) {
  const source = String(text || "");
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return null;
}

function inferQuality(text) {
  const source = String(text || "").toLowerCase();
  if (/(real|high quality|hq|premium|guaranteed|30 day|365|lifetime|عالية|حقيقي)/i.test(source)) return "high";
  if (/(lq|low quality|bot|cheap|cheapest|رخيص|بوت)/i.test(source)) return "low";
  if (/(fast|instant|quick|0 - 1|0-1|up to|سريع|فوري)/i.test(source)) return "fast";
  return "medium";
}

function parseServiceMeta(service) {
  const combined = [service.name, service.desc, service.description, service.category].filter(Boolean).join("\n");
  return {
    startTime: findMetaValue(combined, [/\[\s*Start\s*Time\s*:\s*([^\]]+)\]/i, /start(?:\s*time)?\s*[:\-]\s*([^\n]+)/i]),
    speed: findMetaValue(combined, [/\[\s*Speed\s*:\s*([^\]]+)\]/i, /speed\s*[:\-]\s*([^\n]+)/i]),
    dropRate: findMetaValue(combined, [/\[\s*Drop(?:\s*Rate)?\s*:\s*([^\]]+)\]/i, /drop(?:\s*rate)?\s*[:\-]\s*([^\n]+)/i]),
    refillText: findMetaValue(combined, [/\[\s*Refill\s*:\s*([^\]]+)\]/i, /refill(?:\s*status)?\s*[:\-]\s*([^\n]+)/i]),
    quality: inferQuality(combined),
  };
}

function calculatePricePerUnitRub(rateValue) {
  const rate = Number(rateValue || 0);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const rateMultiplier = Number(USD_TO_RUB_RATE || 30);
  return Number((((rate / 1000) * rateMultiplier) * 1.3).toFixed(4));
}

function calculatePricePer1000Rub(rateValue) {
  const rate = Number(rateValue || 0);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const rateMultiplier = Number(USD_TO_RUB_RATE || 30);
  return Number(((rate * rateMultiplier) * 1.3).toFixed(4));
}

/**
 * Detect platform from service name or category string
 */
function detectPlatform(name = "", category = "") {
  const text = `${name} ${category}`.toLowerCase();
  if (/telegram|تليجرام|تيليجرام|\btg\b/i.test(text)) {
    return { key: "telegram", label_ar: "تيليجرام", label_en: "Telegram" };
  }
  if (/instagram|انستقرام|انستغرام|\big\b/i.test(text)) {
    return { key: "instagram", label_ar: "انستقرام", label_en: "Instagram" };
  }
  if (/tiktok|تيك توك|تيكتوك|\btt\b/i.test(text)) {
    return { key: "tiktok", label_ar: "تيك توك", label_en: "TikTok" };
  }
  if (/youtube|يوتيوب|\byt\b/i.test(text)) {
    return { key: "youtube", label_ar: "يوتيوب", label_en: "YouTube" };
  }
  if (/facebook|فيسبوك|فيس بوك|\bfb\b/i.test(text)) {
    return { key: "facebook", label_ar: "فيسبوك", label_en: "Facebook" };
  }
  if (/twitter|تويتر|\bx\b/i.test(text)) {
    return { key: "twitter", label_ar: "تويتر", label_en: "Twitter" };
  }
  if (/snapchat|سناب شات|سناب/i.test(text)) {
    return { key: "snapchat", label_ar: "سناب شات", label_en: "Snapchat" };
  }
  if (/threads|ثريدز/i.test(text)) {
    return { key: "threads", label_ar: "ثريدز", label_en: "Threads" };
  }
  if (/whatsapp|واتساب|واتس/i.test(text)) {
    return { key: "whatsapp", label_ar: "واتساب", label_en: "WhatsApp" };
  }
  return { key: "other", label_ar: "منصات أخرى", label_en: "Other Platforms" };
}

/**
 * Detect category from service name or category string
 */
function detectCategory(name = "", category = "", platformKey = "") {
  const text = `${name} ${category}`.toLowerCase();
  if (/member|subscriber|أعضاء|اعضاء|مشترك|قناة|مجموعة|channel|group/i.test(text)) {
    return { key: "members", label_ar: "رشق أعضاء", label_en: "Members" };
  }
  if (/follower|متابع/i.test(text)) {
    return { key: "followers", label_ar: "رشق متابعين", label_en: "Followers" };
  }
  if (/view|مشاهد|سين/i.test(text)) {
    return { key: "views", label_ar: "رشق مشاهدات", label_en: "Views" };
  }
  if (/reaction|تفاعل|رياكشن|emoji/i.test(text)) {
    return { key: "reactions", label_ar: "تفاعلات", label_en: "Reactions" };
  }
  if (/like|إعجاب|اعجاب|لايك/i.test(text)) {
    return { key: "likes", label_ar: "رشق لايكات", label_en: "Likes" };
  }
  if (/comment|تعليق|كومنت/i.test(text)) {
    return { key: "comments", label_ar: "تعليقات", label_en: "Comments" };
  }
  if (/share|مشارك|شير|repost/i.test(text)) {
    return { key: "shares", label_ar: "مشاركات", label_en: "Shares" };
  }
  if (/save|حفظ|bookmark/i.test(text)) {
    return { key: "saves", label_ar: "حفظ منشورات", label_en: "Saves" };
  }
  if (/poll|vote|تصويت|استطلاع/i.test(text)) {
    return { key: "votes", label_ar: "تصويتات", label_en: "Votes" };
  }
  // Default fallback according to platform
  if (platformKey === "telegram") return { key: "members", label_ar: "رشق أعضاء", label_en: "Members" };
  if (platformKey === "instagram" || platformKey === "tiktok") return { key: "followers", label_ar: "رشق متابعين", label_en: "Followers" };
  return { key: "views", label_ar: "رشق مشاهدات", label_en: "Views" };
}

/**
 * Generate human-friendly pure Arabic title for raw API service (0% English)
 */
function cleanServiceNameAr(rawName = "", platformLabelAr = "", categoryLabelAr = "") {
  let text = String(rawName || "").trim();

  // Dictionary of common English terms in SMM services
  const dictionary = [
    { en: /\btelegram\b/gi, ar: "تيليجرام" },
    { en: /\binstagram\b/gi, ar: "انستقرام" },
    { en: /\btiktok\b/gi, ar: "تيك توك" },
    { en: /\byoutube\b/gi, ar: "يوتيوب" },
    { en: /\bfacebook\b/gi, ar: "فيسبوك" },
    { en: /\btwitter\b/gi, ar: "تويتر" },
    { en: /\bsnapchat\b/gi, ar: "سناب شات" },
    { en: /\bthreads\b/gi, ar: "ثريدز" },
    { en: /\bwhatsapp\b/gi, ar: "واتساب" },
    { en: /\bmembers?\b/gi, ar: "أعضاء" },
    { en: /\bsubscribers?\b/gi, ar: "مشتركين" },
    { en: /\bfollowers?\b/gi, ar: "متابعين" },
    { en: /\bpost views?\b/gi, ar: "مشاهدات منشورات" },
    { en: /\bstory views?\b/gi, ar: "مشاهدات ستوري" },
    { en: /\bviews?\b/gi, ar: "مشاهدات" },
    { en: /\breactions?\b/gi, ar: "تفاعلات" },
    { en: /\blikes?\b/gi, ar: "لايكات" },
    { en: /\bcomments?\b/gi, ar: "تعليقات" },
    { en: /\bshares?\b/gi, ar: "مشاركات" },
    { en: /\bpoll votes?\b/gi, ar: "تصويتات استطلاع" },
    { en: /\bvotes?\b/gi, ar: "تصويتات" },
    { en: /\bsaves?\b/gi, ar: "حفظ منشورات" },
    { en: /\breal\b/gi, ar: "حقيقي" },
    { en: /\bhq\b|\bhigh quality\b/gi, ar: "جودة عالية" },
    { en: /\bpremium\b/gi, ar: "ممتاز" },
    { en: /\bguaranteed\b/gi, ar: "مضمون" },
    { en: /\brefill\b/gi, ar: "تعويض تلقائي" },
    { en: /\bnon drop\b|\bno drop\b|\b0% drop\b/gi, ar: "ثابت بدون نقص" },
    { en: /\binstant\b|\bfast\b|\bspeed\b/gi, ar: "فوري سريع" },
    { en: /\bcheap\b|\bcheapest\b/gi, ar: "اقتصادي" },
    { en: /\bcustom\b/gi, ar: "مخصص" },
    { en: /\bfemale\b/gi, ar: "إناث" },
    { en: /\bmale\b/gi, ar: "ذكور" },
    { en: /\barab\b|\barabic\b/gi, ar: "عربي" },
    { en: /\bglobal\b|\bworldwide\b/gi, ar: "عالمي" },
    { en: /\bbots?\b|\blow quality\b/gi, ar: "عادي" },
    { en: /\bchannel\b/gi, ar: "قناة" },
    { en: /\bgroup\b/gi, ar: "مجموعة" },
    { en: /\bdays?\b/gi, ar: "يوم" },
    { en: /\bmax\b/gi, ar: "أقصى" },
    { en: /\bmin\b/gi, ar: "أدنى" },
    { en: /\bauto\b/gi, ar: "تلقائي" },
  ];

  for (const item of dictionary) {
    text = text.replace(item.en, item.ar);
  }

  // Strictly remove ALL English letters (a-z, A-Z)
  text = text.replace(/[a-zA-Z]/g, " ");

  // Remove brackets and noise symbols
  text = text.replace(/[\[\]\(\)\{\}\_\-\|\:\,\/\\]+/g, " ");

  // Clean duplicate spaces
  text = text.replace(/\s+/g, " ").trim();

  // If text is empty or too short, construct clean standard title
  if (!text || text.length < 3) {
    text = `${categoryLabelAr || "خدمة"} ${platformLabelAr || "رشق"} ممتازة`;
  }

  return text.slice(0, 50);
}

function buildEntry(apiService, previousEntry = null, providerInfo = null) {
  const serviceId = String(apiService.service || apiService.id || apiService.sid || previousEntry?.serviceId || "");
  const curated = getCuratedServiceInfo(serviceId);

  const rawName = String(apiService.name || previousEntry?.name || curated?.service?.name_ar || "");
  const rawCat = String(apiService.category || previousEntry?.category || "");

  const platform = curated?.platform || detectPlatform(rawName, rawCat);
  const category = curated?.category || detectCategory(rawName, rawCat, platform.key);

  const rateUsdPer1000 = Number(apiService.rate ?? previousEntry?.rateUsdPer1000 ?? previousEntry?.rate ?? 0);
  const pricePerUnitRub = calculatePricePerUnitRub(rateUsdPer1000) ?? previousEntry?.pricePerUnitRub ?? null;
  const pricePer1000Rub = calculatePricePer1000Rub(rateUsdPer1000) ?? previousEntry?.pricePer1000Rub ?? null;
  const meta = parseServiceMeta(apiService);
  const description = String(apiService.desc || apiService.description || previousEntry?.description || "").trim();

  const nameAr = curated?.service?.name_ar || cleanServiceNameAr(rawName, platform.label_ar, category.label_ar);
  const nameEn = curated?.service?.name_en || rawName || "SMM Service";

  return {
    service: Number(serviceId),
    serviceId,
    name: rawName,
    nameAr,
    nameEn,
    type: apiService.type || previousEntry?.type || "Default",
    rate: String(apiService.rate ?? previousEntry?.rate ?? rateUsdPer1000 ?? ""),
    min: Number(apiService.min ?? previousEntry?.min ?? 10),
    max: Number(apiService.max ?? previousEntry?.max ?? 100000),
    dripfeed: typeof apiService.dripfeed === "boolean" ? apiService.dripfeed : Boolean(previousEntry?.dripfeed),
    refill: typeof apiService.refill === "boolean" ? apiService.refill : previousEntry?.refill,
    cancel: typeof apiService.cancel === "boolean" ? apiService.cancel : previousEntry?.cancel,
    category: rawCat,
    categoryKey: category.key,
    categoryLabelAr: category.label_ar,
    categoryLabelEn: category.label_en,
    platformKey: platform.key,
    platformLabelAr: platform.label_ar,
    platformLabelEn: platform.label_en,
    rateUsdPer1000,
    pricePerUnitRub,
    pricePerUnitRubFormatted: pricePerUnitRub !== null ? pricePerUnitRub.toFixed(4) : previousEntry?.pricePerUnitRubFormatted || null,
    pricePer1000Rub,
    pricePer1000RubFormatted: pricePer1000Rub !== null ? pricePer1000Rub.toFixed(4) : previousEntry?.pricePer1000RubFormatted || null,
    description,
    startTime: meta.startTime || previousEntry?.startTime || "فوري ⚡",
    speed: meta.speed || previousEntry?.speed || "سريع جداً 🚀",
    dropRate: meta.dropRate || previousEntry?.dropRate || "0% بدون نزول 🛡️",
    quality: meta.quality || previousEntry?.quality || "high",
    refillStatus: apiService.refill === true ? "available" : apiService.refill === false ? (meta.refillText || "unavailable") : (meta.refillText || previousEntry?.refillStatus || "available"),
    cancelStatus: apiService.cancel === true ? "available" : apiService.cancel === false ? "unavailable" : (previousEntry?.cancelStatus || "unavailable"),
    providerName: providerInfo?.name || previousEntry?.providerName || "SMM Provider",
    providerUrl: providerInfo?.url || previousEntry?.providerUrl || null,
    providerKey: providerInfo?.key || previousEntry?.providerKey || null,
  };
}

function getCachedSmmServices() {
  return loadCacheFile();
}

function getCachedSmmServiceById(serviceId) {
  const id = String(serviceId);
  return loadCacheFile().find((item) => String(item.serviceId) === id) || null;
}

/**
 * Get all cached services for a specific platform & category
 */
function getCachedSmmServicesByCategory(platformKey, categoryKey) {
  const all = loadCacheFile();
  return all.filter((s) => s.platformKey === platformKey && s.categoryKey === categoryKey);
}

/**
 * Fetch and Cache All SMM Services dynamically from providers
 */
async function fetchAndCacheSmmServices(force = false, appStore = null) {
  const previousServices = loadCacheFile();
  const previousMap = new Map(previousServices.map((item) => [String(item.serviceId), item]));

  // Collect all provider sources (from appStore dynamic list and .env)
  const providersToFetch = [];

  const envUrl = process.env.SMM_API_URL;
  const envKey = process.env.SMM_API_KEY;
  if (envUrl && envKey) {
    providersToFetch.push({ name: "الرئيسي (.env)", url: envUrl, key: envKey });
  }

  if (appStore && typeof appStore.getSmmProviders === "function") {
    const storeProviders = appStore.getSmmProviders().filter((p) => p.enabled !== false && p.url && p.key);
    for (const sp of storeProviders) {
      if (!providersToFetch.some((p) => p.url === sp.url)) {
        providersToFetch.push(sp);
      }
    }
  }

  if (!providersToFetch.length) {
    return previousServices;
  }

  const allMergedMap = new Map(previousMap);

  for (const provider of providersToFetch) {
    try {
      let apiServices = [];

      // Try GET action=services
      try {
        const response = await axios.get(provider.url, {
          params: {
            key: provider.key,
            action: "services",
          },
          timeout: 25000,
          ...smmNetworkOptions,
        });
        apiServices = normalizeApiResponse(response.data);
      } catch (getErr) {
        // Fallback to POST
        const postBody = new URLSearchParams();
        postBody.append("key", provider.key);
        postBody.append("action", "services");
        const postResponse = await axios.post(provider.url, postBody.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 25000,
          ...smmNetworkOptions,
        });
        apiServices = normalizeApiResponse(postResponse.data);
      }

      if (Array.isArray(apiServices) && apiServices.length > 0) {
        for (const apiService of apiServices) {
          const serviceId = String(apiService.service || apiService.id || apiService.sid || "");
          if (!serviceId) continue;
          const entry = buildEntry(apiService, previousMap.get(serviceId), provider);
          if (entry) {
            allMergedMap.set(serviceId, entry);
          }
        }
      }
    } catch (error) {
      logBotError("fetchAndCacheSmmServices", error, { provider: provider.name, url: provider.url });
    }
  }

  const mergedList = Array.from(allMergedMap.values());
  if (mergedList.length > 0) {
    try {
      fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify(
          {
            fetchedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalCount: mergedList.length,
            services: mergedList,
          },
          null,
          2
        ),
        "utf8"
      );
    } catch (writeErr) {
      logBotError("fetchAndCacheSmmServices.writeFile", writeErr);
    }
  }

  return mergedList.length > 0 ? mergedList : previousServices;
}

/**
 * Execute SMM order via Provider API
 */
async function createSmmOrder({ serviceId, link, quantity, appStore = null }) {
  const cached = getCachedSmmServiceById(serviceId);

  let targetUrl = cached?.providerUrl || process.env.SMM_API_URL;
  let targetKey = cached?.providerKey || process.env.SMM_API_KEY;

  if (!targetUrl || !targetKey) {
    if (appStore && typeof appStore.getSmmProviders === "function") {
      const active = appStore.getSmmProviders().find((p) => p.enabled !== false && p.url && p.key);
      if (active) {
        targetUrl = active.url;
        targetKey = active.key;
      }
    }
  }

  if (!targetUrl || !targetKey) {
    return { success: false, error: "missing_env" };
  }

  const payload = {
    key: targetKey,
    action: "add",
    service: String(serviceId),
    link: String(link || ""),
    quantity: Number(quantity),
  };

  // Try POST first
  try {
    const postBody = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => postBody.append(key, String(value)));
    const postResponse = await axios.post(targetUrl, postBody.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 25000,
      ...smmNetworkOptions,
    });
    const data = postResponse?.data;
    if (data && (data.order || data.id)) {
      return { success: true, orderId: String(data.order || data.id), raw: data };
    }
    if (data && data.error) {
      return { success: false, error: String(data.error), raw: data };
    }
  } catch (error) {
    logBotError("createSmmOrder.post", error, { serviceId, quantity, targetUrl });
  }

  // Try GET fallback
  try {
    const getResponse = await axios.get(targetUrl, {
      params: payload,
      timeout: 25000,
      ...smmNetworkOptions,
    });
    const data = getResponse?.data;
    if (data && (data.order || data.id)) {
      return { success: true, orderId: String(data.order || data.id), raw: data };
    }
    if (data && data.error) {
      return { success: false, error: String(data.error), raw: data };
    }
  } catch (error) {
    logBotError("createSmmOrder.get", error, { serviceId, quantity, targetUrl });
  }

  return { success: false, error: "network_error" };
}

module.exports = {
  fetchAndCacheSmmServices,
  getCachedSmmServices,
  getCachedSmmServiceById,
  getCachedSmmServicesByCategory,
  createSmmOrder,
};
