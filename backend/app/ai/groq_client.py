import json
import logging
from typing import Optional
from groq import Groq
from app.config.settings import get_settings
from app.schemas.intent import IntentExtractionResult
from app.ai.prompts import INTENT_EXTRACTION_SYSTEM_PROMPT, get_intent_user_prompt
from app.ai.fallback_parser import parse_fallback_intent

logger = logging.getLogger("aegis.ai.groq")

class GroqClient:
    def __init__(self, api_key: Optional[str] = None):
        self.settings = get_settings()
        self.api_key = api_key or self.settings.GROQ_API_KEY
        self._client: Optional[Groq] = None
        if self.api_key:
            try:
                self._client = Groq(
                    api_key=self.api_key,
                    timeout=self.settings.GROQ_TIMEOUT_SECONDS,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")
                self._client = None

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self._client is not None)

    def extract_intent(self, raw_text: str) -> IntentExtractionResult:
        """Extract structured intent from raw text. Uses Groq if configured, falls back deterministically."""
        if not self.is_configured:
            logger.info("Groq is not configured; using deterministic fallback parser.")
            return parse_fallback_intent(raw_text)

        try:
            logger.info(f"Invoking Groq model '{self.settings.GROQ_MODEL}' for intent extraction...")
            chat_completion = self._client.chat.completions.create(
                messages=[
                    {"role": "system", "content": INTENT_EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": get_intent_user_prompt(raw_text)},
                ],
                model=self.settings.GROQ_MODEL,
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            response_content = chat_completion.choices[0].message.content
            if not response_content:
                raise ValueError("Received empty response from Groq")

            data = json.loads(response_content)

            # Validate against Pydantic schema
            extracted = IntentExtractionResult(
                category=data.get("category"),
                location=data.get("location"),
                max_budget=float(data["max_budget"]) if data.get("max_budget") is not None else None,
                currency=data.get("currency", "INR"),
                attributes=data.get("attributes", []) if isinstance(data.get("attributes"), list) else [],
                date_constraint=data.get("date_constraint"),
                source="groq",
                raw_text=raw_text,
            )
            return extracted

        except Exception as e:
            logger.warning(f"Groq intent extraction failed ({e}); falling back to deterministic parser.")
            return parse_fallback_intent(raw_text)

_groq_client_instance: Optional[GroqClient] = None

def get_groq_client() -> GroqClient:
    global _groq_client_instance
    if _groq_client_instance is None:
        _groq_client_instance = GroqClient()
    return _groq_client_instance
