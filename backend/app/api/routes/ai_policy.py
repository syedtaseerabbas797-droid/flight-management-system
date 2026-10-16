"""
app/api/routes/ai_policy.py
---------------------------
Customer Support RAG AI Policy endpoint using LangChain.

Endpoints
---------
  POST  /support/ask   Ask a question regarding an existing booked ticket's policy
"""

import uuid
from typing import Optional

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
POLICY_PROMPT = """
You are an expert customer support agent for our airline. 
You are writing an email to a customer regarding their specific booking. 
The passenger has the following ticket details:
Fare Type: {fare_type}
Seat Class: {seat_class}
Booking Status: {status}

Here is the airline's policy guidelines regarding Fare Types:
- Basic Economy: Non-refundable, non-changeable, no cancellations allowed. No free baggage.
- Standard / Flexible: Changeable with a $50 fee, cancellable for airline credit.
- Refundable: Fully refundable to original payment method up to 24 hours before flight. Changes are free.

Based STRICTLY on the above policy and the passenger's exact fare type ({fare_type}), 
write a professional, polite, and helpful email draft answering their question. 
Do not include subject lines, just the body of the email.

Customer Question: {customer_question}

Email Draft Body:
"""

@router.post(
    "/ask",
    response_model=PolicyAnswerResponse,
    summary="Ask AI customer support a policy question",
    description="Uses LangChain to fetch contextual booking data and dynamically answer the question based on the airline's rules."
)
async def ask_policy_question(
    payload: PolicyQuestionRequest,
    session: AsyncSession = Depends(get_db)
) -> PolicyAnswerResponse:

    # 1. Fetch booking context
    stmt = (
        select(Booking)
        .where(Booking.id == payload.booking_id)
    )
    result = await session.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found. Cannot assist without a valid booking."
        )

    # 2. Invoke LangChain AI
    try:
        from langchain_core.prompts import PromptTemplate
        from langchain_google_genai import ChatGoogleGenerativeAI

        # Assumes OS environ has GOOGLE_API_KEY
        # Temperature 0 for policy grounding
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
        
        prompt = PromptTemplate(
            input_variables=["fare_type", "seat_class", "status", "customer_question"], 
            template=POLICY_PROMPT
        )

        
        chain = prompt | llm
        
        response = chain.invoke({
            "fare_type": booking.fare_type.value,
            "seat_class": booking.seat_class.value,
            "status": booking.status.value,
            "customer_question": payload.customer_question
        })
        
        draft = EmailDraft(
            booking_id=booking.id,
            subject=f"Regarding your query for Booking {booking.id}",
            body=response.content,
            status="pending_approval"
        )
        
        session.add(draft)
        await session.commit()
        await session.refresh(draft)
        
        return PolicyAnswerResponse(answer=f"Draft {draft.id} successfully generated and queued for human approval.")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response from AI support layer: {e}"
        )
