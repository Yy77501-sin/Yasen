SUPPORT_USERNAME', '').strip()
    CURRENCY = getattr(config, 'CURRENCY', '$').strip()
    
    # هامش الربح المعتمد: 30% تلقائياً
    PROFIT_MARGIN = getattr(config, 'PROFIT_MARGIN', 0.30)
    RUB_PER_USD = getattr(config, 'RUB_PER_USD', 30.0)
    
    MAIN_CHANNEL_URL = getattr(config, 'MAIN_CHANNEL_URL', '').strip()
    INSTRUCTIONS_CHANNEL_URL = getattr(config, 'INSTRUCTIONS_CHANNEL_URL', '').strip()
    ACTIVATION_CHANNEL_ID = getattr(config, 'ACTIVATION_CHANNEL_ID', '').strip()
except Exception as e:
    print(f"Config Import Warning: {e}")
    BOT_TOKEN = os.getenv('BOT_TOKEN', '8880668064:AAHFsGU8w_Hzt0-2bxmGB3yDKVwcuPQMiIA').strip()
    FIVESIM_JWT_TOKEN = os.getenv('FIVESIM_API_KEY', os.getenv('FIVESIM_JWT_TOKEN', '')).strip()
    GRIZZLY_API_KEY = os.getenv('GRIZZLY_API_KEY', '').strip()
    HERO_API_KEY = os.getenv('HERO_SMS_API_KEY', '').strip()
    TG_READY_API_KEY = os.getenv('TG_READY_API_KEY', '').strip()
    TG_READY_BASE_URL = os.getenv('TG_READY_BASE_URL', 'https://api.tg-ready.net/v1').strip()
    RENDER_EXTERNAL_URL = os.getenv('RENDER_EXTERNAL_URL', '').strip()
    ADMIN_ID = str(os.getenv('ADMIN_ID', '0')).strip()
    SUPPORT_USERNAME = os.getenv('SUPPORT_USERNAME', '').strip()
    CURRENCY = "$"
    PROFIT_MARGIN = 0.30