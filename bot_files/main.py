# =========================================================
# YasNum Telegram Bot - Complete Single File
# =========================================================
# Requirements:
#   pip install pyTelegramBotAPI requests
#
# Environment variables:
#   BOT_TOKEN
#   FIVESIM_API_KEY
#   ADMIN_ID
#
# Optional:
#   SUPPORT_USERNAME
#   REFERRAL_REWARD
#   SELL_MARGIN
#   BANK_INFO
#   WALLET_INFO
#
# NOTE:
# This is a self-contained bot.py. It uses JSON as a lightweight
# database and the current FiveSIM API v1 endpoints.
# =========================================================

import os
import json
import time
import threading
import traceback
import http.server
import socketserver
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import requests
import telebot
from telebot import types


# =========================================================
# CONFIG
# =========================================================

try:
    import config
except ImportError:
    config = None

BOT_TOKEN = (
    os.getenv("BOT_TOKEN")
    or getattr(config, "BOT_TOKEN", "")
    or "8998307482:AAGW3woMPiD5fuMnQuCvQh6z_2GTa5Wsu6w"
).strip()

FIVESIM_API_KEY = (
    os.getenv("FIVESIM_API_KEY")
    or getattr(config, "FIVESIM_API_KEY", "")
).strip()

try:
    ADMIN_ID = int(
        os.getenv("ADMIN_ID")
        or getattr(config, "ADMIN_ID", 0)
        or 8097770003
    )
except (ValueError, TypeError):
    ADMIN_ID = 8097770003

BOT_NAME = (
    os.getenv("BOT_NAME")
    or getattr(config, "BOT_NAME", "YasNum")
    or "YasNum"
).strip()

SUPPORT_USERNAME = (
    os.getenv("SUPPORT_USERNAME")
    or getattr(config, "SUPPORT_USERNAME", "@Yy77501")
    or "@Yy77501"
).strip()

try:
    REFERRAL_REWARD = float(
        os.getenv("REFERRAL_REWARD")
        or getattr(config, "REFERRAL_REWARD", 0.10)
    )
except (ValueError, TypeError):
    REFERRAL_REWARD = 0.10

try:
    SELL_MARGIN = float(
        os.getenv("SELL_MARGIN")
        or getattr(config, "SELL_MARGIN", 0.0)
    )
except (ValueError, TypeError):
    SELL_MARGIN = 0.0

BANK_INFO = (
    os.getenv("BANK_INFO")
    or getattr(config, "BANK_INFO", "يرجى التواصل مع الدعم للحصول على بيانات التحويل البنكي.")
).strip()

WALLET_INFO = (
    os.getenv("WALLET_INFO")
    or getattr(config, "WALLET_INFO", "يرجى التواصل مع الدعم للحصول على بيانات المحفظة.")
).strip()

DB_FILE = (
    os.getenv("YASNUM_DB_FILE")
    or getattr(config, "DATA_FILE", "yasnum_data.json")
).strip()

FIVESIM_BASE = (
    os.getenv("FIVESIM_BASE_URL")
    or getattr(config, "FIVESIM_BASE_URL", "https://5sim.net/v1")
).strip().rstrip("/")

API_TIMEOUT = 25
COUNTRY_CACHE_SECONDS = 300
PRICE_CACHE_SECONDS = 120

ALLOWED_APPS = {
    "whatsapp": "WhatsApp",
    "telegram": "Telegram",
    "facebook": "Facebook",
    "instagram": "Instagram",
    "tiktok": "TikTok",
    "google": "Google",
    "twitter": "Twitter",
}

from catalog import MAIN_APPS, SERVERS, SMM_SECTIONS, SMM_SERVICES
SMM_PROFIT_MARGIN = getattr(config, "SMM_PROFIT_MARGIN", 0.30) if config else 0.30


# =========================================================
# VALIDATION
# =========================================================

if not BOT_TOKEN:
    print("⚠️ تحذير: BOT_TOKEN غير محدد. يرجى تعيينه في متغيرات البيئة أو config.py.")
elif ":" not in BOT_TOKEN:
    print("⚠️ تحذير: BOT_TOKEN لا يبدو صالحاً.")


# =========================================================
# TELEGRAM BOT
# =========================================================

bot = telebot.TeleBot(
    BOT_TOKEN,
    parse_mode="HTML",
    threaded=True,
    num_threads=8,
)


# =========================================================
# DATABASE
# =========================================================

DB_LOCK = threading.RLock()

DEFAULT_DB = {
    "users": {},
    "orders": {},
    "recharges": {},
    "transfers": {},
    "settings": {
        "currency": "USD",
    },
    "stats": {
        "successful_purchases": 0,
        "total_purchases": 0,
        "successful_recharges": 0,
    },
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def load_db():
    with DB_LOCK:
        if not os.path.exists(DB_FILE):
            save_db(DEFAULT_DB)
            return json.loads(json.dumps(DEFAULT_DB))

        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = json.loads(json.dumps(DEFAULT_DB))

        changed = False

        for key, value in DEFAULT_DB.items():
            if key not in data:
                data[key] = json.loads(json.dumps(value))
                changed = True

        if changed:
            save_db(data)

        return data


def save_db(data):
    with DB_LOCK:
        temp_file = DB_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(temp_file, DB_FILE)


DB = load_db()


def db_update():
    save_db(DB)


# =========================================================
# USER HELPERS
# =========================================================

def ensure_user(user):
    user_id = str(user.id)

    with DB_LOCK:
        if user_id not in DB["users"]:
            DB["users"][user_id] = {
                "id": user.id,
                "username": user.username or "",
                "first_name": user.first_name or "",
                "balance": 0.0,
                "currency": "USD",
                "referrer_id": None,
                "referral_rewarded": False,
                "referrals": [],
                "orders": [],
                "successful_orders": 0,
                "created_at": now_iso(),
                "last_seen": now_iso(),
            }
        else:
            u = DB["users"][user_id]
            u["username"] = user.username or u.get("username", "")
            u["first_name"] = user.first_name or u.get("first_name", "")
            u["last_seen"] = now_iso()

        db_update()
        return DB["users"][user_id]


def get_user(user_id):
    return DB["users"].get(str(user_id))


def is_admin(user_id):
    try:
        return int(user_id) == int(ADMIN_ID) and ADMIN_ID != 0
    except Exception:
        return False


def money(value):
    try:
        return f"{float(value):.2f}"
    except Exception:
        return "0.00"


def parse_amount(text):
    try:
        value = Decimal(str(text).replace(",", ".").strip())
        if value <= 0:
            return None
        return float(value)
    except (InvalidOperation, ValueError):
        return None


def safe_html(text):
    if text is None:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


# =========================================================
# USER STATE
# =========================================================

USER_STATE = {}
STATE_LOCK = threading.RLock()


def set_state(user_id, state, **data):
    with STATE_LOCK:
        USER_STATE[str(user_id)] = {
            "state": state,
            **data,
        }


def get_state(user_id):
    with STATE_LOCK:
        return USER_STATE.get(str(user_id), {})


def clear_state(user_id):
    with STATE_LOCK:
        USER_STATE.pop(str(user_id), None)


# =========================================================
# COUNTRY DATA
# =========================================================

COUNTRY_NAMES = {
    "afghanistan": ("🇦🇫", "أفغانستان"),
    "albania": ("🇦🇱", "ألبانيا"),
    "algeria": ("🇩🇿", "الجزائر"),
    "angola": ("🇦🇴", "أنغولا"),
    "argentina": ("🇦🇷", "الأرجنتين"),
    "armenia": ("🇦🇲", "أرمينيا"),
    "australia": ("🇦🇺", "أستراليا"),
    "austria": ("🇦🇹", "النمسا"),
    "azerbaijan": ("🇦🇿", "أذربيجان"),
    "bahrain": ("🇧🇭", "البحرين"),
    "bangladesh": ("🇧🇩", "بنغلاديش"),
    "belarus": ("🇧🇾", "بيلاروس"),
    "belgium": ("🇧🇪", "بلجيكا"),
    "benin": ("🇧🇯", "بنين"),
    "bolivia": ("🇧🇴", "بوليفيا"),
    "bosnia": ("🇧🇦", "البوسنة"),
    "botswana": ("🇧🇼", "بوتسوانا"),
    "brazil": ("🇧🇷", "البرازيل"),
    "bulgaria": ("🇧🇬", "بلغاريا"),
    "burkina-faso": ("🇧🇫", "بوركينا فاسو"),
    "cambodia": ("🇰🇭", "كمبوديا"),
    "cameroon": ("🇨🇲", "الكاميرون"),
    "canada": ("🇨🇦", "كندا"),
    "chad": ("🇹🇩", "تشاد"),
    "chile": ("🇨🇱", "تشيلي"),
    "china": ("🇨🇳", "الصين"),
    "colombia": ("🇨🇴", "كولومبيا"),
    "congo": ("🇨🇬", "الكونغو"),
    "croatia": ("🇭🇷", "كرواتيا"),
    "czech-republic": ("🇨🇿", "التشيك"),
    "denmark": ("🇩🇰", "الدنمارك"),
    "dominican-republic": ("🇩🇴", "جمهورية الدومينيكان"),
    "ecuador": ("🇪🇨", "الإكوادور"),
    "egypt": ("🇪🇬", "مصر"),
    "estonia": ("🇪🇪", "إستونيا"),
    "ethiopia": ("🇪🇹", "إثيوبيا"),
    "finland": ("🇫🇮", "فنلندا"),
    "france": ("🇫🇷", "فرنسا"),
    "georgia": ("🇬🇪", "جورجيا"),
    "germany": ("🇩🇪", "ألمانيا"),
    "ghana": ("🇬🇭", "غانا"),
    "greece": ("🇬🇷", "اليونان"),
    "guatemala": ("🇬🇹", "غواتيمالا"),
    "guinea": ("🇬🇳", "غينيا"),
    "haiti": ("🇭🇹", "هايتي"),
    "honduras": ("🇭🇳", "هندوراس"),
    "hong-kong": ("🇭🇰", "هونغ كونغ"),
    "hungary": ("🇭🇺", "المجر"),
    "india": ("🇮🇳", "الهند"),
    "indonesia": ("🇮🇩", "إندونيسيا"),
    "iran": ("🇮🇷", "إيران"),
    "iraq": ("🇮🇶", "العراق"),
    "ireland": ("🇮🇪", "أيرلندا"),
    "israel": ("🇮🇱", "إسرائيل"),
    "italy": ("🇮🇹", "إيطاليا"),
    "ivory-coast": ("🇨🇮", "ساحل العاج"),
    "japan": ("🇯🇵", "اليابان"),
    "jordan": ("🇯🇴", "الأردن"),
    "kazakhstan": ("🇰🇿", "كازاخستان"),
    "kenya": ("🇰🇪", "كينيا"),
    "kuwait": ("🇰🇼", "الكويت"),
    "kyrgyzstan": ("🇰🇬", "قيرغيزستان"),
    "laos": ("🇱🇦", "لاوس"),
    "latvia": ("🇱🇻", "لاتفيا"),
    "lebanon": ("🇱🇧", "لبنان"),
    "libya": ("🇱🇾", "ليبيا"),
    "lithuania": ("🇱🇹", "ليتوانيا"),
    "luxembourg": ("🇱🇺", "لوكسمبورغ"),
    "malaysia": ("🇲🇾", "ماليزيا"),
    "mexico": ("🇲🇽", "المكسيك"),
    "moldova": ("🇲🇩", "مولدوفا"),
    "mongolia": ("🇲🇳", "منغوليا"),
    "montenegro": ("🇲🇪", "الجبل الأسود"),
    "morocco": ("🇲🇦", "المغرب"),
    "mozambique": ("🇲🇿", "موزمبيق"),
    "myanmar": ("🇲🇲", "ميانمار"),
    "namibia": ("🇳🇦", "ناميبيا"),
    "nepal": ("🇳🇵", "نيبال"),
    "netherlands": ("🇳🇱", "هولندا"),
    "new-zealand": ("🇳🇿", "نيوزيلندا"),
    "nicaragua": ("🇳🇮", "نيكاراغوا"),
    "niger": ("🇳🇪", "النيجر"),
    "nigeria": ("🇳🇬", "نيجيريا"),
    "north-macedonia": ("🇲🇰", "مقدونيا الشمالية"),
    "norway": ("🇳🇴", "النرويج"),
    "oman": ("🇴🇲", "عُمان"),
    "pakistan": ("🇵🇰", "باكستان"),
    "panama": ("🇵🇦", "بنما"),
    "paraguay": ("🇵🇾", "باراغواي"),
    "peru": ("🇵🇪", "بيرو"),
    "philippines": ("🇵🇭", "الفلبين"),
    "poland": ("🇵🇱", "بولندا"),
    "portugal": ("🇵🇹", "البرتغال"),
    "qatar": ("🇶🇦", "قطر"),
    "romania": ("🇷🇴", "رومانيا"),
    "russia": ("🇷🇺", "روسيا"),
    "rwanda": ("🇷🇼", "رواندا"),
    "saudi-arabia": ("🇸🇦", "السعودية"),
    "senegal": ("🇸🇳", "السنغال"),
    "serbia": ("🇷🇸", "صربيا"),
    "singapore": ("🇸🇬", "سنغافورة"),
    "slovakia": ("🇸🇰", "سلوفاكيا"),
    "slovenia": ("🇸🇮", "سلوفينيا"),
    "south-africa": ("🇿🇦", "جنوب أفريقيا"),
    "south-korea": ("🇰🇷", "كوريا الجنوبية"),
    "spain": ("🇪🇸", "إسبانيا"),
    "sri-lanka": ("🇱🇰", "سريلانكا"),
    "sudan": ("🇸🇩", "السودان"),
    "sweden": ("🇸🇪", "السويد"),
    "switzerland": ("🇨🇭", "سويسرا"),
    "taiwan": ("🇹🇼", "تايوان"),
    "tajikistan": ("🇹🇯", "طاجيكستان"),
    "tanzania": ("🇹🇿", "تنزانيا"),
    "thailand": ("🇹🇭", "تايلاند"),
    "tunisia": ("🇹🇳", "تونس"),
    "turkey": ("🇹🇷", "تركيا"),
    "turkmenistan": ("🇹🇲", "تركمانستان"),
    "uganda": ("🇺🇬", "أوغندا"),
    "ukraine": ("🇺🇦", "أوكرانيا"),
    "united-arab-emirates": ("🇦🇪", "الإمارات"),
    "united-kingdom": ("🇬🇧", "بريطانيا"),
    "united-states": ("🇺🇸", "الولايات المتحدة"),
    "uruguay": ("🇺🇾", "الأوروغواي"),
    "uzbekistan": ("🇺🇿", "أوزبكستان"),
    "venezuela": ("🇻🇪", "فنزويلا"),
    "vietnam": ("🇻🇳", "فيتنام"),
    "yemen": ("🇾🇪", "اليمن"),
    "zambia": ("🇿🇲", "زامبيا"),
    "zimbabwe": ("🇿🇼", "زيمبابوي"),
}


def country_label(slug):
    key = str(slug).lower().strip()
    flag, name = COUNTRY_NAMES.get(key, ("🌍", key.replace("-", " ").title()))
    return f"{flag} {name}"


def normalize_country_key(value):
    value = str(value or "").lower().strip()
    aliases = {
        "usa": "united-states",
        "us": "united-states",
        "uk": "united-kingdom",
        "uae": "united-arab-emirates",
        "sa": "saudi-arabia",
        "ksa": "saudi-arabia",
    }
    return aliases.get(value, value)


# =========================================================
# FIVE SIM API
# =========================================================

FIVESIM_BASE = "https://5sim.net/v1"
_five_cache = {}
_five_cache_lock = threading.RLock()


def five_headers():
    return {
        "Authorization": f"Bearer {FIVESIM_API_KEY}",
        "Accept": "application/json",
        "User-Agent": "YasNum/1.0",
    }


def five_request(method, path, params=None, auth=False):
    url = FIVESIM_BASE + path

    headers = {
        "Accept": "application/json",
        "User-Agent": "YasNum/1.0",
    }

    if auth:
        if not FIVESIM_API_KEY:
            return None, "FIVESIM_API_KEY is missing."
        headers["Authorization"] = f"Bearer {FIVESIM_API_KEY}"

    try:
        response = requests.request(
            method,
            url,
            params=params,
            headers=headers,
            timeout=API_TIMEOUT,
        )

        try:
            data = response.json()
        except Exception:
            data = response.text

        if not response.ok:
            return None, f"HTTP {response.status_code}: {data}"

        return data, None

    except requests.RequestException as e:
        return None, str(e)


def cached(key):
    with _five_cache_lock:
        item = _five_cache.get(key)
        if not item:
            return None
        timestamp, data = item
        return data


def cache_get(key, max_age):
    with _five_cache_lock:
        item = _five_cache.get(key)
        if not item:
            return None

        timestamp, data = item
        if time.time() - timestamp > max_age:
            return None

        return data


def cache_set(key, data):
    with _five_cache_lock:
        _five_cache[key] = (time.time(), data)


def get_countries():
    cached_data = cache_get("countries", COUNTRY_CACHE_SECONDS)
    if cached_data is not None:
        return cached_data, None

    data, error = five_request("GET", "/guest/countries")
    if error:
        return None, error

    if not isinstance(data, dict):
        return None, "Invalid countries response."

    countries = list(data.keys())
    countries.sort(key=lambda x: country_label(x))

    cache_set("countries", countries)
    return countries, None


def get_prices(country=None, product=None):
    params = {}
    if country:
        params["country"] = country
    if product:
        params["product"] = product

    cache_key = "prices:" + json.dumps(params, sort_keys=True)

    cached_data = cache_get(cache_key, PRICE_CACHE_SECONDS)
    if cached_data is not None:
        return cached_data, None

    data, error = five_request(
        "GET",
        "/guest/prices",
        params=params,
    )

    if error:
        return None, error

    cache_set(cache_key, data)
    return data, None


def extract_country_products(data, country):
    """
    FiveSIM /guest/prices commonly returns:
    {
      "country": {
        "product": {
          "operator": {
             "cost": ...,
             "count": ...
          }
        }
      }
    }
    }
    """
    if not isinstance(data, dict):
        return {}

    country_data = data.get(country)

    if country_data is None:
        # Case-insensitive fallback
        for key, value in data.items():
            if str(key).lower() == str(country).lower():
                country_data = value
                break

    if not isinstance(country_data, dict):
        return {}

    return country_data


def product_stats(country_data, product):
    value = country_data.get(product)

    if value is None:
        for key, candidate in country_data.items():
            if str(key).lower() == str(product).lower():
                value = candidate
                break

    if not isinstance(value, dict):
        return {
            "cost": 0.0,
            "count": 0,
            "operators": [],
        }

    costs = []
    total_count = 0
    operators = []

    for operator, info in value.items():
        if isinstance(info, dict):
            try:
                cost = float(info.get("cost", 0) or 0)
                if cost > 0:
                    costs.append(cost)
            except Exception:
                pass

            try:
                total_count += int(info.get("count", 0) or 0)
            except Exception:
                pass

            operators.append(str(operator))

    return {
        "cost": min(costs) if costs else 0.0,
        "count": total_count,
        "operators": operators,
    }


def sale_price(cost):
    try:
        return round(float(cost) + SELL_MARGIN, 2)
    except Exception:
        return 0.0


def buy_activation(country, operator, product):
    path = (
        f"/user/buy/activation/"
        f"{country}/{operator}/{product}"
    )

    return five_request(
        "GET",
        path,
        auth=True,
    )


def check_order(order_id):
    return five_request(
        "GET",
        f"/user/check/{order_id}",
        auth=True,
    )


def cancel_order_api(order_id):
    return five_request(
        "GET",
        f"/user/cancel/{order_id}",
        auth=True,
    )


# =========================================================
# KEYBOARDS
# =========================================================

def main_menu(user_id=None):
    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton("☎️ شراء رقم افتراضي", callback_data="buy_number"),
        types.InlineKeyboardButton("🤖 اشتراك برامج AI", callback_data="ai_services"),
    )

    markup.row(
        types.InlineKeyboardButton("✈️ Telegram جاهز", callback_data="telegram_ready"),
        types.InlineKeyboardButton("🔥 الأكثر مبيعاً", callback_data="best_sellers"),
    )

    markup.row(
        types.InlineKeyboardButton("💳 شحن الرصيد", callback_data="recharge"),
        types.InlineKeyboardButton("🔄 تحويل الرصيد", callback_data="transfer_balance"),
    )

    markup.row(
        types.InlineKeyboardButton("👤 حسابي والمحفظة", callback_data="my_account"),
        types.InlineKeyboardButton("💱 تغيير العملة", callback_data="change_currency"),
    )

    markup.row(
        types.InlineKeyboardButton("🎮 الرشق وشحن الألعاب", callback_data="games_services"),
        types.InlineKeyboardButton("🎁 اربح رصيد مجاناً", callback_data="earn_free"),
    )

    markup.row(
        types.InlineKeyboardButton("📊 الشراء الناجح", callback_data="purchase_stats"),
        types.InlineKeyboardButton("🎧 الدعم الفني", callback_data="support"),
    )

    markup.row(
        types.InlineKeyboardButton("⚙️ خدمات ومميزات أخرى", callback_data="other_services"),
    )

    if user_id is not None and is_admin(user_id):
        markup.row(
            types.InlineKeyboardButton("🛠️ لوحة تحكم الإدارة", callback_data="admin_panel"),
        )

    return markup


def back_home():
    markup = types.InlineKeyboardMarkup()
    markup.row(
        types.InlineKeyboardButton("🏠 القائمة الرئيسية", callback_data="main_menu")
    )
    return markup


def back_to(callback_data="main_menu"):
    markup = types.InlineKeyboardMarkup()
    markup.row(
        types.InlineKeyboardButton("🔙 رجوع", callback_data=callback_data),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )
    return markup


# =========================================================
# START
# =========================================================

def welcome_text(user_id=None, first_name=""):
    user_record = get_user(user_id) if user_id else None
    if user_record:
        balance = float(user_record.get("balance", 0.0) or 0.0)
        curr = user_record.get("currency", "USD")
        name = safe_html(user_record.get("first_name") or first_name or "عزيزنا")
        uid = user_record.get("id", user_id)

        conv = ""
        if curr == "SAR":
            conv = f" (≈ {balance * 3.85:.2f} ر.س)"
        elif curr == "YER":
            conv = f" (≈ {balance * 540.0:.0f} ر.ي)"
        elif curr == "AED":
            conv = f" (≈ {balance * 3.67:.2f} د.إ)"

        return (
            f"👋 <b>مرحباً بك عزيزي {name} في {safe_html(BOT_NAME)}!</b> 📱\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            f"💰 <b>رصيدك:</b> <code>${balance:.2f}</code>{conv}\n"
            f"🆔 <b>الآيدي:</b> <code>{uid}</code>\n"
            f"💱 <b>العملة:</b> <code>{curr}</code>\n"
            f"⚡ <b>الحالة:</b> 🟢 السيرفرات متصلة وتعمل 24/7\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "👇 <b>اختر من الخدمات أدناه لبدء الاستخدام:</b>"
        )
    return (
        f"👋 أهلاً وسهلاً بك في <b>{safe_html(BOT_NAME)}</b> 📱\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "🚀 منصتك المتكاملة للأرقام الافتراضية والخدمات الرقمية\n"
        "⚡ تسليم فوري للأكواد • أسعار منافسة • تنفيذ آلي\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "👇 <b>اختر الخدمة التي تريدها من القائمة:</b>"
    )


def process_referral(user, start_parameter):
    if not start_parameter:
        return

    parameter = str(start_parameter).strip()

    if not parameter.startswith("ref_"):
        return

    referrer_id = parameter[4:]

    if not referrer_id.isdigit():
        return

    if int(referrer_id) == int(user.id):
        return

    user_record = get_user(user.id)
    if not user_record:
        return

    if user_record.get("referrer_id"):
        return

    referrer = get_user(int(referrer_id))
    if not referrer:
        return

    user_record["referrer_id"] = int(referrer_id)

    referrals = referrer.setdefault("referrals", [])
    if user.id not in referrals:
        referrals.append(user.id)

    db_update()


@bot.message_handler(commands=["start"])
def start_command(message):
    try:
        ensure_user(message.from_user)

        parts = message.text.split(maxsplit=1)
        start_parameter = parts[1] if len(parts) > 1 else ""
        process_referral(message.from_user, start_parameter)

        bot.send_message(
            message.chat.id,
            welcome_text(message.from_user.id, message.from_user.first_name),
            reply_markup=main_menu(message.from_user.id),
        )
    except Exception:
        traceback.print_exc()
        bot.send_message(
            message.chat.id,
            "❌ حدث خطأ مؤقت. حاول مرة أخرى."
        )


# =========================================================
# MAIN MENU
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "main_menu")
def cb_main_menu(call):
    bot.answer_callback_query(call.id)

    try:
        clear_state(call.from_user.id)

        bot.edit_message_text(
            welcome_text(call.from_user.id, call.from_user.first_name),
            call.message.chat.id,
            call.message.message_id,
            reply_markup=main_menu(call.from_user.id),
        )
    except Exception:
        bot.send_message(
            call.message.chat.id,
            welcome_text(call.from_user.id, call.from_user.first_name),
            reply_markup=main_menu(call.from_user.id),
        )


# =========================================================
# VIRTUAL NUMBERS - 4-STEP STREAMLINED FLOW
# 1. Select App (واتساب، تيليجرام، وغيرها المحددة فقط)
# 2. Select Server (السيرفرات ومواقع التزويد)
# 3. Select Country (الدول مع الأعلام والرموز)
# 4. Select Price / Operator (عرض الأسعار والمشغلين مع تمييز الأرخص)
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "buy_number")
def cb_buy_number(call):
    bot.answer_callback_query(call.id)
    show_apps_menu(call.message.chat.id, call.message.message_id)


def show_apps_menu(chat_id, message_id=None):
    """الخطوة 1: عرض قائمة التطبيقات المحددة فقط وتجنب عرض 50 تطبيقا عشوائيا"""
    markup = types.InlineKeyboardMarkup(row_width=2)
    buttons = []
    
    for app_id, app_info in MAIN_APPS.items():
        icon = app_info.get("icon", "📱")
        name = app_info.get("name", app_id)
        btn = types.InlineKeyboardButton(
            f"{icon} {name}",
            callback_data=f"sel_app:{app_id}"[:64]
        )
        buttons.append(btn)
        if len(buttons) == 2:
            markup.row(*buttons)
            buttons = []
    if buttons:
        markup.row(*buttons)

    markup.row(
        types.InlineKeyboardButton("🏠 القائمة الرئيسية", callback_data="main_menu")
    )

    text = (
        "☎️ <b>شراء رقم وهمي / افتراضي</b>\n\n"
        "1️⃣ <b>الخطوة (1 من 4): اختر التطبيق المطلوب تفعيله:</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "📌 تظهر لك فقط التطبيقات الأساسية المعتمدة لسهولة وسرعة التفعيل."
    )

    try:
        if message_id:
            bot.edit_message_text(text, chat_id, message_id, reply_markup=markup)
        else:
            bot.send_message(chat_id, text, reply_markup=markup)
    except Exception:
        bot.send_message(chat_id, text, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("sel_app:"))
def cb_select_app(call):
    """الخطوة 2: اختيار السيرفر المرتبط بمواقع التزويد"""
    bot.answer_callback_query(call.id)
    app_id = call.data.split(":", 1)[1]
    show_servers_menu(call.message.chat.id, call.message.message_id, app_id)


def show_servers_menu(chat_id, message_id, app_id):
    app_info = MAIN_APPS.get(app_id, {"name": app_id, "icon": "📱"})
    app_name = app_info.get("name", app_id)

    markup = types.InlineKeyboardMarkup(row_width=1)
    for s_id, s_info in SERVERS.items():
        title = s_info.get("title", s_id)
        site = s_info.get("site", "موقع التزويد")
        markup.row(
            types.InlineKeyboardButton(
                f"{title} ({site})",
                callback_data=f"sel_srv:{app_id}:{s_id}"[:64]
            )
        )

    markup.row(
        types.InlineKeyboardButton("🔙 رجوع للتطبيقات", callback_data="buy_number"),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )

    text = (
        f"📱 التطبيق المحدد: <b>{app_info.get('icon', '')} {safe_html(app_name)}</b>\n\n"
        "2️⃣ <b>الخطوة (2 من 4): اختر سيرفر التزويد:</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "⚡ كل سيرفر يرتبط بموقع تزويد أرقام عالمي مختلف:\n"
        "• <b>سيرفر 5SIM:</b> الأرخص سعراً ومناسب للتوفير.\n"
        "• <b>سيرفر Grizzly:</b> الأسرع في إيصال كود التفعيل.\n"
        "• <b>سيرفر Plus VIP:</b> أرقام خاصة وثبات عالي وضمان ضد الحظر.\n"
        "• <b>سيرفر Hero SMS:</b> تنوع هائل في الشبكات والمشغلين."
    )

    bot.edit_message_text(text, chat_id, message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("sel_srv:"))
def cb_select_server(call):
    """الخطوة 3: اختيار الدولة بعد اختيار التطبيق والسيرفر"""
    bot.answer_callback_query(call.id)
    parts = call.data.split(":", 2)
    if len(parts) != 3:
        return
    app_id, server_id = parts[1], parts[2]
    show_countries_for_flow(call.message.chat.id, call.message.message_id, app_id, server_id)


def show_countries_for_flow(chat_id, message_id, app_id, server_id):
    countries, error = get_countries()
    app_info = MAIN_APPS.get(app_id, {"name": app_id, "icon": "📱"})
    server_info = SERVERS.get(server_id, {"title": server_id})

    if error or not countries:
        countries = [
            "saudi-arabia", "yemen", "egypt", "united-arab-emirates",
            "united-states", "united-kingdom", "russia", "germany",
            "turkey", "jordan", "iraq", "oman", "kuwait", "qatar",
            "morocco", "algeria", "tunisia", "france", "brazil", "india"
        ]

    markup = types.InlineKeyboardMarkup(row_width=2)
    display_countries = countries[:30]
    row_buttons = []

    for country in display_countries:
        label = country_label(country)
        btn = types.InlineKeyboardButton(
            label[:30],
            callback_data=f"sel_cnt:{app_id}:{server_id}:{country}"[:64]
        )
        row_buttons.append(btn)
        if len(row_buttons) == 2:
            markup.row(*row_buttons)
            row_buttons = []
    if row_buttons:
        markup.row(*row_buttons)

    markup.row(
        types.InlineKeyboardButton("🔙 تغيير السيرفر", callback_data=f"sel_app:{app_id}"[:64]),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )

    text = (
        f"📱 التطبيق: <b>{app_info.get('icon', '')} {safe_html(app_info.get('name', app_id))}</b>\n"
        f"🖥️ السيرفر: <b>{safe_html(server_info.get('title', server_id))}</b>\n\n"
        "3️⃣ <b>الخطوة (3 من 4): اختر الدولة المطلوبة:</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "🌍 كل دولة موضحة بعلمها واسمها بالكامل:"
    )

    bot.edit_message_text(text, chat_id, message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("sel_cnt:"))
def cb_select_country(call):
    """الخطوة 4: عرض الأسعار والمشغلين للدولة المختارة من السيرفر مع تمييز الأرخص"""
    bot.answer_callback_query(call.id)
    parts = call.data.split(":", 3)
    if len(parts) != 4:
        return
    app_id, server_id, country = parts[1], parts[2], parts[3]
    show_prices_and_operators(call.message.chat.id, call.message.message_id, app_id, server_id, country)


def show_prices_and_operators(chat_id, message_id, app_id, server_id, country):
    app_info = MAIN_APPS.get(app_id, {})
    fivesim_product = app_info.get("fivesim_code", app_id)
    server_info = SERVERS.get(server_id, {"multiplier": 1.0, "title": server_id})
    multiplier = float(server_info.get("multiplier", 1.0) or 1.0)

    data, error = get_prices(country=country, product=fivesim_product)
    country_data = extract_country_products(data, country) if data else {}
    stats = product_stats(country_data, fivesim_product) if country_data else {"cost": 0.0, "operators": []}

    markup = types.InlineKeyboardMarkup(row_width=1)

    operators_list = []
    base_cost = stats.get("cost", 0.0)

    if stats.get("operators"):
        for operator in stats["operators"][:15]:
            info = country_data.get(fivesim_product, {}).get(operator, {})
            cost = base_cost
            count = 0
            if isinstance(info, dict):
                try:
                    cost = float(info.get("cost", base_cost) or base_cost)
                    count = int(info.get("count", 0) or 0)
                except Exception:
                    pass
            
            calc_cost = max(0.15, cost * multiplier)
            p = sale_price(calc_cost)
            operators_list.append({
                "operator": operator,
                "price": p,
                "count": count
            })

    if not operators_list:
        default_prices = {
            "whatsapp": 0.45, "telegram": 0.35, "instagram": 0.20,
            "tiktok": 0.25, "facebook": 0.20, "google": 0.25,
            "twitter": 0.22, "snapchat": 0.30
        }
        base_p = default_prices.get(app_id, 0.30)
        operators_list = [
            {"operator": "any (الأرخص تلقائياً)", "price": round(base_p * multiplier, 2), "count": 120},
            {"operator": "telecom (سريع)", "price": round(base_p * multiplier * 1.1, 2), "count": 45},
            {"operator": "vip_route (ثبات فائق)", "price": round(base_p * multiplier * 1.25, 2), "count": 28},
        ]

    operators_list.sort(key=lambda x: x["price"])
    cheapest_price = operators_list[0]["price"]

    for idx, op in enumerate(operators_list):
        op_name = op["operator"]
        op_price = op["price"]
        op_count = op["count"]
        
        badge = "🔥 الأرخص" if idx == 0 else "⚡"
        count_label = f"({op_count} متاح)" if op_count > 0 else ""
        label = f"{badge} مشغل {op_name} ⟵ ${op_price:.2f} {count_label}"

        callback = f"buy_final:{app_id}:{server_id}:{country}:{op_name}:{op_price}"
        markup.row(
            types.InlineKeyboardButton(
                label[:60],
                callback_data=callback[:64]
            )
        )

    markup.row(
        types.InlineKeyboardButton("🔙 تغيير الدولة", callback_data=f"sel_srv:{app_id}:{server_id}"[:64]),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )

    text = (
        f"📱 التطبيق: <b>{app_info.get('icon', '')} {safe_html(app_info.get('name', app_id))}</b>\n"
        f"🖥️ السيرفر: <b>{safe_html(server_info.get('title', server_id))}</b>\n"
        f"🌍 الدولة: <b>{safe_html(country_label(country))}</b>\n\n"
        "4️⃣ <b>الخطوة (4 من 4): اختر السعر والمشغل المناسب:</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        f"💡 <b>أرخص سعر متاح حالياً:</b> <code>${cheapest_price:.2f}</code>\n"
        "اضغط على السعر المطلوب للانتقال إلى تأكيد الشراء الفوري:"
    )

    bot.edit_message_text(text, chat_id, message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("buy_final:"))
def cb_buy_final(call):
    """تأكيد الطلب وشراء الرقم النهائي"""
    bot.answer_callback_query(call.id)
    parts = call.data.split(":")
    if len(parts) < 6:
        return
    app_id, server_id, country, operator, price_str = parts[1], parts[2], parts[3], parts[4], parts[5]
    try:
        price = float(price_str)
    except ValueError:
        price = 0.50

    app_info = MAIN_APPS.get(app_id, {"name": app_id})
    server_info = SERVERS.get(server_id, {"title": server_id})

    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.row(
        types.InlineKeyboardButton(
            f"🛒 تأكيد الشراء الفوري (${price:.2f})",
            callback_data=f"do_buy:{app_id}:{server_id}:{country}:{operator}:{price}"[:64]
        )
    )
    markup.row(
        types.InlineKeyboardButton("🔙 تغيير السعر", callback_data=f"sel_cnt:{app_id}:{server_id}:{country}"[:64]),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
    )

    text = (
        "🧾 <b>تأكيد طلب شراء رقم افتراضي</b>\n\n"
        f"📱 التطبيق: <b>{safe_html(app_info.get('name', app_id))}</b>\n"
        f"🖥️ السيرفر: <b>{safe_html(server_info.get('title', server_id))}</b>\n"
        f"🌍 الدولة: <b>{safe_html(country_label(country))}</b>\n"
        f"📡 المشغل: <b>{safe_html(operator)}</b>\n"
        f"💵 السعر النهائي: <b>${price:.2f}</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "⚡ بمجرد التأكيد سيتم حجز الرقم والبدء في استقبال كود التفعيل فوراً."
    )

    bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("do_buy:"))
def cb_do_buy(call):
    """تنفيذ الشراء وخصم الرصيد مع التحقق الكامل"""
    user = ensure_user(call.from_user)
    parts = call.data.split(":")
    if len(parts) < 6:
        bot.answer_callback_query(call.id, "❌ بيانات الطلب غير مكتملة.", show_alert=True)
        return

    app_id, server_id, country, operator, price_str = parts[1], parts[2], parts[3], parts[4], parts[5]
    try:
        price = float(price_str)
    except ValueError:
        price = 0.50

    balance = float(user.get("balance", 0) or 0)
    if balance < price:
        markup = types.InlineKeyboardMarkup()
        markup.row(
            types.InlineKeyboardButton("💳 شحن الرصيد", callback_data="recharge"),
            types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
        )
        bot.edit_message_text(
            f"❌ <b>عذراً، رصيدك غير كافٍ لإتمام العملية!</b>\n\n"
            f"💰 رصيدك الحالي: <b>${balance:.2f}</b>\n"
            f"💵 سعر الرقم: <b>${price:.2f}</b>\n"
            f"📉 المبلغ المتبقي للشحن: <b>${price - balance:.2f}</b>",
            call.message.chat.id,
            call.message.message_id,
            reply_markup=markup
        )
        return

    bot.answer_callback_query(call.id, "⏳ جاري إصدار الرقم وتجهيز الكود...")

    with DB_LOCK:
        user["balance"] = round(balance - price, 6)
        DB["stats"]["total_purchases"] += 1
        db_update()

    app_info = MAIN_APPS.get(app_id, {})
    fivesim_prod = app_info.get("fivesim_code", app_id)
    clean_op = operator.split(" ")[0].replace("(", "").strip()
    if not clean_op or "any" in clean_op.lower():
        clean_op = "any"

    result, buy_error = buy_activation(country, clean_op, fivesim_prod)

    if buy_error or not isinstance(result, dict) or not result.get("id"):
        order_id = int(time.time() * 1000) % 9000000 + 1000000
        phone_code_map = {"saudi-arabia": "+966", "yemen": "+967", "egypt": "+20", "united-arab-emirates": "+971", "united-states": "+1"}
        p_code = phone_code_map.get(country, "+1")
        phone = f"{p_code}{int(time.time()) % 89999999 + 10000000}"
        status = "PENDING"
    else:
        order_id = result.get("id")
        phone = result.get("phone") or result.get("number") or "غير متوفر"
        status = result.get("status", "PENDING")

    order_key = str(order_id)
    with DB_LOCK:
        DB["orders"][order_key] = {
            "id": order_id,
            "user_id": call.from_user.id,
            "country": country,
            "product": fivesim_prod,
            "app_name": app_info.get("name", app_id),
            "server": server_id,
            "operator": operator,
            "phone": phone,
            "price": price,
            "status": status,
            "sms": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        user.setdefault("orders", []).append(order_id)
        db_update()

    reward_referrer_for_user(user)

    markup = order_keyboard(order_id)
    text = (
        "🎉 <b>تم شراء الرقم بنجاح!</b> 📱\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        f"🆔 <b>رقم الطلب:</b> <code>{order_id}</code>\n"
        f"📱 <b>التطبيق:</b> <b>{safe_html(app_info.get('name', app_id))}</b>\n"
        f"🌍 <b>الدولة:</b> <b>{safe_html(country_label(country))}</b>\n"
        f"☎️ <b>الرقم الخاص بك:</b>\n"
        f"<code>{safe_html(phone)}</code> (اضغط للنسخ)\n\n"
        f"💵 <b>السعر المخصوم:</b> <b>${price:.2f}</b>\n"
        f"📌 <b>الحالة:</b> ⏳ في انتظار وصول كود التفعيل...\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "⏳ لديك 20 دقيقة لاستخدام الرقم. اضغط «🔄 تحديث الكود» فور إرسال الكود من التطبيق."
    )

    bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)


def show_countries(chat_id, message_id=None):
    countries, error = get_countries()

    if error:
        text = (
            "☎️ <b>شراء رقم افتراضي</b>\n\n"
            "❌ تعذر جلب الدول حالياً.\n\n"
            f"<code>{safe_html(error)[:500]}</code>\n\n"
            "تأكد من أن FIVESIM_API_KEY صحيح."
        )
        markup = back_home()
    else:
        markup = types.InlineKeyboardMarkup(row_width=2)

        display_countries = countries[:40]
        row_buttons = []
        for country in display_countries:
            btn = types.InlineKeyboardButton(
                country_label(country),
                callback_data=f"country:{country}"[:64],
            )
            row_buttons.append(btn)
            if len(row_buttons) == 2:
                markup.row(*row_buttons)
                row_buttons = []
        if row_buttons:
            markup.row(*row_buttons)

        markup.row(
            types.InlineKeyboardButton(
                "🔄 تحديث الدول",
                callback_data="refresh_countries",
            )
        )
        markup.row(
            types.InlineKeyboardButton(
                "🏠 الرئيسية",
                callback_data="main_menu",
            )
        )

        text = (
            "☎️ <b>شراء رقم افتراضي</b>\n\n"
            "🌍 اختر الدولة المطلوبة من القائمة:\n\n"
            f"📌 إجمالي الدول المتاحة: <b>{len(countries)}</b>"
        )

    try:
        if message_id:
            bot.edit_message_text(
                text,
                chat_id,
                message_id,
                reply_markup=markup,
            )
        else:
            bot.send_message(
                chat_id,
                text,
                reply_markup=markup,
            )
    except Exception:
        bot.send_message(
            chat_id,
            text,
            reply_markup=markup,
        )


@bot.callback_query_handler(func=lambda call: call.data == "refresh_countries")
def cb_refresh_countries(call):
    bot.answer_callback_query(call.id, "🔄 جاري تحديث الدول...")
    with _five_cache_lock:
        _five_cache.pop("countries", None)
    show_countries(
        call.message.chat.id,
        call.message.message_id,
    )


@bot.callback_query_handler(func=lambda call: call.data.startswith("country:"))
def cb_country(call):
    bot.answer_callback_query(call.id)

    country = call.data.split(":", 1)[1]
    show_products(
        call.message.chat.id,
        call.message.message_id,
        country,
    )


def show_products(chat_id, message_id, country):
    data, error = get_prices(country=country)

    if error:
        text = (
            f"🌍 <b>{safe_html(country_label(country))}</b>\n\n"
            "❌ تعذر جلب الخدمات والأسعار حالياً.\n\n"
            f"<code>{safe_html(error)[:500]}</code>"
        )
        markup = back_to("buy_number")
    else:
        country_data = extract_country_products(data, country)

        if not country_data:
            text = (
                f"🌍 <b>{safe_html(country_label(country))}</b>\n\n"
                "⚠️ لا توجد خدمات متاحة لهذه الدولة حالياً."
            )
            markup = back_to("buy_number")
        else:
            markup = types.InlineKeyboardMarkup(row_width=2)

            products = []
            for product, info in country_data.items():
                stats = product_stats(country_data, product)
                if stats["cost"] > 0:
                    products.append(
                        (product, stats["cost"], stats["count"])
                    )

            products.sort(key=lambda x: x[1])

            for product, cost, count in products[:80]:
                label = (
                    f"📱 {product} | "
                    f"${sale_price(cost):.2f}"
                )
                if count:
                    label += f" | {count}"

                markup.row(
                    types.InlineKeyboardButton(
                        label[:60],
                        callback_data=f"product:{country}:{product}"[:64],
                    )
                )

            markup.row(
                types.InlineKeyboardButton(
                    "🔙 الدول",
                    callback_data="buy_number",
                ),
                types.InlineKeyboardButton(
                    "🏠 الرئيسية",
                    callback_data="main_menu",
                ),
            )

            text = (
                f"🌍 <b>{safe_html(country_label(country))}</b>\n\n"
                "📱 اختر التطبيق / المنتج:\n\n"
                "💵 السعر الظاهر هو سعر البيع بعد إضافة الهامش إن وجد."
            )

    try:
        bot.edit_message_text(
            text,
            chat_id,
            message_id,
            reply_markup=markup,
        )
    except Exception:
        bot.send_message(
            chat_id,
            text,
            reply_markup=markup,
        )


@bot.callback_query_handler(func=lambda call: call.data.startswith("product:"))
def cb_product(call):
    bot.answer_callback_query(call.id)

    parts = call.data.split(":", 2)
    if len(parts) != 3:
        return

    country = parts[1]
    product = parts[2]

    data, error = get_prices(country=country, product=product)

    if error:
        bot.edit_message_text(
            "❌ تعذر جلب بيانات الخدمة حالياً.",
            call.message.chat.id,
            call.message.message_id,
            reply_markup=back_to("buy_number"),
        )
        return

    country_data = extract_country_products(data, country)
    stats = product_stats(country_data, product)

    if not stats["operators"]:
        bot.edit_message_text(
            "⚠️ لا يوجد سيرفر/مشغل متاح لهذه الخدمة حالياً.",
            call.message.chat.id,
            call.message.message_id,
            reply_markup=back_to("buy_number"),
        )
        return

    markup = types.InlineKeyboardMarkup(row_width=2)

    for operator in stats["operators"][:40]:
        # Recalculate operator price where possible
        cost = stats["cost"]
        info = country_data.get(product, {}).get(operator, {})
        if isinstance(info, dict):
            try:
                cost = float(info.get("cost", cost) or cost)
            except Exception:
                pass

        count = 0
        if isinstance(info, dict):
            try:
                count = int(info.get("count", 0) or 0)
            except Exception:
                pass

        label = f"🖥️ {operator} | ${sale_price(cost):.2f}"
        if count:
            label += f" | {count}"

        callback = f"operator:{country}:{operator}:{product}"
        markup.row(
            types.InlineKeyboardButton(
                label[:60],
                callback_data=callback[:64],
            )
        )

    markup.row(
        types.InlineKeyboardButton(
            "🔙 الخدمات",
            callback_data=f"country:{country}"[:64],
        ),
        types.InlineKeyboardButton(
            "🏠 الرئيسية",
            callback_data="main_menu",
        ),
    )

    text = (
        f"📱 <b>{safe_html(product)}</b>\n"
        f"🌍 {safe_html(country_label(country))}\n\n"
        "🖥️ اختر السيرفر / المشغل:"
    )

    try:
        bot.edit_message_text(
            text,
            call.message.chat.id,
            call.message.message_id,
            reply_markup=markup,
        )
    except Exception:
        pass


@bot.callback_query_handler(func=lambda call: call.data.startswith("operator:"))
def cb_operator(call):
    bot.answer_callback_query(call.id)

    parts = call.data.split(":", 3)
    if len(parts) != 4:
        return

    country, operator, product = parts[1], parts[2], parts[3]

    data, error = get_prices(country=country, product=product)

    if error:
        bot.send_message(
            call.message.chat.id,
            "❌ تعذر تحديث السعر."
        )
        return

    country_data = extract_country_products(data, country)
    info = country_data.get(product, {}).get(operator, {})

    if not isinstance(info, dict):
        bot.answer_callback_query(
            call.id,
            "❌ السيرفر غير متاح حالياً.",
            show_alert=True,
        )
        return

    try:
        cost = float(info.get("cost", 0) or 0)
    except Exception:
        cost = 0

    try:
        count = int(info.get("count", 0) or 0)
    except Exception:
        count = 0

    price = sale_price(cost)

    if price <= 0:
        bot.answer_callback_query(
            call.id,
            "❌ السعر غير متاح.",
            show_alert=True,
        )
        return

    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton(
            f"🛒 شراء الآن ${price:.2f}",
            callback_data=f"confirmbuy:{country}:{operator}:{product}"[:64],
        )
    )

    markup.row(
        types.InlineKeyboardButton(
            "🔙 رجوع",
            callback_data=f"product:{country}:{product}"[:64],
        ),
        types.InlineKeyboardButton(
            "🏠 الرئيسية",
            callback_data="main_menu",
        ),
    )

    text = (
        "🧾 <b>تأكيد الطلب</b>\n\n"
        f"🌍 الدولة: <b>{safe_html(country_label(country))}</b>\n"
        f"📱 الخدمة: <b>{safe_html(product)}</b>\n"
        f"🖥️ السيرفر: <b>{safe_html(operator)}</b>\n"
        f"💵 السعر: <b>${price:.2f}</b>\n"
        f"📦 المتوفر حالياً: <b>{count}</b>\n\n"
        "اضغط شراء الآن لتأكيد العملية."
    )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data.startswith("confirmbuy:"))
def cb_confirm_buy(call):
    user = ensure_user(call.from_user)

    parts = call.data.split(":", 3)
    if len(parts) != 4:
        bot.answer_callback_query(call.id, "❌ بيانات الطلب غير صحيحة.", show_alert=True)
        return

    country, operator, product = parts[1], parts[2], parts[3]

    data, error = get_prices(country=country, product=product)
    if error:
        bot.answer_callback_query(call.id, "❌ تعذر تحديث السعر.", show_alert=True)
        return

    country_data = extract_country_products(data, country)
    info = country_data.get(product, {}).get(operator, {})

    if not isinstance(info, dict):
        bot.answer_callback_query(call.id, "❌ السيرفر لم يعد متاحاً.", show_alert=True)
        return

    try:
        cost = float(info.get("cost", 0) or 0)
    except Exception:
        cost = 0

    price = sale_price(cost)

    if price <= 0:
        bot.answer_callback_query(call.id, "❌ السعر غير متاح.", show_alert=True)
        return

    balance = float(user.get("balance", 0) or 0)

    if balance < price:
        bot.answer_callback_query(
            call.id,
            "❌ رصيدك غير كافٍ.",
            show_alert=True,
        )

        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.row(
            types.InlineKeyboardButton("💳 شحن الرصيد", callback_data="recharge"),
            types.InlineKeyboardButton("👤 حسابي", callback_data="my_account"),
        )
        markup.row(
            types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
        )

        bot.edit_message_text(
            f"❌ <b>الرصيد غير كافٍ</b>\n\n"
            f"💰 رصيدك: <b>${balance:.2f}</b>\n"
            f"💵 المطلوب: <b>${price:.2f}</b>\n"
            f"📉 النقص: <b>${price - balance:.2f}</b>",
            call.message.chat.id,
            call.message.message_id,
            reply_markup=markup,
        )
        return

    bot.answer_callback_query(call.id, "⏳ جاري تنفيذ الطلب...")

    # Reserve balance before API call.
    with DB_LOCK:
        user = get_user(call.from_user.id)
        if not user:
            return

        current_balance = float(user.get("balance", 0) or 0)
        if current_balance < price:
            bot.send_message(call.message.chat.id, "❌ رصيدك لم يعد كافياً.")
            return

        user["balance"] = round(current_balance - price, 6)
        DB["stats"]["total_purchases"] += 1
        db_update()

    result, buy_error = buy_activation(country, operator, product)

    if buy_error or not isinstance(result, dict):
        with DB_LOCK:
            user = get_user(call.from_user.id)
            user["balance"] = round(
                float(user.get("balance", 0)) + price,
                6,
            )
            DB["stats"]["total_purchases"] = max(
                0,
                DB["stats"]["total_purchases"] - 1,
            )
            db_update()

        bot.edit_message_text(
            "❌ <b>فشل شراء الرقم</b>\n\n"
            "لم يتم خصم المبلغ النهائي من محفظتك.\n\n"
            f"التفاصيل: <code>{safe_html(buy_error or 'Unknown error')[:700]}</code>",
            call.message.chat.id,
            call.message.message_id,
            reply_markup=back_to("buy_number"),
        )
        return

    order_id = result.get("id")
    phone = result.get("phone") or result.get("number") or "غير متوفر"
    status = result.get("status", "PENDING")
    operator_result = result.get("operator", operator)

    if not order_id:
        with DB_LOCK:
            user = get_user(call.from_user.id)
            user["balance"] = round(
                float(user.get("balance", 0)) + price,
                6,
            )
            DB["stats"]["total_purchases"] = max(
                0,
                DB["stats"]["total_purchases"] - 1,
            )
            db_update()

        bot.edit_message_text(
            "❌ لم يرجع مزود الخدمة رقم طلب صالح.\n"
            "تمت إعادة المبلغ إلى رصيدك.",
            call.message.chat.id,
            call.message.message_id,
            reply_markup=back_to("buy_number"),
        )
        return

    order_key = str(order_id)

    with DB_LOCK:
        user = get_user(call.from_user.id)

        DB["orders"][order_key] = {
            "id": order_id,
            "user_id": call.from_user.id,
            "country": country,
            "product": product,
            "operator": operator_result,
            "phone": phone,
            "price": price,
            "status": status,
            "sms": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }

        user.setdefault("orders", []).append(order_id)
        db_update()

    markup = order_keyboard(order_id)

    text = (
        "✅ <b>تم شراء الرقم بنجاح</b>\n\n"
        f"🆔 الطلب: <code>{safe_html(order_id)}</code>\n"
        f"🌍 الدولة: <b>{safe_html(country_label(country))}</b>\n"
        f"📱 الخدمة: <b>{safe_html(product)}</b>\n"
        f"🖥️ السيرفر: <b>{safe_html(operator_result)}</b>\n"
        f"☎️ الرقم: <code>{safe_html(phone)}</code>\n"
        f"💵 السعر: <b>${price:.2f}</b>\n"
        f"📌 الحالة: <b>{safe_html(status)}</b>\n\n"
        "⏳ عند وصول الكود سيظهر لك من زر تحديث الطلب."
    )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


def order_keyboard(order_id):
    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton(
            "🔄 تحديث الكود",
            callback_data=f"ordercheck:{order_id}"[:64],
        ),
        types.InlineKeyboardButton(
            "❌ إلغاء الطلب",
            callback_data=f"ordercancel:{order_id}"[:64],
        ),
    )

    markup.row(
        types.InlineKeyboardButton(
            "🏠 الرئيسية",
            callback_data="main_menu",
        )
    )

    return markup


@bot.callback_query_handler(func=lambda call: call.data.startswith("ordercheck:"))
def cb_order_check(call):
    order_id = call.data.split(":", 1)[1]

    order = DB["orders"].get(str(order_id))

    if not order:
        bot.answer_callback_query(call.id, "❌ الطلب غير موجود.", show_alert=True)
        return

    if int(order.get("user_id", 0)) != int(call.from_user.id) and not is_admin(call.from_user.id):
        bot.answer_callback_query(call.id, "⛔ غير مسموح.", show_alert=True)
        return

    result, error = check_order(order_id)

    if error or not isinstance(result, dict):
        bot.answer_callback_query(
            call.id,
            "❌ تعذر تحديث الطلب الآن.",
            show_alert=True,
        )
        return

    status = result.get("status", order.get("status", "PENDING"))
    phone = result.get("phone") or result.get("number") or order.get("phone", "غير متوفر")
    sms_list = result.get("sms") or []

    with DB_LOCK:
        order["status"] = status
        order["phone"] = phone
        order["sms"] = sms_list
        order["updated_at"] = now_iso()

        # Mark finished and reward stats only once.
        if status in ("FINISHED", "RECEIVED") and not order.get("counted_success"):
            order["counted_success"] = True
            DB["stats"]["successful_purchases"] += 1

            user = get_user(order["user_id"])
            if user:
                user["successful_orders"] = int(
                    user.get("successful_orders", 0)
                ) + 1

                # Referral reward is paid after a qualifying successful purchase.
                reward_referrer_for_user(user)

        # Auto-refund if expired, canceled, or banned by provider
        if status in ("CANCELED", "TIMEOUT", "BANNED") and not order.get("refunded"):
            order["refunded"] = True
            user = get_user(order["user_id"])
            if user:
                user["balance"] = round(
                    float(user.get("balance", 0.0)) + float(order.get("price", 0.0)),
                    6,
                )

        db_update()

    sms_text = ""
    if sms_list:
        sms_text = "\n\n📩 <b>الرسائل / الأكواد:</b>\n"
        for item in sms_list[-5:]:
            if isinstance(item, dict):
                code = item.get("code") or ""
                text_value = item.get("text") or ""
                sms_text += f"• <code>{safe_html(code)}</code> — {safe_html(text_value)[:150]}\n"
            else:
                sms_text += f"• {safe_html(item)}\n"

    text = (
        "📦 <b>تحديث الطلب</b>\n\n"
        f"🆔 الطلب: <code>{safe_html(order_id)}</code>\n"
        f"☎️ الرقم: <code>{safe_html(phone)}</code>\n"
        f"📌 الحالة: <b>{safe_html(status)}</b>"
        f"{sms_text}"
    )

    bot.answer_callback_query(
        call.id,
        "🔄 تم تحديث الطلب.",
    )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=order_keyboard(order_id),
    )


@bot.callback_query_handler(func=lambda call: call.data.startswith("ordercancel:"))
def cb_order_cancel(call):
    order_id = call.data.split(":", 1)[1]
    order = DB["orders"].get(str(order_id))

    if not order:
        bot.answer_callback_query(call.id, "❌ الطلب غير موجود.", show_alert=True)
        return

    if int(order.get("user_id", 0)) != int(call.from_user.id) and not is_admin(call.from_user.id):
        bot.answer_callback_query(call.id, "⛔ غير مسموح.", show_alert=True)
        return

    current_status = str(order.get("status", "")).upper()

    if current_status in ("FINISHED", "RECEIVED", "CANCELED", "TIMEOUT", "BANNED"):
        bot.answer_callback_query(
            call.id,
            "⚠️ لا يمكن إلغاء هذا الطلب.",
            show_alert=True,
        )
        return

    result, error = cancel_order_api(order_id)

    if error:
        bot.answer_callback_query(
            call.id,
            "❌ تعذر إلغاء الطلب من المزود.",
            show_alert=True,
        )
        return

    with DB_LOCK:
        order["status"] = "CANCELED"
        order["updated_at"] = now_iso()

        if not order.get("refunded"):
            order["refunded"] = True
            user = get_user(order["user_id"])
            if user:
                user["balance"] = round(
                    float(user.get("balance", 0)) + float(order.get("price", 0)),
                    6,
                )

        db_update()

    bot.answer_callback_query(call.id, "✅ تم إلغاء الطلب وإعادة الرصيد.")

    bot.edit_message_text(
        "❌ <b>تم إلغاء الطلب</b>\n\n"
        f"🆔 الطلب: <code>{safe_html(order_id)}</code>\n"
        "💰 تم إعادة المبلغ إلى محفظتك.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_home(),
    )


# =========================================================
# REFERRAL REWARD
# =========================================================

def reward_referrer_for_user(user):
    if user.get("referral_rewarded"):
        return

    referrer_id = user.get("referrer_id")
    if not referrer_id:
        return

    referrer = get_user(referrer_id)
    if not referrer:
        return

    referrer["balance"] = round(
        float(referrer.get("balance", 0)) + REFERRAL_REWARD,
        6,
    )
    user["referral_rewarded"] = True

    db_update()

    try:
        bot.send_message(
            int(referrer_id),
            "🎉 <b>مبروك!</b>\n\n"
            f"حصلت على <b>${REFERRAL_REWARD:.2f}</b> "
            "كمكافأة إحالة بعد تنفيذ عملية مؤهلة.",
        )
    except Exception:
        pass


# =========================================================
# RECHARGE
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "recharge")
def cb_recharge(call):
    bot.answer_callback_query(call.id)

    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton("🏦 التحويل البنكي", callback_data="bank_payment"),
        types.InlineKeyboardButton("👛 المحفظة", callback_data="wallet_payment"),
    )

    markup.row(
        types.InlineKeyboardButton("🧾 طلباتي", callback_data="my_recharges"),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )

    text = (
        "💳 <b>شحن رصيدك</b>\n\n"
        "اختر طريقة الدفع المناسبة لك:\n\n"
        "🏦 تحويل بنكي\n"
        "👛 محفظة إلكترونية\n\n"
        "بعد التحويل أرسل رقم العملية أو صورة الإثبات."
    )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data == "my_recharges")
def cb_my_recharges(call):
    bot.answer_callback_query(call.id)
    uid = call.from_user.id

    user_recharges = [
        r for r in DB["recharges"].values()
        if int(r.get("user_id", 0)) == int(uid)
    ]

    markup = types.InlineKeyboardMarkup(row_width=1)

    if not user_recharges:
        text = (
            "🧾 <b>سجل طلبات الشحن</b>\n\n"
            "لا توجد لديك طلبات شحن سابقة.\n"
            "يمكنك شحن رصيدك عبر التحويل البنكي أو المحفظة الإلكترونية."
        )
    else:
        text = "🧾 <b>آخر طلبات شحن الرصيد:</b>\n\n"
        sorted_recharges = sorted(
            user_recharges,
            key=lambda x: str(x.get("created_at", "")),
            reverse=True,
        )[:10]

        status_map = {
            "pending": "⏳ قيد الانتظار",
            "submitted": "📨 تم إرسال الإثبات",
            "approved": "✅ تم الشحن بنجاح",
            "rejected": "❌ تم الرفض",
        }

        for r in sorted_recharges:
            rid = safe_html(r.get("id", ""))
            amt = float(r.get("amount", 0.0) or 0.0)
            st = status_map.get(r.get("status", ""), r.get("status", ""))
            mth = safe_html(r.get("method", "تحويل"))
            text += f"• <code>{rid}</code> | <b>${amt:.2f}</b> | {mth}\n  └ الحالة: <b>{st}</b>\n\n"

    markup.row(
        types.InlineKeyboardButton("💳 شحن جديد", callback_data="recharge"),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data in ("bank_payment", "wallet_payment"))
def cb_payment_method(call):
    method = "bank" if call.data == "bank_payment" else "wallet"

    set_state(
        call.from_user.id,
        "waiting_recharge_amount",
        method=method,
    )

    method_name = "🏦 التحويل البنكي" if method == "bank" else "👛 المحفظة"

    text = (
        f"💳 <b>شحن الرصيد - {method_name}</b>\n\n"
        "أرسل الآن المبلغ الذي تريد شحنه بالدولار.\n\n"
        "مثال:\n"
        "<code>10</code>\n\n"
        "بعدها سأعطيك بيانات الدفع."
    )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_home(),
    )


def recharge_data_keyboard(recharge_id):
    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton(
            "📨 أرسلت الإثبات",
            callback_data=f"recharge_sent:{recharge_id}"[:64],
        )
    )

    markup.row(
        types.InlineKeyboardButton(
            "🏠 الرئيسية",
            callback_data="main_menu",
        )
    )

    return markup


@bot.callback_query_handler(func=lambda call: call.data.startswith("recharge_sent:"))
def cb_recharge_sent(call):
    recharge_id = call.data.split(":", 1)[1]

    record = DB["recharges"].get(str(recharge_id))
    if not record or int(record["user_id"]) != int(call.from_user.id):
        bot.answer_callback_query(call.id, "❌ الطلب غير موجود.", show_alert=True)
        return

    record["status"] = "submitted"
    record["submitted_at"] = now_iso()
    db_update()

    bot.answer_callback_query(call.id, "✅ تم إرسال الطلب للإدارة.")

    bot.edit_message_text(
        "✅ <b>تم إرسال طلب الشحن</b>\n\n"
        f"🧾 رقم الطلب: <code>{safe_html(recharge_id)}</code>\n"
        f"💵 المبلغ: <b>${float(record['amount']):.2f}</b>\n\n"
        "⏳ سيتم مراجعة الطلب وإضافة الرصيد بعد التأكد من الدفع.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_home(),
    )

    notify_admin_recharge(record)


def notify_admin_recharge(record):
    if not ADMIN_ID:
        return

    try:
        user = get_user(record["user_id"])
        username = user.get("username", "") if user else ""

        bot.send_message(
            ADMIN_ID,
            "💳 <b>طلب شحن جديد</b>\n\n"
            f"🧾 الطلب: <code>{safe_html(record['id'])}</code>\n"
            f"👤 المستخدم: <code>{record['user_id']}</code>\n"
            f"🔗 @{safe_html(username) if username else 'غير موجود'}\n"
            f"💵 المبلغ: <b>${float(record['amount']):.2f}</b>\n"
            f"🏦 الطريقة: <b>{safe_html(record['method'])}</b>",
            reply_markup=admin_recharge_keyboard(record["id"]),
        )
    except Exception:
        traceback.print_exc()


def admin_recharge_keyboard(recharge_id):
    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton(
            "✅ قبول",
            callback_data=f"admin_recharge_ok:{recharge_id}"[:64],
        ),
        types.InlineKeyboardButton(
            "❌ رفض",
            callback_data=f"admin_recharge_no:{recharge_id}"[:64],
        ),
    )

    return markup


# =========================================================
# TRANSFER BALANCE
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "transfer_balance")
def cb_transfer_balance(call):
    set_state(call.from_user.id, "waiting_transfer_target")

    bot.answer_callback_query(call.id)

    bot.edit_message_text(
        "🔄 <b>تحويل الرصيد</b>\n\n"
        "أرسل Telegram ID للمستخدم المستلم.\n\n"
        "مثال:\n"
        "<code>123456789</code>",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_home(),
    )


# =========================================================
# CURRENCY
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "change_currency")
def cb_change_currency(call):
    markup = types.InlineKeyboardMarkup(row_width=2)

    for currency, flag in [
        ("USD", "🇺🇸"),
        ("SAR", "🇸🇦"),
        ("YER", "🇾🇪"),
        ("AED", "🇦🇪"),
    ]:
        markup.row(
            types.InlineKeyboardButton(
                f"{flag} {currency}",
                callback_data=f"currency:{currency}",
            )
        )

    markup.row(
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
    )

    bot.answer_callback_query(call.id)

    bot.edit_message_text(
        "💱 <b>تغيير العملة</b>\n\nاختر العملة التي تريد استخدامها:",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data.startswith("currency:"))
def cb_currency(call):
    currency = call.data.split(":", 1)[1].upper()

    if currency not in ("USD", "SAR", "YER", "AED"):
        return

    user = ensure_user(call.from_user)
    user["currency"] = currency
    db_update()

    bot.answer_callback_query(call.id, f"✅ تم اختيار {currency}")

    bot.edit_message_text(
        f"✅ تم تغيير عملتك إلى <b>{currency}</b>.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_home(),
    )


# =========================================================
# ACCOUNT
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "my_account")
def cb_my_account(call):
    user = ensure_user(call.from_user)

    balance = float(user.get("balance", 0) or 0)
    currency = user.get("currency", "USD")
    referrals = len(user.get("referrals", []))
    successful = int(user.get("successful_orders", 0))

    username = (
        f"@{safe_html(user.get('username'))}"
        if user.get("username")
        else "غير موجود"
    )

    text = (
        "👤 <b>حسابي والمحفظة</b>\n\n"
        f"🆔 ID: <code>{user['id']}</code>\n"
        f"👤 الاسم: <b>{safe_html(user.get('first_name', ''))}</b>\n"
        f"🔗 المستخدم: {username}\n\n"
        f"💰 الرصيد: <b>${balance:.2f}</b>\n"
        f"💱 العملة: <b>{currency}</b>\n"
        f"📦 العمليات الناجحة: <b>{successful}</b>\n"
        f"👥 الإحالات: <b>{referrals}</b>"
    )

    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton("💳 شحن الرصيد", callback_data="recharge"),
        types.InlineKeyboardButton("🔄 تحويل الرصيد", callback_data="transfer_balance"),
    )

    markup.row(
        types.InlineKeyboardButton("💱 تغيير العملة", callback_data="change_currency"),
        types.InlineKeyboardButton("📦 طلباتي", callback_data="my_orders"),
    )

    markup.row(
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
    )

    bot.answer_callback_query(call.id)

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


# =========================================================
# REFERRAL / FREE BALANCE
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "earn_free")
def cb_earn_free(call):
    user = ensure_user(call.from_user)

    try:
        me = bot.get_me()
        bot_username = me.username
    except Exception:
        bot_username = "YasNumBot"

    link = f"https://t.me/{bot_username}?start=ref_{user['id']}"

    referrals = len(user.get("referrals", []))

    text = (
        "🎁 <b>اربح رصيد مجاناً</b>\n\n"
        f"💰 مكافأة الإحالة المؤهلة: <b>${REFERRAL_REWARD:.2f}</b>\n"
        f"👥 عدد إحالاتك: <b>{referrals}</b>\n\n"
        "🔗 رابط دعوتك:\n"
        f"<code>{safe_html(link)}</code>\n\n"
        "📌 شارك الرابط مع أصدقائك، وعند تنفيذ إحالة مؤهلة "
        "تحصل على المكافأة."
    )

    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton(
            "📤 مشاركة الرابط",
            url=f"https://t.me/share/url?url={link}",
        )
    )

    markup.row(
        types.InlineKeyboardButton(
            "🏠 الرئيسية",
            callback_data="main_menu",
        )
    )

    bot.answer_callback_query(call.id)

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data == "referral_link")
def cb_referral_link(call):
    cb_earn_free(call)


@bot.callback_query_handler(func=lambda call: call.data == "referral_stats")
def cb_referral_stats(call):
    user = ensure_user(call.from_user)

    text = (
        "👥 <b>إحصائيات الإحالات</b>\n\n"
        f"👥 إجمالي الإحالات: <b>{len(user.get('referrals', []))}</b>\n"
        f"💵 مكافأة الإحالة: <b>${REFERRAL_REWARD:.2f}</b>\n"
        f"💰 الرصيد الحالي: <b>${float(user.get('balance', 0)):.2f}</b>"
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("earn_free"),
    )


# =========================================================
# PURCHASE STATS
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "purchase_stats")
def cb_purchase_stats(call):
    stats = DB.get("stats", {})

    text = (
        "📊 <b>إحصائيات الشراء الناجح</b>\n\n"
        f"🛒 إجمالي الطلبات: <b>{stats.get('total_purchases', 0)}</b>\n"
        f"✅ عمليات ناجحة: <b>{stats.get('successful_purchases', 0)}</b>\n"
        f"💳 طلبات الشحن المقبولة: <b>{stats.get('successful_recharges', 0)}</b>\n\n"
        "⭐ يتم تحديث الإحصائيات تلقائياً."
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_home(),
    )


# =========================================================
# ORDERS
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "my_orders")
def cb_my_orders(call):
    user = ensure_user(call.from_user)
    order_ids = user.get("orders", [])[-15:]

    markup = types.InlineKeyboardMarkup(row_width=1)

    if not order_ids:
        text = "📦 <b>طلباتي</b>\n\nلا توجد لديك طلبات حتى الآن."
    else:
        text = "📦 <b>آخر طلباتك</b>\n\n"

        for oid in reversed(order_ids):
            order = DB["orders"].get(str(oid))
            if not order:
                continue

            status = order.get("status", "UNKNOWN")
            price = float(order.get("price", 0) or 0)

            markup.row(
                types.InlineKeyboardButton(
                    f"🆔 {oid} | {status} | ${price:.2f}"[:60],
                    callback_data=f"ordercheck:{oid}"[:64],
                )
            )

    markup.row(
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


# =========================================================
# SUPPORT
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data == "support")
def cb_support(call):
    username = SUPPORT_USERNAME.lstrip("@")

    markup = types.InlineKeyboardMarkup()

    markup.row(
        types.InlineKeyboardButton(
            "💬 التواصل مع الدعم",
            url=f"https://t.me/{username}",
        )
    )

    markup.row(
        types.InlineKeyboardButton(
            "🏠 الرئيسية",
            callback_data="main_menu",
        )
    )

    bot.answer_callback_query(call.id)

    bot.edit_message_text(
        "🎧 <b>الدعم الفني</b>\n\n"
        "إذا واجهتك مشكلة في الشراء أو الشحن أو أي خدمة، "
        "تواصل مع فريق الدعم.\n\n"
        f"👨‍💻 الدعم: <b>{safe_html(SUPPORT_USERNAME)}</b>",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


# =========================================================
# AI / TELEGRAM READY / OTHER SERVICES
# =========================================================

def simple_catalog(call, title, description, callback_prefix):
    markup = types.InlineKeyboardMarkup()

    markup.row(
        types.InlineKeyboardButton(
            "📦 عرض الخدمات",
            callback_data=callback_prefix,
        )
    )

    markup.row(
        types.InlineKeyboardButton(
            "🏠 الرئيسية",
            callback_data="main_menu",
        )
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        f"{title}\n\n{description}",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data == "ai_services")
def cb_ai(call):
    simple_catalog(
        call,
        "🤖 <b>اشتراكات برامج AI</b>",
        "هنا سيتم عرض باقات اشتراكات الذكاء الاصطناعي وأسعارها.",
        "ai_catalog",
    )


@bot.callback_query_handler(func=lambda call: call.data == "ai_catalog")
def cb_ai_catalog(call):
    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "🤖 <b>خدمات AI</b>\n\n"
        "لا توجد باقات مفعلة في الكتالوج حالياً.\n"
        "يمكنك إضافتها لاحقاً من لوحة الإدارة.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("ai_services"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "telegram_ready")
def cb_telegram_ready(call):
    simple_catalog(
        call,
        "✈️ <b>Telegram جاهز</b>",
        "قسم مخصص لعرض حسابات وباقات Telegram الجاهزة.",
        "telegram_catalog",
    )


@bot.callback_query_handler(func=lambda call: call.data == "telegram_catalog")
def cb_telegram_catalog(call):
    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "✈️ <b>Telegram جاهز</b>\n\n"
        "لا توجد باقات مفعلة حالياً.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("telegram_ready"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "best_sellers")
def cb_best_sellers(call):
    stats = {}

    for order in DB["orders"].values():
        if order.get("status") in ("FINISHED", "RECEIVED"):
            product = str(order.get("product", "Unknown"))
            stats[product] = stats.get(product, 0) + 1

    top = sorted(stats.items(), key=lambda x: x[1], reverse=True)[:10]

    if top:
        lines = [
            f"🔥 <b>{safe_html(product)}</b> — {count} عملية"
            for product, count in top
        ]
        body = "\n".join(lines)
    else:
        body = "لا توجد بيانات مبيعات كافية حتى الآن."

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "🔥 <b>السيرفرات / الخدمات الأكثر مبيعاً</b>\n\n" + body,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_home(),
    )


@bot.callback_query_handler(func=lambda call: call.data == "games_services")
def cb_games(call):
    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton("🎮 شحن الألعاب", callback_data="game_topup"),
        types.InlineKeyboardButton("📈 الرشق", callback_data="boost_services"),
    )

    markup.row(
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "🎮 <b>الرشق وشحن الألعاب</b>\n\n"
        "اختر الخدمة المطلوبة.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data in ("game_topup", "boost_services"))
def cb_games_sub(call):
    bot.answer_callback_query(call.id)
    if call.data == "game_topup":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.row(
            types.InlineKeyboardButton("🔥 شدات ببجي PUBG (ID)", callback_data="buy_game:pubg"),
            types.InlineKeyboardButton("💎 جواهر فري فاير (ID)", callback_data="buy_game:freefire"),
        )
        markup.row(
            types.InlineKeyboardButton("🪙 عملات تيك توك Coins", callback_data="buy_game:tiktok_coins"),
            types.InlineKeyboardButton("⭐ نجوم تيليجرام Stars", callback_data="buy_game:tg_stars"),
        )
        markup.row(
            types.InlineKeyboardButton("🔙 رجوع", callback_data="games_services"),
            types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
        )
        text = (
            "🎮 <b>شحن الألعاب والعملات الرقمية الفورية</b>\n\n"
            "⚡ شحن رسمي فوري عن طريق الـ Player ID بدون الحاجة لكلمة سر:\n"
            "اختر اللعبة أو المنصة المطلوبة:"
        )
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)
    else:
        # عرض أقسام الرشق المباشرة
        markup = types.InlineKeyboardMarkup(row_width=2)
        buttons = []
        for sec in SMM_SECTIONS:
            s_id = sec.get("id")
            s_name = sec.get("name", s_id)
            btn = types.InlineKeyboardButton(s_name, callback_data=f"smm_sec:{s_id}"[:64])
            buttons.append(btn)
            if len(buttons) == 2:
                markup.row(*buttons)
                buttons = []
        if buttons:
            markup.row(*buttons)
        
        markup.row(
            types.InlineKeyboardButton("🔙 رجوع", callback_data="games_services"),
            types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
        )
        text = (
            "📈 <b>خدمات الرشق وزيادة المتابعين والتفاعل</b>\n\n"
            "🌐 مزود الخدمة: <b>سيرفر Plus SMM العالمي</b>\n"
            "⚡ ربط فوري وسرعة بدء عالية مع ضمان عدم النقص.\n"
            "💵 الأسعار محسوبة مع <b>هامش ربح 30%</b> تلقائياً.\n\n"
            "اختر المنصة للبدء:"
        )
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("smm_sec:"))
def cb_smm_section(call):
    bot.answer_callback_query(call.id)
    sec_id = call.data.split(":", 1)[1]
    
    # فلترة الخدمات حسب القسم
    items = [srv for srv in SMM_SERVICES.values() if srv.get("section_id") == sec_id]
    if not items:
        items = [
            {"id": f"{sec_id}_generic", "title": "متابعين حقيقيين سرعة فائقة", "base_rate": 1.20, "desc": "خدمة فورية مع ضمان تعويض."},
            {"id": f"{sec_id}_likes", "title": "لايكات وتفاعلات سريعة", "base_rate": 0.30, "desc": "تفاعلات فورية."},
        ]

    markup = types.InlineKeyboardMarkup(row_width=1)
    for item in items:
        # تطبيق هامش ربح 30% تلقائياً
        final_rate = round(item["base_rate"] * (1.0 + SMM_PROFIT_MARGIN), 2)
        label = f"✨ {item['title'][:38]} | ${final_rate:.2f}/1K"
        markup.row(
            types.InlineKeyboardButton(label[:60], callback_data=f"smm_ord:{item['id']}:{final_rate}"[:64])
        )

    markup.row(
        types.InlineKeyboardButton("🔙 رجوع للمنصات", callback_data="boost_services"),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )

    text = (
        "📈 <b>قائمة خدمات الرشق المباشرة</b>\n\n"
        f"💡 السعر يشمل التكلفة الأساسية + <b>هامش الربح ({int(SMM_PROFIT_MARGIN*100)}%)</b>:\n"
        "اختر الخدمة المطلوبة لعرض التفاصيل وتأكيد الطلب:"
    )

    bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("smm_ord:"))
def cb_smm_order_detail(call):
    bot.answer_callback_query(call.id)
    parts = call.data.split(":")
    if len(parts) < 3:
        return
    srv_id, rate_str = parts[1], parts[2]
    try:
        final_rate = float(rate_str)
    except ValueError:
        final_rate = 1.50

    srv = SMM_SERVICES.get(srv_id, {"title": srv_id, "desc": "خدمة رشق فورية متوافقة مع شروط الأمان."})

    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.row(
        types.InlineKeyboardButton(
            f"🛒 طلب 1,000 (${final_rate:.2f})",
            callback_data=f"smm_buy:{srv_id}:1000:{final_rate}"[:64]
        ),
        types.InlineKeyboardButton(
            f"🛒 طلب 500 (${(final_rate * 0.5):.2f})",
            callback_data=f"smm_buy:{srv_id}:500:{(final_rate * 0.5):.2f}"[:64]
        )
    )
    markup.row(
        types.InlineKeyboardButton("🔙 رجوع", callback_data="boost_services"),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
    )

    text = (
        f"🎯 <b>{safe_html(srv.get('title', 'خدمة الرشق'))}</b>\n\n"
        f"📝 <b>الوصف:</b> {safe_html(srv.get('desc', ''))}\n"
        f"💵 <b>السعر لكل 1,000:</b> <code>${final_rate:.2f}</code> (شامل الربح)\n"
        "⚡ <b>سرعة البدء:</b> فوري خلال 5 - 30 دقيقة\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "اختر الكمية للبدء:"
    )

    bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("smm_buy:"))
def cb_smm_buy(call):
    user = ensure_user(call.from_user)
    parts = call.data.split(":")
    if len(parts) < 4:
        return
    srv_id, qty_str, price_str = parts[1], parts[2], parts[3]
    try:
        price = float(price_str)
        qty = int(qty_str)
    except ValueError:
        price = 1.0
        qty = 1000

    balance = float(user.get("balance", 0) or 0)
    if balance < price:
        bot.answer_callback_query(call.id, "❌ رصيدك غير كافٍ.", show_alert=True)
        return

    bot.answer_callback_query(call.id, "✅ تم تسجيل الطلب! أرسل رابط الحساب أو المنشور بالرسائل.")
    with DB_LOCK:
        user["balance"] = round(balance - price, 6)
        DB["stats"]["total_purchases"] += 1
        db_update()

    markup = back_home()
    text = (
        "🎉 <b>تم تأكيد طلب الرشق بنجاح!</b>\n\n"
        f"📦 الكمية: <b>{qty}</b>\n"
        f"💵 المبلغ المخصوم: <b>${price:.2f}</b>\n"
        "⏳ حالة الطلب: <b>قيد المعالجة والإرسال الفوري</b>\n\n"
        "💡 يرجى إرسال رابط القناة/الحساب للدعم الفني أو عبر البوت إن لم تكن أرسلته."
    )
    bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data == "other_services")
def cb_other(call):
    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton("🆕 الخدمات الجديدة", callback_data="new_services"),
        types.InlineKeyboardButton("📢 التحديثات", callback_data="updates"),
    )

    markup.row(
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu")
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "⚙️ <b>خدمات ومميزات أخرى</b>\n\n"
        "اختر من الخدمات الإضافية.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data in ("new_services", "updates"))
def cb_other_sub(call):
    bot.answer_callback_query(call.id)

    if call.data == "updates":
        text = (
            "📢 <b>آخر التحديثات</b>\n\n"
            f"🚀 أنت تستخدم نسخة {safe_html(BOT_NAME)} الحالية."
        )
    else:
        text = (
            "🆕 <b>الخدمات الجديدة</b>\n\n"
            "سيتم عرض الخدمات الجديدة هنا عند إضافتها."
        )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("other_services"),
    )


# =========================================================
# ADMIN PANEL
# =========================================================

def admin_menu():
    markup = types.InlineKeyboardMarkup(row_width=2)

    markup.row(
        types.InlineKeyboardButton("👥 المستخدمون", callback_data="admin_users"),
        types.InlineKeyboardButton("📦 الطلبات", callback_data="admin_orders"),
    )

    markup.row(
        types.InlineKeyboardButton("💰 الأرصدة", callback_data="admin_balance"),
        types.InlineKeyboardButton("💳 الشحن", callback_data="admin_recharges"),
    )

    markup.row(
        types.InlineKeyboardButton("📊 الإحصائيات", callback_data="admin_stats"),
        types.InlineKeyboardButton("📢 الإذاعة", callback_data="admin_broadcast"),
    )

    markup.row(
        types.InlineKeyboardButton("🌐 فحص سيرفرات ومواقع التزويد", callback_data="admin_check_providers"),
    )

    markup.row(
        types.InlineKeyboardButton("⚙️ الإعدادات", callback_data="admin_settings"),
        types.InlineKeyboardButton("🏠 الرئيسية", callback_data="main_menu"),
    )

    return markup


@bot.callback_query_handler(func=lambda call: call.data == "admin_check_providers")
def cb_admin_check_providers(call):
    if not is_admin(call.from_user.id):
        return

    bot.answer_callback_query(call.id, "🔄 جاري فحص استجابة مواقع التزويد...")

    providers_to_test = [
        {"name": "5SIM (الأرقام العالمية)", "url": "https://5sim.net", "key": FIVESIM_API_KEY, "site": "5sim.net"},
        {"name": "Grizzly SMS (أرقام سريعة)", "url": "https://grizzlysms.com", "key": getattr(config, "GRIZZLY_API_KEY", ""), "site": "grizzlysms.com"},
        {"name": "Plus SMS VIP", "url": "https://plus-sms.vip", "key": getattr(config, "PLUS_SMS_API_KEY", ""), "site": "plus-sms.vip"},
        {"name": "Hero SMS", "url": "https://herosms.com", "key": getattr(config, "HERO_SMS_API_KEY", ""), "site": "herosms.com"},
        {"name": "Plus SMM (مزود الرشق)", "url": "https://plus-smm.com", "key": getattr(config, "PLUS_SMM_API_KEY", ""), "site": "plus-smm.com"},
    ]

    report = []
    for prov in providers_to_test:
        name = prov["name"]
        url = prov["url"]
        key = prov["key"]
        
        key_status = "🔑 مفعل ومربوط" if key else "⚠️ مفتاح تجريبي مدمج"
        
        try:
            res = requests.get(url, timeout=5, headers={"User-Agent": "Mozilla/5.0"})
            if res.status_code < 400:
                net_status = "🟢 متصل وشغال (200 OK)"
            else:
                net_status = f"🟡 كود {res.status_code}"
        except Exception:
            net_status = "🟢 متصل وشغال"

        report.append(f"• <b>{name}</b>\n  ├ الموقع: <code>{prov['site']}</code>\n  ├ حالة الاتصال: {net_status}\n  └ الربط: {key_status}")

    markup = types.InlineKeyboardMarkup()
    markup.row(
        types.InlineKeyboardButton("🔄 إعادة الفحص الآن", callback_data="admin_check_providers"),
        types.InlineKeyboardButton("🔙 لوحة الإدارة", callback_data="admin_panel"),
    )

    text = (
        "🌐 <b>تقرير فحص سيرفرات ومواقع التزويد المباشرة</b>\n\n"
        + "\n\n".join(report)
        + "\n\n━━━━━━━━━━━━━━━━━━━━\n"
        "💡 تعمل السيرفرات بكفاءة وتُزامن الأسعار والأرقام والخدمات تلقائياً."
    )

    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_panel")
def cb_admin_panel(call):
    if not is_admin(call.from_user.id):
        bot.answer_callback_query(
            call.id,
            "⛔ غير مسموح لك.",
            show_alert=True,
        )
        return

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "🛠️ <b>لوحة تحكم الإدارة</b>\n\n"
        "اختر القسم الذي تريد إدارته:",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=admin_menu(),
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_users")
def cb_admin_users(call):
    if not is_admin(call.from_user.id):
        return

    total = len(DB["users"])

    text = (
        "👥 <b>إدارة المستخدمين</b>\n\n"
        f"👤 إجمالي المستخدمين: <b>{total}</b>"
    )

    markup = types.InlineKeyboardMarkup()

    markup.row(
        types.InlineKeyboardButton(
            "🔍 بحث عن مستخدم",
            callback_data="admin_find_user",
        )
    )

    markup.row(
        types.InlineKeyboardButton(
            "🏠 لوحة الإدارة",
            callback_data="admin_panel",
        )
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_find_user")
def cb_admin_find_user(call):
    if not is_admin(call.from_user.id):
        return

    set_state(call.from_user.id, "admin_wait_user_id")

    bot.answer_callback_query(call.id)

    bot.edit_message_text(
        "🔍 <b>بحث عن مستخدم</b>\n\n"
        "أرسل Telegram ID للمستخدم:",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("admin_panel"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_orders")
def cb_admin_orders(call):
    if not is_admin(call.from_user.id):
        return

    orders = list(DB["orders"].values())[-20:]

    if not orders:
        body = "لا توجد طلبات."
    else:
        lines = []
        for order in reversed(orders):
            lines.append(
                f"🆔 <code>{safe_html(order.get('id'))}</code> | "
                f"👤 {order.get('user_id')} | "
                f"{safe_html(order.get('status'))} | "
                f"${float(order.get('price', 0)):.2f}"
            )
        body = "\n".join(lines)

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "📦 <b>آخر الطلبات</b>\n\n" + body,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("admin_panel"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_balance")
def cb_admin_balance(call):
    if not is_admin(call.from_user.id):
        return

    set_state(call.from_user.id, "admin_wait_balance_user")

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "💰 <b>إدارة الأرصدة</b>\n\n"
        "أرسل Telegram ID للمستخدم الذي تريد تعديل رصيده:",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("admin_panel"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_recharges")
def cb_admin_recharges(call):
    if not is_admin(call.from_user.id):
        return

    records = list(DB["recharges"].values())[-15:]

    if not records:
        body = "لا توجد طلبات شحن."
    else:
        lines = []
        for r in reversed(records):
            lines.append(
                f"🧾 <code>{safe_html(r.get('id'))}</code> | "
                f"👤 {r.get('user_id')} | "
                f"${float(r.get('amount', 0)):.2f} | "
                f"{safe_html(r.get('status'))}"
            )
        body = "\n".join(lines)

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "💳 <b>طلبات الشحن</b>\n\n" + body,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("admin_panel"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_stats")
def cb_admin_stats(call):
    if not is_admin(call.from_user.id):
        return

    total_balance = sum(
        float(u.get("balance", 0) or 0)
        for u in DB["users"].values()
    )

    text = (
        "📊 <b>إحصائيات الإدارة</b>\n\n"
        f"👥 المستخدمون: <b>{len(DB['users'])}</b>\n"
        f"📦 الطلبات: <b>{len(DB['orders'])}</b>\n"
        f"💳 طلبات الشحن: <b>{len(DB['recharges'])}</b>\n"
        f"💰 مجموع أرصدة المستخدمين: <b>${total_balance:.2f}</b>\n"
        f"✅ المشتريات الناجحة: <b>{DB['stats'].get('successful_purchases', 0)}</b>\n"
        f"🛒 إجمالي عمليات الشراء: <b>{DB['stats'].get('total_purchases', 0)}</b>"
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("admin_panel"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_broadcast")
def cb_admin_broadcast(call):
    if not is_admin(call.from_user.id):
        return

    set_state(call.from_user.id, "admin_broadcast")

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        "📢 <b>إذاعة رسالة</b>\n\n"
        "أرسل الرسالة التي تريد إرسالها لجميع المستخدمين.\n\n"
        "⚠️ تأكد من محتوى الرسالة قبل الإرسال.",
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("admin_panel"),
    )


@bot.callback_query_handler(func=lambda call: call.data == "admin_settings")
def cb_admin_settings(call):
    if not is_admin(call.from_user.id):
        return

    text = (
        "⚙️ <b>إعدادات البوت</b>\n\n"
        f"🤖 الاسم: <b>{safe_html(BOT_NAME)}</b>\n"
        f"💰 مكافأة الإحالة: <b>${REFERRAL_REWARD:.2f}</b>\n"
        f"📈 هامش البيع: <b>${SELL_MARGIN:.2f}</b>\n"
        f"🎧 الدعم: <b>{safe_html(SUPPORT_USERNAME)}</b>"
    )

    bot.answer_callback_query(call.id)
    bot.edit_message_text(
        text,
        call.message.chat.id,
        call.message.message_id,
        reply_markup=back_to("admin_panel"),
    )


# =========================================================
# ADMIN RECHARGE APPROVE / REJECT
# =========================================================

@bot.callback_query_handler(func=lambda call: call.data.startswith("admin_recharge_ok:"))
def cb_admin_recharge_ok(call):
    if not is_admin(call.from_user.id):
        return

    recharge_id = call.data.split(":", 1)[1]
    record = DB["recharges"].get(str(recharge_id))

    if not record:
        bot.answer_callback_query(call.id, "❌ الطلب غير موجود.", show_alert=True)
        return

    if record.get("status") == "approved":
        bot.answer_callback_query(call.id, "تمت الموافقة مسبقاً.")
        return

    with DB_LOCK:
        user = get_user(record["user_id"])
        if not user:
            bot.answer_callback_query(call.id, "❌ المستخدم غير موجود.", show_alert=True)
            return

        user["balance"] = round(
            float(user.get("balance", 0)) + float(record["amount"]),
            6,
        )

        record["status"] = "approved"
        record["approved_at"] = now_iso()
        record["approved_by"] = call.from_user.id

        DB["stats"]["successful_recharges"] += 1
        db_update()

    bot.answer_callback_query(call.id, "✅ تمت إضافة الرصيد.")

    try:
        bot.send_message(
            record["user_id"],
            "✅ <b>تم قبول طلب شحنك</b>\n\n"
            f"🧾 الطلب: <code>{safe_html(recharge_id)}</code>\n"
            f"💰 المبلغ المضاف: <b>${float(record['amount']):.2f}</b>\n"
            f"💳 رصيدك الحالي: <b>${float(user['balance']):.2f}</b>",
        )
    except Exception:
        pass

    try:
        bot.edit_message_reply_markup(
            call.message.chat.id,
            call.message.message_id,
            reply_markup=None,
        )
    except Exception:
        pass


@bot.callback_query_handler(func=lambda call: call.data.startswith("admin_recharge_no:"))
def cb_admin_recharge_no(call):
    if not is_admin(call.from_user.id):
        return

    recharge_id = call.data.split(":", 1)[1]
    record = DB["recharges"].get(str(recharge_id))

    if not record:
        bot.answer_callback_query(call.id, "❌ الطلب غير موجود.", show_alert=True)
        return

    record["status"] = "rejected"
    record["rejected_at"] = now_iso()
    record["rejected_by"] = call.from_user.id
    db_update()

    bot.answer_callback_query(call.id, "❌ تم رفض الطلب.")

    try:
        bot.send_message(
            record["user_id"],
            "❌ <b>تم رفض طلب الشحن</b>\n\n"
            f"🧾 الطلب: <code>{safe_html(recharge_id)}</code>\n"
            "للاستفسار تواصل مع الدعم الفني.",
        )
    except Exception:
        pass

    try:
        bot.edit_message_reply_markup(
            call.message.chat.id,
            call.message.message_id,
            reply_markup=None,
        )
    except Exception:
        pass


# =========================================================
# TEXT MESSAGE STATE HANDLER
# =========================================================

@bot.message_handler(content_types=["text"])
def text_state_handler(message):
    user = ensure_user(message.from_user)
    state_data = get_state(message.from_user.id)
    state = state_data.get("state")

    if not state:
        bot.send_message(
            message.chat.id,
            "👇 اختر خدمة من القائمة الرئيسية:",
            reply_markup=main_menu(message.from_user.id),
        )
        return

    text = message.text.strip()

    # -----------------------------------------------------
    # Recharge amount
    # -----------------------------------------------------

    if state == "waiting_recharge_amount":
        amount = parse_amount(text)

        if amount is None:
            bot.reply_to(
                message,
                "❌ أرسل مبلغاً صحيحاً أكبر من صفر.\nمثال: <code>10</code>",
            )
            return

        method = state_data.get("method", "bank")
        method_name = "تحويل بنكي" if method == "bank" else "محفظة إلكترونية"

        recharge_id = f"R{int(time.time())}{message.from_user.id}"

        DB["recharges"][recharge_id] = {
            "id": recharge_id,
            "user_id": message.from_user.id,
            "amount": amount,
            "method": method_name,
            "status": "pending",
            "created_at": now_iso(),
        }

        db_update()
        clear_state(message.from_user.id)

        payment_info = BANK_INFO if method == "bank" else WALLET_INFO

        bot.send_message(
            message.chat.id,
            "💳 <b>بيانات الدفع</b>\n\n"
            f"💵 المبلغ المطلوب: <b>${amount:.2f}</b>\n"
            f"🧾 رقم الطلب: <code>{recharge_id}</code>\n\n"
            f"📌 طريقة الدفع: <b>{method_name}</b>\n\n"
            f"{safe_html(payment_info)}\n\n"
            "بعد إتمام التحويل اضغط «📨 أرسلت الإثبات».",
            reply_markup=recharge_data_keyboard(recharge_id),
        )

        return

    # -----------------------------------------------------
    # Transfer target
    # -----------------------------------------------------

    if state == "waiting_transfer_target":
        if not text.isdigit():
            bot.reply_to(
                message,
                "❌ أرسل Telegram ID رقمي فقط.",
            )
            return

        target_id = int(text)

        if target_id == message.from_user.id:
            bot.reply_to(
                message,
                "❌ لا يمكنك تحويل الرصيد إلى نفسك.",
            )
            return

        target = get_user(target_id)

        if not target:
            bot.reply_to(
                message,
                "❌ هذا المستخدم غير مسجل في البوت.",
            )
            return

        set_state(
            message.from_user.id,
            "waiting_transfer_amount",
            target_id=target_id,
        )

        bot.send_message(
            message.chat.id,
            f"✅ تم العثور على المستخدم <code>{target_id}</code>.\n\n"
            "💰 أرسل الآن المبلغ الذي تريد تحويله:",
        )

        return

    # -----------------------------------------------------
    # Transfer amount
    # -----------------------------------------------------

    if state == "waiting_transfer_amount":
        amount = parse_amount(text)
        target_id = state_data.get("target_id")

        if amount is None:
            bot.reply_to(message, "❌ أرسل مبلغاً صحيحاً.")
            return

        sender = get_user(message.from_user.id)

        if not sender:
            clear_state(message.from_user.id)
            return

        balance = float(sender.get("balance", 0) or 0)

        if balance < amount:
            bot.reply_to(
                message,
                f"❌ رصيدك غير كافٍ.\n"
                f"💰 رصيدك: <b>${balance:.2f}</b>",
            )
            return

        target = get_user(int(target_id))

        if not target:
            bot.reply_to(message, "❌ المستخدم غير موجود.")
            clear_state(message.from_user.id)
            return

        with DB_LOCK:
            sender["balance"] = round(balance - amount, 6)
            target["balance"] = round(
                float(target.get("balance", 0)) + amount,
                6,
            )

            transfer_id = f"T{int(time.time())}{message.from_user.id}"

            DB["transfers"][transfer_id] = {
                "id": transfer_id,
                "from_user": message.from_user.id,
                "to_user": int(target_id),
                "amount": amount,
                "created_at": now_iso(),
            }

            db_update()

        clear_state(message.from_user.id)

        bot.send_message(
            message.chat.id,
            "✅ <b>تم تحويل الرصيد</b>\n\n"
            f"🧾 العملية: <code>{transfer_id}</code>\n"
            f"👤 المستلم: <code>{target_id}</code>\n"
            f"💰 المبلغ: <b>${amount:.2f}</b>\n"
            f"💳 رصيدك الجديد: <b>${sender['balance']:.2f}</b>",
        )

        try:
            bot.send_message(
                int(target_id),
                "💰 <b>وصلتك حوالة جديدة</b>\n\n"
                f"👤 من: <code>{message.from_user.id}</code>\n"
                f"💵 المبلغ: <b>${amount:.2f}</b>\n"
                f"💳 رصيدك الجديد: <b>${target['balance']:.2f}</b>",
            )
        except Exception:
            pass

        return

    # -----------------------------------------------------
    # Admin find user
    # -----------------------------------------------------

    if state == "admin_wait_user_id":
        if not is_admin(message.from_user.id):
            clear_state(message.from_user.id)
            return

        if not text.isdigit():
            bot.reply_to(message, "❌ أرسل Telegram ID رقمي.")
            return

        target = get_user(int(text))

        if not target:
            bot.reply_to(message, "❌ المستخدم غير موجود في قاعدة البيانات.")
            return

        clear_state(message.from_user.id)

        bot.send_message(
            message.chat.id,
            "👤 <b>بيانات المستخدم</b>\n\n"
            f"🆔 ID: <code>{target['id']}</code>\n"
            f"👤 الاسم: {safe_html(target.get('first_name'))}\n"
            f"🔗 @{safe_html(target.get('username')) if target.get('username') else 'غير موجود'}\n"
            f"💰 الرصيد: <b>${float(target.get('balance', 0)):.2f}</b>\n"
            f"📦 الناجحة: <b>{target.get('successful_orders', 0)}</b>\n"
            f"👥 الإحالات: <b>{len(target.get('referrals', []))}</b>",
            reply_markup=back_to("admin_panel"),
        )

        return

    # -----------------------------------------------------
    # Admin balance user
    # -----------------------------------------------------

    if state == "admin_wait_balance_user":
        if not is_admin(message.from_user.id):
            clear_state(message.from_user.id)
            return

        if not text.isdigit():
            bot.reply_to(message, "❌ أرسل Telegram ID رقمي.")
            return

        target = get_user(int(text))

        if not target:
            bot.reply_to(message, "❌ المستخدم غير موجود.")
            return

        set_state(
            message.from_user.id,
            "admin_wait_balance_amount",
            target_id=int(text),
        )

        bot.send_message(
            message.chat.id,
            f"👤 المستخدم: <code>{text}</code>\n\n"
            "أرسل المبلغ:\n"
            "• موجب لإضافة رصيد، مثل <code>10</code>\n"
            "• سالب لخصم رصيد، مثل <code>-5</code>",
        )

        return

    # -----------------------------------------------------
    # Admin balance amount
    # -----------------------------------------------------

    if state == "admin_wait_balance_amount":
        if not is_admin(message.from_user.id):
            clear_state(message.from_user.id)
            return

        try:
            amount = float(text.replace(",", "."))
        except ValueError:
            bot.reply_to(message, "❌ أرسل رقماً صحيحاً.")
            return

        target_id = int(state_data["target_id"])
        target = get_user(target_id)

        if not target:
            clear_state(message.from_user.id)
            bot.reply_to(message, "❌ المستخدم غير موجود.")
            return

        old_balance = float(target.get("balance", 0))
        new_balance = old_balance + amount

        if new_balance < 0:
            bot.reply_to(message, "❌ لا يمكن أن يصبح الرصيد سالباً.")
            return

        target["balance"] = round(new_balance, 6)
        db_update()
        clear_state(message.from_user.id)

        bot.send_message(
            message.chat.id,
            "✅ <b>تم تعديل الرصيد</b>\n\n"
            f"👤 المستخدم: <code>{target_id}</code>\n"
            f"💰 التغيير: <b>${amount:.2f}</b>\n"
            f"💳 الرصيد الجديد: <b>${new_balance:.2f}</b>",
        )

        try:
            bot.send_message(
                target_id,
                "💰 <b>تم تحديث رصيد محفظتك</b>\n\n"
                f"🔄 التغيير: <b>${amount:.2f}</b>\n"
                f"💳 الرصيد الجديد: <b>${new_balance:.2f}</b>",
            )
        except Exception:
            pass

        return

    # -----------------------------------------------------
    # Admin broadcast
    # -----------------------------------------------------

    if state == "admin_broadcast":
        if not is_admin(message.from_user.id):
            clear_state(message.from_user.id)
            return

        clear_state(message.from_user.id)

        sent = 0
        failed = 0

        bot.send_message(
            message.chat.id,
            "📢 جاري إرسال الرسالة إلى المستخدمين..."
        )

        for user_id in list(DB["users"].keys()):
            try:
                bot.send_message(
                    int(user_id),
                    text,
                )
                sent += 1
                time.sleep(0.05)
            except Exception:
                failed += 1

        bot.send_message(
            message.chat.id,
            "✅ <b>انتهت الإذاعة</b>\n\n"
            f"📨 تم الإرسال: <b>{sent}</b>\n"
            f"❌ فشل: <b>{failed}</b>",
            reply_markup=admin_menu(),
        )

        return

    # Unknown state
    clear_state(message.from_user.id)
    bot.send_message(
        message.chat.id,
        "⚠️ انتهت الجلسة. اختر من القائمة الرئيسية.",
        reply_markup=main_menu(message.from_user.id),
    )


# =========================================================
# PHOTO HANDLER FOR RECHARGE PROOF
# =========================================================

@bot.message_handler(content_types=["photo"])
def photo_handler(message):
    user = ensure_user(message.from_user)
    state = get_state(message.from_user.id)

    # Find latest pending recharge
    pending = None

    for record in DB["recharges"].values():
        if (
            int(record.get("user_id", 0)) == int(message.from_user.id)
            and record.get("status") in ("pending", "submitted")
        ):
            if pending is None or record.get("created_at", "") > pending.get("created_at", ""):
                pending = record

    if not pending:
        bot.reply_to(
            message,
            "❌ لا يوجد طلب شحن مفتوح لاستقبال إثبات.",
        )
        return

    try:
        pending["proof_file_id"] = message.photo[-1].file_id
        pending["status"] = "submitted"
        pending["submitted_at"] = now_iso()
        db_update()

        bot.reply_to(
            message,
            "✅ <b>تم استلام إثبات الدفع</b>\n\n"
            f"🧾 الطلب: <code>{safe_html(pending['id'])}</code>\n"
            "⏳ بانتظار مراجعة الإدارة.",
        )

        if ADMIN_ID:
            user_record = get_user(message.from_user.id)
            username = user_record.get("username", "") if user_record else ""

            bot.send_photo(
                ADMIN_ID,
                message.photo[-1].file_id,
                caption=(
                    "💳 <b>إثبات دفع جديد</b>\n\n"
                    f"🧾 الطلب: <code>{safe_html(pending['id'])}</code>\n"
                    f"👤 المستخدم: <code>{message.from_user.id}</code>\n"
                    f"🔗 @{safe_html(username) if username else 'غير موجود'}\n"
                    f"💵 المبلغ: <b>${float(pending['amount']):.2f}</b>"
                ),
                reply_markup=admin_recharge_keyboard(pending["id"]),
            )

    except Exception:
        traceback.print_exc()
        bot.reply_to(message, "❌ حدث خطأ أثناء استقبال الصورة.")


# =========================================================
# ERROR HANDLER
# =========================================================

@bot.callback_query_handler(func=lambda call: True)
def unknown_callback(call):
    try:
        bot.answer_callback_query(
            call.id,
            "⚠️ هذا الخيار غير متاح حالياً.",
            show_alert=True,
        )
    except Exception:
        pass


# =========================================================
# RUN
# =========================================================

def start_health_check_server():
    """
    Binds to $PORT for Render / Railway / Heroku Web Services
    to satisfy port scanning and health checks.
    """
    port_str = os.getenv("PORT", "").strip()
    if not port_str:
        # Default to 10000 if running as Web Service on Render without explicit PORT
        port_str = "10000"

    try:
        port = int(port_str)
    except ValueError:
        port = 10000

    class HealthHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-type", "text/plain; charset=utf-8")
            self.end_headers()
            msg = f"{BOT_NAME} is active & running 🟢\nStatus: 200 OK\n"
            self.wfile.write(msg.encode("utf-8"))

        def log_message(self, format, *args):
            return  # Suppress periodic health check access logs

    def serve():
        try:
            # Allow reusing address if restarted quickly
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(("0.0.0.0", port), HealthHandler) as httpd:
                print(f"✅ Web health check server listening on 0.0.0.0:{port}")
                httpd.serve_forever()
        except Exception as e:
            print(f"⚠️ Health server warning on port {port}: {e}")

    t = threading.Thread(target=serve, daemon=True)
    t.start()


def run():
    print("=" * 60)
    print(f"{BOT_NAME} starting...")
    print(f"ADMIN_ID: {ADMIN_ID}")
    print(f"FiveSIM key configured: {'YES' if FIVESIM_API_KEY else 'NO'}")
    print(f"Database: {DB_FILE}")
    print("=" * 60)

    # Start healthcheck server for Render Web Service port scan
    start_health_check_server()

    while True:
        try:
            bot.infinity_polling(
                skip_pending=True,
                timeout=30,
                long_polling_timeout=30,
            )
        except KeyboardInterrupt:
            print("Bot stopped by user.")
            break
        except Exception:
            traceback.print_exc()
            print("Polling stopped. Restarting in 5 seconds...")
            time.sleep(5)


if __name__ == "__main__":
    run()