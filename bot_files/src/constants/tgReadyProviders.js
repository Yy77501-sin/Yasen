const DEFAULT_TG_READY_PROVIDERS = {
  tg_server1: {
    key: "tg_server1",
    name: "موقع أرقام تيليجرام 1 (Grizzly)",
    baseUrl: process.env.GRIZZLY_BASE_URL || "https://api.grizzlysms.com/stubs/handler_api.php",
    apiKey: process.env.GRIZZLY_API_KEY || "",
    enabled: true,
  },
  tg_server2: {
    key: "tg_server2",
    name: "موقع أرقام تيليجرام 2 (HeroSMS)",
    baseUrl: process.env.HERO_BASE_URL || "https://hero-sms.com/stubs/handler_api.php",
    apiKey: process.env.HERO_SMS_API_KEY || process.env.HERO_API_KEY || "",
    enabled: true,
  },
  tg_server3: {
    key: "tg_server3",
    name: "موقع أرقام تيليجرام 3 (SMS-Activate)",
    baseUrl: process.env.SMS3_BASE_URL || "https://api.sms-activate.org/stubs/handler_api.php",
    apiKey: process.env.SMS3_API_KEY || "",
    enabled: false,
  },
  tg_server4: {
    key: "tg_server4",
    name: "موقع أرقام تيليجرام 4 (5SIM)",
    baseUrl: process.env.SMS4_BASE_URL || "https://api1.5sim.net/stubs/handler_api.php",
    apiKey: process.env.SMS4_API_KEY || "",
    enabled: false,
  },
};

let appStoreInstance = null;

function setTgReadyProviderAppStore(store) {
  appStoreInstance = store;
}

function getTgReadyProvider(providerKey = "tg_server1") {
  const fallback = DEFAULT_TG_READY_PROVIDERS[providerKey] || DEFAULT_TG_READY_PROVIDERS.tg_server1;
  if (appStoreInstance && typeof appStoreInstance.getTgReadyProvider === "function") {
    const storeProvider = appStoreInstance.getTgReadyProvider(providerKey);
    if (storeProvider) {
      return {
        ...fallback,
        ...storeProvider,
        baseUrl: storeProvider.baseUrl || fallback?.baseUrl || "",
        apiKey: storeProvider.apiKey !== undefined ? storeProvider.apiKey : (fallback?.apiKey || ""),
        enabled: storeProvider.enabled !== undefined ? storeProvider.enabled : (fallback?.enabled !== false),
      };
    }
  }
  return fallback;
}

function getAllTgReadyProviders() {
  if (appStoreInstance && typeof appStoreInstance.getTgReadyProviders === "function") {
    return appStoreInstance.getTgReadyProviders();
  }
  return DEFAULT_TG_READY_PROVIDERS;
}

module.exports = {
  DEFAULT_TG_READY_PROVIDERS,
  getTgReadyProvider,
  getAllTgReadyProviders,
  setTgReadyProviderAppStore,
};
