# -*- coding: utf-8 -*-
"""
ملف خاص بخدمات الأرقام والرشق (موفرو خدمة الرسائل النصية القصيرة وSMM API)
يحتوي هذا الملف على جميع كلاسات ودوالاتصال بالمواقع المزودة:
1. فايف سيم (5SIM.net / 5SIM.biz)
2. خدمة الرسائل النصية القصيرة Grizzly (api.grizzlysms.com)
3. خدمة الرسائل النصية للأبطال (hero-sms.com)
4. TG-Ready / TG-Lion (tg-ready.net)
5. لوحة SMM (خدمات رشق المتابعين والتفاعلات)
"""

طلبات الاستيراد
استيراد json
وقت الاستيراد

# =====================================================================
# 1️⃣ FiveSIM (5SIM.net) - نظام REST API
# =====================================================================
فئة FiveSimProvider:
    def __init__(self, api_key, base_url="https://5sim.net/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "التفويض": f"حامل {api_key}",
            "قبول": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }

    دالة get_balance(self):
        """جلب رصيد حسابك في 5SIM"""
        يحاول:
            url = f"{self.base_url}/user/profile"
            res = requests.get(url, headers=self.headers, timeout=10)
            إذا كان رمز الحالة يساوي 200:
                data = res.json()
                return float(data.get("balance", 0.0))
        باستثناء الاستثناء كـ e:
            print(f"5SIM get_balance error: {e}")
        إرجاع 0.0

    def get_live_prices(self, product="whatsapp"):
        """جلب أسعار الدول والمخزون الحي المتاح"""
        for host in ["https://5sim.net", "https://5sim.biz"]:
            يحاول:
                url = f"{host}/v1/guest/prices?product={product}"
                res = requests.get(url, headers={"Accept": "application/json"}, timeout=8)
                إذا كان رمز الحالة يساوي 200:
                    data = res.json()
                    return data.get(product, {})
            باستثناء الاستثناء:
                يكمل
        يعود {}

    def buy_number(self, country_name, product="whatsapp", operator="any"):
        """شراء رقم فوري من 5SIM"""
        يحاول:
            url = f"{self.base_url}/user/buy/activation/{country_name}/{operator}/{product}"
            res = requests.get(url, headers=self.headers, timeout=15)
            إذا كان رمز الحالة يساوي 200:
                data = res.json()
                إرجاع صحيح، {
                    "id": str(data.get("id")),
                    "phone": str(data.get("phone", "")).replace("+", ""),
                    "created_at": data.get("created_at")
                }
            أعد القيمة False، res.text
        باستثناء الاستثناء كـ e:
            أرجع خطأ، str(e)

    def check_sms(self, order_id):
        """فحص وصول رمز التفعيل"""
        يحاول:
            url = f"{self.base_url}/user/check/{order_id}"
            res = requests.get(url, headers=self.headers, timeout=10)
            إذا كان رمز الحالة يساوي 200:
                data = res.json()
                sms_list = data.get("sms", [])
                إذا كانت قائمة الرسائل النصية القصيرة (sms_list) تحتوي على عدد أكبر من صفر (len(sms_list)):
                    return "OK", sms_list[0].get("code")
                الحالة = البيانات.get("الحالة", "")
                إذا كانت الحالة في ["ملغى"، "انتهت المهلة"]:
                    إرجاع "تم الإلغاء"، لا شيء
                إرجاع "انتظر"، لا شيء
        باستثناء الاستثناء كـ e:
            print(f"5SIM check_sms error: {e}")
        إرجاع "انتظر"، لا شيء

    def cancel_order(self, order_id):
        """ إلغاء الرقم واسترداد الرصيد"""
        يحاول:
            url = f"{self.base_url}/user/cancel/{order_id}"
            res = requests.get(url, headers=self.headers, timeout=10)
            return res.status_code == 200
        باستثناء الاستثناء:
            إرجاع خطأ


# =====================================================================
# 2️⃣ الاتصالات البروتوكولية SMS-Activate (Grizzly SMS, Hero SMS, وغيرها)
# =====================================================================
فئة موفر الرسائل النصية القياسية:
    def __init__(self, api_url, api_key, default_currency="USD"):
        self.api_url = api_url # مثال: https://api.grizzlysms.com/stubs/handler_api.php
        self.api_key = api_key
        self.default_currency = default_currency

    دالة get_balance(self):
        """جلب رصيد حسابك بالدولار أو الروبل"""
        المعلمات = {
            "api_key": self.api_key,
            "الإجراء": "الحصول على الرصيد"،
            "العملة": self.default_currency
        }
        يحاول:
            res = requests.get(self.api_url, params=params, timeout=10)
            إذا كان "ACCESS_BALANCE:" موجودًا في res.text:
                return float(res.text.split(":")[1])
        باستثناء الاستثناء كـ e:
            print(f"خطأ في استرجاع الرصيد عبر الرسائل النصية القصيرة: {e}")
        إرجاع 0.0

    def get_live_prices(self, service_code="wa"):
        """جلب أسعار الدول مباشرة من الموقع المورد"""
        المعلمات = {
            "api_key": self.api_key,
            "action": "getPrices",
            "الخدمة": رمز_الخدمة
        }
        يحاول:
            res = requests.get(self.api_url, params=params, timeout=10)
            إذا كان رمز الحالة يساوي 200 وكان نص الاستجابة يبدأ بـ "{"):
                return res.json()
        باستثناء الاستثناء كـ e:
            print(f"خطأ في جلب الأسعار المباشرة عبر الرسائل النصية القصيرة: {e}")
        يعود {}

    دالة شراء_الرقم(الذات، رمز_الخدمة، معرف_الدولة):
        """طلب وشراء رقم من السيرفر"""
        المعلمات = {
            "api_key": self.api_key,
            "الإجراء": "الحصول على الرقم"،
            "الخدمة": رمز_الخدمة،
            "الدولة": str(معرف_الدولة)
        }
        يحاول:
            res = requests.get(self.api_url, params=params, timeout=15)
            # النتيجة: ACCESS_NUMBER:ID:PHONE
            إذا كان "ACCESS_NUMBER:" موجودًا في res.text:
                parts = res.text.split(":")
                إرجاع صحيح، {
                    "id": parts[1],
                    "الهاتف": الأجزاء[2]
                }
            elif "NO_NUMBERS" in res.text:
                return False، "لا توجد أرقام حاليا لهذه الدولة في هذا السيرفر"
            elif "NO_BALANCE" in res.text:
                إرجاع خطأ، "رصيد السيرفر المزود غير بولس"
            آخر:
                أعد القيمة False، res.text
        باستثناء الاستثناء كـ e:
            أرجع خطأ، str(e)

    def check_sms(self, order_id):
        """فحص وصول كود الـ SMS"""
        المعلمات = {
            "api_key": self.api_key,
            "action": "getStatus",
            "id": str(order_id)
        }
        يحاول:
            res = requests.get(self.api_url, params=params, timeout=10)
            إذا كانت قيمة "STATUS_OK:" موجودة في res.text:
                return "OK", res.text.split(":")[1]
            elif "STATUS_WAIT_CODE" in res.text:
                إرجاع "انتظر"، لا شيء
            elif "STATUS_CANCEL" in res.text:
                إرجاع "تم الإلغاء"، لا شيء
        باستثناء الاستثناء كـ e:
            print(f"خطأ في فحص الرسائل النصية القصيرة القياسية: {e}")
        إرجاع "انتظر"، لا شيء

    def cancel_order(self, order_id):
        """， فض""""
        المعلمات = {
            "api_key": self.api_key,
            "الإجراء": "تعيين الحالة"
            "id": str(order_id),
            "الحالة": "8"
        }
        يحاول:
            res = requests.get(self.api_url, params=params, timeout=10)
            أعد "ACCESS_CANCEL" في res.text
        باستثناء الاستثناء:
            إرجاع خطأ


# =====================================================================
#3️⃣حسابات تيليجرام الشباب (TG-Ready / TG-Lion)
# =====================================================================
class TgReadyProvider:
    def __init__(self, api_key, base_url="https://tg-ready.net"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    دالة get_balance(self):
        """ فحص رصيدك في موقع الوكلاء"""
        يحاول:
            url = f"{self.base_url}/api/v1/balance"
            res = requests.get(url, params={"key": self.api_key}, timeout=8)
            إذا كان رمز الحالة يساوي 200:
                data = res.json()
                return float(data.get("balance", 0.0))
        باستثناء الاستثناء:
            يمر
        إرجاع 0.0

    def buy_account(self, country_code):
        """شراء حساب تيليجرام جاهز مع ملف Session / Tdata"""
        يحاول:
            url = f"{self.base_url}/api/v1/buy"
            params = {"key": self.api_key, "country": country_code}
            res = requests.post(url, data=params, timeout=15)
            إذا كان رمز الحالة يساوي 200:
                data = res.json()
                إذا كانت قيمة data.get("status") تساوي "success":
                    أعد القيمة True، البيانات
            أعد القيمة False، res.text
        باستثناء الاستثناء كـ e:
            أرجع خطأ، str(e)


# =====================================================================
# 4️⃣ دليل خدمات الرشق والمتابعين (SMM Panel API)
# =====================================================================
class SmmPanelProvider:
    def __init__(self, api_url, api_key):
        self.api_url = api_url
        self.api_key = api_key

    def add_order(self, service_id, target_link, quantity):
        """إرسال طلب رش جديد (متابعين، مشاهدات، تفاعلات)"""
        المعلمات = {
            "المفتاح": self.api_key,
            "إجراء": "إضافة"
            "الخدمة": str(معرف_الخدمة)،
            "link": str(target_link),
            "الكمية": int(الكمية)
        }
        يحاول:
            res = requests.post(self.api_url, data=params, timeout=15)
            إذا كان رمز الحالة يساوي 200:
                data = res.json()
                إذا كانت كلمة "order" موجودة في البيانات:
                    أرجع القيمة True، str(data["order"])
                وإذا كانت البيانات تحتوي على "خطأ":
                    أرجع خطأ، data["error"]
            أعد القيمة False، res.text
        باستثناء الاستثناء كـ e:
            أرجع خطأ، str(e)

    دالة get_order_status(self, order_id):
        """فحص وتحديث حالة طلب الرشق (المكتمل، النهائي، الحالة)"""
        المعلمات = {
            "المفتاح": self.api_key,
            "الإجراء": "الحالة"،
            "order": str(order_id)
        }
        يحاول:
            res = requests.post(self.api_url, data=params, timeout=10)
            إذا كان رمز الحالة يساوي 200:
                return res.json()
        باستثناء الاستثناء كـ e:
            print(f"SMM status error: {e}")
        يعود {}