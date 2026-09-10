const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { GAME_TOPUP_CATALOG } = require("../constants/gameTopupCatalog");
const { logBotError } = require("./errorLogger");

const CACHE_FILE_PATH = path.resolve(__dirname, "..", "..", "data", "game-topup-catalog.json");
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

let catalogState = null;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildDefaultState() {
  return {
    version: GAME_TOPUP_CATALOG.version,
    currency: GAME_TOPUP_CATALOG.currency,
    updatedAt: new Date().toISOString(),
    providerUpdatedAt: null,
    games: cloneJson(GAME_TOPUP_CATALOG.games),
    categories: cloneJson(GAME_TOPUP_CATALOG.categories),
  };
}

function ensureCacheDir() {
  fs.mkdirSync(path.dirname(CACHE_FILE_PATH), { recursive: true });
}

function saveState(state) {
  ensureCacheDir();
  fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function loadState() {
  if (catalogState) return catalogState;
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, "utf8"));
      if (parsed && Array.isArray(parsed.games) && Array.isArray(parsed.categories)) {
        catalogState = parsed;
        return catalogState;
      }
    }
  } catch (error) {
    logBotError("gameTopupCatalog.loadState", error);
  }

  catalogState = buildDefaultState();
  saveState(catalogState);
  return catalogState;
}

function normalizeProviderOverrides(data) {
  if (!data || typeof data !== "object") return null;
  if (data.games && typeof data.games === "object") return data.games;
  if (Array.isArray(data.games)) {
    const map = {};
    data.games.forEach((entry) => {
      if (entry && entry.key) {
        map[String(entry.key)] = entry;
      }
    });
    return map;
  }
  return null;
}

function applyGameOverride(baseGame, overrideGame) {
  if (!overrideGame || typeof overrideGame !== "object") return baseGame;
  const updated = { ...baseGame };

  if (Array.isArray(overrideGame.packages) && overrideGame.packages.length) {
    updated.packages = baseGame.packages.map((pkg, index) => {
      const overridePkg = overrideGame.packages[index];
      if (!overridePkg || typeof overridePkg !== "object") return pkg;
      const nextPrice = Number(overridePkg.priceRub);
      return {
        ...pkg,
        ...(overridePkg.units_ar ? { units_ar: String(overridePkg.units_ar) } : {}),
        ...(overridePkg.units_en ? { units_en: String(overridePkg.units_en) } : {}),
        ...(Number.isFinite(nextPrice) && nextPrice > 0 ? { priceRub: Number(nextPrice) } : {}),
      };
    });
  }

  if (overrideGame.custom && typeof overrideGame.custom === "object") {
    const customPrice = Number(overrideGame.custom.unitPriceRub);
    const customMin = Number(overrideGame.custom.min);
    const customMax = Number(overrideGame.custom.max);
    updated.custom = {
      ...baseGame.custom,
      ...(overrideGame.custom.unitLabelAr ? { unitLabelAr: String(overrideGame.custom.unitLabelAr) } : {}),
      ...(overrideGame.custom.unitLabelEn ? { unitLabelEn: String(overrideGame.custom.unitLabelEn) } : {}),
      ...(Number.isFinite(customPrice) && customPrice > 0 ? { unitPriceRub: customPrice } : {}),
      ...(Number.isFinite(customMin) && customMin > 0 ? { min: customMin } : {}),
      ...(Number.isFinite(customMax) && customMax > 0 ? { max: customMax } : {}),
    };
  }

  if (overrideGame.providerServiceId) {
    updated.providerServiceId = String(overrideGame.providerServiceId);
  }

  return updated;
}

async function fetchProviderCatalogOverrides() {
  const apiUrl = String(process.env.GAME_TOPUP_API_URL || "").trim();
  const apiKey = String(process.env.GAME_TOPUP_API_KEY || "").trim();
  if (!apiUrl || !apiKey) return null;

  try {
    const response = await axios.get(apiUrl, {
      timeout: 20000,
      params: {
        key: apiKey,
        action: "game_catalog",
      },
    });
    return normalizeProviderOverrides(response.data);
  } catch (error) {
    logBotError("gameTopupCatalog.fetchProviderCatalogOverrides", error);
    return null;
  }
}

async function maybeRefreshGameTopupCatalog(force = false) {
  const state = loadState();
  const apiUrl = String(process.env.GAME_TOPUP_API_URL || "").trim();
  const apiKey = String(process.env.GAME_TOPUP_API_KEY || "").trim();
  if (!apiUrl || !apiKey) return state;

  const lastProviderUpdate = state.providerUpdatedAt ? new Date(state.providerUpdatedAt).getTime() : 0;
  if (!force && Number.isFinite(lastProviderUpdate) && Date.now() - lastProviderUpdate < REFRESH_INTERVAL_MS) {
    return state;
  }

  const overrides = await fetchProviderCatalogOverrides();
  if (!overrides) return state;

  const merged = {
    ...state,
    games: state.games.map((game) => applyGameOverride(game, overrides[String(game.key)])),
    providerUpdatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  catalogState = merged;
  saveState(merged);
  return merged;
}

async function getGameTopupCatalog() {
  await maybeRefreshGameTopupCatalog(false);
  return loadState();
}

function getGameByKey(catalog, gameKey) {
  return catalog.games.find((item) => item.key === String(gameKey)) || null;
}

function getCategoryByKey(catalog, categoryKey) {
  return catalog.categories.find((item) => item.key === String(categoryKey)) || null;
}

function getGamesByCategory(catalog, categoryKey) {
  return catalog.games.filter((item) => item.categoryKey === String(categoryKey));
}

module.exports = {
  getGameTopupCatalog,
  maybeRefreshGameTopupCatalog,
  getGameByKey,
  getCategoryByKey,
  getGamesByCategory,
};

