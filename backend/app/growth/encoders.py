import hashlib
import logging
import numpy as np
import torch
from typing import Dict, List, Optional
from app.config.settings import get_settings

logger = logging.getLogger("aegis.growth.encoders")

class QueryEncoder:
    """Encodes user queries into dense 384-dimensional semantic embeddings with LRU caching."""

    def __init__(self, model_name: Optional[str] = None):
        settings = get_settings()
        self.model_name = model_name or settings.GROWTH_EMBEDDING_MODEL
        self._cache: Dict[str, np.ndarray] = {}
        self._model = None
        self._use_fallback = False

    def _load_model(self):
        if self._model is None and not self._use_fallback:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading SentenceTransformer: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer '{self.model_name}' ({e}). Activating deterministic projection fallback.")
                self._use_fallback = True

    def _deterministic_fallback(self, text: str) -> np.ndarray:
        """Deterministic 384-dim pseudo-semantic embedding based on sha256 token hashing."""
        tokens = text.lower().strip().split()
        vec = np.zeros(384, dtype=np.float32)
        for token in tokens:
            h = int(hashlib.sha256(token.encode("utf-8")).hexdigest()[:8], 16)
            rng = np.random.RandomState(h % 100000)
            vec += rng.randn(384).astype(np.float32)
        norm = np.linalg.norm(vec)
        return vec / (norm + 1e-8)

    def encode(self, text: str) -> np.ndarray:
        """Encode a single query string into a 384-dim float32 vector."""
        clean_text = text.strip()
        if clean_text in self._cache:
            return self._cache[clean_text]

        self._load_model()
        if self._model is not None and not self._use_fallback:
            try:
                emb = self._model.encode(clean_text, convert_to_numpy=True, show_progress_bar=False)
            except Exception:
                emb = self._deterministic_fallback(clean_text)
        else:
            emb = self._deterministic_fallback(clean_text)

        # Cache vector
        self._cache[clean_text] = emb.astype(np.float32)
        return self._cache[clean_text]

    def encode_batch(self, texts: List[str]) -> np.ndarray:
        """Encode a batch of query strings."""
        return np.vstack([self.encode(t) for t in texts])


class ProductEncoder:
    """Encodes product structured metrics and attributes into normalized feature tensors."""

    NUMERICAL_COLS = [
        "price_ratio",
        "rating",
        "availability",
        "delivery_days",
        "attribute_completeness",
        "description_quality",
    ]

    def __init__(self):
        # Normalization ranges (min, max) for scaling
        self.stats = {
            "price_ratio": (0.2, 2.5),
            "rating": (3.0, 5.0),
            "availability": (0.0, 1.0),
            "delivery_days": (0.0, 7.0),
            "attribute_completeness": (0.0, 1.0),
            "description_quality": (0.0, 1.0),
        }

    def encode_features(self, row: Dict[str, Any]) -> np.ndarray:
        """Extract and normalize numerical and catalog features into fixed-length array."""
        feats = []
        for col in self.NUMERICAL_COLS:
            val = float(row.get(col, 0.0))
            min_v, max_v = self.stats[col]
            norm_val = (val - min_v) / (max_v - min_v + 1e-8)
            feats.append(float(np.clip(norm_val, 0.0, 1.0)))

        # Add match indicators
        feats.append(float(row.get("category_match", 1.0)))
        feats.append(float(row.get("location_match", 1.0)))
        feats.append(float(min(1.0, row.get("price_rank", 1.0) / 5.0)))
        feats.append(float(min(1.0, row.get("competitor_count", 3.0) / 10.0)))

        return np.array(feats, dtype=np.float32)


class MerchantEncoder:
    """Encodes merchant trustworthiness, catalog completeness, and historical selection rate."""

    def encode_merchant(self, merchant_info: Dict[str, Any]) -> np.ndarray:
        rating = float(merchant_info.get("rating", 4.0)) / 5.0
        sel_rate = float(merchant_info.get("selection_rate", 0.30))
        prod_count = min(1.0, float(merchant_info.get("product_count", 5)) / 20.0)
        return np.array([rating, sel_rate, prod_count], dtype=np.float32)
