import json
import httpx
from typing import Tuple, Optional, Any
from app.config import settings

DEFAULT_GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
]

def get_candidate_models() -> list[str]:
    configured = getattr(settings, "GEMINI_MODEL", None)
    models = []
    if configured and configured.strip():
        models.append(configured.strip())
    for m in DEFAULT_GEMINI_MODELS:
        if m not in models:
            models.append(m)
    return models

def call_gemini_api(
    prompt: str,
    json_mode: bool = True,
    image_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None
) -> Tuple[Optional[str], int, int, bool]:
    """
    Sends a prompt and optional image bytes to the Gemini API via httpx, handles JSON configuration options,
    tracks token usages, and returns a tuple: (response_text, input_tokens, output_tokens, success).
    Includes automatic fallback across available Gemini models if a specific model returns 404 or error.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("[Gemini Client] API Key is missing. Falling back to rule-based engine.")
        return None, 0, 0, False

    parts = []
    if image_bytes and mime_type:
        import base64
        base64_data = base64.b64encode(image_bytes).decode("utf-8")
        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": base64_data
            }
        })
    parts.append({
        "text": prompt
    })

    # Payload parameters
    payload = {
        "contents": [
            {
                "parts": parts
            }
        ]
    }
    
    if json_mode:
        payload["generationConfig"] = {
            "responseMimeType": "application/json"
        }

    candidate_models = get_candidate_models()
    for model_name in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(url, json=payload, headers={"Content-Type": "application/json"})
                
            if response.status_code == 404 or (response.status_code == 400 and "not found" in response.text.lower()):
                print(f"[Gemini Client] Model {model_name} not available ({response.status_code}). Trying next fallback model...")
                continue
                
            if response.status_code != 200:
                print(f"[Gemini Client] Non-200 status received from {model_name}: {response.status_code} - {response.text}")
                continue
                
            data = response.json()
            
            # Verify candidate exists
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"[Gemini Client] Empty response candidates list from {model_name}")
                continue
                
            # Extract text response
            candidate = candidates[0]
            content = candidate.get("content", {})
            parts = content.get("parts", [])
            if not parts:
                print(f"[Gemini Client] Empty response parts list from {model_name}")
                continue
                
            response_text = parts[0].get("text")
            
            # Parse token usage metadata
            usage_metadata = data.get("usageMetadata", {})
            input_tokens = usage_metadata.get("promptTokenCount", 0)
            output_tokens = usage_metadata.get("candidatesTokenCount", 0)
            
            return response_text, input_tokens, output_tokens, True
            
        except Exception as e:
            print(f"[Gemini Client] Error calling {model_name}: {e}. Trying next model...")
            continue

    print("[Gemini Client] All models exhausted or failed. Falling back.")
    return None, 0, 0, False
