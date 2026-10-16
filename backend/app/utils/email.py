"""
app/utils/email.py
------------------
Transactional email sending via Gmail SMTP (TLS on port 587).

Configuration
-------------
Set these environment variables (or add to your .env file):

    SMTP_HOST      SMTP server hostname  (default: smtp.gmail.com)
    SMTP_PORT      SMTP server port      (default: 587)
    SMTP_USER      Gmail address used to send mail
    SMTP_PASSWORD  Gmail App Password (NOT your account password)

Gmail requires an App Password when 2-Step Verification is enabled:
    https://myaccount.google.com/apppasswords

Usage
-----
This module is intentionally synchronous (smtplib) because FastAPI's
BackgroundTasks runner executes tasks in a thread pool — calling a
synchronous function here is the correct, non-blocking pattern.

To schedule a send from a route:

    background_tasks.add_task(
        send_transactional_email,
        to_email="passenger@example.com",
        subject="Your booking is confirmed",
        body="Dear Alice, ...",
    )
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

logger = logging.getLogger(__name__)


def send_transactional_email(
    *,
    to_email: str,
    subject: str,
    body: str,
    html_body: str | None = None,
) -> bool:
    """
    Send a transactional email via Gmail SMTP (STARTTLS).
    Supports plain-text and optional rich HTML multipart alternative.

    Designed to be called directly or inside FastAPI BackgroundTasks so it
    runs in a thread pool without blocking the event loop or HTTP response.

    Parameters
    ----------
    to_email : str
        Recipient email address.
    subject : str
        Email subject line.
    body : str
        Plain-text email body fallback.
    html_body : str, optional
        Rich HTML formatted email content.

    Returns
    -------
    bool
        True if email was successfully dispatched, False otherwise.
    """
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str | None = os.getenv("SMTP_USER")
    smtp_password: str | None = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        logger.warning(
            "SMTP_USER or SMTP_PASSWORD not configured — skipping email to %s",
            to_email,
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"AeroNexus Flight Suite <{smtp_user}>"
    msg["To"] = to_email

    # Plain text version (fallback)
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # HTML version if provided
    if html_body:
        msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [to_email], msg.as_string())

        logger.info("Email successfully sent to %s | subject: %r", to_email, subject)
        return True

    except smtplib.SMTPAuthenticationError as exc:
        logger.error(
            "SMTP authentication failed — check SMTP_USER / SMTP_PASSWORD. "
            "Email not sent to %s. Details: %s",
            to_email,
            exc,
        )
        return False
    except smtplib.SMTPException as exc:
        logger.error("SMTPException sending to %s: %s", to_email, exc)
        return False
    except OSError as exc:
        logger.error(
            "Network error reaching %s:%s — email to %s not sent: %s",
            smtp_host,
            smtp_port,
            to_email,
            exc,
        )
        return False


def send_otp_email(
    to_email: str,
    otp_code: str,
    recipient_name: str = "Valued Passenger",
) -> bool:
    """
    Send an airline-branded, secure 6-digit OTP verification email for account
    registration or 2FA login.
    """
    # Always log clearly to console for local testing and developer velocity
    print(f"\n============================================================")
    print(f">> [AERONEXUS OTP DISPATCH] -> {to_email}")
    print(f"  Recipient: {recipient_name}")
    print(f"  OTP Code:  [{otp_code}] (Valid for 10 minutes)")
    print(f"============================================================\n", flush=True)


    subject = f"AeroNexus Verification Code: {otp_code}"

    plain_text = (
        f"Dear {recipient_name},\n\n"
        f"Your AeroNexus Flight Suite one-time verification passcode is: {otp_code}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"For your security, never share this code with anyone.\n\n"
        f"If you did not request this verification, please ignore this email.\n\n"
        f"— AeroNexus Operations & Flight Security"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AeroNexus Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B132B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B132B; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.35);">
          <!-- Top Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0A192F 0%, #172554 100%); padding: 32px 30px; text-align: center; border-bottom: 3px solid #0284C7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(2, 132, 199, 0.18); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 6px 14px; margin-bottom: 12px;">
                      <span style="color: #38BDF8; font-size: 11px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase;">
                        AIRLINE OPERATIONS &bull; SECURITY
                      </span>
                    </div>
                    <h1 style="color: #F8FAFC; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 1px;">
                      AeroNexus
                    </h1>
                    <p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0 0; letter-spacing: 0.5px;">
                      Global Flight Management & Operations Suite
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; background-color: #FFFFFF;">
              <h2 style="color: #0F172A; font-size: 18px; font-weight: 700; margin: 0 0 14px 0;">
                One-Time Verification Passcode
              </h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Dear <strong>{recipient_name}</strong>,<br>
                We received a request to verify your email address for your AeroNexus Flight account. Please use the verification passcode below to complete authentication:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0 28px 0;">
                <tr>
                  <td align="center" style="background: linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%); border: 2px dashed #0284C7; border-radius: 12px; padding: 26px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #0369A1; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">
                      Your 6-Digit Passcode
                    </div>
                    <div style="font-family: 'SF Mono', 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #0A192F; padding-left: 10px;">
                      {otp_code}
                    </div>
                    <div style="font-size: 12px; color: #0284C7; font-weight: 600; margin-top: 12px;">
                      ⏱ Expires in 10 minutes (600 seconds)
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Information Notice -->
              <div style="background-color: #F8FAFC; border-left: 4px solid #F59E0B; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                  <strong style="color: #D97706;">Security Notice:</strong>
                  AeroNexus personnel will never ask you for this passcode via phone, email, or SMS. If you did not initiate this request, you can safely ignore this email.
                </p>
              </div>

              <p style="color: #64748B; font-size: 13px; line-height: 1.6; margin: 0;">
                Thank you for choosing AeroNexus. Smooth skies ahead!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #94A3B8; font-size: 11px; margin: 0 0 6px 0;">
                &copy; 2026 AeroNexus Aviation Technologies Inc. All rights reserved.
              </p>
              <p style="color: #94A3B8; font-size: 11px; margin: 0;">
                This is an automated operational transmission. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return send_transactional_email(
        to_email=to_email,
        subject=subject,
        body=plain_text,
        html_body=html_content,
    )

