"""AI endpoints — description generation, Da'Riyah chat."""
from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class GenerateDescriptionRequest(BaseModel):
    release_id: str = ""
    artist_name: str
    title: str
    genre: str
    mood: str = ""
    themes: str = ""


@router.post("/generate-description")
def ai_generate_description(req: GenerateDescriptionRequest):
    description = (
        f"{req.artist_name} returns with \"{req.title},\" a bold new {req.genre} offering "
        f"that pushes creative boundaries. "
        f"{'Drawing on themes of ' + req.themes + ', the project' if req.themes else 'The project'} "
        f"delivers {'a ' + req.mood + ' atmosphere' if req.mood else 'an immersive sonic experience'} "
        f"that demands repeat listens.\n\n"
        f"From the opening bars, it's clear this isn't just music — it's a statement. "
        f"{req.artist_name} channels raw emotion into every track, blending "
        f"{req.genre.lower()} traditions with forward-thinking production that feels both "
        f"timeless and cutting-edge.\n\n"
        f"\"I wanted to create something that hits different,\" says {req.artist_name}. "
        f"\"Every bar, every beat — it all means something.\" "
        f"\"{req.title}\" is available now on all major streaming platforms."
    )
    return {
        "description": description,
        "generated_at": date.today().isoformat(),
    }
