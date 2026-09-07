# =========================================================
# YasNum - CONFIG
# متوافق مع bot.py
# =========================================================

import os

# =========================================================
# Telegram Bot
# =========================================================

BOT_TOKEN = os.getenv("BOT_TOKEN", "8880668064:AAHFsGU8w_Hzt0-2bxmGB3yDKVwcuPQMiIA").strip()

# ضع ADMIN_ID في Render/Railway كمتغير بيئة.
# مثال: ADMIN_ID=123456789
try:
    ADMIN_ID = int(os.getenv("ADMIN_ID", "8097770003").strip() or "8097770003")
except ValueError:
    ADMIN_ID = 8097770003
if not ADMIN_ID or ADMIN_ID == 0:
    ADMIN_ID = 8097770003

# =========================================================
# مزودي حسابات وأرقام تيليجرام الجاهزة (Telegram Ready Providers)
# =========================================================

# المزود الافتراضي لحسابات تيليجرام الجاهزة
TG_READY_API_KEY = os.getenv("TG_READY_API_KEY", "").strip()
TG_READY_BASE_URL = os.getenv("TG_READY_BASE_URL", "https://api.tg-ready.net").strip()

# =========================================================
# Render Keep-Alive URL (للحفاظ على تشغيل البوت 24/24)
# =========================================================
RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL", "").strip()

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
    "Yy77501"
).strip().lstrip("@")

# روابط القنوات والشروحات
MAIN_CHANNEL_URL = os.getenv("MAIN_CHANNEL_URL", "https://t.me/YasNumChannel").strip()
INSTRUCTIONS_CHANNEL_URL = os.getenv("INSTRUCTIONS_CHANNEL_URL", "https://t.me/YasNumChannel").strip()

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
# Optional service settings & AI
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
AI_CHANNEL_URL = os.getenv("AI_CHANNEL_URL", "").strip()
TELEGRAM_READY_URL = os.getenv("TELEGRAM_READY_URL", "").strip()
SUPPORT_URL = os.getenv("SUPPORT_URL", "").strip()

# =========================================================
# Basic validation
# =========================================================

if not BOT_TOKEN:
    print("WARNING: BOT_TOKEN is not configured.")

if not ADMIN_ID:
    print("WARNING: ADMIN_ID is not configured.")