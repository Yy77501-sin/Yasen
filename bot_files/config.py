# =========================================================
# YasNum - CONFIG
# متوافق مع bot.py
# =========================================================

import os

# =========================================================
# Telegram Bot
# =========================================================

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()

# ضع ADMIN_ID في Render/Railway كمتغير بيئة.
# مثال: ADMIN_ID=123456789
try:
    ADMIN_ID = int(os.getenv("ADMIN_ID", "0").strip() or "0")
except ValueError:
    ADMIN_ID = 0

# =========================================================
# FiveSIM
# =========================================================

FIVESIM_API_KEY = os.getenv("FIVESIM_API_KEY", "").strip()

# عنوان API الرسمي الجديد
FIVESIM_BASE_URL = os.getenv(
    "FIVESIM_BASE_URL",
    "https://5sim.net/v1"
).strip().rstrip("/")

# مهلة طلبات FiveSIM بالثواني
FIVESIM_TIMEOUT = int(os.getenv("FIVESIM_TIMEOUT", "20"))

# =========================================================
# YasNum
# =========================================================

BOT_NAME = "YasNum"

# هام: مكافأة الإحالة = 0.10 دولار
REFERRAL_REWARD = float(os.getenv("REFERRAL_REWARD", "0.10"))

# هامش الربح الافتراضي
SELL_MARGIN = float(os.getenv("SELL_MARGIN", "0"))

# العملة الافتراضية
DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "USD").strip().upper()

# =========================================================
# Support
# =========================================================

SUPPORT_USERNAME = os.getenv(
    "SUPPORT_USERNAME",
    "@Yy77501"
).strip()

# =========================================================
# Payment information
# عدّل هذه القيم أو ضعها في Environment Variables
# =========================================================

BANK_INFO = os.getenv(
    "BANK_INFO",
    "لم تتم إضافة بيانات الحساب البنكي بعد."
).strip()

WALLET_INFO = os.getenv(
    "WALLET_INFO",
    "لم تتم إضافة بيانات المحفظة بعد."
).strip()

# =========================================================
# Allowed applications
# =========================================================

ALLOWED_APPS = {
    "whatsapp": "WhatsApp",
    "telegram": "Telegram",
    "facebook": "Facebook",
    "instagram": "Instagram",
    "tiktok": "TikTok",
    "google": "Google",
    "twitter": "Twitter",
}

# =========================================================
# Storage
# =========================================================

DATA_FILE = os.getenv(
    "DATA_FILE",
    "yasnum_data.json"
).strip()

# =========================================================
# Optional service settings
# =========================================================

AI_CHANNEL_URL = os.getenv("AI_CHANNEL_URL", "").strip()
TELEGRAM_READY_URL = os.getenv("TELEGRAM_READY_URL", "").strip()
SUPPORT_URL = os.getenv("SUPPORT_URL", "").strip()

# =========================================================
# Basic validation
# =========================================================

if not BOT_TOKEN:
    print("WARNING: BOT_TOKEN is not configured.")

if not FIVESIM_API_KEY:
    print("WARNING: FIVESIM_API_KEY is not configured.")

if not ADMIN_ID:
    print("WARNING: ADMIN_ID is not configured.")
