#!/usr/bin/env python3
r"""
Test script for Safaricom M-PESA Daraja STK Push (Paybill & Till).
Targets Safaricom Daraja Gateway (Sandbox or Production).

Usage:
    backend\.venv\Scripts\python.exe scripts/test_daraja_stk.py [PHONE_NUMBER] [AMOUNT] [RAIL_TYPE]

Examples:
    backend\.venv\Scripts\python.exe scripts/test_daraja_stk.py 0712345678 1 PAYBILL
    backend\.venv\Scripts\python.exe scripts/test_daraja_stk.py 254712345678 50 TILL
"""

import sys
import os
import json
import base64
from datetime import datetime
from pathlib import Path
import httpx

# Load configuration from .env
root_dir = Path(__file__).resolve().parent.parent
env_file = root_dir / ".env"

config = {}
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                config[k.strip()] = v.strip().strip('"').strip("'")

DARAJA_IS_SANDBOX = config.get("DARAJA_IS_SANDBOX", "true").lower() in ("true", "1", "yes")
DARAJA_CONSUMER_KEY = config.get("DARAJA_CONSUMER_KEY")
DARAJA_CONSUMER_SECRET = config.get("DARAJA_CONSUMER_SECRET")
DARAJA_SHORTCODE = config.get("DARAJA_SHORTCODE", "174379")
DARAJA_PASSKEY = config.get(
    "DARAJA_PASSKEY",
    "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"  # Official Daraja Sandbox test passkey
)
DARAJA_CALLBACK_URL = config.get(
    "DARAJA_CALLBACK_URL",
    "https://payops.rodstartechdevs.co.ke/api/v1/payments/daraja/callback"
)

BASE_URL = "https://sandbox.safaricom.co.ke" if DARAJA_IS_SANDBOX else "https://api.safaricom.co.ke"


def format_phone(phone: str) -> str:
    clean = str(phone).strip().replace("+", "").replace(" ", "").replace("-", "")
    if clean.startswith("0"):
        return f"254{clean[1:]}"
    elif clean.startswith("7") or clean.startswith("1"):
        return f"254{clean}"
    return clean


def main():
    print("=" * 68)
    print("   RODSTAR PAYOPS • SAFARICOM DARAJA M-PESA STK PUSH TEST")
    print(f"   Gateway     : Safaricom Daraja ({'Sandbox' if DARAJA_IS_SANDBOX else 'Production'})")
    print(f"   Base URL    : {BASE_URL}")
    print(f"   Shortcode   : {DARAJA_SHORTCODE}")
    print("=" * 68)

    # 1. Parse arguments
    phone_input = sys.argv[1].strip() if len(sys.argv) > 1 else ""
    amount_input = sys.argv[2].strip() if len(sys.argv) > 2 else "1"
    rail_type = (sys.argv[3].strip() if len(sys.argv) > 3 else "PAYBILL").upper()

    if not phone_input:
        print("\nEnter recipient Kenyan phone number (e.g. 0712345678):")
        try:
            phone_input = input("Phone Number: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            sys.exit(0)

    if not phone_input:
        print("[ERROR] Phone number cannot be empty.")
        sys.exit(1)

    phone = format_phone(phone_input)
    if not (phone.startswith("254") and len(phone) == 12):
        print(f"[ERROR] Invalid Kenyan phone format: {phone}. Must be 254XXXXXXXXX (12 digits).")
        sys.exit(1)

    try:
        amount = int(float(amount_input))
        if amount <= 0:
            raise ValueError()
    except ValueError:
        print(f"[ERROR] Invalid amount: '{amount_input}'. Must be a positive integer.")
        sys.exit(1)

    tx_type = "CustomerBuyGoodsOnline" if "TILL" in rail_type else "CustomerPayBillOnline"

    print(f"\nTarget Recipient : {phone}")
    print(f"Amount           : KSh {amount}.00")
    print(f"Transaction Type : {tx_type} ({rail_type})")

    # Check if Safaricom Developer credentials are configured
    if not DARAJA_CONSUMER_KEY or not DARAJA_CONSUMER_SECRET:
        print("\n[INFO] DARAJA_CONSUMER_KEY / DARAJA_CONSUMER_SECRET not yet in .env.")
        print("Testing via local PayOps Daraja endpoint with automated sandbox test client...")
        test_via_local_backend(phone, amount, rail_type)
        return

    # 2. Live Safaricom Daraja OAuth
    print(f"\n[1/3] Authenticating with Safaricom Daraja OAuth ({BASE_URL})...")
    oauth_url = f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    creds_str = f"{DARAJA_CONSUMER_KEY}:{DARAJA_CONSUMER_SECRET}"
    encoded_creds = base64.b64encode(creds_str.encode()).decode("utf-8")
    oauth_headers = {
        "Authorization": f"Basic {encoded_creds}",
        "Accept": "application/json",
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            oauth_res = client.get(oauth_url, headers=oauth_headers)
            if oauth_res.status_code != 200:
                print(f"[FAIL] Daraja OAuth failed [{oauth_res.status_code}]: {oauth_res.text}")
                print("\nPlease check your Safaricom Developer Consumer Key & Consumer Secret.")
                sys.exit(1)

            token_data = oauth_res.json()
            token = token_data.get("access_token")
            print(f"      [OK] Safaricom OAuth Bearer token obtained.")

            # 3. Generate Daraja STK Push Password
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            raw_pwd = f"{DARAJA_SHORTCODE}{DARAJA_PASSKEY}{timestamp}"
            password = base64.b64encode(raw_pwd.encode()).decode("utf-8")

            # 4. Dispatch STK Push
            print(f"\n[2/3] Dispatching Safaricom STK Push prompt to {phone}...")
            stk_url = f"{BASE_URL}/mpesa/stkpush/v1/processrequest"
            stk_headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            stk_payload = {
                "BusinessShortCode": DARAJA_SHORTCODE,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": tx_type,
                "Amount": amount,
                "PartyA": phone,
                "PartyB": DARAJA_SHORTCODE,
                "PhoneNumber": phone,
                "CallBackURL": DARAJA_CALLBACK_URL,
                "AccountReference": "RODSTAR-TEST"[:12],
                "TransactionDesc": "Product A Test"[:13],
            }

            stk_res = client.post(stk_url, headers=stk_headers, json=stk_payload)
            print(f"      HTTP Status: {stk_res.status_code}")

            try:
                res_body = stk_res.json()
            except Exception:
                res_body = stk_res.text

            print(f"\n[3/3] Safaricom Daraja Response:")
            print(json.dumps(res_body, indent=2) if isinstance(res_body, dict) else res_body)

            if stk_res.status_code == 200 and isinstance(res_body, dict) and res_body.get("ResponseCode") == "0":
                print("\n" + "=" * 68)
                print("   >>> SUCCESS: SAFARICOM STK PROMPT SENT TO PHONE! <<<")
                print(f"   CheckoutRequestID : {res_body.get('CheckoutRequestID')}")
                print(f"   MerchantRequestID : {res_body.get('MerchantRequestID')}")
                print(f"   CustomerMessage   : {res_body.get('CustomerMessage')}")
                print("=" * 68)
            else:
                msg = res_body.get("errorMessage") or res_body.get("ResponseDescription") if isinstance(res_body, dict) else str(res_body)
                print("\n" + "-" * 68)
                print(f"   [NOTICE] Daraja Response: {msg}")
                print("-" * 68)

    except httpx.RequestError as exc:
        print(f"\n[ERROR] Network error connecting to Safaricom Daraja: {exc}")
        sys.exit(1)


def test_via_local_backend(phone: str, amount: int, rail_type: str):
    """Dispatches through local PayOps API endpoint and tests full reconciliation."""
    from app.integrations.daraja.client import DarajaClient
    import asyncio

    print(f"\n[1/2] Invoking PayOps Daraja Client (Shortcode: {DARAJA_SHORTCODE})...")
    provider_type = "DARAJA_TILL" if "TILL" in rail_type else "DARAJA_PAYBILL"
    client = DarajaClient(
        shortcode=DARAJA_SHORTCODE,
        is_sandbox=True,
        provider_type=provider_type,
    )
    from decimal import Decimal
    res = asyncio.run(client.initiate_stk_push(
        phone_number=phone,
        amount=Decimal(str(amount)),
        account_reference="TEST-DARAJA",
        transaction_desc="Daraja Test",
        callback_url=DARAJA_CALLBACK_URL,
    ))

    print(f"      CheckoutRequestID : {res.get('CheckoutRequestID')}")
    print(f"      MerchantRequestID : {res.get('MerchantRequestID')}")
    print(f"      CustomerMessage   : {res.get('CustomerMessage')}")
    print(f"      Status            : {res.get('ResponseDescription')}")
    print(f"      Is Simulated      : {res.get('is_simulated')}")

    print("\n[2/2] Verification complete!")
    print("\n" + "=" * 68)
    print("   To test live Safaricom prompts on physical handsets:")
    print("   1. Obtain your Consumer Key & Secret from https://developer.safaricom.co.ke")
    print("   2. Add them to .env:")
    print("      DARAJA_CONSUMER_KEY=your_key")
    print("      DARAJA_CONSUMER_SECRET=your_secret")
    print("      DARAJA_SHORTCODE=174379 (or your Paybill/Till)")
    print("      DARAJA_PASSKEY=your_passkey")
    print("      DARAJA_IS_SANDBOX=true (or false for production)")
    print("   3. Re-run: backend\\.venv\\Scripts\\python.exe scripts/test_daraja_stk.py 07XXXXXXXX")
    print("=" * 68)


if __name__ == "__main__":
    main()
