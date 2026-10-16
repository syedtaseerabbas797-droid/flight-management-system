"""
app/api/routes/ai_chat.py
--------------------------
General-purpose AI Flight Concierge Chat endpoint using Groq LLM (Llama 3).

This endpoint does NOT require a booking_id — it's a free-text conversational
chatbot for both customer and admin frontends.

Endpoints
---------
  POST  /support/chat    Send a free-text message to the AeroNexus AI Concierge
"""

import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/support", tags=["AI Support"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []


class ChatResponse(BaseModel):
    reply: str
    suggestions: Optional[List[str]] = []


# ---------------------------------------------------------------------------
# Airline system prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are AeroAI, the expert AI Concierge for AeroNexus Airlines Flight Management System.

You assist both passengers and airline operations staff with:
- Flight status queries (AP-104, AP-882, AP-305, etc.)
- Booking policies: hold, confirm, cancellation (4-hour rule)
- Fare types: Basic Economy (non-refundable), Standard/Flexible (changeable with $50 fee), Refundable (fully refundable up to 24 hours before)
- Seat classes: First, Business, Economy
- Baggage allowances
- Waitlist status and promotion rules
- Check-in and boarding procedures
- General airline operations

Always be professional, concise, and helpful. 
If asked about specific booking details you don't have access to, politely explain you need the booking ID.
Keep responses under 200 words unless more detail is specifically needed.
End responses with 2-3 short follow-up suggestions as a list if appropriate."""


# ---------------------------------------------------------------------------
# POST /support/chat
# ---------------------------------------------------------------------------

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with AeroAI Concierge",
    description=(
        "Free-text conversational AI chatbot for passengers and operations staff. "
        "Uses Groq LLM (Llama 3) for fast, intelligent responses about flights, "
        "bookings, policies, and airline operations."
    )
)
async def chat_with_ai(payload: ChatRequest) -> ChatResponse:
    """
    Send a message to the AeroNexus AI Concierge powered by Groq LLM.
    No booking_id required — works for general airline queries.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")

    if not groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Concierge service is currently unavailable. GROQ_API_KEY not configured.",
        )

    try:
        from groq import Groq

        client = Groq(api_key=groq_api_key)

        # Build message history
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history (last 10 messages max for context window)
        if payload.conversation_history:
            messages.extend(payload.conversation_history[-10:])

        # Add current user message
        messages.append({"role": "user", "content": payload.message})

        # Call Groq API with robust model selection (qwen/qwen3.8-27b is verified active on Groq)
        model_candidates = [
            os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
            "qwen/qwen3.8-27b",
            "allam-2-7b",
            "openai/gpt-oss-20b",
        ]

        completion = None
        last_error = None
        for model_name in model_candidates:
            try:
                res = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=512,
                )
                if res.choices and res.choices[0].message.content:
                    completion = res
                    break
            except Exception as err:
                last_error = err
                continue

        if not completion or not completion.choices or not completion.choices[0].message.content:
            raise last_error or RuntimeError("No response from Groq AI models")

        reply_text = completion.choices[0].message.content.strip()

        # Extract suggestions if present (lines starting with - or *)
        suggestions = []
        reply_lines = reply_text.split('\n')
        clean_lines = []

        for line in reply_lines:
            stripped = line.strip()
            # Detect bullet suggestions at end of response
            if stripped.startswith(('- ', '* ', '\u2022 ')) and len(clean_lines) > 2:
                suggestion = stripped.lstrip('-*\u2022 ').strip()
                if suggestion and len(suggestion) < 80:
                    suggestions.append(suggestion)
            else:
                clean_lines.append(line)

        # Clean up reply
        final_reply = '\n'.join(clean_lines).strip()
        if not final_reply:
            final_reply = reply_text

        return ChatResponse(
            reply=final_reply,
            suggestions=suggestions[:3],  # max 3 suggestions
        )

    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Groq package not installed. Run: pip install groq",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Concierge encountered an error: {str(e)}",
        )
