# =========================================================
# YasNum & VaultX - Admin Keyboards
# =========================================================

try:
    from telebot import types
except ImportError:
    class _DummyTypes:
        class InlineKeyboardMarkup:
            def __init__(self, row_width=1): self.keyboard = []
            def add(self, *args): return self
            def row(self, *args): return self
        class InlineKeyboardButton:
            def __init__(self, text, callback_data=None, url=None):
                self.text = text; self.callback_data = callback_data; self.url = url
    types = _DummyTypes()

def build_admin_panel_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    markup.add(
        types.InlineKeyboardButton("📊 إحصائيات النظام الشاملة", callback_data="admin_stats"),
        types.InlineKeyboardButton("💳 رصيد سيرفر SMMTigers", callback_data="admin_check_smm_bal")
    )
    markup.add(
        types.InlineKeyboardButton("📢 إذاعة ورسالة عامة للجميع", callback_data="admin_broadcast"),
        types.InlineKeyboardButton("💰 تعديل رصيد مستخدم", callback_data="admin_edit_balance")
    )
    markup.add(
        types.InlineKeyboardButton("⚙️ إعدادات سيرفر الرشق SMMTigers", callback_data="admin_smm_settings"),
        types.InlineKeyboardButton("🎟️ إنشاء كرت / كود تعبئة", callback_data="admin_gen_voucher")
    )
    markup.add(
        types.InlineKeyboardButton("📋 سجل الكروت والطلبات", callback_data="admin_vouchers_log"),
        types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main")
    )
    
    return markup

def build_admin_smm_settings_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("🔑 تغيير مفتاح API", callback_data="admin_set_smm_key"),
        types.InlineKeyboardButton("🌐 تغيير رابط API", callback_data="admin_set_smm_url")
    )
    markup.add(
        types.InlineKeyboardButton("📈 ضبط نسبة الربح الإضافية", callback_data="admin_set_smm_margin"),
        types.InlineKeyboardButton("🔄 تحديث قائمة الخدمات يدوياً", callback_data="admin_refresh_smm")
    )
    markup.add(types.InlineKeyboardButton("🔙 العودة للوحة التحكم", callback_data="admin_panel"))
    return markup
