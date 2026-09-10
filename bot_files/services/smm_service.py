# =========================================================
# YasNum & VaultX - SMM Service (SMMTigers / JAP API)
# =========================================================

import time
import re
import urllib.request
import urllib.parse
import json
import catalog
from database import get_setting

SMM_SERVICES_CACHE = {
    "data": [],
    "timestamp": 0
}

SMM_PLATFORMS = {
    "tg": {"name": "تيليجرام", "icon": "✈️", "keys": ["telegram", "تيليجرام", "tg"]},
    "ig": {"name": "إنستغرام", "icon": "📸", "keys": ["instagram", "انستغرام", "إنستغرام", "ig"]},
    "tt": {"name": "تيك توك", "icon": "🎵", "keys": ["tiktok", "تيك توك", "tt"]},
    "fb": {"name": "فيسبوك", "icon": "👤", "keys": ["facebook", "فيسبوك", "fb"]},
    "yt": {"name": "يوتيوب", "icon": "🔴", "keys": ["youtube", "يوتيوب", "yt"]},
    "x":  {"name": "تويتر / X", "icon": "🐦", "keys": ["twitter", "تويتر", "x "]},
    "th": {"name": "ثريدز", "icon": "🧵", "keys": ["threads", "ثريدز"]},
    "sc": {"name": "ساوند كلاود", "icon": "☁️", "keys": ["soundcloud", "ساوند"]},
    "wa": {"name": "واتساب", "icon": "🟢", "keys": ["whatsapp", "واتساب"]},
    "games": {"name": "شحن الألعاب والخدمات الأُخرى", "icon": "🎮", "keys": ["game", "pubg", "freefire", "ألعاب", "العاب", "سيرفر"]}
}

def get_smm_margin():
    try:
        val = get_setting("smm_margin", "0.30")
        return float(val)
    except Exception:
        return 0.30

def fetch_smm_services(force_refresh=False):
    now = time.time()
    if not force_refresh and SMM_SERVICES_CACHE["data"] and (now - SMM_SERVICES_CACHE["timestamp"] < 900):
        return SMM_SERVICES_CACHE["data"]
        
    smm_url = str(get_setting("smm_url", "https://smmtigers.com/api/v2")).strip()
    smm_key = str(get_setting("smm_key", get_setting("smm_api_key", ""))).strip()
    
    if not smm_key:
        return []
        
    try:
        payload = {"key": smm_key, "action": "services"}
        req = urllib.request.Request(smm_url, data=urllib.parse.urlencode(payload).encode('utf-8'))
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if isinstance(data, list):
                SMM_SERVICES_CACHE["data"] = data
                SMM_SERVICES_CACHE["timestamp"] = now
                return data
    except Exception as e:
        print(f"fetch_smm_services error: {e}")
        if SMM_SERVICES_CACHE["data"]:
            return SMM_SERVICES_CACHE["data"]
            
    return []

def get_smm_service_by_id(service_id):
    services = fetch_smm_services()
    for s in services:
        if str(s.get("service")) == str(service_id):
            return s
            
    if str(service_id) in catalog.SMM_SERVICES:
        c_info = catalog.SMM_SERVICES[str(service_id)]
        return {
            "service": str(service_id),
            "name": c_info["title"],
            "category": c_info["section"],
            "rate": c_info["raw_per_1000"],
            "min": c_info["min_qty"],
            "max": c_info["max_qty"],
            "is_catalog": True,
            "raw_info": c_info
        }
    return None

def build_smm_service_card_text(smm_info):
    raw_unit = smm_info.get("raw_unit_price", 0.0003)
    smm_margin = get_smm_margin()
    unit_p = round(raw_unit * (1.0 + smm_margin), 6)
    per_1k = round(smm_info.get("raw_per_1000", 0.3) * (1.0 + smm_margin), 4)
    
    return (
        f"📋 تفاصيل ومواصفات الخدمة:\n\n"
        f"👑 الخدمة: {smm_info.get('title')}\n"
        f"📂 القسم: {smm_info.get('section')}\n\n"
        f"⚡ وقت البدء: فوري خلال ثوانٍ\n"
        f"👤 الجودة: {smm_info.get('quality', 'عالية الجودة')}\n"
        f"🚀 السرعة: {smm_info.get('speed', 'فورية')}\n"
        f"🛡️ الضمان: {smm_info.get('guarantee', 'مضمون')}\n"
        f"🔄 التعويض: {smm_info.get('compensation', 'نعم')}\n"
        f"💰 سعر الألف: ${per_1k}\n"
        f"💵 سعر العضو: ${unit_p:.6f}\n"
        f"🔢 أقل كمية: {smm_info.get('min_qty', 10)} | أقصى كمية: {smm_info.get('max_qty', 1000000):,}\n\n"
        f"🔗 نوع الرابط المطلوب: {smm_info.get('link_type', 'رابط القناة أو المجموعات')}\n\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"👇 الآن من فضلك أرسل رابط الطلب:"
    )

def arabic_translate_smm_service(name):
    if not name:
        return ""
    
    res = str(name)
    replacements = [
        ("Telegram", "تيليجرام"),
        ("Instagram", "إنستغرام"),
        ("TikTok", "تيك توك"),
        ("Facebook", "فيسبوك"),
        ("YouTube", "يوتيوب"),
        ("Twitter", "تويتر"),
        ("Threads", "ثريدز"),
        ("SoundCloud", "ساوند كلاود"),
        ("WhatsApp", "واتساب"),
        
        ("Non Drop", "بدون نقص 🛡️"),
        ("Non-Drop", "بدون نقص 🛡️"),
        ("No Drop", "بدون نقص 🛡️"),
        ("Low Drop", "نقص خفيف 📉"),
        ("Auto Refill", "تعبئة تلقائية 🔄"),
        ("Refill 365 Days", "ضمان تعبئة سنة 🔄"),
        ("Refill 90 Days", "ضمان تعبئة 90 يوم 🔄"),
        ("Refill 60 Days", "ضمان تعبئة 60 يوم 🔄"),
        ("Refill 30 Days", "ضمان تعبئة 30 يوم 🔄"),
        ("Refill", "ضمان تعبئة 🔄"),
        ("Guaranteed", "مضمون 🛡️"),
        ("High Quality", "جودة عالية 🌟"),
        ("HQ", "جودة عالية 🌟"),
        ("Real & Active", "حقيقي ونشط 👤"),
        ("Real", "حقيقي 👤"),
        ("Active", "نشط ⚡"),
        ("Instant", "فوري ⚡"),
        ("Fast Speed", "سرعة عالية ⚡"),
        ("Speed", "السرعة"),
        
        ("Members", "أعضاء"),
        ("Subscribers", "مشتركين"),
        ("Followers", "متابعين"),
        ("Likes", "إعجابات"),
        ("Views", "مشاهدات"),
        ("Comments", "تعليقات"),
        ("Reactions", "تفاعلات"),
        ("Story Views", "مشاهدات ستوري"),
        ("Live Stream", "بث مباشر"),
        ("Shares", "مشاركات"),
        ("Retweets", "إعادة تغريد"),
        ("Channel", "قناة"),
        ("Group", "مجموعة"),
        ("Post", "منشور")
    ]
    
    for old, new in replacements:
        pattern = re.compile(re.escape(old), re.IGNORECASE)
        res = pattern.sub(new, res)
        
    return res

def filter_smm_services(platform_code="", query=""):
    services = fetch_smm_services()
    if services:
        if query:
            q = query.lower().strip()
            return [s for s in services if q in str(s.get("service")).lower() or q in str(s.get("name")).lower() or q in str(s.get("category")).lower()]
            
        p_info = SMM_PLATFORMS.get(platform_code)
        if not p_info:
            return services
            
        keys = p_info["keys"]
        filtered = []
        
        if platform_code == "games":
            social_keys = ["telegram", "تيليجرام", "tg", "instagram", "انستغرام", "ig", "tiktok", "تيك توك", "tt", "facebook", "فيسبوك", "fb", "youtube", "يوتيوب", "yt", "twitter", "تويتر", "threads", "ثريدز", "soundcloud", "whatsapp", "واتساب"]
            for s in services:
                cat = str(s.get("category", "")).lower()
                name = str(s.get("name", "")).lower()
                if not any(k in cat or k in name for k in social_keys):
                    filtered.append(s)
            return filtered
            
        for s in services:
            cat = str(s.get("category", "")).lower()
            name = str(s.get("name", "")).lower()
            if any(k in cat or k in name for k in keys):
                filtered.append(s)
                
        return filtered

    # FALLBACK to catalog.SMM_SERVICES if API returns no services or key not configured yet
    fallback_list = []
    sec_name = ""
    if platform_code == "tg":
        sec_name = "رشق تيليجرام"
    elif platform_code == "ig":
        sec_name = "رشق إنستغرام"
    elif platform_code == "tt":
        sec_name = "رشق تيك توك"
    elif platform_code == "games":
        sec_name = "شحن الألعاب"
    elif platform_code == "ai":
        sec_name = "برامج AI"
    
    for smm_id, smm_info in catalog.SMM_SERVICES.items():
        c_sec = smm_info.get("section", "")
        if query:
            q = query.lower().strip()
            if q in smm_id.lower() or q in smm_info.get("title", "").lower() or q in c_sec.lower():
                fallback_list.append({
                    "service": smm_id,
                    "name": smm_info.get("title"),
                    "category": c_sec,
                    "rate": smm_info.get("raw_per_1000", 0.0),
                    "min": smm_info.get("min_qty", 10),
                    "max": smm_info.get("max_qty", 10000),
                    "is_catalog": True,
                    "raw_info": smm_info
                })
        elif sec_name and c_sec == sec_name:
            fallback_list.append({
                "service": smm_id,
                "name": smm_info.get("title"),
                "category": c_sec,
                "rate": smm_info.get("raw_per_1000", 0.0),
                "min": smm_info.get("min_qty", 10),
                "max": smm_info.get("max_qty", 10000),
                "is_catalog": True,
                "raw_info": smm_info
            })
        elif not platform_code and not sec_name:
            fallback_list.append({
                "service": smm_id,
                "name": smm_info.get("title"),
                "category": c_sec,
                "rate": smm_info.get("raw_per_1000", 0.0),
                "min": smm_info.get("min_qty", 10),
                "max": smm_info.get("max_qty", 10000),
                "is_catalog": True,
                "raw_info": smm_info
            })
            
    return fallback_list

def send_smm_api_order(service_id, link, quantity):
    smm_url = str(get_setting("smm_url", "https://smmtigers.com/api/v2")).strip()
    smm_key = str(get_setting("smm_key", get_setting("smm_api_key", ""))).strip()
    
    if not smm_key:
        return False, "لم يتم إدخال مفتاح الـ API الخاص بسيرفر الرشق في لوحة الإدارة."
        
    try:
        payload = {
            "key": smm_key,
            "action": "add",
            "service": str(service_id),
            "link": str(link),
            "quantity": int(quantity)
        }
        req = urllib.request.Request(smm_url, data=urllib.parse.urlencode(payload).encode('utf-8'))
        with urllib.request.urlopen(req, timeout=15) as resp:
            res_data = json.loads(resp.read().decode('utf-8'))
            if "order" in res_data:
                return True, str(res_data["order"])
            elif "error" in res_data:
                return False, str(res_data["error"])
            else:
                return False, f"استجابة غير متوقعة: {res_data}"
    except Exception as e:
        return False, f"خطأ في الاتصال بسيرفر الرشق: {e}"

def fetch_smm_user_balance():
    smm_url = str(get_setting("smm_url", "https://smmtigers.com/api/v2")).strip()
    smm_key = str(get_setting("smm_key", get_setting("smm_api_key", ""))).strip()
    
    if not smm_key:
        return None, "مفتاح الـ API غير مضبوط."
        
    try:
        payload = {"key": smm_key, "action": "balance"}
        req = urllib.request.Request(smm_url, data=urllib.parse.urlencode(payload).encode('utf-8'))
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if "balance" in data:
                return str(data["balance"]), str(data.get("currency", "USD"))
            elif "error" in data:
                return None, str(data["error"])
    except Exception as e:
        return None, f"خطأ بالاتصال: {e}"
    return None, "تعذر جلب الرصيد"
