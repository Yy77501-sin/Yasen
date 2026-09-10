const GAME_TOPUP_CATEGORIES = [
  { key: "shooters", emoji: "🔫", name_ar: "ألعاب الباتل رويال وإطلاق النار", name_en: "Battle Royale & Shooters" },
  { key: "moba_rpg", emoji: "⚔️", name_ar: "الألعاب الاستراتيجية وتقمص الأدوار", name_en: "MOBA & RPG" },
  { key: "sports_casual", emoji: "⚽", name_ar: "رياضة، سيارات، وكاجوال", name_en: "Sports & Casual" },
  { key: "social_live", emoji: "🎵", name_ar: "تطبيقات الدردشة والبث المباشر", name_en: "Social & Live Streaming" },
  { key: "board_misc", emoji: "🎲", name_ar: "ألعاب اللوحة والبطاقات والمنوعات", name_en: "Board, Cards & Misc" },
  { key: "platform_anime", emoji: "🎮", name_ar: "بطاقات المنصات والأنمي", name_en: "Platforms & Anime Gacha" },
];

function pkg(unitsAr, unitsEn, priceRub) {
  return { units_ar: unitsAr, units_en: unitsEn, priceRub: Number(priceRub) };
}

function custom(unitLabelAr, unitLabelEn, unitPriceRub, min, max) {
  return {
    unitLabelAr,
    unitLabelEn,
    unitPriceRub: Number(unitPriceRub),
    min: Number(min),
    max: Number(max),
  };
}

function game(
  key,
  categoryKey,
  emoji,
  nameAr,
  nameEn,
  packages,
  customConfig,
  providerServiceId = null
) {
  return {
    key,
    categoryKey,
    emoji,
    name_ar: nameAr,
    name_en: nameEn,
    idLabelAr: "ID",
    idLabelEn: "ID",
    packages,
    custom: customConfig,
    providerServiceId,
  };
}

const GAME_TOPUP_GAMES = [
  game("pubg_mobile", "shooters", "🔫", "ببجي موبايل", "PUBG Mobile", [
    pkg("60 شدة", "60 UC", 1), pkg("325 شدة", "325 UC", 5), pkg("660 شدة", "660 UC", 10), pkg("1800 شدة", "1800 UC", 25), pkg("3850 شدة", "3850 UC", 50),
  ], custom("شدة", "UC", 0.03, 60, 10000)),
  game("free_fire", "shooters", "🔥", "فري فاير", "Free Fire", [
    pkg("100 جوهرة", "100 Diamonds", 1), pkg("520 جوهرة", "520 Diamonds", 5), pkg("1060 جوهرة", "1060 Diamonds", 10), pkg("2180 جوهرة", "2180 Diamonds", 20), pkg("5600 جوهرة", "5600 Diamonds", 50),
  ], custom("جوهرة", "Diamond", 0.01, 100, 12000)),
  game("codm", "shooters", "🎖️", "كول اوف ديوتي", "Call of Duty Mobile", [
    pkg("80 CP", "80 CP", 1), pkg("420 CP", "420 CP", 5), pkg("880 CP", "880 CP", 10), pkg("2400 CP", "2400 CP", 25), pkg("5000 CP", "5000 CP", 50),
  ], custom("CP", "CP", 0.012, 80, 15000)),
  game("apex_legends", "shooters", "🚀", "ابيكس ليجندز", "Apex Legends", [
    pkg("900 كوينز", "900 Coins", 10), pkg("1000 كوينز", "1000 Coins", 11), pkg("2150 كوينز", "2150 Coins", 20), pkg("4350 كوينز", "4350 Coins", 40), pkg("11500 كوينز", "11500 Coins", 100),
  ], custom("كوين", "Coin", 0.01, 900, 30000)),
  game("valorant", "shooters", "🦅", "فالورانت", "Valorant", [
    pkg("475 VP", "475 VP", 5), pkg("1000 VP", "1000 VP", 10), pkg("2050 VP", "2050 VP", 20), pkg("3650 VP", "3650 VP", 35), pkg("5350 VP", "5350 VP", 50),
  ], custom("VP", "VP", 0.011, 475, 20000)),
  game("cs_steam", "shooters", "🔫", "كاونتر سترايك", "Counter Strike / Steam", [
    pkg("رصيد 5$", "Balance 5$", 5), pkg("رصيد 10$", "Balance 10$", 10), pkg("رصيد 20$", "Balance 20$", 20), pkg("رصيد 50$", "Balance 50$", 50), pkg("رصيد 100$", "Balance 100$", 100),
  ], custom("دولار", "USD", 1, 5, 200)),
  game("state_of_survival", "shooters", "🧟", "ستيت اوف سرفايفل", "State of Survival", [
    pkg("500 ألماس", "500 Diamonds", 5), pkg("1050 ألماس", "1050 Diamonds", 10), pkg("2200 ألماس", "2200 Diamonds", 20), pkg("5500 ألماس", "5500 Diamonds", 50), pkg("11500 ألماس", "11500 Diamonds", 100),
  ], custom("ألماس", "Diamond", 0.01, 500, 30000)),
  game("new_state", "shooters", "🎮", "ببجي نيو ستيت", "PUBG New State", [
    pkg("300 NC", "300 NC", 3), pkg("1500 NC", "1500 NC", 15), pkg("3600 NC", "3600 NC", 35), pkg("5200 NC", "5200 NC", 50), pkg("10500 NC", "10500 NC", 100),
  ], custom("NC", "NC", 0.01, 300, 30000)),
  game("fortnite", "shooters", "🔫", "فورتنايت", "Fortnite", [
    pkg("1000 V-Bucks", "1000 V-Bucks", 8), pkg("2800 V-Bucks", "2800 V-Bucks", 20), pkg("5000 V-Bucks", "5000 V-Bucks", 32), pkg("13500 V-Bucks", "13500 V-Bucks", 80), pkg("27000 V-Bucks", "27000 V-Bucks", 160),
  ], custom("V-Bucks", "V-Bucks", 0.008, 1000, 50000)),
  game("farlight", "shooters", "🚁", "فار لايت 84", "Farlight 84", [
    pkg("80 ألماس", "80 Diamonds", 1), pkg("420 ألماس", "420 Diamonds", 5), pkg("880 ألماس", "880 Diamonds", 10), pkg("2400 ألماس", "2400 Diamonds", 25), pkg("5000 ألماس", "5000 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.012, 80, 10000)),

  game("mobile_legends", "moba_rpg", "⚔️", "موبايل ليجندز", "Mobile Legends", [
    pkg("50 ألماس", "50 Diamonds", 1), pkg("275 ألماس", "275 Diamonds", 5), pkg("570 ألماس", "570 Diamonds", 10), pkg("1163 ألماس", "1163 Diamonds", 20), pkg("2976 ألماس", "2976 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.02, 50, 20000)),
  game("genshin", "moba_rpg", "🪄", "جينشين امباكت", "Genshin Impact", [
    pkg("60 كريستال", "60 Crystals", 1), pkg("330 كريستال", "330 Crystals", 5), pkg("1090 كريستال", "1090 Crystals", 15), pkg("3280 كريستال", "3280 Crystals", 50), pkg("8080 كريستال", "8080 Crystals", 100),
  ], custom("كريستال", "Crystal", 0.015, 60, 20000)),
  game("coc", "moba_rpg", "👑", "كلاش اوف كلانس", "Clash of Clans", [
    pkg("500 جوهرة", "500 Gems", 5), pkg("1200 جوهرة", "1200 Gems", 10), pkg("2500 جوهرة", "2500 Gems", 20), pkg("6500 جوهرة", "6500 Gems", 50), pkg("14000 جوهرة", "14000 Gems", 100),
  ], custom("جوهرة", "Gem", 0.01, 500, 30000)),
  game("clash_royale", "moba_rpg", "🏹", "كلاش رويال", "Clash Royale", [
    pkg("500 جوهرة", "500 Gems", 5), pkg("1200 جوهرة", "1200 Gems", 10), pkg("2500 جوهرة", "2500 Gems", 20), pkg("6500 جوهرة", "6500 Gems", 50), pkg("14000 جوهرة", "14000 Gems", 100),
  ], custom("جوهرة", "Gem", 0.01, 500, 30000)),
  game("wild_rift", "moba_rpg", "🤠", "وايلد ريفت", "Wild Rift", [
    pkg("425 وايلد كور", "425 Wild Cores", 5), pkg("1050 وايلد كور", "1050 Wild Cores", 10), pkg("2150 وايلد كور", "2150 Wild Cores", 20), pkg("3300 وايلد كور", "3300 Wild Cores", 30), pkg("5500 وايلد كور", "5500 Wild Cores", 50),
  ], custom("وايلد كور", "Wild Core", 0.012, 425, 20000)),
  game("honor_of_kings", "moba_rpg", "🐉", "هونر اوف كينجز", "Honor of Kings", [
    pkg("60 توكن", "60 Tokens", 1), pkg("300 توكن", "300 Tokens", 5), pkg("680 توكن", "680 Tokens", 10), pkg("1800 توكن", "1800 Tokens", 25), pkg("3450 توكن", "3450 Tokens", 50),
  ], custom("توكن", "Token", 0.015, 60, 15000)),
  game("lords_mobile", "moba_rpg", "🏰", "لوردس موبايل", "Lords Mobile", [
    pkg("100 ألماس", "100 Diamonds", 1), pkg("520 ألماس", "520 Diamonds", 5), pkg("1060 ألماس", "1060 Diamonds", 10), pkg("2180 ألماس", "2180 Diamonds", 20), pkg("5600 ألماس", "5600 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.012, 100, 20000)),
  game("honkai", "moba_rpg", "🌌", "هونكاي", "Honkai: Star Rail", [
    pkg("60 شظية", "60 Shards", 1), pkg("330 شظية", "330 Shards", 5), pkg("1090 شظية", "1090 Shards", 15), pkg("3280 شظية", "3280 Shards", 50), pkg("8080 شظية", "8080 Shards", 100),
  ], custom("شظية", "Shard", 0.015, 60, 20000)),
  game("black_desert", "moba_rpg", "🗡️", "بلاك ديزرت", "Black Desert", [
    pkg("100 لؤلؤ", "100 Pearls", 1), pkg("500 لؤلؤ", "500 Pearls", 5), pkg("1050 لؤلؤ", "1050 Pearls", 10), pkg("2200 لؤلؤ", "2200 Pearls", 20), pkg("5500 لؤلؤ", "5500 Pearls", 50),
  ], custom("لؤلؤ", "Pearl", 0.012, 100, 30000)),
  game("diablo_immortal", "moba_rpg", "🐎", "ديابلو ايمورتال", "Diablo Immortal", [
    pkg("60 أورب", "60 Orbs", 1), pkg("315 أورب", "315 Orbs", 5), pkg("630 أورب", "630 Orbs", 10), pkg("1650 أورب", "1650 Orbs", 25), pkg("3450 أورب", "3450 Orbs", 50),
  ], custom("أورب", "Orb", 0.016, 60, 15000)),

  game("efootball", "sports_casual", "⚽", "إي فوتبول", "eFootball", [
    pkg("130 كوينز", "130 Coins", 1), pkg("550 كوينز", "550 Coins", 5), pkg("1040 كوينز", "1040 Coins", 10), pkg("2130 كوينز", "2130 Coins", 20), pkg("5800 كوينز", "5800 Coins", 50),
  ], custom("كوين", "Coin", 0.01, 130, 20000)),
  game("fc_mobile", "sports_casual", "🏟️", "فيفا موبايل", "EA FC Mobile", [
    pkg("100 نقطة", "100 Points", 1), pkg("575 نقطة", "575 Points", 5), pkg("1050 نقطة", "1050 Points", 10), pkg("2200 نقطة", "2200 Points", 20), pkg("5750 نقطة", "5750 Points", 50),
  ], custom("نقطة", "Point", 0.01, 100, 20000)),
  game("roblox", "sports_casual", "🧱", "روبلوكس", "Roblox", [
    pkg("80 روبوكس", "80 Robux", 1), pkg("400 روبوكس", "400 Robux", 5), pkg("800 روبوكس", "800 Robux", 10), pkg("1700 روبوكس", "1700 Robux", 20), pkg("4500 روبوكس", "4500 Robux", 50),
  ], custom("روبوكس", "Robux", 0.012, 80, 20000)),
  game("minecraft", "sports_casual", "⛏️", "ماين كرافت", "Minecraft", [
    pkg("320 كوينز", "320 Coins", 2), pkg("1020 كوينز", "1020 Coins", 6), pkg("1720 كوينز", "1720 Coins", 10), pkg("3500 كوينز", "3500 Coins", 20), pkg("8800 كوينز", "8800 Coins", 50),
  ], custom("كوين", "Coin", 0.008, 320, 30000)),
  game("8ball_pool", "sports_casual", "🎱", "بلياردو", "8 Ball Pool", [
    pkg("14 كاش", "14 Cash", 1), pkg("43 كاش", "43 Cash", 2), pkg("115 كاش", "115 Cash", 5), pkg("240 كاش", "240 Cash", 10), pkg("600 كاش", "600 Cash", 20),
  ], custom("كاش", "Cash", 0.03, 14, 10000)),
  game("brawl_stars", "sports_casual", "🥊", "براول ستارز", "Brawl Stars", [
    pkg("30 جوهرة", "30 Gems", 2), pkg("80 جوهرة", "80 Gems", 5), pkg("170 جوهرة", "170 Gems", 10), pkg("360 جوهرة", "360 Gems", 20), pkg("950 جوهرة", "950 Gems", 50),
  ], custom("جوهرة", "Gem", 0.02, 30, 8000)),
  game("asphalt9", "sports_casual", "🏎️", "اسفلت 9", "Asphalt 9", [
    pkg("100 توكن", "100 Tokens", 2), pkg("250 توكن", "250 Tokens", 5), pkg("600 توكن", "600 Tokens", 10), pkg("1500 توكن", "1500 Tokens", 20), pkg("4000 توكن", "4000 Tokens", 50),
  ], custom("توكن", "Token", 0.02, 100, 12000)),
  game("nfs_no_limits", "sports_casual", "🏎️", "نيد فور سبيد", "NFS No Limits", [
    pkg("150 ذهب", "150 Gold", 3), pkg("300 ذهب", "300 Gold", 5), pkg("750 ذهب", "750 Gold", 10), pkg("1800 ذهب", "1800 Gold", 20), pkg("5000 ذهب", "5000 Gold", 50),
  ], custom("ذهب", "Gold", 0.018, 150, 12000)),
  game("top_eleven", "sports_casual", "🏆", "توب اليفن", "Top Eleven", [
    pkg("14 توكن", "14 Tokens", 1), pkg("37 توكن", "37 Tokens", 3), pkg("80 توكن", "80 Tokens", 5), pkg("176 توكن", "176 Tokens", 10), pkg("500 توكن", "500 Tokens", 25),
  ], custom("توكن", "Token", 0.03, 14, 12000)),
  game("hay_day", "sports_casual", "🚜", "هاي داي", "Hay Day", [
    pkg("50 جوهرة", "50 Gems", 1), pkg("130 جوهرة", "130 Gems", 3), pkg("275 جوهرة", "275 Gems", 5), pkg("570 جوهرة", "570 Gems", 10), pkg("1500 جوهرة", "1500 Gems", 25),
  ], custom("جوهرة", "Gem", 0.02, 50, 10000)),

  game("tiktok", "social_live", "🎵", "تيك توك", "TikTok", [
    pkg("70 عملة", "70 Coins", 1), pkg("350 عملة", "350 Coins", 5), pkg("700 عملة", "700 Coins", 10), pkg("1400 عملة", "1400 Coins", 20), pkg("3500 عملة", "3500 Coins", 50),
  ], custom("عملة", "Coin", 0.012, 70, 30000)),
  game("bigo_live", "social_live", "🎙️", "بيجو لايف", "Bigo Live", [
    pkg("42 ألماس", "42 Diamonds", 1), pkg("210 ألماس", "210 Diamonds", 5), pkg("420 ألماس", "420 Diamonds", 10), pkg("840 ألماس", "840 Diamonds", 20), pkg("2100 ألماس", "2100 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.02, 42, 20000)),
  game("likee", "social_live", "💃", "لايكي", "Likee", [
    pkg("50 ألماس", "50 Diamonds", 1), pkg("250 ألماس", "250 Diamonds", 5), pkg("500 ألماس", "500 Diamonds", 10), pkg("1000 ألماس", "1000 Diamonds", 20), pkg("2500 ألماس", "2500 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.02, 50, 20000)),
  game("tango", "social_live", "🎭", "تانجو", "Tango", [
    pkg("100 كوين", "100 Coins", 1), pkg("500 كوين", "500 Coins", 5), pkg("1000 كوين", "1000 Coins", 10), pkg("2000 كوين", "2000 Coins", 20), pkg("5000 كوين", "5000 Coins", 50),
  ], custom("كوين", "Coin", 0.01, 100, 30000)),
  game("azar", "social_live", "💬", "ازار", "Azar", [
    pkg("900 جوهرة", "900 Gems", 5), pkg("1800 جوهرة", "1800 Gems", 10), pkg("3600 جوهرة", "3600 Gems", 20), pkg("9000 جوهرة", "9000 Gems", 50), pkg("18000 جوهرة", "18000 Gems", 100),
  ], custom("جوهرة", "Gem", 0.006, 900, 50000)),
  game("yalla_chat", "social_live", "🌟", "يلا شات", "Yalla Chat", [
    pkg("100 ذهب", "100 Gold", 1), pkg("500 ذهب", "500 Gold", 5), pkg("1000 ذهب", "1000 Gold", 10), pkg("2000 ذهب", "2000 Gold", 20), pkg("5000 ذهب", "5000 Gold", 50),
  ], custom("ذهب", "Gold", 0.01, 100, 50000)),
  game("mico", "social_live", "🦉", "ميكو", "Mico", [
    pkg("100 كوين", "100 Coins", 1), pkg("500 كوين", "500 Coins", 5), pkg("1000 كوين", "1000 Coins", 10), pkg("2000 كوين", "2000 Coins", 20), pkg("5000 كوين", "5000 Coins", 50),
  ], custom("كوين", "Coin", 0.01, 100, 50000)),
  game("yoho", "social_live", "🎤", "يوهو", "YoHo", [
    pkg("100 كوين", "100 Coins", 1), pkg("500 كوين", "500 Coins", 5), pkg("1000 كوين", "1000 Coins", 10), pkg("2000 كوين", "2000 Coins", 20), pkg("5000 كوين", "5000 Coins", 50),
  ], custom("كوين", "Coin", 0.01, 100, 50000)),
  game("sango", "social_live", "🎪", "سانجو", "Sango", [
    pkg("100 كوين", "100 Coins", 1), pkg("500 كوين", "500 Coins", 5), pkg("1000 كوين", "1000 Coins", 10), pkg("2000 كوين", "2000 Coins", 20), pkg("5000 كوين", "5000 Coins", 50),
  ], custom("كوين", "Coin", 0.01, 100, 50000)),
  game("waya", "social_live", "🗣️", "وايا", "Waya", [
    pkg("100 ذهب", "100 Gold", 1), pkg("500 ذهب", "500 Gold", 5), pkg("1000 ذهب", "1000 Gold", 10), pkg("2000 ذهب", "2000 Gold", 20), pkg("5000 ذهب", "5000 Gold", 50),
  ], custom("ذهب", "Gold", 0.01, 100, 50000)),
  game("ahlan", "social_live", "🎧", "اهلا", "Ahlan", [
    pkg("100 كوين", "100 Coins", 1), pkg("500 كوين", "500 Coins", 5), pkg("1000 كوين", "1000 Coins", 10), pkg("2000 كوين", "2000 Coins", 20), pkg("5000 كوين", "5000 Coins", 50),
  ], custom("كوين", "Coin", 0.01, 100, 50000)),

  game("yalla_ludo", "board_misc", "🎲", "يلا لودو", "Yalla Ludo", [
    pkg("1M ذهب", "1M Gold", 1), pkg("5M ذهب", "5M Gold", 5), pkg("100 ألماس", "100 Diamonds", 1), pkg("500 ألماس", "500 Diamonds", 5), pkg("1000 ألماس", "1000 Diamonds", 10),
  ], custom("ذهب", "Gold", 0.000002, 1000000, 50000000)),
  game("ludo_club", "board_misc", "🐧", "لودو كلوب", "Ludo Club", [
    pkg("100 كاش", "100 Cash", 1), pkg("500 كاش", "500 Cash", 5), pkg("1000 كاش", "1000 Cash", 10), pkg("2500 كاش", "2500 Cash", 20), pkg("6000 كاش", "6000 Cash", 50),
  ], custom("كاش", "Cash", 0.01, 100, 20000)),
  game("hago", "board_misc", "🎮", "هاجو", "Hago", [
    pkg("100 ألماس", "100 Diamonds", 1), pkg("500 ألماس", "500 Diamonds", 5), pkg("1000 ألماس", "1000 Diamonds", 10), pkg("2000 ألماس", "2000 Diamonds", 20), pkg("5000 ألماس", "5000 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.01, 100, 20000)),
  game("plato", "board_misc", "🧸", "بلاتو", "Plato", [
    pkg("1000 كوين", "1000 Coins", 2), pkg("2500 كوين", "2500 Coins", 5), pkg("5000 كوين", "5000 Coins", 10), pkg("10000 كوين", "10000 Coins", 20), pkg("25000 كوين", "25000 Coins", 50),
  ], custom("كوين", "Coin", 0.002, 1000, 50000)),
  game("yugioh", "board_misc", "🎴", "يوغي يو", "Yu-Gi-Oh!", [
    pkg("100 جوهرة", "100 Gems", 1), pkg("500 جوهرة", "500 Gems", 5), pkg("1000 جوهرة", "1000 Gems", 10), pkg("2500 جوهرة", "2500 Gems", 25), pkg("5000 جوهرة", "5000 Gems", 50),
  ], custom("جوهرة", "Gem", 0.01, 100, 20000)),
  game("marvel_snap", "board_misc", "🦸", "مارفل سناب", "Marvel Snap", [
    pkg("300 ذهب", "300 Gold", 5), pkg("700 ذهب", "700 Gold", 10), pkg("1450 ذهب", "1450 Gold", 20), pkg("3850 ذهب", "3850 Gold", 50), pkg("8000 ذهب", "8000 Gold", 100),
  ], custom("ذهب", "Gold", 0.015, 300, 20000)),
  game("farmville3", "board_misc", "🌾", "فارم فيل", "FarmVille 3", [
    pkg("100 جوهرة", "100 Gems", 1), pkg("500 جوهرة", "500 Gems", 5), pkg("1050 جوهرة", "1050 Gems", 10), pkg("2200 جوهرة", "2200 Gems", 20), pkg("5500 جوهرة", "5500 Gems", 50),
  ], custom("جوهرة", "Gem", 0.01, 100, 15000)),
  game("candy_crush", "board_misc", "🍬", "كاندي كراش", "Candy Crush", [
    pkg("10 سبائك", "10 Bars", 1), pkg("50 سبائك", "50 Bars", 5), pkg("100 سبائك", "100 Bars", 10), pkg("250 سبائك", "250 Bars", 20), pkg("500 سبائك", "500 Bars", 40),
  ], custom("سبيكة", "Bar", 0.1, 10, 5000)),
  game("pvz2", "board_misc", "🧟", "بلانتس فيز زومبيز", "Plants vs Zombies 2", [
    pkg("50 ألماس", "50 Diamonds", 1), pkg("250 ألماس", "250 Diamonds", 5), pkg("500 ألماس", "500 Diamonds", 10), pkg("1000 ألماس", "1000 Diamonds", 20), pkg("2500 ألماس", "2500 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.02, 50, 15000)),
  game("mario_kart", "board_misc", "🏎️", "ماريو كارت", "Mario Kart", [
    pkg("3 ياقوت", "3 Rubies", 2), pkg("10 ياقوت", "10 Rubies", 5), pkg("23 ياقوت", "23 Rubies", 10), pkg("48 ياقوت", "48 Rubies", 20), pkg("135 ياقوت", "135 Rubies", 50),
  ], custom("ياقوت", "Ruby", 0.4, 3, 5000)),

  game("psn_us", "platform_anime", "🎮", "بلايستيشن", "PlayStation (PSN US)", [
    pkg("رصيد 10$", "Balance 10$", 10), pkg("رصيد 20$", "Balance 20$", 20), pkg("رصيد 50$", "Balance 50$", 50), pkg("رصيد 75$", "Balance 75$", 75), pkg("رصيد 100$", "Balance 100$", 100),
  ], custom("دولار", "USD", 1, 10, 500)),
  game("xbox_us", "platform_anime", "❎", "اكس بوكس", "Xbox (US)", [
    pkg("رصيد 10$", "Balance 10$", 10), pkg("رصيد 20$", "Balance 20$", 20), pkg("رصيد 50$", "Balance 50$", 50), pkg("رصيد 75$", "Balance 75$", 75), pkg("رصيد 100$", "Balance 100$", 100),
  ], custom("دولار", "USD", 1, 10, 500)),
  game("nintendo", "platform_anime", "🍄", "نينتندو", "Nintendo", [
    pkg("رصيد 10$", "Balance 10$", 10), pkg("رصيد 20$", "Balance 20$", 20), pkg("رصيد 35$", "Balance 35$", 35), pkg("رصيد 50$", "Balance 50$", 50), pkg("رصيد 100$", "Balance 100$", 100),
  ], custom("دولار", "USD", 1, 10, 500)),
  game("gta_online", "platform_anime", "🏙️", "جي تي ايه", "GTA Online", [
    pkg("1.25M كاش", "1.25M Cash", 20), pkg("3.5M كاش", "3.5M Cash", 50), pkg("8M كاش", "8M Cash", 100), pkg("10M كاش", "10M Cash", 120), pkg("20M كاش", "20M Cash", 200),
  ], custom("مليون", "Million", 16, 1, 100)),
  game("pc_lol", "platform_anime", "⚔️", "ليج اوف ليجندز", "League of Legends (PC)", [
    pkg("650 RP", "650 RP", 5), pkg("1380 RP", "1380 RP", 10), pkg("2800 RP", "2800 RP", 20), pkg("5000 RP", "5000 RP", 35), pkg("7200 RP", "7200 RP", 50),
  ], custom("RP", "RP", 0.008, 650, 30000)),
  game("magic_awakened", "platform_anime", "🧙", "هاري بوتر", "Harry Potter: Magic Awakened", [
    pkg("60 جوهرة", "60 Gems", 1), pkg("300 جوهرة", "300 Gems", 5), pkg("680 جوهرة", "680 Gems", 10), pkg("1280 جوهرة", "1280 Gems", 20), pkg("3280 جوهرة", "3280 Gems", 50),
  ], custom("جوهرة", "Gem", 0.015, 60, 12000)),
  game("naruto_slugfest", "platform_anime", "🥷", "ناروتو", "Naruto Slugfest", [
    pkg("100 ذهب", "100 Gold", 1), pkg("500 ذهب", "500 Gold", 5), pkg("1000 ذهب", "1000 Gold", 10), pkg("2000 ذهب", "2000 Gold", 20), pkg("5000 ذهب", "5000 Gold", 50),
  ], custom("ذهب", "Gold", 0.01, 100, 20000)),
  game("one_piece_br", "platform_anime", "🏴‍☠️", "ون بيس", "One Piece: Bounty Rush", [
    pkg("5 ألماس", "5 Diamonds", 1), pkg("30 ألماس", "30 Diamonds", 5), pkg("60 ألماس", "60 Diamonds", 10), pkg("150 ألماس", "150 Diamonds", 25), pkg("300 ألماس", "300 Diamonds", 50),
  ], custom("ألماس", "Diamond", 0.16, 5, 5000)),
  game("db_legends", "platform_anime", "🐉", "دراغون بول", "Dragon Ball Legends", [
    pkg("100 كريستال", "100 Crystals", 1), pkg("500 كريستال", "500 Crystals", 5), pkg("1000 كريستال", "1000 Crystals", 10), pkg("2000 كريستال", "2000 Crystals", 20), pkg("5000 كريستال", "5000 Crystals", 50),
  ], custom("كريستال", "Crystal", 0.01, 100, 30000)),
];

const GAME_TOPUP_CATALOG = {
  version: 1,
  currency: "RUB",
  categories: GAME_TOPUP_CATEGORIES,
  games: GAME_TOPUP_GAMES,
};

module.exports = {
  GAME_TOPUP_CATALOG,
};
