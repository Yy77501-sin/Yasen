# ==========================================
# كتالوج الخدمات والتطبيقات المدعومة
# ==========================================

SERVICES = {
    "wa": {"name": "واتساب WhatsApp", "code": "wa", "fivesim_code": "whatsapp", "short": "WhatsApp"},
    "tg": {"name": "تيليجرام Telegram", "code": "tg", "fivesim_code": "telegram", "short": "Telegram"},
    "ig": {"name": "إنستغرام Instagram", "code": "ig", "fivesim_code": "instagram", "short": "Instagram"},
    "fb": {"name": "فيسبوك Facebook", "code": "fb", "fivesim_code": "facebook", "short": "Facebook"},
    "tw": {"name": "تويتر / X", "code": "tw", "fivesim_code": "twitter", "short": "Twitter (X)"},
    "lf": {"name": "تيك توك TikTok", "code": "lf", "fivesim_code": "tiktok", "short": "TikTok"},
    "go": {"name": "جوجل Google / Gmail", "code": "go", "fivesim_code": "google", "short": "Google"},
    "sn": {"name": "سناب شات Snapchat", "code": "fu", "fivesim_code": "snapchat", "short": "Snapchat"},
    "hj": {"name": "حراج Haraj", "code": "au", "fivesim_code": "haraj", "short": "Haraj"},
    "im": {"name": "إيمو IMO", "code": "im", "fivesim_code": "imo", "short": "IMO"},
    "pp": {"name": "بايبال PayPal", "code": "ts", "fivesim_code": "paypal", "short": "PayPal"},
    "vi": {"name": "فايبر Viber", "code": "vi", "fivesim_code": "viber", "short": "Viber"},
    "ot": {"name": "أي تطبيق آخر", "code": "ot", "fivesim_code": "other", "short": "Any Other"}
}

# ==========================================
# السيرفرات المعتمدة (مع دعم سيرفر TG بوت أرقام تيليجرام الجاهزة)
# ==========================================

SERVERS = {
    "s1": {
        "title": "⚡ السيرفر (1) 5SIM العالمي (الأرخص)",
        "provider": "fivesim",
        "badge": "5SIM"
    },
    "s2": {
        "title": "🐻 السيرفر (2) Grizzly SMS (أسرع وصول)",
        "provider": "grizzly",
        "badge": "GRIZZLY"
    },
    "s3": {
        "title": "🌟 السيرفر (3) Hero SMS (الأكثر تنوعاً)",
        "provider": "hero",
        "badge": "HERO"
    },
    "s4": {
        "title": "💎 السيرفر (4) Plus SMS (الاقتصادي)",
        "provider": "plus",
        "badge": "PLUS"
    }
}

# ==========================================
# كتالوج خدمات الرشق الاحترافية (نظام الملك الشامل)
# الأقسام: تيليجرام، إنستغرام، يوتيوب، تويتر (X)، فيسبوك، تيك توك، ثريدز، واتساب، أخرى
# ==========================================

SMM_SECTIONS = [
    {"id": "tg", "name": "خدمات تيليجرام ✈️", "title": "تيليجرام"},
    {"id": "ig", "name": "خدمات إنستغرام 📸", "title": "إنستغرام"},
    {"id": "yt", "name": "خدمات يوتيوب 🔴", "title": "يوتيوب"},
    {"id": "tw", "name": "خدمات تويتر (X) 🐦", "title": "تويتر"},
    {"id": "fb", "name": "خدمات فيسبوك 👤", "title": "فيسبوك"},
    {"id": "tt", "name": "خدمات تيك توك 🎵", "title": "تيك توك"},
    {"id": "th", "name": "خدمات ثريدز 🧵", "title": "ثريدز"},
    {"id": "wa", "name": "خدمات واتساب 💬", "title": "واتساب"},
    {"id": "ot", "name": "خدمات أخرى والالعاب 🎮", "title": "أخرى"}
]

SMM_SERVICES = {
    # ----------------- خدمات تيليجرام -----------------
    "tg_king_members": {
        "id": "tg_king_members",
        "section_id": "tg",
        "section": "خدمات تيليجرام ✈️",
        "title": "متابعين تيليجرام | الأفضل | سرعة 100K | ضمان 30ي",
        "raw_unit_price": 0.000271,
        "raw_per_1000": 0.271,
        "min_qty": 10,
        "max_qty": 1000000,
        "quality": "حسابات عالية الجودة الافضل",
        "speed": "سريعة برق (حتى 100 ألف متابع يوميًا)",
        "guarantee": "30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط قناة أو مجموعة تيليجرام (مثال: https://t.me/example أو @example)",
        "desc": (
            "نظام الملك:\n"
            "ضمان وقت البدء فوري. الجودة حسابات عالية الجودة. "
            "السرعة: حتى 100 ألف متابع يوميًا. معدل السقوط: لا يوجد. "
            "إعادة التعبئة: نعم. التعويض: نعم. زر الإلغاء: مُفعّل. "
            "الرابط: رابط قناة أو مجموعة تيليجرام. "
            "ملاحظات: قد تختلف سرعة التنفيذ عند ارتفاع الضغط على الخدمة. "
            "لا تطلب الخدمة مرة أخرى على نفس الرابط حتى يكتمل الطلب الحالي."
        )
    },
    "tg_king_views": {
        "id": "tg_king_views",
        "section_id": "tg",
        "section": "خدمات تيليجرام ✈️",
        "title": "مشاهدات منشورات تيليجرام | فوري وسريع ⚡",
        "raw_unit_price": 0.00005,
        "raw_per_1000": 0.05,
        "min_qty": 50,
        "max_qty": 500000,
        "quality": "حسابات حقيقية متفاعلة",
        "speed": "فوري خلال دقائق",
        "guarantee": "دائم بدون نقص",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط منشور القناة (مثال: https://t.me/channel/123)",
        "desc": "مشاهدات سريعة وفورية لمنشورات تيليجرام لزيادة التفاعل والثقة."
    },
    "tg_king_reactions": {
        "id": "tg_king_reactions",
        "section_id": "tg",
        "section": "خدمات تيليجرام ✈️",
        "title": "تفاعلات إيجابية ريأكشن (👍🔥❤️) تيليجرام",
        "raw_unit_price": 0.00008,
        "raw_per_1000": 0.08,
        "min_qty": 20,
        "max_qty": 100000,
        "quality": "تفاعلات منوعة إيجابية",
        "speed": "فوري وسريع",
        "guarantee": "دائم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط المنشور في تيليجرام",
        "desc": "زيادة تفاعلات الريأكشن الإيجابي على منشورات قناتك لرفع رتبة القناة."
    },

    # ----------------- خدمات إنستغرام -----------------
    "ig_king_followers": {
        "id": "ig_king_followers",
        "section_id": "ig",
        "section": "خدمات إنستغرام 📸",
        "title": "متابعين إنستغرام | ضمان 30 يوم VIP | ثبات عالي",
        "raw_unit_price": 0.00115,
        "raw_per_1000": 1.15,
        "min_qty": 50,
        "max_qty": 500000,
        "quality": "حسابات بصور ومنشورات حقيقية",
        "speed": "20 ألف إلى 50 ألف يومياً",
        "guarantee": "30 يوم مع تعويض تلقائي",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط حساب الإنستغرام (يجب أن يكون الحساب عاماً وليس خاصاً)",
        "desc": "متابعين إنستغرام بجودة عالية جداً ومظهر موثوق لزيادة الشهرة."
    },
    "ig_king_likes": {
        "id": "ig_king_likes",
        "section_id": "ig",
        "section": "خدمات إنستغرام 📸",
        "title": "لايكات إنستغرام سريعة | فوري وسريع",
        "raw_unit_price": 0.00045,
        "raw_per_1000": 0.45,
        "min_qty": 50,
        "max_qty": 200000,
        "quality": "حسابات نشطة",
        "speed": "فوري خلال دقائق",
        "guarantee": "دائم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط المنشور أو الريلز",
        "desc": "إعجابات ولايكات سريعة لرفع رنك المنشور بالاكسبلور."
    },

    # ----------------- خدمات يوتيوب -----------------
    "yt_king_views": {
        "id": "yt_king_views",
        "section_id": "yt",
        "section": "خدمات يوتيوب 🔴",
        "title": "مشاهدات يوتيوب | أمان تام لتحقيق الدخل | بدون نقص",
        "raw_unit_price": 0.00180,
        "raw_per_1000": 1.80,
        "min_qty": 100,
        "max_qty": 1000000,
        "quality": "مشاهدات آمنة 100% معتمدة",
        "speed": "5000 إلى 20000 يومياً",
        "guarantee": "ضمان مدى الحياة",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط فيديو يوتيوب",
        "desc": "مشاهدات عالية الجودة متوافقة مع شروط الأدسنس والأمان التام."
    },
    "yt_king_subs": {
        "id": "yt_king_subs",
        "section_id": "yt",
        "section": "خدمات يوتيوب 🔴",
        "title": "مشتركين يوتيوب | ثبات عالي وضمان 30 يوم",
        "raw_unit_price": 0.00950,
        "raw_per_1000": 9.50,
        "min_qty": 50,
        "max_qty": 50000,
        "quality": "حسابات يوتيوب نشطة",
        "speed": "100 إلى 500 يومياً لضمان الأمان",
        "guarantee": "ضمان 30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط القناة الرسمي",
        "desc": "مشتركين حقيقيين للمساعدة في تحقيق شروط الربح من اليوتيوب."
    },

    # ----------------- خدمات تويتر (X) -----------------
    "tw_king_followers": {
        "id": "tw_king_followers",
        "section_id": "tw",
        "section": "خدمات تويتر (X) 🐦",
        "title": "متابعين تويتر (X) | مظهر خليجي وعربي VIP",
        "raw_unit_price": 0.00320,
        "raw_per_1000": 3.20,
        "min_qty": 50,
        "max_qty": 100000,
        "quality": "حسابات بمظهر موثوق",
        "speed": "سريع وآمن",
        "guarantee": "ضمان 30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط حساب تويتر الشخصي",
        "desc": "متابعين منصة إكس تويتر لزيادة الموثوقية والمتابعة."
    },
    "tw_king_retweets": {
        "id": "tw_king_retweets",
        "section_id": "tw",
        "section": "خدمات تويتر (X) 🐦",
        "title": "إعادة تغريد ريتويت (Retweet) وإعجاب",
        "raw_unit_price": 0.00190,
        "raw_per_1000": 1.90,
        "min_qty": 20,
        "max_qty": 50000,
        "quality": "حسابات متفاعلة",
        "speed": "فوري خلال 15 دقيقة",
        "guarantee": "دائم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط التغريدة",
        "desc": "رفع انتشار التغريدة ونقلها إلى التريند."
    },

    # ----------------- خدمات فيسبوك -----------------
    "fb_king_followers": {
        "id": "fb_king_followers",
        "section_id": "fb",
        "section": "خدمات فيسبوك 👤",
        "title": "متابعين صفحات وحسابات فيسبوك | ضمان 60 يوم",
        "raw_unit_price": 0.00160,
        "raw_per_1000": 1.60,
        "min_qty": 50,
        "max_qty": 200000,
        "quality": "حسابات ممتازة",
        "speed": "10 آلاف يومياً",
        "guarantee": "ضمان 60 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط الصفحة أو البروفايل العام",
        "desc": "زيادة متابعي صفحات فيسبوك للأعمال والمشاهير."
    },

    # ----------------- خدمات تيك توك -----------------
    "tt_king_followers": {
        "id": "tt_king_followers",
        "section_id": "tt",
        "section": "خدمات تيك توك 🎵",
        "title": "متابعين تيك توك | مؤهل لفتح البث المباشر LIVE 🎙️",
        "raw_unit_price": 0.00150,
        "raw_per_1000": 1.50,
        "min_qty": 50,
        "max_qty": 200000,
        "quality": "حسابات نشطة حقيقية",
        "speed": "سريعة حتى 30 ألف يومياً",
        "guarantee": "ضمان 30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط حساب تيك توك",
        "desc": "مثالي لتحقيق شروط البث المباشر (LIVE) وزيادة الانتشار والشهرة."
    },
    "tt_king_views": {
        "id": "tt_king_views",
        "section_id": "tt",
        "section": "خدمات تيك توك 🎵",
        "title": "مشاهدات فيديو تيك توك | مليون مشاهدة فائقة السرعة",
        "raw_unit_price": 0.00003,
        "raw_per_1000": 0.03,
        "min_qty": 100,
        "max_qty": 5000000,
        "quality": "سيرفر تيك توك المباشر",
        "speed": "صاروخية خلال دقائق",
        "guarantee": "دائم بدون أي نقص",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط فيديو تيك توك",
        "desc": "إيصال الفيديو إلى إكسبلور فوراً بملايين المشاهدات."
    },

    # ----------------- خدمات ثريدز -----------------
    "th_king_followers": {
        "id": "th_king_followers",
        "section_id": "th",
        "section": "خدمات ثريدز 🧵",
        "title": "متابعين منصة ثريدز Threads | سرعة فائقة",
        "raw_unit_price": 0.00220,
        "raw_per_1000": 2.20,
        "min_qty": 50,
        "max_qty": 100000,
        "quality": "حسابات ثريدز متفاعلة",
        "speed": "سريعة وفورية",
        "guarantee": "ضمان 30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط حساب ثريدز (Threads Profile)",
        "desc": "متابعين متوافقين مع منصة ثريدز الجديدة التابعة لإنستغرام."
    },

    # ----------------- خدمات واتساب -----------------
    "wa_king_channels": {
        "id": "wa_king_channels",
        "section_id": "wa",
        "section": "خدمات واتساب 💬",
        "title": "متابعين قنوات واتساب (WhatsApp Channels) | أمان تام",
        "raw_unit_price": 0.00250,
        "raw_per_1000": 2.50,
        "min_qty": 50,
        "max_qty": 100000,
        "quality": "أرقام وحسابات واتساب فعالة",
        "speed": "5 آلاف يومياً",
        "guarantee": "ضمان 30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط قناة واتساب العامة",
        "desc": "زيادة متابعي ومشاركي قنوات واتساب الجديدة بسرعة وسلاسة."
    },

    # ----------------- خدمات أخرى والألعاب -----------------
    "pubg_60": {
        "id": "pubg_60",
        "section_id": "ot",
        "section": "خدمات أخرى والالعاب 🎮",
        "title": "🎮 شدات ببجي PUBG (60 UC) فوري بالآيدي",
        "raw_unit_price": 0.85,
        "raw_per_1000": 850.0,
        "min_qty": 1,
        "max_qty": 100,
        "quality": "شحن رسمي ID معتمد",
        "speed": "خلال 5-15 دقيقة",
        "guarantee": "شحن رسمي معتمد 100%",
        "refill": "غير منطبق",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل قبل الشحن",
        "link_type": "الآيدي (Player ID) داخل لعبة ببجي",
        "desc": "شحن رسمي مباشر بالآيدي بدون الحاجة لأي كلمة سر."
    },
    "pubg_325": {
        "id": "pubg_325",
        "section_id": "ot",
        "section": "خدمات أخرى والالعاب 🎮",
        "title": "🎮 شدات ببجي PUBG (325 UC + هدية)",
        "raw_unit_price": 4.00,
        "raw_per_1000": 4000.0,
        "min_qty": 1,
        "max_qty": 50,
        "quality": "شحن رويال باس رسمي",
        "speed": "فوري بالآيدي",
        "guarantee": "شحن رسمي معتمد",
        "refill": "غير منطبق",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل قبل الشحن",
        "link_type": "الآيدي (Player ID)",
        "desc": "شحن كافي لتفعيل الرويال باس والمواسم الخاصة ببجي."
    }
}

# ==========================================
# كتالوج اشتراكات برامج الذكاء الاصطناعي (AI Subscriptions)
# ==========================================

AI_SUBSCRIPTIONS = {
    "chatgpt_plus": {
        "id": "chatgpt_plus",
        "title": "🤖 اشتراك ChatGPT Plus (GPT-4o) رسمي",
        "desc": "اشتراك لمدة شهر رسمي في حسابك أو حساب جاهز مع وصول كامل لـ GPT-4o وDALL-E ومولد الصور وسرعة فائقة.",
        "raw_price": 18.0,
        "duration": "1 شهر",
        "badge": "ChatGPT Plus"
    },
    "claude_pro": {
        "id": "claude_pro",
        "title": "🧠 اشتراك Claude Pro (Anthropic)",
        "desc": "وصول كامل لأقوى نماذج كلود Claude 3.5 Sonnet ومساحة عمل غير محدودة وتحليل ملفات ضخمة.",
        "raw_price": 18.5,
        "duration": "1 شهر",
        "badge": "Claude Pro"
    },
    "midjourney": {
        "id": "midjourney",
        "title": "🎨 اشتراك Midjourney توليد الصور الاحترافي",
        "desc": "خطة Standard لتوليد صور بجودة هوليوودية بدون حدود في ديسكورد مع سرعة Fast Hours.",
        "raw_price": 25.0,
        "duration": "1 شهر",
        "badge": "Midjourney"
    },
    "canva_pro": {
        "id": "canva_pro",
        "title": "✨ اشتراك Canva Pro التعليمي/الرسمي",
        "desc": "تفعيل مدى الحياة أو سنوي لكافة ميزات كانفا برو، إزالة الخلفيات بالذكاء الاصطناعي وملايين القوالب.",
        "raw_price": 4.5,
        "duration": "1 سنة",
        "badge": "Canva Pro"
    },
    "gemini_advanced": {
        "id": "gemini_advanced",
        "title": "💎 اشتراك Google Gemini Advanced (1.5 Pro)",
        "desc": "وصول لمساحة سياق 1 مليون توكن وتحليل مستندات وفيديوهات ضخمة مع سعة تخزين 2TB Google One.",
        "raw_price": 16.0,
        "duration": "1 شهر",
        "badge": "Gemini Advanced"
    }
}


# ==========================================
# قاعدة بيانات الدول الشاملة ومفاتيحها
# ==========================================

COUNTRIES = {
    "54": {"name": "yemen", "title": "اليمن", "flag": "🇾🇪", "prefix": "967", "default_rub": 35.0},
    "53": {"name": "saudi", "title": "السعودية", "flag": "🇸🇦", "prefix": "966", "default_rub": 40.0},
    "21": {"name": "egypt", "title": "مصر", "flag": "🇪🇬", "prefix": "20", "default_rub": 20.0},
    "73": {"name": "brazil", "title": "البرازيل", "flag": "🇧🇷", "prefix": "55", "default_rub": 30.0},
    "0": {"name": "russia", "title": "روسيا", "flag": "🇷🇺", "prefix": "7", "default_rub": 15.0},
    "187": {"name": "usa", "title": "أمريكا", "flag": "🇺🇸", "prefix": "1", "default_rub": 25.0},
    "16": {"name": "england", "title": "بريطانيا", "flag": "🇬🇧", "prefix": "44", "default_rub": 22.0},
    "6": {"name": "indonesia", "title": "إندونيسيا", "flag": "🇮🇩", "prefix": "62", "default_rub": 12.0},
    "2": {"name": "kazakhstan", "title": "كازاخستان", "flag": "🇰🇿", "prefix": "77", "default_rub": 18.0},
    "95": {"name": "uae", "title": "الإمارات", "flag": "🇦🇪", "prefix": "971", "default_rub": 40.0},
    "52": {"name": "iraq", "title": "العراق", "flag": "🇮🇶", "prefix": "964", "default_rub": 22.0},
    "116": {"name": "jordan", "title": "الأردن", "flag": "🇯🇴", "prefix": "962", "default_rub": 25.0},
    "117": {"name": "kuwait", "title": "الكويت", "flag": "🇰🇼", "prefix": "965", "default_rub": 38.0},
    "102": {"name": "morocco", "title": "المغرب", "flag": "🇲🇦", "prefix": "212", "default_rub": 20.0},
    "58": {"name": "algeria", "title": "الجزائر", "flag": "🇩🇿", "prefix": "213", "default_rub": 18.0},
    "89": {"name": "tunisia", "title": "تونس", "flag": "🇹🇳", "prefix": "216", "default_rub": 20.0},
    "148": {"name": "oman", "title": "عمان", "flag": "🇴🇲", "prefix": "968", "default_rub": 35.0},
    "145": {"name": "bahrain", "title": "البحرين", "flag": "🇧🇭", "prefix": "973", "default_rub": 35.0},
    "111": {"name": "qatar", "title": "قطر", "flag": "🇶🇦", "prefix": "974", "default_rub": 40.0},
    "110": {"name": "syria", "title": "سوريا", "flag": "🇸🇾", "prefix": "963", "default_rub": 28.0},
    "107": {"name": "lebanon", "title": "لبنان", "flag": "🇱🇧", "prefix": "961", "default_rub": 26.0},
    "114": {"name": "sudan", "title": "السودان", "flag": "🇸🇩", "prefix": "249", "default_rub": 20.0},
    "108": {"name": "libya", "title": "ليبيا", "flag": "🇱🇾", "prefix": "218", "default_rub": 24.0},
    "146": {"name": "palestine", "title": "فلسطين", "flag": "🇵🇸", "prefix": "970", "default_rub": 30.0},
    "22": {"name": "india", "title": "الهند", "flag": "🇮🇳", "prefix": "91", "default_rub": 10.0},
    "15": {"name": "poland", "title": "بولندا", "flag": "🇵🇱", "prefix": "48", "default_rub": 22.0},
    "36": {"name": "canada", "title": "كندا", "flag": "🇨🇦", "prefix": "1", "default_rub": 28.0},
    "56": {"name": "spain", "title": "إسبانيا", "flag": "🇪🇸", "prefix": "34", "default_rub": 25.0},
    "32": {"name": "romania", "title": "رومانيا", "flag": "🇷🇴", "prefix": "40", "default_rub": 18.0},
    "48": {"name": "netherlands", "title": "هولندا", "flag": "🇳🇱", "prefix": "31", "default_rub": 30.0},
    "13": {"name": "germany", "title": "ألمانيا", "flag": "🇩🇪", "prefix": "49", "default_rub": 32.0},
    "86": {"name": "italy", "title": "إيطاليا", "flag": "🇮🇹", "prefix": "39", "default_rub": 28.0},
    "78": {"name": "france", "title": "فرنسا", "flag": "🇫🇷", "prefix": "33", "default_rub": 30.0},
    "60": {"name": "turkey", "title": "تركيا", "flag": "🇹🇷", "prefix": "90", "default_rub": 24.0},
    "1": {"name": "ukraine", "title": "أوكرانيا", "flag": "🇺🇦", "prefix": "380", "default_rub": 16.0},
    "4": {"name": "philippines", "title": "الفلبين", "flag": "🇵🇭", "prefix": "63", "default_rub": 14.0},
    "5": {"name": "myanmar", "title": "ميانمار", "flag": "🇲🇲", "prefix": "95", "default_rub": 12.0},
    "7": {"name": "malaysia", "title": "ماليزيا", "flag": "🇲🇾", "prefix": "60", "default_rub": 18.0},
    "10": {"name": "vietnam", "title": "فيتنام", "flag": "🇻🇳", "prefix": "84", "default_rub": 14.0},
    "11": {"name": "kyrgyzstan", "title": "قيرغيزستان", "flag": "🇰🇬", "prefix": "996", "default_rub": 16.0},
    "17": {"name": "nigeria", "title": "نيجيريا", "flag": "🇳🇬", "prefix": "234", "default_rub": 12.0},
    "19": {"name": "uzbekistan", "title": "أوزبكستان", "flag": "🇺🇿", "prefix": "998", "default_rub": 18.0},
    "24": {"name": "cambodia", "title": "كمبوديا", "flag": "🇰🇭", "prefix": "855", "default_rub": 14.0},
    "31": {"name": "southafrica", "title": "جنوب إفريقيا", "flag": "🇿🇦", "prefix": "27", "default_rub": 18.0},
    "33": {"name": "colombia", "title": "كولومبيا", "flag": "🇨🇴", "prefix": "57", "default_rub": 18.0},
    "38": {"name": "pakistan", "title": "باكستان", "flag": "🇵🇰", "prefix": "92", "default_rub": 14.0},
    "40": {"name": "bangladesh", "title": "بنغلاديش", "flag": "🇧🇩", "prefix": "880", "default_rub": 12.0},
    "43": {"name": "czech", "title": "التشيك", "flag": "🇨🇿", "prefix": "420", "default_rub": 22.0},
    "44": {"name": "srilanka", "title": "سريلانكا", "flag": "🇱🇰", "prefix": "94", "default_rub": 14.0},
    "46": {"name": "sweden", "title": "السويد", "flag": "🇸🇪", "prefix": "46", "default_rub": 30.0},
    "51": {"name": "thailand", "title": "تايلاند", "flag": "🇹🇭", "prefix": "66", "default_rub": 16.0},
    "55": {"name": "mexico", "title": "المكسيك", "flag": "🇲🇽", "prefix": "52", "default_rub": 24.0},
    "62": {"name": "peru", "title": "بيرو", "flag": "🇵🇪", "prefix": "51", "default_rub": 18.0},
    "67": {"name": "argentina", "title": "الأرجنتين", "flag": "🇦🇷", "prefix": "54", "default_rub": 20.0},
    "77": {"name": "austria", "title": "النمسا", "flag": "🇦🇹", "prefix": "43", "default_rub": 30.0},
    "80": {"name": "switzerland", "title": "سويسرا", "flag": "🇨🇭", "prefix": "41", "default_rub": 35.0},
    "82": {"name": "belgium", "title": "بلجيكا", "flag": "🇧🇪", "prefix": "32", "default_rub": 28.0},
    "83": {"name": "bulgaria", "title": "بلغاريا", "flag": "🇧🇬", "prefix": "359", "default_rub": 18.0},
    "84": {"name": "hungary", "title": "المجر", "flag": "🇭🇺", "prefix": "36", "default_rub": 20.0},
    "87": {"name": "chile", "title": "تشيلي", "flag": "🇨🇱", "prefix": "56", "default_rub": 22.0},
    "90": {"name": "portugal", "title": "البرتغال", "flag": "🇵🇹", "prefix": "351", "default_rub": 26.0},
    "94": {"name": "georgia", "title": "جورجيا", "flag": "🇬🇪", "prefix": "995", "default_rub": 18.0},
    "100": {"name": "greece", "title": "اليونان", "flag": "🇬🇷", "prefix": "30", "default_rub": 26.0}
}
