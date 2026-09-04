import re
from typing import Optional, Tuple
from app.schemas.intent import IntentExtractionResult

CATEGORY_KEYWORDS = {
    "restaurant": ["restaurants", "restaurant", "dining", "dinner", "lunch", "food", "bistro", "eatery", "cafe", "coffee", "coffee shops", "coffee shop"],
    "hotel": ["hotel", "resort", "inn", "stay", "villa", "hostel", "homestay", "lodge", "room"],
    "shoes": ["running shoes", "shoes", "sneakers", "footwear", "boots", "trainers"],
    "laptop": ["laptop", "notebook", "ultrabook", "macbook", "computer", "pc"],
    "phone": ["phone", "smartphone", "iphone", "android", "mobile"],
    "headphones": ["headphones", "earphones", "earbuds", "headset"],
    "watch": ["watch", "smartwatch", "timepiece"],
    "flight": ["flight", "airfare", "plane ticket", "airline"],
}

LOCATION_KEYWORDS = ["nearby", "near me", "around here", "local"]

DATE_PATTERNS = [
    r"\b(this\s+weekend)\b",
    r"\b(next\s+weekend)\b",
    r"\b(tomorrow)\b",
    r"\b(tonight)\b",
    r"\b(next\s+week)\b",
    r"\b(next\s+month)\b",
    r"\b(today)\b",
]

BUDGET_PATTERNS = [
    # "under ₹3000", "below 3,000", "less than Rs 3000", "max budget 3000"
    r"(?:under|below|less than|max|budget|within|up to)\s*(?:₹|rs\.?|inr|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)",
    # "₹3000", "Rs. 3000"
    r"(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)",
    # "$300"
    r"\$\s*(\d+(?:,\d+)*(?:\.\d+)?)",
]

def extract_budget(text: str) -> Tuple[Optional[float], str]:
    text_lower = text.lower()
    currency = "INR"
    if "$" in text:
        currency = "USD"
    elif "€" in text:
        currency = "EUR"

    for pattern in BUDGET_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            raw_val = match.group(1).replace(",", "")
            try:
                return float(raw_val), currency
            except ValueError:
                pass
    return None, currency

def extract_category(text: str) -> Optional[str]:
    text_lower = text.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                return cat

    # Fallback to first non-stop noun before budget/location prepositions
    tokens = re.findall(r"\b[a-zA-Z]+\b", text_lower)
    skip = {
        "find", "book", "get", "buy", "order", "search", "best", "cheap", "good",
        "top", "under", "below", "in", "at", "near", "nearby", "for", "with"
    }
    candidates = [t for t in tokens if t not in skip]
    if candidates:
        return candidates[0]
    return None

STOP_WORDS = {
    "the", "a", "an", "this", "next", "under", "below", "less", "budget",
    "with", "for", "near", "at", "in", "hotel", "resort", "inn", "shoes",
    "laptop", "weekend", "today", "tomorrow", "tonight", "week", "month",
    "restaurants", "restaurant", "food", "phone", "best"
}

def extract_location(text: str) -> Optional[str]:
    text_lower = text.lower()
    for kw in LOCATION_KEYWORDS:
        if kw in text_lower:
            return "NEARBY"

    pattern = r"\b(?:in|at|around|near)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        words = match.group(1).split()
        loc_words = []
        for w in words:
            if w.lower() in STOP_WORDS or re.search(r"\d", w):
                break
            loc_words.append(w)
        if loc_words:
            return " ".join(loc_words).title()
    return None

def extract_date_constraint(text: str) -> Optional[str]:
    text_lower = text.lower()
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            return match.group(1)
    return None

def parse_fallback_intent(raw_text: str) -> IntentExtractionResult:
    """Deterministic fallback parser for extracting intent when Groq is unavailable."""
    budget, currency = extract_budget(raw_text)
    category = extract_category(raw_text)
    location = extract_location(raw_text)
    date_constraint = extract_date_constraint(raw_text)

    return IntentExtractionResult(
        category=category,
        location=location,
        max_budget=budget,
        currency=currency,
        attributes=[],
        date_constraint=date_constraint,
        source="fallback",
        raw_text=raw_text,
    )
