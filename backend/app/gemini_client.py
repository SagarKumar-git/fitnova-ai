import json
import httpx
from typing import Tuple, Optional, Any
from app.config import settings

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

def call_gemini_api(
    prompt: str,
    json_mode: bool = True,
    image_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None
) -> Tuple[Optional[str], int, int, bool]:
    """
    Sends a prompt and optional image bytes to the Gemini API via httpx, handles JSON configuration options,
    tracks token usages, and returns a tuple: (response_text, input_tokens, output_tokens, success).
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("[Gemini Client] API Key is missing. Falling back to rule-based engine.")
        return None, 0, 0, False

    # Construct the query URL
    url = f"{GEMINI_API_URL}?key={api_key}"
    
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

    try:
        # Perform request with standard 20 second timeout
        with httpx.Client(timeout=20.0) as client:
            response = client.post(url, json=payload, headers={"Content-Type": "application/json"})
            
        if response.status_code != 200:
            print(f"[Gemini Client] Non-200 status received: {response.status_code} - {response.text}")
            return None, 0, 0, False
            
        data = response.json()
        
        # Verify candidate exists
        candidates = data.get("candidates", [])
        if not candidates:
            print("[Gemini Client] Empty response candidates list")
            return None, 0, 0, False
            
        # Extract text response
        candidate = candidates[0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])
        if not parts:
            print("[Gemini Client] Empty response parts list")
            return None, 0, 0, False
            
        response_text = parts[0].get("text")
        
        # Parse token usage metadata
        usage_metadata = data.get("usageMetadata", {})
        input_tokens = usage_metadata.get("promptTokenCount", 0)
        output_tokens = usage_metadata.get("candidatesTokenCount", 0)
        
        return response_text, input_tokens, output_tokens, True
        
    except Exception as e:
        print(f"[Gemini Client] API request encountered error: {e}")
        return None, 0, 0, False
