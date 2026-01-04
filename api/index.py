import os
import json
import httpx
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    docs_url="/api/docs", 
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MIRELO_KEY = os.environ.get("MIRELO")
GEMINI_KEY = os.environ.get("GEMINI")

client = genai.Client(api_key=GEMINI_KEY)

from fastapi import UploadFile, File, Form

@app.post("/api/voice_to_sfx")
async def voice_to_sfx(
    project: str = Form(...), 
    audio: UploadFile = File(...)
):
    """
    Takes a user's vocal imitation (beatbox/mouth foley) and converts it 
    into a professional sound effect using Gemini Analysis + Mirelo Generation.
    """
    audio_bytes = await audio.read()
    
    prompt = """
    You are an Expert Sound Designer. Listen to this user's vocal imitation.
    They are trying to mimic a sound effect with their voice.
    
    Your task:
    1. Analyze the pitch, envelope, and texture.
    2. Identify what object or event they are trying to simulate (e.g., "Laser gun", "Heavy impact", "Car engine").
    3. Write a HIGH-FIDELITY text prompt to generate the *real* version of this sound.
    
    Example Input: User says "Pshhh-krrrt!"
    Example Output: "Sci-fi hydraulic door opening, heavy pneumatic release followed by metallic friction, industrial texture."
    
    Return JSON: { "suggested_name": "Hydraulic_Door", "prompt": "..." }
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=types.Content(
                parts=[
                    types.Part(inline_data=types.Blob(data=audio_bytes, mime_type='audio/mp3')), 
                    types.Part(text=prompt)
                ]
            ),
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        analysis = json.loads(response.text)
        
    except Exception as e:
        raise HTTPException(500, detail=f"Gemini Analysis Failed: {e}")

    generated_variations = []
    
    async with httpx.AsyncClient(verify=False, timeout=60.0) as http_client:
        print(f"🎤 Sketch interpreted as: {analysis['prompt']}")
        
        for i in range(3):
            payload = {
                "video_url": "https://ruswfclwojxpqskjuuim.supabase.co/storage/v1/object/public/videos/3611035-hd_1920_1080_24fps.mp4",
                "start_offset": 0.0,
                "duration": 10,
                "text_prompt": analysis['prompt'],
                "model_version": "latest",
                "seed": i * 150
            }
            
            try:
                resp = await http_client.post(
                    "https://api.mirelo.ai/video-to-sfx",
                    json=payload,
                    headers={"x-api-key": MIRELO_KEY}
                )
                
                print(f"🔊 Mirelo Response Status: {resp.status_code}")
                
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    url = data.get("output_paths", [None])[0] or data.get("audio_url")
                    if url:
                        generated_variations.append(url)
                        print(f"✅ Generated variation {i+1}: {url}")
                else:
                    print(f"❌ Mirelo API Error {resp.status_code}: {resp.text}")
            except Exception as e:
                print(f"❌ Mirelo API Exception: {e}")

    return {
        "status": "success", 
        "interpretation": analysis,
        "assets": generated_variations
    }

