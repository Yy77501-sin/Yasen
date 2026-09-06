# -*- coding: utf-8 -*-
"""
ملف مزودات خدمات الأرقام والرشق (SMS & SMM API Providers)
يحتوي هذا الملف على جميع كلاسات ودوال الاتصال بالمواقع المزودة:
1. FiveSIM (5SIM.net / 5SIM.biz)
2. Grizzly SMS (api.grizzlysms.com)
3. Hero SMS (hero-sms.com)
4. TG-Ready / TG-Lion (tg-ready.net)
5. SMM Panel (خدمات رشق المتابعين والتفاعلات)
"""

import requests
import json
import time

# =====================================================================
# 1️⃣ مزود FiveSIM (5SIM.net) - نظام REST API
# =====================================================================
class FiveSimProvider:
    def __init__(self, api_key, base_url="https://5sim.net/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }

    def get_balance(self):
        """جلب رصيد حسابك في 5SIM"""
        try:
            url = f"{self.base_url}/user/profile"
            res = requests.get(url, headers=self.headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return float(data.get("balance", 0.0))
        except Exception as e:
            print(f"5SIM get_balance error: {e}")
        return 0.0

    def get_live_prices(self, product="whatsapp"):
        """جلب أسعار الدول والمخزون الحي المتاح"""
        for host in ["https://5sim.net", "https://5sim.biz"]:
            try:
                url = f"{host}/v1/guest/prices?product={product}"
                res = requests.get(url, headers={"Accept": "application/json"}, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    return data.get(product, {})
            except Exception:
                continue
        return {}

    def buy_number(self, country_name, product="whatsapp", operator="any"):
        """شراء رقم فوري من 5SIM"""
        try:
            url = f"{self.base_url}/user/buy/activation/{country_name}/{operator}/{product}"
            res = requests.get(url, headers=self.headers, timeout=15)
            if res.status_code == 200:
                data = res.json()
                return True, {
                    "id": str(data.get("id")),
                    "phone": str(data.get("phone", "")).replace("+", ""),
                    "created_at": data.get("created_at")
                }
            return False, res.text
        except Exception as e:
            return False, str(e)

    def check_sms(self, order_id):
        """فحص وصول كود التفعيل"""
        try:
            url = f"{self.base_url}/user/check/{order_id}"
            res = requests.get(url, headers=self.headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                sms_list = data.get("sms", [])
                if sms_list and len(sms_list) > 0:
                    return "OK", sms_list[0].get("code")
                status = data.get("status", "")
                if status in ["CANCELED", "TIMEOUT"]:
                    return "CANCELED", None
                return "WAIT", None
        except Exception as e:
            print(f"5SIM check_sms error: {e}")
        return "WAIT", None

    def cancel_order(self, order_id):
        """إلغاء الرقم واسترداد الرصيد"""
        try:
            url = f"{self.base_url}/user/cancel/{order_id}"
            res = requests.get(url, headers=self.headers, timeout=10)
            return res.status_code == 200
        except Exception:
            return False


# =====================================================================
# 2️⃣ مزودات بروتوكول SMS-Activate (Grizzly SMS, Hero SMS, وغيرها)
# =====================================================================
class StandardSmsProvider:
    def __init__(self, api_url, api_key, default_currency="USD"):
        self.api_url = api_url  # مثال: https://api.grizzlysms.com/stubs/handler_api.php
        self.api_key = api_key
        self.default_currency = default_currency

    def get_balance(self):
        """جلب رصيد حسابك بالدولار أو الروبل"""
        params = {
            "api_key": self.api_key,
            "action": "getBalance",
            "currency": self.default_currency
        }
        try:
            res = requests.get(self.api_url, params=params, timeout=10)
            if "ACCESS_BALANCE:" in res.text:
                return float(res.text.split(":")[1])
        except Exception as e:
            print(f"Standard SMS get_balance error: {e}")
        return 0.0

    def get_live_prices(self, service_code="wa"):
        """جلب أسعار الدول المباشرة من الموقع المزود"""
        params = {
            "api_key": self.api_key,
            "action": "getPrices",
            "service": service_code
        }
        try:
            res = requests.get(self.api_url, params=params, timeout=10)
            if res.status_code == 200 and res.text.startswith("{"):
                return res.json()
        except Exception as e:
            print(f"Standard SMS get_live_prices error: {e}")
        return {}

    def buy_number(self, service_code, country_id):
        """طلب وشراء رقم من السيرفر"""
        params = {
            "api_key": self.api_key,
            "action": "getNumber",
            "service": service_code,
            "country": str(country_id)
        }
        try:
            res = requests.get(self.api_url, params=params, timeout=15)
            # النتيجة: ACCESS_NUMBER:ID:PHONE
            if "ACCESS_NUMBER:" in res.text:
                parts = res.text.split(":")
                return True, {
                    "id": parts[1],
                    "phone": parts[2]
                }
            elif "NO_NUMBERS" in res.text:
                return False, "لا توجد أرقام متوفرة حالياً لهذه الدولة في هذا السيرفر"
            elif "NO_BALANCE" in res.text:
                return False, "رصيد السيرفر المزود غير كافٍ"
            else:
                return False, res.text
        except Exception as e:
            return False, str(e)

    def check_sms(self, order_id):
        """فحص وصول كود الـ SMS"""
        params = {
            "api_key": self.api_key,
            "action": "getStatus",
            "id": str(order_id)
        }
        try:
            res = requests.get(self.api_url, params=params, timeout=10)
            if "STATUS_OK:" in res.text:
                return "OK", res.text.split(":")[1]
            elif "STATUS_WAIT_CODE" in res.text:
                return "WAIT", None
            elif "STATUS_CANCEL" in res.text:
                return "CANCELED", None
        except Exception as e:
            print(f"Standard SMS check_sms error: {e}")
        return "WAIT", None

    def cancel_order(self, order_id):
        """إلغاء الطلب"""
        params = {
            "api_key": self.api_key,
            "action": "setStatus",
            "id": str(order_id),
            "status": "8"
        }
        try:
            res = requests.get(self.api_url, params=params, timeout=10)
            return "ACCESS_CANCEL" in res.text
        except Exception:
            return False


# =====================================================================
# 3️⃣ مزود حسابات تيليجرام الجاهزة (TG-Ready / TG-Lion)
# =====================================================================
class TgReadyProvider:
    def __init__(self, api_key, base_url="https://tg-ready.net"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def get_balance(self):
        """فحص رصيد حسابك في موقع الحسابات الجاهزة"""
        try:
            url = f"{self.base_url}/api/v1/balance"
            res = requests.get(url, params={"key": self.api_key}, timeout=8)
            if res.status_code == 200:
                data = res.json()
                return float(data.get("balance", 0.0))
        except Exception:
            pass
        return 0.0

    def buy_account(self, country_code):
        """شراء حساب تيليجرام جاهز مع ملف Session / Tdata"""
        try:
            url = f"{self.base_url}/api/v1/buy"
            params = {"key": self.api_key, "country": country_code}
            res = requests.post(url, data=params, timeout=15)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "success":
                    return True, data
            return False, res.text
        except Exception as e:
            return False, str(e)


# =====================================================================
# 4️⃣ مزود خدمات الرشق والمتابعين (SMM Panel API)
# =====================================================================
class SmmPanelProvider:
    def __init__(self, api_url, api_key):
        self.api_url = api_url
        self.api_key = api_key

    def add_order(self, service_id, target_link, quantity):
        """إرسال طلب رشق جديد (متابعين، مشاهدات، تفاعلات)"""
        params = {
            "key": self.api_key,
            "action": "add",
            "service": str(service_id),
            "link": str(target_link),
            "quantity": int(quantity)
        }
        try:
            res = requests.post(self.api_url, data=params, timeout=15)
            if res.status_code == 200:
                data = res.json()
                if "order" in data:
                    return True, str(data["order"])
                elif "error" in data:
                    return False, data["error"]
            return False, res.text
        except Exception as e:
            return False, str(e)

    def get_order_status(self, order_id):
        """فحص وتحديث حالة طلب الرشق (المكتمل، المتبقي، الحالة)"""
        params = {
            "key": self.api_key,
            "action": "status",
            "order": str(order_id)
        }
        try:
            res = requests.post(self.api_url, data=params, timeout=10)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"SMM status error: {e}")
        return {}