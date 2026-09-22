import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field


load_dotenv()


GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile",
)


client = None

if GROQ_API_KEY:
    client = Groq(
        api_key=GROQ_API_KEY
    )


app = FastAPI(
    title="AI Life Quest API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


class WorldRequest(BaseModel):

    goal: str = Field(
        min_length=3,
        max_length=500,
    )

    current_level: str = (
        "Beginner"
    )

    hours_per_week: int = Field(
        default=10,
        ge=1,
        le=80,
    )

    deadline: str = ""

    interests: str = ""


class AdaptRequest(BaseModel):

    goal: str

    world: dict[str, Any]

    completed_quests: list[
        dict[str, Any]
    ] = []

    performance: dict[
        str,
        Any,
    ] = {}


def extract_json(text: str):

    cleaned = text.strip()

    cleaned = re.sub(
        r"^```json\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned = re.sub(
        r"^```\s*",
        "",
        cleaned,
    )

    cleaned = re.sub(
        r"\s*```$",
        "",
        cleaned,
    )

    try:

        return json.loads(
            cleaned
        )

    except json.JSONDecodeError:

        start = cleaned.find("{")

        end = cleaned.rfind("}")

        if (
            start == -1
            or end == -1
        ):

            raise ValueError(
                "Groq response did not contain JSON."
            )

        json_text = cleaned[
            start : end + 1
        ]

        return json.loads(
            json_text
        )


def ask_groq(
    system_prompt,
    user_prompt,
):

    if not client:

        raise HTTPException(
            status_code=500,

            detail=(
                "GROQ_API_KEY is missing. "
                "Add it to backend/.env."
            ),
        )

    try:

        response = (
            client.chat.completions.create(
                model=GROQ_MODEL,

                temperature=0.7,

                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },

                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
            )
        )

        text = (
            response
            .choices[0]
            .message
            .content
        )

        if not text:

            raise ValueError(
                "Groq returned an empty response."
            )

        return extract_json(
            text
        )

    except Exception as error:

        print(
            "Groq error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,

            detail=f"Groq error: {str(error)}",
        )


WORLD_SYSTEM_PROMPT = """
You are the AI Game Master of a real-life RPG called AI Life Quest.

Your job is to turn a person's long-term goal into a practical RPG progression system.

The system must measure real ability instead of simply giving random tasks.

Return ONLY valid JSON.

Do not use markdown.

Do not add text before or after the JSON.

Create exactly:

- 6 main quests
- 3 side quests
- 6 skills
- 2 bosses

Main quests must gradually increase in difficulty.

Every main quest should require some form of proof that demonstrates real ability.

Possible proof:
- project
- test
- explanation
- GitHub repository
- real artifact
- evaluation score
- working demo
- presentation

Return JSON in exactly this structure:

{
    "world_title": "string",

    "world_subtitle": "string",

    "player_class": "string",

    "goal": "string",

    "difficulty": 1,

    "recommended_weekly_xp": 500,

    "main_quests": [
        {
            "id": "q1",

            "title": "string",

            "description": "string",

            "proof": "string",

            "xp": 100,

            "difficulty": 1,

            "estimated_hours": 2,

            "skills": [
                "skill1"
            ]
        }
    ],

    "side_quests": [
        {
            "id": "s1",

            "title": "string",

            "description": "string",

            "xp": 50,

            "difficulty": 1
        }
    ],

    "skills": [
        {
            "id": "skill1",

            "name": "string",

            "description": "string",

            "max_level": 5,

            "unlocks_after": []
        }
    ],

    "bosses": [
        {
            "id": "boss1",

            "title": "string",

            "description": "string",

            "victory_condition": "string",

            "xp": 500,

            "difficulty": 3,

            "recommended_level": 2
        }
    ],

    "streak_rule": "string",

    "game_master_message": "string"
}
"""


ADAPT_SYSTEM_PROMPT = """
You are the adaptive AI Game Master for AI Life Quest.

The player has already completed some challenges.

You receive:

- their goal
- current campaign
- completed quests
- player level
- XP
- streak
- perceived difficulty

Your job is to dynamically create better next challenges.

Rules:

If the player repeatedly says challenges are easy:
increase challenge complexity.

If challenges are balanced:
continue progression normally.

If challenges are repeatedly difficult:
create smaller prerequisite challenges.

Never create meaningless busywork.

Challenges should demonstrate actual ability.

Create exactly 3 new quests.

Optionally create one boss challenge.

Return ONLY JSON.

No markdown.

Structure:

{
    "new_difficulty": 2,

    "reason": "short explanation",

    "next_quests": [
        {
            "id": "adaptive_unique_id",

            "title": "string",

            "description": "string",

            "proof": "string",

            "xp": 200,

            "difficulty": 2,

            "estimated_hours": 3,

            "skills": [
                "skill1"
            ]
        }
    ],

    "boss_unlock": null
}

boss_unlock can instead be:

{
    "id": "boss_unique_id",

    "title": "string",

    "description": "string",

    "victory_condition": "string",

    "xp": 600,

    "difficulty": 4,

    "recommended_level": 4
}
"""


@app.get("/")
def home():

    return {
        "message": "AI Life Quest API",
        "status": "running",
    }


@app.get("/health")
def health():

    return {
        "ok": True,
        "model": GROQ_MODEL,
    }


@app.post("/api/world")
def create_world(
    request: WorldRequest,
):

    user_prompt = f"""
PLAYER GOAL:
{request.goal}

CURRENT LEVEL:
{request.current_level}

AVAILABLE HOURS EACH WEEK:
{request.hours_per_week}

DEADLINE:
{request.deadline or "No fixed deadline"}

INTERESTS:
{request.interests or "Not specified"}

Create their AI Life Quest RPG world.

The first quests should be realistically achievable at their current level.

Later quests should gradually become more difficult.

Boss challenges should require combining several learned skills.
"""

    result = ask_groq(
        WORLD_SYSTEM_PROMPT,
        user_prompt,
    )

    result["goal"] = (
        request.goal
    )

    return result


@app.post("/api/adapt")
def adapt_world(
    request: AdaptRequest,
):

    user_prompt = f"""
ORIGINAL GOAL:

{request.goal}


CURRENT WORLD:

{json.dumps(
    request.world,
    ensure_ascii=False
)}


RECENT COMPLETED QUESTS:

{json.dumps(
    request.completed_quests,
    ensure_ascii=False
)}


PLAYER PERFORMANCE:

{json.dumps(
    request.performance,
    ensure_ascii=False
)}


Based on actual demonstrated progression, generate the next 3 challenges.
"""

    return ask_groq(
        ADAPT_SYSTEM_PROMPT,
        user_prompt,
    )