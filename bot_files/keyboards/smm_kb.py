# =========================================================
# YasNum & VaultX - SMM Keyboards
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
from services.smm_service import filter_smm_services, arabic_translate_smm_service, get_smm_margin

def build_smm_categories_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("✈️ تيليجرام", callback_data="smm_p_tg_0"),
        types.InlineKeyboardButton("📸 إنستغرام", callback_data="smm_p_ig_0")
    )
    markup.add(
        types.InlineKeyboardButton("🎵 تيك توك", callback_data="smm_p_tt_0"),
        types.InlineKeyboardButton("👤 فيسبوك", callback_data="smm_p_fb_0")
    )
    markup.add(
        types.InlineKeyboardButton("🔴 يوتيوب", callback_data="smm_p_yt_0"),
        types.InlineKeyboardButton("🐦 تويتر / X", callback_data="smm_p_x_0")
    )
    markup.add(
        types.InlineKeyboardButton("🧵 ثريدز", callback_data="smm_p_th_0"),
        types.InlineKeyboardButton("☁️ ساوند كلاود", callback_data="smm_p_sc_0")
    )
    markup.add(
        types.InlineKeyboardButton("🟢 واتساب", callback_data="smm_p_wa_0"),
        types.InlineKeyboardButton("🎮 شحن الألعاب", callback_data="smm_p_games_0")
    )
    markup.add(types.InlineKeyboardButton("🔍 بحث عن خدمة بالاسم / ID", callback_data="prompt_smm_search"))
    markup.add(types.InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data="back_to_main"))
    return markup

def build_smm_platform_services_keyboard(platform_code, page=0, query=""):
    markup = types.InlineKeyboardMarkup(row_width=1)
    services = filter_smm_services(platform_code, query)
    smm_margin = get_smm_margin()
    
    items_per_page = 10
    total_items = len(services)
    total_pages = max(1, (total_items + items_per_page - 1) // items_per_page)
    page = max(0, min(page, total_pages - 1))
    
    start_idx = page * items_per_page
    end_idx = min(start_idx + items_per_page, total_items)
    page_items = services[start_idx:end_idx]
    
    for s in page_items:
        sid = s.get("service")
        sname_raw = str(s.get("name", "خدمة"))
        sname = arabic_translate_smm_service(sname_raw)
        if len(sname) > 38:
            sname = sname[:35] + "..."
            
        try:
            raw_rate = float(s.get("rate", 0.0))
        except Exception:
            raw_rate = 0.0
            
        user_rate_1k = raw_rate * (1.0 + smm_margin)
        btn_text = f"👑 {sname} (${user_rate_1k:.3f}/1k)"
        markup.add(types.InlineKeyboardButton(btn_text, callback_data=f"smm_srv_{sid}"))
        
    nav_btns = []
    if page > 0:
        nav_btns.append(types.InlineKeyboardButton("⬅️ السابق", callback_data=f"smm_p_{platform_code}_{page-1}"))
    nav_btns.append(types.InlineKeyboardButton(f"📄 ({page+1}/{total_pages})", callback_data="smm_ignore"))
    if page < total_pages - 1:
        nav_btns.append(types.InlineKeyboardButton("التالي ➡️", callback_data=f"smm_p_{platform_code}_{page+1}"))
        
    if nav_btns:
        markup.row(*nav_btns)
        
    markup.add(types.InlineKeyboardButton("🔙 العودة لجميع الأقسام", callback_data="btn_services_games"))
    return markup, total_items, page+1, total_pages
