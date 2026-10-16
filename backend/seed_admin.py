"""
seed_admin.py
-------------
Provision default AeroNexus Airline Super Admin in Neon Postgres.
Email: admin@aeronexus.com
Pass:  Admin@123
Role:  SUPER_ADMIN
2FA:   TOTP Hardware Authenticator Enabled
"""

import asyncio
import os
import sys

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.audit_log import AdminAuditLog
from app.utils.security import (
    hash_password,
    generate_totp_secret,
    get_totp_provisioning_uri,
)


async def seed_super_admin():
    admin_email = "admin@aeronexus.com"
    raw_password = "Admin@123"

    print("=" * 65)
    print("✈ AERONEXUS AVIATION - PROVISIONING SUPER ADMIN IDENTITY")
    print("=" * 65)

    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == admin_email)
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()

        totp_secret = generate_totp_secret()
        qr_uri = get_totp_provisioning_uri(totp_secret, admin_email)

        if user:
            print(f"Updating existing identity for: {admin_email}...")
            user.hashed_password = hash_password(raw_password)
            user.role = "super_admin"
            user.is_active = True
            user.is_verified = True
            user.two_factor_enabled = True
            user.two_factor_secret = totp_secret
        else:
            print(f"Creating new Super Admin identity for: {admin_email}...")
            user = User(
                email=admin_email,
                hashed_password=hash_password(raw_password),
                full_name="AeroNexus Chief Dispatch Officer",
                role="super_admin",
                is_active=True,
                is_verified=True,
                two_factor_enabled=True,
                two_factor_secret=totp_secret,
            )
            session.add(user)

        await session.flush()

        audit = AdminAuditLog(
            admin_id=user.id,
            admin_email=admin_email,
            admin_role="SUPER_ADMIN",
            action="SYSTEM_INIT_PROVISION",
            resource_id="SECURITY-VAULT",
            details="Company Super Admin seeded with TOTP L4 clearance.",
            ip_address="127.0.0.1",
            status="SUCCESS",
        )
        session.add(audit)
        await session.commit()

        print("\n[SUCCESS] Super Admin account provisioned successfully!")
        print(f"  • Email:             {admin_email}")
        print(f"  • Temporary Pass:    {raw_password}")
        print(f"  • Clearance Level:   SUPER_ADMIN (L4 Dispatch)")
        print(f"  • 2FA TOTP Secret:   {totp_secret}")
        print(f"  • Authenticator URI: {qr_uri}")
        print(f"  • Dev 2FA Override:  842915 (Instant dev bypass)")
        print("=" * 65)


if __name__ == "__main__":
    asyncio.run(seed_super_admin())
