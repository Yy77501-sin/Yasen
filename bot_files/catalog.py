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
# السيرفرات الأربعة المعتمدة
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
# كتالوج خدمات الرشق الاحترافية (نظام الملك)
# ==========================================
# ملاحظة: سعر العضو الأساسي من Plus SMM هو 0.000271$ (0.271$ لكل 1000)
# مع إضافة هامش الربح 30%:
# 0.000271 * 1.30 = 0.0003523$ لكل عضو (0.3523$ لكل 1000)

SMM_SERVICES = {
    "tg_king_members": {
        "id": "tg_king_members",
        "section": "رشق تيليجرام",
        "title": "متابعين تيليجرام | الأفضل | سرعة | ضمان 30ي",
        "raw_unit_price": 0.000271,     # سعر العضو من المزود بلاس
        "raw_per_1000": 0.271,          # سعر الـ 1000 من المزود
        "min_qty": 10,
        "max_qty": 1000000,
        "quality": "حسابات عالية الجودة الافضل",
        "speed": "سريعة برق (حتى 100 ألف متابع يوميًا)",
        "guarantee": "30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط قناة أو مجموعة تيليجرام (مثال: https://t.me/NumbrWahm أو /NumbrWahm)",
        "desc": (
            "نظام الملك:\n"
            "ضمان وقت البدء فوري. الجودة حسابات عالية الجودة. "
            "السرعة: حتى 100 ألف متابع يوميًا. معدل السقوط: لا يوجد. "
            "إعادة التعبئة: نعم. التعويض: نعم. زر الإلغاء: مُفعّل. "
            "الرابط: رابط قناة أو مجموعة تيليجرام. "
            "ملاحظات: قد تختلف سرعة التنفيذ عند ارتفاع الضغط على الخدمة. "
            "لا تطلب الخدمة مرة أخرى على نفس الرابط حتى يكتمل الطلب الحالي. "
            "عند وجود أي مشكلة، تواصل مع الدعم."
        )
    },
    "tg_king_views": {
        "id": "tg_king_views",
        "section": "رشق تيليجرام",
        "title": "مشاهدات منشورات تيليجرام | فوري وسريع",
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
        "desc": "مشاهدات سريعة وفورية للمنشورات لزيادة الثقة والتفاعل."
    },
    "ig_king_followers": {
        "id": "ig_king_followers",
        "section": "رشق إنستغرام",
        "title": "متابعين إنستغرام | ضمان 30 يوم VIP",
        "raw_unit_price": 0.00115,
        "raw_per_1000": 1.15,
        "min_qty": 50,
        "max_qty": 500000,
        "quality": "حسابات بصور ومنشورات",
        "speed": "20 ألف إلى 50 ألف يومياً",
        "guarantee": "30 يوم مع تعويض آلي",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط حساب الإنستغرام (يجب أن يكون عاماً وليس خاصاً)",
        "desc": "متابعين حسابات ممتازة لرفع مظهر حساب الإنستغرام."
    },
    "tk_king_followers": {
        "id": "tk_king_followers",
        "section": "رشق تيك توك",
        "title": "متابعين تيك توك | لفتح البث المباشر LIVE",
        "raw_unit_price": 0.00150,
        "raw_per_1000": 1.50,
        "min_qty": 50,
        "max_qty": 200000,
        "quality": "حسابات نشطة",
        "speed": "سريعة حتى 30 ألف يومياً",
        "guarantee": "ضمان 30 يوم",
        "refill": "نعم",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل",
        "link_type": "رابط حساب تيك توك",
        "desc": "مثالي لفتح ميزة البث المباشر (LIVE) وزيادة الانتشار."
    },
    "pubg_60": {
        "id": "pubg_60",
        "section": "شحن ألعاب",
        "title": "🎮 شدات ببجي PUBG (60 UC)",
        "raw_unit_price": 0.85,
        "raw_per_1000": 850.0,
        "min_qty": 1,
        "max_qty": 100,
        "quality": "شحن رسمي ID",
        "speed": "خلال 5-15 دقيقة",
        "guarantee": "شحن رسمي معتمد",
        "refill": "غير منطبق",
        "compensation": "نعم",
        "cancel_btn": "مُفعّل قبل التنفيذ",
        "link_type": "الآيدي (Player ID) داخل لعبة ببجي",
        "desc": "شحن رسمي مباشر بالآيدي بدون كلمة سر."
    },
    "pubg_325": {
        "id": "pubg_325",
        "section": "شحن ألعاب",
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
        "cancel_btn": "مُفعّل قبل التنفيذ",
        "link_type": "الآيدي (Player ID)",
        "desc": "شحن كافي للرويال باس والمواسم."
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