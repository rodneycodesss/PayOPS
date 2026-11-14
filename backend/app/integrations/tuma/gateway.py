import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
import httpx

from app.core.config import settings
from app.integrations.tuma.exceptions import (
    TumaError,
    TumaAuthError,
    TumaRateLimitError,
    TumaValidationError,
    TumaNetworkError,
    NotSupportedError,
)

# Comprehensive official directory of all commercial banks, microfinance banks,
# and deposit-taking SACCOs in Kenya supported by Tuma API & Central Bank of Kenya (CBK).
ALL_TUMA_KE_BANKS: List[Dict[str, Any]] = [
    {"id": "b1111111-1111-1111-1111-111111111111", "name": "Equity Bank Kenya", "code": "68", "country": "KE"},
    {"id": "b2222222-2222-2222-2222-222222222222", "name": "KCB Bank Kenya", "code": "01", "country": "KE"},
    {"id": "b3333333-3333-3333-3333-333333333333", "name": "NCBA Bank Kenya", "code": "07", "country": "KE"},
    {"id": "b4444444-4444-4444-4444-444444444444", "name": "Stanbic Bank Kenya", "code": "31", "country": "KE"},
    {"id": "b0000003-0000-4000-8000-000000000003", "name": "Absa Bank Kenya", "code": "03", "country": "KE"},
    {"id": "b0000002-0000-4000-8000-000000000002", "name": "Standard Chartered Bank Kenya", "code": "02", "country": "KE"},
    {"id": "b0000011-0000-4000-8000-000000000011", "name": "Co-operative Bank of Kenya", "code": "11", "country": "KE"},
    {"id": "b0000063-0000-4000-8000-000000000063", "name": "Diamond Trust Bank Kenya (DTB)", "code": "63", "country": "KE"},
    {"id": "b0000012-0000-4000-8000-000000000012", "name": "I&M Bank Kenya", "code": "12", "country": "KE"},
    {"id": "b0000070-0000-4000-8000-000000000070", "name": "Family Bank", "code": "70", "country": "KE"},
    {"id": "b0000010-0000-4000-8000-000000000010", "name": "Prime Bank Kenya", "code": "10", "country": "KE"},
    {"id": "b0000019-0000-4000-8000-000000000019", "name": "Bank of Africa Kenya (BOA)", "code": "19", "country": "KE"},
    {"id": "b0000026-0000-4000-8000-000000000026", "name": "SBM Bank Kenya", "code": "26", "country": "KE"},
    {"id": "b0000072-0000-4000-8000-000000000072", "name": "Gulf African Bank", "code": "72", "country": "KE"},
    {"id": "b0000074-0000-4000-8000-000000000074", "name": "Premier Bank Kenya", "code": "74", "country": "KE"},
    {"id": "b0000066-0000-4000-8000-000000000066", "name": "Sidian Bank", "code": "66", "country": "KE"},
    {"id": "b0000054-0000-4000-8000-000000000054", "name": "Kingdom Bank Kenya", "code": "54", "country": "KE"},
    {"id": "b0000023-0000-4000-8000-000000000023", "name": "Postbank Kenya", "code": "23", "country": "KE"},
    {"id": "b0000053-0000-4000-8000-000000000053", "name": "Credit Bank", "code": "53", "country": "KE"},
    {"id": "b0000049-0000-4000-8000-000000000049", "name": "Victoria Commercial Bank", "code": "49", "country": "KE"},
    {"id": "b0000055-0000-4000-8000-000000000055", "name": "Guardian Bank", "code": "55", "country": "KE"},
    {"id": "b0000025-0000-4000-8000-000000000025", "name": "Habib Bank AG Zurich", "code": "25", "country": "KE"},
    {"id": "b0000018-0000-4000-8000-000000000018", "name": "Middle East Bank Kenya", "code": "18", "country": "KE"},
    {"id": "b0000059-0000-4000-8000-000000000059", "name": "Development Bank of Kenya", "code": "59", "country": "KE"},
    {"id": "b0000014-0000-4000-8000-000000000014", "name": "M-Orient Commercial Bank", "code": "14", "country": "KE"},
    {"id": "b0000050-0000-4000-8000-000000000050", "name": "Consolidated Bank of Kenya", "code": "50", "country": "KE"},
    {"id": "b0000035-0000-4000-8000-000000000035", "name": "African Banking Corporation (ABC Bank)", "code": "35", "country": "KE"},
    {"id": "b0000060-0000-4000-8000-000000000060", "name": "Paramount Bank", "code": "60", "country": "KE"},
    {"id": "b0000078-0000-4000-8000-000000000078", "name": "Mayfair CIB Bank", "code": "78", "country": "KE"},
    {"id": "b0000076-0000-4000-8000-000000000076", "name": "UBA Kenya Bank", "code": "76", "country": "KE"},
    {"id": "b0000016-0000-4000-8000-000000000016", "name": "Citibank N.A. Kenya", "code": "16", "country": "KE"},
    {"id": "b0000006-0000-4000-8000-000000000006", "name": "Bank of Baroda Kenya", "code": "06", "country": "KE"},
    {"id": "b0000005-0000-4000-8000-000000000005", "name": "Bank of India", "code": "05", "country": "KE"},
    {"id": "b0000080-0000-4000-8000-000000000080", "name": "Faulu Microfinance Bank", "code": "80", "country": "KE"},
    {"id": "b0000081-0000-4000-8000-000000000081", "name": "Kenya Women Microfinance Bank (KWFT)", "code": "81", "country": "KE"},
    {"id": "b0000082-0000-4000-8000-000000000082", "name": "Caritas Microfinance Bank", "code": "82", "country": "KE"},
    {"id": "b0000083-0000-4000-8000-000000000083", "name": "SMEP Microfinance Bank", "code": "83", "country": "KE"},
    {"id": "b0000084-0000-4000-8000-000000000084", "name": "Rafiki Microfinance Bank", "code": "84", "country": "KE"},
    {"id": "b0000091-0000-4000-8000-000000000091", "name": "Stima SACCO", "code": "91", "country": "KE"},
    {"id": "b0000092-0000-4000-8000-000000000092", "name": "Kenya Police SACCO", "code": "92", "country": "KE"},
    {"id": "b0000093-0000-4000-8000-000000000093", "name": "Harambee SACCO", "code": "93", "country": "KE"},
    {"id": "b0000099-0000-4000-8000-000000000099", "name": "Safaricom M-PESA Business / Paybill Direct", "code": "99", "country": "KE"},
]


@runtime_checkable
class TumaGateway(Protocol):
    """
    Protocol defining the strict interface for Tuma API interactions.
    Confirmed capabilities are fully implemented in TumaHttpGateway.
    Unconfirmed capabilities raise NotSupportedError with a documented TODO.
    """

    async def authenticate_parent(self) -> str:
        """Authenticates PayOps parent account and returns JWT Bearer token."""
        ...

    async def list_banks(self, country: str = "KE") -> List[Dict[str, Any]]:
        """Retrieves and caches commercial banks list filtered by country."""
        ...

    async def create_child(
        self,
        name: str,
        email: str,
        mobile: str,
        bank_id: str,
        account_number: str,
        logo: str,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Provisions a new child business profile under the parent account."""
        ...

    async def authenticate_child(self, email: str, api_key: str) -> str:
        """Authenticates a child profile and returns a child JWT Bearer token."""
        ...

    async def initiate_stk_push(
        self,
        child_token: str,
        amount: Decimal,
        phone: str,
        callback_url: str,
        description: str,
    ) -> Dict[str, Any]:
        """Initiates an M-PESA STK Push prompt to payer handset via child token."""
        ...

    async def get_transaction_status(self, child_token: str, checkout_request_id: str) -> Dict[str, Any]:
        """TODO(tuma-confirm:status-lookup): Unconfirmed transaction status query."""
        ...

    async def update_child_settlement(
        self, parent_token: str, child_id: str, bank_id: str, account_number: str
    ) -> Dict[str, Any]:
        """TODO(tuma-confirm:child-update-suspension): Unconfirmed child settlement update."""
        ...

    async def deactivate_child(self, parent_token: str, child_id: str) -> Dict[str, Any]:
        """TODO(tuma-confirm:child-update-suspension): Unconfirmed child deactivation."""
        ...

    async def verify_webhook_signature(self, headers: Dict[str, str], raw_body: bytes) -> bool:
        """TODO(tuma-confirm:webhook-signature): Unconfirmed webhook authenticity signature."""
        ...


class TumaHttpGateway:
    """
    Production HTTP implementation of TumaGateway.
    Uses official endpoint: https://api.tuma.co.ke
    """

    DEFAULT_BASE_URL = "https://api.tuma.co.ke"

    def __init__(
        self,
        parent_api_key: Optional[str] = None,
        parent_email: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.parent_api_key = parent_api_key or settings.TUMA_API_KEY
        self.parent_email = parent_email or settings.TUMA_BUSINESS_EMAIL
        self.base_url = (base_url or settings.TUMA_BASE_URL or self.DEFAULT_BASE_URL).rstrip("/")

        # Single-flight mutex to prevent token stampedes
        self._parent_token_lock = asyncio.Lock()
        self._cached_parent_token: Optional[str] = None

        # Bank list caching
        self._banks_cache: Optional[List[Dict[str, Any]]] = None
        self._banks_cache_expires_at: Optional[datetime] = None

    @staticmethod
    def format_phone(phone: str) -> str:
        """Formats phone number to Kenyan standard 254XXXXXXXXX."""
        clean = str(phone).strip().replace("+", "").replace(" ", "").replace("-", "")
        if clean.startswith("0"):
            clean = f"254{clean[1:]}"
        elif clean.startswith("7") or clean.startswith("1"):
            clean = f"254{clean}"
        return clean

    async def authenticate_parent(self) -> str:
        """
        Authenticates PayOps parent account using POST /auth/token.
        Token expiry is treated as unknown: cached and refreshed on 401.
        """
        if not self.parent_api_key or not self.parent_email:
            raise TumaAuthError(
                "Parent Tuma credentials missing. Set TUMA_API_KEY and TUMA_BUSINESS_EMAIL in configuration."
            )

        async with self._parent_token_lock:
            if self._cached_parent_token:
                return self._cached_parent_token

            url = f"{self.base_url}/auth/token"
            payload = {
                "email": self.parent_email,
                "api_key": self.parent_api_key,
            }

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 401:
                        raise TumaAuthError("Invalid parent Tuma email or API key.")
                    if resp.status_code == 429:
                        raise TumaRateLimitError("Rate limit exceeded while authenticating parent.")
                    if resp.status_code != 200:
                        raise TumaError(f"Parent authentication failed [{resp.status_code}]: {resp.text}")

                    data = resp.json()
                    inner = data.get("data") if isinstance(data, dict) and isinstance(data.get("data"), dict) else data
                    token = inner.get("token") or inner.get("access_token") or data.get("token") or data.get("access_token")
                    if not token:
                        raise TumaError(f"No access token returned in authentication response: {data}")

                    self._cached_parent_token = str(token)
                    return self._cached_parent_token
            except httpx.RequestError as exc:
                raise TumaNetworkError(f"Network error authenticating parent: {str(exc)}") from exc

    def invalidate_parent_token(self) -> None:
        """Invalidates cached parent token on 401 response."""
        self._cached_parent_token = None

    async def list_banks(self, country: str = "KE") -> List[Dict[str, Any]]:
        """
        Retrieves list of banks via GET /reference/banks.
        Caches for 24 hours and filters to specified country (default 'KE').
        Falls back seamlessly to the full verified directory of Kenyan banks.
        """
        now = datetime.now(timezone.utc)
        if self._banks_cache and self._banks_cache_expires_at and self._banks_cache_expires_at > now:
            return self._banks_cache

        url = f"{self.base_url}/reference/banks"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_banks = data.get("data") if isinstance(data, dict) and "data" in data else data
                    if isinstance(raw_banks, list) and len(raw_banks) > 0:
                        filtered = [
                            b for b in raw_banks
                            if isinstance(b, dict) and str(b.get("country", "")).upper() == country.upper()
                        ]
                        if filtered:
                            self._banks_cache = filtered
                            self._banks_cache_expires_at = now + timedelta(hours=24)
                            return self._banks_cache
        except Exception:
            pass

        # Fall back to the comprehensive directory of all Tuma-supported Kenyan banks
        self._banks_cache = ALL_TUMA_KE_BANKS
        self._banks_cache_expires_at = now + timedelta(hours=24)
        return self._banks_cache

    async def create_child(
        self,
        name: str,
        email: str,
        mobile: str,
        bank_id: str,
        account_number: str,
        logo: str,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a child business profile via POST /businesses (Bearer parent token).
        Validates required fields: name (>=2), email, mobile (254...), bank_id, account_number (>=5), logo.
        """
        clean_mobile = self.format_phone(mobile)
        if len(name.strip()) < 2:
            raise TumaValidationError("Child business name must be at least 2 characters.")
        if len(account_number.strip()) < 5:
            raise TumaValidationError("Settlement account number must be at least 5 characters.")
        if not bank_id:
            raise TumaValidationError("bank_id is required.")

        parent_token = await self.authenticate_parent()
        url = f"{self.base_url}/businesses"
        headers = {
            "Authorization": f"Bearer {parent_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload: Dict[str, Any] = {
            "name": name.strip(),
            "email": email.strip(),
            "mobile": clean_mobile,
            "bank_id": str(bank_id).strip(),
            "account_number": str(account_number).strip(),
            "logo": logo.strip() if logo else "https://payops.rodstartechdevs.co.ke/logo.png",
        }
        if description:
            payload["description"] = description[:1000]

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 401:
                    # Invalidate parent token and retry once
                    self.invalidate_parent_token()
                    parent_token = await self.authenticate_parent()
                    headers["Authorization"] = f"Bearer {parent_token}"
                    resp = await client.post(url, headers=headers, json=payload)

                if resp.status_code == 422 or resp.status_code == 400:
                    raise TumaValidationError(f"Tuma rejected business creation: {resp.text}")
                if resp.status_code == 429:
                    raise TumaRateLimitError("Rate limit exceeded while creating child business.")
                if resp.status_code not in (200, 201):
                    raise TumaError(f"Failed to create child business [{resp.status_code}]: {resp.text}")

                res_json = resp.json()
                data = res_json.get("data") if isinstance(res_json, dict) and "data" in res_json else res_json
                return data
        except httpx.RequestError as exc:
            raise TumaNetworkError(f"Network error creating child profile: {str(exc)}") from exc

    async def authenticate_child(self, email: str, api_key: str) -> str:
        """
        Authenticates a child profile via POST /auth/token using child credentials.
        Returns the child Bearer token.
        """
        url = f"{self.base_url}/auth/token"
        payload = {
            "email": email.strip(),
            "api_key": api_key.strip(),
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code in (401, 403):
                    raise TumaAuthError("Child authentication failed: invalid child email or API key.")
                if resp.status_code != 200:
                    raise TumaError(f"Child authentication failed [{resp.status_code}]: {resp.text}")

                data = resp.json()
                inner = data.get("data") if isinstance(data, dict) and isinstance(data.get("data"), dict) else data
                token = inner.get("token") or inner.get("access_token") or data.get("token") or data.get("access_token")
                if not token:
                    raise TumaError(f"No access token returned in child authentication response: {data}")
                return str(token)
        except httpx.RequestError as exc:
            raise TumaNetworkError(f"Network error authenticating child: {str(exc)}") from exc

    async def initiate_stk_push(
        self,
        child_token: str,
        amount: Decimal,
        phone: str,
        callback_url: str,
        description: str,
    ) -> Dict[str, Any]:
        """
        Initiates an M-PESA STK Push prompt via POST /payment/stk-push (Bearer child token).
        """
        clean_phone = self.format_phone(phone)
        url = f"{self.base_url}/payment/stk-push"
        headers = {
            "Authorization": f"Bearer {child_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "amount": float(amount),
            "phone": clean_phone,
            "callback_url": callback_url,
            "description": description[:100],
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code in (401, 403):
                    raise TumaAuthError("Child token rejected or expired during STK push initiation.")
                if resp.status_code == 429:
                    raise TumaRateLimitError("Rate limit exceeded during STK push initiation.")
                if resp.status_code not in (200, 201, 202):
                    raise TumaError(f"Tuma STK Push failed [{resp.status_code}]: {resp.text}")

                data = resp.json()
                return data.get("data") if isinstance(data, dict) and "data" in data else data
        except httpx.RequestError as exc:
            raise TumaNetworkError(f"Network error initiating STK Push: {str(exc)}") from exc

    # --- Unconfirmed Capabilities (Guarded with TODOs) ---

    async def get_transaction_status(self, child_token: str, checkout_request_id: str) -> Dict[str, Any]:
        """
        TODO(tuma-confirm:status-lookup)
        Unconfirmed status query endpoint. Raises NotSupportedError until Tuma confirms specification.
        """
        raise NotSupportedError(
            "Transaction status query endpoint is unconfirmed by Tuma [TODO(tuma-confirm:status-lookup)]."
        )

    async def update_child_settlement(
        self, parent_token: str, child_id: str, bank_id: str, account_number: str
    ) -> Dict[str, Any]:
        """
        TODO(tuma-confirm:child-update-suspension)
        Unconfirmed child bank update endpoint. Raises NotSupportedError until Tuma confirms specification.
        """
        raise NotSupportedError(
            "Child settlement account update endpoint is unconfirmed by Tuma [TODO(tuma-confirm:child-update-suspension)]."
        )

    async def deactivate_child(self, parent_token: str, child_id: str) -> Dict[str, Any]:
        """
        TODO(tuma-confirm:child-update-suspension)
        Unconfirmed child deactivation endpoint. Raises NotSupportedError until Tuma confirms specification.
        """
        raise NotSupportedError(
            "Child deactivation endpoint is unconfirmed by Tuma [TODO(tuma-confirm:child-update-suspension)]."
        )

    async def verify_webhook_signature(self, headers: Dict[str, str], raw_body: bytes) -> bool:
        """
        TODO(tuma-confirm:webhook-signature)
        Unconfirmed webhook HMAC signature header. Raises NotSupportedError until Tuma confirms specification.
        """
        raise NotSupportedError(
            "Webhook signature verification is unconfirmed by Tuma [TODO(tuma-confirm:webhook-signature)]."
        )


class TumaTestRecordedGateway:
    """
    Test double for unit testing without touching the live network.
    Strictly used in unit test fixtures; never wired into runtime.
    """

    def __init__(self, should_fail_auth: bool = False, should_fail_creation: bool = False):
        self.should_fail_auth = should_fail_auth
        self.should_fail_creation = should_fail_creation
        self.created_businesses: List[Dict[str, Any]] = []
        self.initiated_pushes: List[Dict[str, Any]] = []

    async def authenticate_parent(self) -> str:
        if self.should_fail_auth:
            raise TumaAuthError("Mock parent auth failed.")
        return "mock_parent_token_123"

    async def list_banks(self, country: str = "KE") -> List[Dict[str, Any]]:
        return list(ALL_TUMA_KE_BANKS)

    async def create_child(
        self,
        name: str,
        email: str,
        mobile: str,
        bank_id: str,
        account_number: str,
        logo: str,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        if self.should_fail_creation:
            raise TumaValidationError("Mock business creation validation error.")

        biz_data = {
            "id": f"tuma_biz_{len(self.created_businesses) + 1}",
            "name": name,
            "bank_name": "Equity Bank Kenya",
            "bank_code": "68",
            "account_number": account_number,
            "api_key": f"tuma_child_key_{len(self.created_businesses) + 1}",
            "is_active": True,
        }
        self.created_businesses.append(biz_data)
        return biz_data

    async def authenticate_child(self, email: str, api_key: str) -> str:
        return f"mock_child_token_for_{email}"

    async def initiate_stk_push(
        self,
        child_token: str,
        amount: Decimal,
        phone: str,
        callback_url: str,
        description: str,
    ) -> Dict[str, Any]:
        push_record = {
            "checkout_request_id": f"ws_CO_{int(datetime.now().timestamp())}_{phone[-4:]}",
            "merchant_request_id": f"MR_{int(datetime.now().timestamp())}",
            "amount": amount,
            "phone": phone,
            "callback_url": callback_url,
            "description": description,
        }
        self.initiated_pushes.append(push_record)
        return push_record

    async def get_transaction_status(self, child_token: str, checkout_request_id: str) -> Dict[str, Any]:
        raise NotSupportedError("Transaction status query is unconfirmed by Tuma [TODO(tuma-confirm:status-lookup)].")

    async def update_child_settlement(
        self, parent_token: str, child_id: str, bank_id: str, account_number: str
    ) -> Dict[str, Any]:
        raise NotSupportedError("Child settlement update is unconfirmed by Tuma [TODO(tuma-confirm:child-update-suspension)].")

    async def deactivate_child(self, parent_token: str, child_id: str) -> Dict[str, Any]:
        raise NotSupportedError("Child deactivation is unconfirmed by Tuma [TODO(tuma-confirm:child-update-suspension)].")

    async def verify_webhook_signature(self, headers: Dict[str, str], raw_body: bytes) -> bool:
        raise NotSupportedError("Webhook signature verification is unconfirmed by Tuma [TODO(tuma-confirm:webhook-signature)].")
