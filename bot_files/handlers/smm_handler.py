# =========================================================
# YasNum & VaultX - SMM Handlers
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
from database import get_user, update_user_balance, add_order_log
from keyboards.smm_kb import build_smm_categories_keyboard, build_smm_platform_services_keyboard
from services.smm_service import (
    get_smm_service_by_id, build_smm_service_card_text,
    arabic_translate_smm_service, send_smm_api_order, get_smm_margin
)

user_states = {}

def register_smm_handlers(bot):

    @bot.message_handler(func=lambda m: m.text == "👑 خدمات الرشق والمتابعين")
    def handle_smm_menu(message):
        text = (
            "👑 **قسم خدمات الرشق وزيادة المتابعين والتفاعلات:**\n\n"
            "اختر المنصة أو التطبيق الذي ترغب بزيادة المتابعين أو التفاعلات له 👇"
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=build_smm_categories_keyboard())

    @bot.callback_query_handler(func=lambda call: call.data.startswith("smm_p_"))
    def handle_smm_platform(call):
        try:
            parts = call.data.split("_")
            platform_code = parts[2]
            page = int(parts[3]) if len(parts) > 3 else 0
            
            kb, total_items, curr_page, max_pages = build_smm_platform_services_keyboard(platform_code, page)
            
            p_name = platform_code.upper()
            text = (
                f"🚀 **خدمات قسم ({p_name}):**\n\n"
                f"📊 عدد الخدمات المتاحة: {total_items}\n"
                f"📄 الصفحة {curr_page} من {max_pages}\n\n"
                f"اختر الخدمة المطلوبة من القائمة أدناه 👇"
            )
            
            bot.edit_message_text(text, call.message.chat.id, call.message.message_id, parse_mode="Markdown", reply_markup=kb)
        except Exception as e:
            bot.answer_callback_query(call.id, f"خطأ: {e}")

    @bot.callback_query_handler(func=lambda call: call.data.startswith("smm_srv_"))
    def handle_smm_service_click(call):
        try:
            sid = call.data.replace("smm_srv_", "").strip()
            s_info = get_smm_service_by_id(sid)
            
            if not s_info:
                bot.answer_callback_query(call.id, "⚠️ الخدمة غير متوفرة حالياً.", show_alert=True)
                return
                
            user_id = call.from_user.id
            sname = arabic_translate_smm_service(s_info.get("name", s_info.get("title", "خدمة")))
            rate = float(s_info.get("rate", s_info.get("raw_per_1000", 0.3)))
            smm_margin = get_smm_margin()
            user_rate_1k = round(rate * (1.0 + smm_margin), 4)
            min_q = s_info.get("min", s_info.get("min_qty", 10))
            max_q = s_info.get("max", s_info.get("max_qty", 1000000))
            
            user_states[str(user_id)] = {
                "action": "smm_input_link",
                "service_id": sid,
                "service_name": sname,
                "rate_1k": user_rate_1k,
                "min_q": int(min_q) if str(min_q).isdigit() else 100,
                "max_q": int(max_q) if str(max_q).isdigit() else 10000
            }
            
            card_text = (
                f"🚀 **تفاصيل ومواصفات الخدمة المختارة:**\n\n"
                f"👑 **الخدمة:** {sname}\n"
                f"💰 **السعر لكل 1,000:** `${user_rate_1k:.3f}`\n"
                f"🔢 **أدنى كمية:** {min_q} | **أقصى كمية:** {max_q:,}\n\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"👇 **من فضلك أرسل رابط المنشور أو الحساب المراد رشقه الآن:**"
            )
            
            markup = types.InlineKeyboardMarkup()
            markup.add(types.InlineKeyboardButton("❌ إلغاء والعودة", callback_data="btn_services_games"))
            
            bot.send_message(call.message.chat.id, card_text, parse_mode="Markdown", reply_markup=markup)
            bot.answer_callback_query(call.id)
        except Exception as e:
            bot.answer_callback_query(call.id, f"خطأ: {e}")

    @bot.message_handler(func=lambda m: str(m.from_user.id) in user_states and user_states[str(m.from_user.id)].get("action") == "smm_input_link")
    def process_smm_link_input(message):
        user_id = message.from_user.id
        link = message.text.strip()
        
        state = user_states[str(user_id)]
        state["link"] = link
        state["action"] = "smm_input_qty"
        
        text = (
            f"✅ **تم تسجيل الرابط:** `{link}`\n\n"
            f"🔢 **الآن أرسل الكمية المطلوبة:**\n"
            f"(من {state['min_q']} إلى {state['max_q']:,})"
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown")

    @bot.message_handler(func=lambda m: str(m.from_user.id) in user_states and user_states[str(m.from_user.id)].get("action") == "smm_input_qty")
    def process_smm_qty_input(message):
        user_id = message.from_user.id
        state = user_states.pop(str(user_id), {})
        
        if not message.text.isdigit():
            bot.send_message(message.chat.id, "❌ يرجى إدخال أرقام فقط للكمية.")
            return
            
        qty = int(message.text)
        min_q = state.get("min_q", 10)
        max_q = state.get("max_q", 1000000)
        
        if qty < min_q or qty > max_q:
            bot.send_message(message.chat.id, f"❌ الكمية يجب أن تكون بين {min_q} و {max_q:,}")
            return
            
        rate_1k = state.get("rate_1k", 0.3)
        cost = round((qty / 1000.0) * rate_1k, 4)
        
        user = get_user(user_id)
        balance = user.get("balance", 0.0)
        
        if balance < cost:
            bot.send_message(
                message.chat.id,
                f"❌ **رصيدك غير كافٍ لإتمام العملية!**\n\n"
                f"💵 تكلفة الطلب: `${cost:.4f}`\n"
                f"💰 رصيدك الحالي: `${balance:.4f}`\n\n"
                f"يرجى شحن حسابك من قائمة (شحن الرصيد)."
            )
            return
            
        # تنفيذ الطلب
        sid = state.get("service_id")
        link = state.get("link")
        
        ok, order_res = send_smm_api_order(sid, link, qty)
        if ok:
            update_user_balance(user_id, -cost)
            add_order_log(user_id, f"رشق SMM #{order_res}", cost, f"خدمة #{sid} | كمية {qty}")
            
            success_text = (
                f"🎉 **تم إرسال طلب الرشق بنجاح!**\n\n"
                f"🆔 **رقم الطلب (Order ID):** `{order_res}`\n"
                f"👑 **الخدمة:** {state.get('service_name')}\n"
                f"🔢 **الكمية:** {qty:,}\n"
                f"💰 **المبلغ المخصوم:** `${cost:.4f}`\n"
                f"🔗 **الرابط:** `{link}`\n\n"
                f"شكراً لاستخدامك متجرنا! ⚡"
            )
            bot.send_message(message.chat.id, success_text, parse_mode="Markdown")
        else:
            bot.send_message(message.chat.id, f"⚠️ تعذر إرسال الطلب للسيرفر:\n{order_res}")
