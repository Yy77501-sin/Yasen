# =========================================================
# YasNum & VaultX - Game Topups & Pro Accounts & Vouchers
# =========================================================

import random
import string
import catalog
from database import (
    get_user, update_user_balance, add_order_log,
    get_setting, set_setting, create_voucher, redeem_voucher
)

# قائمة شحن الألعاب من VaultX
GAME_TOPUPS = {
    "pubg_60": {"id": "pubg_60", "title": "60 شدة ببجي (PUBG UC)", "game": "ببجي PUBG", "price": 1.20, "icon": "🔫"},
    "pubg_325": {"id": "pubg_325", "title": "325 شدة ببجي (PUBG UC)", "game": "ببجي PUBG", "price": 5.50, "icon": "🔫"},
    "pubg_660": {"id": "pubg_660", "title": "660 شدة ببجي (PUBG UC)", "game": "ببجي PUBG", "price": 10.50, "icon": "🔫"},
    "ff_100": {"id": "ff_100", "title": "100 مجوهرة فري فاير", "game": "فري فاير FreeFire", "price": 1.10, "icon": "💎"},
    "ff_530": {"id": "ff_530", "title": "530 مجوهرة فري فاير", "game": "فري فاير FreeFire", "price": 5.20, "icon": "💎"},
    "robux_400": {"id": "robux_400", "title": "400 روبوكس روبلوكس", "game": "روبلوكس Roblox", "price": 5.00, "icon": "🕹️"}
}

# قائمة حسابات واشتراكات برو
PRO_ACCOUNTS = {
    "chatgpt_plus": {"id": "chatgpt_plus", "title": "حساب ChatGPT Plus مدفوع 1 شهر", "category": "AI", "price": 6.50, "icon": "🤖"},
    "canva_pro": {"id": "canva_pro", "title": "اشتراك Canva Pro سنة كاملة", "category": "Design", "price": 3.50, "icon": "🎨"},
    "claude_pro": {"id": "claude_pro", "title": "حساب Claude Pro مدفوع", "category": "AI", "price": 7.00, "icon": "🧠"},
    "netflix_4k": {"id": "netflix_4k", "title": "اشتراك نيتفليكس 4K شاشة خاصة", "category": "Media", "price": 4.00, "icon": "🎬"}
}

def generate_temp_email(user_id):
    domain = "mailvaultx.com"
    rand_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    email = f"user_{user_id}_{rand_str}@{domain}"
    return email

def get_temp_email_inbox(email):
    return [
        {
            "from": "support@service.com",
            "subject": "كود التفعيل الخاص بك",
            "date": "الآن",
            "body": "رمز التفعيل الخاص بك هو: 849201"
        }
    ]

def process_voucher_redemption(user_id, code_str):
    res, msg = redeem_voucher(user_id, code_str)
    return res, msg
