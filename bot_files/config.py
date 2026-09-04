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
    ADMIN_ID = int(os.getenv("ADMIN_ID","8097770003").strip() or "0")
except ValueError:
    ADMIN_ID = 0

# =========================================================
# FiveSIM
# =========================================================

FIVESIM_API_KEY = os.getenv("FIVESIM_API_KEY", "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTk4MTcyOTksImlhdCI6MTc4ODI4MTI5OSwicmF5IjoiYmJlMjZmZGFkZGMzM2FiMzFlNDBhM2JmYjNmMTJkMDciLCJzdWIiOjQ0NzgxNTN9.QBAYyUjtp1JdDHdTu50ErRkFP2_BCfvK3O6Htnd6lQkRnD_WEtIPAzvObmpPrINpkx8UUB3h6OT3-rWUGGITU38ZQ5HgOXK6CCRPNuPFMasrHeFFnX9CSOoqa4Lz86NsxF4w3dcBLurR60D-S6cI4Jsk-dPQwXU8OgOamwe37NdM4D2QB5blx9VJgbHVg9jIoeVXMiNaeKdZYHFSHSL8wULCS9ug6EnwzlIDgyreFmFghzLPh20FCysZR0r7I_jcElmmUZAwU8uc94bNxOZ4udBKIZ08JgU1crusM-PWaBsH1TnEYsXKrQlQGQg0LD-pBW97X1iXeAPmWRR0PboNzQ").strip()

# عنوان API الرسمي الجديد
FIVESIM_BASE_URL = os.getenv(
    "FIVESIM_BASE_URL",
    "https://5sim.net/v1"
).strip().rstrip("/")

# مهلة طلبات FiveSIM بالثواني
FIVESIM_TIMEOUT = int(os.getenv("FIVESIM_TIMEOUT", "121"))

# =========================================================
# Newbot
# =========================================================

BOT_NAME = "Newbot"

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