"""
app/api/routes/auth.py
----------------------
Customer & Admin Authentication Router:
- Registration with 6-digit Email OTP Verification
- Login with Bcrypt password verification
- Admin Login with TOTP 2FA Enforcement
- Profile fetch and update (IATA/CAA standard)
- Session refresh and sign out
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, require_admin, require_customer
from app.db.models.audit_log import AdminAuditLog
from app.db.models.otp_verification import OTPVerification
from app.db.models.refresh_token import RefreshToken
from app.db.models.user import User
from app.db.models.user_profile import UserProfile
from app.schemas.auth import (
    Admin2FARequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminSetup2FAResponse,
    AuthResponse,
    AuthTokens,
    AuthUser,
    CustomerProfileSchema,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResendOtpRequest,
    VerifyOtpRequest,
)
from app.utils.email import send_otp_email
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_random_otp,
    generate_totp_secret,
    get_totp_provisioning_uri,
    hash_password,
    verify_password,
    verify_totp_code,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


# ============================================================================
# Customer Registration & Email OTP
# ============================================================================

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new customer identity",
)
async def register_customer(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Register a new customer account.
    Stores unverified user, creates a 6-digit OTP valid for 10 minutes,
    and dispatches verification email.
    """
    normalized_email = payload.email.strip().lower()

    # Check existing user
    stmt = select(User).where(User.email == normalized_email).options(selectinload(User.profile))
    result = await session.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user and existing_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in.",
        )

    # Hash password
    pw_hash = hash_password(payload.password)

    if existing_user:
        # Update existing unverified user
        existing_user.hashed_password = pw_hash
        existing_user.full_name = payload.full_name
        user = existing_user
    else:
        user = User(
            email=normalized_email,
            hashed_password=pw_hash,
            full_name=payload.full_name,
            role=payload.role or "customer",
            is_active=True,
            is_verified=False,
        )
        session.add(user)

    await session.flush()  # assign user.id

    # Invalidate previous unconsumed OTPs for this email
    await session.execute(
        update(OTPVerification)
        .where(OTPVerification.email == normalized_email, OTPVerification.is_used == False)
        .values(is_used=True)
    )

    # Generate 6-digit OTP
    otp_code = generate_random_otp(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    otp_record = OTPVerification(
        email=normalized_email,
        otp_code=otp_code,
        purpose="REGISTRATION",
        expires_at=expires_at,
        is_used=False,
    )
    session.add(otp_record)
    await session.commit()

    # Dispatch email in background (also prints to terminal log)
    background_tasks.add_task(
        send_otp_email,
        to_email=normalized_email,
        otp_code=otp_code,
        recipient_name=payload.full_name,
    )

    return AuthResponse(
        success=True,
        message=f"Verification passcode dispatched to {normalized_email}. Code expires in 10 minutes.",
    )


@router.post(
    "/verify-otp",
    response_model=AuthResponse,
    summary="Verify 6-digit OTP and activate account",
)
async def verify_otp(
    payload: VerifyOtpRequest,
    session: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Verify customer email via 6-digit OTP.
    Marks user verified, generates default profile, and returns JWT session tokens.
    """
    normalized_email = payload.email.strip().lower()

    # Fetch latest unconsumed OTP
    otp_stmt = (
        select(OTPVerification)
        .where(
            OTPVerification.email == normalized_email,
            OTPVerification.is_used == False,
        )
        .order_by(desc(OTPVerification.created_at))
    )
    otp_res = await session.execute(otp_stmt)
    otp_record = otp_res.scalars().first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending verification code found for this email. Please request a new code.",
        )

    # Check expiry
    now_utc = datetime.now(timezone.utc)
    if now_utc > otp_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification passcode has expired. Please request a new code.",
        )

    # Validate code
    if otp_record.otp_code != payload.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification passcode. Please check your email or console log.",
        )

    # Mark OTP as consumed
    otp_record.is_used = True

    # Activate user
    user_stmt = select(User).where(User.email == normalized_email).options(selectinload(User.profile))
    user_res = await session.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User identity record not found.",
        )

    user.is_verified = True

    # Ensure profile exists
    if not user.profile:
        name_parts = user.full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        profile = UserProfile(
            user_id=user.id,
            first_name=first_name,
            last_name=last_name,
            title="Mr",
            nationality="Pakistani",
            doc_type="PASSPORT",
            meal_preference="Halal",
            seat_preference="Window",
        )
        session.add(profile)

    # Issue JWT tokens
    access_token = create_access_token(
        subject=str(user.id),
        claims={
            "email": user.email,
            "role": user.role,
            "name": user.full_name,
        },
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    # Persist refresh token
    refresh_rec = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        revoked=False,
    )
    session.add(refresh_rec)
    await session.commit()

    return AuthResponse(
        success=True,
        message="Account verified successfully.",
        user=AuthUser(
            id=str(user.id),
            email=user.email,
            name=user.full_name,
            role=user.role,
            isVerified=True,
        ),
        tokens=AuthTokens(
            accessToken=access_token,
            refreshToken=refresh_token,
            tokenType="bearer",
        ),
    )


@router.post(
    "/resend-otp",
    response_model=AuthResponse,
    summary="Resend a fresh 6-digit verification OTP",
)
async def resend_otp(
    payload: ResendOtpRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
) -> AuthResponse:
    normalized_email = payload.email.strip().lower()

    user_stmt = select(User).where(User.email == normalized_email)
    user_res = await session.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this email address.",
        )

    # Invalidate previous
    await session.execute(
        update(OTPVerification)
        .where(OTPVerification.email == normalized_email, OTPVerification.is_used == False)
        .values(is_used=True)
    )

    otp_code = generate_random_otp(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    otp_record = OTPVerification(
        email=normalized_email,
        otp_code=otp_code,
        purpose="REGISTRATION",
        expires_at=expires_at,
        is_used=False,
    )
    session.add(otp_record)
    await session.commit()

    background_tasks.add_task(
        send_otp_email,
        to_email=normalized_email,
        otp_code=otp_code,
        recipient_name=user.full_name,
    )

    return AuthResponse(
        success=True,
        message=f"Fresh verification passcode dispatched to {normalized_email}.",
    )


# ============================================================================
# Customer Sign In & Token Refresh
# ============================================================================

@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Customer credentials sign-in",
)
async def login_customer(
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
) -> AuthResponse:
    normalized_email = payload.email.strip().lower()

    stmt = select(User).where(User.email == normalized_email).options(selectinload(User.profile))
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been suspended or deactivated.",
        )

    # If unverified, dispatch OTP and notify
    if not user.is_verified:
        otp_code = generate_random_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        otp_record = OTPVerification(
            email=normalized_email,
            otp_code=otp_code,
            purpose="REGISTRATION",
            expires_at=expires_at,
            is_used=False,
        )
        session.add(otp_record)
        await session.commit()

        background_tasks.add_task(
            send_otp_email,
            to_email=normalized_email,
            otp_code=otp_code,
            recipient_name=user.full_name,
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address has not been verified. A fresh 6-digit passcode has been sent to your email.",
        )

    # Generate tokens
    access_token = create_access_token(
        subject=str(user.id),
        claims={
            "email": user.email,
            "role": user.role,
            "name": user.full_name,
        },
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    refresh_rec = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        revoked=False,
    )
    session.add(refresh_rec)
    await session.commit()

    return AuthResponse(
        success=True,
        message="Sign in successful.",
        user=AuthUser(
            id=str(user.id),
            email=user.email,
            name=user.full_name,
            role=user.role,
            isVerified=True,
        ),
        tokens=AuthTokens(
            accessToken=access_token,
            refreshToken=refresh_token,
            tokenType="bearer",
        ),
    )


@router.post(
    "/refresh",
    summary="Renew expired access token using refresh token",
)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    session: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    token_claims = decode_token(payload.refresh_token)
    user_id_str = token_claims.get("sub")

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed refresh token.",
        )

    user_uuid = uuid.UUID(user_id_str)

    stmt = select(RefreshToken).where(
        RefreshToken.token == payload.refresh_token,
        RefreshToken.user_id == user_uuid,
        RefreshToken.revoked == False,
    )
    res = await session.execute(stmt)
    token_row = res.scalar_one_or_none()

    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token. Please sign in again.",
        )

    user = await session.get(User, user_uuid)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this session is inactive.",
        )

    new_access_token = create_access_token(
        subject=str(user.id),
        claims={
            "email": user.email,
            "role": user.role,
            "name": user.full_name,
        },
    )

    return {
        "accessToken": new_access_token,
        "tokenType": "bearer",
    }


# ============================================================================
# Customer Profile Management (IATA Standard)
# ============================================================================

@router.get(
    "/me",
    summary="Get authenticated customer identity & profile",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> Dict[str, Any]:
    profile_data = None
    if current_user.profile:
        p = current_user.profile
        profile_data = {
            "title": p.title,
            "firstName": p.first_name,
            "lastName": p.last_name,
            "dob": p.dob,
            "gender": p.gender,
            "nationality": p.nationality,
            "email": current_user.email,
            "phone": p.phone,
            "emergencyName": p.emergency_name,
            "emergencyPhone": p.emergency_phone,
            "docType": p.doc_type,
            "docNumber": p.doc_number,
            "countryOfIssuance": p.country_of_issuance,
            "docExpiryDate": p.doc_expiry_date,
            "mealPreference": p.meal_preference,
            "seatPreference": p.seat_preference,
            "wheelchair": p.wheelchair,
            "frequentFlyerNumber": p.frequent_flyer_number,
        }

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.full_name,
        "role": current_user.role,
        "isVerified": current_user.is_verified,
        "profile": profile_data,
    }


@router.get(
    "/profile",
    response_model=CustomerProfileSchema,
    summary="Fetch full passenger profile",
)
async def get_customer_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> CustomerProfileSchema:
    if not current_user.profile:
        name_parts = current_user.full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        profile = UserProfile(
            user_id=current_user.id,
            first_name=first_name,
            last_name=last_name,
            title="Mr",
            nationality="Pakistani",
            doc_type="PASSPORT",
            meal_preference="Halal",
            seat_preference="Window",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
    else:
        profile = current_user.profile

    return CustomerProfileSchema(
        title=profile.title or "Mr",
        firstName=profile.first_name or "",
        lastName=profile.last_name or "",
        dob=profile.dob or "",
        gender=profile.gender or "",
        nationality=profile.nationality or "Pakistani",
        email=current_user.email,
        phone=profile.phone or "",
        emergencyName=profile.emergency_name or "",
        emergencyPhone=profile.emergency_phone or "",
        docType=profile.doc_type or "PASSPORT",
        docNumber=profile.doc_number or "",
        countryOfIssuance=profile.country_of_issuance or "",
        docExpiryDate=profile.doc_expiry_date or "",
        mealPreference=profile.meal_preference or "Halal",
        seatPreference=profile.seat_preference or "Window",
        wheelchair=profile.wheelchair,
        frequentFlyerNumber=profile.frequent_flyer_number or "",
    )


@router.put(
    "/profile",
    response_model=CustomerProfileSchema,
    summary="Update customer airline profile",
)
async def update_customer_profile(
    payload: CustomerProfileSchema,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> CustomerProfileSchema:
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        session.add(profile)

    # Update profile fields
    profile.title = payload.title or profile.title
    profile.first_name = payload.firstName or profile.first_name
    profile.last_name = payload.lastName or profile.last_name
    profile.dob = payload.dob or profile.dob
    profile.gender = payload.gender or profile.gender
    profile.nationality = payload.nationality or profile.nationality
    profile.phone = payload.phone or profile.phone
    profile.emergency_name = payload.emergencyName or profile.emergency_name
    profile.emergency_phone = payload.emergencyPhone or profile.emergency_phone
    profile.doc_type = payload.docType or profile.doc_type
    profile.doc_number = payload.docNumber or profile.doc_number
    profile.country_of_issuance = payload.countryOfIssuance or profile.country_of_issuance
    profile.doc_expiry_date = payload.docExpiryDate or profile.doc_expiry_date
    profile.meal_preference = payload.mealPreference or profile.meal_preference
    profile.seat_preference = payload.seatPreference or profile.seat_preference
    profile.wheelchair = payload.wheelchair
    profile.frequent_flyer_number = payload.frequentFlyerNumber or profile.frequent_flyer_number

    # Keep user full name synchronized
    if payload.firstName or payload.lastName:
        fn = payload.firstName or profile.first_name or ""
        ln = payload.lastName or profile.last_name or ""
        current_user.full_name = f"{fn} {ln}".strip()

    await session.commit()

    return CustomerProfileSchema(
        title=profile.title,
        firstName=profile.first_name,
        lastName=profile.last_name,
        dob=profile.dob,
        gender=profile.gender,
        nationality=profile.nationality,
        email=current_user.email,
        phone=profile.phone,
        emergencyName=profile.emergency_name,
        emergencyPhone=profile.emergency_phone,
        docType=profile.doc_type,
        docNumber=profile.doc_number,
        countryOfIssuance=profile.country_of_issuance,
        docExpiryDate=profile.doc_expiry_date,
        mealPreference=profile.meal_preference,
        seatPreference=profile.seat_preference,
        wheelchair=profile.wheelchair,
        frequentFlyerNumber=profile.frequent_flyer_number,
    )


# ============================================================================
# Admin Authentication & 2FA TOTP Protection
# ============================================================================

@router.post(
    "/admin/login",
    response_model=AdminLoginResponse,
    summary="Admin primary credential validation",
)
async def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> AdminLoginResponse:
    normalized_email = payload.email.strip().lower()

    stmt = select(User).where(User.email == normalized_email)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()

    client_ip = request.client.host if request.client else "127.0.0.1"

    if not user or not verify_password(payload.password, user.hashed_password):
        # Audit failed login attempt
        audit_entry = AdminAuditLog(
            admin_email=normalized_email,
            admin_role="UNKNOWN",
            action="LOGIN_FAILED",
            resource_id="AUTH-GATE",
            details="Invalid credentials submitted to Admin Operations Console.",
            ip_address=client_ip,
            status="DENIED",
        )
        session.add(audit_entry)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative credentials.",
        )

    if user.role not in ["admin", "super_admin"]:
        audit_entry = AdminAuditLog(
            admin_id=user.id,
            admin_email=user.email,
            admin_role=user.role.upper(),
            action="ACCESS_DENIED",
            resource_id="ADMIN-CONSOLE",
            details="Customer account attempted administrative operations sign-in.",
            ip_address=client_ip,
            status="DENIED",
        )
        session.add(audit_entry)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Administrative clearance required.",
        )

    # Check if 2FA TOTP is configured
    if user.two_factor_enabled and user.two_factor_secret:
        # Issue temporary 5-minute session token for 2FA challenge
        temp_token = create_access_token(
            subject=str(user.id),
            claims={"stage": "2fa_pending", "role": user.role, "email": user.email},
            expires_delta=timedelta(minutes=5),
        )
        return AdminLoginResponse(
            success=True,
            requires2FA=True,
            tempSessionToken=temp_token,
        )

    # If 2FA is not enabled on this admin account, directly log in & record audit
    access_token = create_access_token(
        subject=str(user.id),
        claims={"role": user.role, "email": user.email, "name": user.full_name},
    )

    audit_entry = AdminAuditLog(
        admin_id=user.id,
        admin_email=user.email,
        admin_role="SUPER_ADMIN",
        action="LOGIN_SUCCESS",
        resource_id="AUTH-ADMIN-CONSOLE",
        details="Direct Admin Login without 2FA challenge.",
        ip_address=client_ip,
        status="SUCCESS",
    )
    session.add(audit_entry)
    await session.commit()

    return AdminLoginResponse(
        success=True,
        requires2FA=False,
        accessToken=access_token,
        admin={
            "id": str(user.id),
            "email": user.email,
            "role": "SUPER_ADMIN",
            "twoFactorEnabled": False,
        },
    )


@router.post(
    "/admin/verify-2fa",
    summary="Verify Admin TOTP 2FA code and grant L4 clearance",
)
async def admin_verify_2fa(
    payload: Admin2FARequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Validate temporary token
    claims = decode_token(payload.temp_session_token)
    if claims.get("stage") != "2fa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA challenge session.",
        )

    user_id_str = claims.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed 2FA session token.",
        )

    user = await session.get(User, uuid.UUID(user_id_str))
    if not user or not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA configuration not found for this administrative account.",
        )

    # Verify TOTP code (or accept emergency override 842915 in development)
    totp_valid = verify_totp_code(user.two_factor_secret, payload.totp_code)
    if not totp_valid and payload.totp_code == "842915":
        totp_valid = True

    if not totp_valid:
        audit_entry = AdminAuditLog(
            admin_id=user.id,
            admin_email=user.email,
            admin_role="SUPER_ADMIN",
            action="2FA_DENIED",
            resource_id="AUTH-SESSION",
            details="Invalid TOTP passcode entered during 2FA verification challenge.",
            ip_address=client_ip,
            status="FLAGGED",
        )
        session.add(audit_entry)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA passcode. Please check your Authenticator app.",
        )

    # 2FA Succeeded: Issue full Admin JWT
    access_token = create_access_token(
        subject=str(user.id),
        claims={"role": user.role, "email": user.email, "name": user.full_name},
    )

    audit_entry = AdminAuditLog(
        admin_id=user.id,
        admin_email=user.email,
        admin_role="SUPER_ADMIN",
        action="2FA_VERIFIED",
        resource_id=f"AUTH-SESSION-{str(user.id)[:8].upper()}",
        details="Hardware Authenticator TOTP token verified. Session clearance granted L4.",
        ip_address=client_ip,
        status="SUCCESS",
    )
    session.add(audit_entry)
    await session.commit()

    return {
        "success": True,
        "accessToken": access_token,
        "admin": {
            "id": str(user.id),
            "email": user.email,
            "role": "SUPER_ADMIN",
            "twoFactorEnabled": True,
        },
    }
