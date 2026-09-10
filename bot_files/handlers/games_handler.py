# =========================================================
# YasNum & VaultX - Games & Digital Services Handlers
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
from services.vaultx_service import GAME_TOPUPS, PRO_ACCOUNTS

user_game_states = {}

def register_games_handlers(bot):

    @bot.message_handler(func=lambda m: m.text in ["🎮 شحن الألعاب والشدات", "شحن الألعاب"])
    def handle_games_menu(message):
        markup = types.InlineKeyboardMarkup(row_width=1)
        for gid, ginfo in GAME_TOPUPS.items():
            btn_text = f"{ginfo['icon']} {ginfo['title']} - (${ginfo['price']})"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"buy_game_{gid}"))
            
        markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
        
        text = (
            "🎮 **قسم شحن الألعاب والشدات الفورية:**\n\n"
            "اختر الباقة أو الشدة المطلوبة لشحن حسابك برقم الـ ID 👇"
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=markup)

    @bot.message_handler(func=lambda m: m.text in ["🤖 اشتراكات وباقات AI", "اشتراكات برو"])
    def handle_pro_accounts_menu(message):
        markup = types.InlineKeyboardMarkup(row_width=1)
        for pid, pinfo in PRO_ACCOUNTS.items():
            btn_text = f"{pinfo['icon']} {pinfo['title']} - (${pinfo['price']})"
            markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"buy_pro_{pid}"))
            
        markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
        
        text = (
            "🤖 **قسم اشتراكات وباقات الذكاء الاصطناعي والتطبيقات البرو:**\n\n"
            "تسليم فوري ومباشر للحسابات مع الضمان الكامل 👇"
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=markup)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("buy_game_"))
    def handle_game_buy_click(call):
        gid = call.data.replace("buy_game_", "").strip()
        ginfo = GAME_TOPUPS.get(gid)
        if not ginfo:
            bot.answer_callback_query(call.id, "الباقة غير متوفرة حالياً.")
            return
            
        user_id = call.from_user.id
        user_game_states[str(user_id)] = {"action": "input_player_id", "game_id": gid}
        
        bot.send_message(
            call.message.chat.id,
            f"🎯 **شحن {ginfo['title']}:**\n\n"
            f"💰 السعر: `${ginfo['price']}`\n\n"
            f"👇 **من فضلك أرسل رقم الـ ID الخاص بك في اللعبة الآن:**"
        )
        bot.answer_callback_query(call.id)

    @bot.message_handler(func=lambda m: str(m.from_user.id) in user_game_states and user_game_states[str(m.from_user.id)].get("action") == "input_player_id")
    def process_player_id_input(message):
        user_id = message.from_user.id
        player_id = message.text.strip()
        state = user_game_states.pop(str(user_id), {})
        
        gid = state.get("game_id")
        ginfo = GAME_TOPUPS.get(gid)
        if not ginfo:
            return
            
        cost = ginfo["price"]
        user = get_user(user_id)
        balance = user.get("balance", 0.0)
        
        if balance < cost:
            bot.send_message(
                message.chat.id,
                f"❌ **رصيدك غير كافٍ للشحن!**\n\n"
                f"💵 التكلفة: `${cost}` | 💰 رصيدك: `${balance:.2f}`"
            )
            return
            
        update_user_balance(user_id, -cost)
        add_order_log(user_id, f"شحن لعبة {ginfo['game']}", cost, f"ID: {player_id} | {ginfo['title']}")
        
        text = (
            f"🎉 **تم إرسال طلب الشحن بنجاح!**\n\n"
            f"🎮 **النزية:** {ginfo['title']}\n"
            f"🆔 **الـ ID:** `{player_id}`\n"
            f"💰 **المبلغ المخصوم:** `${cost}`\n\n"
            f"⚡ جاري شحن حسابك في اللعبة خلال لحظات قليلة!"
        )
        bot.send_message(message.chat.id, text, parse_mode="Markdown")

    @bot.callback_query_handler(func=lambda call: call.data.startswith("buy_pro_"))
    def handle_pro_buy_click(call):
        pid = call.data.replace("buy_pro_", "").strip()
        pinfo = PRO_ACCOUNTS.get(pid)
        if not pinfo:
            bot.answer_callback_query(call.id, "الحساب غير متوفر حالياً.")
            return
            
        user_id = call.from_user.id
        cost = pinfo["price"]
        user = get_user(user_id)
        balance = user.get("balance", 0.0)
        
        if balance < cost:
            bot.answer_callback_query(call.id, f"❌ رصيدك غير كافٍ (${balance:.2f})", show_alert=True)
            return
            
        update_user_balance(user_id, -cost)
        add_order_log(user_id, f"شراء حساب {pinfo['title']}", cost, "تسليم فوري")
        
        text = (
            f"🎉 **تم شراء الحساب بنجاح!**\n\n"
            f"📦 **المنتج:** {pinfo['title']}\n"
            f"💰 **المبلغ المخصوم:** `${cost}`\n\n"
            f"📧 **بيانات الدخول والاشتراك:**\n"
            f"`Email: user_{user_id}@vaultx.pro`\n"
            f"`Pass: VaultPro2026!#`\n\n"
            f"🔒 الضمان ممتد طوال فترة الاشتراك."
        )
        bot.send_message(call.message.chat.id, text, parse_mode="Markdown")
        bot.answer_callback_query(call.id)
