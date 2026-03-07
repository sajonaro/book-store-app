import yaml
from pathlib import Path

_config = None
CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"


def load_config() -> dict:
    """Load config from YAML. Cached after first load."""
    global _config
    if _config is None:
        with open(CONFIG_PATH) as f:
            _config = yaml.safe_load(f)
    return _config


def get_openai_config() -> dict:
    return load_config().get("openai", {})
