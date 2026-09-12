const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { selectedServiceIds, getServiceInfo } = require("../constants/smmServices");
const { logBotError } = require("./errorLogger");
const { getAxiosNetworkOptions } = require("../utils/network");
const { notifyAdminAlert } = require("./adminNotifier");

const CACHE_FILE = path.join(__dirname, "..", "..", "smm_cache.json");
const { SMM_API_URL, SMM_API_KEY } = process.env;
const smmProxyUrl = String(process.env.SMM_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "").trim();
const smmNetworkOptions = getAxiosNetworkOptions(smmProxyUrl);

let appStoreInstance = null;

function setSmmAppStore(store) {
  appStoreInstance = store;
}

function parseApiUrls(raw) {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getActiveSmmProviders() {
  if (appStoreInstance && typeof appStoreInstance.getSmmProviders === "function") {
    const list = appStoreInstance.getSmmProviders().filter((p) => p.enabled !== false && p.url && p.key);
    if (list.length > 0) {
      return list;
    }
  }

  const envUrls = parseApiUrls(process.env.SMM_API_URL || SMM_API_URL);
  const envKey = process.env.SMM_API_KEY || SMM_API_KEY || "";
  if (envUrls.length > 0 && envKey) {
    return envUrls.map((url, index) => ({
      id: `env_${index}`,
      name: `SMM Provider ${index + 1}`,
      url,
      key: envKey,
      enabled: true,
    }));
  }

  return [];
}

function normalizeApiResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.services)) return data.services;
  return [];
}

function getCacheFileCandidates() {
  return [
    path.join(__dirname, "..", "..", "smm_cache.json"),
    path.join(__dirname, "..", "smm_cache.json"),
    path.join(process.cwd(), "smm_cache.json"),
    path.join(process.cwd(), "bot_files", "smm_cache.json"),
    path.join(process.cwd(), "bot_files", "src", "smm_cache.json"),
  ];
}

let inMemoryCache = null;

function loadCacheFile() {
  if (inMemoryCache && Array.isArray(inMemoryCache) && inMemoryCache.length > 0) {
    return inMemoryCache;
  }
  for (const filePath of getCacheFileCandidates()) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.services) && parsed.services.length > 0) {
          inMemoryCache = parsed.services;
          return inMemoryCache;
        }
      }
    } catch (error) {}
  }
  return [];
}

function saveCacheFile(services) {
  inMemoryCache = services;
  const payload = JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      services,
    },
    null,
    2
  );

  const targets = [
    path.join(__dirname, "..", "..", "smm_cache.json"),
    path.join(__dirname, "..", "smm_cache.json"),
  ];

  targets.forEach((filePath) => {
    try {
      fs.writeFileSync(filePath, payload, "utf8");
    } catch (e) {}
  });
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
  if (/(real|high quality|hq|premium|guaranteed|30 day|365|lifetime)/i.test(source)) return "high";
  if (/(lq|low quality|bot|cheap|cheapest)/i.test(source)) return "low";
  if (/(fast|instant|quick|0 - 1|0-1|up to)/i.test(source)) return "fast";
  return "medium";
}

function parseServiceMeta(service) {
  const combined = [service.name, service.desc, service.description].filter(Boolean).join("\n");
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
  return Number((((rate / 1000) * 30) * 1.3).toFixed(4));
}

function calculatePricePer1000Rub(rateValue) {
  const rate = Number(rateValue || 0);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return Number(((rate * 30) * 1.3).toFixed(4));
}

function inferPlatformAndCategory(apiService) {
  const text = `${apiService.category || ""} ${apiService.name || ""}`.toLowerCase();
  let platformKey = "other";
  let categoryKey = "general";
  let platformLabelAr = "خدمات أخرى";
  let platformLabelEn = "Other Services";
  let categoryLabelAr = "عام";
  let categoryLabelEn = "General";

  if (text.includes("instagram") || text.includes("انستقرام") || text.includes("إنستغرام")) {
    platformKey = "instagram";
    platformLabelAr = "انستقرام";
    platformLabelEn = "Instagram";
    if (text.includes("follow") || text.includes("متابع")) {
      categoryKey = "followers";
      categoryLabelAr = "رشق متابعين";
      categoryLabelEn = "Followers";
    } else if (text.includes("like") || text.includes("لايك") || text.includes("إعجاب")) {
      categoryKey = "likes";
      categoryLabelAr = "رشق لايكات";
      categoryLabelEn = "Likes";
    } else if (text.includes("view") || text.includes("مشاهد")) {
      categoryKey = "views";
      categoryLabelAr = "رشق مشاهدات";
      categoryLabelEn = "Views";
    }
  } else if (text.includes("telegram") || text.includes("تليجرام") || text.includes("تيليجرام")) {
    platformKey = "telegram";
    platformLabelAr = "تيليجرام";
    platformLabelEn = "Telegram";
    if (text.includes("member") || text.includes("عضو") || text.includes("أعضاء")) {
      categoryKey = "members";
      categoryLabelAr = "رشق أعضاء";
      categoryLabelEn = "Members";
    } else if (text.includes("view") || text.includes("مشاهد")) {
      categoryKey = "views";
      categoryLabelAr = "رشق مشاهدات";
      categoryLabelEn = "Views";
    } else if (text.includes("react") || text.includes("تفاعل")) {
      categoryKey = "reactions";
      categoryLabelAr = "تفاعلات";
      categoryLabelEn = "Reactions";
    }
  } else if (text.includes("tiktok") || text.includes("تيك توك") || text.includes("تيكتوك")) {
    platformKey = "tiktok";
    platformLabelAr = "تيك توك";
    platformLabelEn = "TikTok";
    if (text.includes("follow") || text.includes("متابع")) {
      categoryKey = "followers";
      categoryLabelAr = "رشق متابعين";
      categoryLabelEn = "Followers";
    } else if (text.includes("like") || text.includes("لايك")) {
      categoryKey = "likes";
      categoryLabelAr = "رشق لايكات";
      categoryLabelEn = "Likes";
    } else if (text.includes("view") || text.includes("مشاهد")) {
      categoryKey = "views";
      categoryLabelAr = "رشق مشاهدات";
      categoryLabelEn = "Views";
    }
  } else if (text.includes("facebook") || text.includes("فيسبوك") || text.includes("فيس بوك")) {
    platformKey = "facebook";
    platformLabelAr = "فيسبوك";
    platformLabelEn = "Facebook";
  }

  return {
    platformKey,
    platformLabelAr,
    platformLabelEn,
    categoryKey,
    categoryLabelAr,
    categoryLabelEn,
  };
}

function buildEntry(apiService, previousEntry = null) {
  const serviceId = String(apiService.service || apiService.id || apiService.sid || previousEntry?.serviceId || "");
  const serviceInfo = getServiceInfo(serviceId);
  const inferred = !serviceInfo ? inferPlatformAndCategory(apiService) : null;

  const rateUsdPer1000 = Number(apiService.rate ?? previousEntry?.rateUsdPer1000 ?? previousEntry?.rate ?? 0);
  const pricePerUnitRub = calculatePricePerUnitRub(rateUsdPer1000) ?? previousEntry?.pricePerUnitRub ?? null;
  const pricePer1000Rub = calculatePricePer1000Rub(rateUsdPer1000) ?? previousEntry?.pricePer1000Rub ?? null;
  const meta = parseServiceMeta(apiService);
  const description = String(apiService.desc || apiService.description || previousEntry?.description || "").trim();

  const nameAr = serviceInfo?.service?.name_ar || apiService.name || previousEntry?.nameAr || "خدمة رشق";
  const nameEn = serviceInfo?.service?.name_en || apiService.name || previousEntry?.nameEn || "SMM Service";

  return {
    service: Number(apiService.service || apiService.id || apiService.sid || previousEntry?.service || serviceId),
    name: apiService.name || previousEntry?.name || nameAr,
    nameAr,
    nameEn,
    type: apiService.type || previousEntry?.type || "Default",
    rate: String(apiService.rate ?? previousEntry?.rate ?? rateUsdPer1000 ?? ""),
    min: Number(apiService.min ?? previousEntry?.min ?? 0),
    max: Number(apiService.max ?? previousEntry?.max ?? 0),
    dripfeed: typeof apiService.dripfeed === "boolean" ? apiService.dripfeed : Boolean(previousEntry?.dripfeed),
    refill: typeof apiService.refill === "boolean" ? apiService.refill : previousEntry?.refill,
    cancel: typeof apiService.cancel === "boolean" ? apiService.cancel : previousEntry?.cancel,
    category: apiService.category || previousEntry?.category || serviceInfo?.category?.label_en || inferred?.categoryLabelEn || "General",
    serviceId,
    categoryKey: serviceInfo?.category?.key || inferred?.categoryKey || "general",
    categoryLabelAr: serviceInfo?.category?.label_ar || inferred?.categoryLabelAr || "عام",
    categoryLabelEn: serviceInfo?.category?.label_en || inferred?.categoryLabelEn || "General",
    platformKey: serviceInfo?.platform?.key || inferred?.platformKey || "other",
    platformLabelAr: serviceInfo?.platform?.label_ar || inferred?.platformLabelAr || "أخرى",
    platformLabelEn: serviceInfo?.platform?.label_en || inferred?.platformLabelEn || "Other",
    rateUsdPer1000,
    pricePerUnitRub,
    pricePerUnitRubFormatted: pricePerUnitRub !== null ? pricePerUnitRub.toFixed(4) : previousEntry?.pricePerUnitRubFormatted || null,
    pricePer1000Rub,
    pricePer1000RubFormatted: pricePer1000Rub !== null ? pricePer1000Rub.toFixed(4) : previousEntry?.pricePer1000RubFormatted || null,
    description,
    startTime: meta.startTime || previousEntry?.startTime || null,
    speed: meta.speed || previousEntry?.speed || null,
    dropRate: meta.dropRate || previousEntry?.dropRate || null,
    quality: meta.quality || previousEntry?.quality || "medium",
    refillStatus: apiService.refill === true ? "available" : apiService.refill === false ? (meta.refillText || "unavailable") : (meta.refillText || previousEntry?.refillStatus || null),
    cancelStatus: apiService.cancel === true ? "available" : apiService.cancel === false ? "unavailable" : (previousEntry?.cancelStatus || null),
    providerName: apiService.name || previousEntry?.providerName || "",
  };
}

function getCachedSmmServices() {
  return loadCacheFile();
}

function getCachedSmmServiceById(serviceId) {
  const id = String(serviceId);
  const services = loadCacheFile();
  const direct = services.find((item) => String(item.serviceId) === id || String(item.service) === id);
  if (direct) return direct;
  return null;
}

async function fetchAndCacheSmmServices() {
  const previousServices = loadCacheFile();
  const previousMap = new Map(previousServices.map((item) => [String(item.serviceId), item]));

  const providers = getActiveSmmProviders();
  if (!providers.length) {
    const error = new Error("No active SMM providers configured.");
    logBotError("fetchAndCacheSmmServices.missingProviders", error);
    return previousServices;
  }

  for (const provider of providers) {
    const apiUrl = provider.url;
    const apiKey = provider.key;
    try {
      const response = await axios.get(`${apiUrl}?key=${encodeURIComponent(apiKey)}&action=services`, {
        timeout: 25000,
        ...smmNetworkOptions,
      });

      if (response.data && response.data.error) {
        throw new Error(String(response.data.error));
      }

      const apiServices = normalizeApiResponse(response.data);
      if (!apiServices.length) {
        continue;
      }

      const filteredMap = new Map();

      for (const apiService of apiServices) {
        const serviceId = String(apiService.service || apiService.id || apiService.sid || "");
        if (!serviceId) continue;
        const entry = buildEntry(apiService, previousMap.get(serviceId));
        if (entry) {
          filteredMap.set(serviceId, entry);
        }
      }

      // Merge newly fetched services with previous catalog
      const allIds = new Set([...selectedServiceIds, ...previousMap.keys(), ...filteredMap.keys()]);
      const mergedServices = Array.from(allIds)
        .map((serviceId) => filteredMap.get(serviceId) || previousMap.get(serviceId) || null)
        .filter(Boolean);

      if (mergedServices.length > 0) {
        saveCacheFile(mergedServices);
        return mergedServices;
      }
    } catch (error) {
      const errMsg = String(error?.message || error || "Unknown error");
      logBotError("fetchAndCacheSmmServices", error, { apiUrl: provider.url, providerName: provider.name });

      if (/key|auth|invalid|forbidden|unauthorized|missing/i.test(errMsg)) {
        const alertHtml = [
          `🚨 <b>تنبيه للأدمن: فشل الاتصال بمزود الرشق (SMM)!</b>`,
          `━━━━━━━━━━━━━━━━━━━`,
          `🏢 <b>المزود:</b> ${provider.name}`,
          `🔗 <b>الرابط:</b> <code>${provider.url}</code>`,
          `❌ <b>السبب:</b> <code>${errMsg}</code>`,
          `━━━━━━━━━━━━━━━━━━━`,
          `⚠️ يرجى التوجه إلى <b>لوحة التحكم > مواقع الرشق SMM</b> وتعديل المفتاح أو الرابط.`,
        ].join("\n");

        notifyAdminAlert(null, alertHtml, {
          alertKey: `smm_key_err_${provider.id || provider.name}`,
          cooldownMs: 180000,
        }).catch(() => {});
      }
    }
  }

  return previousServices;
}

async function createSmmOrder({ serviceId, link, quantity }) {
  const providers = getActiveSmmProviders();
  if (!providers.length) {
    return { success: false, error: "missing_providers" };
  }

  for (const provider of providers) {
    const apiUrl = provider.url;
    const apiKey = provider.key;
    const payload = {
      key: apiKey,
      action: "add",
      service: String(serviceId),
      link: String(link || ""),
      quantity: Number(quantity),
    };

    try {
      const postBody = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => postBody.append(key, String(value)));

      const postResponse = await axios.post(apiUrl, postBody.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
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
      logBotError("createSmmOrder.post", error, { serviceId, quantity, apiUrl, providerName: provider.name });
    }

    try {
      const getResponse = await axios.get(apiUrl, {
        params: payload,
        timeout: 20000,
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
      logBotError("createSmmOrder.get", error, { serviceId, quantity, apiUrl, providerName: provider.name });
    }
  }

  return { success: false, error: "network_error" };
}

module.exports = {
  fetchAndCacheSmmServices,
  getCachedSmmServices,
  getCachedSmmServiceById,
  createSmmOrder,
  setSmmAppStore,
  getActiveSmmProviders,
};
