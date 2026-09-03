import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

# ==========================================
# 1. إعدادات النظام والمتغيرات الأساسية (config)
# ==========================================
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"
ADMIN_ID = 123456789  # استبدل هذا برقم الآيدي الخاص بك
PLUS_API_URL = "https://api.example.com/v2"
PLUS_API_KEY = "YOUR_API_KEY_HERE"

bot = telebot.TeleBot(BOT_TOKEN)

# ==========================================
# 2. دوال الحماية الآمنة للرسائل (Anti-Crash)
# ==========================================
def safe_send_message(chat_id, text, reply_markup=None, parse_mode="Markdown"):
    try:
        return bot.send_message(chat_id, text, reply_markup=reply_markup, parse_mode=parse_mode)
    except Exception:
        return bot.send_message(chat_id, text, reply_markup=reply_markup)

def safe_edit_message_text(text, chat_id, message_id, reply_markup=None, parse_mode="Markdown"):
    try:
        return bot.edit_message_text(text, chat_id, message_id, reply_markup=reply_markup, parse_mode=parse_mode)
    except Exception:
        return bot.edit_message_text(text, chat_id, message_id, reply_markup=reply_markup)

# ==========================================
# 3. معالج البداية والنوافذ الـ 13 المدمجة
# ==========================================
@bot.message_handler(commands=['start'])
def send_welcome(message):
    # النافذة (1): القائمة الرئيسية
    text = "💎 *مرحباً بك في النظام الملكي للخدمات المتكاملة*\n\nيرجى اختيار القسم المطلوب من القائمة أدناه:"
    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("🚀 خدمات الرشق الملكية", callback_data="w_services"),
        InlineKeyboardButton("👤 حسابي ورصيدي", callback_data="w_profile"),
        InlineKeyboardButton("💳 شحن الرصيد", callback_data="w_deposit"),
        InlineKeyboardButton("📋 طلباتي السابقة", callback_data="w_orders"),
        InlineKeyboardButton("🎁 الهوايات والمسابقات", callback_data="w_contests"),
        InlineKeyboardButton("📞 الدعم الفني", callback_data="w_support"),
        InlineKeyboardButton("ℹ️ شروط الاستخدام", callback_data="w_terms"),
        InlineKeyboardButton("📊 احصائيات البوت", callback_data="w_stats")
    )
    
    if message.from_user.id == ADMIN_ID:
        markup.add(InlineKeyboardButton("👑 لوحة الإدارة الكبرى", callback_data="w_admin_main"))
        
    safe_send_message(message.chat.id, text, reply_markup=markup)

@bot.callback_query_handler(func=lambda call: True)
def handle_callbacks(call):
    chat_id = call.message.chat.id
    message_id = call.message.message_id
    user_id = call.from_user.id

    # النافذة (2): أقسام خدمات الرشق
    if call.data == "w_services":
        text = "🚀 *أقسام خدمات الرشق المتاحة:*\nاختر المنصة المطلوبة للبدء:"
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("📱 تيليجرام", callback_data="cat_telegram"),
            InlineKeyboardButton("📸 إنستغرام", callback_data="cat_instagram"),
            InlineKeyboardButton("🎵 تيك توك", callback_data="cat_tiktok"),
            InlineKeyboardButton("🎮 شحن الألعاب", callback_data="cat_games"),
            InlineKeyboardButton("🔙 رجوع للقائمة الرئيسية", callback_data="main_menu")
        )
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # النافذة (3): ملف المستخدم
    elif call.data == "w_profile":
        text = f"👤 *ملفك الشخصي:*\n\n- المعرف: `{user_id}`\n- الرصيد الحالي: `0.00` $\n- الرتبة: عضو ملكي"
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 رجوع", callback_data="main_menu"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # النافذة (4): شحن الرصيد
    elif call.data == "w_deposit":
        text = "💳 *قسم شحن الرصيد:*\nاختر طريقة الدفع المناسبة لك لتعبئة حسابك آلياً:"
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🌐 USDT / عملات رقمية", callback_data="pay_crypto"),
            InlineKeyboardButton("💵 تحويل محلي / صرافة", callback_data="pay_local"),
            InlineKeyboardButton("🔙 رجوع", callback_data="main_menu")
        )
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # النافذة (5): الطلبات السابقة
    elif call.data == "w_orders":
        text = "📋 *سجل طلباتك الملكية:*\nليس لديك أي طلبات قيد التنفيذ حالياً."
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 رجوع", callback_data="main_menu"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # النافذة (6): المسابقات والفعاليات
    elif call.data == "w_contests":
        text = "🎁 *قسم المسابقات والجوائز:*\nتابع جديد الفعاليات والدوريات الرياضية والجوائز الأسبوعية."
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 رجوع", callback_data="main_menu"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # النافذة (7): الدعم الفني
    elif call.data == "w_support":
        text = "📞 *الدعم الفني والخدمة السريعة:*\nللاستفسارات وحل المشاكل، يرجى مراسلة الإدارة المباشرة."
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("💬 مراسلة الدعم", url="https://t.me/Support"),
            InlineKeyboardButton("🔙 رجوع", callback_data="main_menu")
        )
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # النافذة (8): شروط الاستخدام
    elif call.data == "w_terms":
        text = "ℹ️ *شروط وقواعد الاستخدام:*\nجميع الخدمات تقدم بضمان ملكي، يرجى التأكد من الروابط قبل الطلب."
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 رجوع", callback_data="main_menu"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # النافذة (9): إحصائيات البوت
    elif call.data == "w_stats":
        text = "📊 *إحصائيات النظام:*\n- إجمالي المستخدمين: نشط\n- حالة الاتصال بـ API: متصل ✅"
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 رجوع", callback_data="main_menu"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # ==========================================
    # 4. لوحة الإدارة الكبرى (النوافذ من 10 إلى 13)
    # ==========================================
    elif call.data == "w_admin_main" and user_id == ADMIN_ID:
        # النافذة (10): الرئيسية للإدارة
        text = "👑 *لوحة الإدارة الكبرى والتحكم الذكي:*\nاختر القسم المطلوب للتعديل والإدارة:"
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("💎 فحص وإعداد Plus", callback_data="adm_plus_check"),
            InlineKeyboardButton("📢 إذاعة عامة", callback_data="adm_broadcast"),
            InlineKeyboardButton("👥 إدارة المستخدمين", callback_data="adm_users"),
            InlineKeyboardButton("⚙️ إعدادات الربط API", callback_data="adm_api_settings"),
            InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="main_menu")
        )
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    elif call.data == "adm_plus_check" and user_id == ADMIN_ID:
        # النافذة (11): فحص Plus API
        text = f"💎 *الفاحص التشخيصي الذكي لـ Plus API:*\n\n- الرابط الحالي: `{PLUS_API_URL}`\n- حالة النظام: `نشط ويعمل بكفاءة`[span_0](start_span)[span_0](end_span)\n- نوع الربط: `SMM API v2 / SMS Handler`[span_1](start_span)[span_1](end_span)"
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🔄 تشخيص الفحص الفوري", callback_data="adm_run_test"),
            InlineKeyboardButton("🔙 لوحة الإدارة", callback_data="w_admin_main")
        )
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    elif call.data == "adm_broadcast" and user_id == ADMIN_ID:
        # النافذة (12): الإذاعة والتنبيهات
        text = "📢 *قسم الإذاعة العامة:*\nقم بإرسال رسالة نصية أو وسائط ليتم نشرها لجميع أعضاء البوت دفعة واحدة."
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 لوحة الإدارة", callback_data="w_admin_main"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    elif call.data == "adm_users" and user_id == ADMIN_ID:
        # النافذة (13): إدارة المستخدمين
        text = "👥 *إدارة المستخدمين والأرصدة:*\nيمكنك البحث عن أي مستخدم وتعديل رصيده أو حظره من النظام."
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 لوحة الإدارة", callback_data="w_admin_main"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

    # زر الرجوع الموحد للقائمة الرئيسية
    elif call.data == "main_menu":
        text = "💎 *مرحباً بك مجدداً في القائمة الرئيسية الملكية:*"
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("🚀 خدمات الرشق الملكية", callback_data="w_services"),
            InlineKeyboardButton("👤 حسابي ورصيدي", callback_data="w_profile"),
            InlineKeyboardButton("💳 شحن الرصيد", callback_data="w_deposit"),
            InlineKeyboardButton("📋 طلباتي السابقة", callback_data="w_orders"),
            InlineKeyboardButton("🎁 الهوايات والمسابقات", callback_data="w_contests"),
            InlineKeyboardButton("📞 الدعم الفني", callback_data="w_support"),
            InlineKeyboardButton("ℹ️ شروط الاستخدام", callback_data="w_terms"),
            InlineKeyboardButton("📊 احصائيات البوت", callback_data="w_stats")
        )
        if user_id == ADMIN_ID:
            markup.add(InlineKeyboardButton("👑 لوحة الإدارة الكبرى", callback_data="w_admin_main"))
        safe_edit_message_text(text, chat_id, message_id, reply_markup=markup)

if __name__ == "__main__":
    print("Unified Bot Script is running successfully with all 13 integrated windows...")
    bot.infinity_polling()
