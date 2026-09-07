# -*- coding: utf-8 -*-
"""
=============================================================================
YasNum - Telegram Ready Accounts Providers Engine (محرك مزودي حسابات تيليجرام الجاهزة)
=============================================================================
هذا الملف مخصص حصرياً لإدارة والاتصال بمواقع ومزودي حسابات تيليجرام الجاهزة (TG Ready Accounts):
1. فحص الاتصال بالـ API والرصيد اللحظي.
2. جلب قائمة الدول المتاحة وأسعارها والمخزون الحي.
3. شراء واستلام الحسابات الفورية (رقم الهاتف + كود التفعيل + ملف الجلسة .session / Tdata + رمز 2FA).
4. إدارة التبديل وإضافة مزودين جدد بسهولة.
=============================================================================
"""

import requests
import json
import time

# =====================================================================
# 1️⃣ كلاس المزود العام لحسابات تيليجرام الجاهزة (Telegram Ready Provider)
# =====================================================================
class TgReadyProvider:
    def __init__(self, provider_id, name, base_url, api_key, currency="USD", exchange_rate=1.0):
        self.provider_id = str(provider_id)
        self.name = name
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.api_key = api_key.strip() if api_key else ""
        self.currency = currency.upper()
        self.exchange_rate = float(exchange_rate)
        self.timeout = 15

    def get_headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}" if len(self.api_key) > 30 else self.api_key,
            "Accept": "application/json",
            "User-Agent": "YasNum-Bot/2.0 (Telegram-Ready-Accounts)"
        }

    def get_balance(self):
        """جلب رصيد حسابك في الموقع المزود بالدولار"""
        if not self.base_url or not self.api_key:
            return 0.0, "المفتاح أو الرابط غير مضبوط"

        # محاولة طلبات الـ Balance القياسية
        endpoints = [
            f"{self.base_url}/api/v1/balance?key={self.api_key}",
            f"{self.base_url}/api/balance?token={self.api_key}",
            f"{self.base_url}/api/user/balance",
            f"{self.base_url}/stubs/handler_api.php?api_key={self.api_key}&action=getBalance"
        ]

        for url in endpoints:
            try:
                res = requests.get(url, headers=self.get_headers(), timeout=self.timeout)
                if res.status_code == 200:
                    text = res.text.strip()
                    if "ACCESS_BALANCE:" in text:
                        bal = float(text.split(":")[1])
                        return bal, "OK"
                    try:
                        data = res.json()
                        if "balance" in data:
                            return float(data["balance"]), "OK"
                        if "data" in data and isinstance(data["data"], dict) and "balance" in data["data"]:
                            return float(data["data"]["balance"]), "OK"
                    except Exception:
                        pass
            except Exception as e:
                continue

        return 0.0, "تعذر الاتصال بالمزود"

    def get_stock(self):
        """جلب قائمة الدول المتاحة ومخزونها وأسعارها"""
        if not self.base_url or not self.api_key:
            return {}

        endpoints = [
            f"{self.base_url}/api/v1/stock?key={self.api_key}",
            f"{self.base_url}/api/v1/prices?key={self.api_key}",
            f"{self.base_url}/api/stock",
            f"{self.base_url}/api/services?service=telegram"
        ]

        for url in endpoints:
            try:
                res = requests.get(url, headers=self.get_headers(), timeout=self.timeout)
                if res.status_code == 200:
                    try:
                        data = res.json()
                        if isinstance(data, dict):
                            return data.get("countries", data.get("stock", data))
                        elif isinstance(data, list):
                            return {item.get("code", str(i)): item for i, item in enumerate(data)}
                    except Exception:
                        pass
            except Exception:
                continue

        return {}

    def buy_account(self, country_code, account_type="session"):
        """
        شراء حساب تيليجرام جاهز واستلام البيانات:
        - phone: رقم الهاتف
        - code: كود الدخول إن وجد
        - password_2fa: رمز التحقق بخطوتين إن وجد
        - session_file: رابط أو نص ملف الجلسة .session
        - tdata_url: رابط تحميل مجلد Tdata مضغوط
        """
        if not self.base_url or not self.api_key:
            return False, "المزود غير مهيأ بمفتاح ورابط صالحين"

        payload = {
            "key": self.api_key,
            "api_key": self.api_key,
            "token": self.api_key,
            "country": str(country_code).lower(),
            "service": "telegram",
            "type": account_type
        }

        endpoints = [
            f"{self.base_url}/api/v1/buy",
            f"{self.base_url}/api/buy",
            f"{self.base_url}/api/order/create"
        ]

        for url in endpoints:
            try:
                res = requests.post(url, data=payload, headers=self.get_headers(), timeout=20)
                if res.status_code == 200:
                    try:
                        data = res.json()
                        if data.get("status") in ["success", "OK", True] or "phone" in data or "order_id" in data:
                            return True, {
                                "order_id": str(data.get("order_id", data.get("id", int(time.time())))),
                                "phone": str(data.get("phone", "")),
                                "code": str(data.get("code", "تم إرساله داخل الجلسة")),
                                "password_2fa": str(data.get("password_2fa", data.get("2fa", "لا يوجد (مباشر)"))),
                                "session_file": data.get("session_file", data.get("session", "")),
                                "tdata_url": data.get("tdata_url", data.get("tdata", "")),
                                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                            }
                        if "error" in data:
                            return False, data.get("error", "فشلت عملية الشراء من المزود")
                    except Exception:
                        pass
            except Exception as e:
                continue

        return False, "تعذر إتمام الشراء من السيرفر المزود حالياً."


# =====================================================================
# 2️⃣ مدير المزودين (Telegram Ready Providers Registry)
# =====================================================================
class TgProvidersRegistry:
    def __init__(self):
        self.providers = {}

    def register_provider(self, provider_id, name, base_url, api_key, currency="USD", exchange_rate=1.0):
        provider = TgReadyProvider(
            provider_id=provider_id,
            name=name,
            base_url=base_url,
            api_key=api_key,
            currency=currency,
            exchange_rate=exchange_rate
        )
        self.providers[str(provider_id)] = provider
        return provider

    def get_provider(self, provider_id):
        return self.providers.get(str(provider_id))

    def get_all_providers(self):
        return list(self.providers.values())

    def remove_provider(self, provider_id):
        if str(provider_id) in self.providers:
            del self.providers[str(provider_id)]
            return True
        return False


# النسخة العامة لمدير المزودين
tg_registry = TgProvidersRegistry()