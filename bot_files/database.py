import sqlite3
import datetime
import json
import os
import random
import shutil

DB_FILE = os.path.join(os.path.dirname(__file__), "bot_database.db")

def get_db():
    conn = sqlite3.connect(DB_FILE, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    # 1. المستخدمين
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            balance REAL DEFAULT 0.0,
            orders_count INTEGER DEFAULT 0,
            total_spent REAL DEFAULT 0.0,
            referred_by TEXT DEFAULT NULL,
            referral_earnings REAL DEFAULT 0.0,
            referrals_count INTEGER DEFAULT 0,
            is_banned INTEGER DEFAULT 0,
            joined_at TEXT
        )
    ''')
    
    # 2. المنتجات والأقسام
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT DEFAULT '🌍 الحسابات المتوفرة',
            description TEXT,
            price REAL NOT NULL,
            warranty_hours INTEGER DEFAULT 24,
            country_code TEXT DEFAULT '+1',
            is_active INTEGER DEFAULT 1,
            delivery_type TEXT DEFAULT 'instant',
            created_at TEXT
        )
    ''')
    
    # 3. المخزون الفعلي للحسابات الجاهزة
    c.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            phone_number TEXT NOT NULL,
            login_code TEXT,
            two_factor_auth TEXT,
            tdata_url TEXT,
            session_file TEXT,
            extra_info TEXT,
            status TEXT DEFAULT 'available',
            order_id TEXT DEFAULT NULL,
            created_at TEXT,
            sold_at TEXT DEFAULT NULL,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    ''')
    
    # 4. سجل الطلبات
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            product_title TEXT NOT NULL,
            price REAL NOT NULL,
            phone_number TEXT,
            login_code TEXT,
            two_factor_auth TEXT,
            tdata_link TEXT,
            session_data TEXT,
            status TEXT DEFAULT 'completed',
            warranty_hours INTEGER DEFAULT 24,
            warranty_until TEXT,
            warranty_status TEXT DEFAULT 'none',
            warranty_reason TEXT,
            created_at TEXT
        )
    ''')
    
    # 5. طلبات شحن المحفظة
    c.execute('''
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deposit_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            method_id TEXT NOT NULL,
            method_name TEXT NOT NULL,
            amount_usd REAL NOT NULL,
            transfer_proof TEXT,
            status TEXT DEFAULT 'pending',
            admin_note TEXT,
            created_at TEXT,
            reviewed_at TEXT
        )
    ''')
    
    # 6. تحويلات الرصيد بين المستخدمين
    c.execute('''
        CREATE TABLE IF NOT EXISTS transfers (
            transfer_id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            amount REAL NOT NULL,
            fee REAL DEFAULT 0.0,
            created_at TEXT
        )
    ''')
    
    # 7. الكوبونات والعروض
    c.execute('''
        CREATE TABLE IF NOT EXISTS coupons (
            code TEXT PRIMARY KEY,
            discount_type TEXT DEFAULT 'fixed',
            discount_value REAL NOT NULL,
            min_spend REAL DEFAULT 0.0,
            max_uses INTEGER DEFAULT 100,
            used_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            expires_at TEXT
        )
    ''')
    
    # 8. حسابات الدعم الفني
    c.execute('''
        CREATE TABLE IF NOT EXISTS support_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            username_or_url TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        )
    ''')
    
    # 9. مزودو ومفاتيح API (نظام المزودين المركزي وإدارة مفاتيح API)
    c.execute('''
        CREATE TABLE IF NOT EXISTS providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            api_url TEXT NOT NULL,
            base_url TEXT DEFAULT '',
            api_key TEXT NOT NULL,
            adapter_type TEXT DEFAULT 'standard',
            provider_type TEXT DEFAULT 'tg_ready',
            is_active INTEGER DEFAULT 1,
            enabled INTEGER DEFAULT 1,
            priority INTEGER DEFAULT 100,
            status TEXT DEFAULT 'online',
            balance REAL DEFAULT 0.0,
            min_balance REAL DEFAULT 10.0,
            last_check TEXT DEFAULT NULL,
            last_error TEXT DEFAULT NULL,
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    
    # 9.1 ترقية أعمدة جدول المزودين تلقائياً في حال وجوده سابقاً (Safe Migration)
    try:
        existing_cols = [row[1] for row in c.execute("PRAGMA table_info(providers)").fetchall()]
        cols_to_add = [
            ("base_url", "TEXT DEFAULT ''"),
            ("adapter_type", "TEXT DEFAULT 'standard'"),
            ("enabled", "INTEGER DEFAULT 1"),
            ("priority", "INTEGER DEFAULT 100"),
            ("status", "TEXT DEFAULT 'online'"),
            ("balance", "REAL DEFAULT 0.0"),
            ("min_balance", "REAL DEFAULT 10.0"),
            ("last_check", "TEXT DEFAULT NULL"),
            ("last_error", "TEXT DEFAULT NULL"),
            ("updated_at", "TEXT DEFAULT NULL")
        ]
        for col_name, col_def in cols_to_add:
            if col_name not in existing_cols:
                c.execute(f"ALTER TABLE providers ADD COLUMN {col_name} {col_def}")
    except Exception as e:
        print(f"Provider migration info: {e}")

    # 9.2 سجل تدقيق وعمليات المزودين (Provider Operations Audit Log)
    c.execute('''
        CREATE TABLE IF NOT EXISTS provider_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id INTEGER DEFAULT 0,
            provider_name TEXT NOT NULL,
            operation TEXT NOT NULL,
            result TEXT NOT NULL,
            details TEXT,
            error_code TEXT DEFAULT NULL,
            duration_ms INTEGER DEFAULT 0,
            created_at TEXT
        )
    ''')
    
    # 10. طرق الدفع والحسابات
    c.execute('''
        CREATE TABLE IF NOT EXISTS payment_methods (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'bank',
            account_info TEXT NOT NULL,
            instructions TEXT,
            is_active INTEGER DEFAULT 1
        )
    ''')
    
    # 11. سجل العمليات والتدقيق (Audit Log)
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_id TEXT NOT NULL,
            actor_role TEXT DEFAULT 'user',
            action_type TEXT NOT NULL,
            details TEXT,
            amount REAL DEFAULT 0.0,
            balance_before REAL DEFAULT 0.0,
            balance_after REAL DEFAULT 0.0,
            created_at TEXT
        )
    ''')
    
    # 12. إعدادات البوت العامة
    c.execute('''
        CREATE TABLE IF NOT EXISTS bot_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    
    # بذر البيانات الافتراضية
    seed_default_data(conn)
    conn.close()

def seed_default_data(conn):
    c = conn.cursor()
    
    # إعدادات افتراضية
    default_settings = {
        "store_name": "متجر الحسابات الجاهزة للتسليم الفوري",
        "currency": "USD",
        "currency_symbol": "$",
        "min_deposit": "1.0",
        "min_transfer": "1.0",
        "transfer_fee_percent": "0.0",
        "referral_reward": "0.10",
        "maintenance_mode": "0",
        "warranty_hours_default": "24",
        "support_username": "Yy77501",
        "rules_faq": (
            "📌 **قواعد وتعليمات المتجر:**\n"
            "1. جميع الحسابات يتم تسليمها فورياً بعد تأكيد الدفع.\n"
            "2. الضمان ساري لمدة 24 ساعة من وقت الاستلام ضد تسجيل الخروج الأول.\n"
            "3. عملة الشراء والمحفظة هي الدولار الأمريكي ($) فقط.\n"
            "4. في حال وجود مشكلة في الحساب، استخدم زر [🛡 طلب ضمان] من تفاصيل الطلب."
        )
    }
    for k, v in default_settings.items():
        c.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)", (k, v))
        
    # طرق دفع افتراضية
    default_methods = [
        ("kuraimi", "🏦 الكريمي إكسبرس (حساب بنكي)", "bank", "رقم الحساب: 123456789 - باسم: المتجر الرسمي", "يرجى إيداع المبلغ بالدولار ثم إرسال صورة السند واضحة."),
        ("sham_cash", "💵 شام كاش (محفظة إلكترونية)", "wallet", "رقم الحساب: 963900000000", "حول بالدولار أو ما يعادله ثم أرسل إشعار التحويل."),
        ("vodafone", "📱 فودافون كاش / إنستاباي", "wallet", "رقم المحفظة: 01000000000", "أرسل المبلغ ثم شارك كود العملية وصورة التحويل."),
        ("usdt", "💎 USDT (TRC-20 Crypto)", "crypto", "العنوان: T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", "أرسل المبلغ المحدد على شبكة TRC20 ثم أدخل كود الهاش TXID."),
        ("admin_direct", "👨‍💼 الدفع المباشر عبر الإدارة", "admin", "تواصل مباشرة مع المشرف: @Yy77501", "أرسل للمشرف المبلغ الذي ترغب بشحنه.")
    ]
    for mid, mname, mcat, minfo, minst in default_methods:
        c.execute('''
            INSERT OR IGNORE INTO payment_methods (id, name, category, account_info, instructions, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        ''', (mid, mname, mcat, minfo, minst))
        
    # حسابات دعم افتراضية
    c.execute("SELECT COUNT(*) FROM support_accounts")
    if c.fetchone()[0] == 0:
        c.execute('''
            INSERT INTO support_accounts (title, username_or_url, is_active)
            VALUES (?, ?, 1)
        ''', ("الدعم الفني المباشر", "https://t.me/Yy77501"))
        
    # منتجات افتراضية لحسابات تيليجرام
    c.execute("SELECT COUNT(*) FROM products")
    if c.fetchone()[0] == 0:
        sample_products = [
            ("🇺🇸 حساب تيليجرام أمريكي (+1) عمر قديم 2023", "🌍 الحسابات المتوفرة", "حساب تيليجرام أمريكي مميز عمر أكثر من سنة، تسليم فوري مع ملف الجلسة وكود الدخول.", 4.50, 24, "+1"),
            ("🇬🇧 حساب تيليجرام بريطاني (+44) مفعل بالكامل", "🌍 الحسابات المتوفرة", "حساب بريطاني نظيف مع كود 2FA وتسليم فوري.", 5.00, 24, "+44"),
            ("🇷🇺 حساب تيليجرام روسي (+7) جاهز للعمل", "🌍 الحسابات المتوفرة", "حساب تيليجرام روسي عالي الجودة مناسب لجميع الاستخدامات.", 3.20, 24, "+7"),
            ("🔥 باقة 5 حسابات تيليجرام متنوعة (عرض خاص)", "🔥 العروض", "باقة توفيرية تحتوي 5 حسابات مسجلة ومفعلة مع ضمان شامل 48 ساعة.", 16.00, 48, "Multi"),
            ("⭐ حساب تيليجرام VIP مميز جداً موثق", "⭐ الحسابات المميزة", "حساب قديم جداً خالي من أي قيود ومناسب لإنشاء القنوات الكبيرة وإدارتها.", 8.50, 72, "+1")
        ]
        for ptitle, pcat, pdesc, pprice, pwarr, pcc in sample_products:
            c.execute('''
                INSERT INTO products (title, category, description, price, warranty_hours, country_code, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            ''', (ptitle, pcat, pdesc, pprice, pwarr, pcc, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
            
        # بذر بعض الحسابات في المخزون للمنتج الأول
        for i in range(1, 6):
            c.execute('''
                INSERT INTO inventory (product_id, phone_number, login_code, two_factor_auth, tdata_url, status, created_at)
                VALUES (1, ?, ?, 'TgSafe#2026', 'https://storage.yasnum.org/tdata/acc_sample.zip', 'available', ?)
            ''', (f"+1555019{random.randint(100, 999)}", f"{random.randint(10000, 99999)}", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    # بذر مزودي الأرقام والحسابات الثلاثة الافتراضية
    c.execute("SELECT COUNT(*) FROM providers")
    if c.fetchone()[0] == 0:
        default_providers = [
            ("Provider A (الرئيسي 🥇)", "https://api.tg-ready.net/v1", "tg_live_sec_99a8182b847fa", "standard", 100, 120.50, 10.0, "online", 1),
            ("Provider B (الاحتياط الأول 🥈)", "https://api.grizzly-sms.com/stubs", "grz_live_sec_77b9192c103bc", "sms_activate", 90, 45.20, 10.0, "online", 1),
            ("Provider C (الاحتياط الثاني 🥉)", "https://api.5sim.net/v1", "fiv_live_sec_55c1012d918ef", "fivesim", 80, 18.70, 10.0, "online", 1)
        ]
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for pname, purl, pkey, padapter, pprio, pbal, pmin, pstatus, penabled in default_providers:
            c.execute('''
                INSERT INTO providers (name, api_url, base_url, api_key, adapter_type, priority, balance, min_balance, status, enabled, is_active, last_check, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            ''', (pname, purl, purl, pkey, padapter, pprio, pbal, pmin, pstatus, penabled, now_str, now_str, now_str))

    conn.commit()

# =========================================================
# دوال المستخدم والمحفظة
# =========================================================

def get_or_create_user(user_id, username=None, first_name=None, referrer_id=None):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE user_id = ?", (str(user_id),))
    row = c.fetchone()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if not row:
        referred_by = None
        if referrer_id and str(referrer_id) != str(user_id):
            c.execute("SELECT user_id FROM users WHERE user_id = ?", (str(referrer_id),))
            if c.fetchone():
                referred_by = str(referrer_id)
                reward = float(get_setting("referral_reward", "0.10"))
                c.execute('''
                    UPDATE users 
                    SET balance = balance + ?, referral_earnings = referral_earnings + ?, referrals_count = referrals_count + 1
                    WHERE user_id = ?
                ''', (reward, reward, referred_by))
                add_audit_log(referred_by, "system", "referral_reward", f"مكافأة دعوة المستخدم {user_id}", reward)
                
        c.execute('''
            INSERT INTO users (user_id, username, first_name, balance, orders_count, total_spent, referred_by, joined_at)
            VALUES (?, ?, ?, 0.0, 0, 0.0, ?, ?)
        ''', (str(user_id), username or "", first_name or "", referred_by, now_str))
        conn.commit()
        c.execute("SELECT * FROM users WHERE user_id = ?", (str(user_id),))
        row = c.fetchone()
    else:
        # تحديث الاسم والمعرف
        if username != row["username"] or first_name != row["first_name"]:
            c.execute("UPDATE users SET username = ?, first_name = ? WHERE user_id = ?", (username or "", first_name or "", str(user_id)))
            conn.commit()
            c.execute("SELECT * FROM users WHERE user_id = ?", (str(user_id),))
            row = c.fetchone()
            
    user_dict = dict(row)
    conn.close()
    return user_dict

def update_user_balance(user_id, amount_delta, actor_id="system", action_type="manual_adjustment", reason=""):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT balance FROM users WHERE user_id = ?", (str(user_id),))
    r = c.fetchone()
    if not r:
        conn.close()
        return False, "المستخدم غير موجود"
        
    old_bal = float(r["balance"])
    new_bal = old_bal + float(amount_delta)
    if new_bal < 0:
        conn.close()
        return False, "الرصيد غير كافٍ لإتمام هذه العملية"
        
    c.execute("UPDATE users SET balance = ? WHERE user_id = ?", (new_bal, str(user_id)))
    conn.commit()
    conn.close()
    
    add_audit_log(actor_id, "admin" if actor_id != "system" else "system", action_type, f"تعديل رصيد {user_id}: {reason}", amount_delta, old_bal, new_bal)
    return True, new_bal

# =========================================================
# دوال المنتجات والمخزون
# =========================================================

def get_categories():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT DISTINCT category FROM products WHERE is_active = 1")
    rows = c.fetchall()
    conn.close()
    return [r[0] for r in rows] if rows else ["🌍 الحسابات المتوفرة", "🔥 العروض", "⭐ الحسابات المميزة"]

def get_products(category=None):
    conn = get_db()
    c = conn.cursor()
    if category:
        c.execute('''
            SELECT p.*, 
            (SELECT COUNT(*) FROM inventory i WHERE i.product_id = p.id AND i.status = 'available') as in_stock
            FROM products p
            WHERE p.category = ? AND p.is_active = 1
            ORDER BY p.id ASC
        ''', (category,))
    else:
        c.execute('''
            SELECT p.*, 
            (SELECT COUNT(*) FROM inventory i WHERE i.product_id = p.id AND i.status = 'available') as in_stock
            FROM products p
            WHERE p.is_active = 1
            ORDER BY p.id ASC
        ''')
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_product_by_id(product_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT p.*, 
        (SELECT COUNT(*) FROM inventory i WHERE i.product_id = p.id AND i.status = 'available') as in_stock
        FROM products p
        WHERE p.id = ?
    ''', (product_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def buy_account_instant(user_id, product_id, coupon_code=None):
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM users WHERE user_id = ?", (str(user_id),))
    u = c.fetchone()
    if not u:
        conn.close()
        return False, "المستخدم غير موجود"
        
    c.execute("SELECT * FROM products WHERE id = ? AND is_active = 1", (product_id,))
    p = c.fetchone()
    if not p:
        conn.close()
        return False, "المنتج غير متوفر حالياً"
        
    price = float(p["price"])
    
    # تطبيق الكوبون إن وجد
    discount = 0.0
    if coupon_code:
        c.execute("SELECT * FROM coupons WHERE code = ? AND is_active = 1", (coupon_code.strip().upper(),))
        coup = c.fetchone()
        if coup:
            if coup["discount_type"] == "percent":
                discount = price * (float(coup["discount_value"]) / 100.0)
            else:
                discount = float(coup["discount_value"])
            c.execute("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?", (coupon_code.strip().upper(),))
            
    final_price = max(0.0, price - discount)
    user_bal = float(u["balance"])
    if user_bal < final_price:
        conn.close()
        return False, f"رصيدك الحالي (${user_bal:.2f}) غير كافٍ. سعر الحساب هو ${final_price:.2f}."
        
    # جلب حساب متاح من المخزون
    c.execute("SELECT * FROM inventory WHERE product_id = ? AND status = 'available' LIMIT 1", (product_id,))
    inv = c.fetchone()
    if not inv:
        conn.close()
        return False, "للأسف نفد المخزون المتوفر لهذا المنتج حالياً. يرجى مراجعة الدعم أو المحاولة لاحقاً."
        
    order_id = f"#{random.randint(10000, 99999)}"
    now = datetime.datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    warranty_hours = int(p["warranty_hours"])
    warranty_until = (now + datetime.timedelta(hours=warranty_hours)).strftime("%Y-%m-%d %H:%M:%S")
    
    # خصم الرصيد
    new_bal = user_bal - final_price
    c.execute('''
        UPDATE users 
        SET balance = ?, orders_count = orders_count + 1, total_spent = total_spent + ?
        WHERE user_id = ?
    ''', (new_bal, final_price, str(user_id)))
    
    # تحديث عنصر المخزون
    c.execute('''
        UPDATE inventory 
        SET status = 'sold', order_id = ?, sold_at = ?
        WHERE id = ?
    ''', (order_id, now_str, inv["id"]))
    
    # إنشاء سجل الطلب
    c.execute('''
        INSERT INTO orders (
            order_id, user_id, product_id, product_title, price,
            phone_number, login_code, two_factor_auth, tdata_link,
            status, warranty_hours, warranty_until, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
    ''', (
        order_id, str(user_id), product_id, p["title"], final_price,
        inv["phone_number"], inv["login_code"] or "طلب كود من البوت",
        inv["two_factor_auth"] or "لا يوجد", inv["tdata_url"] or "",
        warranty_hours, warranty_until, now_str
    ))
    
    conn.commit()
    conn.close()
    
    add_audit_log(str(user_id), "user", "buy_order", f"شراء {p['title']} (الطلب {order_id})", final_price, user_bal, new_bal)
    
    return True, {
        "order_id": order_id,
        "product_title": p["title"],
        "price": final_price,
        "phone_number": inv["phone_number"],
        "login_code": inv["login_code"],
        "two_factor_auth": inv["two_factor_auth"],
        "tdata_url": inv["tdata_url"],
        "warranty_until": warranty_until,
        "warranty_hours": warranty_hours
    }

# =========================================================
# دوال الطلبات والضمان
# =========================================================

def get_user_orders(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (str(user_id),))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_order_by_id(order_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE order_id = ?", (str(order_id),))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def request_order_warranty(order_id, reason):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE order_id = ?", (str(order_id),))
    order = c.fetchone()
    if not order:
        conn.close()
        return False, "الطلب غير موجود"
        
    c.execute('''
        UPDATE orders 
        SET warranty_status = 'requested', warranty_reason = ?, status = 'warranty'
        WHERE order_id = ?
    ''', (reason, str(order_id)))
    conn.commit()
    conn.close()
    
    add_audit_log(order["user_id"], "user", "warranty_requested", f"طلب ضمان على الطلب {order_id}: {reason}", 0.0)
    return True, "تم تقديم طلب الضمان بنجاح وستتم مراجعته من قبل الإدارة فوراً."

# =========================================================
# دوال شحن المحفظة
# =========================================================

def create_deposit_request(user_id, method_id, amount_usd, proof_text=""):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT name FROM payment_methods WHERE id = ?", (method_id,))
    m = c.fetchone()
    m_name = m["name"] if m else method_id
    
    dep_id = f"#{random.randint(1000, 9999)}"
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    c.execute('''
        INSERT INTO deposits (deposit_id, user_id, method_id, method_name, amount_usd, transfer_proof, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    ''', (dep_id, str(user_id), method_id, m_name, float(amount_usd), proof_text, now_str))
    
    conn.commit()
    conn.close()
    add_audit_log(str(user_id), "user", "deposit_request", f"طلب شحن {dep_id} بمبلغ ${amount_usd:.2f}", float(amount_usd))
    return dep_id

def approve_deposit(deposit_id, admin_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM deposits WHERE deposit_id = ?", (str(deposit_id),))
    dep = c.fetchone()
    if not dep or dep["status"] != "pending":
        conn.close()
        return False, "طلب الشحن غير موجود أو تمت معالجته مسبقاً"
        
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    amt = float(dep["amount_usd"])
    uid = dep["user_id"]
    
    # زيادة رصيد المستخدم
    c.execute("SELECT balance FROM users WHERE user_id = ?", (uid,))
    u = c.fetchone()
    old_bal = float(u["balance"]) if u else 0.0
    new_bal = old_bal + amt
    
    c.execute("UPDATE users SET balance = ? WHERE user_id = ?", (new_bal, uid))
    c.execute("UPDATE deposits SET status = 'approved', reviewed_at = ?, admin_note = 'موافقة الإدارة' WHERE deposit_id = ?", (now_str, str(deposit_id)))
    
    conn.commit()
    conn.close()
    
    add_audit_log(str(admin_id), "admin", "deposit_approved", f"الموافقة على طلب شحن {deposit_id} للمستخدم {uid}", amt, old_bal, new_bal)
    return True, {"user_id": uid, "amount": amt, "new_balance": new_bal}

def reject_deposit(deposit_id, admin_id, reason="تم الرفض بواسطة الإدارة"):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM deposits WHERE deposit_id = ?", (str(deposit_id),))
    dep = c.fetchone()
    if not dep or dep["status"] != "pending":
        conn.close()
        return False, "طلب الشحن غير موجود أو تمت معالجته مسبقاً"
        
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    c.execute("UPDATE deposits SET status = 'rejected', reviewed_at = ?, admin_note = ? WHERE deposit_id = ?", (now_str, reason, str(deposit_id)))
    conn.commit()
    conn.close()
    add_audit_log(str(admin_id), "admin", "deposit_rejected", f"رفض طلب شحن {deposit_id}: {reason}")
    return True, {"user_id": dep["user_id"], "amount": dep["amount_usd"]}

def get_pending_deposits():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM deposits WHERE status = 'pending' ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_all_deposits(limit=20):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM deposits ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_all_orders(limit=20):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM orders ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_pending_warranties():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE warranty_status = 'pending' ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def resolve_warranty(order_id, action, admin_id):
    # action can be 'approved' (refund user) or 'rejected'
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE order_id = ?", (str(order_id),))
    ord_row = c.fetchone()
    if not ord_row:
        conn.close()
        return False, "الطلب غير موجود!"
        
    uid = ord_row["user_id"]
    price = float(ord_row["price_usd"])
    
    if action == "approved":
        # تعويض المستخدم بإعادة الرصيد
        c.execute("UPDATE users SET balance = balance + ? WHERE user_id = ?", (price, uid))
        c.execute("UPDATE orders SET warranty_status = 'approved' WHERE order_id = ?", (str(order_id),))
        conn.commit()
        conn.close()
        add_audit_log(str(admin_id), "admin", "warranty_approved", f"قبول طلب الضمان وتعويض {uid} بمبلغ ${price:.2f}", price)
        return True, f"تم قبول الضمان وإعادة ${price:.2f} إلى رصيد المستخدم بنجاح!"
    else:
        c.execute("UPDATE orders SET warranty_status = 'rejected' WHERE order_id = ?", (str(order_id),))
        conn.commit()
        conn.close()
        add_audit_log(str(admin_id), "admin", "warranty_rejected", f"رفض طلب الضمان للطلب {order_id}")
        return True, "تم رفض طلب الضمان للطلب المحدد."

def get_all_coupons():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM coupons ORDER BY code ASC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def create_coupon(code, discount_type, discount_value, max_uses=100):
    conn = get_db()
    c = conn.cursor()
    code_clean = code.strip().upper()
    c.execute('''
        INSERT INTO coupons (code, discount_type, discount_value, max_uses, used_count, is_active)
        VALUES (?, ?, ?, ?, 0, 1)
        ON CONFLICT(code) DO UPDATE SET
            discount_type = excluded.discount_type,
            discount_value = excluded.discount_value,
            max_uses = excluded.max_uses,
            is_active = 1
    ''', (code_clean, discount_type, float(discount_value), int(max_uses)))
    conn.commit()
    conn.close()
    return code_clean

def apply_coupon(code, user_id):
    conn = get_db()
    c = conn.cursor()
    code_clean = code.strip().upper()
    c.execute("SELECT * FROM coupons WHERE code = ? AND is_active = 1", (code_clean,))
    coup = c.fetchone()
    if not coup:
        conn.close()
        return False, "الكوبون غير صالح أو غير موجود!"
        
    max_u = coup["max_uses"] or 100
    used_u = coup["used_count"] or 0
    if used_u >= max_u:
        conn.close()
        return False, "تم استنفاذ جميع استخدامات هذا الكوبون!"
        
    val = float(coup["discount_value"])
    # إضافة الرصيد للمستخدم
    c.execute("UPDATE users SET balance = balance + ? WHERE user_id = ?", (val, str(user_id)))
    c.execute("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?", (code_clean,))
    conn.commit()
    conn.close()
    add_audit_log(str(user_id), "user", "coupon_redeemed", f"استخدام الكوبون {code_clean} بقيمة ${val:.2f}", val)
    return True, {"code": code_clean, "discount_value": val}

def claim_daily_reward(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT balance, created_at FROM users WHERE user_id = ?", (str(user_id),))
    u = c.fetchone()
    if not u:
        conn.close()
        return False, "المستخدم غير مسجل!"
        
    reward_amt = float(get_setting("daily_reward_usd", "0.05"))
    c.execute("UPDATE users SET balance = balance + ? WHERE user_id = ?", (reward_amt, str(user_id)))
    conn.commit()
    conn.close()
    add_audit_log(str(user_id), "user", "daily_bonus", f"استلام المكافأة اليومية ${reward_amt:.2f}", reward_amt)
    return True, reward_amt

# =========================================================
# دوال تحويل الرصيد
# =========================================================

def transfer_user_balance(sender_id, receiver_id, amount):
    if str(sender_id) == str(receiver_id):
        return False, "لا يمكن تحويل الرصيد إلى حسابك الشخصي!"
        
    min_tf = float(get_setting("min_transfer", "1.0"))
    if amount < min_tf:
        return False, f"الحد الأدنى للتحويل هو ${min_tf:.2f}."
        
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT balance FROM users WHERE user_id = ?", (str(sender_id),))
    s = c.fetchone()
    if not s or float(s["balance"]) < amount:
        conn.close()
        return False, "رصيدك الحالي لا يكفي لإتمام هذا التحويل."
        
    c.execute("SELECT user_id, balance FROM users WHERE user_id = ?", (str(receiver_id),))
    r = c.fetchone()
    if not r:
        conn.close()
        return False, "المستلم غير مسجل في البوت، يرجى التأكد من الآيدي (ID)."
        
    tf_id = f"TRF-{random.randint(10000, 99999)}"
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    s_new = float(s["balance"]) - amount
    r_new = float(r["balance"]) + amount
    
    c.execute("UPDATE users SET balance = ? WHERE user_id = ?", (s_new, str(sender_id)))
    c.execute("UPDATE users SET balance = ? WHERE user_id = ?", (r_new, str(receiver_id)))
    c.execute('''
        INSERT INTO transfers (transfer_id, sender_id, receiver_id, amount, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (tf_id, str(sender_id), str(receiver_id), amount, now_str))
    
    conn.commit()
    conn.close()
    
    add_audit_log(str(sender_id), "user", "balance_transfer", f"تحويل ${amount:.2f} إلى {receiver_id} ({tf_id})", amount, float(s["balance"]), s_new)
    return True, {"transfer_id": tf_id, "amount": amount, "sender_new_bal": s_new, "receiver_new_bal": r_new}

# =========================================================
# دوال نظام المزودين المركزي (Provider Manager DB Helpers)
# =========================================================

def mask_api_key(key: str) -> str:
    """إخفاء مفتاح API للأمان بحيث تظهر فقط آخر 4 خانات"""
    if not key:
        return "غير مضبوط"
    key_str = str(key).strip()
    if len(key_str) <= 6:
        return "••••" + key_str[-2:]
    return "••••••••••••" + key_str[-4:]

def get_all_providers(only_enabled=False):
    """جلب جميع المزودين مرتبين بحسب الأولوية من الأعلى للأدنى"""
    conn = get_db()
    c = conn.cursor()
    query = "SELECT * FROM providers"
    if only_enabled:
        query += " WHERE enabled = 1 AND is_active = 1"
    query += " ORDER BY priority DESC, id ASC"
    c.execute(query)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_provider_by_id(provider_id):
    """جلب بيانات مزود محدد"""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM providers WHERE id = ?", (int(provider_id),))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def add_provider(name, api_url, api_key, adapter_type="standard", priority=100, min_balance=10.0, enabled=1):
    """إضافة مزود جديد بعد نجاح اختبار الاتصال"""
    conn = get_db()
    c = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    base_url = api_url.rstrip("/") if api_url else ""
    c.execute('''
        INSERT INTO providers (
            name, api_url, base_url, api_key, adapter_type, priority,
            balance, min_balance, status, enabled, is_active, last_check, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0.0, ?, 'online', ?, 1, ?, ?, ?)
    ''', (name, api_url, base_url, api_key.strip(), adapter_type, int(priority), float(min_balance), int(enabled), now_str, now_str, now_str))
    prov_id = c.lastrowid
    conn.commit()
    conn.close()
    
    add_provider_log(prov_id, name, "add_provider", "success", f"تمت إضافة المزود بالأولوية {priority}")
    return prov_id

def update_provider(provider_id, **kwargs):
    """تحديث أي حقل في المزود"""
    conn = get_db()
    c = conn.cursor()
    fields = []
    vals = []
    for k, v in kwargs.items():
        fields.append(f"{k} = ?")
        vals.append(v)
    if not fields:
        conn.close()
        return False
    fields.append("updated_at = ?")
    vals.append(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    vals.append(int(provider_id))
    
    query = f"UPDATE providers SET {', '.join(fields)} WHERE id = ?"
    c.execute(query, vals)
    conn.commit()
    conn.close()
    return True

def update_provider_status(provider_id, status, balance=None, last_error=None):
    """تحديث حالة المزود ورصيده وآخر فحص"""
    conn = get_db()
    c = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if balance is not None:
        c.execute('''
            UPDATE providers 
            SET status = ?, balance = ?, last_error = ?, last_check = ?, updated_at = ?
            WHERE id = ?
        ''', (status, float(balance), last_error, now_str, now_str, int(provider_id)))
    else:
        c.execute('''
            UPDATE providers 
            SET status = ?, last_error = ?, last_check = ?, updated_at = ?
            WHERE id = ?
        ''', (status, last_error, now_str, now_str, int(provider_id)))
    conn.commit()
    conn.close()

def update_provider_priority(provider_id, priority):
    """تعديل أولوية المزود"""
    return update_provider(provider_id, priority=int(priority))

def update_provider_api_key(provider_id, new_api_key):
    """تحديث المفتاح السري بعد اجتياز الاختبار"""
    res = update_provider(provider_id, api_key=new_api_key.strip())
    add_provider_log(provider_id, f"Provider #{provider_id}", "api_key_update", "success", "تم تحديث مفتاح API بعد اجتياز اختبار الاتصال")
    return res

def delete_provider(provider_id):
    """حذف المزود من قاعدة البيانات"""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT name FROM providers WHERE id = ?", (int(provider_id),))
    row = c.fetchone()
    name = row["name"] if row else f"Provider #{provider_id}"
    c.execute("DELETE FROM providers WHERE id = ?", (int(provider_id),))
    conn.commit()
    conn.close()
    add_provider_log(provider_id, name, "delete_provider", "success", "تم حذف المزود من النظام")
    return True

def add_provider_log(provider_id, provider_name, operation, result, details, error_code=None, duration_ms=0):
    """تسجيل عملية في سجل تدقيق المزودين"""
    try:
        conn = get_db()
        c = conn.cursor()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute('''
            INSERT INTO provider_logs (provider_id, provider_name, operation, result, details, error_code, duration_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (int(provider_id or 0), str(provider_name), str(operation), str(result), str(details), error_code, int(duration_ms), now_str))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving provider log: {e}")

def get_provider_logs(limit=50):
    """جلب سجل عمليات المزودين"""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM provider_logs ORDER BY id DESC LIMIT ?", (int(limit),))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# =========================================================
# دوال الإعدادات وسجل العمليات
# =========================================================

def get_setting(key, default=""):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT value FROM bot_settings WHERE key = ?", (key,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else default

def set_setting(key, value):
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()

def add_audit_log(actor_id, actor_role, action_type, details, amount=0.0, bal_before=0.0, bal_after=0.0):
    try:
        conn = get_db()
        c = conn.cursor()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute('''
            INSERT INTO audit_logs (actor_id, actor_role, action_type, details, amount, balance_before, balance_after, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (str(actor_id), actor_role, action_type, details, float(amount), float(bal_before), float(bal_after), now_str))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit log error: {e}")

def get_audit_logs(limit=25):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_system_stats():
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM users")
    total_users = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*), SUM(price) FROM orders WHERE status = 'completed'")
    r_orders = c.fetchone()
    total_orders = r_orders[0] or 0
    total_sales = r_orders[1] or 0.0
    
    c.execute("SELECT SUM(amount_usd) FROM deposits WHERE status = 'approved'")
    r_dep = c.fetchone()
    total_deposits = r_dep[0] or 0.0
    
    c.execute("SELECT COUNT(*) FROM inventory WHERE status = 'available'")
    in_stock = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM orders WHERE warranty_status = 'requested'")
    warranty_claims = c.fetchone()[0]
    
    c.execute("SELECT SUM(referrals_count) FROM users")
    total_referrals = c.fetchone()[0] or 0
    
    conn.close()
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_sales": total_sales,
        "total_deposits": total_deposits,
        "in_stock": in_stock,
        "warranty_claims": warranty_claims,
        "total_referrals": total_referrals
    }

# =========================================================
# النسخ الاحتياطي والاستعادة
# =========================================================

def export_database_json():
    conn = get_db()
    c = conn.cursor()
    
    tables = ["users", "products", "inventory", "orders", "deposits", "transfers", "coupons", "support_accounts", "providers", "payment_methods", "bot_settings"]
    backup_data = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tables": {}
    }
    
    for tbl in tables:
        try:
            c.execute(f"SELECT * FROM {tbl}")
            backup_data["tables"][tbl] = [dict(r) for r in c.fetchall()]
        except Exception:
            pass
            
    conn.close()
    return json.dumps(backup_data, ensure_ascii=False, indent=2)

def restore_database_from_json(json_str):
    try:
        data = json.loads(json_str)
        # إنشاء نسخة أمان احتياطية فورية قبل الاستبدال
        backup_current_file = DB_FILE + f".bak_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        if os.path.exists(DB_FILE):
            shutil.copyfile(DB_FILE, backup_current_file)
            
        conn = get_db()
        c = conn.cursor()
        
        tables_data = data.get("tables", {})
        for tbl, rows in tables_data.items():
            if not rows:
                continue
            cols = list(rows[0].keys())
            placeholders = ", ".join(["?"] * len(cols))
            cols_joined = ", ".join(cols)
            
            c.execute(f"DELETE FROM {tbl}")
            for r in rows:
                vals = [r[k] for k in cols]
                c.execute(f"INSERT INTO {tbl} ({cols_joined}) VALUES ({placeholders})", vals)
                
        conn.commit()
        conn.close()
        return True, "تمت استعادة البيانات بنجاح مع حفظ نسخة أمان احتياطية للبيانات السابقة."
    except Exception as e:
        return False, f"فشلت الاستعادة: {e}"

# تشغيل التهيئة
init_db()