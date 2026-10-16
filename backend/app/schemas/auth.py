"""
app/schemas/auth.py
-------------------
Pydantic v2 schemas for Authentication, Registration, 2FA,
Passenger Profiles, and Audit Logs.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


# ============================================================================
# Customer Auth Schemas
# ============================================================================

class RegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: str
    password: str = Field(..., min_length=6, description="Minimum 6 characters")
    full_name: str = Field(..., validation_alias=AliasChoices("fullName", "full_name"), min_length=2)
    role: str = "customer"


class VerifyOtpRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: str
    otp: str = Field(..., validation_alias=AliasChoices("otp", "otpCode", "otp_code"), min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    email: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    refresh_token: str = Field(..., validation_alias=AliasChoices("refreshToken", "refresh_token"))


class AuthTokens(BaseModel):
    accessToken: str
    refreshToken: str
    tokenType: str = "bearer"


class AuthUser(BaseModel):
    id: str
    email: str
    name: str
    role: str
    isVerified: bool


class AuthResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    user: Optional[AuthUser] = None
    tokens: Optional[AuthTokens] = None


# ============================================================================
# Admin Auth & 2FA Schemas
# ============================================================================

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginResponse(BaseModel):
    success: bool = True
    requires2FA: bool = False
    tempSessionToken: Optional[str] = None
    accessToken: Optional[str] = None
    admin: Optional[Dict[str, Any]] = None


class Admin2FARequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    temp_session_token: str = Field(..., validation_alias=AliasChoices("tempSessionToken", "temp_session_token", "temp_token"))
    totp_code: str = Field(..., validation_alias=AliasChoices("totpCode", "totp_code"), min_length=6, max_length=6)


class AdminForceCancelRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Mandatory administrative justification")


class AdminSetup2FAResponse(BaseModel):
    secret: str
    provisioningUri: str


# ============================================================================
# Passenger Profile Schemas
# ============================================================================

class CustomerProfileSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = "Mr"
    firstName: Optional[str] = Field(None, validation_alias=AliasChoices("firstName", "first_name"))
    lastName: Optional[str] = Field(None, validation_alias=AliasChoices("lastName", "last_name"))
    dob: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    emergencyName: Optional[str] = Field(None, validation_alias=AliasChoices("emergencyName", "emergency_name"))
    emergencyPhone: Optional[str] = Field(None, validation_alias=AliasChoices("emergencyPhone", "emergency_phone"))
    docType: str = Field("PASSPORT", validation_alias=AliasChoices("docType", "doc_type"))
    docNumber: Optional[str] = Field(None, validation_alias=AliasChoices("docNumber", "doc_number"))
    countryOfIssuance: Optional[str] = Field(None, validation_alias=AliasChoices("countryOfIssuance", "country_of_issuance"))
    docExpiryDate: Optional[str] = Field(None, validation_alias=AliasChoices("docExpiryDate", "doc_expiry_date"))
    mealPreference: str = Field("Halal", validation_alias=AliasChoices("mealPreference", "meal_preference"))
    seatPreference: str = Field("Window", validation_alias=AliasChoices("seatPreference", "seat_preference"))
    wheelchair: bool = False
    frequentFlyerNumber: Optional[str] = Field(None, validation_alias=AliasChoices("frequentFlyerNumber", "frequent_flyer_number"))



# ============================================================================
# Admin Audit Desk Schema
# ============================================================================

class AuditRecordSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: str
    adminEmail: str
    adminRole: str
    action: str
    resourceId: Optional[str] = None
    details: Optional[str] = None
    ipAddress: Optional[str] = None
    status: str
