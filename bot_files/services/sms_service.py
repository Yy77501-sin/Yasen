# =========================================================
# YasNum & VaultX - SMS Service Wrapper
# =========================================================

import providers
import catalog

def buy_sms_number(app_code, server_key="s1", country_code="ye"):
    """
    شراء رقم وهمي من سيرفر محدد
    """
    try:
        app_info = catalog.MAIN_APPS.get(app_code, catalog.SERVICES.get(app_code, {"fivesim_code": app_code, "short": app_code}))
        five_code = app_info.get("fivesim_code", app_code)
        
        # استدعاء المزود المركزي
        res = providers.buy_number_from_server(server_key, country_code, five_code)
        return res
    except Exception as e:
        return {"success": False, "error": f"حدث خطأ أثناء طلب الرقم: {e}"}

def check_sms_code(order_id, server_key="s1"):
    """
    فحص وصول كود التفعيل
    """
    try:
        res = providers.check_sms_from_server(server_key, order_id)
        return res
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

def cancel_sms_order(order_id, server_key="s1"):
    """
    إلغاء طلب الرقم واسترجاع المبلغ
    """
    try:
        res = providers.cancel_order_from_server(server_key, order_id)
        return res
    except Exception as e:
        return {"success": False, "error": str(e)}
