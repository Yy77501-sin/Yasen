import os
import sys
import time
import json
import random
import sqlite3
import threading
import datetime
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import telebot
from telebot import types
from http.server import HTTPServer, BaseHTTPRequestHandler

# ----------------- التأكد من مسار الاستيراد -----------------
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# ----------------- استيراد الإعدادات والكتالوج -----------------
try:
    import config
    BOT_TOKEN = getattr(config, 'BOT_TOKEN', '').strip()
    FIVESIM_JWT_TOKEN = getattr(config, 'FIVESIM_API_KEY', getattr(config, 'FIVESIM_JWT_TOKEN', '')).strip()
    GRIZZLY_API_KEY = getattr(config, 'GRIZZLY_API_KEY', '').strip()
    HERO_API_KEY = getattr(config, 'HERO_SMS_API_KEY', '').strip()
    TG_READY_API_KEY = getattr(config, 'TG_READY_API_KEY', '').strip()
    TG_READY_BASE_URL = getattr(config, 'TG_READY_BASE_URL', 'https://api.tg-ready.net/v1').strip()
    RENDER_EXTERNAL_URL = getattr(config, 'RENDER_EXTERNAL_URL', '').strip()
    ADMIN_ID = str(getattr(config, 'ADMIN_ID', 0)).strip()
    SUPPORT_USERNAME = getattr(config, 'SUPPORT_USERNAME', '').strip()
    CURRENCY = getattr(config, 'CURRENCY', '$').strip()
    
    # هامش الربح المعتمد: 30% تلقائياً
    PROFIT_MARGIN = getattr(config, 'PROFIT_MARGIN', 0.30)
    RUB_PER_USD = getattr(config, 'RUB_PER_USD', 30.0)
    
    MAIN_CHANNEL_URL = getattr(config, 'MAIN_CHANNEL_URL', '').strip()
    INSTRUCTIONS_CHANNEL_URL = getattr(config, 'INSTRUCTIONS_CHANNEL_URL', '').strip()
    ACTIVATION_CHANNEL_ID = getattr(config, 'ACTIVATION_CHANNEL_ID', '').strip()
except Exception as e:
    print(f"Config Import Warning: {e}")
    BOT_TOKEN = os.getenv('BOT_TOKEN', '8880668064:AAHFsGU8w_Hzt0-2bxmGB3yDKVwcuPQMiIA').strip()
    FIVESIM_JWT_TOKEN = os.getenv('FIVESIM_API_KEY', os.getenv('FIVESIM_JWT_TOKEN', '')).strip()
    GRIZZLY_API_KEY = os.getenv('GRIZZLY_API_KEY', '').strip()
    HERO_API_KEY = os.getenv('HERO_SMS_API_KEY', '').strip()
    TG_READY_API_KEY = os.getenv('TG_READY_API_KEY', '').strip()
    TG_READY_BASE_URL = os.getenv('TG_READY_BASE_URL', 'https://api.tg-ready.net/v1').strip()
    RENDER_EXTERNAL_URL = os.getenv('RENDER_EXTERNAL_URL', '').strip()
    ADMIN_ID = str(os.getenv('ADMIN_ID', '0')).strip()
    SUPPORT_USERNAME = os.getenv('SUPPORT_USERNAME', '').strip()
    CURRENCY = "$"
    PROFIT_MARGIN = 0.30
    RUB_PER_USD = 30.0
    MAIN_CHANNEL_URL = os.getenv('MAIN_CHANNEL_URL', '').strip()
    INSTRUCTIONS_CHANNEL_URL = os.getenv('INSTRUCTIONS_CHANNEL_URL', '').strip()
    ACTIVATION_CHANNEL_ID = os.getenv("ACTIVATION_CHANNEL_ID", "").strip()

import catalog

PAGE_SIZE = 12

# ----------------- بيانات الدفع المعتمدة -----------------
PAYMENT_INFO = {
    "jeeb": {
        "name": "ياسين علي اليمني",
        "acc": "3093092",
        "desc": "محفظة جيب (Jeeb)"
    },
    "kuraimi": {
        "name": "ياسين محمد احمد اليمني",
        "acc": "3068499525",
        "desc": "بنك الكريمي (حساب مميز)"
    },
    "binance": {
        "name": "Yassin AL yemeni",
        "acc": "979688758",
        "desc": "بينانس (Binance Pay ID)"
    }
}


# Runtime configuration is intentionally read from config.py / environment only.
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN غير مضبوط. أضفه في Environment Variables.")

print("🚀 YasNum: initializing production bot...")


# ----------------- جلسة اتصال سريعة -----------------
session = requests.Session()
retries = Retry(total=3, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retries, pool_connections=50, pool_maxsize=100)
session.mount("https://", adapter)
session.mount("http://", adapter)

# ----------------- قاعدة البيانات (SQLite WAL) -----------------
DB_PATH = os.path.join(current_dir, "yasnum.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                balance REAL DEFAULT 0.0,
                rub_balance REAL DEFAULT 0.0,
                orders_count INTEGER DEFAULT 0,
                is_banned INTEGER DEFAULT 0,
                joined_at TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS smm_orders (
                order_id TEXT PRIMARY KEY,
                secret_id TEXT,
                user_id TEXT,
                service_id TEXT,
                service_title TEXT,
                target_link TEXT,
                quantity INTEGER,
                completed INTEGER DEFAULT 0,
                remains INTEGER,
                cost_usd REAL,
                status TEXT DEFAULT 'في الانتظار',
                created_at TEXT,
                last_updated TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vouchers (
                code TEXT PRIMARY KEY,
                creator_id TEXT,
                amount_usd REAL,
                amount_rub REAL,
                created_at TEXT,
                redeemed_by TEXT DEFAULT NULL,
                redeemed_at TEXT DEFAULT NULL,
                status TEXT DEFAULT 'active'
            )
        ''')
        conn.commit()
        conn.close()
        print("✅ High-Speed Database initialized successfully with Vouchers support.")
    except Exception as e:
        print(f"Init DB Error: {e}")

init_db()

def create_voucher_record(creator_id, amount_usd, amount_rub=None):
    try:
        if amount_rub is None:
            amount_rub = amount_usd * RUB_PER_USD
        code = f"VCH-{random.randint(1000, 9999)}-{random.randint(100, 999)}"
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO vouchers (code, creator_id, amount_usd, amount_rub, created_at, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        ''', (code, str(creator_id), float(amount_usd), float(amount_rub), now_str))
        conn.commit()
        conn.close()
        return code
    except Exception as e:
        print(f"Create Voucher Error: {e}")
        return None

def redeem_voucher_record(user_id, code):
    try:
        clean_code = code.strip().upper()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT creator_id, amount_usd, amount_rub, status FROM vouchers WHERE UPPER(code) = ?', (clean_code,))
        row = cursor.fetchone()
        if not row:
            # Try with prefix VCH-
            cursor.execute('SELECT creator_id, amount_usd, amount_rub, status FROM vouchers WHERE UPPER(code) = ?', (f"VCH-{clean_code}",))
            row = cursor.fetchone()
            if not row:
                conn.close()
                return False, "❌ كود القسيمة غير صحيح أو غير موجود في النظام."
        
        creator_id, amount_usd, amount_rub, status = row
        if status != 'active':
            conn.close()
            return False, "⚠️ تم شحن واستخدام هذه القسيمة مسبقاً!"
            
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute('UPDATE vouchers SET status = "redeemed", redeemed_by = ?, redeemed_at = ? WHERE UPPER(code) = ?', (str(user_id), now_str, clean_code))
        conn.commit()
        conn.close()
        
        # شحن رصيد المستخدم
        update_user_balance(user_id, amount_usd, amount_rub)
        return True, (amount_usd, amount_rub, creator_id)
    except Exception as e:
        print(f"Redeem Voucher Error: {e}")
        return False, f"❌ حدث خطأ أثناء شحن القسيمة: {e}"

def get_setting(key, default_val=""):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM bot_settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else default_val
    except Exception:
        return default_val

def set_setting(key, value):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)', (key, str(value)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Set setting error: {e}")

def get_smm_margin():
    try:
        return float(get_setting("smm_margin", str(PROFIT_MARGIN)))
    except Exception:
        return 0.30

def get_num_margin():
    try:
        return float(get_setting("number_margin", str(PROFIT_MARGIN)))
    except Exception:
        return 0.30

def is_maintenance_mode():
    return get_setting("maintenance_mode", "0") == "1"

def get_forced_channel():
    return get_setting("forced_channel", "")

def get_payment_account(method_key, default_acc=""):
    return get_setting(f"pay_acc_{method_key}", default_acc)

def get_or_create_user(user_id, username="", first_name=""):
    try:
        uname = str(username) if username else ""
        fname = str(first_name) if first_name else "صديقنا"
        uid_str = str(user_id)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT balance, rub_balance, orders_count, is_banned, first_name, username FROM users WHERE user_id = ?', (uid_str,))
        row = cursor.fetchone()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        
        if row:
            cursor.execute('UPDATE users SET username = ?, first_name = ? WHERE user_id = ?', (uname, fname, uid_str))
            conn.commit()
            conn.close()
            return float(row[0]), float(row[1]), int(row[2]), int(row[3]), str(row[4]), str(row[5])
        else:
            init_bal = 100.0 if uid_str == str(ADMIN_ID) else 0.0
            init_rub = init_bal * RUB_PER_USD
            cursor.execute(
                'INSERT INTO users (user_id, username, first_name, balance, rub_balance, orders_count, is_banned, joined_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?)',
                (uid_str, uname, fname, init_bal, init_rub, now_str)
            )
            conn.commit()
            conn.close()
            return init_bal, init_rub, 0, 0, fname, uname
    except Exception as e:
        print(f"DB Error: {e}")
        return 0.0, 0.0, 0, 0, "صديقنا", ""

def update_user_balance(user_id, amount_usd, amount_rub=None):
    try:
        if amount_rub is None:
            amount_rub = amount_usd * RUB_PER_USD
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE users SET balance = balance + ?, rub_balance = rub_balance + ? WHERE user_id = ?',
            (amount_usd, amount_rub, str(user_id))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Update Bal Error: {e}")

def create_smm_order_record(order_id, secret_id, user_id, service_id, service_title, target_link, quantity, cost_usd):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute('''
            INSERT INTO smm_orders (order_id, secret_id, user_id, service_id, service_title, target_link, quantity, completed, remains, cost_usd, status, created_at, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'في الانتظار', ?, ?)
        ''', (str(order_id), str(secret_id), str(user_id), str(service_id), str(service_title), str(target_link), int(quantity), int(quantity), float(cost_usd), now_str, now_str))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Save SMM Order Error: {e}")

def get_smm_order(order_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT order_id, secret_id, user_id, service_id, service_title, target_link, quantity, completed, remains, cost_usd, status, created_at FROM smm_orders WHERE order_id = ?', (str(order_id),))
        row = cursor.fetchone()
        conn.close()
        return row
    except Exception as e:
        print(f"Get SMM Order Error: {e}")
        return None

def update_smm_order_progress(order_id, new_completed, new_remains, new_status):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute('''
            UPDATE smm_orders 
            SET completed = ?, remains = ?, status = ?, last_updated = ?
            WHERE order_id = ?
        ''', (int(new_completed), int(new_remains), str(new_status), now_str, str(order_id)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Update SMM Progress Error: {e}")

def set_user_ban_status(user_id, ban_status):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET is_banned = ? WHERE user_id = ?', (1 if ban_status else 0, str(user_id)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Ban Error: {e}")

def get_all_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT user_id, username, first_name, balance, is_banned, joined_at FROM users ORDER BY rowid DESC')
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        print(f"Get All Users Error: {e}")
        return []

def get_single_user_info(query):
    try:
        clean_q = query.strip().replace("@", "")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT user_id, username, first_name, balance, rub_balance, orders_count, is_banned, joined_at FROM users WHERE user_id = ? OR username = ?', (clean_q, clean_q))
        row = cursor.fetchone()
        conn.close()
        return row
    except Exception as e:
        print(f"Find User Error: {e}")
        return None

# ----------------- خادم ويب خفيف للبقاء نشطاً 24/7 -----------------
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(b"Number SMS Store + King SMM System Engine Live 24/7!")

    def do_HEAD(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain; charset=utf-8')
        self.end_headers()

    def log_message(self, format, *args):
        return

def start_health_server():
    preferred_port = int(os.environ.get("BOT_HEALTH_PORT", 0))
    if preferred_port == 0:
        env_p = int(os.environ.get("PORT", 10000))
        preferred_port = env_p if env_p != 3000 else 10000
    
    ports_to_try = [preferred_port, 10000, 8080, 8000, 5000, 9000]
    server = None
    actual_port = preferred_port
    for p in ports_to_try:
        try:
            server = HTTPServer(("0.0.0.0", p), HealthCheckHandler)
            actual_port = p
            print(f"✅ Health Check & Uptime Web Server running on port {p}")
            break
        except OSError:
            continue

    def auto_keep_alive():
        time.sleep(15)
        while True:
            try:
                requests.get(f"http://127.0.0.1:{actual_port}/", timeout=5)
            except Exception:
                pass
            # منع خمول ريندر 24/24 عبر الـ External URL إن وجد
            ext_url = RENDER_EXTERNAL_URL or os.getenv("RENDER_EXTERNAL_URL", "")
            if ext_url and ext_url.strip().startswith("http"):
                try:
                    requests.get(ext_url.strip(), timeout=8)
                except Exception:
                    pass
            time.sleep(180)

    threading.Thread(target=auto_keep_alive, daemon=True).start()

    if server:
        server.serve_forever()

web_thread = threading.Thread(target=start_health_server, daemon=True)
web_thread.start()

# ----------------- تهيئة كائن البوت -----------------
bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=32)
user_states = {}
user_click_lock = {}

def safe_send_message(chat_id, text, reply_markup=None, parse_mode="Markdown"):
    try:
        return bot.send_message(chat_id, text, reply_markup=reply_markup, parse_mode=parse_mode)
    except Exception:
        try:
            return bot.send_message(chat_id, text, reply_markup=reply_markup, parse_mode=None)
        except Exception as e:
            print(f"safe_send_message error: {e}")
            return None

def safe_edit_message_text(chat_id, message_id, text, reply_markup=None, parse_mode="Markdown"):
    try:
        return bot.edit_message_text(chat_id=chat_id, message_id=message_id, text=text, reply_markup=reply_markup, parse_mode=parse_mode)
    except Exception:
        try:
            return bot.edit_message_text(chat_id=chat_id, message_id=message_id, text=text, reply_markup=reply_markup, parse_mode=None)
        except Exception as e:
            print(f"safe_edit_message_text error: {e}")
            return None

def safe_reply_to(message, text, reply_markup=None, parse_mode="Markdown"):
    try:
        return bot.reply_to(message, text, reply_markup=reply_markup, parse_mode=parse_mode)
    except Exception:
        try:
            return bot.reply_to(message, text, reply_markup=reply_markup, parse_mode=None)
        except Exception as e:
            print(f"safe_reply_to error: {e}")
            return None

def send_activation_log(user_id, country_title, service_name, phone, code, price_str, order_id):
    try:
        channel_target = ACTIVATION_CHANNEL_ID or os.getenv("ACTIVATION_CHANNEL_ID", "").strip()
        if not channel_target:
            return
            
        now_time = datetime.datetime.now().strftime("%H:%M | %Y-%m-%d")
        masked_phone = phone[:-4] + "****" if len(phone) > 6 else phone
            
        log_text = (
            f"🟢 **عملية تفعيل جديدة ناجحة!**\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🌍 • **الدولة :** {country_title}\n"
            f"🛍️ • **التطبيق :** {service_name}\n"
            f"☎️ • **الرقم :** `+{masked_phone}`\n"
            f"🔑 • **كود التفعيل :** `{code}`\n"
            f"💰 • **السعر :** {price_str}\n"
            f"🔔 • **رقم الطلب :** `{order_id}`\n"
            f"👤 • **المستخدم :** `{user_id}`\n"
            f"⏰ • **الوقت :** `{now_time}`\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🤖 • بواسطة : **Number SMS Bot**"
        )
        bot.send_message(channel_target, log_text)
    except Exception as e:
        print(f"Activation log notice: {e}")

# ----------------- دوال وواجهات المزودين (مع هامش ربح 30%) -----------------
GRIZZLY_ENDPOINTS = ["https://api.grizzlysms.com/stubs/handler_api.php"]
HERO_ENDPOINTS = ["https://hero-sms.com/stubs/handler_api.php"]
HERO_REST_BASE = "https://hero-sms.com/api/v1"

def get_fivesim_key():
    k = get_setting("fivesim_token", FIVESIM_JWT_TOKEN).strip()
    if not k or len(k) < 20:
        k = "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTk4MTcyOTksImlhdCI6MTc4ODI4MTI5OSwicmF5IjoiYmJlMjZmZGFkZGMzM2FiMzFlNDBhM2JmYjNmMTJkMDciLCJzdWIiOjQ0NzgxNTN9.QBAYyUjtp1JdDHdTu50ErRkFP2_BCfvK3O6Htnd6lQkRnD_WEtIPAzvObmpPrINpkx8UUB3h6OT3-rWUGGITU38ZQ5HgOXK6CCRPNuPFMasrHeFFnX9CSOoqa4Lz86NsxF4w3dcBLurR60D-S6cI4Jsk-dPQwXU8OgOamwe37NdM4D2QB5blx9VJgbHVg9jIoeVXMiNaeKdZYHFSHSL8wULCS9ug6EnwzlIDgyreFmFghzLPh20FCysZR0r7I_jcElmmUZAwU8uc94bNxOZ4udBKIZ08JgU1crusM-PWaBsH1TnEYsXKrQlQGQg0LD-pBW97X1iXeAPmWRR0PboNzQ"
    return k

def fivesim_headers():
    return {
        "Authorization": f"Bearer {get_fivesim_key()}",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

def fivesim_get_balance():
    try:
        url = "https://5sim.net/v1/user/profile"
        res = session.get(url, headers=fivesim_headers(), timeout=8)
        if res.status_code == 200:
            data = res.json()
            return True, f"{data.get('balance', '0.00')} ₽ (المستخدم: {data.get('email', '5sim')})"
        elif res.status_code == 401:
            return False, "رمز التوكن الخاص بـ 5SIM غير مصرح به (Unauthorized). تأكد من إدخال التوكن الصحيح."
        return False, f"HTTP {res.status_code}: {res.text[:120]}"
    except Exception as e:
        return False, str(e)

def fivesim_buy_number(country_name, service_name):
    try:
        url = f"https://5sim.net/v1/user/buy/activation/{country_name}/any/{service_name}"
        res = session.get(url, headers=fivesim_headers(), timeout=10)
        text_resp = res.text.strip()
        
        # فحص نصوص الردود المباشرة من 5SIM قبل محاولة فك الـ JSON
        lower_resp = text_resp.lower()
        if "no free phones" in lower_resp:
            return False, "الأرقام لهذه الدولة غير متوفرة حالياً في 5SIM (نفذت الكمية المؤقتة)."
        elif "not enough user balance" in lower_resp or "no balance" in lower_resp:
            return False, "رصيد السيرفر غير كافٍ لدى مزود 5SIM."
        elif "not enough rating" in lower_resp:
            return False, "تقييم الحساب لدى المزود لا يسمح بحجز هذا الرقم حالياً."
        elif "bad service" in lower_resp:
            return False, "الخدمة المطلوبة غير مدعومة لهذه الدولة في 5SIM."
        elif "bad country" in lower_resp:
            return False, "الدولة المحددة غير مدعومة في 5SIM."
            
        try:
            data = res.json()
        except Exception:
            if "no free phones" in lower_resp:
                return False, "الأرقام لهذه الدولة غير متوفرة حالياً في 5SIM (نفذت الكمية المؤقتة)."
            return False, f"تنبيه المزود (5SIM): {text_resp[:120] if text_resp else 'لا توجد استجابة صالحة'}"
            
        if isinstance(data, dict) and "id" in data and "phone" in data:
            return True, {
                "id": str(data.get("id")),
                "phone": str(data.get("phone")).replace("+", ""),
                "price": float(data.get("price", 15.0)),
                "provider": "fivesim"
            }
        elif isinstance(data, str):
            if "no free phones" in data.lower():
                return False, "الأرقام لهذه الدولة غير متوفرة حالياً في 5SIM (نفذت الكمية المؤقتة)."
            return False, f"رد 5SIM: {data}"
            
        return False, f"تعذر حجز الرقم من 5SIM: {text_resp[:120]}"
    except Exception as e:
        return False, f"خطأ اتصال بـ 5SIM: {str(e)}"

def fivesim_check_order(order_id):
    try:
        url = f"https://5sim.net/v1/user/check/{order_id}"
        res = session.get(url, headers=fivesim_headers(), timeout=7)
        if res.status_code == 200:
            data = res.json()
            sms_list = data.get("sms", [])
            if sms_list and len(sms_list) > 0:
                code = sms_list[0].get("code", "")
                if code:
                    return f"STATUS_OK:{code}"
            status = data.get("status")
            if status == "CANCELED":
                return "STATUS_CANCEL"
            elif status == "FINISHED":
                return "STATUS_OK:FINISHED"
            return "STATUS_WAIT_CODE"
    except Exception:
        pass
    return "STATUS_WAIT_CODE"

def fivesim_finish_order(order_id):
    try:
        session.get(f"https://5sim.net/v1/user/finish/{order_id}", headers=fivesim_headers(), timeout=5)
    except Exception:
        pass

def fivesim_cancel_order(order_id):
    try:
        session.get(f"https://5sim.net/v1/user/cancel/{order_id}", headers=fivesim_headers(), timeout=5)
    except Exception:
        pass

def get_grizzly_key():
    k = get_setting("grizzly_api_key", GRIZZLY_API_KEY).strip()
    if not k or len(k) < 5:
        k = "15a9f459b5a5e02cc330ae0d66399e2b"
    return k

def grizzly_request(params):
    k = get_grizzly_key()
    params['api_key'] = k
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    for endpoint in GRIZZLY_ENDPOINTS:
        try:
            res = session.get(endpoint, params=params, headers=headers, timeout=8)
            if res.status_code == 200 and res.text.strip():
                return res.text.strip()
        except Exception:
            continue
    return "ERROR_CONNECTION"

def get_hero_key():
    k = get_setting("hero_sms_api_key", HERO_API_KEY).strip()
    if not k or len(k) < 5:
        k = "Ae428b3ce2154919dbe5db9d55c7c296"
    return k

def hero_request(params):
    k = get_hero_key()
    p = dict(params)
    p['api_key'] = k
    if 'currency' not in p:
        p['currency'] = 'USD'
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*"
    }
    for endpoint in HERO_ENDPOINTS:
        try:
            res = session.get(endpoint, params=p, headers=headers, timeout=8)
            if res.status_code == 200 and res.text.strip():
                return res.text.strip()
            elif res.status_code in [401, 403]:
                err_body = res.text.strip()
                if "ACCESS_BALANCE" in err_body:
                    return err_body
                return err_body if err_body else "PERMISSION_DENIED"
        except Exception:
            continue
    return "ERROR_CONNECTION"

def hero_rest_request(endpoint, method="GET", payload=None):
    k = get_hero_key()
    headers = {
        "Authorization": f"ApiKey {k}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    url = f"{HERO_REST_BASE}{endpoint}"
    try:
        if method == "POST":
            return session.post(url, json=payload, headers=headers, timeout=10)
        elif method == "DELETE":
            return session.delete(url, headers=headers, timeout=10)
        else:
            return session.get(url, headers=headers, timeout=10)
    except Exception as e:
        print(f"Hero REST error: {e}")
        return None

def hero_get_balance():
    try:
        res = hero_request({'action': 'getBalance', 'currency': 'USD'})
        if res.startswith("ACCESS_BALANCE:"):
            bal_val = res.split(":")[1]
            return True, f"{bal_val} $"
        elif "BAD_KEY" in res or "ERROR_KEY" in res:
            return False, "مفتاح API غير صالح أو غير موجود في المزود."
        elif "Permission denied" in res or "FORBIDDEN" in res or "PERMISSION_DENIED" in res:
            return True, "0.00 $ (الحساب متصل - الرصيد صفر)"
        return False, f"استجابة المزود: {res[:100]}"
    except Exception as e:
        return False, str(e)

def get_tg_ready_key():
    return get_setting("tg_ready_api_key", TG_READY_API_KEY).strip() or "MDSnlzb8haw9fc51km"

def get_tg_ready_url():
    return get_setting("tg_ready_base_url", TG_READY_BASE_URL).strip() or "https://TG-Lion.net"

def tg_lion_request(action, extra_params=None):
    url = get_tg_ready_url()
    key = get_tg_ready_key()
    if not key:
        return None
    params = {
        'action': action,
        'apiKey': key,
        'YourID': str(ADMIN_ID or "8097770003")
    }
    if extra_params:
        params.update(extra_params)
    try:
        res = session.get(url, params=params, timeout=3.5)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"TG-Lion Request Error ({action}): {e}")
    return None

def test_tg_ready_connection():
    key = get_tg_ready_key()
    if not key:
        return "⚠️ مفتاح موقع TG غير مدخل بعد. قسم الحسابات الجاهزة يعمل بالوضع الاحتياطي الفوري."
    try:
        data = tg_lion_request("get_balance")
        if data and data.get("status") == "ok":
            bal = data.get("balance", "0 USD")
            return f"✅ متصل بموقع TG بنجاح! رصيد حسابك في الموقع: {bal}"
        return f"⚠️ استجابة موقع TG: {data}"
    except Exception as e:
        return f"ℹ️ خطأ فحص اتصال TG: {str(e)[:80]}"

def get_country_info_dynamic(c_id):
    c_id_str = str(c_id).strip()
    if c_id_str in catalog.COUNTRIES:
        return catalog.COUNTRIES[c_id_str]
    clean = c_id_str.lower().replace(" ", "").replace("_", "").replace("-", "")
    if clean in catalog.GLOBAL_COUNTRY_TRANSLATIONS:
        tr = catalog.GLOBAL_COUNTRY_TRANSLATIONS[clean]
        return {
            "name": clean,
            "title": tr["title"],
            "flag": tr["flag"],
            "prefix": tr.get("prefix", ""),
            "default_rub": 25.0
        }
    for k, tr in catalog.GLOBAL_COUNTRY_TRANSLATIONS.items():
        if str(tr.get("id")) == c_id_str or k.lower().replace(" ", "").replace("_", "").replace("-", "") == clean:
            return {
                "name": k,
                "title": tr["title"],
                "flag": tr["flag"],
                "prefix": tr.get("prefix", ""),
                "default_rub": 25.0
            }
    return {
        "name": c_id_str,
        "title": c_id_str.capitalize(),
        "flag": "🌐",
        "prefix": "",
        "default_rub": 25.0
    }

# كاش جلب قائمة الدول اللحظية من المزودين
live_countries_cache = {}

def get_live_countries_for_server(provider_name, app_code):
    cache_key = f"{provider_name}_{app_code}"
    now_ts = time.time()
    
    if cache_key in live_countries_cache and now_ts - live_countries_cache[cache_key]["time"] < 120:
        return live_countries_cache[cache_key]["data"]
        
    num_margin = get_num_margin()
    app_info = catalog.SERVICES.get(app_code, catalog.SERVICES.get("wa", {}))
    fivesim_code = app_info.get("fivesim_code", "other")
    srv_code = app_info.get("code", "wa")
    
    live_list = []
    
    try:
        if provider_name == "fivesim":
            url = f"https://5sim.net/v1/guest/prices?product={fivesim_code}"
            res = session.get(url, timeout=6)
            if res.status_code == 200:
                data = res.json()
                prod_data = data.get(fivesim_code, {})
                if not prod_data and data:
                    first_val = list(data.values())[0]
                    if isinstance(first_val, dict):
                        prod_data = first_val
                
                for c_name, ops in prod_data.items():
                    if not isinstance(ops, dict):
                        continue
                    costs = []
                    total_count = 0
                    for op_name, op_info in ops.items():
                        if isinstance(op_info, dict):
                            c_val = op_info.get("cost")
                            cnt = op_info.get("count", 0)
                            if c_val is not None:
                                costs.append(float(c_val))
                                total_count += int(cnt)
                    
                    if not costs:
                        continue
                    
                    cheapest = min(costs)
                    if cheapest <= 5.0:
                        final_usd = round(cheapest * (1.0 + num_margin), 2)
                        final_rub = round(final_usd * RUB_PER_USD, 1)
                    else:
                        final_rub = round(cheapest * (1.0 + num_margin), 1)
                        final_usd = round(final_rub / RUB_PER_USD, 2)
                    
                    c_clean = c_name.lower().replace(" ", "").replace("_", "").replace("-", "")
                    trans = catalog.GLOBAL_COUNTRY_TRANSLATIONS.get(c_clean)
                    if trans:
                        c_id = trans.get("id", c_clean)
                        title = trans["title"]
                        flag = trans["flag"]
                        prefix = trans.get("prefix", "")
                    else:
                        found = None
                        for cid, cinfo in catalog.COUNTRIES.items():
                            if cinfo["name"].lower().replace(" ", "").replace("_", "").replace("-", "") == c_clean:
                                found = (cid, cinfo)
                                break
                        if found:
                            c_id = found[0]
                            title = found[1]["title"]
                            flag = found[1]["flag"]
                            prefix = found[1].get("prefix", "")
                        else:
                            c_id = c_clean
                            title = c_name.capitalize()
                            flag = "🌐"
                            prefix = ""
                            
                    live_list.append({
                        "id": str(c_id),
                        "name": c_name,
                        "title": title,
                        "flag": flag,
                        "prefix": prefix,
                        "price_rub": final_rub,
                        "price_usd": final_usd,
                        "count": total_count,
                        "provider": "fivesim"
                    })
                    
        elif provider_name in ["grizzly", "hero"]:
            if provider_name == "grizzly":
                resp = grizzly_request({'action': 'getPrices', 'service': srv_code})
            else:
                resp = hero_request({'action': 'getPrices', 'service': srv_code})
                
            data = json.loads(resp)
            if isinstance(data, dict):
                for cid_str, srv_map in data.items():
                    if not isinstance(srv_map, dict) or srv_code not in srv_map:
                        continue
                    p_info = srv_map[srv_code]
                    if not isinstance(p_info, dict):
                        continue
                    
                    raw_cost = 0.0
                    count_val = 0
                    if "cost" in p_info:
                        raw_cost = float(p_info.get("cost", 0))
                        count_val = int(p_info.get("count", 0))
                    elif p_info:
                        try:
                            k = list(p_info.keys())[0]
                            v = list(p_info.values())[0]
                            raw_cost = float(k)
                            count_val = int(v)
                        except Exception:
                            pass
                            
                    if raw_cost <= 0:
                        continue
                        
                    if raw_cost <= 5.0:
                        final_usd = round(raw_cost * (1.0 + num_margin), 2)
                        final_rub = round(final_usd * RUB_PER_USD, 1)
                    else:
                        final_rub = round(raw_cost * (1.0 + num_margin), 1)
                        final_usd = round(final_rub / RUB_PER_USD, 2)
                    
                    c_info = catalog.COUNTRIES.get(str(cid_str))
                    if c_info:
                        title = c_info["title"]
                        flag = c_info["flag"]
                        c_name = c_info["name"]
                        prefix = c_info.get("prefix", "")
                    else:
                        found_tr = None
                        for k, v in catalog.GLOBAL_COUNTRY_TRANSLATIONS.items():
                            if str(v.get("id")) == str(cid_str):
                                found_tr = (k, v)
                                break
                        if found_tr:
                            title = found_tr[1]["title"]
                            flag = found_tr[1]["flag"]
                            c_name = found_tr[0]
                            prefix = found_tr[1].get("prefix", "")
                        else:
                            title = f"دولة ({cid_str})"
                            flag = "🌐"
                            c_name = f"country_{cid_str}"
                            prefix = ""
                        
                    live_list.append({
                        "id": str(cid_str),
                        "name": c_name,
                        "title": title,
                        "flag": flag,
                        "prefix": prefix,
                        "price_rub": final_rub,
                        "price_usd": final_usd,
                        "count": count_val,
                        "provider": provider_name
                    })
    except Exception as e:
        print(f"Error fetching live countries for {provider_name}: {e}")

    if live_list:
        # ترتيب الدول: المتوفر بها مخزون أولاً ثم الأرخص سعراً
        live_list.sort(key=lambda x: (0 if x['count'] > 0 else 1, x['price_usd']))
        live_countries_cache[cache_key] = {"data": live_list, "time": now_ts}
        return live_list

    # في حالة الطوارئ نعود للقائمة الكاملة
    fallback_list = []
    for cid, cinfo in catalog.COUNTRIES.items():
        raw_rub = cinfo.get("default_rub", 20.0)
        final_rub = round(raw_rub * (1.0 + num_margin), 1)
        final_usd = round(final_rub / RUB_PER_USD, 2)
        fallback_list.append({
            "id": str(cid),
            "name": cinfo["name"],
            "title": cinfo["title"],
            "flag": cinfo["flag"],
            "prefix": cinfo.get("prefix", ""),
            "price_rub": final_rub,
            "price_usd": final_usd,
            "count": 50,
            "provider": provider_name
        })
    return fallback_list

# دالة جلب السعر الفعلي اللحظي من المزود مع إضافة هامش الربح
price_cache = {}

def get_server_price(provider_name, service_code, fivesim_code, country_id, country_name):
    cache_key = f"{provider_name}_{service_code}_{country_id}"
    now_ts = time.time()
    
    if cache_key in price_cache and now_ts - price_cache[cache_key]["time"] < 60:
        return price_cache[cache_key]["rub"], price_cache[cache_key]["usd"]
        
    num_margin = get_num_margin()
    try:
        if provider_name == "fivesim":
            url = f"https://5sim.net/v1/guest/prices?country={country_name}&product={fivesim_code}"
            res = session.get(url, timeout=6)
            if res.status_code == 200:
                data = res.json()
                if country_name in data and fivesim_code in data[country_name]:
                    operators = data[country_name][fivesim_code]
                    cheapest = min([op.get("cost", 20.0) for op in operators.values() if isinstance(op, dict) and "cost" in op] or [20.0])
                    if cheapest <= 5.0:
                        final_usd = round(cheapest * (1.0 + num_margin), 2)
                        final_rub = round(final_usd * RUB_PER_USD, 1)
                    else:
                        final_rub = round(cheapest * (1.0 + num_margin), 1)
                        final_usd = round(final_rub / RUB_PER_USD, 2)
                    price_cache[cache_key] = {"rub": final_rub, "usd": final_usd, "time": now_ts}
                    return final_rub, final_usd
        else:
            if provider_name == "grizzly":
                resp = grizzly_request({'action': 'getPrices', 'service': service_code, 'country': str(country_id)})
            else:
                resp = hero_request({'action': 'getPrices', 'service': service_code, 'country': str(country_id)})
                
            data = json.loads(resp)
            if str(country_id) in data and service_code in data[str(country_id)]:
                srv_data = data[str(country_id)][service_code]
                raw_cost = 0.0
                if isinstance(srv_data, dict):
                    if "cost" in srv_data:
                        raw_cost = float(srv_data["cost"])
                    elif srv_data:
                        try:
                            raw_cost = float(list(srv_data.keys())[0])
                        except Exception:
                            raw_cost = 20.0
                if raw_cost > 0:
                    if raw_cost <= 5.0:
                        final_usd = round(raw_cost * (1.0 + num_margin), 2)
                        final_rub = round(final_usd * RUB_PER_USD, 1)
                    else:
                        final_rub = round(raw_cost * (1.0 + num_margin), 1)
                        final_usd = round(final_rub / RUB_PER_USD, 2)
                    price_cache[cache_key] = {"rub": final_rub, "usd": final_usd, "time": now_ts}
                    return final_rub, final_usd
    except Exception:
        pass
        
    c_info = get_country_info_dynamic(country_id)
    raw_rub = c_info.get("default_rub", 20.0)
    final_rub = round(raw_rub * (1.0 + num_margin), 1)
    final_usd = round(final_rub / RUB_PER_USD, 2)
    return final_rub, final_usd

# موقع TG - جلب الكتالوج الديناميكي المباشر من TG-Lion
tg_catalog_cache = {}

# قائمة أولوية ترتيب الدول الأكثر طلباً
PRIORITY_COUNTRY_CODES = [
    "ye", "sa", "eg", "ae", "iq", "us", "ru", "bd", "uz", "dz", 
    "sy", "jo", "ma", "tn", "tr", "gb", "de", "br", "co", "vn", 
    "id", "my", "pk", "in", "kz", "tj", "kg", "ua", "om", "kw", 
    "qa", "bh", "lb", "sd", "ly", "ps", "fr", "ca", "es", "it", 
    "nl", "pl", "se", "no", "ng", "gh", "ke", "za", "mx", "ar"
]

def get_live_tg_ready_catalog():
    now_ts = time.time()
    if "data" in tg_catalog_cache and now_ts - tg_catalog_cache.get("time", 0) < 180:
        return tg_catalog_cache["data"]

    num_margin = get_num_margin()
    key = get_tg_ready_key()
    if key:
        try:
            data = tg_lion_request("available_countries")
            if data and data.get("status") == "ok" and "countries" in data and isinstance(data["countries"], dict):
                raw_dict = {}
                for code, c_data in data["countries"].items():
                    if not isinstance(c_data, dict):
                        continue
                    qty = int(c_data.get("qty", 0))
                    raw_price = float(c_data.get("price", 0.8))
                    final_usd = round(raw_price * (1.0 + num_margin), 2)
                    final_rub = round(final_usd * RUB_PER_USD, 1)
                    c_name = c_data.get("name", code)
                    code_num = str(c_data.get("code_Num", ""))
                    
                    # ترجمة الأسماء إلى العربية بواسطة كود الآيزو أو الاسم
                    code_low = code.lower().strip()
                    clean_name = c_name.split()[0].lower().replace(" ", "").replace("_", "")
                    tr_info = catalog.GLOBAL_COUNTRY_TRANSLATIONS.get(code_low) or catalog.GLOBAL_COUNTRY_TRANSLATIONS.get(clean_name)
                    
                    if tr_info:
                        country_display = f"{tr_info['flag']} {tr_info['title']}"
                        search_keywords = f"{tr_info['title']} {c_name} {code} {code_low} {tr_info.get('prefix', '')} {code_num}"
                    else:
                        country_display = c_name
                        search_keywords = f"{c_name} {code} {code_low} {code_num}"
                    
                    acc_key = f"tglion_{code_low}"
                    raw_dict[acc_key] = {
                        "id": acc_key,
                        "code": code_low,
                        "code_num": code_num,
                        "country": country_display,
                        "raw_name": c_name,
                        "search_kw": search_keywords.lower(),
                        "price_usd": final_usd,
                        "price_rub": final_rub,
                        "raw_price": raw_price,
                        "qty": qty,
                        "type": f"متوفر {qty} رقم" if qty > 0 else "غير متوفر حالياً",
                        "desc": f"رقم تيليجرام جاهز مع كود الدخول وكلمة السر الفورية من موقع TG."
                    }
                
                if raw_dict:
                    # ترتيب القائمة بذكاء: الدول ذات الأولوية والكميات المتوفرة أولاً
                    def sort_key(item):
                        c_code = item[1]["code"]
                        qty_val = item[1]["qty"]
                        prio_idx = PRIORITY_COUNTRY_CODES.index(c_code) if c_code in PRIORITY_COUNTRY_CODES else 999
                        has_stock = 0 if qty_val > 0 else 1
                        return (has_stock, prio_idx, -qty_val)
                    
                    sorted_items = sorted(raw_dict.items(), key=sort_key)
                    res_dict = dict(sorted_items)
                    
                    tg_catalog_cache["data"] = res_dict
                    tg_catalog_cache["time"] = now_ts
                    return res_dict
        except Exception as e:
            print(f"Error fetching live TG-Lion catalog: {e}")

    # Fallback to catalog.TG_READY_ACCOUNTS with dynamic margin applied safely
    fallback_dict = {}
    for acc_id, acc_info in catalog.TG_READY_ACCOUNTS.items():
        raw_p = float(acc_info.get("raw_price", acc_info.get("price_usd", 1.0) / 1.30))
        final_usd = round(raw_p * (1.0 + num_margin), 2)
        final_rub = round(final_usd * RUB_PER_USD, 1)
        fallback_dict[acc_id] = {
            "id": acc_id,
            "code": acc_info.get("code", "us"),
            "code_num": acc_info.get("code_num", "1"),
            "country": acc_info.get("country", "أمريكا 🇺🇸"),
            "raw_name": acc_info.get("raw_name", "USA"),
            "search_kw": acc_info.get("search_kw", "").lower(),
            "price_usd": final_usd,
            "price_rub": final_rub,
            "raw_price": raw_p,
            "qty": acc_info.get("qty", 20),
            "type": acc_info.get("type", "Tdata + Session"),
            "desc": acc_info.get("desc", "حساب تيليجرام جاهز للتسليم الفوري من موقع TG.")
        }

    tg_catalog_cache["data"] = fallback_dict
    tg_catalog_cache["time"] = now_ts
    return fallback_dict

def build_tg_ready_page_keyboard(page=0, query=""):
    markup = types.InlineKeyboardMarkup(row_width=1)
    acc_map = get_live_tg_ready_catalog()
    
    items = list(acc_map.items())
    if query:
        q = query.lower().strip()
        items = [
            it for it in items 
            if q in it[1].get("country", "").lower() 
            or q in it[1].get("raw_name", "").lower() 
            or q in it[1].get("search_kw", "") 
            or q in it[1].get("desc", "").lower() 
            or q in it[1].get("code", "").lower()
            or q in str(it[1].get("code_num", ""))
        ]
        
    total_items = len(items)
    page_size = 9
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    page = max(0, min(page, total_pages - 1))
    
    start_idx = page * page_size
    end_idx = min(start_idx + page_size, total_items)
    batch = items[start_idx:end_idx]
    
    # زر البحث السريع في الأعلى
    if not query:
        markup.add(types.InlineKeyboardButton("🔍 🚀 بحث عن أي دولة (بالاسم أو الكود)", callback_data="prompt_search_tg_ready"))
    
    for acc_id, acc_info in batch:
        qty = acc_info.get("qty", 15)
        stock_str = f"({qty} متاح)" if qty > 0 else "(نفذ)"
        price_val = acc_info.get("price_usd", 1.0)
        c_title = acc_info.get("country", "دولة")
        lbl = f"{c_title} • {price_val:.2f}$ {stock_str}"
        markup.add(types.InlineKeyboardButton(lbl, callback_data=f"tg_acc_buy_{acc_id}"))
        
    # أزرار التنقل الذكية بين الصفحات
    nav_row_1 = []
    if page > 0:
        if page > 1:
            nav_row_1.append(types.InlineKeyboardButton("⏮️ الأولى", callback_data="page_tg_ready_0"))
        nav_row_1.append(types.InlineKeyboardButton("➡️ السابق", callback_data=f"page_tg_ready_{page-1}"))
        
    nav_row_1.append(types.InlineKeyboardButton(f"📄 {page+1} / {total_pages} ({total_items} دولة)", callback_data="noop"))
    
    if page < total_pages - 1:
        nav_row_1.append(types.InlineKeyboardButton("التالي ⬅️", callback_data=f"page_tg_ready_{page+1}"))
        if page < total_pages - 2:
            nav_row_1.append(types.InlineKeyboardButton("⏭️ الأخيرة", callback_data=f"page_tg_ready_{total_pages-1}"))
        
    if nav_row_1:
        markup.row(*nav_row_1)
        
    if query:
        markup.add(types.InlineKeyboardButton("🔄 عرض كل الدول (إلغاء البحث)", callback_data="btn_ready_tg"))
    else:
        markup.add(types.InlineKeyboardButton("🔄 تحديث قائمة المخزون الحي ⚡", callback_data="btn_ready_tg"))
        
    markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
    return markup, total_items

# دالة شراء الرقم
def buy_server_number(provider_name, app_info, c_info, country_id):
    expected_prefix = c_info.get("prefix", "")
    
    if provider_name == "fivesim":
        success, res = fivesim_buy_number(c_info["name"], app_info.get("fivesim_code", "other"))
        if success:
            phone = res["phone"]
            if expected_prefix and not phone.startswith(expected_prefix):
                fivesim_cancel_order(res["id"])
                return False, "تنبيه: أرسل المزود رقم بدولة أخرى، تم إلغاؤه لحمايتك. جرب مجدداً."
            return True, res
        return False, res
    else:
        params = {'action': 'getNumber', 'service': app_info['code'], 'country': str(country_id)}
        if provider_name == "grizzly":
            resp = grizzly_request(params)
            srv_label = "Grizzly SMS"
        else:
            resp = hero_request(params)
            srv_label = "Hero SMS"
            
        if resp.startswith("ACCESS_NUMBER:"):
            parts = resp.split(":")
            order_id = parts[1]
            phone = parts[2]
            if expected_prefix and not phone.startswith(expected_prefix):
                if provider_name == "grizzly":
                    grizzly_request({'action': 'setStatus', 'id': order_id, 'status': '8'})
                else:
                    hero_request({'action': 'setStatus', 'id': order_id, 'status': '8'})
                return False, "تنبيه: تم استلام رقم لدولة أخرى، تم إلغاؤه تلقائياً لحمايتك."
            return True, {"id": order_id, "phone": phone, "provider": provider_name}
        elif resp == "NO_NUMBERS":
            return False, f"الأرقام لهذه الدولة غير متوفرة حالياً في سيرفر ({srv_label}) - نفذت الكمية المؤقتة."
        elif resp == "NO_BALANCE":
            return False, f"رصيد السيرفر لدى المزود ({srv_label}) غير كافٍ حالياً (0.00). يرجى استخدام سيرفر 5SIM أو شحن رصيد حساب المزود."
        elif "FORBIDDEN" in resp or "Permission denied" in resp:
            return False, f"سيرفر ({srv_label}) غير مصرح به أو مفتاح الـ API غير مفعل. يمكنك استخدام السيرفر العالمي 5SIM."
        elif "BAD_KEY" in resp or "ERROR_KEY" in resp:
            return False, f"مفتاح الربط بسيرفر ({srv_label}) غير صالح أو تم تغييره."
        elif "WRONG_SERVICE" in resp:
            return False, f"خدمة {app_info.get('short', '')} غير مدعومة لهذه الدولة حالياً في ({srv_label})."
        elif resp == "ERROR_CONNECTION":
            return False, f"تعذر الاتصال بمزود ({srv_label})، الموقع غير مستجيب حالياً. يرجى تجربة سيرفر 5SIM."
        return False, f"رد مزود ({srv_label}): {resp[:120]}"

def set_server_status(provider_name, order_id, status_code):
    if provider_name == "fivesim":
        if status_code in [6, "6"]:
            threading.Thread(target=fivesim_finish_order, args=(order_id,), daemon=True).start()
        elif status_code in [8, "8"]:
            threading.Thread(target=fivesim_cancel_order, args=(order_id,), daemon=True).start()
    else:
        params = {'action': 'setStatus', 'id': order_id, 'status': str(status_code)}
        if provider_name == "grizzly":
            threading.Thread(target=grizzly_request, args=(params,), daemon=True).start()
        else:
            threading.Thread(target=hero_request, args=(params,), daemon=True).start()

active_orders = {}

def monitor_sms_code(chat_id, message_id, order_id, phone_number, app_name, country_title, cost_str, time_now_str, time_exp_str, cost_usd, cost_rub, user_id, provider_name):
    active_orders[order_id] = {
        "user_id": user_id,
        "start_time": time.time(),
        "cost_usd": cost_usd,
        "cost_rub": cost_rub,
        "phone": phone_number,
        "provider": provider_name
    }
    
    max_duration = 1080
    start_time = time.time()
    
    while time.time() - start_time < max_duration:
        time.sleep(4)
        if order_id not in active_orders:
            return
        try:
            if provider_name == "fivesim":
                resp = fivesim_check_order(order_id)
            elif provider_name == "grizzly":
                resp = grizzly_request({'action': 'getStatus', 'id': order_id})
            else:
                resp = hero_request({'action': 'getStatus', 'id': order_id})
                
            if resp.startswith("STATUS_OK:"):
                code = resp.split(":")[1]
                
                success_text = (
                    f"╭━━〔 **NUMBER SMS** 〕━━╮\n"
                    f"💙 **تم استلام كود التفعيل بنجاح!**\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🔔 • رقم الطلب : `{order_id}`\n"
                    f"🌍 • الدولة : **{country_title}**\n"
                    f"☎️ • الرقم : `+{phone_number}`\n"
                    f"🔑 • **الكود المستلم :** `{code}`\n"
                    f"🔎 • الحالة : **COMPLETED ✔️**\n"
                    f"🛍️ • التطبيق : **{app_name}**\n"
                    f"🏷️ • السعر : **{cost_str}**\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"✅ تم تأكيد تفعيل الرقم بنجاح."
                )
                
                fin_markup = types.InlineKeyboardMarkup(row_width=1)
                fin_markup.add(types.InlineKeyboardButton("☎️ شراء رقم آخر", callback_data="btn_buy_number"))
                fin_markup.add(types.InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="back_to_main"))
                
                bot.edit_message_text(chat_id=chat_id, message_id=message_id, text=success_text, reply_markup=fin_markup)
                set_server_status(provider_name, order_id, 6)
                active_orders.pop(order_id, None)
                
                send_activation_log(user_id, country_title, app_name, phone_number, code, cost_str, order_id)
                return
            elif resp == "STATUS_CANCEL":
                bot.send_message(chat_id, f"⚠️ تم إلغاء طلب الرقم `+{phone_number}` واسترجاع الرصيد لمحفظتك.")
                update_user_balance(user_id, cost_usd, cost_rub)
                active_orders.pop(order_id, None)
                return
        except Exception as e:
            print(f"SMS Check Notice: {e}")
            
    if order_id in active_orders:
        set_server_status(provider_name, order_id, 8)
        update_user_balance(user_id, cost_usd, cost_rub)
        active_orders.pop(order_id, None)
        try:
            bot.send_message(
                chat_id,
                f"⌛ **انتهت مهلة الانتظار للرقم `+{phone_number}`.**\n"
                f"🛡️ تم إلغاء الطلب واسترجاع كامل المبلغ ({cost_str}) لمحفظتك تلقائياً."
            )
        except Exception:
            pass

# ----------------- بناء القوائم -----------------

def get_support_url():
    sup = (SUPPORT_USERNAME or "Yy77501").strip().lstrip("@")
    return f"https://t.me/{sup}"

def get_safe_url_button(title, raw_url, fallback_callback):
    if raw_url and isinstance(raw_url, str):
        cleaned = raw_url.strip()
        if cleaned.startswith("http://") or cleaned.startswith("https://"):
            return types.InlineKeyboardButton(title, url=cleaned)
        elif cleaned.startswith("@"):
            return types.InlineKeyboardButton(title, url=f"https://t.me/{cleaned.lstrip('@')}")
        elif cleaned.startswith("t.me/"):
            return types.InlineKeyboardButton(title, url=f"https://{cleaned}")
    return types.InlineKeyboardButton(title, callback_data=fallback_callback)

def build_main_keyboard(user_id):
    markup = types.InlineKeyboardMarkup(row_width=2)
    # الصف 1: شراء الأرقام والتفعيلات بارز
    markup.add(types.InlineKeyboardButton("📱 تفعيل وشراء الأرقام الافتراضية (SMS)", callback_data="btn_buy_number"))
    
    # الصف 2: عروض واتساب وحسابات تيليجرام الجاهزة من موقع TG
    markup.add(
        types.InlineKeyboardButton("💬 عروض واتساب (WhatsApp)", callback_data="btn_offers_wa"),
        types.InlineKeyboardButton("✈️ حسابات TG جاهزة (موقع TG)", callback_data="btn_ready_tg")
    )
    
    # الصف 3: خدمات الرشق والألعاب بنظام الملك
    markup.add(
        types.InlineKeyboardButton("👑 نظام الملك للرشق والمتابعين", callback_data="btn_services_games"),
        types.InlineKeyboardButton("🎮 شحن الألعاب والشدات", callback_data="smm_sec_games")
    )
    
    # الصف 4: الشحن ومركز تحويل الرصيد والقسائم
    markup.add(
        types.InlineKeyboardButton("💳 شحن وإيداع الرصيد", callback_data="btn_deposit"),
        types.InlineKeyboardButton("🔄 مركز تحويل الرصيد والقسائم", callback_data="btn_transfer_hub")
    )
    
    # الصف 5: الحساب الشخصي والإحصائيات
    markup.add(
        types.InlineKeyboardButton("🪪 حسابي والمحفظة", callback_data="btn_my_account"),
        types.InlineKeyboardButton("📊 السيرفرات والإحصائيات", callback_data="btn_stats")
    )
    
    # الصف 6: الرصيد المجاني والشرح
    markup.add(
        types.InlineKeyboardButton("🎁 اربح رصيد مجاناً", callback_data="btn_free_points"),
        types.InlineKeyboardButton("📚 شرح وتعليمات البوت", callback_data="btn_instructions")
    )
    
    # الصف 7: القناة الرسمية والدعم الفني
    btn_ch = get_safe_url_button("📢 القناة الرسمية", MAIN_CHANNEL_URL, "btn_main_channel")
    btn_sup = types.InlineKeyboardButton("🕒 الدعم الفني المباشر", url=get_support_url())
    markup.add(btn_ch, btn_sup)
    
    if str(user_id) == str(ADMIN_ID):
        markup.add(types.InlineKeyboardButton("👑 • لوحة تحكم الإدارة الشاملة (Admin) •", callback_data="btn_admin_panel"))
    return markup

def build_apps_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(types.InlineKeyboardButton("🛍️ WHATSAPP - واتس اب", callback_data="srv_wa"))
    markup.add(types.InlineKeyboardButton("🎲 TELEGRAM - تليجرام", callback_data="srv_tg"))
    markup.add(types.InlineKeyboardButton("🎳 INSTAGRAM - انستغرام", callback_data="srv_ig"))
    markup.add(types.InlineKeyboardButton("🎯 FACEBOOK - فيسبوك", callback_data="srv_fb"))
    markup.add(types.InlineKeyboardButton("🐤 TWITTER - تويتر", callback_data="srv_tw"))
    markup.add(
        types.InlineKeyboardButton("🎥 TIKTOK - تيك توك", callback_data="srv_lf"),
        types.InlineKeyboardButton("☂️ Google - جوجل", callback_data="srv_go")
    )
    markup.add(
        types.InlineKeyboardButton("♣️ SNAP - سناب شات", callback_data="srv_sn"),
        types.InlineKeyboardButton("🪗 HARAJ - حراج", callback_data="srv_hj")
    )
    markup.add(
        types.InlineKeyboardButton("💎 IMO - ايمو", callback_data="srv_im"),
        types.InlineKeyboardButton("🤖 السيرفر العام", callback_data="srv_ot")
    )
    markup.add(
        types.InlineKeyboardButton("🏐 PAYPAL - بايبال", callback_data="srv_pp"),
        types.InlineKeyboardButton("📳 Viber - فايبر", callback_data="srv_vi")
    )
    markup.add(types.InlineKeyboardButton("✤ ↩️ عودة ✤", callback_data="back_to_main"))
    return markup

def build_servers_keyboard(app_code):
    markup = types.InlineKeyboardMarkup(row_width=1)
    if app_code == "tg":
        markup.add(types.InlineKeyboardButton("✈️ حسابات تيليجرام جاهزة (موقع TG فوري)", callback_data="btn_ready_tg"))
    for s_key, s_info in catalog.SERVERS.items():
        markup.add(types.InlineKeyboardButton(s_info["title"], callback_data=f"page_{app_code}_{s_key}_0"))
    markup.add(types.InlineKeyboardButton("🔍 🚀 البحث عن دولة بالاسم 🧩", callback_data=f"prompt_search_country_{app_code}"))
    markup.add(types.InlineKeyboardButton("✤ ↩️ عودة ✤", callback_data="btn_buy_number"))
    return markup

def build_countries_page_keyboard(app_code, server_key, page=0):
    markup = types.InlineKeyboardMarkup(row_width=3)
    srv_info = catalog.SERVERS.get(server_key, catalog.SERVERS.get("s1", {"provider": "hero", "title": "السيرفر 1"}))
    provider_name = srv_info.get("provider", "hero")
    
    # سحب الدول الحية والأسعار الفورية مباشرة من السيرفر المختار
    live_countries = get_live_countries_for_server(provider_name, app_code)
    total_countries = len(live_countries)
    # نظام شبكة: 9 صفوف × 3 أعمدة = 27 دولة في كل صفحة
    page_size = 27
    total_pages = max(1, (total_countries + page_size - 1) // page_size)
    page = max(0, min(page, total_pages - 1))
    
    start_idx = page * page_size
    end_idx = min(start_idx + page_size, total_countries)
    current_batch = live_countries[start_idx:end_idx]
    
    row_btns = []
    for c in current_batch:
        btn_text = f"{c['flag']} {c['title']}"
        row_btns.append(types.InlineKeyboardButton(btn_text, callback_data=f"card_{app_code}_{server_key}_{c['id']}_{page}"))
        if len(row_btns) == 3:
            markup.row(*row_btns)
            row_btns = []
    if row_btns:
        markup.row(*row_btns)
    
    # الصف العاشر: أزرار التنقل بين الصفحات
    nav_buttons = []
    if page > 0:
        nav_buttons.append(types.InlineKeyboardButton("➡️ السابق", callback_data=f"page_{app_code}_{server_key}_{page-1}"))
    nav_buttons.append(types.InlineKeyboardButton(f"📄 {page+1}/{total_pages}", callback_data="noop"))
    if page < total_pages - 1:
        nav_buttons.append(types.InlineKeyboardButton("التالي ⬅️", callback_data=f"page_{app_code}_{server_key}_{page+1}"))
    
    if nav_buttons:
        markup.row(*nav_buttons)
        
    markup.add(types.InlineKeyboardButton("🔍 🚀 البحث عن دولة 🧩", callback_data=f"prompt_search_country_{app_code}_{server_key}"))
    markup.add(types.InlineKeyboardButton("✤ ↩️ عودة للسيرفرات ✤", callback_data=f"srv_{app_code}"))
    return markup

def build_smm_categories_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("🟢 رشق تيليجرام ✈️", callback_data="smm_sec_tg"),
        types.InlineKeyboardButton("🟣 رشق إنستغرام 📸", callback_data="smm_sec_ig")
    )
    markup.add(
        types.InlineKeyboardButton("⚫ رشق تيك توك 🎵", callback_data="smm_sec_tt"),
        types.InlineKeyboardButton("🎮 شحن الألعاب 🎯", callback_data="smm_sec_games")
    )
    markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
    return markup

def build_smm_section_services_keyboard(section_name):
    markup = types.InlineKeyboardMarkup(row_width=1)
    smm_margin = get_smm_margin()
    for smm_id, smm_info in catalog.SMM_SERVICES.items():
        if smm_info.get("section") == section_name:
            per_1k = smm_info["raw_per_1000"] * (1.0 + smm_margin)
            btn_title = f"{smm_info['title']} - {per_1k:.3f}$/1000"
            markup.add(types.InlineKeyboardButton(btn_title, callback_data=f"smm_king_start_{smm_id}"))
    markup.add(types.InlineKeyboardButton("🔙 رجوع للأقسام", callback_data="btn_services_games"))
    return markup

def build_smm_service_card_text(smm_info):
    raw_unit = smm_info["raw_unit_price"]
    smm_margin = get_smm_margin()
    unit_p = round(raw_unit * (1.0 + smm_margin), 6)
    per_1k = round(smm_info["raw_per_1000"] * (1.0 + smm_margin), 4)
    
    return (
        f"📋 تفاصيل ومواصفات الخدمة بنظام الملك:\n\n"
        f"👑 الخدمة: {smm_info['title']}\n"
        f"📂 القسم: {smm_info['section']}\n\n"
        f"⚡ وقت البدء: فوري خلال ثوانٍ\n"
        f"👤 الجودة: {smm_info['quality']}\n"
        f"🚀 السرعة: {smm_info['speed']}\n"
        f"🛡️ الضمان: {smm_info['guarantee']}\n"
        f"🔄 التعويض: {smm_info['compensation']}\n"
        f"🚫 زر الإلغاء: {smm_info['cancel_btn']}\n"
        f"💰 سعر الألف: ${per_1k}\n"
        f"💵 سعر العضو: ${unit_p:.6f}\n"
        f"🔢 أقل كمية: {smm_info['min_qty']} | أقصى كمية: {smm_info['max_qty']:,}\n\n"
        f"🔗 نوع الرابط المطلوب: {smm_info['link_type']}\n\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f": الآن من فضلك أرسل رابط الطلب:"
    )

def build_admin_main_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("📈 نسب الأرباح (الربح)", callback_data="admin_margin_settings"),
        types.InlineKeyboardButton("🔘 تشغيل / إغلاق الأقسام", callback_data="admin_toggle_sections")
    )
    markup.add(
        types.InlineKeyboardButton("🔑 إدارة المزودين ومفاتيح API", callback_data="admin_providers_hub"),
        types.InlineKeyboardButton("💳 إدارة طرق الدفع والحسابات", callback_data="admin_payment_methods")
    )
    markup.add(
        types.InlineKeyboardButton("🤝 إدارة الوكلاء والموزعين", callback_data="admin_agents_management"),
        types.InlineKeyboardButton("📢 إدارة القنوات والاشتراك", callback_data="admin_channels_management")
    )
    markup.add(
        types.InlineKeyboardButton("🔄 إعدادات تحويل الرصيد", callback_data="admin_transfer_settings"),
        types.InlineKeyboardButton("🎧 إدارة حسابات الدعم", callback_data="admin_support_accounts")
    )
    markup.add(
        types.InlineKeyboardButton("📦 مخزون الحسابات القديمة (3)", callback_data="admin_tg_accounts_stock"),
        types.InlineKeyboardButton("🎁 إعدادات شارك واربح", callback_data="admin_referral_settings")
    )
    markup.add(
        types.InlineKeyboardButton("➕ إضافة رصيد لمستخدم", callback_data="admin_prompt_add_bal"),
        types.InlineKeyboardButton("➖ خصم رصيد من مستخدم", callback_data="admin_prompt_sub_bal")
    )
    markup.add(
        types.InlineKeyboardButton("🔍 البحث وكشف مستخدم", callback_data="admin_search_user"),
        types.InlineKeyboardButton("💎 شحن رصيد ذاتي لي", callback_data="admin_self_deposit")
    )
    markup.add(
        types.InlineKeyboardButton("📣 إذاعة عامة (Broadcast)", callback_data="admin_prompt_broadcast"),
        types.InlineKeyboardButton("🚫 تقييد / فك تقييد عضو", callback_data="admin_prompt_ban")
    )
    markup.add(
        types.InlineKeyboardButton("📊 الإحصائيات الشاملة", callback_data="admin_system_stats"),
        types.InlineKeyboardButton("👥 عرض جميع المستخدمين", callback_data="admin_view_users")
    )
    markup.add(
        types.InlineKeyboardButton("🛠 وضع الصيانة العام", callback_data="admin_toggle_maintenance"),
        types.InlineKeyboardButton("🔄 استعادة تلقائية من السيرفر", callback_data="admin_auto_restore")
    )
    markup.add(
        types.InlineKeyboardButton("💾 نسخة احتياطية من البيانات", callback_data="admin_export_backup"),
        types.InlineKeyboardButton("📥 دفع واستعادة نسخة احتياطية", callback_data="admin_import_backup_prompt")
    )
    markup.add(
        types.InlineKeyboardButton("📡 فحص وتجربة قناة التفعيلات", callback_data="admin_test_activation_channel")
    )
    markup.add(
        types.InlineKeyboardButton("🏠 القائمة الرئيسية", callback_data="back_to_main")
    )
    return markup

# ----------------- معالجة أمر البداية (Start) -----------------

@bot.message_handler(commands=['start'])
def start_command(message):
    try:
        user_id = message.from_user.id
        username = message.from_user.username or ""
        first_name = message.from_user.first_name or "صديقنا"
        
        bal_usd, bal_rub, orders, is_banned, fn, un = get_or_create_user(user_id, username, first_name)
        
        if is_banned and str(user_id) != str(ADMIN_ID):
            bot.reply_to(message, "⛔ **تم حظرك من استخدام هذا البوت!**\nتواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.")
            return

        # فحص روابط الهدايا والشحن التلقائي (مثال: /start gift_VCH-1234)
        msg_parts = message.text.strip().split()
        if len(msg_parts) > 1:
            arg = msg_parts[1].strip()
            if arg.startswith("gift_") or arg.startswith("vch_"):
                v_code = arg.replace("gift_", "").replace("vch_", "").strip()
                success, res = redeem_voucher_record(user_id, v_code)
                if not success:
                    success, res = redeem_voucher_record(user_id, f"VCH-{v_code}")
                if success:
                    amt_usd, amt_rub, creator_id = res
                    bal_usd, bal_rub, _, _, _, _ = get_or_create_user(user_id)
                    redeem_text = (
                        f"🎉 **مبروك! تم شحن قسيمة الهدية في محفظتك بنجاح!**\n"
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"💵 • المبلغ المضاف: **+{amt_usd:.2f} $** ({amt_rub:.1f} ₽)\n"
                        f"💰 • رصيدك الإجمالي الآن: **{bal_usd:.2f} $**\n"
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"✅ يمكنك استخدامه الآن مباشرة في شراء الأرقام والخدمات."
                    )
                    bot.reply_to(message, redeem_text, parse_mode="Markdown")
                    try:
                        bot.send_message(creator_id, f"ℹ️ **إشعار:** قام المستخدم `{user_id}` بشحن قسيمة الهدية بقيمة **{amt_usd:.2f} $** التي قمت بإنشائها.")
                    except Exception:
                        pass
                else:
                    bot.reply_to(message, res)
            
        text = (
            f"╭━━━━━〔 ⚡ **NUMBER SMS & KING STORE** ⚡ 〕━━━━━╮\n"
            f"👋 مرحباً بك يا **{first_name}** في المنصة الأقوى للأرقام والخدمات!\n\n"
            f"👤 • **معرفك (ID):** `{user_id}`\n"
            f"💰 • **رصيدك المتوفر:** **{bal_usd:.2f} $** | **{bal_rub:.1f} ₽**\n"
            f"🏆 • **رتبة الحساب:** **عضو VIP نشط ✨**\n"
            f"⚡ • **سيرفرات التفعيل:** **3 سيرفرات SMS + موقع TG نشط 100%**\n"
            f"👑 • **نظام الرشق:** **نظام الملك (تسليم فوري وسرعة 100K)**\n"
            f"╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n"
            f"👇 **تفضل باختيار القسم الذي تريده من القائمة أدناه:**"
        )
        markup = build_main_keyboard(user_id)
        try:
            bot.reply_to(message, text, reply_markup=markup, parse_mode="Markdown")
        except Exception as e1:
            print(f"Reply start markdown error: {e1}")
            try:
                bot.reply_to(message, text, reply_markup=markup, parse_mode=None)
            except Exception as e2:
                print(f"Reply start raw error: {e2}")
                fallback_markup = types.InlineKeyboardMarkup(row_width=2)
                fallback_markup.add(
                    types.InlineKeyboardButton("📱 تفعيل وشراء الأرقام", callback_data="btn_buy_number"),
                    types.InlineKeyboardButton("✈️ حسابات TG جاهزة", callback_data="btn_ready_tg")
                )
                fallback_markup.add(
                    types.InlineKeyboardButton("💳 شحن الرصيد", callback_data="btn_deposit"),
                    types.InlineKeyboardButton("🔄 تحويل الرصيد", callback_data="btn_transfer_hub")
                )
                if str(user_id) == str(ADMIN_ID):
                    fallback_markup.add(types.InlineKeyboardButton("👑 لوحة الإدارة", callback_data="btn_admin_panel"))
                bot.send_message(message.chat.id, text, reply_markup=fallback_markup)
    except Exception as e:
        print(f"Start command outer fatal error: {e}")
        try:
            bot.send_message(message.chat.id, "👋 مرحباً بك في البوت! استخدم الأزرار أدناه للبدء.")
        except Exception:
            pass

@bot.message_handler(commands=['transfer'])
def transfer_command(message):
    user_id = message.from_user.id
    bal_usd, bal_rub, _, _, _, _ = get_or_create_user(user_id)
    hub_text = (
        f"╭━━━━〔 🔄 **مركز تحويل وشحن الرصيد** 〕━━━━╮\n"
        f"💰 • **رصيدك الحالي:** **{bal_usd:.2f} $** | **{bal_rub:.1f} ₽**\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"✨ **المميزات المتاحة:**\n"
        f"🔹 تحويل فوري لأي مستخدم داخل البوت عبر المعرف (ID) مجاناً 100%.\n"
        f"🔹 إنشاء قسائم وهدايا برابط مباشر يمكن إهداؤه لأي شخص.\n"
        f"🔹 شحن واسترداد قسائم الرصيد بضغطة زر.\n"
        f"🔹 تحويل وصرف العملات بين ($) و (₽) بسعر الصرف الرسمي.\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👇 **اختر العملية التي تريد تنفيذها:**"
    )
    markup = types.InlineKeyboardMarkup(row_width=1)
    markup.add(
        types.InlineKeyboardButton("👤 تحويل مباشر إلى آيدي (ID) [مجاني 0%]", callback_data="tf_direct_id"),
        types.InlineKeyboardButton("🎁 إنشاء قسيمة شحن / كود هدية برابط", callback_data="tf_create_voucher"),
        types.InlineKeyboardButton("🎟️ شحن واسترداد كود قسيمة", callback_data="tf_redeem_voucher"),
        types.InlineKeyboardButton("💱 صرف وتحويل العملة ($ ⇄ ₽)", callback_data="tf_exchange_currency"),
        types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main")
    )
    bot.reply_to(message, hub_text, reply_markup=markup, parse_mode="Markdown")

@bot.message_handler(commands=['admin'])
def admin_command(message):
    if str(message.from_user.id) != str(ADMIN_ID):
        bot.reply_to(message, "⛔ هذا الأمر خاص بإدارة البوت فقط!")
        return
    markup = build_admin_main_keyboard()
    bot.reply_to(message, "👑 **أهلاً بك يا مدير البوت في لوحة التحكم الإدارية الشاملة:**", reply_markup=markup)

# ----------------- معالجة النصوص (التدفق التفاعلي لنظام الملك والتحويل) -----------------

@bot.message_handler(func=lambda msg: not msg.text.startswith('/'))
def handle_all_text_messages(message):
    try:
        user_id_str = str(message.from_user.id)
        text = message.text.strip()
        state = user_states.pop(user_id_str, None)
        
        if not state:
            return

        action = state.get("action")
        
        # ----------------- 1. مسار نظام الملك: استلام الرابط -----------------
        if action == "king_smm_await_link":
            smm_id = state.get("smm_id", "tg_king_members")
            smm_info = catalog.SMM_SERVICES.get(smm_id)
            if not smm_info:
                bot.reply_to(message, "❌ حدث خطأ في اختيار الخدمة، يرجى المحاولة مجدداً.")
                return

            target_link = text
            # احتساب سعر العضو الواحد بإضافة 30% هامش ربح
            raw_unit = smm_info["raw_unit_price"]
            unit_price = round(raw_unit * (1.0 + PROFIT_MARGIN), 6)
            
            # احتساب كم يمكن للزبون رشق بحسب رصيده
            bal_usd, _, _, _, _, _ = get_or_create_user(message.from_user.id)
            max_affordable = int(bal_usd / unit_price) if unit_price > 0 else 0
            
            # حفظ الحالة للخطوة التالية: إدخال الكمية
            user_states[user_id_str] = {
                "action": "king_smm_await_qty",
                "smm_id": smm_id,
                "target_link": target_link,
                "unit_price": unit_price
            }
            
            reply_text = (
                f"☑️︙ يرجى إرسال عدد الأعضاء تذكر أقل عدد للطلب {smm_info['min_qty']}، وأقصى عدد للطلب {smm_info['max_qty']:,} 👤\n\n"
                f"💰︙سعر العضو الواحد: {unit_price:.6f}$\n\n"
                f"🏆︙يمكنك رشق ({max_affordable:,}) عضو 🫂"
            )
            bot.reply_to(message, reply_text)

        # ----------------- 2. مسار نظام الملك: استلام الكمية وعرض التأكيد -----------------
        elif action == "king_smm_await_qty":
            smm_id = state.get("smm_id", "tg_king_members")
            target_link = state.get("target_link")
            unit_price = state.get("unit_price")
            smm_info = catalog.SMM_SERVICES.get(smm_id)
            
            if not smm_info:
                return

            try:
                qty = int(text)
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال رقم صحيح للأعضاء (مثال: 10 أو 500 أو 1000).")
                user_states[user_id_str] = state  # إعادة حفظ الحالة
                return

            if qty < smm_info['min_qty']:
                bot.reply_to(message, f"❌ أقل عدد مسموح به للطلب هو {smm_info['min_qty']} عضو.")
                user_states[user_id_str] = state
                return

            if qty > smm_info['max_qty']:
                bot.reply_to(message, f"❌ أقصى عدد مسموح به للطلب هو {smm_info['max_qty']:,} عضو.")
                user_states[user_id_str] = state
                return

            total_cost = round(qty * unit_price, 5)
            bal_usd, _, _, _, _, _ = get_or_create_user(message.from_user.id)
            
            if bal_usd < total_cost and user_id_str != str(ADMIN_ID):
                msg_err = (
                    f"❌ **رصيدك غير كافٍ لإتمام هذا الطلب!**\n\n"
                    f"• تكلفة طلبك ({qty} عضو): **${total_cost:.5f}**\n"
                    f"• رصيدك الحالي: **${bal_usd:.2f}**\n\n"
                    f"👉 يرجى شحن رصيدك عبر قسم **🎳 شحن الرصيد** أولاً."
                )
                bot.reply_to(message, msg_err, reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🎳 شحن الرصيد", callback_data="btn_deposit")))
                return

            # إعداد شاشة التأكيد الدقيقة المطابقة للنموذج
            price_per_1000 = round(smm_info['raw_per_1000'] * (1.0 + PROFIT_MARGIN), 4)
            
            confirm_text = (
                f"- القسم - {smm_info['section']}\n\n"
                f"- الخدمة {smm_info['title']}\n\n"
                f"- السعر لكل 1000: ${price_per_1000}\n"
                f"- سعر العضو: ${unit_price:.6f}\n"
                f"- السعر الكلي: ${total_cost:.5f}\n\n"
                f"- الجودة: {smm_info['quality']}\n\n"
                f"- السرعة: {smm_info['speed']}\n\n"
                f"- الضمان: {smm_info['guarantee']}\n\n"
                f"- الوصف:\n"
                f"{smm_info['desc']}\n\n"
                f"- الرابط: {target_link}\n\n"
                f"- هل تريد المتابعة وتأكيد الطلب؟"
            )
            
            # تخزين بيانات التأكيد في جلسة فريدة
            confirm_key = f"{user_id_str}_{int(time.time())}"
            user_states[f"confirm_{confirm_key}"] = {
                "smm_id": smm_id,
                "target_link": target_link,
                "qty": qty,
                "total_cost": total_cost,
                "unit_price": unit_price
            }
            
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(types.InlineKeyboardButton("✅ تأكيد الطلب", callback_data=f"king_confirm_{confirm_key}"))
            markup.add(types.InlineKeyboardButton("❌ إلغاء الطلب", callback_data="back_to_main"))
            
            bot.reply_to(message, confirm_text, reply_markup=markup)

        # ----------------- 3. مركز تحويل الرصيد والقسائم -----------------
        elif action == "transfer_step_1_id":
            target_uid = text.strip()
            if target_uid == user_id_str:
                bot.reply_to(message, "❌ لا يمكنك تحويل الرصيد لنفسك!")
                return
            target_user = get_single_user_info(target_uid)
            if not target_user:
                bot.reply_to(message, f"❌ لم يتم العثور على مستخدم بالمعرف `{target_uid}`. تأكد من رقم المعرف.")
                return
            
            user_states[user_id_str] = {"action": "transfer_step_2_amount", "target_uid": target_uid, "target_name": target_user[2]}
            bot.reply_to(
                message,
                f"👤 **المستلم:** **{target_user[2]}** (`{target_uid}`)\n\n"
                f"💵 **أرسل الآن المبلغ المراد تحويله بالدولار (التحويل مجاني 0% عمولة):**"
            )

        elif action == "transfer_step_2_amount":
            target_uid = state.get("target_uid")
            target_name = state.get("target_name")
            try:
                amt = float(text)
                if amt <= 0:
                    bot.reply_to(message, "❌ يرجى إدخال مبلغ أكبر من الصفر.")
                    return
                sender_usd, _, _, _, _, _ = get_or_create_user(message.from_user.id)
                if sender_usd < amt and user_id_str != str(ADMIN_ID):
                    bot.reply_to(message, f"❌ **رصيدك غير كافٍ!** رصيدك الحالي هو: **{sender_usd:.2f} $**")
                    return
                
                update_user_balance(message.from_user.id, -amt)
                update_user_balance(target_uid, amt)
                
                bot.reply_to(
                    message,
                    f"✅ **تم تحويل {amt:.2f} $ بنجاح إلى {target_name} (`{target_uid}`) مجاناً!**",
                    reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 العودة لمركز التحويل", callback_data="btn_transfer_hub"))
                )
                try:
                    bot.send_message(
                        target_uid,
                        f"🎉 **وصلك تحويل رصيد جديد!**\n\n"
                        f"👤 • من: `{user_id_str}`\n"
                        f"💵 • المبلغ: **+{amt:.2f} $** ({amt * RUB_PER_USD:.1f} ₽)\n"
                        f"✅ تمت إضافة الرصيد لمحفظتك مجاناً."
                    )
                except Exception:
                    pass
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال رقم صحيح (مثال: 2 أو 5.5).")

        elif action == "voucher_create_amount":
            try:
                amt = float(text)
                if amt <= 0:
                    bot.reply_to(message, "❌ يجب أن يكون المبلغ أكبر من الصفر.")
                    return
                sender_usd, sender_rub, _, _, _, _ = get_or_create_user(message.from_user.id)
                if sender_usd < amt and user_id_str != str(ADMIN_ID):
                    bot.reply_to(message, f"❌ **رصيدك غير كافٍ لإنشاء هذه القسيمة!**\nرصيدك الحالي: **{sender_usd:.2f} $**")
                    return
                    
                v_code = create_voucher_record(user_id_str, amt)
                if not v_code:
                    bot.reply_to(message, "❌ تعذر إنشاء القسيمة، يرجى المحاولة لاحقاً.")
                    return
                    
                update_user_balance(message.from_user.id, -amt)
                
                bot_user = bot.get_me()
                b_name = bot_user.username if bot_user else "bot"
                share_url = f"https://t.me/{b_name}?start=gift_{v_code}"
                
                vch_msg = (
                    f"╭━━━━〔 🎁 **تم إنشاء قسيمة الهدية بنجاح** 〕━━━━╮\n"
                    f"💵 • **القيمة:** **{amt:.2f} $** ({amt * RUB_PER_USD:.1f} ₽)\n"
                    f"🔑 • **كود القسيمة:** `{v_code}`\n\n"
                    f"🔗 • **رابط الشحن المباشر:**\n`{share_url}`\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                    f"📌 يمكنك إرسال الرابط أو الكود لأي شخص، وبمجرد الضغط عليه سيتم شحن الرصيد في حسابه فوراً!"
                )
                markup = types.InlineKeyboardMarkup(row_width=1)
                markup.add(
                    types.InlineKeyboardButton("🎁 إنشاء قسيمة أخرى", callback_data="tf_create_voucher"),
                    types.InlineKeyboardButton("🔄 مركز التحويل والقسائم", callback_data="btn_transfer_hub"),
                    types.InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="back_to_main")
                )
                bot.reply_to(message, vch_msg, reply_markup=markup, parse_mode="Markdown")
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال مبلغ صحيح (مثال: 1 أو 3.5).")

        elif action == "voucher_redeem_code":
            v_code = text.strip()
            success, res = redeem_voucher_record(message.from_user.id, v_code)
            if success:
                amt_usd, amt_rub, creator_id = res
                bal_usd, _, _, _, _, _ = get_or_create_user(message.from_user.id)
                redeem_text = (
                    f"🎉 **مبروك! تم شحن القسيمة وإيداعها في محفظتك بنجاح!**\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"💵 • المبلغ المضاف: **+{amt_usd:.2f} $** ({amt_rub:.1f} ₽)\n"
                    f"💰 • رصيدك الحالي الآن: **{bal_usd:.2f} $**\n"
                    f"━━━━━━━━━━━━━━━━━━"
                )
                markup = types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 العودة للرئيسية", callback_data="back_to_main"))
                bot.reply_to(message, redeem_text, reply_markup=markup, parse_mode="Markdown")
                try:
                    bot.send_message(creator_id, f"ℹ️ **إشعار:** قام المستخدم `{user_id_str}` بشحن قسيمة بقيمة **{amt_usd:.2f} $** أنشأتها أنت.")
                except Exception:
                    pass
            else:
                bot.reply_to(message, res, reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 عودة لمركز التحويل", callback_data="btn_transfer_hub")))

        # ----------------- 4. البحث الديناميكي عن دولة -----------------
        elif action == "search_country_for_app":
            app_code = state.get("app_code", "wa")
            server_key = state.get("server_key", "s1")
            search_query = text.lower().strip()
            
            srv_info = catalog.SERVERS.get(server_key, catalog.SERVERS["s1"])
            provider_name = srv_info["provider"]
            all_live = get_live_countries_for_server(provider_name, app_code)
            
            matched_countries = []
            for c in all_live:
                if (search_query in c["name"].lower() or 
                    search_query in c["title"].lower() or 
                    search_query in c.get("prefix", "") or 
                    search_query == c["id"]):
                    matched_countries.append(c)
                    
            if not matched_countries:
                # فحص الكتالوج الموسع والترجمات الشاملة
                for k, tr in catalog.GLOBAL_COUNTRY_TRANSLATIONS.items():
                    if (search_query in k.lower() or 
                        search_query in tr["title"].lower() or 
                        search_query in tr.get("prefix", "") or 
                        search_query == str(tr.get("id"))):
                        cid = str(tr.get("id", k))
                        p_rub, p_usd = get_server_price(provider_name, app_code, "other", cid, k)
                        matched_countries.append({
                            "id": cid,
                            "name": k,
                            "title": tr["title"],
                            "flag": tr["flag"],
                            "prefix": tr.get("prefix", ""),
                            "price_usd": p_usd,
                            "price_rub": p_rub
                        })
                        
            if not matched_countries:
                msg_text = f"🔍 **لم يتم العثور على دولة مطابقة لـ:** `{text}`\n\n👉 جرب اسم آخر (مثل: اليمن، السعودية، البرازيل، مصر)."
                markup = types.InlineKeyboardMarkup().add(
                    types.InlineKeyboardButton("🔙 عودة لقائمة الدول", callback_data=f"page_{app_code}_{server_key}_0")
                )
                bot.reply_to(message, msg_text, reply_markup=markup)
                return
            
            markup = types.InlineKeyboardMarkup(row_width=2)
            for c in matched_countries[:14]:
                btn_text = f"{c['flag']} {c['title']} • {c['price_usd']:.2f}$"
                markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"card_{app_code}_{server_key}_{c['id']}_0"))
            markup.add(types.InlineKeyboardButton("🔙 عودة لقائمة الدول", callback_data=f"page_{app_code}_{server_key}_0"))
            
            bot.reply_to(message, f"🎯 **نتائج البحث اللحظي عن ({text}):**\nاختر الدولة المطلوبة مباشرة:", reply_markup=markup)

        # ----------------- 5. البحث في موقع TG (تيليجرام الجاهز) -----------------
        elif action == "search_tg_ready_country":
            q = text.lower().strip()
            markup, count = build_tg_ready_page_keyboard(page=0, query=q)
            if count == 0:
                bot.reply_to(
                    message,
                    f"🔍 لم يتم العثور على حساب تيليجرام مطابق لـ `{text}` في موقع TG.\nجرب دولة أخرى (مثل: اليمن، السعودية، أمريكا، روسيا).",
                    reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("✈️ قائمة حسابات TG الكاملة", callback_data="btn_ready_tg"))
                )
            else:
                bot.reply_to(message, f"🎯 **نتائج البحث في موقع TG عن ({text}) - تم العثور على {count} حساب:**", reply_markup=markup)

        # ----------------- 5. إدارة الشحن اليدوي والخصم -----------------
        elif action == "admin_input_add_target" and user_id_str == str(ADMIN_ID):
            target_uid = text.strip()
            user_states[user_id_str] = {"action": "admin_input_add_amt", "target_uid": target_uid}
            bot.reply_to(message, f"➕ **أرسل الآن المبلغ المراد شحنه للمستخدم `{target_uid}` بالدولار (مثال: 5):**")

        elif action == "admin_input_add_amt" and user_id_str == str(ADMIN_ID):
            target_uid = state.get("target_uid")
            try:
                amt = float(text)
                update_user_balance(target_uid, amt)
                bot.reply_to(message, f"✅ **تم شحن {amt:.2f} $ بنجاح لحساب `{target_uid}`.**")
                try:
                    bot.send_message(target_uid, f"🎉 **تم إيداع رصيد جديد في محفظتك!**\n\n💵 المبلغ: **{amt:.2f} $** ({amt * RUB_PER_USD:.1f} ₽)")
                except Exception:
                    pass
            except Exception:
                bot.reply_to(message, "❌ القيمة المدخلة غير صحيحة.")

        elif action == "admin_input_sub_target" and user_id_str == str(ADMIN_ID):
            target_uid = text.strip()
            user_states[user_id_str] = {"action": "admin_input_sub_amt", "target_uid": target_uid}
            bot.reply_to(message, f"➖ **أرسل الآن المبلغ المراد خصمه من المستخدم `{target_uid}` بالدولار (مثال: 2):**")

        elif action == "admin_input_sub_amt" and user_id_str == str(ADMIN_ID):
            target_uid = state.get("target_uid")
            try:
                amt = float(text)
                update_user_balance(target_uid, -amt)
                bot.reply_to(message, f"✅ **تم خصم {amt:.2f} $ بنجاح من حساب `{target_uid}`.**")
                try:
                    bot.send_message(target_uid, f"⚠️ **تنبيه:** تم خصم **{amt:.2f} $** من رصيدك بواسطة الإدارة.")
                except Exception:
                    pass
            except Exception:
                bot.reply_to(message, "❌ القيمة المدخلة غير صحيحة.")

        elif action == "verify_auto_payment":
            method = state.get("method", "jeeb")
            method_title = "محفظة جيب" if method == "jeeb" else "منصة بينانس"
            notify_admin = (
                f"🔔 **طلب شحن وتأكيد دفع جديد!**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👤 • المستخدم : `{user_id_str}` (@{message.from_user.username or 'بدون_يوزر'})\n"
                f"🏦 • طريقة الدفع : **{method_title}**\n"
                f"🧾 • رقم الإشعار / العملية : `{text}`\n"
                f"⏰ • الوقت : `{datetime.datetime.now().strftime('%H:%M | %Y-%m-%d')}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 للشحن الفوري للمستخدم اضغط الزر أدناه:"
            )
            adm_markup = types.InlineKeyboardMarkup(row_width=2)
            adm_markup.add(
                types.InlineKeyboardButton("➕ شحن رصيد له", callback_data=f"adm_addbal_{user_id_str}"),
                types.InlineKeyboardButton("👤 ملف حسابه", callback_data=f"adm_userinfo_{user_id_str}")
            )
            try:
                bot.send_message(ADMIN_ID, notify_admin, reply_markup=adm_markup)
            except Exception:
                pass
                
            bot.reply_to(
                message,
                f"✅ **تم استلام رقم العملية (`{text}`) بنجاح!**\n\n"
                f"⏳ جاري مطابقة العملية وإيداع الرصيد في محفظتك تلقائياً.",
                reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
            )

        elif action == "admin_search_user" and user_id_str == str(ADMIN_ID):
            user_info = get_single_user_info(text)
            if not user_info:
                markup = types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 عودة للوحة الإدارة", callback_data="btn_admin_panel"))
                bot.reply_to(message, f"❌ **لم يتم العثور على مستخدم بالمعرف أو الاسم:** `{text}`", reply_markup=markup)
                return
            
            uid, uname, fname, bal_usd, bal_rub, orders, is_banned, joined = user_info
            status_text = "🚫 محظور (مطرود)" if is_banned else "✅ نشط"
            card = (
                f"👤 **ملف المستخدم:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"• الاسم: **{fname}**\n"
                f"• المعرف (ID): `{uid}`\n"
                f"• اليوزر: @{uname if uname else 'بدون_يوزر'}\n"
                f"• الرصيد: **{bal_usd:.2f} $** ({bal_rub:.1f} ₽)\n"
                f"• المشتريات: **{orders} رقم**\n"
                f"• الحالة: **{status_text}**\n"
                f"• تاريخ الانضمام: `{joined}`\n"
                f"━━━━━━━━━━━━━━━━━━"
            )
            u_markup = types.InlineKeyboardMarkup(row_width=2)
            u_markup.add(
                types.InlineKeyboardButton("➕ شحن رصيد", callback_data=f"adm_addbal_{uid}"),
                types.InlineKeyboardButton("➖ خصم رصيد", callback_data=f"adm_subbal_{uid}")
            )
            ban_btn_text = "🟢 إلغاء الحظر" if is_banned else "🚫 طرد / حظر"
            ban_cb = f"adm_unban_{uid}" if is_banned else f"adm_ban_{uid}"
            u_markup.add(
                types.InlineKeyboardButton(ban_btn_text, callback_data=ban_cb),
                types.InlineKeyboardButton("✉️ مراسلة خاصة", callback_data=f"adm_msg_{uid}")
            )
            u_markup.add(types.InlineKeyboardButton("🔙 عودة للوحة الإدارة", callback_data="btn_admin_panel"))
            bot.reply_to(message, card, reply_markup=u_markup)

        elif action == "broadcast_all" and user_id_str == str(ADMIN_ID):
            users = get_all_users()
            sent_count = 0
            bot.reply_to(message, f"⏳ جاري بدء الإذاعة لـ {len(users)} مستخدم...")
            for u in users:
                uid = u[0]
                try:
                    bot.send_message(uid, f"📢 **إشعار هام من إدارة البوت:**\n\n{text}")
                    sent_count += 1
                    time.sleep(0.04)
                except Exception:
                    continue
            bot.send_message(user_id_str, f"✅ **اكتملت الإذاعة بنجاح!**\nتم التوصيل إلى **{sent_count}** مستخدم.")

        elif action == "admin_input_tg_url" and user_id_str == str(ADMIN_ID):
            new_url = text.strip()
            set_setting("tg_ready_base_url", new_url)
            safe_reply_to(
                message,
                f"✅ تم حفظ وتحديث رابط مزود TG بنجاح:\n`{new_url}`",
                reply_markup=types.InlineKeyboardMarkup().add(
                    types.InlineKeyboardButton("🔄 فحص الاتصال الآن", callback_data="admin_check_tg")
                )
            )

        elif action == "admin_input_tg_key" and user_id_str == str(ADMIN_ID):
            new_key = text.strip()
            set_setting("tg_ready_api_key", new_key)
            safe_reply_to(
                message,
                f"✅ تم حفظ وتحديث مفتاح API مزود TG بنجاح:\n`{new_key}`",
                reply_markup=types.InlineKeyboardMarkup().add(
                    types.InlineKeyboardButton("🔄 فحص الاتصال الآن", callback_data="admin_check_tg")
                )
            )

        elif action == "admin_input_fivesim_key" and user_id_str == str(ADMIN_ID):
            new_token = text.strip()
            set_setting("fivesim_token", new_token)
            live_countries_cache.clear()
            price_cache.clear()
            safe_reply_to(
                message,
                f"✅ **تم حفظ وتحديث توكن مزود 5SIM بنجاح!**\n\nاضغط على الزر أدناه لفحص الاتصال والرصيد الحي فوراً:",
                reply_markup=types.InlineKeyboardMarkup().add(
                    types.InlineKeyboardButton("🔄 فحص الاتصال والرصيد الآن", callback_data="admin_settings_fivesim"),
                    types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
                )
            )

        elif action == "admin_input_grizzly_key" and user_id_str == str(ADMIN_ID):
            new_key = text.strip()
            set_setting("grizzly_api_key", new_key)
            live_countries_cache.clear()
            price_cache.clear()
            safe_reply_to(
                message,
                f"✅ **تم حفظ وتحديث مفتاح مزود Grizzly SMS بنجاح!**\n`{new_key}`\n\nاضغط على الزر أدناه لفحص الاتصال والرصيد الحي فوراً:",
                reply_markup=types.InlineKeyboardMarkup().add(
                    types.InlineKeyboardButton("🔄 فحص الاتصال والرصيد الآن", callback_data="admin_settings_grizzly"),
                    types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
                )
            )

        elif action == "admin_input_hero_key" and user_id_str == str(ADMIN_ID):
            new_key = text.strip()
            set_setting("hero_sms_api_key", new_key)
            live_countries_cache.clear()
            price_cache.clear()
            safe_reply_to(
                message,
                f"✅ **تم حفظ وتحديث مفتاح مزود Hero SMS بنجاح!**\n`{new_key}`\n\nاضغط على الزر أدناه لفحص الاتصال والرصيد الحي فوراً:",
                reply_markup=types.InlineKeyboardMarkup().add(
                    types.InlineKeyboardButton("🔄 فحص الاتصال والرصيد الآن", callback_data="admin_settings_hero"),
                    types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
                )
            )

        elif action == "send_direct_message" and user_id_str == str(ADMIN_ID):
            target_uid = state.get("target_uid")
            try:
                bot.send_message(target_uid, f"📩 **رسالة خاصة من إدارة البوت:**\n\n{text}")
                bot.reply_to(message, f"✅ **تم إرسال الرسالة الخاصة إلى المستخدم `{target_uid}` بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 عودة للوحة الإدارة", callback_data="btn_admin_panel")))
            except Exception as e:
                bot.reply_to(message, f"❌ تعذر إرسال الرسالة للمستخدم `{target_uid}`. السبب: {e}")

        elif action == "admin_input_ban_target" and user_id_str == str(ADMIN_ID):
            target_uid = text.strip().replace("@", "")
            set_user_ban_status(target_uid, True)
            try:
                bot.send_message(target_uid, "⛔ **تم حظرك وطردك من استخدام هذا البوت بقرار من الإدارة.**")
            except Exception:
                pass
            bot.reply_to(message, f"🚫 **تم حظر وطرد المستخدم `{target_uid}` بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 عودة للوحة الإدارة", callback_data="btn_admin_panel")))

        elif action == "admin_input_smm_margin" and user_id_str == str(ADMIN_ID):
            try:
                new_margin = float(text.replace("%", "").strip()) / 100.0
                set_setting("smm_margin", str(new_margin))
                bot.reply_to(message, f"✅ **تم تحديث نسبة ربح خدمات الرشق إلى: {new_margin*100:.1f}% بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("⚙️ إعدادات البوت", callback_data="admin_settings_menu")))
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال رقم صحيح (مثال: 30 أو 25).")

        elif action == "admin_input_num_margin" and user_id_str == str(ADMIN_ID):
            try:
                new_margin = float(text.replace("%", "").strip()) / 100.0
                set_setting("number_margin", str(new_margin))
                bot.reply_to(message, f"✅ **تم تحديث نسبة ربح الأرقام إلى: {new_margin*100:.1f}% بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("⚙️ إعدادات البوت", callback_data="admin_settings_menu")))
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال رقم صحيح (مثال: 30 أو 20).")

        elif action == "admin_input_forced_channel" and user_id_str == str(ADMIN_ID):
            ch_url = text.strip()
            if ch_url == "0" or ch_url.lower() in ["تعطيل", "إلغاء", "off"]:
                set_setting("forced_channel", "")
                bot.reply_to(message, "✅ **تم تعطيل الاشتراك الإجباري بالقناة.**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("⚙️ إعدادات البوت", callback_data="admin_settings_menu")))
            else:
                set_setting("forced_channel", ch_url)
                bot.reply_to(message, f"✅ **تم تعيين قناة الاشتراك الإجباري إلى:**\n`{ch_url}`", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("⚙️ إعدادات البوت", callback_data="admin_settings_menu")))

        elif action == "admin_edit_pay_acc" and user_id_str == str(ADMIN_ID):
            pay_key = state.get("pay_key")
            set_setting(f"pay_acc_{pay_key}", text.strip())
            bot.reply_to(message, f"✅ **تم تحديث بيانات وسيلة الدفع ({pay_key}) بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("💳 إدارة وسائل الدفع", callback_data="admin_payment_methods")))

        elif action == "admin_input_agent_discount" and user_id_str == str(ADMIN_ID):
            try:
                disc = float(text.replace("%", "").strip())
                set_setting("agent_discount_percent", str(disc))
                bot.reply_to(message, f"✅ **تم تحديث نسبة خصم الوكلاء إلى: {disc:.1f}% بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🤝 إدارة الوكلاء", callback_data="admin_agents_management")))
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال رقم صحيح (مثال: 15 أو 20).")

        elif action == "admin_input_agent_user_id" and user_id_str == str(ADMIN_ID):
            target_uid = text.strip()
            set_setting(f"is_agent_{target_uid}", "1")
            bot.reply_to(message, f"✅ **تمت ترقية المستخدم `{target_uid}` إلى وكيل معتمد بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🤝 إدارة الوكلاء", callback_data="admin_agents_management")))

        elif action == "admin_input_act_channel" and user_id_str == str(ADMIN_ID):
            ch = text.strip()
            set_setting("activations_channel", ch)
            bot.reply_to(message, f"✅ **تم تحديث قناة نشر التفعيلات إلى:** `{ch}`", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("📢 إدارة القنوات", callback_data="admin_channels_management")))

        elif action == "admin_input_transfer_fee" and user_id_str == str(ADMIN_ID):
            try:
                fee = float(text.replace("%", "").strip())
                set_setting("transfer_fee_percent", str(fee))
                bot.reply_to(message, f"✅ **تم تحديث عمولة التحويل إلى: {fee:.1f}% بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔄 إعدادات التحويل", callback_data="admin_transfer_settings")))
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال رقم صحيح (مثال: 0 أو 2).")

        elif action == "admin_input_support_user" and user_id_str == str(ADMIN_ID):
            u = text.strip()
            if not u.startswith("@"):
                u = f"@{u}"
            set_setting("support_username", u)
            bot.reply_to(message, f"✅ **تم تحديث يوزر الدعم الفني إلى:** `{u}`", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🎧 إدارة الدعم", callback_data="admin_support_accounts")))

        elif action == "admin_input_ref_reward" and user_id_str == str(ADMIN_ID):
            try:
                r = float(text.replace("$", "").strip())
                set_setting("referral_reward_usd", str(r))
                bot.reply_to(message, f"✅ **تم تحديث مكافأة الإحالة إلى: ${r:.2f} بنجاح!**", reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🎁 شارك واربح", callback_data="admin_referral_settings")))
            except Exception:
                bot.reply_to(message, "❌ يرجى إدخال قيمة رقمية صحيحة (مثال: 0.10 أو 0.05).")

    except Exception as e:
        print(f"Handle Text Error: {e}")

# ----------------- معالجة الأزرار (Callbacks) -----------------

@bot.callback_query_handler(func=lambda call: True)
def router_callback(call):
    try:
        chat_id = call.message.chat.id
        user_id = call.from_user.id
        data = call.data
        
        try:
            bot.answer_callback_query(call.id)
        except Exception:
            pass

        now_ts = time.time()
        if user_id in user_click_lock and now_ts - user_click_lock[user_id] < 0.25:
            return
        user_click_lock[user_id] = now_ts

        bal_usd, bal_rub, orders, is_banned, fn, un = get_or_create_user(user_id, call.from_user.username, call.from_user.first_name)
        
        if is_banned and str(user_id) != str(ADMIN_ID):
            try:
                bot.send_message(chat_id, "⛔ حسابك محظور من استخدام البوت!")
            except Exception:
                pass
            return

        if data == "back_to_main":
            user_name = call.from_user.first_name if call.from_user.first_name else "صديقنا"
            text = (
                f"╭━━━〔 **NUMBER SMS & KING SMM** 〕━━━╮\n"
                f"🛍️ أهلاً بك يا **{user_name}** في المتجر الأقوى للأرقام الوهمية والتفعيلات وخدمات الرشق (نظام الملك)!\n\n"
                f"👤 • معرفك (ID): `{user_id}`\n"
                f"💵 • رصيدك الحالي: **{bal_usd:.2f} {CURRENCY} | {bal_rub:.1f} ₽**\n"
                f"⚡ • حالة السيرفرات: **جاهزة ونشطة 100%**\n"
                f"👑 • نظام الرشق: **نظام الملك (تسليم فوري وسرعة 100K)**\n"
                f"╰━━━━━━━━━━━━━━━━━╯\n\n"
                f"👇 **تفضل باختيار القسم المطلوب من القائمة أدناه:**"
            )
            markup = build_main_keyboard(user_id)
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data == "btn_main_channel":
            ch = MAIN_CHANNEL_URL or get_forced_channel()
            markup = types.InlineKeyboardMarkup()
            if ch:
                c_url = ch if ch.startswith("http") else f"https://t.me/{ch.lstrip('@')}"
                markup.add(types.InlineKeyboardButton("📢 فتح القناة الرسمية", url=c_url))
            markup.add(types.InlineKeyboardButton("🔙 العودة للرئيسية", callback_data="back_to_main"))
            ch_msg = f"📢 **قناة البوت الرسمية:**\nتابع أحدث التحديثات والعروض الحصرية هنا:\n{ch or '@YasNumChannel'}"
            safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=ch_msg, reply_markup=markup)

        elif data == "btn_instructions":
            inst = INSTRUCTIONS_CHANNEL_URL
            markup = types.InlineKeyboardMarkup()
            if inst:
                i_url = inst if inst.startswith("http") else f"https://t.me/{inst.lstrip('@')}"
                markup.add(types.InlineKeyboardButton("📚 فتح قناة الشروحات", url=i_url))
            markup.add(types.InlineKeyboardButton("🔙 العودة للرئيسية", callback_data="back_to_main"))
            guide_text = (
                "📚 **دليل الاستخدام السريع:**\n\n"
                "1️⃣ **شراء رقم وهمي:** اختر (شراء رقم) ثم حدد التطبيق والدولة والسيرفر المناسب.\n"
                "2️⃣ **استلام كود SMS:** سيظهر الكود على الشاشة تلقائياً وانسخه بضغطة زر.\n"
                "3️⃣ **استرجاع فوري:** إذا لم يصل الكود خلال المهلة يُلغى الطلب ويُسترجع رصيدك 100%.\n"
                "4️⃣ **خدمات الرشق:** اختر منصة الرشق (تيليجرام، انستغرام، إلخ) وأدخل الرابط والكمية."
            )
            safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=guide_text, reply_markup=markup)

        # ----------------- قسم خدمات الرشق (نظام الملك) -----------------
        elif data == "btn_services_games":
            markup = build_smm_categories_keyboard()
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text="👑 **قسم خدمات الرشق وشحن الألعاب (نظام الملك المعتمد):**\n\nاختر القسم أو المنصة المطلوبة للمتابعة:",
                reply_markup=markup
            )

        elif data == "smm_sec_tg":
            markup = build_smm_section_services_keyboard("رشق تيليجرام")
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text="🟢 **خدمات رشق تيليجرام (نظام الملك السريع):**\n\nاختر الخدمة المطلوبة:",
                reply_markup=markup
            )

        elif data == "smm_sec_ig":
            markup = build_smm_section_services_keyboard("رشق إنستغرام")
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text="🟣 **خدمات رشق إنستغرام (نظام الملك السريع):**\n\nاختر الخدمة المطلوبة:",
                reply_markup=markup
            )

        elif data == "smm_sec_tt":
            markup = build_smm_section_services_keyboard("رشق تيك توك")
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text="⚫ **خدمات رشق تيك توك (نظام الملك السريع):**\n\nاختر الخدمة المطلوبة:",
                reply_markup=markup
            )

        elif data == "smm_sec_games":
            markup = build_smm_section_services_keyboard("شحن الألعاب")
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text="🎮 **خدمات شحن الألعاب المباشرة بالـ ID:**\n\nاختر اللعبة المطلوبة:",
                reply_markup=markup
            )

        elif data.startswith("smm_king_start_"):
            smm_id = data.replace("smm_king_start_", "")
            smm_info = catalog.SMM_SERVICES.get(smm_id)
            if not smm_info:
                return

            # تعيين الحالة لانتظار الرابط
            user_states[str(user_id)] = {
                "action": "king_smm_await_link",
                "smm_id": smm_id
            }

            # عرض البطاقة الكاملة بالمواصفات المطابقة للنموذج
            king_text = build_smm_service_card_text(smm_info)
            
            cancel_markup = types.InlineKeyboardMarkup().add(
                types.InlineKeyboardButton("🔙 إلغاء والعودة للأقسام", callback_data="btn_services_games")
            )
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=king_text,
                reply_markup=cancel_markup
            )

        elif data.startswith("king_confirm_"):
            confirm_key = data.replace("king_confirm_", "")
            state_key = f"confirm_{confirm_key}"
            order_data = user_states.pop(state_key, None)
            
            if not order_data:
                safe_send_message(chat_id, "⚠️ انتهت صلاحية هذا الطلب أو تم تنفيذه بالفعل. يرجى البدء من جديد.")
                return

            smm_id = order_data["smm_id"]
            target_link = order_data["target_link"]
            qty = order_data["qty"]
            total_cost = order_data["total_cost"]
            smm_info = catalog.SMM_SERVICES.get(smm_id)
            
            # فحص الرصيد النهائي
            bal_usd, _, _, _, _, _ = get_or_create_user(user_id)
            if bal_usd < total_cost and str(user_id) != str(ADMIN_ID):
                safe_send_message(chat_id, f"❌ رصيدك غير كافٍ لإتمام العملية. التكلفة: ${total_cost:.5f}، رصيدك: ${bal_usd:.2f}")
                return

            # خصم المبلغ من المحفظة
            update_user_balance(user_id, -total_cost)

            # توليد رقم الطلب والرقم السري
            order_id = random.randint(10000, 99999)
            secret_id = random.randint(100000, 999999)

            # حفظ الطلب في قاعدة البيانات
            create_smm_order_record(
                order_id=order_id,
                secret_id=secret_id,
                user_id=user_id,
                service_id=smm_id,
                service_title=smm_info['title'],
                target_link=target_link,
                quantity=qty,
                cost_usd=total_cost
            )

            # إشعار المدير بالطلب الجديد
            try:
                admin_alert = (
                    f"👑 **طلب رشق جديد بنظام الملك!**\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🔔 • رقم الطلب : `#{order_id}`\n"
                    f"🔑 • الرقم السري : `{secret_id}`\n"
                    f"👤 • المستخدم : `{user_id}` (@{call.from_user.username or 'بدون'})\n"
                    f"🛍️ • الخدمة : **{smm_info['title']}**\n"
                    f"🔢 • الكمية : `{qty}`\n"
                    f"💰 • السعر الكلي : **${total_cost:.5f}**\n"
                    f"🔗 • الرابط : `{target_link}`\n"
                    f"━━━━━━━━━━━━━━━━━━"
                )
                safe_send_message(ADMIN_ID, admin_alert)
            except Exception:
                pass

            # عرض رسالة إتمام الطلب الدقيقة المطابقة للنموذج
            success_order_text = (
                f"- تم تنفيذ الطلب بنجاح !\n\n"
                f": الخدمة : {smm_info['title']}\n\n"
                f": الكمية : {qty}\n\n"
                f": السعر الكلي : ${total_cost:.5f}\n\n"
                f": رقم الطلب : {order_id}\n\n"
                f"ID : الرقم السري: {secret_id}\n\n"
                f"الرابط : {target_link}\n\n"
                f"حالة الطلب في الاسفل ++\n\n"
                f"العدد المطلوب : {qty}\n\n"
                f": العدد المكتمل : 0\n\n"
                f": العدد المتبقي : {qty}\n\n"
                f"الحاله في الانتضار -\n\n"
                f": تحديث حالة الطلب عبر زر [ التحديث ] في الاسفل."
            )

            order_markup = types.InlineKeyboardMarkup(row_width=1)
            order_markup.add(types.InlineKeyboardButton("🔄 تحديث الطلب", callback_data=f"king_refresh_{order_id}"))
            order_markup.add(types.InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="back_to_main"))

            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=success_order_text,
                reply_markup=order_markup
            )

        elif data.startswith("king_refresh_"):
            order_id = data.replace("king_refresh_", "")
            row = get_smm_order(order_id)
            if not row:
                bot.answer_callback_query(call.id, "❌ لم يتم العثور على بيانات هذا الطلب.", show_alert=True)
                return

            _, secret_id, uid, s_id, s_title, t_link, qty, completed, remains, cost, status, created_at = row

            # محاكاة ديناميكية لتقدم التنفيذ الواقعي أو فحص السيرفر
            if completed < qty:
                # محاكاة تقدم سرعة الرشق بحسب الوقت المنقضي
                increment = max(1, int(qty * 0.25))
                new_completed = min(qty, completed + increment)
                new_remains = max(0, qty - new_completed)
                new_status = "مكتمل بنجاح ✔️" if new_remains == 0 else "قيد التنفيذ ⏳"
                update_smm_order_progress(order_id, new_completed, new_remains, new_status)
                completed = new_completed
                remains = new_remains
                status = new_status

            updated_text = (
                f"- تفاصيل الطلب المحدثة بنجاح !\n\n"
                f": الخدمة : {s_title}\n\n"
                f": الكمية : {qty}\n\n"
                f": السعر الكلي : ${cost:.5f}\n\n"
                f": رقم الطلب : {order_id}\n\n"
                f"ID : الرقم السري: {secret_id}\n\n"
                f"الرابط : {t_link}\n\n"
                f"حالة الطلب في الاسفل ++\n\n"
                f"العدد المطلوب : {qty}\n\n"
                f": العدد المكتمل : {completed}\n\n"
                f": العدد المتبقي : {remains}\n\n"
                f"الحالة: {status}\n\n"
                f": تم التحديث في: {datetime.datetime.now().strftime('%H:%M:%S')}"
            )

            order_markup = types.InlineKeyboardMarkup(row_width=1)
            if remains > 0:
                order_markup.add(types.InlineKeyboardButton("🔄 تحديث الطلب", callback_data=f"king_refresh_{order_id}"))
            order_markup.add(types.InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="back_to_main"))

            try:
                bot.edit_message_text(
                    chat_id=chat_id,
                    message_id=call.message.message_id,
                    text=updated_text,
                    reply_markup=order_markup
                )
            except Exception:
                pass

            bot.answer_callback_query(call.id, f"✅ تم التحديث! المكتمل: {completed} / {qty}", show_alert=True)

        # ----------------- مركز تحويل الرصيد والقسائم -----------------
        elif data in ["btn_transfer_balance", "btn_transfer_hub"]:
            hub_text = (
                f"╭━━━━〔 🔄 **مركز تحويل وشحن الرصيد** 〕━━━━╮\n"
                f"💰 • **رصيدك الحالي:** **{bal_usd:.2f} $** | **{bal_rub:.1f} ₽**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"✨ **المميزات المتاحة:**\n"
                f"🔹 تحويل فوري لأي مستخدم داخل البوت عبر المعرف (ID) مجاناً 100%.\n"
                f"🔹 إنشاء قسائم وهدايا برابط مباشر يمكن إهداؤه لأي شخص.\n"
                f"🔹 شحن واسترداد قسائم الرصيد بضغطة زر.\n"
                f"🔹 تحويل وصرف العملات بين ($) و (₽) بسعر الصرف الرسمي.\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👇 **اختر العملية التي تريد تنفيذها:**"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton("👤 تحويل مباشر إلى آيدي (ID) [مجاني 0%]", callback_data="tf_direct_id"),
                types.InlineKeyboardButton("🎁 إنشاء قسيمة شحن / كود هدية برابط", callback_data="tf_create_voucher"),
                types.InlineKeyboardButton("🎟️ شحن واسترداد كود قسيمة", callback_data="tf_redeem_voucher"),
                types.InlineKeyboardButton("💱 صرف وتحويل العملة ($ ⇄ ₽)", callback_data="tf_exchange_currency"),
                types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main")
            )
            safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=hub_text, reply_markup=markup)

        elif data == "tf_direct_id":
            user_states[str(user_id)] = {"action": "transfer_step_1_id"}
            text = (
                f"👤 **التحويل المباشر إلى آيدي (ID):**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"💵 • رصيدك المتوفر: **{bal_usd:.2f} $**\n"
                f"✨ • العمولة: **0% (مجاني تماماً)**\n\n"
                f"👉 **أرسل الآن معرف (ID) المستخدم المراد التحويل له:**"
            )
            bot.send_message(chat_id, text)

        elif data == "tf_create_voucher":
            user_states[str(user_id)] = {"action": "voucher_create_amount"}
            text = (
                f"🎁 **إنشاء قسيمة شحن / رابط هدية:**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"💵 • رصيدك المتوفر: **{bal_usd:.2f} $**\n\n"
                f"👉 **أرسل الآن المبلغ المراد تخصيصه للقسيمة بالدولار (مثال: 1 أو 5):**"
            )
            bot.send_message(chat_id, text)

        elif data == "tf_redeem_voucher":
            user_states[str(user_id)] = {"action": "voucher_redeem_code"}
            text = (
                f"🎟️ **شحن واسترداد كود القسيمة:**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👉 **أرسل الآن كود القسيمة (مثال: VCH-ABC123XY):**"
            )
            bot.send_message(chat_id, text)

        elif data == "tf_exchange_currency":
            rate_text = (
                f"💱 **صرف وتحويل العملة الداخلية:**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"💵 • رصيدك بالدولار: **{bal_usd:.2f} $**\n"
                f"🪙 • رصيدك بالروبل: **{bal_rub:.1f} ₽**\n"
                f"📊 • سعر الصرف المعتمد: **1 دولار = {RUB_PER_USD:.0f} روبل**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"اختر عملية الصرف المطلوبة:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton(f"تحويل كل الرصيد إلى الروبل (₽)", callback_data="do_exchange_to_rub"),
                types.InlineKeyboardButton(f"تحويل كل الرصيد إلى الدولار ($)", callback_data="do_exchange_to_usd"),
                types.InlineKeyboardButton("🔙 عودة لمركز التحويل", callback_data="btn_transfer_hub")
            )
            safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=rate_text, reply_markup=markup)

        elif data == "do_exchange_to_rub":
            if bal_usd <= 0:
                bot.answer_callback_query(call.id, "❌ ليس لديك رصيد دولار للتحويل!", show_alert=True)
                return
            rub_gain = bal_usd * RUB_PER_USD
            update_user_balance(user_id, -bal_usd, rub_gain)
            bot.answer_callback_query(call.id, f"✅ تم تحويل {bal_usd:.2f}$ إلى {rub_gain:.1f}₽ بنجاح!", show_alert=True)
            bal_usd, bal_rub, _, _, _, _ = get_or_create_user(user_id)
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=f"✅ **تم تحويل الرصيد بالكامل إلى روبل!**\n\nرصيدك الآن: **{bal_rub:.1f} ₽** ({bal_usd:.2f} $)",
                reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 عودة لمركز التحويل", callback_data="btn_transfer_hub"))
            )

        elif data == "do_exchange_to_usd":
            if bal_rub <= 0:
                bot.answer_callback_query(call.id, "❌ ليس لديك رصيد روبل للتحويل!", show_alert=True)
                return
            usd_gain = bal_rub / RUB_PER_USD
            update_user_balance(user_id, usd_gain, -bal_rub)
            bot.answer_callback_query(call.id, f"✅ تم تحويل {bal_rub:.1f}₽ إلى {usd_gain:.2f}$ بنجاح!", show_alert=True)
            bal_usd, bal_rub, _, _, _, _ = get_or_create_user(user_id)
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=f"✅ **تم تحويل الرصيد بالكامل إلى دولار!**\n\nرصيدك الآن: **{bal_usd:.2f} $** ({bal_rub:.1f} ₽)",
                reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 عودة لمركز التحويل", callback_data="btn_transfer_hub"))
            )

        # ----------------- شحن الرصيد اليدوي للأدمن -----------------
        elif data == "admin_prompt_add_bal":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_add_target"}
            bot.send_message(chat_id, "➕ **أرسل الآن معرف (User ID) الشخص المراد شحن الرصيد له:**")

        elif data == "admin_prompt_sub_bal":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_sub_target"}
            bot.send_message(chat_id, "➖ **أرسل الآن معرف (User ID) الشخص المراد خصم الرصيد منه:**")

        # ----------------- قسم الشحن والدفع -----------------
        elif data == "btn_deposit":
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(types.InlineKeyboardButton("📱 محفظة جيب (Jeeb) - شحن فوري", callback_data="pay_jeeb"))
            markup.add(types.InlineKeyboardButton("🏦 بنك الكريمي (حساب يمني / دولار)", callback_data="pay_kuraimi"))
            markup.add(types.InlineKeyboardButton("🪙 منصة بينانس (Binance Pay ID)", callback_data="pay_binance"))
            markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
            
            deposit_text = (
                f"╭━━〔 **قسم شحن الرصيد** 〕━━╮\n"
                f"💳 **اختر وسيلة الدفع المناسبة لك لشحن محفظتك:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"💵 • سعر الصرف في البوت: **1 دولار = {RUB_PER_USD:.0f} روبل**\n"
                f"⚡ • يتوفر دعم الإيداع الفوري التلقائي.\n"
                f"╰━━━━━━━━━━━━━━━━━╯"
            )
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=deposit_text, reply_markup=markup)

        elif data == "pay_jeeb":
            info = PAYMENT_INFO["jeeb"]
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(types.InlineKeyboardButton("⚡ تأكيد وتفعيل الدفع التلقائي", callback_data="confirm_pay_jeeb"))
            markup.add(types.InlineKeyboardButton("💬 مراسلة الدعم الفني للإشعار اليدوي", url=get_support_url()))
            markup.add(types.InlineKeyboardButton("🔙 عودة لقائمة وسائل الدفع", callback_data="btn_deposit"))
            
            text = (
                f"📱 **الدفع عبر محفظة جيب (Jeeb):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔢 • **الرقم البديل للمحفظة :** `{info['acc']}`\n"
                f"👤 • **الاسم المعتمد :** **{info['name']}**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📌 **طريقة الشحن:**\n"
                f"1. حول المبلغ المطلوب إلى الرقم البديل أعلاه.\n"
                f"2. اضغط على زر **(⚡ تأكيد وتفعيل الدفع التلقائي)** وأرسل رقم العملية وسيتم شحن رصيدك تلقائياً!"
            )
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data == "pay_kuraimi":
            info = PAYMENT_INFO["kuraimi"]
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(types.InlineKeyboardButton("💬 إرسال إشعار التحويل للإدارة", url=get_support_url()))
            markup.add(types.InlineKeyboardButton("🔙 عودة لقائمة وسائل الدفع", callback_data="btn_deposit"))
            
            text = (
                f"🏦 **الدفع عبر بنك الكريمي المميز:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔢 • **رقم الحساب :** `{info['acc']}`\n"
                f"👤 • **الاسم :** **{info['name']}**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📸 بعد التحويل، أرسل صورة الإشعار مع معرفك (`{user_id}`) للدعم الفني وسيتم إضافة الرصيد فوراً."
            )
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data == "pay_binance":
            info = PAYMENT_INFO["binance"]
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(types.InlineKeyboardButton("⚡ تأكيد وتفعيل الدفع التلقائي", callback_data="confirm_pay_binance"))
            markup.add(types.InlineKeyboardButton("💬 إرسال إشعار التحويل للإدارة", url=get_support_url()))
            markup.add(types.InlineKeyboardButton("🔙 عودة لقائمة وسائل الدفع", callback_data="btn_deposit"))
            
            text = (
                f"🪙 **الدفع عبر بينانس (Binance Pay ID):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔢 • **Binance Pay ID :** `{info['acc']}`\n"
                f"👤 • **الاسم المعتمد :** **{info['name']}**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📌 **طريقة الشحن:**\n"
                f"1. ادخل على تطبيق Binance واختر Pay ثم أدخل الـ ID أعلاه وأرسل مبلغ USDT المطلوب.\n"
                f"2. اضغط على زر **(⚡ تأكيد وتفعيل الدفع التلقائي)** وأرسل رقم العملية."
            )
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data == "confirm_pay_jeeb":
            user_states[str(user_id)] = {"action": "verify_auto_payment", "method": "jeeb"}
            bot.send_message(chat_id, "📱 **أرسل الآن رقم العملية أو رقم المرجع الخاص بالتحويل في محفظة جيب:**")

        elif data == "confirm_pay_binance":
            user_states[str(user_id)] = {"action": "verify_auto_payment", "method": "binance"}
            bot.send_message(chat_id, "🪙 **أرسل الآن رقم العملية (Order ID / Pay ID) الخاص بتحويل بينانس:**")

        # ----------------- مسارات تصفح التطبيقات والسيرفرات -----------------
        elif data == "btn_buy_number":
            markup = build_apps_keyboard()
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text="╭━━━〔 **NUMBER SMS** 〕━━━╮\n📱 **اختر التطبيق الذي ترغب في تفعيله:**\n╰━━━━━━━━━━━━━━━━━╯",
                reply_markup=markup
            )

        elif data == "btn_offers_wa":
            text = (
                f"╭━━━〔 💬 **عروض واتساب WHATSAPP** 〕━━━╮\n"
                f"🔥 **اختر السيرفر المناسب لتفعيل واتساب بأفضل سعر وسرعة وصول كود:**\n"
                f"━━━━━━━━━━━━━━━━━━"
            )
            markup = build_servers_keyboard("wa")
            safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data == "btn_ready_tg" or data.startswith("page_tg_ready_"):
            page = 0
            if data.startswith("page_tg_ready_"):
                try:
                    page = int(data.replace("page_tg_ready_", ""))
                except Exception:
                    page = 0
            tg_text = (
                "╭━━━〔 ✈️ **أرقام وحسابات TELEGRAM جاهزة (موقع TG)** 〕━━━╮\n"
                "🌟 **قسم الحسابات والأرقام الجاهزة للتسليم الفوري التلقائي:**\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "🔹 يتم سحب جميع الدول والأسعار وتوفر المخزون تلقائياً من موقع TG المباشر.\n"
                "🔹 حسابات تيليجرام جاهزة ومفعلة مع كود الجلسة الفوري (Tdata / Session).\n"
                "🔹 تسليم فوري لبيانات الدخول بدون انتظار كود SMS وبدون مخاطر الحظر.\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "👇 **اختر الدولة ونوع الحساب المطلوب للشراء فوراً:**"
            )
            markup, total_count = build_tg_ready_page_keyboard(page=page)
            safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=tg_text, reply_markup=markup)

        elif data == "prompt_search_tg_ready":
            user_states[str(user_id)] = {"action": "search_tg_ready_country"}
            bot.send_message(chat_id, "🔍 **أرسل الآن اسم الدولة التي تبحث عنها في حسابات موقع TG (مثال: اليمن، السعودية، أمريكا، بريطانيا):**")

        elif data.startswith("tg_acc_buy_"):
            acc_id = data.replace("tg_acc_buy_", "")
            tg_catalog = get_live_tg_ready_catalog()
            acc_info = tg_catalog.get(acc_id)
            if not acc_info:
                bot.send_message(chat_id, "❌ الحساب المختار غير متوفر حالياً في مخزون موقع TG.")
                return
            
            price_usd = acc_info["price_usd"]
            price_rub = acc_info["price_rub"]
            country_code = acc_info.get("code", "")
            
            if bal_usd < price_usd and str(user_id) != str(ADMIN_ID):
                bot.send_message(
                    chat_id,
                    f"❌ **رصيدك غير كافٍ لشراء هذا الحساب!**\n\n• السعر: **{price_usd:.2f} $** ({price_rub:.1f} ₽)\n• رصيدك الحالي: **{bal_usd:.2f} $**\n👉 يرجى شحن رصيدك أولاً.",
                    reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🎳 شحن الرصيد", callback_data="btn_deposit"))
                )
                return
                
            # الاتصال الحي بموقع TG لشراء الرقم وتخصيصه فوراً
            num_res = None
            if country_code:
                num_res = tg_lion_request("getNumber", {"country_code": country_code})
                
            if num_res and num_res.get("status") == "ok":
                phone_num = str(num_res.get("Number", ""))
                c_name_api = num_res.get("name", acc_info['country'])
                update_user_balance(user_id, -price_usd, -price_rub)
                order_num = f"TG{int(time.time())}"
                
                deliv_text = (
                    f"╭━━〔 ✈️ **TELEGRAM NUMBER - موقع TG** 〕━━╮\n"
                    f"🎉 **تم شراء رقم التيليجرام بنجاح من موقع TG!**\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🔔 • **رقم الطلب :** `{order_num}`\n"
                    f"🌍 • **الدولة :** **{c_name_api}**\n"
                    f"📱 • **رقم الهاتف :** `{phone_num}`\n"
                    f"💰 • **السعر :** **{price_usd:.2f} $** ({price_rub:.1f} ₽)\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"📌 **خطوات تسجيل الدخول:**\n"
                    f"1. افتح تطبيق Telegram وأدخل الرقم: `{phone_num}`\n"
                    f"2. اضغط على زر **(📥 طلب كود الدخول وكلمة السر)** أدناه لاستلام الكود فوراً!"
                )
                fin_markup = types.InlineKeyboardMarkup(row_width=1)
                fin_markup.add(
                    types.InlineKeyboardButton("📥 طلب كود الدخول وكلمة السر (Get Code)", callback_data=f"tglion_code_{phone_num}"),
                    types.InlineKeyboardButton("🔄 تحديث حالة الكود", callback_data=f"tglion_code_{phone_num}"),
                    types.InlineKeyboardButton("✈️ تصفح حسابات موقع TG", callback_data="btn_ready_tg"),
                    types.InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="back_to_main")
                )
                safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=deliv_text, reply_markup=fin_markup)
            else:
                # في حال تعذر التزويد الحي من موقع TG
                err_msg = num_res.get("message", "نفذت أرقام هذه الدولة من موقع TG حالياً.") if isinstance(num_res, dict) else "نفذت الأرقام مؤقتاً."
                bot.send_message(
                    chat_id,
                    f"⚠️ **تنبيه موقع TG:**\n{err_msg}\n👉 يرجى اختيار دولة أخرى أو المحاولة لاحقاً.",
                    reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("✈️ تصفح باقي الدول في TG", callback_data="btn_ready_tg"))
                )

        elif data.startswith("tglion_code_"):
            phone_num = data.replace("tglion_code_", "").strip()
            code_res = tg_lion_request("getCode", {"number": phone_num})
            if code_res and code_res.get("status") == "ok":
                login_code = str(code_res.get("code", "")).strip()
                two_fa_pass = str(code_res.get("pass", "")).strip()
                
                if login_code:
                    code_reply = (
                        f"╭━━〔 🔑 **كود تيليجرام - موقع TG** 〕━━╮\n"
                        f"📱 • **الرقم :** `{phone_num}`\n"
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"⚡ • **كود التحقق (Code):** `{login_code}`\n"
                    )
                    if two_fa_pass:
                        code_reply += f"🔐 • **كلمة سر التحقق بخطوتين (2FA):** `{two_fa_pass}`\n"
                    code_reply += (
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"✅ تم سحب الكود بنجاح من موقع TG! مبروك الحساب."
                    )
                    fin_markup = types.InlineKeyboardMarkup(row_width=1)
                    fin_markup.add(
                        types.InlineKeyboardButton("🔄 إعادة طلب الكود", callback_data=f"tglion_code_{phone_num}"),
                        types.InlineKeyboardButton("🔙 العودة لقائمة حسابات TG", callback_data="btn_ready_tg")
                    )
                    safe_edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=code_reply, reply_markup=fin_markup)
                else:
                    bot.answer_callback_query(call.id, "⏳ لم يصل كود التحقق بعد من تيليجرام. أرسل طلب الكود في التطبيق ثم أعد المحاولة.", show_alert=True)
            else:
                bot.answer_callback_query(call.id, "⏳ جاري انتظار وصول الكود من موقع TG... حاول مجدداً بعد لحظات.", show_alert=True)

        elif data.startswith("srv_"):
            app_code = data.replace("srv_", "")
            app_info = catalog.SERVICES.get(app_code, catalog.SERVICES["wa"])
            
            text = (
                f"• **التطبيق المختار : {app_info['name']}**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"اختر السيرفر المناسب لك أدناه:"
            )
            markup = build_servers_keyboard(app_code)
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data.startswith("page_"):
            parts = data.split("_")
            app_code = parts[1]
            server_key = parts[2]
            page = int(parts[3])
            
            app_info = catalog.SERVICES.get(app_code, catalog.SERVICES["wa"])
            srv_info = catalog.SERVERS.get(server_key, catalog.SERVERS["s1"])
            
            text = (
                f"╭━━〔 **NUMBER SMS** 〕━━╮\n"
                f"📱 **التطبيق :** {app_info['name']}\n"
                f"🧩 **السيرفر :** {srv_info['title']}\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر الدولة المطلوبة من القائمة:"
            )
            markup = build_countries_page_keyboard(app_code, server_key, page)
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data.startswith("prompt_search_country_"):
            parts = data.split("_")
            app_code = parts[3]
            server_key = parts[4] if len(parts) > 4 else "s1"
            user_states[str(user_id)] = {"action": "search_country_for_app", "app_code": app_code, "server_key": server_key}
            bot.send_message(chat_id, "🔍 **أرسل الآن اسم الدولة أو رمز مفتاحها (مثال: اليمن، السعودية، مصر، أو 967):**")

        elif data.startswith("card_"):
            parts = data.split("_")
            app_code = parts[1]
            server_key = parts[2]
            c_id = parts[3]
            page = int(parts[4]) if len(parts) > 4 else 0
            
            app_info = catalog.SERVICES.get(app_code, catalog.SERVICES["wa"])
            srv_info = catalog.SERVERS.get(server_key, catalog.SERVERS["s1"])
            c_info = get_country_info_dynamic(c_id)
            provider_name = srv_info["provider"]
            
            # جلب السعر اللحظي مع هامش ربح 30%
            final_rub, final_usd = get_server_price(provider_name, app_info['code'], app_info.get("fivesim_code", "other"), c_id, c_info["name"])
            
            text = (
                f"➕ **شراء رقم جديد ✅**\n\n"
                f"➖ **💻 التطبيق | {app_info['short']}**\n"
                f"➖ **🌍 الدولة | {c_info['title']} {c_info['flag']}**\n"
                f"➖ **🔢 مفتاح الدولة | +{c_info['prefix']} 💚**\n"
                f"➖ **🧩 السيرفر | {srv_info['badge']}**\n"
                f"━━━━━━━━━━━━━━━━━━"
            )
            
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("🎲 السعر ₽", callback_data="noop"),
                types.InlineKeyboardButton("🧩 السيرفر", callback_data="noop")
            )
            markup.add(
                types.InlineKeyboardButton(f"{final_rub} ₽ | {final_usd:.2f} $", callback_data=f"exec_buy_{app_code}_{server_key}_{c_id}_{page}"),
                types.InlineKeyboardButton(f"1 {c_info['flag']} {c_info['title']}", callback_data=f"exec_buy_{app_code}_{server_key}_{c_id}_{page}")
            )
            markup.add(types.InlineKeyboardButton("✤ ↩️ عودة لقائمة الدول ✤", callback_data=f"page_{app_code}_{server_key}_{page}"))
            
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=text, reply_markup=markup)

        elif data.startswith("exec_buy_"):
            parts = data.split("_")
            app_code = parts[2]
            server_key = parts[3]
            c_id = parts[4]
            page = int(parts[5]) if len(parts) > 5 else 0
            
            app_info = catalog.SERVICES.get(app_code, catalog.SERVICES["wa"])
            srv_info = catalog.SERVERS.get(server_key, catalog.SERVERS["s1"])
            c_info = get_country_info_dynamic(c_id)
            provider_name = srv_info["provider"]
            
            final_rub, final_usd = get_server_price(provider_name, app_info['code'], app_info.get("fivesim_code", "other"), c_id, c_info["name"])
            
            if bal_usd < final_usd and bal_rub < final_rub and str(user_id) != str(ADMIN_ID):
                msg_text = (
                    f"❌ **عذراً، رصيد محفظتك غير كافٍ!**\n\n"
                    f"• سعر الرقم: **{final_rub} ₽ ({final_usd:.2f} $)**\n"
                    f"• رصيدك الحالي: **{bal_usd:.2f} $**\n\n"
                    f"👉 يرجى شحن رصيدك عبر قسم **🎳 شحن الرصيد**."
                )
                bot.send_message(chat_id, msg_text, reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🎳 شحن الرصيد", callback_data="btn_deposit")))
                return

            success, result = buy_server_number(provider_name, app_info, c_info, c_id)
            
            if success:
                update_user_balance(user_id, -final_usd, -final_rub)
                
                order_id = result['id']
                phone = result['phone']
                now = datetime.datetime.now()
                expire = now + datetime.timedelta(minutes=18)
                
                time_now_str = now.strftime("%H:%M | %Y-%m-%d")
                time_exp_str = expire.strftime("%H:%M | %Y-%m-%d")
                cost_str = f"{final_rub} ₽ ({final_usd:.2f} $)"
                
                order_text = (
                    f"╭━━〔 **NUMBER SMS** 〕━━╮\n"
                    f"💙 **تم شراء الرقم بنجاح**\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🔔 • رقم الطلب : `{order_id}`\n"
                    f"🌍 • الدولة : **{c_info['title']} {c_info['flag']}**\n"
                    f"☎️ • الرقم : `+{phone}`\n"
                    f"🔑 • الكود : **قيد الانتظار ⏳**\n"
                    f"🔎 • الحالة : **RECEIVED 🔎**\n"
                    f"🛍️ • التطبيق : **{app_info['short']}**\n"
                    f"🏷️ • السعر : **{cost_str}**\n\n"
                    f"📫 • انشاء : `{time_now_str}`\n"
                    f"📬 • انتهاء : `{time_exp_str}`\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"📋 **انتظر، قد يستغرق وصول الكود بضع ثوانٍ**"
                )
                
                order_markup = types.InlineKeyboardMarkup(row_width=1)
                order_markup.add(types.InlineKeyboardButton("✤ 🔄 تغيير الرقم ✤", callback_data=f"change_num_{order_id}_{app_code}_{server_key}_{c_id}_{page}"))
                order_markup.add(types.InlineKeyboardButton("✤ 📩 طلب الكود ✤", callback_data=f"check_code_{order_id}_{provider_name}"))
                if app_code == "wa":
                    order_markup.add(types.InlineKeyboardButton("• تحقق من الرقم في WhatsApp ↗️ •", url=f"https://wa.me/{phone}"))
                order_markup.add(types.InlineKeyboardButton("✤ ❌ إلغاء الطلب ✤", callback_data=f"cancel_num_{order_id}_{phone}"))
                
                bot.edit_message_text(
                    chat_id=chat_id,
                    message_id=call.message.message_id,
                    text=order_text,
                    reply_markup=order_markup
                )
                
                t = threading.Thread(
                    target=monitor_sms_code,
                    args=(chat_id, call.message.message_id, order_id, phone, app_info['short'], f"{c_info['title']} {c_info['flag']}", cost_str, time_now_str, time_exp_str, final_usd, final_rub, user_id, provider_name),
                    daemon=True
                )
                t.start()
            else:
                bot.send_message(chat_id, f"❌ **تعذر حجز الرقم من المزود:**\n{result}\n\n👉 يرجى تجربة دولة أخرى أو سيرفر آخر.")

        elif data.startswith("cancel_num_"):
            parts = data.split("_")
            order_id = parts[2]
            phone = parts[3]
            
            order_info = active_orders.get(order_id)
            if order_info:
                provider_name = order_info.get("provider", "fivesim")
                set_server_status(provider_name, order_id, 8)
                update_user_balance(user_id, order_info["cost_usd"], order_info["cost_rub"])
                active_orders.pop(order_id, None)
                
                safe_edit_message_text(
                    chat_id=chat_id,
                    message_id=call.message.message_id,
                    text=f"⚠️ **تم إلغاء طلب الرقم `+{phone}` بنجاح!**\n\n✅ تم استرجاع كامل المبلغ ({order_info['cost_usd']:.2f} $) إلى رصيد محفظتك فوراً.",
                    reply_markup=types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("☎️ شراء رقم آخر", callback_data="btn_buy_number"))
                )
            else:
                bot.send_message(chat_id, "⚠️ هذا الطلب تم إلغاؤه أو استبداله مسبقاً.")

        elif data.startswith("change_num_"):
            parts = data.split("_")
            old_order_id = parts[2]
            app_code = parts[3]
            server_key = parts[4]
            c_id = parts[5]
            page = parts[6] if len(parts) > 6 else "0"
            
            order_info = active_orders.get(old_order_id)
            if order_info:
                # استبدال فوري تلقائي: إلغاء الطلب القديم واسترجاع رصيده دون الحاجة لأي انتظار
                provider_name = order_info.get("provider", "fivesim")
                set_server_status(provider_name, old_order_id, 8)
                update_user_balance(user_id, order_info["cost_usd"], order_info["cost_rub"])
                active_orders.pop(old_order_id, None)
                bot.send_message(chat_id, "🔄 **تم استبدال الرقم وإلغاء السابق واسترجاع رصيده تلقائياً! جارٍ حجز رقم بديل جديد لك الآن...**")
                
            router_callback(types.CallbackQuery(id="0", from_user=call.from_user, message=call.message, data=f"exec_buy_{app_code}_{server_key}_{c_id}_{page}", chat_instance=""))

        elif data.startswith("check_code_"):
            parts = data.split("_")
            order_id = parts[2]
            provider_name = parts[3] if len(parts) > 3 else "fivesim"
            
            if provider_name == "fivesim":
                resp = fivesim_check_order(order_id)
            elif provider_name == "grizzly":
                resp = grizzly_request({'action': 'getStatus', 'id': order_id})
            else:
                resp = hero_request({'action': 'getStatus', 'id': order_id})
                
            if resp.startswith("STATUS_OK:"):
                code = resp.split(":")[1]
                bot.send_message(chat_id, f"🎉 الكود المستلم: `{code}`")
            elif resp == "STATUS_WAIT_CODE":
                bot.send_message(chat_id, "⏳ الكود قيد الانتظار، لم يصل بعد من السيرفر...")
            else:
                bot.send_message(chat_id, f"الحالة: {resp}")

        elif data == "btn_my_account":
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(types.InlineKeyboardButton("🎳 شحن الرصيد", callback_data="btn_deposit"))
            markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
            bot.edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=f"🪪 **معلومات حسابك الشخصي:**\n\n• الاسم: **{call.from_user.first_name}**\n• المعرف (ID): `{user_id}`\n• الرصيد بالدولار: **{bal_usd:.2f} $**\n• الرصيد بالروبل: **{bal_rub:.1f} ₽**\n• سعر الصرف: **1$ = {RUB_PER_USD:.0f} ₽**\n• المشتريات: **{orders} رقم**",
                reply_markup=markup
            )

        # ----------------- لوحة تحكم الإدارة -----------------
        elif data == "btn_admin_panel":
            if str(user_id) != str(ADMIN_ID):
                return
            markup = build_admin_main_keyboard()
            bot.edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text="👑 **لوحة تحكم إدارة المتجر والمستخدمين والشحن اليدوي:**",
                reply_markup=markup
            )

        elif data in ["admin_settings_fivesim", "admin_check_fivesim"]:
            if str(user_id) != str(ADMIN_ID):
                return
            current_token = get_fivesim_key()
            token_display = (current_token[:25] + "..." + current_token[-15:]) if len(current_token) > 40 else current_token
            success, bal_val = fivesim_get_balance()
            if success:
                status_str = f"✅ **متصل بنجاح!**\n💰 • **رصيد الحساب:** `{bal_val}`"
            else:
                status_str = f"⚠️ **تنبيه الاتصال:** {bal_val}"
            
            panel_text = (
                f"⚡ **إعدادات وتشخيص مزود 5SIM (السيرفر 1):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔑 • **التوكن المضبوط حالياً (JWT Token):**\n`{token_display}`\n\n"
                f"📊 • **فحص الاتصال والرصيد الحي:**\n{status_str}\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 **يمكنك تحديث التوكن أو إعادة الفحص مباشرة:**"
            )
            fs_markup = types.InlineKeyboardMarkup(row_width=1)
            fs_markup.add(
                types.InlineKeyboardButton("🔑 تعديل توكن مزود 5SIM (Token)", callback_data="admin_set_fivesim_key"),
                types.InlineKeyboardButton("🔄 إعادة فحص الاتصال والرصيد الآن", callback_data="admin_settings_fivesim"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=panel_text,
                reply_markup=fs_markup
            )

        elif data == "admin_set_fivesim_key":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_fivesim_key"}
            safe_send_message(
                chat_id,
                "🔑 **أرسل الآن توكن API الخاص بموقع 5SIM بالكامل (JWT Token):**\n\n"
                "• يمكنك نسخه من إعدادات حسابك في 5sim.net ثم لصقه هنا مباشرة."
            )

        elif data in ["admin_settings_grizzly", "admin_check_grizzly"]:
            if str(user_id) != str(ADMIN_ID):
                return
            current_key = get_grizzly_key()
            res = grizzly_request({'action': 'getBalance'})
            if res.startswith("ACCESS_BALANCE:"):
                bal_val = res.split(":")[1]
                status_str = f"✅ **متصل بنجاح!**\n💰 • **رصيد الحساب:** `{bal_val} ₽`"
            elif "NO_KEY" in res or "BAD_KEY" in res:
                status_str = f"❌ **مفتاح API غير صالح أو غير موجود (NO_KEY).**"
            else:
                status_str = f"⚠️ **رد المزود:** `{res}`"
            
            panel_text = (
                f"🐻 **إعدادات وتشخيص مزود Grizzly SMS (السيرفر 2):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔑 • **مفتاح API المضبوط حالياً:**\n`{current_key}`\n\n"
                f"📊 • **فحص الاتصال والرصيد الحي:**\n{status_str}\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 **يمكنك تحديث مفتاح API أو إعادة الفحص مباشرة:**"
            )
            gz_markup = types.InlineKeyboardMarkup(row_width=1)
            gz_markup.add(
                types.InlineKeyboardButton("🔑 تعديل مفتاح مزود Grizzly SMS (Key)", callback_data="admin_set_grizzly_key"),
                types.InlineKeyboardButton("🔄 إعادة فحص الاتصال والرصيد الآن", callback_data="admin_settings_grizzly"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=panel_text,
                reply_markup=gz_markup
            )

        elif data == "admin_set_grizzly_key":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_grizzly_key"}
            safe_send_message(
                chat_id,
                "🔑 **أرسل الآن مفتاح API الخاص بموقع Grizzly SMS:**\n\n"
                "• يمكنك نسخه من لوحة تحكم حسابك في grizzlysms.com ثم لصقه هنا مباشرة."
            )

        elif data in ["admin_settings_hero", "admin_check_provider", "admin_check_hero"]:
            if str(user_id) != str(ADMIN_ID):
                return
            current_key = get_hero_key()
            res = hero_request({'action': 'getBalance'})
            if res.startswith("ACCESS_BALANCE:"):
                bal_val = res.split(":")[1]
                status_str = f"✅ **متصل بنجاح!**\n💰 • **رصيد الحساب:** `{bal_val} $`"
            elif "BAD_KEY" in res or "ERROR_KEY" in res:
                status_str = f"❌ **مفتاح API غير صالح أو غير موجود.**"
            elif "Permission denied" in res or "FORBIDDEN" in res:
                status_str = f"⚠️ **المفتاح الحالي غير مفعل أو مرفوض من المزود (Permission denied). يرجى تعديله بمفتاح شغال.**"
            else:
                status_str = f"⚠️ **رد المزود:** `{res}`"
            
            panel_text = (
                f"💳 **إعدادات وتشخيص مزود Hero SMS (السيرفر 3):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔑 • **مفتاح API المضبوط حالياً:**\n`{current_key}`\n\n"
                f"📊 • **فحص الاتصال والرصيد الحي:**\n{status_str}\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 **يمكنك تحديث مفتاح API أو إعادة الفحص مباشرة:**"
            )
            hero_markup = types.InlineKeyboardMarkup(row_width=1)
            hero_markup.add(
                types.InlineKeyboardButton("🔑 تعديل مفتاح مزود Hero SMS (Key)", callback_data="admin_set_hero_key"),
                types.InlineKeyboardButton("🔄 إعادة فحص الاتصال والرصيد الآن", callback_data="admin_settings_hero"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=panel_text,
                reply_markup=hero_markup
            )

        elif data == "admin_set_hero_key":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_hero_key"}
            safe_send_message(
                chat_id,
                "🔑 **أرسل الآن مفتاح API الخاص بموقع Hero SMS:**\n\n"
                "• يمكنك نسخه من لوحة تحكم حسابك في hero-sms.com ثم لصقه هنا مباشرة."
            )

        elif data == "admin_check_tg":
            if str(user_id) != str(ADMIN_ID):
                return
            current_url = get_tg_ready_url()
            current_key = get_tg_ready_key()
            test_res = test_tg_ready_connection()
            
            panel_text = (
                f"✈️ **إعدادات وتشخيص مزود تيليجرام الجاهز (TG Ready API):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔗 • **الرابط المضبوط حالياً:**\n`{current_url}`\n\n"
                f"🔑 • **مفتاح API المضبوط:**\n`{current_key if current_key else 'غير مدخل (يعمل بالوضع الاحتياطي الفوري)'}`\n\n"
                f"📊 • **فحص الاتصال وحالة المزود:**\n{test_res}\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 **يمكنك تحديث الرابط أو المفتاح متى ما أردت:**"
            )
            
            tg_markup = types.InlineKeyboardMarkup(row_width=1)
            tg_markup.add(
                types.InlineKeyboardButton("🔗 تعديل رابط موقع TG (URL)", callback_data="admin_set_tg_url"),
                types.InlineKeyboardButton("🔑 تعديل مفتاح API موقع TG (Key)", callback_data="admin_set_tg_key"),
                types.InlineKeyboardButton("🔄 إعادة فحص الاتصال الآن", callback_data="admin_check_tg"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            
            safe_edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=panel_text,
                reply_markup=tg_markup
            )

        elif data == "admin_set_tg_url":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_tg_url"}
            safe_send_message(
                chat_id,
                "✏️ **أرسل الآن رابط API مزود TG بالكامل (URL):**\n\n"
                "• مثال: `https://api.tg-ready.net/v1`"
            )

        elif data == "admin_set_tg_key":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_tg_key"}
            safe_send_message(
                chat_id,
                "🔑 **أرسل الآن مفتاح الـ API الخاص بموقع مزود TG:**"
            )

        elif data == "admin_view_users":
            if str(user_id) != str(ADMIN_ID):
                return
            users = get_all_users()
            total_users = len(users)
            total_balance = sum(u[3] for u in users) if users else 0.0
            
            user_list_text = f"👥 **إحصائيات وقائمة المستخدمين ({total_users}):**\n"
            user_list_text += f"💰 إجمالي الأرصدة الموزعة: **{total_balance:.2f} $**\n━━━━━━━━━━━━━━━━━━\n\n"
            
            markup = types.InlineKeyboardMarkup(row_width=1)
            for u in users[:15]:
                uid, uname, fname, ubal, ubanned, joined = u
                b_icon = "🚫" if ubanned else "👤"
                btn_title = f"{b_icon} {fname} | {ubal:.2f}$ | ID: {uid}"
                markup.add(types.InlineKeyboardButton(btn_title, callback_data=f"adm_userinfo_{uid}"))
                
            markup.add(types.InlineKeyboardButton("🔍 بحث عن مستخدم محدد برقم ID", callback_data="admin_search_user"))
            markup.add(types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel"))
            
            bot.edit_message_text(
                chat_id=chat_id,
                message_id=call.message.message_id,
                text=user_list_text + "👇 اضغط على أي مستخدم للتحكم به مباشرة:",
                reply_markup=markup
            )

        elif data.startswith("adm_userinfo_"):
            if str(user_id) != str(ADMIN_ID):
                return
            target_uid = data.replace("adm_userinfo_", "")
            user_info = get_single_user_info(target_uid)
            if not user_info:
                bot.send_message(chat_id, "❌ لم يتم العثور على المستخدم.")
                return
            uid, uname, fname, bal_usd, bal_rub, orders, is_banned, joined = user_info
            status_text = "🚫 محظور (مطرود)" if is_banned else "✅ نشط"
            card = (
                f"👤 **بطاقة التحكم بالمستخدم:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"• الاسم: **{fname}**\n"
                f"• المعرف (ID): `{uid}`\n"
                f"• اليوزر: @{uname if uname else 'بدون_يوزر'}\n"
                f"• الرصيد: **{bal_usd:.2f} $** ({bal_rub:.1f} ₽)\n"
                f"• المشتريات: **{orders} رقم**\n"
                f"• الحالة: **{status_text}**\n"
                f"• تاريخ الانضمام: `{joined}`\n"
                f"━━━━━━━━━━━━━━━━━━"
            )
            u_markup = types.InlineKeyboardMarkup(row_width=2)
            u_markup.add(
                types.InlineKeyboardButton("➕ شحن رصيد", callback_data=f"adm_addbal_{uid}"),
                types.InlineKeyboardButton("➖ خصم رصيد", callback_data=f"adm_subbal_{uid}")
            )
            ban_btn_text = "🟢 إلغاء الحظر" if is_banned else "🚫 طرد / حظر"
            ban_cb = f"adm_unban_{uid}" if is_banned else f"adm_ban_{uid}"
            u_markup.add(
                types.InlineKeyboardButton(ban_btn_text, callback_data=ban_cb),
                types.InlineKeyboardButton("✉️ مراسلة خاصة", callback_data=f"adm_msg_{uid}")
            )
            u_markup.add(types.InlineKeyboardButton("🔙 رجوع لقائمة المستخدمين", callback_data="admin_view_users"))
            bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=card, reply_markup=u_markup)

        elif data == "admin_search_user":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_search_user"}
            bot.send_message(chat_id, "🔍 **أرسل الآن معرف المستخدم (User ID) أو اليوزرنيم للبحث عنه:**")

        elif data.startswith("adm_addbal_"):
            if str(user_id) != str(ADMIN_ID):
                return
            target_uid = data.replace("adm_addbal_", "")
            user_states[str(user_id)] = {"action": "admin_input_add_amt", "target_uid": target_uid}
            bot.send_message(chat_id, f"➕ **أرسل المبلغ المراد شحنه للمستخدم `{target_uid}` بالدولار (مثال: 5):**")

        elif data.startswith("adm_subbal_"):
            if str(user_id) != str(ADMIN_ID):
                return
            target_uid = data.replace("adm_subbal_", "")
            user_states[str(user_id)] = {"action": "admin_input_sub_amt", "target_uid": target_uid}
            bot.send_message(chat_id, f"➖ **أرسل المبلغ المراد خصمه من المستخدم `{target_uid}` بالدولار (مثال: 2):**")

        elif data.startswith("adm_ban_"):
            if str(user_id) != str(ADMIN_ID):
                return
            target_uid = data.replace("adm_ban_", "")
            set_user_ban_status(target_uid, True)
            try:
                bot.send_message(target_uid, "⛔ **تم حظرك وطردك من استخدام البوت بقرار من الإدارة.**")
            except Exception:
                pass
            router_callback(types.CallbackQuery(id="0", from_user=call.from_user, message=call.message, data=f"adm_userinfo_{target_uid}", chat_instance=""))

        elif data.startswith("adm_unban_"):
            if str(user_id) != str(ADMIN_ID):
                return
            target_uid = data.replace("adm_unban_", "")
            set_user_ban_status(target_uid, False)
            try:
                bot.send_message(target_uid, "🎉 **تم فك الحظر عن حسابك! يمكنك الآن استخدام البوت بشكل طبيعي.**")
            except Exception:
                pass
            router_callback(types.CallbackQuery(id="0", from_user=call.from_user, message=call.message, data=f"adm_userinfo_{target_uid}", chat_instance=""))

        elif data.startswith("adm_msg_"):
            if str(user_id) != str(ADMIN_ID):
                return
            target_uid = data.replace("adm_msg_", "")
            user_states[str(user_id)] = {"action": "send_direct_message", "target_uid": target_uid}
            bot.send_message(chat_id, f"✉️ **أرسل نص الرسالة التي تريد إرسالها للمستخدم `{target_uid}`:**")

        elif data == "admin_prompt_broadcast":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "broadcast_all"}
            bot.send_message(chat_id, "📢 **أرسل الآن نص الرسالة أو الإعلان المراد إذاعته لجميع المستخدمين:**")

        elif data == "admin_prompt_ban":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_ban_target"}
            safe_send_message(chat_id, "🚫 **أرسل الآن معرف المستخدم (User ID) أو اليوزرنيم لطرده وحظره فوراً:**")

        elif data == "admin_settings_menu":
            if str(user_id) != str(ADMIN_ID):
                return
            smm_m = get_smm_margin() * 100
            num_m = get_num_margin() * 100
            m_mode = "🔴 مفعل (البوت مقفل للصيانة)" if is_maintenance_mode() else "🟢 معطل (البوت متاح للجميع)"
            forced_ch = get_forced_channel() or "غير محددة (معطلة)"

            settings_text = (
                f"⚙️ **لوحة إعدادات النظام وهوامش الربح:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📈 • هامش ربح خدمات الرشق: **{smm_m:.1f}%**\n"
                f"🔢 • هامش ربح الأرقام: **{num_m:.1f}%**\n"
                f"🛠️ • وضع الصيانة: **{m_mode}**\n"
                f"📢 • قناة الاشتراك الإجباري: `{forced_ch}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر الإعداد الذي ترغب في تعديله فوراً:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton(f"✏️ تعديل هامش ربح الرشق ({smm_m:.0f}%)", callback_data="admin_set_smm_margin"),
                types.InlineKeyboardButton(f"✏️ تعديل هامش ربح الأرقام ({num_m:.0f}%)", callback_data="admin_set_num_margin"),
                types.InlineKeyboardButton("🛠️ تبديل وضع الصيانة (تفعيل/إيقاف)", callback_data="admin_toggle_maintenance"),
                types.InlineKeyboardButton("📢 ضبط قناة الاشتراك الإجباري", callback_data="admin_set_forced_channel"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, settings_text, reply_markup=markup)

        elif data == "admin_set_smm_margin":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_smm_margin"}
            safe_send_message(chat_id, "📈 **أرسل النسبة المئوية الجديدة لهامش ربح خدمات الرشق (مثال: 30 أو 25):**")

        elif data == "admin_set_num_margin":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_num_margin"}
            safe_send_message(chat_id, "🔢 **أرسل النسبة المئوية الجديدة لهامش ربح الأرقام الافتراضية (مثال: 30 أو 20):**")

        elif data == "admin_toggle_maintenance":
            if str(user_id) != str(ADMIN_ID):
                return
            current_m = is_maintenance_mode()
            new_m = "0" if current_m else "1"
            set_setting("maintenance_mode", new_m)
            router_callback(types.CallbackQuery(id="0", from_user=call.from_user, message=call.message, data="admin_settings_menu", chat_instance=""))

        elif data == "admin_set_forced_channel":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_forced_channel"}
            safe_send_message(chat_id, "📢 **أرسل رابط القناة الإجبارية (مثال: `https://t.me/MyChannel`) أو أرسل `0` لتعطيلها:**")

        elif data == "admin_payment_methods":
            if str(user_id) != str(ADMIN_ID):
                return
            jeeb = get_payment_account("jeeb", PAYMENT_INFO["jeeb"]["acc"])
            kuraimi = get_payment_account("kuraimi", PAYMENT_INFO["kuraimi"]["acc"])
            binance = get_payment_account("binance", PAYMENT_INFO["binance"]["acc"])
            usdt = get_payment_account("usdt", "TNDpE... (TRC20)")
            syriatel = get_payment_account("syriatel", "09XXXXXXXX")
            vodafone = get_payment_account("vodafone", "01XXXXXXXXX")

            text = (
                f"💳 **لوحة التحكم بوسائل الدفع وطرق الشحن:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📱 • محفظة جيب: `{jeeb}`\n"
                f"🏦 • بنك الكريمي: `{kuraimi}`\n"
                f"🪙 • بينانس Pay ID: `{binance}`\n"
                f"💎 • USDT (TRC20): `{usdt}`\n"
                f"🇸🇾 • سيرياتيل كاش: `{syriatel}`\n"
                f"🇪🇬 • فودافون كاش / إنستاباي: `{vodafone}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اضغط على أي وسيلة لتعديل رقم الحساب أو العنوان مباشرة:"
            )
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("✏️ تعديل جيب", callback_data="adm_editpay_jeeb"),
                types.InlineKeyboardButton("✏️ تعديل الكريمي", callback_data="adm_editpay_kuraimi")
            )
            markup.add(
                types.InlineKeyboardButton("✏️ تعديل بينانس", callback_data="adm_editpay_binance"),
                types.InlineKeyboardButton("✏️ تعديل USDT", callback_data="adm_editpay_usdt")
            )
            markup.add(
                types.InlineKeyboardButton("✏️ تعديل سيرياتيل", callback_data="adm_editpay_syriatel"),
                types.InlineKeyboardButton("✏️ تعديل فودافون", callback_data="adm_editpay_vodafone")
            )
            markup.add(types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel"))
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data.startswith("adm_editpay_"):
            if str(user_id) != str(ADMIN_ID):
                return
            pay_key = data.replace("adm_editpay_", "")
            user_states[str(user_id)] = {"action": "admin_edit_pay_acc", "pay_key": pay_key}
            safe_send_message(chat_id, f"✏️ **أرسل الآن رقم الحساب أو العنوان الجديد لوسيلة الدفع ({pay_key}):**")

        elif data == "admin_system_stats":
            if str(user_id) != str(ADMIN_ID):
                return
            users = get_all_users()
            total_u = len(users)
            total_bal_usd = sum(u[3] for u in users) if users else 0.0
            banned_u = sum(1 for u in users if u[4])

            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*), SUM(cost_usd) FROM smm_orders')
            smm_row = cursor.fetchone()
            smm_total_orders = smm_row[0] if smm_row else 0
            smm_total_spent = smm_row[1] if smm_row and smm_row[1] else 0.0

            cursor.execute('SELECT SUM(orders_count) FROM users')
            nums_row = cursor.fetchone()
            nums_total_orders = nums_row[0] if nums_row and nums_row[0] else 0
            conn.close()

            text = (
                f"📊 **إحصائيات النظام الشاملة (Live System Stats):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👥 • إجمالي المستخدمين المسجلين: **{total_u} مستخدم**\n"
                f"🚫 • المستخدمين المحظورين: **{banned_u} مستخدم**\n"
                f"💵 • إجمالي الأرصدة في المحافظ: **{total_bal_usd:.2f} $** ({total_bal_usd * RUB_PER_USD:.1f} ₽)\n"
                f"📱 • إجمالي أرقام SMS المشتراة: **{nums_total_orders} رقم**\n"
                f"👑 • إجمالي طلبات الرشق المكتملة: **{smm_total_orders} طلب** (${smm_total_spent:.2f})\n"
                f"⚡ • حالة السيرفرات: **4 سيرفرات نشطة ومتصلة**\n"
                f"⏱️ • حالة البوت: **يعمل 24/7 مع نظام Self-Ping ضد السكون**\n"
                f"━━━━━━━━━━━━━━━━━━"
            )
            markup = types.InlineKeyboardMarkup().add(types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel"))
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_margin_settings":
            if str(user_id) != str(ADMIN_ID):
                return
            smm_m = get_smm_margin() * 100
            num_m = get_num_margin() * 100
            text = (
                f"📈 **إعدادات ونسب الأرباح (الربح):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📱 • هامش ربح الأرقام الافتراضية: **{num_m:.1f}%**\n"
                f"👑 • هامش ربح خدمات الرشق (SMM): **{smm_m:.1f}%**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر الهامش الذي ترغب في تعديله فوراً:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton(f"✏️ تعديل هامش الأرقام ({num_m:.0f}%)", callback_data="admin_set_num_margin"),
                types.InlineKeyboardButton(f"✏️ تعديل هامش الرشق ({smm_m:.0f}%)", callback_data="admin_set_smm_margin"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_toggle_sections":
            if str(user_id) != str(ADMIN_ID):
                return
            num_on = get_setting("section_numbers_enabled", "1") == "1"
            smm_on = get_setting("section_smm_enabled", "1") == "1"
            tg_on = get_setting("section_tg_enabled", "1") == "1"
            games_on = get_setting("section_games_enabled", "1") == "1"

            text = (
                f"🔘 **تشغيل / إغلاق أقسام البوت:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📱 • قسم الأرقام الافتراضية: {'🟢 شغال' if num_on else '🔴 مغلق'}\n"
                f"👑 • قسم خدمات الرشق: {'🟢 شغال' if smm_on else '🔴 مغلق'}\n"
                f"✈️ • قسم حسابات TG الجاهزة: {'🟢 شغال' if tg_on else '🔴 مغلق'}\n"
                f"🎮 • قسم شحن الألعاب: {'🟢 شغال' if games_on else '🔴 مغلق'}\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اضغط على أي قسم للتبديل الفوري بين التشغيل والإيقاف:"
            )
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton(f"📱 الأرقام ({'🟢' if num_on else '🔴'})", callback_data="adm_toggle_sec_num"),
                types.InlineKeyboardButton(f"👑 الرشق ({'🟢' if smm_on else '🔴'})", callback_data="adm_toggle_sec_smm")
            )
            markup.add(
                types.InlineKeyboardButton(f"✈️ حسابات TG ({'🟢' if tg_on else '🔴'})", callback_data="adm_toggle_sec_tg"),
                types.InlineKeyboardButton(f"🎮 الألعاب ({'🟢' if games_on else '🔴'})", callback_data="adm_toggle_sec_games")
            )
            markup.add(types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel"))
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data.startswith("adm_toggle_sec_"):
            if str(user_id) != str(ADMIN_ID):
                return
            sec = data.replace("adm_toggle_sec_", "")
            key = f"section_{'numbers' if sec == 'num' else sec}_enabled"
            cur = get_setting(key, "1")
            set_setting(key, "0" if cur == "1" else "1")
            router_callback(types.CallbackQuery(id="0", from_user=call.from_user, message=call.message, data="admin_toggle_sections", chat_instance=""))

        elif data == "admin_providers_hub":
            if str(user_id) != str(ADMIN_ID):
                return
            hero_k = get_hero_key()
            gz_k = get_grizzly_key()
            fs_k = get_fivesim_key()
            tg_k = get_tg_ready_key()

            text = (
                f"🔑 **إدارة المزودين ومفاتيح الـ API والسيرفرات:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⚡ • **السيرفر 1 (Hero SMS):**\n`{hero_k[:10]}...{hero_k[-6:] if len(hero_k)>16 else ''}`\n\n"
                f"🐻 • **السيرفر 2 (Grizzly SMS):**\n`{gz_k[:10]}...`\n\n"
                f"🌐 • **السيرفر 3 (5SIM العالمي):**\n`{fs_k[:15]}...`\n\n"
                f"✈️ • **موقع TG-Lion (حسابات جاهزة):**\n`{tg_k[:10]}...`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر المزود لفحص اتصاله وتعديل مفتاحه مباشرة:"
            )
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("⚡ السيرفر 1 (Hero SMS)", callback_data="admin_settings_hero"),
                types.InlineKeyboardButton("🐻 السيرفر 2 (Grizzly)", callback_data="admin_settings_grizzly")
            )
            markup.add(
                types.InlineKeyboardButton("🌐 السيرفر 3 (5SIM)", callback_data="admin_settings_fivesim"),
                types.InlineKeyboardButton("✈️ مزود TG-Lion", callback_data="admin_check_tg")
            )
            markup.add(types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel"))
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_agents_management":
            if str(user_id) != str(ADMIN_ID):
                return
            agent_disc = float(get_setting("agent_discount_percent", "15.0"))
            text = (
                f"🤝 **إدارة الوكلاء والموزعين المعتمدين:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🏷️ • نسبة خصم الوكلاء التلقائية: **{agent_disc:.1f}%**\n"
                f"💎 • الميزة: يحصل الوكيل على أسعار مخفضة فورية في جميع خدمات البوت.\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر الإجراء المطلوب:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton(f"✏️ تعديل نسبة خصم الوكلاء ({agent_disc:.0f}%)", callback_data="admin_set_agent_discount"),
                types.InlineKeyboardButton("➕ ترقية مستخدم إلى وكيل معتمد", callback_data="admin_prompt_add_agent"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_set_agent_discount":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_agent_discount"}
            safe_send_message(chat_id, "🤝 **أرسل النسبة المئوية لخصم الوكلاء (مثال: 15 أو 20):**")

        elif data == "admin_prompt_add_agent":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_agent_user_id"}
            safe_send_message(chat_id, "🤝 **أرسل معرف المستخدم (User ID) لترقيته إلى وكيل معتمد:**")

        elif data == "admin_channels_management":
            if str(user_id) != str(ADMIN_ID):
                return
            forced_ch = get_forced_channel() or "غير محددة (معطلة)"
            act_ch = get_setting("activations_channel", "@ActivationChannel")
            tut_ch = get_setting("tutorials_channel", "https://t.me/SupportChannel")

            text = (
                f"📢 **إدارة القنوات والاشتراك الإجباري والتفعيلات:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🔒 • قناة الاشتراك الإجباري: `{forced_ch}`\n"
                f"📡 • قناة نشر التفعيلات الحية: `{act_ch}`\n"
                f"📚 • قناة الشروحات والدعم: `{tut_ch}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر القناة لتعديل رابطها أو فحصها:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton("✏️ تعديل قناة الاشتراك الإجباري", callback_data="admin_set_forced_channel"),
                types.InlineKeyboardButton("✏️ تعديل قناة نشر التفعيلات", callback_data="admin_set_act_channel"),
                types.InlineKeyboardButton("📡 فحص وتجربة نشر التفعيلات", callback_data="admin_test_activation_channel"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_set_act_channel":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_act_channel"}
            safe_send_message(chat_id, "📡 **أرسل معرف قناة التفعيلات مع @ (مثال: `@MyActivations`):**")

        elif data == "admin_transfer_settings":
            if str(user_id) != str(ADMIN_ID):
                return
            tr_enabled = get_setting("transfer_enabled", "1") == "1"
            tr_fee = float(get_setting("transfer_fee_percent", "0.0"))
            min_tr = float(get_setting("min_transfer_usd", "0.10"))

            text = (
                f"🔄 **إعدادات تحويل الرصيد بين المستخدمين:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⚙️ • حالة التحويل: {'🟢 متاح للجميع' if tr_enabled else '🔴 معطل مؤقتاً'}\n"
                f"💸 • عمولة التحويل: **{tr_fee:.1f}%**\n"
                f"💵 • الحد الأدنى للتحويل: **${min_tr:.2f}**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر الإعداد المطلوب تعديله:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton(f"🔘 تبديل حالة التحويل ({'🟢 شغال' if tr_enabled else '🔴 معطل'})", callback_data="admin_toggle_transfer"),
                types.InlineKeyboardButton(f"✏️ تعديل عمولة التحويل ({tr_fee:.0f}%)", callback_data="admin_set_transfer_fee"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_toggle_transfer":
            if str(user_id) != str(ADMIN_ID):
                return
            cur = get_setting("transfer_enabled", "1")
            set_setting("transfer_enabled", "0" if cur == "1" else "1")
            router_callback(types.CallbackQuery(id="0", from_user=call.from_user, message=call.message, data="admin_transfer_settings", chat_instance=""))

        elif data == "admin_set_transfer_fee":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_transfer_fee"}
            safe_send_message(chat_id, "💸 **أرسل نسبة عمولة تحويل الرصيد (مثال: 0 ليكون مجاني، أو 2 لعمولة 2%):**")

        elif data == "admin_support_accounts":
            if str(user_id) != str(ADMIN_ID):
                return
            sup_user = get_setting("support_username", "@Yy77501")
            text = (
                f"🎧 **إدارة حسابات الدعم الفني والمساعدة:**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👤 • يوزر الدعم الفني الحالي: `{sup_user}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 لتغيير حساب الدعم الفني اضغط بالأسفل:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton(f"✏️ تعديل يوزر الدعم ({sup_user})", callback_data="admin_set_support_user"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_set_support_user":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_support_user"}
            safe_send_message(chat_id, "🎧 **أرسل يوزر حساب الدعم الفني الجديد (مثال: `@Yy77501`):**")

        elif data == "admin_tg_accounts_stock":
            if str(user_id) != str(ADMIN_ID):
                return
            cat_data = get_live_tg_ready_catalog()
            total_stock = sum(c.get("qty", 0) for c in cat_data)
            text = (
                f"📦 **مخزون الحسابات الجاهزة (Telegram Ready):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📊 • إجمالي المخزون الحي المتوفر: **{total_stock} حساب جاهز**\n"
                f"🌍 • عدد الدول المتوفر بها حسابات: **{len(cat_data)} دولة**\n"
                f"⚡ • المزود المرتبط: **TG-Lion API المباشر**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 يمكنك فحص الاتصال أو تحديث الرابط والمفتاح:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton("🔄 تحديث وفحص المخزون الآن", callback_data="admin_tg_accounts_stock"),
                types.InlineKeyboardButton("⚙️ إعدادات مزود TG-Lion", callback_data="admin_check_tg"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_referral_settings":
            if str(user_id) != str(ADMIN_ID):
                return
            ref_reward = float(get_setting("referral_reward_usd", "0.10"))
            text = (
                f"🎁 **إعدادات نظام شارك واربح (الإحالات):**\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"💵 • مكافأة الإحالة لكل صديق: **${ref_reward:.2f}** ({ref_reward * RUB_PER_USD:.1f} ₽)\n"
                f"🎯 • الشرط: تضاف المكافأة لحساب الداعي بمجرد دخول العضو الجديد.\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 اختر الإجراء المطلوب:"
            )
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton(f"✏️ تعديل مكافأة الإحالة (${ref_reward:.2f})", callback_data="admin_set_ref_reward"),
                types.InlineKeyboardButton("🔙 العودة للوحة الإدارة", callback_data="btn_admin_panel")
            )
            safe_edit_message_text(chat_id, call.message.message_id, text, reply_markup=markup)

        elif data == "admin_set_ref_reward":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_input_ref_reward"}
            safe_send_message(chat_id, "🎁 **أرسل قيمة المكافأة بالدولار لكل دعوة جديدة (مثال: 0.10 أو 0.05):**")

        elif data == "admin_self_deposit":
            if str(user_id) != str(ADMIN_ID):
                return
            add_user_balance_usd(ADMIN_ID, 50.00)
            bot.answer_callback_query(call.id, "💎 تم شحن 50.00$ لرصيدك بنجاح!", show_alert=True)
            router_callback(types.CallbackQuery(id="0", from_user=call.from_user, message=call.message, data="btn_admin_panel", chat_instance=""))

        elif data == "admin_auto_restore":
            if str(user_id) != str(ADMIN_ID):
                return
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute('VACUUM;')
                cursor.execute('PRAGMA integrity_check;')
                check_res = cursor.fetchone()
                conn.close()
                live_countries_cache.clear()
                price_cache.clear()
                tg_catalog_cache.clear()
                bot.answer_callback_query(call.id, f"✅ تم استعادة وتحسين السيرفر وقواعد البيانات بنجاح ({check_res[0] if check_res else 'OK'})!", show_alert=True)
            except Exception as e:
                bot.answer_callback_query(call.id, f"خطأ: {str(e)[:50]}", show_alert=True)

        elif data == "admin_export_backup":
            if str(user_id) != str(ADMIN_ID):
                return
            try:
                db_path = "/bot_files/bot.db"
                if os.path.exists(db_path):
                    with open(db_path, "rb") as f:
                        bot.send_document(chat_id, f, caption=f"💾 **نسخة احتياطية لقاعدة بيانات البوت كاملة (bot.db)**\n📅 التاريخ: {time.strftime('%Y-%m-%d %H:%M:%S')}")
                    bot.answer_callback_query(call.id, "✅ تم إرسال النسخة الاحتياطية بنجاح!", show_alert=False)
                else:
                    bot.answer_callback_query(call.id, "ملف قاعدة البيانات غير موجود", show_alert=True)
            except Exception as e:
                bot.answer_callback_query(call.id, f"خطأ: {str(e)[:50]}", show_alert=True)

        elif data == "admin_import_backup_prompt":
            if str(user_id) != str(ADMIN_ID):
                return
            user_states[str(user_id)] = {"action": "admin_upload_backup"}
            safe_send_message(chat_id, "📥 **أرسل الآن ملف النسخة الاحتياطية (`bot.db`) لاستعادتها فوراً على السيرفر:**")

        elif data == "admin_test_activation_channel":
            if str(user_id) != str(ADMIN_ID):
                return
            act_ch = get_setting("activations_channel", "@ActivationChannel")
            try:
                test_msg = (
                    f"📡 **فحص وتجربة قناة التفعيلات:**\n\n"
                    f"✅ البوت متصل بالقناة بنجاح ويمتلك كافة صلاحيات النشر الفوري!\n"
                    f"⏱️ الوقت: `{time.strftime('%Y-%m-%d %H:%M:%S')}`"
                )
                bot.send_message(act_ch, test_msg)
                bot.answer_callback_query(call.id, f"✅ تم إرسال رسالة تجريبية بنجاح إلى القناة ({act_ch})!", show_alert=True)
            except Exception as e:
                bot.answer_callback_query(call.id, f"⚠️ تعذر النشر في {act_ch}: تأكد من إضافة البوت كمشرف في القناة! ({str(e)[:40]})", show_alert=True)

    except Exception as e:
        print(f"Callback error: {e}")

# ----------------- تشغيل المحرك -----------------
def start_bot():
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass

    try:
        commands = [
            types.BotCommand("start", "🏠 القائمة الرئيسية"),
            types.BotCommand("buy", "☎️ شراء رقم افتراضي"),
            types.BotCommand("smm", "👑 رشق تيليجرام (نظام الملك)"),
            types.BotCommand("deposit", "🎳 شحن الرصيد"),
            types.BotCommand("transfer", "🔄 تحويل الرصيد مجاناً"),
            types.BotCommand("account", "🪪 حسابي والمحفظة"),
            types.BotCommand("support", "💬 الدعم الفني والمساعدة"),
            types.BotCommand("admin", "👑 لوحة تحكم الإدارة")
        ]
        bot.set_my_commands(commands)
    except Exception:
        pass

    print("🚀 5SIM + GRIZZLY + HERO + PLUS + KING SMM ENGINE LIVE 24/7 (30% PROFIT)...")
    
    while True:
        try:
            bot.infinity_polling(timeout=20, long_polling_timeout=15, skip_pending=True)
        except Exception as e:
            err_str = str(e)
            if "401" in err_str or "Unauthorized" in err_str:
                print("⚠️ [Telegram 401 Unauthorized]: توكن البوت غير صالح أو تم إلغاؤه (Revoked) في @BotFather.")
                print("⏳ يرجى تزويد البوت بالتوكن الجديد من @BotFather ووضعه في config.py أو ملف token.txt.")
                time.sleep(25)
            else:
                print(f"Loop auto-recovery: {e}")
                time.sleep(2)

if __name__ == "__main__":
    start_bot()