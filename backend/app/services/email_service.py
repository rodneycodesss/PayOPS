import asyncio
from email.message import EmailMessage
import logging
import smtplib
from typing import Optional
from fastapi import Request

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_client_base_url(request: Optional[Request] = None) -> str:
    """
    Extracts the origin / referer base URL from the incoming request or falls back to FRONTEND_URL.
    Ensures verification links automatically match the user's host/port (e.g. localhost, preview, or production).
    """
    if request:
        origin = request.headers.get("origin")
        if origin and origin != "null":
            return origin.rstrip("/")
        referer = request.headers.get("referer")
        if referer:
            parts = referer.split("/")
            if len(parts) >= 3:
                return f"{parts[0]}//{parts[2]}"
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        proto = request.headers.get("x-forwarded-proto") or ("https" if request.url.is_secure else "http")
        if host:
            return f"{proto}://{host}"
    return getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")


class EmailService:
    @staticmethod
    def _send_sync(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """Sends an email synchronously using Python's standard smtplib."""
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
            msg["To"] = to_email
            msg.set_content(text_body)
            msg.add_alternative(html_body, subtype="html")

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=3) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
                logger.info(f"[EMAIL DISPATCHED] Subject: '{subject}' to {to_email}")
                return True
        except Exception as e:
            logger.info(f"[EMAIL NOTICE] Subject: '{subject}' to {to_email} (SMTP server {settings.SMTP_HOST}:{settings.SMTP_PORT} inactive): {e}")
            return False

    @classmethod
    async def send_email(cls, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """Asynchronously dispatches an email via a threadpool without blocking the asyncio loop."""
        return await asyncio.to_thread(cls._send_sync, to_email, subject, html_body, text_body)

    @classmethod
    async def send_login_verification_link(
        cls,
        to_email: str,
        verification_link: str,
        otp_code: Optional[str] = None,
        is_2fa: bool = False,
    ) -> bool:
        """Dispatches an email containing the one-click login link and optional 6-digit 2FA code."""
        subject = "Rodstar PayOps - Two-Factor Authentication Login Link" if is_2fa else "Rodstar PayOps - Secure Sign-In Link"
        action_title = "Approve Login & Sign In" if is_2fa else "Sign In to Rodstar PayOps"
        description = (
            "We detected a sign-in attempt requiring two-factor authentication. Click the button below to approve this login session instantly:"
            if is_2fa else
            "Click the button below to sign in to your Rodstar PayOps account without entering a password:"
        )

        code_html = ""
        if otp_code:
            code_html = f"""
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Or enter this 6-digit security code</p>
                <span style="font-family: Menlo, Consolas, Monaco, monospace; font-size: 32px; letter-spacing: 0.25em; font-weight: 800; color: #080D18;">{otp_code}</span>
            </div>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080D18; margin: 0; padding: 32px 16px; color: #0f172a;">
          <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <!-- Header -->
            <div style="background-color: #080D18; padding: 24px 32px; border-bottom: 2px solid #16A6D9;">
              <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 800; letter-spacing: -0.02em;">
                RODSTAR <span style="color: #16A6D9;">PAYOPS</span>
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
                Intelligent Payment Operations & Ledger Automation
              </p>
            </div>
            <!-- Body -->
            <div style="padding: 32px;">
              <div style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 700; margin-bottom: 16px;">
                Secure Email Verification
              </div>
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #080D18;">{action_title}</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                {description}
              </p>
              
              <div style="text-align: center; margin: 28px 0;">
                <a href="{verification_link}" style="display: inline-block; background-color: #080D18; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(8, 13, 24, 0.25);">
                  {action_title} &rarr;
                </a>
              </div>

              {code_html}

              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; line-height: 1.5; color: #64748b;">
                <p style="margin: 0 0 8px 0;">
                  This link expires in <strong>15 minutes</strong> and can only be used once. If you did not initiate this login request, please disregard this email.
                </p>
                <p style="margin: 0; word-break: break-all; color: #94a3b8; font-size: 11px;">
                  Button not working? Copy & paste this URL into your browser: <br/>
                  <a href="{verification_link}" style="color: #16A6D9; text-decoration: underline;">{verification_link}</a>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""
RODSTAR PAYOPS
{action_title}

{description}

Click the following link to authenticate:
{verification_link}

{f"Or enter your 6-digit code: {otp_code}" if otp_code else ""}

This link expires in 15 minutes and can only be used once.
If you did not initiate this request, you can safely ignore this email.
        """

        return await cls.send_email(to_email, subject, html_body, text_body)
