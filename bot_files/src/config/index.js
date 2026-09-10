require("dotenv").config();

const path = require("path");

const adminIds = String(process.env.ADMIN_IDS || process.env.ADMIN_ID || "")
  .split(",")
  .map((value) => Number(String(value).trim()))
  .filter(Number.isFinite);
const ADMIN_ID = adminIds[0] || null;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN || process.env.CRYPTO_BOT_TOKEN || "";
const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || "";
const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || "";
const USD_TO_RUB_RATE = Number(process.env.USD_TO_RUB_RATE || 30);
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "").trim();
const TELEGRAM_WEBAPP_URL = String(process.env.TELEGRAM_WEBAPP_URL || "").trim();
const SMS_WEBHOOK_TOKEN = String(process.env.SMS_WEBHOOK_TOKEN || "").trim();
const GMAIL_IMAP_USER = String(process.env.GMAIL_IMAP_USER || "").trim();
const GMAIL_IMAP_APP_PASSWORD = String(process.env.GMAIL_IMAP_APP_PASSWORD || "").trim();
const BINANCE_EMAIL_FROM = String(process.env.BINANCE_EMAIL_FROM || "do-not-reply@directmail.binance.com").trim().toLowerCase();
const LOG_CHANNEL_ID = Number(process.env.LOG_CHANNEL_ID || -1003822505585);
const ACTIVATIONS_CHANNEL_ID = Number(process.env.ACTIVATIONS_CHANNEL_ID || -1003311851705);
const PRO_ACCOUNTS_CHANNEL_ID = Number(process.env.PRO_ACCOUNTS_CHANNEL_ID || -1003869626536);
const ADMIN_CHANNEL_ID = Number(process.env.ADMIN_CHANNEL_ID || PRO_ACCOUNTS_CHANNEL_ID);

module.exports = {
  ADMIN_ID,
  ADMIN_IDS: adminIds,
  BOT_TOKEN,
  CRYPTO_PAY_TOKEN,
  CRYPTOMUS_MERCHANT_ID,
  CRYPTOMUS_API_KEY,
  USD_TO_RUB_RATE,
  PUBLIC_BASE_URL,
  TELEGRAM_WEBAPP_URL,
  SMS_WEBHOOK_TOKEN,
  GMAIL_IMAP_USER,
  GMAIL_IMAP_APP_PASSWORD,
  BINANCE_EMAIL_FROM,
  LOG_CHANNEL_ID,
  ACTIVATIONS_CHANNEL_ID,
  PRO_ACCOUNTS_CHANNEL_ID,
  ADMIN_CHANNEL_ID,
  USERS_DB_PATH: path.join(__dirname, "..", "..", "data", "users.json"),
  CONFIG_DB_PATH: path.join(__dirname, "..", "..", "data", "config.json"),
  TRANSACTIONS_DB_PATH: path.join(__dirname, "..", "..", "data", "transactions.json"),
  STATES_DB_PATH: path.join(__dirname, "..", "..", "data", "states.json"),
  STORE_DB_PATH: path.join(__dirname, "..", "..", "data", "store.json"),
  BOT_ERRORS_PATH: path.join(__dirname, "..", "..", "data", "bot-errors.json"),
  USERS_EXPORT_PATH: path.join(__dirname, "..", "..", "runtime", "users-export.txt"),
};
