import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
import httpx


class TumaClient:
    """
    Tuma API Payment Gateway Client (https://api.tuma.co.ke).
    Provides M-PESA STK Push prompt initiation, transaction status queries,
    and webhook callback processing for live production and sandbox environments.
    """

    DEFAULT_BASE_URL = "https://api.tuma.co.ke"

    def __init__(
        self,
        api_key: Optional[str] = None,
        email: Optional[str] = None,
        account_alias: Optional[str] = None,
        base_url: Optional[str] = None,
        is_sandbox: bool = False,
    ):
        self.api_key = api_key
        self.email = email
        self.account_alias = account_alias
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self.is_sandbox = is_sandbox
        self._cached_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    @property
    def has_credentials(self) -> bool:
        return bool(self.api_key and self.email)

    async def get_access_token(self) -> str:
        """Fetches a JWT Bearer access token from Tuma API."""
        if not self.has_credentials:
            if self.is_sandbox:
                # Return mock token in test sandbox mode when credentials are not configured
                return "mock_sandbox_tuma_bearer_token"
            raise ValueError(
                "Tuma API Key and Business Email are required for live production calls. "
                "Please configure them in Business Settings -> Connections or set TUMA_API_KEY and TUMA_BUSINESS_EMAIL."
            )

        now_utc = datetime.now(timezone.utc)
        if self._cached_token and self._token_expires_at and self._token_expires_at > now_utc:
            return self._cached_token

        url = f"{self.base_url}/auth/token"
        payload = {
            "email": self.email,
            "api_key": self.api_key,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise ValueError(f"Tuma authentication failed [{resp.status_code}]: {resp.text}")
            data = resp.json()
            inner = data.get("data") if isinstance(data, dict) and isinstance(data.get("data"), dict) else data
            self._cached_token = inner.get("token") or inner.get("access_token") or data.get("token") or data.get("access_token")
            if not self._cached_token:
                raise ValueError(f"No access token found in Tuma auth response: {data}")
            # Default token lifetime: 3600s minus 60s buffer
            expires_in = data.get("expires_in", 3600)
            self._token_expires_at = datetime.fromtimestamp(
                now_utc.timestamp() + max(expires_in - 60, 60), tz=timezone.utc
            )
            return self._cached_token

    async def initiate_stk_push(
        self,
        phone_number: str,
        amount: Decimal,
        account_reference: str,
        transaction_desc: str,
        callback_url: str,
        account: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Initiates an M-PESA STK Push prompt to the payer's handset via Tuma API.
        """
        # Format phone: must be 254XXXXXXXXX
        clean_phone = phone_number.strip().replace("+", "")
        if clean_phone.startswith("0"):
            clean_phone = f"254{clean_phone[1:]}"
        elif clean_phone.startswith("7") or clean_phone.startswith("1"):
            clean_phone = f"254{clean_phone}"

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        from app.core.config import settings
        # In test mode or unconfigured sandbox, return a simulated successful initiation
        if (not self.has_credentials and self.is_sandbox) or getattr(settings, "APP_ENV", "development") == "test" or os.getenv("APP_ENV") == "test":
            checkout_id = f"ws_CO_{timestamp}_{clean_phone[-4:]}"
            return {
                "status": "success",
                "MerchantRequestID": f"MR_{timestamp}",
                "CheckoutRequestID": checkout_id,
                "merchant_request_id": f"MR_{timestamp}",
                "checkout_request_id": checkout_id,
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CustomerMessage": "Success. Request accepted for processing",
                "customer_message": "Success. Request accepted for processing",
                "is_simulated": True,
            }

        if not self.has_credentials:
            raise ValueError(
                "Live Tuma API payment gateway requires API Key and Business Email. "
                "Please configure them in Business Settings -> Connections or set TUMA_API_KEY in .env."
            )

        token = await self.get_access_token()
        url = f"{self.base_url}/payment/stk-push"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        desc = f"{account_reference} - {transaction_desc}" if account_reference else transaction_desc
        payload: Dict[str, Any] = {
            "amount": float(amount),
            "phone": clean_phone,
            "description": desc[:100],
            "callback_url": callback_url,
        }

        target_account = account or self.account_alias
        if target_account:
            payload["account"] = target_account

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code not in (200, 201, 202):
                raise ValueError(f"Tuma STK Push failed [{resp.status_code}]: {resp.text}")
            data = resp.json()

            # Normalize keys for consistent access across callers
            checkout_id = data.get("checkout_request_id") or data.get("CheckoutRequestID") or f"ws_CO_{timestamp}_{clean_phone[-4:]}"
            merchant_id = data.get("merchant_request_id") or data.get("MerchantRequestID") or f"MR_{timestamp}"
            msg = data.get("customer_message") or data.get("CustomerMessage") or data.get("message") or "Success. Request accepted for processing"

            data["checkout_request_id"] = checkout_id
            data["CheckoutRequestID"] = checkout_id
            data["merchant_request_id"] = merchant_id
            data["MerchantRequestID"] = merchant_id
            data["customer_message"] = msg
            data["CustomerMessage"] = msg
            return data

    async def query_payment_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """Queries the status of an in-flight payment via Tuma API."""
        if not self.has_credentials and self.is_sandbox:
            return {
                "status": "completed",
                "result_code": 0,
                "result_desc": "The service request is processed successfully.",
                "checkout_request_id": checkout_request_id,
                "is_simulated": True,
            }

        token = await self.get_access_token()
        url = f"{self.base_url}/payment/status/{checkout_request_id}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"Tuma status query failed [{resp.status_code}]: {resp.text}")
            return resp.json()
