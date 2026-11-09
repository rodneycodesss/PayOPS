import base64
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
import httpx


class DarajaClient:
    """
    Safaricom M-PESA Daraja API Client.
    Supports Sandbox and Production environments for STK Push (Lipa Na M-PESA Online),
    C2B (Customer to Business), and Transaction Status Queries.
    """

    SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
    PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"

    # Default Daraja Sandbox credentials for test shortcode 174379
    DEFAULT_SANDBOX_SHORTCODE = "174379"
    DEFAULT_SANDBOX_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"

    def __init__(
        self,
        consumer_key: Optional[str] = None,
        consumer_secret: Optional[str] = None,
        shortcode: Optional[str] = None,
        passkey: Optional[str] = None,
        is_sandbox: bool = True,
    ):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.shortcode = shortcode or (self.DEFAULT_SANDBOX_SHORTCODE if is_sandbox else "")
        self.passkey = passkey or (self.DEFAULT_SANDBOX_PASSKEY if is_sandbox else "")
        self.is_sandbox = is_sandbox
        self.base_url = self.SANDBOX_BASE_URL if is_sandbox else self.PRODUCTION_BASE_URL
        self._cached_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    @property
    def has_credentials(self) -> bool:
        return bool(self.consumer_key and self.consumer_secret)

    async def get_access_token(self) -> str:
        """Fetches an OAuth2 bearer access token from Daraja."""
        if not self.has_credentials:
            if self.is_sandbox:
                # Mock token for test sandbox mode when credentials not configured
                return "mock_sandbox_daraja_bearer_token"
            raise ValueError("M-PESA Daraja consumer key and secret are required for live production calls.")

        now_utc = datetime.now(timezone.utc)
        if self._cached_token and self._token_expires_at and self._token_expires_at > now_utc:
            return self._cached_token

        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        creds_str = f"{self.consumer_key}:{self.consumer_secret}"
        encoded_creds = base64.b64encode(creds_str.encode()).decode("utf-8")

        headers = {
            "Authorization": f"Basic {encoded_creds}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"Daraja OAuth failed [{resp.status_code}]: {resp.text}")
            data = resp.json()
            self._cached_token = data["access_token"]
            return self._cached_token

    def _generate_password(self, timestamp: str) -> str:
        """Generates Daraja base64 password from shortcode + passkey + timestamp."""
        raw = f"{self.shortcode}{self.passkey}{timestamp}"
        return base64.b64encode(raw.encode()).decode("utf-8")

    async def initiate_stk_push(
        self,
        phone_number: str,
        amount: Decimal,
        account_reference: str,
        transaction_desc: str,
        callback_url: str,
    ) -> Dict[str, Any]:
        """
        Initiates an M-PESA STK Push prompt to the payer's handset.
        """
        # Format phone: must be 254XXXXXXXXX
        clean_phone = phone_number.strip().replace("+", "")
        if clean_phone.startswith("0"):
            clean_phone = f"254{clean_phone[1:]}"
        elif clean_phone.startswith("7") or clean_phone.startswith("1"):
            clean_phone = f"254{clean_phone}"

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = self._generate_password(timestamp)

        # In unconfigured sandbox environment, return a simulated successful initiation
        if not self.has_credentials and self.is_sandbox:
            checkout_id = f"ws_CO_{timestamp}_{clean_phone[-4:]}"
            return {
                "MerchantRequestID": f"MR_{timestamp}",
                "CheckoutRequestID": checkout_id,
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CustomerMessage": "Success. Request accepted for processing",
                "is_simulated": True,
            }

        token = await self.get_access_token()
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline" if len(self.shortcode) == 6 else "CustomerBuyGoodsOnline",
            "Amount": int(amount),
            "PartyA": clean_phone,
            "PartyB": self.shortcode,
            "PhoneNumber": clean_phone,
            "CallBackURL": callback_url,
            "AccountReference": account_reference[:12],
            "TransactionDesc": transaction_desc[:13],
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise ValueError(f"Daraja STK push failed [{resp.status_code}]: {resp.text}")
            return resp.json()

    async def query_stk_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """Queries the status of an in-flight STK Push request."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = self._generate_password(timestamp)

        if not self.has_credentials and self.is_sandbox:
            return {
                "ResponseCode": "0",
                "ResponseDescription": "The service request has been accepted successfully",
                "MerchantRequestID": f"MR_{timestamp}",
                "CheckoutRequestID": checkout_request_id,
                "ResultCode": "0",
                "ResultDesc": "The service request is processed successfully.",
                "is_simulated": True,
            }

        token = await self.get_access_token()
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            return resp.json()
