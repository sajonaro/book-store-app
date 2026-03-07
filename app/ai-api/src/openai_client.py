import json
from openai import OpenAI
from pathlib import Path
from src.config import get_openai_config


def get_api_key() -> str:
    """Get API key from file specified in config."""
    cfg = get_openai_config()
    key_file = cfg.get("api_key_file")
    if not key_file:
        raise ValueError("api_key_file not configured in config.yaml")

    path = Path(key_file)
    if not path.exists():
        raise FileNotFoundError(f"API key file not found: {key_file}")

    return path.read_text().strip()


def create_client() -> OpenAI:
    return OpenAI(api_key=get_api_key())


def analyze_image(client: OpenAI, image_base64: str, prompt: str, mime_type: str = "image/png") -> dict:
    cfg = get_openai_config()

    response = client.chat.completions.create(
        model=cfg.get("model", "gpt-4o"),
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_base64}",
                            "detail": cfg.get("image_detail", "high")
                        }
                    }
                ]
            }
        ],
        max_tokens=cfg.get("max_tokens", 4096),
        temperature=cfg.get("temperature", 0)
    )

    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(content[start:end])
        raise ValueError(f"Failed to parse JSON from response: {content}")


def analyze_multiple_images(client: OpenAI, images: list[dict], prompt: str) -> dict:
    cfg = get_openai_config()

    content = [{"type": "text", "text": prompt}]
    for img in images:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img['mime_type']};base64,{img['base64']}",
                "detail": cfg.get("image_detail", "high")
            }
        })

    response = client.chat.completions.create(
        model=cfg.get("model", "gpt-4o"),
        messages=[{"role": "user", "content": content}],
        max_tokens=cfg.get("max_tokens", 4096),
        temperature=cfg.get("temperature", 0)
    )

    resp_content = response.choices[0].message.content
    try:
        return json.loads(resp_content)
    except json.JSONDecodeError:
        start = resp_content.find("{")
        end = resp_content.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(resp_content[start:end])
        raise ValueError(f"Failed to parse JSON: {resp_content}")
