# backend/app/services/emailer.py
import os
import logging
import httpx
from ..config import settings
logger.warning("[email] emailer path=%s", os.path.abspath(__file__))

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"


def _api_send_resend(to_email: str, subject: str, body: str) -> None:
    api_key = getattr(settings, "resend_api_key", None)  # 對應環境變數 RESEND_API_KEY
    from_email = (getattr(settings, "smtp_from_email", None) or "").strip()  # 你沿用原本變數名
    from_name = (getattr(settings, "smtp_from_name", None) or "A-kâu Shop").strip()

    if not api_key:
        logger.warning("[email] RESEND_API_KEY missing")
        return

    # Resend 多數情況會要求 From 網域已驗證；不要用假的預設值硬送
    if not from_email:
        logger.warning("[email] SMTP_FROM_EMAIL missing (used as From)")
        return

    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [to_email],
        "subject": subject,
        "text": body,
    }

    with httpx.Client(timeout=15) as client:
        r = client.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )

    if r.status_code >= 400:
        # 把 Resend 回的錯誤內容印出來，超好查（不會洩漏 API key）
        logger.warning("[email] resend error status=%s body=%s", r.status_code, r.text)
        r.raise_for_status()

    # 成功通常會回 {"id": "..."}
    try:
        data = r.json()
        logger.info("[email] resend ok id=%s to=%s", data.get("id"), to_email)
    except Exception:
        logger.info("[email] resend ok (non-json) to=%s", to_email)


def send_email(to_email: str, subject: str, body: str) -> None:
    # Railway variables 都是字串，這樣最耐操
    if int(getattr(settings, "enable_email_notify", 0) or 0) != 1:
        return
    if not to_email:
        return

    try:
        _api_send_resend(to_email, subject, body)
    except Exception:
        # ⚠️ 寄信失敗不能影響下單
        logger.exception("[email] send failed (ignored)")


def send_admin_email(subject: str, body: str) -> None:
    if int(getattr(settings, "enable_email_notify", 0) or 0) != 1:
        return
    admin_email = (getattr(settings, "admin_notify_email", None) or "").strip()
    if not admin_email:
        return
    send_email(admin_email, subject, body)
