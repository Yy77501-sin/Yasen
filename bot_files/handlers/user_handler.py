# =========================================================
# YasNum & VaultX - User & Main Menu Handlers
# =========================================================

import time
try:
    import telebot
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
from database import get_user, update_user_balance, add_order_log, get_setting
from keyboards.main_kb import build_main_keyboard, build_back_to_main_keyboard
from services.vaultx_service import process_voucher_redemption, generate_temp_email
from config import ADMIN_ID, SUPPORT_USERNAME, MAIN_CHANNEL_URL

user_states = {}

def register_user_handlers(bot):

    @bot.message_handler(commands=['start'])
    def handle_start(message):
        user_id = message.from_user.id
        username = message.from_user.username or ""
        first_name = message.from_user.first_name or "المستخدم"
        
        # معالجة رابط الإحالة إن وجد
        args = message.text.split()
        referrer_id = None
        if len(args) > 1 and args[1].isdigit():
            possible_ref = int(args[1])
            if possible_ref != user_id:
                referrer_id = possible_ref
                
        user = get_user(user_id, username, first_name, referrer_id)
        is_admin = (user_id == ADMIN_ID)
        
        welcome_text = (
            f"👋 **أهلاً بك يا {first_name} في متجر YasNum & VaultX الشامل!**\n\n"
            f"💎 **خدمات المتجر المتاحة فورياً:**\n"
            f"• 📱 **أرقام وهمية لجميع التطبيقات (SMS)**\n"
            f"• 👑 **خدمات الرشق والمتابعين (SMM)**\n"
            f"• 🎮 **شحن الألعاب والشدات والمجوهرات**\n"
            f"• 🤖 **اشتراكات وبرامج الذكاء الاصطناعي Pro**\n"
            f"• ✈️ **حسابات تيليجرام جاهزة (Tdata/Session)**\n"
            f"• 📧 **بريد إلكتروني مؤقت للتفعيل الآمن**\n\n"
            f"💰 **رصيدك الحالي:** `${user.get('balance', 0.0):.2f}`\n"
            f"🆔 **معرف حسابك:** `{user_id}`\n\n"
            f"اختر من القائمة أدناه للبدء 👇"
        )
        
        bot.send_message(
            message.chat.id,
            welcome_text,
            parse_mode="Markdown",
            reply_markup=build_main_keyboard(is_admin)
        )

    @bot.message_handler(func=lambda m: m.text == "👤 حسابي ورصيدي")
    def handle_profile(message):
        user_id = message.from_user.id
        user = get_user(user_id)
        
        profile_text = (
            f"👤 **معلومات حسابك الشخصي:**\n\n"
            f"🆔 **ID:** `{user_id}`\n"
            f"💰 **الرصيد المتاح:** `${user.get('balance', 0.0):.2f}`\n"
            f"🛒 **إجمالي العمليات الناجحة:** `{user.get('orders_count', 0)}`\n"
            f"💵 **إجمالي الشحنات:** `${user.get('total_deposited', 0.0):.2f}`\n"
            f"👥 **عدد الإحالات:** `{user.get('referrals_count', 0)}`\n\n"
            f"🔗 **رابط الإحالة الخاص بك:**\n"
            f"`https://t.me/{(bot.get_me().username)}?start={user_id}`\n"
            f"🎁 احصل على $0.10 لكل شخص يقوم بالتسجيل والشحن عن طريق رابطك!"
        )
        bot.send_message(message.chat.id, profile_text, parse_mode="Markdown")

    @bot.message_handler(func=lambda m: m.text == "💬 الدعم والمساعدة AI")
    def handle_support(message):
        support_text = (
            f"💬 **قسم الدعم الفني والمساعدة:**\n\n"
            f"👤 **حساب الدعم المباشر:** @{SUPPORT_USERNAME}\n"
            f"📢 **قناة التحديثات والأخبار:** [اضغط هنا للإنضمام]({MAIN_CHANNEL_URL})\n\n"
            f"⚡ **مواعيد العمل:** 24/7 فورية للرد على استفساراتكم وإيداعاتكم."
        )
        bot.send_message(message.chat.id, support_text, parse_mode="Markdown", disable_web_page_preview=True)

    @bot.message_handler(func=lambda m: m.text in ["🎁 شحن كرت أو كود هدية", "شحن كود"])
    def handle_voucher_prompt(message):
        user_id = message.from_user.id
        user_states[str(user_id)] = {"action": "input_voucher"}
        
        bot.send_message(
            message.chat.id,
            "🎁 **شحن كود / كرت هدية:**\n\nمن فضلك أرسل الكود هنا في رسالة واحدة ليتم شحن رصيدك فوراً:"
        )

    @bot.message_handler(func=lambda m: m.text == "📧 بريد إلكتروني مؤقت")
    def handle_temp_email(message):
        user_id = message.from_user.id
        email = generate_temp_email(user_id)
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        markup.add(
            types.InlineKeyboardButton("🔄 فحص الوارد (Inbox)", callback_data=f"check_email_{user_id}"),
            types.InlineKeyboardButton("➕ إنشاء إيميل جديد", callback_data="gen_new_email")
        )
        
        text = (
            f"📧 **بريدك الإلكتروني المؤقت الجاهز:**\n\n"
            f"`{email}`\n\n"
            f"💡 يمكنك استخدام هذا البريد لتلقي أكواد التفعيل والرسائل الآمنة.\n"
            f"اضغط على زر (فحص الوارد) لقراءة الرسائل الواصلة."
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=markup)

    @bot.message_handler(func=lambda m: str(m.from_user.id) in user_states and user_states[str(m.from_user.id)].get("action") == "input_voucher")
    def process_voucher_input(message):
        user_id = message.from_user.id
        code_str = message.text.strip()
        user_states.pop(str(user_id), None)
        
        success, msg = process_voucher_redemption(user_id, code_str)
        bot.send_message(message.chat.id, msg)
