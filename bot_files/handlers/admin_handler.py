# =========================================================
# YasNum & VaultX - Admin Panel Handlers
# =========================================================

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
from database import (
    get_user, update_user_balance, get_all_users_count,
    get_total_balance_sum, get_setting, set_setting, create_voucher
)
from keyboards.admin_kb import build_admin_panel_keyboard, build_admin_smm_settings_keyboard
from services.smm_service import fetch_smm_user_balance, fetch_smm_services
from config import ADMIN_ID

admin_states = {}

def register_admin_handlers(bot):

    @bot.message_handler(func=lambda m: m.text == "⚙️ لوحة الإدارة والتحكم" and m.from_user.id == ADMIN_ID)
    @bot.message_handler(commands=['admin'])
    def handle_admin_panel(message):
        if message.from_user.id != ADMIN_ID:
            return
            
        text = (
            "⚙️ **لوحة التحكم والإدارة المركزية (YasNum & VaultX):**\n\n"
            "يمكنك التحكم بكافة خيارات البوت والسيرفرات والرصيد من هنا 👇"
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=build_admin_panel_keyboard())

    @bot.callback_query_handler(func=lambda call: call.data == "admin_panel" and call.from_user.id == ADMIN_ID)
    def handle_admin_panel_cb(call):
        text = "⚙️ **لوحة التحكم والإدارة المركزية:**"
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, parse_mode="Markdown", reply_markup=build_admin_panel_keyboard())

    @bot.callback_query_handler(func=lambda call: call.data == "admin_stats" and call.from_user.id == ADMIN_ID)
    def handle_admin_stats(call):
        users_cnt = get_all_users_count()
        total_bal = get_total_balance_sum()
        smm_margin = get_setting("smm_margin", "0.30")
        
        text = (
            "📊 **إحصائيات النظام الشاملة:**\n\n"
            f"👥 **إجمالي المستخدمين المسجلين:** `{users_cnt:,}`\n"
            f"💵 **مجموع أرصدة المستخدمين:** `${total_bal:.2f}`\n"
            f"📈 **نسبة أرباح الرشق الحالية:** `{float(smm_margin)*100:.0f}%`\n"
        )
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, parse_mode="Markdown", reply_markup=build_admin_panel_keyboard())

    @bot.callback_query_handler(func=lambda call: call.data == "admin_check_smm_bal" and call.from_user.id == ADMIN_ID)
    def handle_smm_balance_check(call):
        bal, curr = fetch_smm_user_balance()
        if bal:
            msg = f"💳 **رصيد حسابك في سيرفر الرشق SMMTigers:**\n\n💰 `{bal}` {curr}"
        else:
            msg = f"⚠️ تعذر جلب الرصيد: {curr}"
        bot.answer_callback_query(call.id, msg, show_alert=True)

    @bot.callback_query_handler(func=lambda call: call.data == "admin_smm_settings" and call.from_user.id == ADMIN_ID)
    def handle_smm_settings_menu(call):
        key_status = "مضبوط ✅" if get_setting("smm_key", "") else "غير مضبوط ⚠️"
        url_status = get_setting("smm_url", "https://smmtigers.com/api/v2")
        margin = float(get_setting("smm_margin", "0.30")) * 100
        
        text = (
            "⚙️ **إعدادات وتكوين سيرفر الرشق SMMTigers:**\n\n"
            f"🔑 **حالة API Key:** {key_status}\n"
            f"🌐 **رابط السيرفر:** `{url_status}`\n"
            f"📈 **هامش الربح الحالي:** `{margin:.0f}%`\n"
        )
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, parse_mode="Markdown", reply_markup=build_admin_smm_settings_keyboard())

    @bot.callback_query_handler(func=lambda call: call.data == "admin_set_smm_key" and call.from_user.id == ADMIN_ID)
    def handle_set_smm_key_prompt(call):
        admin_states[str(ADMIN_ID)] = {"action": "input_smm_key"}
        bot.send_message(call.message.chat.id, "🔑 **أرسل مفتاح الـ API الجديد لسيرفر الرشق SMMTigers / JAP:**")
        bot.answer_callback_query(call.id)

    @bot.message_handler(func=lambda m: m.from_user.id == ADMIN_ID and str(ADMIN_ID) in admin_states and admin_states[str(ADMIN_ID)].get("action") == "input_smm_key")
    def process_smm_key_input(message):
        key = message.text.strip()
        set_setting("smm_key", key)
        set_setting("smm_api_key", key)
        admin_states.pop(str(ADMIN_ID), None)
        
        fetch_smm_services(force_refresh=True)
        bot.send_message(message.chat.id, "✅ **تم حفظ مفتاح الـ API بنجاح وتحديث قائمة الخدمات!**")

    @bot.callback_query_handler(func=lambda call: call.data == "admin_set_smm_margin" and call.from_user.id == ADMIN_ID)
    def handle_set_smm_margin_prompt(call):
        admin_states[str(ADMIN_ID)] = {"action": "input_smm_margin"}
        bot.send_message(call.message.chat.id, "📈 **أرسل نسبة الربح الإضافية (مثال: أرسل 30 لنسبة 30%):**")
        bot.answer_callback_query(call.id)

    @bot.message_handler(func=lambda m: m.from_user.id == ADMIN_ID and str(ADMIN_ID) in admin_states and admin_states[str(ADMIN_ID)].get("action") == "input_smm_margin")
    def process_smm_margin_input(message):
        try:
            val = float(message.text.strip()) / 100.0
            set_setting("smm_margin", str(val))
            admin_states.pop(str(ADMIN_ID), None)
            bot.send_message(message.chat.id, f"✅ **تم تعديل نسبة الربح إلى {val*100:.0f}% بنجاح!**")
        except ValueError:
            bot.send_message(message.chat.id, "❌ يرجى إدخال رقم صحيح فقط (مثال: 25).")

    @bot.callback_query_handler(func=lambda call: call.data == "admin_gen_voucher" and call.from_user.id == ADMIN_ID)
    def handle_gen_voucher_prompt(call):
        admin_states[str(ADMIN_ID)] = {"action": "input_voucher_value"}
        bot.send_message(call.message.chat.id, "🎟️ **أرسل قيمة كود الهدية بالدولار (مثال: 5.00):**")
        bot.answer_callback_query(call.id)

    @bot.message_handler(func=lambda m: m.from_user.id == ADMIN_ID and str(ADMIN_ID) in admin_states and admin_states[str(ADMIN_ID)].get("action") == "input_voucher_value")
    def process_voucher_value_input(message):
        try:
            val = float(message.text.strip())
            code = create_voucher(val)
            admin_states.pop(str(ADMIN_ID), None)
            
            text = (
                f"🎉 **تم إنشاء كرت الهدية بنجاح!**\n\n"
                f"🎟️ **الكود:** `{code}`\n"
                f"💵 **القيمة:** `${val:.2f}`\n\n"
                f"أرسل هذا الكود للمستخدم ليشحنه فوراً من خيار (شحن كرت هدية)."
            )
            bot.send_message(message.chat.id, text, parse_mode="Markdown")
        except ValueError:
            bot.send_message(message.chat.id, "❌ يرجى إدخال قيمة رقمية صحيحة (مثال: 10).")
