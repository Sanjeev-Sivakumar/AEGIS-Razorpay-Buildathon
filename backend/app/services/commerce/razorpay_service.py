import hashlib
import hmac
import logging
from typing import Any, Dict, Optional
import httpx
from app.config.settings import get_settings

logger = logging.getLogger("aegis.commerce.razorpay")

class RazorpayService:
    """Dedicated service for Razorpay Orders API & Test Mode Operations."""

    def __init__(
        self,
        key_id: Optional[str] = None,
        key_secret: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        settings = get_settings()
        self.key_id = key_id or settings.resolved_razorpay_key_id
        self.key_secret = key_secret or settings.resolved_razorpay_key_secret
        self.base_url = (base_url or settings.RAZORPAY_BASE_URL).rstrip("/")

    @property
    def is_configured(self) -> bool:
        return bool(self.key_id and self.key_secret)

    def create_order(
        self,
        amount: float,
        currency: str = "INR",
        receipt: Optional[str] = None,
        notes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a Razorpay Test Order. Amount is converted to smallest currency unit (paise)."""
        if not self.is_configured:
            logger.warning("Razorpay credentials not configured. Generating test-mode simulated order ID.")
            return {
                "id": f"order_test_{receipt or 'simulated'}",
                "entity": "order",
                "amount": int(round(amount * 100)),
                "currency": currency,
                "status": "created",
                "receipt": receipt,
                "notes": notes or {},
            }

        # Amount in paise (integer)
        amount_paise = int(round(amount * 100))
        url = f"{self.base_url}/orders"
        payload = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": receipt or "",
            "notes": notes or {},
        }

        logger.info(f"Dispatching Razorpay Order request: {url}, amount={amount_paise} paise, receipt={receipt}")
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    url,
                    json=payload,
                    auth=(self.key_id, self.key_secret),
                )
                if response.status_code not in (200, 201):
                    err_msg = f"Razorpay API Error ({response.status_code}): {response.text}"
                    logger.error(err_msg)
                    raise RuntimeError(err_msg)

                data = response.json()
                logger.info(f"Razorpay Order successfully created: {data.get('id')}")
                return data

        except httpx.RequestError as e:
            logger.error(f"Network error communicating with Razorpay API: {e}")
            raise RuntimeError(f"Razorpay Network Error: {str(e)}")
        except Exception as e:
            if isinstance(e, RuntimeError):
                raise
            logger.error(f"Unexpected error communicating with Razorpay API: {e}")
            raise RuntimeError(f"Razorpay Error: {str(e)}")

    def fetch_order(self, order_id: str) -> Dict[str, Any]:
        """Fetch details of an existing Razorpay order from the API."""
        if not self.is_configured:
            return {
                "id": order_id,
                "entity": "order",
                "status": "created",
                "simulated": True,
            }

        url = f"{self.base_url}/orders/{order_id}"
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url, auth=(self.key_id, self.key_secret))
                if response.status_code != 200:
                    raise RuntimeError(f"Razorpay fetch order error ({response.status_code}): {response.text}")
                return response.json()
        except httpx.RequestError as e:
            raise RuntimeError(f"Network error fetching Razorpay order: {str(e)}")

    def fetch_payment(self, payment_id: str) -> Dict[str, Any]:
        """Fetch status and details of a specific payment ID from Razorpay."""
        if not self.is_configured:
            return {
                "id": payment_id,
                "entity": "payment",
                "status": "captured",
                "simulated": True,
            }

        url = f"{self.base_url}/payments/{payment_id}"
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url, auth=(self.key_id, self.key_secret))
                if response.status_code != 200:
                    raise RuntimeError(f"Razorpay fetch payment error ({response.status_code}): {response.text}")
                return response.json()
        except httpx.RequestError as e:
            raise RuntimeError(f"Network error fetching Razorpay payment: {str(e)}")

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """
        Verify Razorpay payment signature using HMAC SHA-256 with key secret.
        Formula: HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
        """
        if not self.key_secret:
            logger.warning("Razorpay key secret not configured; bypassing signature check in mock mode.")
            return True

        body = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
        expected_signature = hmac.new(
            self.key_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_signature, razorpay_signature)

    @staticmethod
    def get_test_values_reference() -> Dict[str, Any]:
        """
        Authoritative reference of test values in Razorpay Test Mode
        defining when payments are ACCEPTED vs BLOCKED.
        """
        return {
            "razorpay_gateway_test_mode": {
                "accepted_values": [
                    {
                        "method": "CARD",
                        "card_type": "Visa Success",
                        "card_number": "4111 1111 1111 1111",
                        "expiry": "Future (e.g. 12/28)",
                        "cvv": "123",
                        "otp": "1234 or click 'Success' on emulator",
                        "outcome": "ACCEPTED",
                        "behavior": "Instant successful authorization and capture"
                    },
                    {
                        "method": "CARD",
                        "card_type": "Visa Alternative",
                        "card_number": "4012 0000 0000 0002",
                        "expiry": "Future (e.g. 12/28)",
                        "cvv": "123",
                        "otp": "Success",
                        "outcome": "ACCEPTED",
                        "behavior": "Instant successful authorization"
                    },
                    {
                        "method": "CARD",
                        "card_type": "Mastercard Success",
                        "card_number": "5123 4567 8901 2346",
                        "expiry": "Future",
                        "cvv": "123",
                        "otp": "Success",
                        "outcome": "ACCEPTED",
                        "behavior": "Instant successful authorization"
                    },
                    {
                        "method": "UPI",
                        "upi_type": "Success Virtual Private Address",
                        "vpa": "success@razorpay",
                        "outcome": "ACCEPTED",
                        "behavior": "Simulated instant approval of UPI collect intent"
                    },
                    {
                        "method": "NETBANKING",
                        "bank": "Any Test Bank (HDFC, ICICI, SBI)",
                        "action": "Click 'Success' on Razorpay bank emulator",
                        "outcome": "ACCEPTED",
                        "behavior": "Redirects back with authentic payment signature"
                    }
                ],
                "blocked_values": [
                    {
                        "method": "CARD",
                        "card_type": "Declined by Bank",
                        "card_number": "4000 0000 0000 0002",
                        "expiry": "Future",
                        "cvv": "123",
                        "outcome": "BLOCKED",
                        "reason": "Payment was declined by the bank (Card decline simulation)",
                        "error_code": "BAD_REQUEST_ERROR"
                    },
                    {
                        "method": "CARD",
                        "card_type": "Expired Card",
                        "card_number": "4000 0000 0000 0005",
                        "expiry": "Any future/past",
                        "cvv": "123",
                        "outcome": "BLOCKED",
                        "reason": "Your card has expired (Expired card simulation)",
                        "error_code": "BAD_REQUEST_ERROR"
                    },
                    {
                        "method": "CARD",
                        "card_type": "Insufficient Funds",
                        "card_number": "4000 0000 0000 0026",
                        "expiry": "Future",
                        "cvv": "123",
                        "outcome": "BLOCKED",
                        "reason": "Insufficient funds in bank account",
                        "error_code": "BAD_REQUEST_ERROR"
                    },
                    {
                        "method": "CARD",
                        "card_type": "Invalid Expiry / CVV",
                        "card_number": "4111 1111 1111 1111",
                        "expiry": "01/20 (Past)",
                        "cvv": "12",
                        "outcome": "BLOCKED",
                        "reason": "Card validation failure prior to dispatch",
                        "error_code": "VALIDATION_ERROR"
                    },
                    {
                        "method": "UPI",
                        "upi_type": "Failure Virtual Private Address",
                        "vpa": "failure@razorpay",
                        "outcome": "BLOCKED",
                        "reason": "Collect request rejected by test VPA emulator",
                        "error_code": "GATEWAY_ERROR"
                    },
                    {
                        "method": "3D_SECURE",
                        "action": "Click 'Failure' button on 3D Secure emulator screen",
                        "outcome": "BLOCKED",
                        "reason": "Cardholder authentication failed",
                        "error_code": "AUTHENTICATION_FAILED"
                    }
                ]
            },
            "aegis_solution_invariant_gate": {
                "accepted_values": [
                    {
                        "dimension": "Amount / Budget Ceiling",
                        "value": "₹2,400 (Within max_budget ₹3,000)",
                        "gate_decision": "PASS",
                        "razorpay_action": "Order created in Razorpay Test Mode",
                        "funds_debited": "₹2,400"
                    },
                    {
                        "dimension": "Recipient / Merchant",
                        "value": "Whitelisted verified merchant ('GoaStay Resort')",
                        "gate_decision": "PASS",
                        "razorpay_action": "Order created in Razorpay Test Mode",
                        "funds_debited": "₹2,400"
                    },
                    {
                        "dimension": "Category Scope",
                        "value": "Category matches root intent ('hotel' / 'travel')",
                        "gate_decision": "PASS",
                        "razorpay_action": "Order created in Razorpay Test Mode",
                        "funds_debited": "₹2,400"
                    },
                    {
                        "dimension": "Cryptographic Derivation",
                        "value": "Intact SHA-256 HMAC Merkle lineage chain",
                        "gate_decision": "PASS",
                        "razorpay_action": "Order created in Razorpay Test Mode",
                        "funds_debited": "₹2,400"
                    }
                ],
                "blocked_values": [
                    {
                        "dimension": "Amount Escalation",
                        "value": "₹12,000 (Exceeds max_budget ₹3,000)",
                        "gate_decision": "BLOCK",
                        "policy_violation": "Hard Budget Ceiling Exceeded",
                        "razorpay_action": "Suppressed (0 API calls made)",
                        "funds_debited": "₹0.00 (Zero Money Moved)"
                    },
                    {
                        "dimension": "Recipient Substitution",
                        "value": "HACKER_CONTROLLED_ENTITY_X",
                        "gate_decision": "BLOCK",
                        "policy_violation": "Recipient Bound Invariant Violated",
                        "razorpay_action": "Suppressed (0 API calls made)",
                        "funds_debited": "₹0.00 (Zero Money Moved)"
                    },
                    {
                        "dimension": "Category Substitution",
                        "value": "luxury-flight (on hotel budget mandate)",
                        "gate_decision": "BLOCK",
                        "policy_violation": "Category Scope Invariant Violated",
                        "razorpay_action": "Suppressed (0 API calls made)",
                        "funds_debited": "₹0.00 (Zero Money Moved)"
                    },
                    {
                        "dimension": "Derivation Tampering",
                        "value": "parent_step: NONE (Severed causal lineage hash)",
                        "gate_decision": "BLOCK",
                        "policy_violation": "Causal Lineage Hash Broken",
                        "razorpay_action": "Suppressed (0 API calls made)",
                        "funds_debited": "₹0.00 (Zero Money Moved)"
                    }
                ]
            }
        }
