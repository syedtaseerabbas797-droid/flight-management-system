"""
app/api/deps.py
---------------
Shared FastAPI dependencies:
- Async database session (`get_db`)
- JWT User Authentication (`get_current_user`)
- Role-Based Access Control (`require_admin`, `require_customer`)
"""

import uuid
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.db.models.user import User
from app.utils.security import decode_token

# Optional bearer scheme to extract token from Authorization: Bearer <token>
security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    auth_header: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Authenticate request via Bearer JWT token and fetch active User from Neon DB.
    """
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.credentials
    payload = decode_token(token)
    user_id_str = payload.get("sub")

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed security token: missing user subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid security token format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    query = select(User).where(User.id == user_uuid).options(selectinload(User.profile))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been suspended or deactivated.",
        )

    return user


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Enforce that the authenticated user possesses an administrative role.
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clearance Denied: Operational Admin Access Required.",
        )
    return current_user


async def require_customer(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Enforce that the caller is an authenticated user (customer or admin).
    """
    return current_user


__all__ = [
    "get_db",
    "get_current_user",
    "require_admin",
    "require_customer",
]
