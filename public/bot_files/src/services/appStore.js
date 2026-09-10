const {
  ADMIN_ID,
  USERS_DB_PATH,
  CONFIG_DB_PATH,
  TRANSACTIONS_DB_PATH,
  STORE_DB_PATH,
} = require("../config");
const { loadData, saveData } = require("./jsonStorage");

class AppStore {
  constructor() {
    this.users = [];
    this.config = this.getDefaultConfig();
    this.transactions = [];
    this.loadAll();
  }

  getDefaultConfig() {
    return {
      services: {
        virtual_numbers: { price: 1, enabled: true },
        social_boost: { price: 2, enabled: true },
        game_topup: { price: 3, enabled: true },
        social_accounts: { price: 2.5, enabled: true },
        pro_accounts: { price: 4, enabled: true },
        cloud_services: { price: 5, enabled: true },
        virtual_visa: { price: 6, enabled: true },
        temporary_emails: { price: 0.5, enabled: true },
        other_services: { price: 1.5, enabled: true },
        balance_topup: { price: 0, enabled: true },
      },
      botStats: {
        totalRequests: 0,
        totalProfits: 0,
        todayProfits: 0,
        todayDate: new Date().toISOString().slice(0, 10),
      },
      giftCodes: {},
      temporaryEmailInventory: {},
    };
  }

  loadAll() {
    const legacyStore = loadData(STORE_DB_PATH, null);
    this.users = loadData(USERS_DB_PATH, legacyStore?.users || []).map((user) => this.normalizeUser(user));
    const defaults = this.getDefaultConfig();
    const loaded = loadData(
      CONFIG_DB_PATH,
      legacyStore ? { services: legacyStore.services, botStats: legacyStore.botStats } : defaults
    ) || {};

    this.config = {
      ...defaults,
      ...loaded,
      services: {
        ...defaults.services,
        ...(loaded.services || {}),
      },
      botStats: {
        ...defaults.botStats,
        ...(loaded.botStats || {}),
      },
      temporaryEmailInventory: {
        ...(loaded.temporaryEmailInventory || {}),
      },
    };
    this.transactions = loadData(TRANSACTIONS_DB_PATH, legacyStore?.transactions || []);
    this.persistAll();
  }

  persistAll() {
    saveData(USERS_DB_PATH, this.users);
    saveData(CONFIG_DB_PATH, this.config);
    saveData(TRANSACTIONS_DB_PATH, this.transactions);
  }

  normalizeUser(user) {
    return {
      userId: Number(user.userId),
      username: user.username || "",
      firstName: user.firstName || "",
      balance: Number(user.balance || 0),
      usdBalance: Number(user.usdBalance || 0),
      totalDeposits: Number(user.totalDeposits || 0),
      currency: "RUB",
      level: user.level || "Newbie",
      language: user.language || "ar",
      role: user.role || (Number(user.userId) === ADMIN_ID ? "admin" : "user"),
      isActive: user.isActive !== false,
      isVerified: Boolean(user.isVerified),
      transactionsCount: Number(user.transactionsCount || 0),
      invitedBy: user.invitedBy || null,
      referralRewarded: Boolean(user.referralRewarded),
      referralCommissionCount: Number(user.referralCommissionCount || 0),
      notifyPromotions: user.notifyPromotions !== false,
      redeemedGiftCodes: Array.isArray(user.redeemedGiftCodes) ? user.redeemedGiftCodes : [],
      lastSeenAt: user.lastSeenAt || new Date().toISOString(),
      createdAt: user.createdAt || new Date().toISOString(),
    };
  }

  getUsers() {
    return this.users;
  }

  findUserById(userId) {
    return this.users.find((user) => user.userId === Number(userId));
  }

  createUser(telegramUser, invitedBy = null) {
    const user = this.normalizeUser({
      userId: telegramUser.id,
      username: telegramUser.username || "",
      firstName: telegramUser.first_name || "",
      invitedBy,
    });

    this.users.push(user);
    this.persistAll();
    return user;
  }

  getOrCreateUser(telegramUser, options = {}) {
    const invitedBy = options.invitedBy ? Number(options.invitedBy) : null;
    const existing = this.findUserById(telegramUser.id);

    if (existing) {
      return this.updateUser(existing.userId, {
        username: telegramUser.username || existing.username,
        firstName: telegramUser.first_name || existing.firstName,
        invitedBy: existing.invitedBy || invitedBy || null,
        lastSeenAt: new Date().toISOString(),
        isActive: true,
      });
    }

    return this.createUser(telegramUser, invitedBy);
  }

  updateUser(userId, updates) {
    const index = this.users.findIndex((user) => user.userId === Number(userId));
    if (index === -1) {
      return null;
    }

    this.users[index] = this.normalizeUser({
      ...this.users[index],
      ...updates,
    });
    this.persistAll();
    return this.users[index];
  }

  addBalance(userId, amount) {
    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }

    user.balance = Number((user.balance + Number(amount)).toFixed(2));
    user.lastSeenAt = new Date().toISOString();
    this.persistAll();
    return user;
  }

  addUsdBalance(userId, amount) {
    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }
    user.usdBalance = Number((Number(user.usdBalance || 0) + Number(amount || 0)).toFixed(2));
    user.lastSeenAt = new Date().toISOString();
    this.persistAll();
    return user;
  }

  deductUsdBalance(userId, amount) {
    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }
    user.usdBalance = Number(Math.max(0, Number(user.usdBalance || 0) - Number(amount || 0)).toFixed(2));
    user.lastSeenAt = new Date().toISOString();
    this.persistAll();
    return user;
  }

  addDeposit(userId, amount) {
    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }

    user.totalDeposits = Number((user.totalDeposits + Number(amount)).toFixed(2));
    this.persistAll();
    return user;
  }

  deductBalance(userId, amount) {
    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }

    user.balance = Number(Math.max(0, user.balance - Number(amount)).toFixed(2));
    user.lastSeenAt = new Date().toISOString();
    this.persistAll();
    return user;
  }

  incrementTransactions(userId) {
    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }

    user.transactionsCount += 1;
    this.persistAll();
    return user;
  }

  addTransaction(entry) {
    this.transactions.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    });
    this.persistAll();
    return this.transactions[this.transactions.length - 1];
  }

  getRecentTransactionsForUser(userId, limit = 5) {
    return this.transactions
      .filter((tx) => Number(tx.userId) === Number(userId) || Number(tx.targetUserId) === Number(userId))
      .slice(-limit)
      .reverse();
  }

  getLatestTransactionByActivationId(activationId) {
    return [...this.transactions]
      .reverse()
      .find((tx) => String(tx.activationId || "") === String(activationId || ""));
  }

  getTransactionById(transactionId) {
    return this.transactions.find((tx) => String(tx.id) === String(transactionId)) || null;
  }

  updateTransactionById(transactionId, updates = {}) {
    const index = this.transactions.findIndex((tx) => String(tx.id) === String(transactionId));
    if (index === -1) {
      return null;
    }

    this.transactions[index] = {
      ...this.transactions[index],
      ...updates,
    };
    this.persistAll();
    return this.transactions[index];
  }

  markActivationNotified(activationId) {
    const index = [...this.transactions]
      .map((tx, idx) => ({ tx, idx }))
      .reverse()
      .find((item) => String(item.tx.activationId || "") === String(activationId || ""))?.idx;

    if (index === undefined) {
      return null;
    }

    this.transactions[index] = {
      ...this.transactions[index],
      activationNotified: true,
    };
    this.persistAll();
    return this.transactions[index];
  }

  getServices() {
    return this.config.services;
  }

  updateServicePrice(serviceKey, price) {
    if (!this.config.services[serviceKey]) {
      return null;
    }

    this.config.services[serviceKey].price = Number(price);
    this.persistAll();
    return this.config.services[serviceKey];
  }

  toggleService(serviceKey) {
    if (!this.config.services[serviceKey]) {
      return null;
    }

    this.config.services[serviceKey].enabled = !this.config.services[serviceKey].enabled;
    this.persistAll();
    return this.config.services[serviceKey];
  }

  incrementRequestCount() {
    this.config.botStats.totalRequests += 1;
    this.persistAll();
  }

  addProfit(amount) {
    const normalized = Number(amount || 0);
    const today = new Date().toISOString().slice(0, 10);

    if (this.config.botStats.todayDate !== today) {
      this.config.botStats.todayDate = today;
      this.config.botStats.todayProfits = 0;
    }

    this.config.botStats.totalProfits = Number((this.config.botStats.totalProfits + normalized).toFixed(2));
    this.config.botStats.todayProfits = Number((this.config.botStats.todayProfits + normalized).toFixed(2));
    this.persistAll();
  }

  getPublicStats() {
    return {
      totalUsers: this.users.length,
      totalTransactions: this.transactions.length,
      activeServices: Object.values(this.config.services).filter((service) => service.enabled).length,
    };
  }

  getDetailedStats() {
    const usage = {};

    for (const tx of this.transactions) {
      if (tx.serviceKey) {
        usage[tx.serviceKey] = (usage[tx.serviceKey] || 0) + 1;
      }
    }

    const mostUsedServiceKey = Object.keys(usage).sort((a, b) => usage[b] - usage[a])[0] || null;
    return {
      totalUsers: this.users.length,
      totalRequests: this.config.botStats.totalRequests,
      mostUsedServiceKey,
    };
  }

  getEarningsStats() {
    return {
      totalProfits: this.config.botStats.totalProfits,
      todayProfits: this.config.botStats.todayProfits,
      totalTransactions: this.transactions.length,
    };
  }

  redeemGiftCode(userId, rawCode) {
    const user = this.findUserById(userId);
    if (!user) {
      return { ok: false, reason: "USER_NOT_FOUND" };
    }

    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) {
      return { ok: false, reason: "INVALID_CODE" };
    }

    const giftCodes = this.config.giftCodes || {};
    const gift = giftCodes[code];
    if (!gift || gift.active === false) {
      return { ok: false, reason: "NOT_FOUND" };
    }

    if (Array.isArray(user.redeemedGiftCodes) && user.redeemedGiftCodes.includes(code)) {
      return { ok: false, reason: "ALREADY_REDEEMED" };
    }

    const maxUses = Number(gift.maxUses || 0);
    const usedBy = Array.isArray(gift.usedBy) ? gift.usedBy : [];
    if (maxUses > 0 && usedBy.length >= maxUses) {
      return { ok: false, reason: "EXHAUSTED" };
    }

    const amount = Number(gift.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: "INVALID_AMOUNT" };
    }

    user.balance = Number((user.balance + amount).toFixed(2));
    user.redeemedGiftCodes = [...(user.redeemedGiftCodes || []), code];
    gift.usedBy = [...usedBy, Number(user.userId)];
    this.config.giftCodes = {
      ...giftCodes,
      [code]: gift,
    };

    this.addTransaction({
      type: "gift_code_redeem",
      userId: user.userId,
      amount,
      code,
      status: "completed",
    });
    this.persistAll();
    return { ok: true, amount, code };
  }

  getTemporaryEmailAccounts(sku) {
    const inventory = this.config.temporaryEmailInventory || {};
    const rows = inventory[sku];
    return Array.isArray(rows) ? rows : [];
  }

  addTemporaryEmailAccount(sku, email, password, addedBy = null) {
    const inventory = this.config.temporaryEmailInventory || {};
    const rows = Array.isArray(inventory[sku]) ? inventory[sku] : [];
    const account = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      email: String(email || "").trim(),
      password: String(password || "").trim(),
      addedBy: addedBy ? Number(addedBy) : null,
      createdAt: new Date().toISOString(),
    };
    this.config.temporaryEmailInventory = {
      ...inventory,
      [sku]: [...rows, account],
    };
    this.persistAll();
    return account;
  }

  consumeTemporaryEmailAccount(sku, accountId) {
    const inventory = this.config.temporaryEmailInventory || {};
    const rows = Array.isArray(inventory[sku]) ? inventory[sku] : [];
    const index = rows.findIndex((row) => String(row.id) === String(accountId));
    if (index === -1) return null;

    const [selected] = rows.splice(index, 1);
    this.config.temporaryEmailInventory = {
      ...inventory,
      [sku]: rows,
    };
    this.persistAll();
    return selected;
  }
}

module.exports = {
  AppStore,
};
