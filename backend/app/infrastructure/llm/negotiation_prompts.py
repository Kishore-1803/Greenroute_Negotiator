"""
infrastructure/llm/negotiation_prompts.py

Prompt construction + forced-tool-call JSON schemas for the three specialist agents
(Speed/Cost/Carbon, Master Plan Section 3 "Sanggit Saaran -- AI Engine & Agent Orchestration")
and the Coordinator (Section 3's coordinator_agent.py). Structured output via Groq
tool-calling throughout -- same convention infrastructure/llm/prompts.py already uses for the
explanation role.

Each agent's `mode_advocated` is dictated by the deterministic advocate computed in
domain.negotiation.entities (never left to the LLM) -- the tool schema still asks the model to
name it, and domain.negotiation.interfaces.validate_transcript checks the answer against the
real one, exactly the way explanation numbers are checked against context facts.
"""

from __future__ import annotations

from app.domain.negotiation.entities import AgentArgument, NegotiationContext

_AGENT_VOICE = {
    "speed": "Speed Agent, who argues for whichever mode gets the traveller there fastest (lowest duration_min).",
    "cost": "Cost Agent, who argues for whichever mode is cheapest (lowest estimated_cost_inr).",
    "carbon": "Carbon Agent, who argues for whichever mode has the lowest emissions (lowest estimated_carbon_g).",
}

_SHARED_RULES = """You MUST NOT invent, adjust, or round loosely any number -- every figure you mention must be \
one of the exact per-mode metrics given to you below. You MUST NOT argue for a mode other than the one named as \
your position in this turn -- that position is fixed by the actual data, not your opinion. Keep your message to \
1-2 sentences."""


def _facts_block(context: NegotiationContext) -> dict:
    return {
        mode: {
            "duration_min": snap.duration_min,
            "estimated_cost_inr": snap.estimated_cost_inr,
            "estimated_carbon_g": snap.estimated_carbon_g,
        }
        for mode, snap in context.modes.items()
    }


def agent_tool_schema(round_no: int) -> dict:
    properties = {
        "message": {"type": "string", "maxLength": 300},
    }
    required = ["message"]
    if round_no == 2:
        properties["stance"] = {"type": "string", "enum": ["concede", "rebut"]}
        required.append("stance")
    return {
        "type": "function",
        "function": {
            "name": "submit_argument",
            "description": "Submit this agent's argument for the current round.",
            "parameters": {"type": "object", "properties": properties, "required": required},
        },
    }


def round_1_system_prompt(agent: str) -> str:
    return (
        f"You are the {_AGENT_VOICE[agent]} You are in Round 1 of a 2-round negotiation with two other "
        f"specialist agents (arguing for the other two metrics) over which transport mode a traveller should "
        f"take. Make your opening, independent case for your position using only the facts you are given. "
        f"{_SHARED_RULES}"
    )


def round_1_user_prompt(context: NegotiationContext, agent: str) -> str:
    position = context.advocate_for(agent)
    return (
        f"Per-mode facts: {_facts_block(context)}\n\n"
        f"Your position this round is: advocate for {position!r}. Make your opening argument for it."
    )


def round_2_system_prompt(agent: str) -> str:
    return (
        f"You are the {_AGENT_VOICE[agent]} This is Round 2. You have now seen the other two agents' Round 1 "
        f"arguments below. Either concede (if their case is stronger on the shared facts) or rebut with a "
        f"data-grounded counter-argument that directly engages with what they said -- do not just repeat your "
        f"Round 1 point unchanged. {_SHARED_RULES}"
    )


def round_2_user_prompt(context: NegotiationContext, agent: str, other_round_1: list[AgentArgument]) -> str:
    position = context.advocate_for(agent)
    others = "\n".join(f"- {a.agent} agent (advocating {a.mode_advocated}): \"{a.message}\"" for a in other_round_1)
    return (
        f"Per-mode facts: {_facts_block(context)}\n\n"
        f"Your position is still: advocate for {position!r}.\n\n"
        f"The other agents' Round 1 arguments were:\n{others}\n\n"
        f"Respond to them directly -- concede or rebut."
    )


def coordinator_system_prompt() -> str:
    return """You are the Coordinator for GreenRoute's mode-negotiation panel. A deterministic utility \
engine has ALREADY computed the winning mode from the three specialist agents' underlying metrics -- your ONLY \
job is to narrate that outcome given the negotiation transcript, in 2-3 sentences. You MUST NOT pick, imply, or \
hint at a different winner than the one given to you as `computed_winner`, no matter how compelling any agent's \
argument sounded. The "winner" field in your output must exactly echo `computed_winner`."""


def coordinator_tool_schema(valid_modes: list[str]) -> dict:
    return {
        "type": "function",
        "function": {
            "name": "submit_coordinator_summary",
            "description": "Submit the Coordinator's narration of the already-computed winner.",
            "parameters": {
                "type": "object",
                "properties": {
                    "winner": {"type": "string", "enum": valid_modes},
                    "summary": {"type": "string", "maxLength": 400},
                },
                "required": ["winner", "summary"],
            },
        },
    }


def coordinator_user_prompt(context: NegotiationContext, round_1: list[AgentArgument], round_2: list[AgentArgument]) -> str:
    transcript = {
        "round_1": [{"agent": a.agent, "advocated": a.mode_advocated, "message": a.message} for a in round_1],
        "round_2": [
            {"agent": a.agent, "advocated": a.mode_advocated, "stance": a.stance, "message": a.message} for a in round_2
        ],
    }
    return (
        f"Per-mode facts: {_facts_block(context)}\n\n"
        f"computed_winner (the deterministic utility-engine result -- you must echo this exactly): "
        f"{context.computed_winner!r}\n\n"
        f"Negotiation transcript: {transcript}\n\n"
        f"Narrate why {context.computed_winner!r} won, referencing the negotiation."
    )
