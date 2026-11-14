#!/usr/bin/env python3
r"""
Test script for Tuma API M-PESA STK Push for Product A (Service A) from Products Page.
Amount: KSh 1.00 (Exempt)
Target: Live Tuma API Gateway (https://api.tuma.co.ke)

Usage:
    backend\.venv\Scripts\python.exe scripts/test_tuma_stk.py [PHONE_NUMBER]
Example:
    backend\.venv\Scripts\python.exe scripts/test_tuma_stk.py 0712345678
"""

import sys
import os
import json
from pathlib import Path
import httpx

# Load environment variables from .env
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

TUMA_BASE_URL = config.get("TUMA_BASE_URL", "https://api.tuma.co.ke").rstrip("/")
TUMA_API_KEY = config.get("TUMA_API_KEY")
TUMA_BUSINESS_EMAIL = config.get("TUMA_BUSINESS_EMAIL")
TUMA_CALLBACK_URL = config.get("TUMA_CALLBACK_URL", "https://payops.rodstartechdevs.co.ke/api/v1/payments/tuma/callback")

PRODUCT_NAME = "Product A (Service A)"
PRODUCT_PRICE = 1  # KSh 1.00 as configured on Products page


def format_phone(phone: str) -> str:
    clean = str(phone).strip().replace("+", "").replace(" ", "").replace("-", "")
    if clean.startswith("0"):
        return f"254{clean[1:]}"
    elif clean.startswith("7") or clean.startswith("1"):
        return f"254{clean}"
    return clean


def main():
    print("=" * 65)
    print("   RODSTAR PAYOPS • TUMA API LIVE STK PUSH TEST")
    print(f"   Target Item : {PRODUCT_NAME}")
    print(f"   Price       : KSh {PRODUCT_PRICE}.00")
    print("=" * 65)

    if not TUMA_API_KEY or not TUMA_BUSINESS_EMAIL:
        print("\n[ERROR] TUMA_API_KEY or TUMA_BUSINESS_EMAIL is missing in .env")
        print("Please ensure your Tuma API credentials are configured.")
        sys.exit(1)

    # Determine phone number
    if len(sys.argv) > 1:
        phone_input = sys.argv[1].strip()
    else:
        print(f"\nEnter the Kenyan M-PESA mobile number to receive the KSh {PRODUCT_PRICE} prompt:")
        try:
            phone_input = input("Phone Number (e.g. 0712345678 or 254712345678): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            sys.exit(0)

    if not phone_input:
        print("[ERROR] Phone number cannot be empty.")
        sys.exit(1)

    phone = format_phone(phone_input)
    if not (phone.startswith("254") and len(phone) == 12):
        print(f"[ERROR] Invalid Kenyan phone number format: {phone}. Must be 254XXXXXXXXX (12 digits).")
        sys.exit(1)

    print(f"\n[1/3] Authenticating with Tuma API ({TUMA_BASE_URL})...")
    auth_url = f"{TUMA_BASE_URL}/auth/token"
    auth_payload = {
        "email": TUMA_BUSINESS_EMAIL,
        "api_key": TUMA_API_KEY,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            auth_res = client.post(auth_url, json=auth_payload)
            if auth_res.status_code != 200:
                print(f"[FAIL] Tuma authentication failed [{auth_res.status_code}]: {auth_res.text}")
                sys.exit(1)

            auth_data = auth_res.json()
            inner = auth_data.get("data") if isinstance(auth_data.get("data"), dict) else auth_data
            token = inner.get("token") or inner.get("access_token")
            shop = inner.get("shop", {})
            shop_name = shop.get("name", "Rodstar Tech Devs")

            print(f"      [OK] Logged in as: {TUMA_BUSINESS_EMAIL}")
            print(f"      [OK] Shop Profile: {shop_name} (ID: {shop.get('id', 'N/A')})")
            print(f"      [OK] JWT Bearer Token obtained successfully.")

            # 2. Dispatch STK Push
            print(f"\n[2/3] Dispatching live M-PESA STK Push prompt to {phone}...")
            stk_url = f"{TUMA_BASE_URL}/payment/stk-push"
            stk_headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            stk_payload = {
                "amount": PRODUCT_PRICE,
                "phone": phone,
                "description": f"{PRODUCT_NAME} - KSh {PRODUCT_PRICE}",
                "callback_url": TUMA_CALLBACK_URL,
            }

            stk_res = client.post(stk_url, headers=stk_headers, json=stk_payload)
            print(f"      HTTP Status: {stk_res.status_code}")

            res_body = stk_res.json() if stk_res.headers.get("content-type", "").startswith("application/json") else stk_res.text
            print(f"\n[3/3] Tuma API Response:")
            print(json.dumps(res_body, indent=2) if isinstance(res_body, (dict, list)) else res_body)

            if stk_res.status_code in (200, 201, 202) and (isinstance(res_body, dict) and res_body.get("success", True)):
                print("\n" + "=" * 65)
                print("   >>> SUCCESS: M-PESA PROMPT SENT TO HANDSET! <<<")
                print(f"   Please check mobile phone {phone} and enter PIN.")
                print(f"   Amount: KSh {PRODUCT_PRICE}.00 for {PRODUCT_NAME}")
                print("=" * 65)
            else:
                msg = res_body.get("message") if isinstance(res_body, dict) else str(res_body)
                print("\n" + "-" * 65)
                print(f"   [NOTICE] Tuma/Safaricom Response: {msg}")
                print("-" * 65)

    except httpx.RequestError as exc:
        print(f"\n[ERROR] Network error connecting to Tuma: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
