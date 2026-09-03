import os
import json
import threading
import requests
from flask import Flask
import telebot
from telebot import types

# إعدادات البوت والتوكن
TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
ADMIN_ID = int(os.getenv("ADMIN_ID", "YOUR_ADMIN_ID_HERE"))  # ضع آيدي المشرف الخاص بك هنا
API_5SIM_KEY = os.getenv("API_5SIM_KEY", "YOUR_5SIM_API_KEY_HERE")
bot = telebot.TeleBot(TOKEN)

# ملف قاعدة البيانات المحلي البسيط
DB_FILE = "database.json"

def load_db():
    if not os.path.exists(DB_FILE):
        return {
            "users": {}, 
            "settings": {
                "markup_percentage": 20,
                "bot_status": "active"
            }
        }
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {
            "users": {}, 
            "settings": {
                "markup_percentage": 20,
                "bot_status": "active"
            }
        }

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

db = load_db()

# --- وظائف مساعدة للربط مع 5sim ---
def get_5sim_balance():
    url = "https://5sim.net/v1/user/profile"
    headers = {"Authorization": f"Bearer {API_5SIM_KEY}"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return data.get("balance", 0.0)
    except:
        pass
    return None

# --- واجهة البداية والقائمة الرئيسية ---
@bot.message_handler(commands=['start'])
def send_welcome(message):
    user_id = str(message.from_user.id)
    
    # فحص حالة البوت العامة من الإدارة الكبرى
    if db.get("settings", {}).get("bot_status") == "maintenance" and message.from_user.id != ADMIN_ID:
        bot.reply_to(message, "🛠 البوت في حالياً صيانة وتحديث، يرجى العودة لاحقاً.")
        return

    if user_id not in db["users"]:
        db["users"][user_id] = {
            "name": message.from_user.first_name,
            "balance": 0.0,
            "banned": False
        }
        save_db(db)
    
    # فحص الحظر الخاص بالمستخدم
    if db["users"][user_id].get("banned", False):
        bot.reply_to(message, "عذراً، أنت محظور من استخدام هذا البوت.")
        return

    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add(types.KeyboardButton("🛒 شراء أرقام"), types.KeyboardButton("💰 رصيدي"))
    markup.add(types.KeyboardButton("💳 شحن الرصيد"), types.KeyboardButton("📞 الدعم الفني"))
    
    # إذا كان المستخدم هو المشرف، نظهر له زر الإدارة الكبرى
    if message.from_user.id == ADMIN_ID:
        markup.add(types.KeyboardButton("🛠 الإدارة الكبرى"))

    bot.reply_to(message, f"أهلاً بك يا {message.from_user.first_name} في بوت الخدمات الرقمية والأرقام الافتراضية.", reply_markup=markup)

# --- معالجة الأزرار والخدمات والإدارة الكبرى ---
@bot.message_handler(func=lambda message: True)
def handle_messages(message):
    user_id = str(message.from_user.id)
    
    if user_id in db["users"] and db["users"][user_id].get("banned", False):
        return

    text = message.text

    if text == "🛒 شراء أرقام":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("📱 تليجرام", callback_data="buy_telegram"),
            types.InlineKeyboardButton("💬 واتساب", callback_data="buy_whatsapp"),
            types.InlineKeyboardButton("🌐 خدمات أخرى", callback_data="buy_other")
        )
        bot.reply_to(message, "اختر الخدمة المطلوبة لشراء الرقم:", reply_markup=markup)
        
    elif text == "💰 رصيدي":
        balance = db["users"].get(user_id, {}).get("balance", 0.0)
        bot.reply_to(message, f"رصيدك الحالي هو: {balance} $")
        
    elif text == "💳 شحن الرصيد":
        bot.reply_to(message, "لشحن رصيدك، يرجى تحويل المبلغ المطلوبة وتلافي البوليصة ثم إرسال إيصال التحويل للدعم الفني.")
        
    elif text == "📞 الدعم الفني":
        bot.reply_to(message, "للدعم والاستفسار، تواصل مع معرف الإدارة المعتمد.")
        
    # --- لوحة الإدارة الكبرى (خاصة بالمشرف فقط) ---
    elif text == "🛠 الإدارة الكبرى" and message.from_user.id == ADMIN_ID:
        admin_markup = types.InlineKeyboardMarkup(row_width=2)
        admin_markup.add(
            types.InlineKeyboardButton("📊 إحصائيات النظام", callback_data="admin_stats"),
            types.InlineKeyboardButton("📢 إرسال إذاعة عامة", callback_data="admin_broadcast"),
            types.InlineKeyboardButton("💰 تعديل رصيد مستخدم", callback_data="admin_edit_balance"),
            types.InlineKeyboardButton("🚫 حظر/إلغاء حظر مستخدم", callback_data="admin_ban_user"),
            types.InlineKeyboardButton("⚙️ نسبة الربح (Markup)", callback_data="admin_markup"),
            types.InlineKeyboardButton("🔄 حالة البوت (صيانة/عمل)", callback_data="admin_toggle_status")
        )
        bot.reply_to(message, "أهلاً بك في لوحة **الإدارة الكبرى** الشاملة. اختر الإجراء المطلوبة:", reply_markup=admin_markup, parse_mode="Markdown")

# --- معالجة الأزرار التفاعلية للخدمات والأرقام ---
@bot.callback_query_handler(func=lambda call: call.data.startswith("buy_"))
def buy_services_callback(call):
    bot.answer_callback_query(call.id)
    service = call.data.replace("buy_", "")
    bot.send_message(call.message.chat.id, f"جاري جلب الدول المتاحة لخدمة ({service}) عبر منصة 5sim...")

# --- معالجة أزرار لوحة الإدارة الكبرى ---
@bot.callback_query_handler(func=lambda call: call.data.startswith("admin_"))
def admin_callback_query(call):
    if call.from_user.id != ADMIN_ID:
        bot.answer_callback_query(call.id, "هذا الزر مخصص للمشرف فقط!", show_alert=True)
        return

    data = call.data
    if data == "admin_stats":
        total_users = len(db["users"])
        active_banned = sum(1 for u in db["users"].values() if u.get("banned", False))
        api_bal = get_5sim_balance()
        api_bal_text = f"{api_bal} ربلي/روبل/دولار" if api_bal is not None else "تعذر الجلب"
        
        text = (
            f"📊 *إحصائيات النظام الشاملة:*\n\n"
            f"- إجمالي المستخدمين: {total_users}\n"
            f"- المستخدمين المحظورين: {active_banned}\n"
            f"- رصيد حساب 5sim: {api_bal_text}\n"
            f"- نسبة الربح الحالية: {db['settings'].get('markup_percentage', 20)}%\n"
            f"- حالة البوت: {db['settings'].get('bot_status', 'active')}"
        )
        bot.answer_callback_query(call.id)
        bot.send_message(call.message.chat.id, text, parse_mode="Markdown")
        
    elif data == "admin_broadcast":
        msg = bot.send_message(call.message.chat.id, "أرسل الآن نص الإذاعة الذي تريد إرساله لكافة المستخدمين:")
        bot.register_next_step_handler(msg, execute_broadcast)
        
    elif data == "admin_edit_balance":
        msg = bot.send_message(call.message.chat.id, "أرسل (آيدي المستخدم) والمبلغ مفصولين بمسافة (مثال:\n`123456789 10` أو `123456789 -5`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, execute_edit_balance)
        
    elif data == "admin_ban_user":
        msg = bot.send_message(call.message.chat.id, "أرسل آيدي المستخدم المراد حظره أو إلغاء حظره:")
        bot.register_next_step_handler(msg, execute_toggle_ban)

    elif data == "admin_markup":
        msg = bot.send_message(call.message.chat.id, "أرسل نسبة الربح الجديدة المئوية (مثال: `25`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, execute_set_markup)

    elif data == "admin_toggle_status":
        current_status = db["settings"].get("bot_status", "active")
        new_status = "maintenance" if current_status == "active" else "active"
        db["settings"]["bot_status"] = new_status
        save_db(db)
        bot.answer_callback_query(call.id, f"تم تغيير حالة البوت إلى: {new_status}", show_alert=True)
        bot.send_message(call.message.chat.id, f"تم تغيير وضع البوت بنجاح إلى: `{new_status}`", parse_mode="Markdown")

# --- وظائف تنفيذ مهام الإدارة الكبرى الخطوات القادمة ---
def execute_broadcast(message):
    if message.from_user.id != ADMIN_ID:
        return
    text = message.text
    success = 0
    fail = 0
    for uid in db["users"]:
        try:
            bot.send_message(int(uid), f"📢 *إشعار إداري هام:*\n\n{text}", parse_mode="Markdown")
            success += 1
        except:
            fail += 1
    bot.reply_to(message, f"تم إرسال الإذاعة بنجاح.\n- وصل بنجاح: {success}\n- فشل الوصول لـ: {fail}")

def execute_edit_balance(message):
    if message.from_user.id != ADMIN_ID:
        return
    try:
        parts = message.text.split()
        target_id = parts[0]
        amount = float(parts[1])
        
        if target_id in db["users"]:
            db["users"][target_id]["balance"] += amount
            save_db(db)
            bot.reply_to(message, f"تم تعديل رصيد المستخدم {target_id} بنجاح. الرصيد الجديد: {db['users'][target_id]['balance']} $")
            bot.send_message(int(target_id), f"💰 تم تحديث رصيدك من قبل الإدارة بقيمة ({amount} $). رصيدك الحالي: {db['users'][target_id]['balance']} $")
        else:
            bot.reply_to(message, "المستخدم غير مسجل في قاعدة البيانات.")
    except Exception as e:
        bot.reply_to(message, f"حدث خطأ في الصيغة أو البيانات المدخلة: {e}")

def execute_toggle_ban(message):
    if message.from_user.id != ADMIN_ID:
        return
    target_id = message.text.strip()
    if target_id in db["users"]:
        current_status = db["users"][target_id].get("banned", False)
        db["users"][target_id]["banned"] = not current_status
        save_db(db)
        status_text = "حظر" if not current_status else "إلغاء حظر"
        bot.reply_to(message, f"تم {status_text} المستخدم {target_id} بنجاح.")
    else:
        bot.reply_to(message, "المستخدم غير موجود في النظام.")

def execute_set_markup(message):
    if message.from_user.id != ADMIN_ID:
        return
    try:
        val = float(message.text.strip())
        db["settings"]["markup_percentage"] = val
        save_db(db)
        bot.reply_to(message, f"تم تحديث نسبة ربح الأسعار (Markup) بنجاح لتصبح: {val}%")
    except Exception as e:
        bot.reply_to(message, f"يرجى إدخال رقم صحيح للنسبة: {e}")

# --- خادم الصحة الداخلي (للابقاء على البوت قيد العمل على منصات الاستضافة) ---
app = Flask('')

@app.route('/')
def home():
    return "Bot is active, running, and fully connected!"

def run_web():
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 8080)))

if __name__ == "__main__":
    # تشغيل السيرفر في خيط مستقل
    t = threading.Thread(target=run_web)
    t.daemon = True
    t.start()
    
    # تشغيل البوت
    print("Bot is starting with full features & Admin Panel...")
    bot.infinity_polling()
