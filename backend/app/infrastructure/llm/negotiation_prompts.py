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
    "weather": "Weather Agent, who fiercely argues for enclosed modes (like car) during rain/bad weather, and open modes during pleasant weather.",
}

_SHARED_RULES = """For each agent's argument, you MUST NOT invent, adjust, or round loosely any number -- every figure mentioned must be \
one of the exact per-mode metrics given to you below. Each agent MUST NOT argue for a mode other than the one named as \
their position in this turn -- their position is fixed by the actual data, not opinion. Keep each message to \
1-2 sentences."""


def _facts_block(context: NegotiationContext) -> dict:
    return {
        "weather": context.weather,
        "modes": {
            mode: {
                "duration_min": snap.duration_min,
                "estimated_cost_inr": snap.estimated_cost_inr,
                "estimated_carbon_g": snap.estimated_carbon_g,
            }
            for mode, snap in context.modes.items()
        }
    }


def panel_tool_schema(round_no: int) -> dict:
    item_props = {
        "agent": {"type": "string", "enum": ["speed", "cost", "carbon", "weather"]},
        "message": {"type": "string", "maxLength": 500},
    }
    item_req = ["agent", "message"]
    if round_no == 2:
        item_props["stance"] = {"type": "string", "enum": ["concede", "rebut"]}
        item_req.append("stance")

    return {
        "type": "function",
        "function": {
            "name": "submit_arguments",
            "description": "Submit the arguments for all agents in the current round.",
            "parameters": {
                "type": "object",
                "properties": {
                    "arguments": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": item_props,
                            "required": item_req,
                        },
                        "minItems": 4,
                        "maxItems": 4,
                    }
                },
                "required": ["arguments"],
            },
        },
    }


def panel_round_1_system_prompt() -> str:
    return (
        f"You are simulating a negotiation panel between 4 specialist agents over which transport mode a traveller should take.\n"
        f"The 4 agents are:\n"
        f"- {_AGENT_VOICE['speed']}\n"
        f"- {_AGENT_VOICE['cost']}\n"
        f"- {_AGENT_VOICE['carbon']}\n"
        f"- {_AGENT_VOICE['weather']}\n\n"
        f"This is Round 1. Generate the opening, independent argument for each agent.\n"
        f"{_SHARED_RULES}"
    )


def panel_round_1_user_prompt(context: NegotiationContext) -> str:
    positions = {agent: context.advocate_for(agent) for agent in _AGENT_VOICE}
    return (
        f"Per-mode facts: {_facts_block(context)}\n\n"
        f"The data-grounded positions for this round are: {positions}\n\n"
        f"Generate the opening arguments for all 4 agents based on their assigned positions."
    )


def panel_round_2_system_prompt() -> str:
    return (
        f"You are simulating a negotiation panel between 4 specialist agents over which transport mode a traveller should take.\n"
        f"The 4 agents are:\n"
        f"- {_AGENT_VOICE['speed']}\n"
        f"- {_AGENT_VOICE['cost']}\n"
        f"- {_AGENT_VOICE['carbon']}\n"
        f"- {_AGENT_VOICE['weather']}\n\n"
        f"This is Round 2. You will be given the Round 1 arguments of all agents. Each agent must now either concede "
        f"(if another case is stronger) or rebut with a data-grounded counter-argument.\n"
        f"{_SHARED_RULES}"
    )


def panel_round_2_user_prompt(context: NegotiationContext, round_1: list[AgentArgument]) -> str:
    positions = {agent: context.advocate_for(agent) for agent in _AGENT_VOICE}
    r1_text = "\n".join(f"- {a.agent} agent (advocating {a.mode_advocated}): \"{a.message}\"" for a in round_1)
    return (
        f"Per-mode facts: {_facts_block(context)}\n\n"
        f"The data-grounded positions for this round remain: {positions}\n\n"
        f"The Round 1 arguments were:\n{r1_text}\n\n"
        f"Generate the Round 2 responses (concede or rebut) for all 4 agents."
    )


def coordinator_system_prompt() -> str:
    return """You are the Coordinator for GreenRoute's mode-negotiation panel. A deterministic utility \
engine has ALREADY computed the winning mode from the specialist agents' underlying metrics -- your ONLY \
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
                    # 700, not 400: Groq validates this schema SERVER-SIDE and rejects the whole
                    # tool call with a 400 when the model overruns, so a tight bound here is not
                    # a soft "keep it short" hint -- it silently costs the real Groq transcript
                    # and drops the response to the deterministic fallback. Observed: a 414-char
                    # 3-sentence summary failed against 400. The system prompt asks for 2-3
                    # sentences; this is the hard ceiling behind that, sized to not bind first.
                    "summary": {"type": "string", "maxLength": 700},
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
