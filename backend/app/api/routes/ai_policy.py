"""
app/api/routes/ai_policy.py
---------------------------
Customer Support RAG AI Policy endpoint.

Uses Groq (Llama 3) — same key as ai_chat.py — to draft contextual
policy-aware emails based on passenger booking details.

Endpoints
---------
  POST  /support/ask   Ask a policy question about an existing booking
"""

import os
import uuid
from typing import Optional

from groq import Groq
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models.booking import Booking
from app.db.models.flight import Flight
from app.db.models.email_draft import EmailDraft
from app.db.enums import BookingStatus


router = APIRouter(prefix="/support", tags=["AI Support"])

class PolicyQuestionRequest(BaseModel):
    booking_id: uuid.UUID
    customer_question: str

class PolicyAnswerResponse(BaseModel):
    answer: str

# ---------------------------------------------------------------------------
# RAG Prompt Template
# ---------------------------------------------------------------------------
POLICY_PROMPT = """You are an expert customer support agent for AeroNexus Airlines.
You are writing an email draft to a customer regarding their specific booking.

Passenger Ticket Details:
- Fare Type: {fare_type}
- Seat Class: {seat_class}
- Booking Status: {status}

AeroNexus Airline Policy Guidelines:
- Basic Economy: Non-refundable, non-changeable, no cancellations allowed. No free baggage.
- Standard / Flexible: Changeable with a $50 fee, cancellable for airline credit.
- Refundable: Fully refundable to original payment method up to 24 hours before flight. Changes are free.

Based STRICTLY on the above policy and the passenger's exact fare type ({fare_type}),
write a professional, polite, and helpful email draft answering their question.
Do not include a subject line — just the body of the email.

Customer Question: {customer_question}

Email Draft Body:"""


@router.post(
    "/ask",
    response_model=PolicyAnswerResponse,
    summary="Ask AI customer support a policy question",
    description="Uses Groq LLM to fetch contextual booking data and dynamically answer the question based on AeroNexus airline policy rules."
)
async def ask_policy_question(
    payload: PolicyQuestionRequest,
    session: AsyncSession = Depends(get_db)
) -> PolicyAnswerResponse:

    # 1. Fetch booking context from DB
    stmt = select(Booking).where(Booking.id == payload.booking_id)
    result = await session.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found. Cannot assist without a valid booking."
        )

    # 2. Build prompt with booking context
    filled_prompt = POLICY_PROMPT.format(
        fare_type=booking.fare_type.value if booking.fare_type else "Standard",
        seat_class=booking.seat_class.value if booking.seat_class else "Economy",
        status=booking.status.value if booking.status else "confirmed",
        customer_question=payload.customer_question,
    )

    # 3. Invoke Groq LLM (same key as ai_chat)
    try:
        groq_api_key = os.environ.get("GROQ_API_KEY", "")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        client = Groq(api_key=groq_api_key)
        model_candidates = [
            os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            "llama-3.1-8b-instant",
            "llama3-8b-8192",
            "mixtral-8x7b-32768",
        ]
        completion = None
        last_error = None
        for model_name in model_candidates:
            try:
                res = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a professional airline customer support agent for AeroNexus Airlines. Write clear, concise, policy-grounded email responses.",
                        },
                        {"role": "user", "content": filled_prompt},
                    ],
                    temperature=0.2,
                    max_tokens=600,
                )
                if res.choices and res.choices[0].message.content:
                    completion = res
                    break
            except Exception as exc:
                last_error = exc
                continue

        if not completion:
            raise RuntimeError(f"All Groq models failed. Last error: {last_error}")

        email_body = completion.choices[0].message.content.strip()

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI policy engine error: {e}"
        )

    # 4. Save email draft for human approval
    draft = EmailDraft(
        booking_id=booking.id,
        subject=f"Re: Your AeroNexus Booking — {str(booking.id)[:8].upper()}",
        body=email_body,
        status="pending_approval"
    )
    session.add(draft)
    await session.commit()
    await session.refresh(draft)

    return PolicyAnswerResponse(
        answer=f"Draft {draft.id} generated and queued for admin approval. Preview: {email_body[:200]}..."
    )
