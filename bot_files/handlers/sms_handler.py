# =========================================================
# YasNum & VaultX - SMS Virtual Numbers Handlers
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
import catalog
from database import get_user, update_user_balance, add_order_log
from services.sms_service import buy_sms_number, check_sms_code, cancel_sms_order

active_sms_sessions = {}

def register_sms_handlers(bot):

    @bot.message_handler(func=lambda m: m.text in ["📱 شراء رقم وهمي (SMS)", "شراء رقم"])
    def handle_sms_menu(message):
        markup = types.InlineKeyboardMarkup(row_width=2)
        for app_id, app_info in catalog.MAIN_APPS.items():
            btn_text = f"{app_info['icon']} {app_info['name']}"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"sms_app_{app_id}"))
            
        markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
        
        text = (
            "📱 **قسم شراء الأرقام الوهمية وتفعيل الحسابات (SMS):**\n\n"
            "اختر التطبيق المراد تفعيله من القائمة أدناه 👇"
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=markup)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("sms_app_"))
    def handle_sms_app_click(call):
        app_id = call.data.replace("sms_app_", "").strip()
        app_info = catalog.MAIN_APPS.get(app_id, {"name": app_id, "icon": "📱"})
        
        markup = types.InlineKeyboardMarkup(row_width=1)
        for s_id, s_info in catalog.SERVERS.items():
            btn_text = f"{s_info['title']} - {s_info['badge']}"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"sms_srv_{app_id}_{s_id}"))
            
        markup.add(types.InlineKeyboardButton("🔙 العودة للتطبيقات", callback_data="sms_main_apps"))
        
        text = (
            f"🎯 **تطبيق {app_info['icon']} {app_info['name']}:**\n\n"
            f"اختر السيرفر المناسب للشراء 👇"
        )
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, parse_mode="Markdown", reply_markup=markup)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("sms_srv_"))
    def handle_sms_server_click(call):
        parts = call.data.split("_")
        app_id = parts[2]
        srv_id = parts[3]
        
        app_info = catalog.MAIN_APPS.get(app_id, {"name": app_id, "icon": "📱"})
        
        # اختيار الدول الشائعة لتسهيل الشراء
        popular_countries = [
            ("ye", "🇾🇪 اليمن"),
            ("sa", "🇸🇦 السعودية"),
            ("eg", "🇪🇬 مصر"),
            ("ae", "🇦🇪 الإمارات"),
            ("us", "🇺🇸 أمريكا"),
            ("ru", "🇷🇺 روسيا")
        ]
        
        markup = types.InlineKeyboardMarkup(row_width=2)
        for c_code, c_name in popular_countries:
            markup.add(types.InlineKeyboardButton(f"شراء ({c_name})", callback_data=f"sms_buy_{app_id}_{srv_id}_{c_code}"))
            
        markup.add(types.InlineKeyboardButton("🔙 العودة السيرفرات", callback_data=f"sms_app_{app_id}"))
        
        text = (
            f"🌍 **اختر الدولة لتفعيل {app_info['icon']} {app_info['name']} (السيرفر {srv_id.upper()}):**\n\n"
            f"اضغط على الدولة للشراء الفوري واستلام الكود 👇"
        )
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, parse_mode="Markdown", reply_markup=markup)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("sms_buy_"))
    def handle_sms_buy_execute(call):
        parts = call.data.split("_")
        app_id = parts[2]
        srv_id = parts[3]
        country_code = parts[4]
        
        user_id = call.from_user.id
        
        # فحص رصيد المستخدم
        user = get_user(user_id)
        balance = user.get("balance", 0.0)
        
        if balance < 0.30:
            bot.answer_callback_query(call.id, "❌ رصيدك غير كافٍ للشراء (الحد الأدنى $0.30).", show_alert=True)
            return
            
        bot.answer_callback_query(call.id, "⏳ جاري طلب الرقم واستخراج الكود...")
        
        res = buy_sms_number(app_id, srv_id, country_code)
        
        if res.get("success"):
            phone = res.get("phone")
            order_id = res.get("order_id")
            cost = float(res.get("price", 0.30))
            
            update_user_balance(user_id, -cost)
            add_order_log(user_id, f"شراء رقم {app_id.upper()}", cost, f"الرقم: {phone}")
            
            active_sms_sessions[str(order_id)] = {
                "user_id": user_id,
                "phone": phone,
                "srv": srv_id,
                "app": app_id,
                "cost": cost
            }
            
            markup = types.InlineKeyboardMarkup(row_width=1)
            markup.add(
                types.InlineKeyboardButton("🔄 تحديث وفحص الوصول (Check Code)", callback_data=f"sms_check_{order_id}"),
                types.InlineKeyboardButton("❌ إلغاء الطلب واسترجاع الرصيد", callback_data=f"sms_cancel_{order_id}")
            )
            
            text = (
                f"🎉 **تم شراء الرقم بنجاح!**\n\n"
                f"📱 **الرقم:** `{phone}`\n"
                f"🆔 **رقم الطلب:** `{order_id}`\n"
                f"💰 **المبلغ:** `${cost:.2f}`\n\n"
                f"⏳ **بانتظار وصول الكود...** اضغط على (تحديث) عند إرسال الكود من التطبيق."
            )
            bot.send_message(call.message.chat.id, text, parse_mode="Markdown", reply_markup=markup)
        else:
            bot.send_message(call.message.chat.id, f"⚠️ تعذر طلب الرقم من السيرفر:\n{res.get('error', 'السيرفر مشغول حالياً')}")

    @bot.callback_query_handler(func=lambda call: call.data.startswith("sms_check_"))
    def handle_sms_check(call):
        order_id = call.data.replace("sms_check_", "").strip()
        sess = active_sms_sessions.get(str(order_id))
        
        srv_id = sess.get("srv", "s1") if sess else "s1"
        res = check_sms_code(order_id, srv_id)
        
        status = res.get("status", "").upper()
        if status == "RECEIVED" or "code" in res:
            code = res.get("code") or res.get("sms")
            bot.send_message(
                call.message.chat.id,
                f"✅ **وصل كود التفعيل بنجاح!**\n\n"
                f"🔑 **الكود:** `{code}`\n"
                f"📱 **الرقم:** `{sess.get('phone', '') if sess else ''}`"
            )
            bot.answer_callback_query(call.id, f"كود التفعيل: {code}", show_alert=True)
        else:
            bot.answer_callback_query(call.id, "⏳ لم يصل الكود بعد، يرجى الانتظار والمحاولة مجدداً.", show_alert=True)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("sms_cancel_"))
    def handle_sms_cancel(call):
        order_id = call.data.replace("sms_cancel_", "").strip()
        sess = active_sms_sessions.pop(str(order_id), {})
        
        user_id = call.from_user.id
        srv_id = sess.get("srv", "s1")
        cost = sess.get("cost", 0.30)
        
        cancel_sms_order(order_id, srv_id)
        update_user_balance(user_id, cost)
        
        bot.send_message(
            call.message.chat.id,
            f"✅ **تم إلغاء طلب الرقم #{order_id} وإعادة المبلغ `${cost:.2f}` إلى رصيدك.**"
        )
        bot.answer_callback_query(call.id)
