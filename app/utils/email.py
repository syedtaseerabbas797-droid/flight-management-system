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

logger = logging.getLogger(__name__)


def send_transactional_email(
    *,
    to_email: str,
    subject: str,
    body: str,
) -> None:
    """
    Send a plain-text transactional email via Gmail SMTP (STARTTLS).

    Designed to be called inside FastAPI BackgroundTasks so it runs in a
    thread pool without blocking the event loop or the HTTP response.

    All SMTP errors are caught and logged — a failed email never crashes
    the application or rolls back the database transaction that triggered it.

    Parameters
    ----------
    to_email : str
        Recipient email address.
    subject : str
        Email subject line.
    body : str
        Plain-text email body.
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
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [to_email], msg.as_string())

        logger.info("Email sent to %s | subject: %r", to_email, subject)

    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP authentication failed — check SMTP_USER / SMTP_PASSWORD. "
            "Email not sent to %s.",
            to_email,
        )
    except smtplib.SMTPException as exc:
        logger.error("SMTPException sending to %s: %s", to_email, exc)
    except OSError as exc:
        # Covers connection refused, timeout, DNS failure, etc.
        logger.error(
            "Network error reaching %s:%s — email to %s not sent: %s",
            smtp_host,
            smtp_port,
            to_email,
            exc,
        )
