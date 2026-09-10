const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { selectedServiceIds, getServiceInfo } = require("../constants/smmServices");
const { logBotError } = require("./errorLogger");
const { getAxiosNetworkOptions } = require("../utils/network");

const CACHE_FILE = path.join(__dirname, "..", "..", "smm_cache.json");
const { SMM_API_URL, SMM_API_KEY } = process.env;
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

function buildEntry(apiService, previousEntry = null) {
  const serviceId = String(apiService.service || apiService.id || apiService.sid || previousEntry?.serviceId || "");
  const serviceInfo = getServiceInfo(serviceId);
  if (!serviceInfo) return previousEntry;

  const rateUsdPer1000 = Number(apiService.rate ?? previousEntry?.rateUsdPer1000 ?? previousEntry?.rate ?? 0);
  const pricePerUnitRub = calculatePricePerUnitRub(rateUsdPer1000) ?? previousEntry?.pricePerUnitRub ?? null;
  const pricePer1000Rub = calculatePricePer1000Rub(rateUsdPer1000) ?? previousEntry?.pricePer1000Rub ?? null;
  const meta = parseServiceMeta(apiService);
  const description = String(apiService.desc || apiService.description || previousEntry?.description || "").trim();

  return {
    service: Number(apiService.service || apiService.id || apiService.sid || previousEntry?.service || serviceId),
    name: apiService.name || previousEntry?.name || serviceInfo.service.name_ar,
    nameAr: serviceInfo.service.name_ar,
    nameEn: serviceInfo.service.name_en,
    type: apiService.type || previousEntry?.type || "Default",
    rate: String(apiService.rate ?? previousEntry?.rate ?? rateUsdPer1000 ?? ""),
    min: Number(apiService.min ?? previousEntry?.min ?? 0),
    max: Number(apiService.max ?? previousEntry?.max ?? 0),
    dripfeed: typeof apiService.dripfeed === "boolean" ? apiService.dripfeed : Boolean(previousEntry?.dripfeed),
    refill: typeof apiService.refill === "boolean" ? apiService.refill : previousEntry?.refill,
    cancel: typeof apiService.cancel === "boolean" ? apiService.cancel : previousEntry?.cancel,
    category: apiService.category || previousEntry?.category || serviceInfo.category.label_en,
    serviceId,
    categoryKey: serviceInfo.category.key,
    categoryLabelAr: serviceInfo.category.label_ar,
    categoryLabelEn: serviceInfo.category.label_en,
    platformKey: serviceInfo.platform.key,
    platformLabelAr: serviceInfo.platform.label_ar,
    platformLabelEn: serviceInfo.platform.label_en,
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
  return loadCacheFile().find((item) => String(item.serviceId) === id) || null;
}

async function fetchAndCacheSmmServices() {
  const previousServices = loadCacheFile();
  const previousMap = new Map(previousServices.map((item) => [String(item.serviceId), item]));

  const apiUrls = getSmmApiUrls();
  if (!apiUrls.length || !SMM_API_KEY) {
    const error = new Error("SMM_API_URL and SMM_API_KEY must be defined in the environment.");
    logBotError("fetchAndCacheSmmServices.missingEnv", error);
    return previousServices;
  }

  for (const apiUrl of apiUrls) {
    try {
      const response = await axios.get(`${apiUrl}?key=${encodeURIComponent(SMM_API_KEY)}&action=services`, {
        timeout: 20000,
        ...smmNetworkOptions,
      });
      const apiServices = normalizeApiResponse(response.data);
      const filteredMap = new Map();

      for (const apiService of apiServices) {
        const serviceId = String(apiService.service || apiService.id || apiService.sid || "");
        if (!selectedServiceIds.includes(serviceId)) continue;
        filteredMap.set(serviceId, buildEntry(apiService, previousMap.get(serviceId)));
      }

      const mergedServices = selectedServiceIds
        .map((serviceId) => filteredMap.get(serviceId) || previousMap.get(serviceId) || null)
        .filter(Boolean);

      if (!mergedServices.length) return previousServices;

      fs.writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), services: mergedServices }, null, 2), "utf8");
      return mergedServices;
    } catch (error) {
      logBotError("fetchAndCacheSmmServices", error, { apiUrl });
    }
  }

  return previousServices;
}

async function createSmmOrder({ serviceId, link, quantity }) {
  const apiUrls = getSmmApiUrls();
  if (!apiUrls.length || !SMM_API_KEY) {
    return { success: false, error: "missing_env" };
  }

  const payload = {
    key: SMM_API_KEY,
    action: "add",
    service: String(serviceId),
    link: String(link || ""),
    quantity: Number(quantity),
  };

  for (const apiUrl of apiUrls) {
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
      logBotError("createSmmOrder.post", error, { serviceId, quantity, apiUrl });
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
      logBotError("createSmmOrder.get", error, { serviceId, quantity, apiUrl });
    }
  }

  return { success: false, error: "network_error" };
}

module.exports = {
  fetchAndCacheSmmServices,
  getCachedSmmServices,
  getCachedSmmServiceById,
  createSmmOrder,
};
