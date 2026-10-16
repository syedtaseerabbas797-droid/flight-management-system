"""
app/utils/security.py
---------------------
Production-ready security utilities:
- Bcrypt password hashing & verification
- PyJWT Access & Refresh Token generation and verification
- PyOTP 2-Factor Authentication (TOTP Authenticator)
- Secure 6-digit OTP code generator
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt
import pyotp
from fastapi import HTTPException, status

# Configuration
_raw_key = os.getenv("APP_SECRET_KEY", "aeronexus-flight-mgmt-super-secret-key-2026")
if len(_raw_key) < 32:
    SECRET_KEY: str = f"{_raw_key}-aeronexus-flight-suite-ultra-secure-key-2026"
else:
    SECRET_KEY: str = _raw_key
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # 2 hours
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))  # 30 days



# ============================================================================
# Password Hashing & Verification (Bcrypt)
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using Bcrypt with a randomly generated salt.
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify that a plain-text password matches a Bcrypt hash in constant time.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# ============================================================================
# JWT Access & Refresh Token Utilities (PyJWT)
# ============================================================================

def create_access_token(
    subject: str,
    claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token containing subject (user_id / email) and custom claims.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    if claims:
        payload.update(claims)

    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    subject: str,
    claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a long-lived signed JWT refresh token for persistent browser sessions.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload: Dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }
    if claims:
        payload.update(claims)

    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token signature and expiration.
    Raises HTTPException(401) on expired or invalid token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid security token credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# Admin 2FA TOTP Utilities (PyOTP)
# ============================================================================

def generate_totp_secret() -> str:
    """
    Generate a random Base32 secret key for Google Authenticator / Authy.
    """
    return pyotp.random_base32()


def get_totp_provisioning_uri(secret: str, email: str) -> str:
    """
    Generate the `otpauth://` URI that can be rendered as a QR code in the Admin Console.
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="AeroNexus Aviation Operations")


def verify_totp_code(secret: str, code: str) -> bool:
    """
    Verify a 6-digit TOTP code with a ±1 window (30 seconds) tolerance for clock drift.
    """
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)


# ============================================================================
# 6-Digit Email OTP Generator
# ============================================================================

def generate_random_otp(digits: int = 6) -> str:
    """
    Generate a cryptographically secure numeric OTP string.
    """
    return "".join(secrets.choice("0123456789") for _ in range(digits))
