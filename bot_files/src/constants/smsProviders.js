const SMS_PROVIDERS = {
  server1: {
    key: "server1",
    name: "HeroSMS",
    baseUrl: process.env.HERO_BASE_URL || "https://hero-sms.com/stubs/handler_api.php",
    apiKey: process.env.HERO_SMS_API_KEY || process.env.HERO_API_KEY || "",
  },
  server2: {
    key: "server2",
    name: "Grizzly",
    baseUrl: process.env.GRIZZLY_BASE_URL || "https://api.grizzlysms.com/stubs/handler_api.php",
    apiKey: process.env.GRIZZLY_API_KEY || "",
  },
};

let appStoreInstance = null;

function setSmsProviderAppStore(store) {
  appStoreInstance = store;
}

function getSmsProvider(providerKey = "server2") {
  if (appStoreInstance && typeof appStoreInstance.getSmsProvider === "function") {
    const storeProvider = appStoreInstance.getSmsProvider(providerKey);
    if (storeProvider && storeProvider.baseUrl) {
      return storeProvider;
    }
  }
  return SMS_PROVIDERS[providerKey] || SMS_PROVIDERS.server2;
}

module.exports = {
  SMS_PROVIDERS,
  getSmsProvider,
  setSmsProviderAppStore,
};
