import os
import pytest
from unittest.mock import patch, MagicMock
from app.services.commerce.razorpay_service import RazorpayService

def test_razorpay_amount_conversion_to_paise():
    """Verify amount in INR is converted accurately to integer paise."""
    rzp = RazorpayService(key_id="rzp_test_mock", key_secret="mock_secret")

    with patch("httpx.Client.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "order_mock_123",
            "amount": 240000,
            "currency": "INR",
            "status": "created",
        }
        mock_post.return_value = mock_response

        res = rzp.create_order(amount=2400.0, currency="INR", receipt="PROP-1")
        assert res["id"] == "order_mock_123"
        assert res["amount"] == 240000

        # Check payload passed to httpx
        call_kwargs = mock_post.call_args[1]
        assert call_kwargs["json"]["amount"] == 240000
        assert call_kwargs["json"]["currency"] == "INR"

def test_razorpay_network_error_handling():
    """Network failure must raise a clean RuntimeError, not crash unhandled."""
    rzp = RazorpayService(key_id="rzp_test_mock", key_secret="mock_secret")

    with patch("httpx.Client.post", side_effect=Exception("Connection refused")):
        with pytest.raises(RuntimeError) as exc_info:
            rzp.create_order(amount=100.0)
        assert "Razorpay" in str(exc_info.value)

@pytest.mark.skipif(
    os.getenv("RAZORPAY_INTEGRATION_TEST") != "true",
    reason="Skipped: RAZORPAY_INTEGRATION_TEST not set to 'true'",
)
def test_razorpay_live_testmode_integration():
    """Live integration test against Razorpay Test API (only runs when flag set)."""
    rzp = RazorpayService()
    assert rzp.is_configured, "Razorpay credentials not configured for live test"
    res = rzp.create_order(amount=100.0, receipt="TEST_INTEGRATION_001")
    assert res.get("id") is not None
    assert res.get("id").startswith("order_")

def test_razorpay_signature_verification():
    """Verify HMAC SHA-256 signature verification accepts authentic signatures and blocks forged ones."""
    import hashlib
    import hmac

    secret = "test_secret_key_12345"
    rzp = RazorpayService(key_id="rzp_test_mock", key_secret=secret)

    order_id = "order_test_98765"
    payment_id = "pay_test_54321"
    body = f"{order_id}|{payment_id}".encode("utf-8")
    valid_signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

    # Valid signature must verify True (ACCEPTED)
    assert rzp.verify_payment_signature(order_id, payment_id, valid_signature) is True

    # Forged or tampered signature must verify False (BLOCKED)
    assert rzp.verify_payment_signature(order_id, payment_id, "forged_signature_hex_123") is False
    assert rzp.verify_payment_signature("different_order_id", payment_id, valid_signature) is False

def test_razorpay_fetch_order_and_payment():
    """Verify fetch_order and fetch_payment return parsed response."""
    rzp = RazorpayService(key_id="rzp_test_mock", key_secret="mock_secret")

    with patch("httpx.Client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"id": "order_123", "status": "paid", "amount": 240000}
        mock_get.return_value = mock_resp

        order = rzp.fetch_order("order_123")
        assert order["id"] == "order_123"
        assert order["status"] == "paid"

def test_razorpay_test_values_matrix():
    """Verify get_test_values_reference includes both gateway and solution matrices."""
    matrix = RazorpayService.get_test_values_reference()
    assert "razorpay_gateway_test_mode" in matrix
    assert "aegis_solution_invariant_gate" in matrix

    gateway = matrix["razorpay_gateway_test_mode"]
    assert len(gateway["accepted_values"]) > 0
    assert len(gateway["blocked_values"]) > 0

    # Ensure classic 4111 1111 1111 1111 is in accepted
    accepted_cards = [v.get("card_number") for v in gateway["accepted_values"] if "card_number" in v]
    assert "4111 1111 1111 1111" in accepted_cards

    # Ensure 4000 0000 0000 0002 is in blocked
    blocked_cards = [v.get("card_number") for v in gateway["blocked_values"] if "card_number" in v]
    assert "4000 0000 0000 0002" in blocked_cards

