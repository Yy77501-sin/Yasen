const SMS_PROVIDERS = {
  server1: {
    key: "server1",
    name: "HeroSMS",
    baseUrl: process.env.HERO_BASE_URL || "https://hero-sms.com/stubs/handler_api.php",
    apiKey: process.env.HERO_SMS_API_KEY || process.env.HERO_API_KEY || "",
    enabled: true,
  },
  server2: {
    key: "server2",
    name: "Grizzly",
    baseUrl: process.env.GRIZZLY_BASE_URL || "https://api.grizzlysms.com/stubs/handler_api.php",
    apiKey: process.env.GRIZZLY_API_KEY || "",
    enabled: true,
  },
  server3: {
    key: "server3",
    name: "SMS-Activate",
    baseUrl: process.env.SMS3_BASE_URL || "https://api.sms-activate.org/stubs/handler_api.php",
    apiKey: process.env.SMS3_API_KEY || "",
    enabled: false,
  },
  server4: {
    key: "server4",
    name: "5SIM",
    baseUrl: process.env.SMS4_BASE_URL || "https://api1.5sim.net/stubs/handler_api.php",
    apiKey: process.env.SMS4_API_KEY || "",
    enabled: false,
  },
};

let appStoreInstance = null;

function setSmsProviderAppStore(store) {
  appStoreInstance = store;
}

function getSmsProvider(providerKey = "server2") {
  const fallback = SMS_PROVIDERS[providerKey] || SMS_PROVIDERS.server2;
  if (appStoreInstance && typeof appStoreInstance.getSmsProvider === "function") {
    const storeProvider = appStoreInstance.getSmsProvider(providerKey);
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

module.exports = {
  SMS_PROVIDERS,
  getSmsProvider,
  setSmsProviderAppStore,
};
