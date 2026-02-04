import smtplib
import logging
from email.mime.text import MIMEText
from email.header import Header
from ..config import settings


def send_email(to_email: str, subject: str, body: str) -> None:
    """寄給任意收件者（買家/老闆都可用）"""
    if settings.enable_email_notify != 1:
        return
    if not to_email:
        return
    try:
        _smtp_send(to_email, subject, body)
    except Exception as e:
        # Railway / 雲端環境可能擋 SMTP；demo 先不要讓它影響下單
        logger.exception("[email] send failed (ignored): %s", e)
        return

def send_email(to_email: str, subject: str, body: str) -> None:
    """寄給任意收件者（買家/老闆都可用）"""
    if settings.enable_email_notify != 1:
        return
    if not to_email:
        return
    _smtp_send(to_email, subject, body)


def send_admin_email(subject: str, body: str) -> None:
    """寄給老闆（沿用你原本設計）"""
    if settings.enable_email_notify != 1:
        return
    if not settings.admin_notify_email:
        return
    send_email(settings.admin_notify_email, subject, body)