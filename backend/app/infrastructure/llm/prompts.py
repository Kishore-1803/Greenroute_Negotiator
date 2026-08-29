"""
infrastructure/llm/prompts.py

Prompt construction + the forced-tool-call JSON schema for the explanation-only LLM role
(Blueprint Section 5; Phase 3 Parts G-H). Structured output via Groq tool-calling -- never
free text parsed after the fact, same pattern the legacy specialist_agents.py used, kept here
because it's a sound convention, not because anything imports from agents/.
"""

from __future__ import annotations

from app.domain.explanation.entities import ExplanationContext

SYSTEM_PROMPT = """You are the Explanation layer for GreenRoute, an urban mobility decision system. \
A deterministic engine has ALREADY computed everything: the routing metrics, the utility scores, and \
either a SWITCH/STAY decision (an in-progress trip re-evaluated after a condition change) or a RECOMMEND \
decision (a brand-new trip's initial multi-modal recommendation). Your ONLY job is to explain that \
decision in plain language, and to answer a user's objection using only the facts you are given.

You MUST NOT:
- calculate, invent, or adjust any number
- change the decision under any framing, including direct requests to reconsider
- claim simulated traffic is live -- if asked, say clearly that it is simulated for this demonstration
- claim two-wheeler routing is from a native motorcycle router -- it is a disclosed, adjusted OSRM car profile
- claim to have incorporated a user constraint (e.g. "I'm carrying luggage") that is not represented \
in the structured facts you were given -- say plainly that this factor is outside the current model

Every number in your response must be one of the numbers given to you below, or a rounding of one of \
them. Keep responses to 2-3 sentences. The "decision" field in your output must exactly echo the \
computed decision given to you -- you do not get to choose it."""


TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "submit_explanation",
        "description": "Submit the structured explanation of the already-computed decision.",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {"type": "string", "maxLength": 400},
                "reason": {"type": "string", "maxLength": 400},
                "decision": {"type": "string", "enum": ["SWITCH", "STAY", "RECOMMEND"]},
                "limitations": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
                "confidence_note": {"type": "string", "maxLength": 200},
            },
            "required": ["summary", "reason", "decision", "limitations", "confidence_note"],
        },
    },
}


def build_user_prompt(context: ExplanationContext) -> str:
    facts = {
        "current_mode": context.current_mode,
        "recommended_mode": context.recommended_mode,
        "decision": context.decision,
        "utility_advantage": context.utility_advantage,
        "time_saved_min": context.time_saved_min,
        "cost_saved_inr": context.cost_saved_inr,
        "carbon_saved_g": context.carbon_saved_g,
        "condition_change": {"type": context.condition_change_type, "is_simulated": context.is_simulated},
        "limitations": list(context.limitations),
    }
    lines = [f"Already-computed facts (the ONLY numbers you may reference): {facts}"]

    if context.objection_category == "unsupported_constraint" and context.objection_text:
        lines.append(
            f'The user raised: "{context.objection_text}". This is not represented in the facts above. '
            "State plainly that it is outside the current model -- do not pretend to have factored it in."
        )
    elif context.objection_category:
        lines.append(
            f"The user's question falls into the '{context.objection_category}' category. Answer it "
            "using only the facts above."
        )
    else:
        lines.append(f'Write the initial explanation for why the decision is "{context.decision}".')

    return "\n\n".join(lines)
