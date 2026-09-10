# =========================================================
# YasNum & VaultX - Main Keyboards
# =========================================================

try:
    from telebot import types
except ImportError:
    class _DummyTypes:
        class InlineKeyboardMarkup:
            def __init__(self, *args, **kwargs): self.keyboard = []
            def add(self, *args): return self
            def row(self, *args): return self
        class InlineKeyboardButton:
            def __init__(self, text, callback_data=None, url=None):
                self.text = text; self.callback_data = callback_data; self.url = url
        class ReplyKeyboardMarkup:
            def __init__(self, *args, **kwargs): self.keyboard = []
            def add(self, *args): return self
            def row(self, *args): return self
        class KeyboardButton:
            def __init__(self, text): self.text = text
    types = _DummyTypes()

def build_main_keyboard(is_admin=False):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    
    markup.add(
        types.KeyboardButton("📱 شراء رقم وهمي (SMS)"),
        types.KeyboardButton("👑 خدمات الرشق والمتابعين")
    )
    markup.add(
        types.KeyboardButton("🎮 شحن الألعاب والشدات"),
        types.KeyboardButton("🤖 اشتراكات وباقات AI")
    )
    markup.add(
        types.KeyboardButton("✈️ أرقام تيليجرام جاهزة"),
        types.KeyboardButton("📧 بريد إلكتروني مؤقت")
    )
    markup.add(
        types.KeyboardButton("💳 شحن الرصيد والكراتين"),
        types.KeyboardButton("🎁 شحن كرت أو كود هدية")
    )
    markup.add(
        types.KeyboardButton("👤 حسابي ورصيدي"),
        types.KeyboardButton("💬 الدعم والمساعدة AI")
    )
    
    if is_admin:
        markup.add(types.KeyboardButton("⚙️ لوحة الإدارة والتحكم"))
        
    return markup

def build_back_to_main_keyboard():
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
    return markup
