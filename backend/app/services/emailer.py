# backend/app/services/emailer.py
import logging
import smtplib
from email.mime.text import MIMEText
from email.header import Header
from ..config import settings

logger = logging.getLogger(__name__)

def _smtp_send(to_email: str, subject: str, body: str) -> None:
    host = settings.smtp_host
    port = settings.smtp_port
    username = settings.smtp_username
    password = settings.smtp_password
    from_email = settings.smtp_from_email or username

    if not host or not username or not password or not from_email:
        logger.warning(
            "[email] settings incomplete: host=%s port=%s username_set=%s password_set=%s from_email=%s enable=%s",
            bool(host),
            port,
            bool(username),
            bool(password),
            from_email,
            settings.enable_email_notify,
        )
        return

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = str(Header(subject, "utf-8"))
    msg["From"] = f"{settings.smtp_from_name} <{from_email}>"
    msg["To"] = to_email

    with smtplib.SMTP(host, port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.login(username, password)
        server.sendmail(from_email, [to_email], msg.as_string())

def send_email(to_email: str, subject: str, body: str) -> None:
    if settings.enable_email_notify != 1 or not to_email:
        return
    try:
        _smtp_send(to_email, subject, body)
        logger.info("[email] sent to=%s subject=%s", to_email, subject)
    except Exception:
        logger.exception("[email] send failed (ignored) to=%s subject=%s", to_email, subject)

def send_admin_email(subject: str, body: str) -> None:
    """寄給老闆（沿用你原本設計）"""
    if settings.enable_email_notify != 1:
        return
    if not settings.admin_notify_email:
        return
    send_email(settings.admin_notify_email, subject, body)
