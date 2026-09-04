from app.ai.fallback_parser import parse_fallback_intent, extract_budget, extract_category, extract_location
from app.ai.groq_client import GroqClient
from app.db.models import QueryIntent

def test_fallback_budget_extraction():
    b1, curr1 = extract_budget("Find a hotel under ₹3000")
    assert b1 == 3000.0
    assert curr1 == "INR"

    b2, curr2 = extract_budget("Need a laptop below Rs. 45,000")
    assert b2 == 45000.0
    assert curr2 == "INR"

    b3, curr3 = extract_budget("Shoes under $150")
    assert b3 == 150.0
    assert curr3 == "USD"

def test_fallback_category_and_location():
    cat1 = extract_category("Find me a luxury hotel")
    assert cat1 == "hotel"

    cat2 = extract_category("Looking for comfortable running shoes")
    assert cat2 == "shoes"

    cat3 = extract_category("Gaming laptop with 16GB RAM")
    assert cat3 == "laptop"

    loc1 = extract_location("Hotel in Goa under 3000")
    assert loc1 == "Goa"

    loc2 = extract_location("Stay near Calangute")
    assert loc2 == "Calangute"

def test_full_fallback_parser():
    res = parse_fallback_intent("Book a hotel in Goa under ₹3000 this weekend")
    assert res.category == "hotel"
    assert res.location == "Goa"
    assert res.max_budget == 3000.0
    assert res.currency == "INR"
    assert res.date_constraint == "this weekend"
    assert res.source == "fallback"

def test_groq_client_handles_failures_gracefully(monkeypatch):
    # Simulate Groq client failure
    client = GroqClient(api_key="invalid_dummy_key")
    def mock_fail(*args, **kwargs):
        raise RuntimeError("Simulated Groq failure")
    
    if client._client:
        monkeypatch.setattr(client._client.chat.completions, "create", mock_fail)

    result = client.extract_intent("Find a hotel in Goa under 2500")
    assert result.source == "fallback"
    assert result.category == "hotel"
    assert result.location == "Goa"
    assert result.max_budget == 2500.0

def test_api_intent_create_and_retrieve(client):
    create_resp = client.post("/api/intent/create", json={"text": "Find me a hotel in Goa under 3000"})
    assert create_resp.status_code == 200
    intent_data = create_resp.json()
    assert intent_data["id"].startswith("INT-")
    assert intent_data["category"] == "hotel"
    assert intent_data["location"] == "Goa"
    assert intent_data["max_budget"] == 3000.0
    assert intent_data["source"] in ["groq", "fallback"]

    # Retrieve by ID
    get_resp = client.get(f"/api/intent/{intent_data['id']}")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()
    assert retrieved["id"] == intent_data["id"]

    # Invalid ID check
    not_found_resp = client.get("/api/intent/INT-NONEXISTENT")
    assert not_found_resp.status_code == 404

def test_api_intent_empty_input(client):
    resp = client.post("/api/intent/create", json={"text": "   "})
    assert resp.status_code == 400
