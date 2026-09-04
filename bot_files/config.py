# =========================================================
# ياسنوم - إعدادات
# مع bot.py
# =========================================================

استيراد نظام التشغيل

# =========================================================
بوت تيليجرام
# =========================================================

BOT_TOKEN = os.getenv("BOT_TOKEN"، "8657439320:AAFTQ-JxlBAfRyaP2yWnjO_4IjpuXdrA3Rc").strip()

#ضع ADMIN_ID في Render/Railway كمتغير البيئة.
#مثال: ADMIN_ID=123456789
يحاول:
    ADMIN_ID = int(os.getenv("ADMIN_ID","8097770003").strip() or "0")
باستثناء خطأ القيمة:
    ADMIN_ID = 0

# =========================================================
# فايف سيم
# =========================================================

FIVESIM_API_KEY = os.getenv(
    "FIVESIM_API_KEY",
    "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTk4MTcyOTksImlhdCI6MTc4ODI4MTI5OSwicmF5IjoiYmJlMjZmZGFkZGMzM2FiMzFlNDBhM2JmYjNmMTJkMDciLCJzdWIiOjQ0NzgxNTN9.QBAYyUjtp1JdDHdTu50ErRkFP2_BCfvK3O6Htnd6lQkRnD_WEtIPAzvObmpPrINpkx8UUB3h6OT3-rWUGGITU38ZQ5Hg OXK6CCRPNuPFMasrHeFFnX9CSOoqa4Lz86NsxF4w3dcBLurR60D-S6cI4Jsk-dPQwXU8OgOamwe37NdM4D2QB5blx9VJgbHVg9jIoeVXMiNaeKdZYHFSHSL8wULCS9ug6EnwzlIDgyreFmFghzLPh20FCysZR0r7I_jcElmmUZAwU8uc94bNxOZ4udBKIZ08JgU1crusM-PWaBsH1TnEYsXKrQlQGQg0LD-pBW97X1iXeAPmWRR0PboNzQ"
).يجرد()

# عنوان API الرسمي الجديد
FIVESIM_BASE_URL = os.getenv(
    "FIVESIM_BASE_URL",
    "https://5sim.net/v1"
).strip().rstrip("/")

#مهلة طلبات FiveSIM بالثواني
FIVESIM_TIMEOUT = int(os.getenv("FIVESIM_TIMEOUT", "20"))

# =========================================================
# رسائل نصية قصيرة من جريزلي
# =========================================================

GRIZZLY_API_KEY = os.getenv(
    "GRIZZLY_API_KEY",
    "15a9f459b5a5e02cc330ae0d66399e2b"
).يجرد()

# =========================================================
رسالة نصية قصيرة للأبطال
# =========================================================

HERO_SMS_API_KEY = os.getenv(
    "HERO_SMS_API_KEY",
    "Ac7cd39c1650e6eb66d1A3e903c4A58A"
).يجرد()

# =========================================================
# حسابات جاهزة لتطبيق تيليجرام
# =========================================================

TG_READY_API_KEY = os.getenv("TG_READY_API_KEY", "").strip()
TG_READY_BASE_URL = os.getenv("TG_READY_BASE_URL", "https://api.tg-ready.net/v1").strip()

# =========================================================
# عرض عنوان URL للمحافظة على الحياة (للحفاظ على تشغيل البوت 24/24)
# =========================================================
RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL", "").strip()

# =========================================================
# ياسنوم
# =========================================================

اسم البوت = "YasNum"

# هام: مكافأة الإحالة = 0.10 دولار
REFERRAL_REWARD = float(os.getenv("REFERRAL_REWARD", "0.10"))

#منتجات التسوق الافتراضية
هامش_البيع = float(os.getenv("SELL_MARGIN", "0"))

#البرمجة
DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "USD").strip().upper()

# =========================================================
# يدعم
# =========================================================

SUPPORT_USERNAME = os.getenv(
    "اسم مستخدم الدعم"
    "Yy77501"
).strip().lstrip("@")

# روابط القنوات والشروحات
MAIN_CHANNEL_URL = os.getenv("MAIN_CHANNEL_URL", "https://t.me/YasNumChannel").strip()
INSTRUCTIONS_CHANNEL_URL = os.getenv("INSTRUCTIONS_CHANNEL_URL", "https://t.me/YasNumChannel").strip()

# =========================================================
معلومات الدفع
#تعدل هذه القيم أو تضعها في متغيرات البيئة
# =========================================================

BANK_INFO = os.getenv(
    "BANK_INFO"
    "لم تتم إضافة بيانات الحساب البنكي بعد."
).يجرد()

WALLET_INFO = os.getenv(
    "WALLET_INFO"
    "لم تم إضافة بيانات البنك بعد."
).يجرد()

# =========================================================
التطبيقات المسموح بها
# =========================================================

ALLOWED_APPS = {
    "واتساب": "واتساب"،
    "تلغراف" | "تلغراف"
    "فيسبوك": "فيسبوك"،
    "انستغرام": "انستغرام"،
    "تيك توك": "تيك توك"
    "جوجل": "جوجل"
    "تويتر": "تويتر"،
}

# =========================================================
# تخزين
# =========================================================

DATA_FILE = os.getenv(
    "ملف_البيانات"
    "yasnum_data.json"
).يجرد()

# =========================================================
إعدادات الخدمة الاختيارية |
# =========================================================

AI_CHANNEL_URL = os.getenv("AI_CHANNEL_URL", "").strip()
TELEGRAM_READY_URL = os.getenv("TELEGRAM_READY_URL", "").strip()
SUPPORT_URL = os.getenv("SUPPORT_URL", "").strip()

# =========================================================
# التحقق الأساسي
# =========================================================

إذا لم يكن رمز البوت (BOT_TOKEN):
    print("تحذير: لم يتم تكوين رمز البوت.")

إذا لم يكن FIVESIM_API_KEY:
    print("تحذير: لم يتم تكوين FIVESIM_API_KEY.")

إذا لم يكن ADMIN_ID:
    print("تحذير: لم يتم تكوين ADMIN_ID.")